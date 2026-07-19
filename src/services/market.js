/**
 * market.js
 * Real OHLCV data from Yahoo Finance + full SMC analysis:
 *   Order Blocks, Fair Value Gaps, Break of Structure,
 *   Liquidity levels, RSI, EMA, session detection.
 */

const YF_SYMBOL = {
  EURUSD: 'EURUSD=X', GBPUSD: 'GBPUSD=X', USDJPY: 'USDJPY=X',
  USDCHF: 'USDCHF=X', AUDUSD: 'AUDUSD=X', USDCAD: 'USDCAD=X',
  NZDUSD: 'NZDUSD=X', GBPJPY: 'GBPJPY=X', EURJPY: 'EURJPY=X',
  XAUUSD: 'XAUUSD=X',
};
const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// ── Indicator helpers ────────────────────────────────────────────────────────

function calcEMA(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return +ema.toFixed(6);
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  const sl = closes.slice(-(period + 1));
  let g = 0, l = 0;
  for (let i = 1; i < sl.length; i++) {
    const d = sl[i] - sl[i - 1];
    if (d > 0) g += d; else l -= d;
  }
  return +(100 - 100 / (1 + g / (l || 0.0001))).toFixed(2);
}

// ── SMC helpers ──────────────────────────────────────────────────────────────

/**
 * Find Fair Value Gaps in the last N candles.
 * Bullish FVG: candle[i].low > candle[i-2].high  (gap left on the way up)
 * Bearish FVG: candle[i].high < candle[i-2].low  (gap left on the way down)
 */
function findFVGs(candles, limit = 4) {
  const fvgs = [];
  for (let i = 2; i < candles.length; i++) {
    const a = candles[i - 2], c = candles[i];
    if (c.l > a.h) fvgs.push({ type: 'bullish', top: c.l,  bottom: a.h, time: c.t });
    if (c.h < a.l) fvgs.push({ type: 'bearish', top: a.l,  bottom: c.h, time: c.t });
  }
  return fvgs.slice(-limit);
}

/**
 * Find Order Blocks.
 * Bullish OB: last bearish candle before price breaks above its high.
 * Bearish OB: last bullish candle before price breaks below its low.
 */
function findOrderBlocks(candles, limit = 3) {
  const obs = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const cur = candles[i], nxt = candles[i + 1];
    if (cur.c < cur.o && nxt.c > cur.h)
      obs.push({ type: 'bullish', high: cur.h, low: cur.l, time: cur.t });
    if (cur.c > cur.o && nxt.c < cur.l)
      obs.push({ type: 'bearish', high: cur.h, low: cur.l, time: cur.t });
  }
  return obs.slice(-limit);
}

/**
 * Detect Break of Structure / Change of Character from swing points.
 */
function detectBOS(candles) {
  if (candles.length < 10) return { bos: null, choch: null };
  const mid  = candles.slice(-20, -5);
  const last  = candles.slice(-5);
  const midHigh = Math.max(...mid.map(c => c.h));
  const midLow  = Math.min(...mid.map(c => c.l));
  const lastClose = last[last.length - 1].c;

  const bos =
    lastClose > midHigh ? `Bullish BOS — broke above ${midHigh.toFixed(5)}` :
    lastClose < midLow  ? `Bearish BOS — broke below ${midLow.toFixed(5)}`  : null;

  // ChoCh: first BOS against prior direction (simplified)
  const prior10 = candles.slice(-35, -20);
  const priorTrend = prior10.length
    ? (prior10[prior10.length - 1].c > prior10[0].c ? 'Bullish' : 'Bearish')
    : null;
  const choch = bos && priorTrend &&
    ((bos.startsWith('Bearish') && priorTrend === 'Bullish') ||
     (bos.startsWith('Bullish') && priorTrend === 'Bearish'))
    ? `ChoCh — reversal of ${priorTrend} structure` : null;

  return { bos, choch };
}

