/**
 * market.js
 * Fetches real OHLCV candle data from Yahoo Finance and computes
 * technical indicators (RSI, EMA, swing levels) needed for AI analysis.
 *
 * No API key required — public Yahoo Finance chart endpoint.
 */

// Yahoo Finance ticker suffixes
const YF_SYMBOL = {
  EURUSD: 'EURUSD=X',
  GBPUSD: 'GBPUSD=X',
  USDJPY: 'USDJPY=X',
  USDCHF: 'USDCHF=X',
  AUDUSD: 'AUDUSD=X',
  USDCAD: 'USDCAD=X',
  NZDUSD: 'NZDUSD=X',
  GBPJPY: 'GBPJPY=X',
  EURJPY: 'EURJPY=X',
  XAUUSD: 'XAUUSD=X',
};

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// ── Technical indicator helpers ──────────────────────────────────────────────

function calcEMA(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return +ema.toFixed(6);
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  const slice = closes.slice(-(period + 1));
  let gains = 0, losses = 0;
  for (let i = 1; i < slice.length; i++) {
    const diff = slice[i] - slice[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const rs = gains / (losses || 0.0001);
  return +(100 - 100 / (1 + rs)).toFixed(2);
}

function swingHighLow(highs, lows, lookback = 20) {
  const h = highs.slice(-lookback);
  const l = lows.slice(-lookback);
  return {
    swingHigh: +Math.max(...h).toFixed(6),
    swingLow:  +Math.min(...l).toFixed(6),
  };
}

function decimals(pair) {
  if (pair === 'XAUUSD') return 2;
  if (pair.includes('JPY')) return 3;
  return 5;
}

// ── Main fetch ───────────────────────────────────────────────────────────────

/**
 * Returns real market data for a forex pair:
 * { pair, price, candles (last 30), rsi, ema20, ema50, trend, swingHigh, swingLow, decimals }
 */
export async function fetchMarketData(pair) {
  const symbol = YF_SYMBOL[pair];
  if (!symbol) throw new Error(`Unknown pair: ${pair}`);

  const url = `${YF_BASE}/${symbol}?interval=1h&range=7d`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) throw new Error(`YF ${response.status} for ${pair}`);

  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`No data for ${pair}`);

  const timestamps = result.timestamp ?? [];
  const quote      = result.indicators?.quote?.[0] ?? {};
  const opens      = quote.open  ?? [];
  const highs      = quote.high  ?? [];
  const lows       = quote.low   ?? [];
  const closes     = quote.close ?? [];

  // Filter out null candles
  const candles = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (
      closes[i] != null && highs[i] != null &&
      lows[i] != null  && opens[i] != null
    ) {
      candles.push({
        t: new Date(timestamps[i] * 1000).toISOString(),
        o: +opens[i].toFixed(6),
        h: +highs[i].toFixed(6),
        l: +lows[i].toFixed(6),
        c: +closes[i].toFixed(6),
      });
    }
  }

  if (candles.length < 20) throw new Error(`Too few candles for ${pair}`);

  const closeSeries = candles.map(c => c.c);
  const highSeries  = candles.map(c => c.h);
  const lowSeries   = candles.map(c => c.l);

  const price   = closeSeries[closeSeries.length - 1];
  const rsi     = calcRSI(closeSeries);
  const ema20   = calcEMA(closeSeries, 20);
  const ema50   = calcEMA(closeSeries, 50);
  const { swingHigh, swingLow } = swingHighLow(highSeries, lowSeries);

  const trend =
    price > ema20 && ema20 > (ema50 ?? 0) ? 'Bullish' :
    price < ema20 && ema20 < (ema50 ?? 0) ? 'Bearish' :
    'Ranging';

  // Only send the last 30 candles to Claude (enough context, smaller prompt)
  const recentCandles = candles.slice(-30);

  return {
    pair,
    price,
    candles: recentCandles,
    rsi,
    ema20,
    ema50,
    trend,
    swingHigh,
    swingLow,
    decimals: decimals(pair),
  };
}

/**
 * Fetch just the current live price for a pair (lightweight).
 */
export async function fetchLivePrice(pair) {
  try {
    const symbol = YF_SYMBOL[pair];
    const url = `${YF_BASE}/${symbol}?interval=1m&range=1d`;
    const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    return meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch live prices for multiple pairs in parallel.
 * Returns { EURUSD: 1.08542, GBPUSD: 1.27340, ... }
 */
export async function fetchAllPrices(pairs) {
  const entries = await Promise.all(
    pairs.map(async (p) => [p, await fetchLivePrice(p)])
  );
  return Object.fromEntries(entries);
}
