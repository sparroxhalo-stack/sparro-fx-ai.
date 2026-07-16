"""
Sparro FX AI — FastAPI backend
Deploy to Railway: https://railway.app
Start command: uvicorn backend:app --host 0.0.0.0 --port $PORT
"""

import os
import json
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Sparro FX AI Backend")

ANTHROPIC_KEY = os.getenv("ANTHROPIC_KEY", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")


# ── Request / Response models ────────────────────────────────────────────────

class SignalRequest(BaseModel):
    pair: str
    anthropic_key: str = ""   # app can override via request body


class TelegramRequest(BaseModel):
    signal: dict


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_anthropic_key(request_key: str) -> str:
    """Use request-level key first, fall back to server env var."""
    return request_key or ANTHROPIC_KEY


SYSTEM_PROMPT = """You are an expert forex trading analyst. Analyse the given currency pair and return a JSON signal.

Rules:
- direction: "BUY" or "SELL"
- grade: "A" (confidence ≥ 85%), "B" (≥ 70%), "C" (< 70%)
- confidence: integer 0-100
- entry, sl, tp1, tp2, tp3: realistic price levels (use current approximate market prices)
- reason: one sentence max, plain English

Return ONLY valid JSON, no markdown, no extra text.

Example:
{
  "pair": "EURUSD",
  "direction": "BUY",
  "grade": "A",
  "confidence": 88,
  "entry": 1.08540,
  "sl": 1.08120,
  "tp1": 1.08960,
  "tp2": 1.09380,
  "tp3": 1.09800,
  "reason": "Strong bullish momentum with RSI confirmation above key support."
}"""


async def call_claude(pair: str, api_key: str) -> dict:
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": "claude-3-haiku-20240307",
        "max_tokens": 300,
        "system": SYSTEM_PROMPT,
        "messages": [
            {
                "role": "user",
                "content": f"Analyse {pair} right now and give me a trading signal."
            }
        ]
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers=headers,
            json=body
        )
        resp.raise_for_status()
        text = resp.json()["content"][0]["text"].strip()
        return json.loads(text)


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def health():
    return {"status": "ok", "service": "Sparro FX AI Backend"}


@app.post("/signal")
async def get_signal(req: SignalRequest):
    api_key = get_anthropic_key(req.anthropic_key)
    if not api_key:
        raise HTTPException(status_code=400, detail="No Anthropic API key provided.")
    try:
        signal = await call_claude(req.pair, api_key)
        signal["pair"] = req.pair   # ensure pair is always set
        return signal
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Claude returned invalid JSON.")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Anthropic error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/telegram")
async def send_telegram(req: TelegramRequest):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return {"sent": False, "reason": "Telegram not configured"}
    sig = req.signal
    dp = 2 if (sig.get("entry", 0) or 0) > 100 else 5
    fmt = lambda v: f"{float(v):.{dp}f}" if v else "—"
    dir_emoji = "🚀" if sig.get("direction") == "BUY" else "📉"
    grade_emoji = {"A": "🏆", "B": "✅", "C": "⚠️"}.get(sig.get("grade", ""), "")
    text = (
        f"{dir_emoji} *{sig.get('direction')} {sig.get('pair')}* — Grade {sig.get('grade')} {grade_emoji}\n"
        f"Confidence: {sig.get('confidence')}%\n"
        f"Entry: `{fmt(sig.get('entry'))}` | SL: `{fmt(sig.get('sl'))}` | TP1: `{fmt(sig.get('tp1'))}`\n"
        f"_{sig.get('reason', '')}_"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "Markdown"}
        )
    return {"sent": True}
