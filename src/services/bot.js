/**
 * bot.js
 * Challenge Bot engine — periodically scans for SMC signals while the app
 * is open and enforces all prop firm risk rules before queuing a trade.
 *
 * The bot NEVER executes trades automatically. It queues high-grade signals
 * and the trader executes them manually on MT5 with the exact parameters shown.
 * This keeps the trader fully in control and compliant with prop firm rules.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchSignal, PAIRS } from './signals';

const BOT_SETTINGS_KEY = 'botSettings';
const BOT_QUEUE_KEY    = 'botQueue';

// ── Default bot settings ─────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  enabled:        false,
  intervalMins:   30,        // scan every N minutes
  maxDailyTrades: 2,         // max trades the bot will queue per day
  riskPct:        1,         // risk % per trade
  minGrade:       'A',       // 'A' = A only, 'B' = A or B
  sessions:       'LondonNY', // 'London' | 'NY' | 'LondonNY' | 'All'
  pairs:          PAIRS,     // which pairs to scan
};

// ── Session guard ────────────────────────────────────────────────────────────

function isActiveSession(sessions) {
  const h = new Date().getUTCHours();
  switch (sessions) {
    case 'London':   return h >= 7  && h < 12;
    case 'NY':       return h >= 13 && h < 17;
    case 'LondonNY': return (h >= 7 && h < 12) || (h >= 13 && h < 17);
    case 'All':      return true;
    default:         return true;
  }
}

// ── Risk guard ───────────────────────────────────────────────────────────────

/**
 * Returns true if it's safe to take another trade given the current challenge state.
 */
export function riskGuardPassed(challenge, phase, settings, todayQueueCount) {
  const { accountSize, dailyLossUsed, totalLossUsed } = challenge;

  // Don't trade if daily loss > 70% of limit (buffer before breach)
  const dailyUsedPct = (dailyLossUsed / accountSize) * 100;
  if (dailyUsedPct >= phase.maxDaily * 0.70) return false;

  // Don't trade if total loss > 60% of limit
  const totalUsedPct = (totalLossUsed / accountSize) * 100;
  if (totalUsedPct >= phase.maxTotal * 0.60) return false;

  // Don't exceed daily trade quota
  if (todayQueueCount >= settings.maxDailyTrades) return false;

  return true;
}

// ── AsyncStorage helpers ─────────────────────────────────────────────────────

export async function loadBotSettings() {
  try {
    const raw = await AsyncStorage.getItem(BOT_SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export async function saveBotSettings(settings) {
  await AsyncStorage.setItem(BOT_SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadBotQueue() {
  try {
    const raw = await AsyncStorage.getItem(BOT_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveBotQueue(queue) {
  await AsyncStorage.setItem(BOT_QUEUE_KEY, JSON.stringify(queue));
}

export async function clearBotQueue() {
  await AsyncStorage.removeItem(BOT_QUEUE_KEY);
}

// ── Lot size calculator ──────────────────────────────────────────────────────

export function calcLots(accountSize, riskPct, entry, sl, pair) {
  const riskAmount = (accountSize * riskPct) / 100;
  const dist       = Math.abs(entry - sl);
  if (!dist) return '0.01';
  const pipSize  = pair === 'XAUUSD' ? 0.01  : pair.includes('JPY') ? 0.01 : 0.0001;
  const pipValue = pair === 'XAUUSD' ? 1     : pair.includes('JPY') ? 6.5  : 10;
  const pips     = dist / pipSize;
  const lots     = riskAmount / (pips * pipValue);
  return Math.max(0.01, Math.round(lots * 100) / 100).toFixed(2);
}

// ── Bot runner ───────────────────────────────────────────────────────────────

let _timer    = null;
let _running  = false;
let _lastScan = null;

/**
 * Start the bot.
 * @param {object} settings   - bot settings
 * @param {object} challenge  - active challenge state
 * @param {object} phase      - firm phase rules
 * @param {Function} onSignal - callback(signal) when a qualifying signal is queued
 * @param {Function} onScan   - callback(timestamp) each time a scan runs
 */
export function startBot({ settings, challenge, phase, onSignal, onScan }) {
  if (_running) return;
  _running = true;

  const run = async () => {
    if (!_running) return;
    _lastScan = new Date();
    if (onScan) onScan(_lastScan);

    // Session guard
    if (!isActiveSession(settings.sessions)) return;

    // Load latest queue to count today's trades
    const queue    = await loadBotQueue();
    const today    = new Date().toLocaleDateString();
    const todayCount = queue.filter(q => q.date === today).length;

    // Risk guard
    if (!riskGuardPassed(challenge, phase, settings, todayCount)) {
      console.log('[Bot] Risk guard blocked scan');
      return;
    }

    // Scan the configured pairs for qualifying signals
    const gradeFilter = settings.minGrade === 'A' ? ['A'] : ['A', 'B'];

    for (const pair of settings.pairs) {
      if (!_running) break;
      try {
        const sig = await fetchSignal(pair);
        if (!sig) continue;
        if (!gradeFilter.includes(sig.grade)) continue;
        if (sig.direction === 'WAIT') continue;

        // Duplicate check — don't queue the same pair twice in one day
        const already = queue.some(q => q.pair === pair && q.date === today);
        if (already) continue;

        const lots = calcLots(challenge.accountSize, settings.riskPct, sig.entry, sig.sl, pair);
        const entry = {
          ...sig,
          lots,
          riskAmount: +((challenge.accountSize * settings.riskPct) / 100).toFixed(2),
          status: 'pending', // 'pending' | 'executed' | 'skipped'
          date: today,
          queuedAt: new Date().toISOString(),
          id: `${pair}-${Date.now()}`,
        };

        // Save and notify
        const updated = [entry, ...queue];
        await saveBotQueue(updated);
        if (onSignal) onSignal(entry);
      } catch (err) {
        console.warn(`[Bot] ${pair}:`, err.message);
      }
    }
  };

  // Run immediately, then on interval
  run();
  _timer = setInterval(run, settings.intervalMins * 60 * 1000);
}

export function stopBot() {
  _running = false;
  if (_timer) { clearInterval(_timer); _timer = null; }
}

export function isBotRunning() { return _running; }
export function lastScanTime() { return _lastScan; }
