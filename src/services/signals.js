/**
 * signals.js
 * Generates AI forex signals using SMC (Smart Money Concepts) strategy:
 *   Order Blocks, Fair Value Gaps, Break of Structure, Liquidity sweeps.
 *
 * Data pipeline:
 *   Yahoo Finance (real OHLCV) → SMC analysis → Claude Haiku → Trade signal
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

// ── SMC prompt builder ───────────────────────────────────────────────────────

function fmt(val, dec) {
  return val != null ? Number(val).toFixed(dec) : 'N/A';
}

function fvgLine(fvg, dec) {
  return `  [${fvg.type.toUpperCase()} FVG] ${fmt(fvg.bottom, dec)} – ${fmt(fvg.top, dec)} (${fvg.time.slice(11, 16)} UTC)`;
}

function obLine(ob, dec) {
  return `  [${ob.type.toUpperCase()} OB] ${fmt(ob.low, dec)} – ${fmt(ob.high, dec)} (${ob.time.slice(11, 16)} UTC)`;
}

function buildPrompt(market, news) {
  const { pair, price, candles, dec, rsi, ema20, ema50, trend,
          swingHigh, swingLow, session, fvgs, orderBlocks,
          bos, choch, buySideLiquidity, sellSideLiquidity } = market;

  const candleLines = candles.slice(-20).map(c =>
    `  ${c.t.slice(11, 16)} O:${fmt(c.o,dec)} H:${fmt(c.h,dec)} L:${fmt(c.l,dec)} C:${fmt(c.c,dec)}`
  ).join('\n');

  const fvgLines = fvgs.length
    ? fvgs.map(f => fvgLine(f, dec)).join('\n')
    : '  None detected';

  const obLines = orderBlocks.length
    ? orderBlocks.map(o => obLine(o, dec)).join('\n')
    : '  None detected';

  const newsLine = news
    ? `⚠️  HIGH-IMPACT NEWS: ${news}\n     If event is within 30 min → direction must be WAIT.`
    : '    No high-impact news in the next 90 minutes.';

  return `You are a professional SMC (Smart Money Concepts) forex trader specialising in prop firm challenge accounts. Analyse the live data below and produce a single H1 trade signal.

╔══════════════════════════════════════════╗
║  PAIR: ${pair.padEnd(7)} │ Session: ${session.padEnd(14)} ║
╚══════════════════════════════════════════╝
Current Price : ${fmt(price, dec)}
Trend (H1)    : ${trend}
RSI(14)       : ${rsi ?? 'N/A'}
EMA(20)       : ${fmt(ema20, dec)}
EMA(50)       : ${fmt(ema50, dec)}

─── MARKET STRUCTURE (SMC) ──────────────────
Break of Structure : ${bos ?? 'None detected'}
Change of Character: ${choch ?? 'None detected'}
Swing High         : ${fmt(swingHigh, dec)}
Swing Low          : ${fmt(swingLow, dec)}

─── ORDER BLOCKS ────────────────────────────
${obLines}

─── FAIR VALUE GAPS ─────────────────────────
${fvgLines}

─── LIQUIDITY ───────────────────────────────
Buy-side  (equal highs / resting stops above): ${fmt(buySideLiquidity, dec)}
Sell-side (equal lows  / resting stops below): ${fmt(sellSideLiquidity, dec)}

─── LAST 20 H1 CANDLES ──────────────────────
${candleLines}

─── NEWS ────────────────────────────────────
${newsLine}

═══ PROP FIRM RULES YOU MUST FOLLOW ════════
1. Entry MUST be at current price (${fmt(price, dec)}) ± spread, OR at an unmitigated OB/FVG level price is approaching NOW.
2. SL MUST go beyond the nearest swing high/low or OB extreme. Min 15 pips for majors, 150 pips for XAUUSD.
3. TP1 = 1.5× risk. TP2 = 2.5× risk. TP3 = 4× risk (liquidity target).
4. Grade A (≥85%): Must have ≥2 of: BOS/ChoCh confirmed + unmitigated OB + unfilled FVG + RSI extreme.
5. Grade B (70-84%): At least 1 strong SMC condition with clean structure.
6. Grade C (<70%) or WAIT: Unclear structure, news imminent, or no SMC confluence.
7. "setupType" must be one of: "OB+FVG" | "OB+BOS" | "LiquiditySweep" | "FVGFill" | "OBRetest" | "WAIT"

Respond ONLY with valid JSON, no markdown fences:
{
  "direction":   "BUY" | "SELL" | "WAIT",
  "setupType":   "OB+FVG" | "OB+BOS" | "LiquiditySweep" | "FVGFill" | "OBRetest" | "WAIT",
  "entry":       <number — current price or OB/FVG level>,
  "sl":          <number>,
  "tp1":         <number>,
  "tp2":         <number>,
  "tp3":         <number>,
  "grade":       "A" | "B" | "C",
  "confidence":  <integer 0-100>,
  "reason":      "<2-3 sentences: state the SMC setup, structure confirmation, and why this is high-probability>",
  "newsWarning": "<string or empty>"
}`;
}

// ── Claude call ──────────────────────────────────────────────────────────────

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
      max_tokens: 700,
      messages:   [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json    = await res.json();
  const raw     = json.content?.[0]?.text ?? '';
  const cleaned = raw.replace(/```(?:json)?|```/g, '').trim();
  return JSON.parse(cleaned);
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function fetchSignal(pair) {
  try {
    const apiKey = await getAnthropicKey();
    if (!apiKey) { console.warn('No Anthropic key'); return null; }

    const [market, news] = await Promise.all([
      fetchMarketData(pair),
      newsRiskSummary(pair),
    ]);

    const raw    = await callClaude(buildPrompt(market, news), apiKey);
    return {
      pair,
      direction:   raw.direction,
      setupType:   raw.setupType  ?? '—',
      grade:       raw.grade,
      confidence:  raw.confidence,
      entry:       raw.entry,
      sl:          raw.sl,
      tp1:         raw.tp1,
      tp2:         raw.tp2,
      tp3:         raw.tp3 ?? null,
      reason:      raw.reason,
      newsWarning: raw.newsWarning ?? '',
      // carry market context for display
      price:   market.price,
      rsi:     market.rsi,
      ema20:   market.ema20,
      ema50:   market.ema50,
      trend:   market.trend,
      session: market.session,
      bos:     market.bos,
      fvgs:    market.fvgs,
      orderBlocks: market.orderBlocks,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`fetchSignal(${pair}):`, err.message);
    return null;
  }
}

export async function fetchAllSignals(pairs = PAIRS) {
  const results = await Promise.allSettled(pairs.map(p => fetchSignal(p)));
  return results
    .filter(r => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .sort((a, b) => {
      const gr = { A: 0, B: 1, C: 2 };
      const gd = (gr[a.grade] ?? 3) - (gr[b.grade] ?? 3);
      return gd !== 0 ? gd : b.confidence - a.confidence;
    });
}

export async function sendTelegram(signal) {
  console.log('Telegram not configured', signal?.pair);
}
