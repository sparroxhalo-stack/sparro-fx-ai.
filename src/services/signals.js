/**
 * signals.js
 * Generates AI forex signals using:
 *   - Real OHLCV price data from Yahoo Finance (via market.js)
 *   - High-impact news events from ForexFactory (via calendar.js)
 *   - Claude (Anthropic) for signal generation and grading
 *
 * The Anthropic API key is stored in AsyncStorage (entered in Settings).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchMarketData } from './market';
import { newsRiskSummary } from './calendar';

export const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
  'AUDUSD', 'USDCAD', 'NZDUSD', 'GBPJPY',
  'EURJPY', 'XAUUSD',
];

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL         = 'claude-3-haiku-20240307';

// ── API key helpers ──────────────────────────────────────────────────────────

export async function getAnthropicKey() {
  return await AsyncStorage.getItem('anthropicKey');
}

export async function setAnthropicKey(key) {
  await AsyncStorage.setItem('anthropicKey', key.trim());
}

// ── Signal generation ────────────────────────────────────────────────────────

/**
 * Build the Claude prompt from real market data.
 */
function buildPrompt(market, news) {
  const { pair, price, candles, rsi, ema20, ema50, trend, swingHigh, swingLow, decimals } = market;
  const dec = decimals;

  const candleLines = candles.slice(-20).map(c =>
    `  ${c.t.slice(11, 16)} | O:${c.o.toFixed(dec)} H:${c.h.toFixed(dec)} L:${c.l.toFixed(dec)} C:${c.c.toFixed(dec)}`
  ).join('\n');

  const newsLine = news
    ? `⚠️ UPCOMING NEWS: ${news}\n  → Assess whether this news makes trading high-risk.`
    : 'No high-impact news in the next 90 minutes.';

  return `You are a professional forex analyst specializing in intraday and swing trading.
Analyse the following LIVE market data and generate a single trade signal.

═══ PAIR: ${pair} ═══
Current Price : ${price.toFixed(dec)}
Trend (1H)    : ${trend}
RSI(14)       : ${rsi ?? 'N/A'}
EMA(20)       : ${ema20?.toFixed(dec) ?? 'N/A'}
EMA(50)       : ${ema50?.toFixed(dec) ?? 'N/A'}
Swing High    : ${swingHigh.toFixed(dec)}
Swing Low     : ${swingLow.toFixed(dec)}

Last 20 hourly candles (H1):
${candleLines}

${newsLine}

RULES YOU MUST FOLLOW:
1. Entry must be the CURRENT price (${price.toFixed(dec)}) ± small spread.
2. SL must be placed beyond the most recent swing high/low. Minimum 15 pips from entry for majors, 100 pips for XAUUSD.
3. TP1 = 1.5× risk. TP2 = 2.5× risk. TP3 = 4× risk.
4. Grade A = RSI extreme + EMA crossover + clean S/R + high confidence (≥85%).
5. Grade B = 2 of those conditions (70–84% confidence).
6. Grade C = weak setup (<70%). Suggest WAIT if news is imminent or setup is unclear.
7. Direction WAIT means do not trade right now.

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "direction":   "BUY" | "SELL" | "WAIT",
  "entry":       <number>,
  "sl":          <number>,
  "tp1":         <number>,
  "tp2":         <number>,
  "tp3":         <number>,
  "grade":       "A" | "B" | "C",
  "confidence":  <integer 0–100>,
  "reason":      "<2–3 sentence technical explanation>",
  "newsWarning": "<news risk message or empty string>"
}`;
}

/**
 * Call Claude directly from the app with the market data prompt.
 */
async function callClaude(prompt, apiKey) {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      MODEL,
      max_tokens: 600,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err}`);
  }

  const json   = await res.json();
  const text   = json.content?.[0]?.text ?? '';

  // Strip any markdown code fences Claude sometimes wraps around JSON
  const cleaned = text.replace(/```(?:json)?|```/g, '').trim();
  return JSON.parse(cleaned);
}

/**
 * Generate a real AI signal for one pair.
 * Returns signal object or null on failure.
 */
export async function fetchSignal(pair) {
  try {
    const apiKey = await getAnthropicKey();
    if (!apiKey) {
      console.warn('No Anthropic API key — add it in Settings');
      return null;
    }

    // Fetch real market data and news in parallel
    const [market, news] = await Promise.all([
      fetchMarketData(pair),
      newsRiskSummary(pair),
    ]);

    const prompt = buildPrompt(market, news);
    const signal = await callClaude(prompt, apiKey);

    return {
      pair,
      direction:   signal.direction,
      grade:       signal.grade,
      confidence:  signal.confidence,
      entry:       signal.entry,
      sl:          signal.sl,
      tp1:         signal.tp1,
      tp2:         signal.tp2,
      tp3:         signal.tp3 ?? null,
      reason:      signal.reason,
      newsWarning: signal.newsWarning ?? '',
      price:       market.price,
      rsi:         market.rsi,
      ema20:       market.ema20,
      ema50:       market.ema50,
      trend:       market.trend,
      timestamp:   new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`fetchSignal(${pair}) failed:`, err.message);
    return null;
  }
}

/**
 * Fetch signals for all pairs in parallel and sort by grade + confidence.
 */
export async function fetchAllSignals(pairs = PAIRS) {
  const results = await Promise.allSettled(pairs.map(p => fetchSignal(p)));
  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .sort((a, b) => {
      const gradeRank = { A: 0, B: 1, C: 2 };
      const gd = (gradeRank[a.grade] ?? 3) - (gradeRank[b.grade] ?? 3);
      return gd !== 0 ? gd : b.confidence - a.confidence;
    });
}

/**
 * Optionally push a signal to Telegram (requires separate backend).
 * Safe to ignore if not using Telegram.
 */
export async function sendTelegram(signal) {
  // Implement if you deploy the FastAPI backend to Railway
  console.log('Telegram push not configured', signal?.pair);
}