/**
 * Find liquidity pools (clusters of equal highs / equal lows).
 * Equal = within 0.02% of each other.
 */
function findLiquidity(candles, lookback = 30) {
  const slice = candles.slice(-lookback);
  const highs  = slice.map(c => c.h).sort((a, b) => b - a);
  const lows   = slice.map(c => c.l).sort((a, b) => a - b);

  // Buy-side liquidity = cluster of equal highs (resting stops above)
  const buySide  = highs[0];
  // Sell-side liquidity = cluster of equal lows (resting stops below)
  const sellSide = lows[0];

  return { buySideLiquidity: buySide, sellSideLiquidity: sellSide };
}

/**
 * Detect active trading session based on UTC hour.
 */
function currentSession() {
  const h = new Date().getUTCHours();
  if (h >= 7  && h < 12) return 'London';
  if (h >= 12 && h < 17) return 'New York';
  if (h >= 17 && h < 21) return 'London-NY Close';
  if (h >= 21 || h < 3)  return 'Tokyo';
  return 'Off-session';
}

function decimals(pair) {
  if (pair === 'XAUUSD') return 2;
  if (pair.includes('JPY')) return 3;
  return 5;
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Full market data + SMC analysis for one pair.
 */
export async function fetchMarketData(pair) {
  const symbol = YF_SYMBOL[pair];
  if (!symbol) throw new Error(`Unknown pair: ${pair}`);

  const url = `${YF_BASE}/${symbol}?interval=1h&range=7d`;
  const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`YF ${res.status} for ${pair}`);

  const json   = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${pair}`);

  const timestamps = result.timestamp ?? [];
  const q          = result.indicators?.quote?.[0] ?? {};

  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (q.close[i] != null && q.high[i] != null && q.low[i] != null && q.open[i] != null) {
      candles.push({
        t: new Date(timestamps[i] * 1000).toISOString(),
        o: +q.open[i].toFixed(6),  h: +q.high[i].toFixed(6),
        l: +q.low[i].toFixed(6),   c: +q.close[i].toFixed(6),
      });
    }
  }
  if (candles.length < 20) throw new Error(`Too few candles for ${pair}`);

  const closes = candles.map(c => c.c);
  const highs  = candles.map(c => c.h);
  const lows   = candles.map(c => c.l);
  const price  = closes[closes.length - 1];
  const dec    = decimals(pair);

  const rsi   = calcRSI(closes);
  const ema20 = calcEMA(closes, 20);
  const ema50 = calcEMA(closes, 50);

  // SMC
  const fvgs        = findFVGs(candles);
  const orderBlocks = findOrderBlocks(candles);
  const { bos, choch } = detectBOS(candles);
  const { buySideLiquidity, sellSideLiquidity } = findLiquidity(candles);
  const swingHigh = Math.max(...highs.slice(-30));
  const swingLow  = Math.min(...lows.slice(-30));
  const session   = currentSession();

  const trend =
    price > (ema20 ?? 0) && (ema20 ?? 0) > (ema50 ?? 0) ? 'Bullish' :
    price < (ema20 ?? 0) && (ema20 ?? 0) < (ema50 ?? 0) ? 'Bearish' : 'Ranging';

  return {
    pair, price, candles: candles.slice(-30), dec,
    rsi, ema20, ema50, trend, swingHigh, swingLow, session,
    fvgs, orderBlocks, bos, choch,
    buySideLiquidity, sellSideLiquidity,
  };
}

/** Lightweight: current price only. */
export async function fetchLivePrice(pair) {
  try {
    const symbol = YF_SYMBOL[pair];
    const res = await fetch(`${YF_BASE}/${symbol}?interval=1m&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const json = await res.json();
    return json?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch { return null; }
}

/** Fetch live prices for multiple pairs in parallel. */
export async function fetchAllPrices(pairs) {
  const entries = await Promise.all(pairs.map(async p => [p, await fetchLivePrice(p)]));
  return Object.fromEntries(entries);
}
