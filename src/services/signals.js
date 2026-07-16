import axios from 'axios';

// ── Configure these two values ──────────────────────────────────────────────
// Deploy backend.py to Railway (free), then paste the URL here
const BACKEND_URL   = 'https://your-backend.railway.app';
const ANTHROPIC_KEY = 'sk-ant-your-key';
// ────────────────────────────────────────────────────────────────────────────

export const PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF',
  'AUDUSD', 'USDCAD', 'NZDUSD', 'GBPJPY',
  'EURJPY', 'XAUUSD',
];

/**
 * Fetch AI signals for one pair from the Railway backend.
 * Falls back to a mock signal if the backend is unreachable.
 */
export async function fetchSignal(pair) {
  try {
    const res = await axios.post(
      `${BACKEND_URL}/signal`,
      { pair, anthropic_key: ANTHROPIC_KEY },
      { timeout: 15000 }
    );
    return res.data; // { pair, direction, grade, confidence, entry, sl, tp1, tp2, tp3, reason }
  } catch (err) {
    console.warn(`fetchSignal(${pair}) failed:`, err.message);
    return null;
  }
}

/**
 * Fetch signals for all pairs and return them sorted by confidence desc.
 */
export async function fetchAllSignals(pairs = PAIRS) {
  const results = await Promise.allSettled(pairs.map(p => fetchSignal(p)));
  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .sort((a, b) => {
      const gradeRank = { A: 0, B: 1, C: 2 };
      const gradeDiff = (gradeRank[a.grade] ?? 3) - (gradeRank[b.grade] ?? 3);
      return gradeDiff !== 0 ? gradeDiff : b.confidence - a.confidence;
    });
}

/**
 * Optionally send a signal alert to a Telegram bot.
 * Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in your backend env.
 */
export async function sendTelegram(signal) {
  try {
    await axios.post(
      `${BACKEND_URL}/telegram`,
      { signal },
      { timeout: 8000 }
    );
  } catch (err) {
    console.warn('sendTelegram failed:', err.message);
  }
}
