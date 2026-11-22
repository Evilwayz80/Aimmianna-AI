"""Aimmianna 3D — tiny companion server.

Serves the app and two voice routes:
  POST /api/tts   {text, voice, rate, pitch} -> audio/mpeg  (free Microsoft Edge neural voices via edge-tts)
  POST /api/fish  {key, voice, text}         -> audio/mpeg  (Fish Audio proxy; Fish doesn't send CORS headers)
  GET  /api/health

Run:  pip install fastapi uvicorn edge-tts   (aiohttp comes with edge-tts)
      python server.py            (http://0.0.0.0:8000)
Keys sent to /api/fish are forwarded to Fish Audio only, never stored or logged.
"""
import hashlib
import os
from collections import OrderedDict

import edge_tts
import aiohttp
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ROOT = os.path.dirname(os.path.abspath(__file__))
MAX_CHARS = 1500
ALLOWED_VOICES = {
    "en-US-JennyNeural", "en-US-AriaNeural", "en-US-AvaNeural", "en-US-EmmaNeural",
    "en-US-MichelleNeural", "en-US-AnaNeural", "en-US-AvaMultilingualNeural", "en-US-EmmaMultilingualNeural",
}

app = FastAPI(title="Aimmianna 3D")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_cache: "OrderedDict[str, bytes]" = OrderedDict()


def _cache_put(k: str, v: bytes) -> None:
    _cache[k] = v
    _cache.move_to_end(k)
    while len(_cache) > 120:
        _cache.popitem(last=False)


class TTSIn(BaseModel):
    text: str
    voice: str = "en-US-JennyNeural"
    rate: str = "+6%"
    pitch: str = "+6Hz"


def _clean_pct(v: str, default: str, unit: str) -> str:
    v = (v or "").strip()
    if not v or v[0] not in "+-":
        return default
    num = v[1:].replace(unit, "")
    return v if num.isdigit() and int(num) <= 50 else default


@app.post("/api/tts")
async def tts(body: TTSIn):
    text = (body.text or "").strip()[:MAX_CHARS]
    if not text:
        raise HTTPException(400, "empty text")
    voice = body.voice if body.voice in ALLOWED_VOICES else "en-US-JennyNeural"
    rate = _clean_pct(body.rate, "+6%", "%")
    pitch = _clean_pct(body.pitch, "+6Hz", "Hz")
    key = hashlib.sha1(f"{voice}|{rate}|{pitch}|{text}".encode()).hexdigest()
    if key in _cache:
        return Response(_cache[key], media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=86400"})
    buf = bytearray()
    try:
        com = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                buf.extend(chunk["data"])
    except Exception as e:  # network hiccup / service change
        raise HTTPException(502, f"tts failed: {type(e).__name__}")
    if not buf:
        raise HTTPException(502, "no audio")
    data = bytes(buf)
    _cache_put(key, data)
    return Response(data, media_type="audio/mpeg", headers={"Cache-Control": "public, max-age=86400"})


class FishIn(BaseModel):
    key: str
    voice: str
    text: str


@app.post("/api/fish")
async def fish(body: FishIn):
    text = (body.text or "").strip()[:1000]
    if not (body.key and body.voice and text):
        raise HTTPException(400, "missing key, voice or text")
    async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=60)) as c:
        async with c.post(
            "https://api.fish.audio/v1/tts",
            headers={"Authorization": f"Bearer {body.key.strip()}", "model": "s2.1-pro-free",
                     "Content-Type": "application/json", "Accept": "audio/mpeg"},
            json={"text": text, "reference_id": body.voice.strip(), "format": "mp3"},
        ) as r:
            data = await r.read()
            if r.status != 200:
                return Response(data[:500], status_code=r.status, media_type="text/plain")
    return Response(data, media_type="audio/mpeg")



# ---------------- her home folder (server sync) ----------------
# All of her in one place on this computer:
#   aimmianna-home/aimmianna-data.json        (always the latest)
#   aimmianna-home/backups/aimmianna-YYYY-MM-DD.json   (one per day, last 14)
# Protected by the private "home key" you type in Settings. The first key used
# becomes the key (only its SHA-256 is stored, in aimmianna-home/.homekey).
import datetime, hmac
HOME = os.environ.get("AIMMIANNA_HOME", os.path.join(ROOT, "aimmianna-home"))
MAX_HOME = 60 * 1024 * 1024


def _home_auth(request: Request):
    key = (request.headers.get("x-home-key") or "").strip()
    if len(key) < 8:
        raise HTTPException(403, "home key required")
    os.makedirs(os.path.join(HOME, "backups"), exist_ok=True)
    kf = os.path.join(HOME, ".homekey")
    digest = hashlib.sha256(key.encode()).hexdigest()
    if not os.path.exists(kf):
        with open(kf, "w") as f:
            f.write(digest)
        return
    with open(kf) as f:
        if not hmac.compare_digest(f.read().strip(), digest):
            raise HTTPException(403, "wrong home key")


@app.get("/api/home")
async def home_get(request: Request):
    _home_auth(request)
    fp = os.path.join(HOME, "aimmianna-data.json")
    if not os.path.exists(fp):
        raise HTTPException(404, "no save yet")
    with open(fp, "rb") as f:
        return Response(f.read(), media_type="application/json", headers={"Cache-Control": "no-store"})


@app.put("/api/home")
async def home_put(request: Request):
    _home_auth(request)
    body = await request.body()
    if not body or len(body) > MAX_HOME or not body.lstrip().startswith(b"{"):
        raise HTTPException(400, "not an Aimmianna save")
    fp = os.path.join(HOME, "aimmianna-data.json")
    tmp = fp + ".tmp"
    with open(tmp, "wb") as f:
        f.write(body)
    os.replace(tmp, fp)  # atomic: never a half-written file
    bdir = os.path.join(HOME, "backups")
    day = os.path.join(bdir, "aimmianna-%s.json" % datetime.date.today().isoformat())
    if not os.path.exists(day):
        with open(day, "wb") as f:
            f.write(body)
    olds = sorted(n for n in os.listdir(bdir) if n.startswith("aimmianna-") and n.endswith(".json"))
    for n in olds[:-14]:
        try:
            os.remove(os.path.join(bdir, n))
        except OSError:
            pass
    return {"ok": True, "bytes": len(body), "where": os.path.abspath(fp)}


@app.api_route("/aimmianna-home/{rest:path}", methods=["GET", "HEAD"])
async def home_private(rest: str):
    # her saved file is private — never served as a static file
    raise HTTPException(404)

@app.get("/api/health")
async def health():
    return JSONResponse({"ok": True, "tts": "edge-tts", "voices": sorted(ALLOWED_VOICES)})


# static app last, so /api/* wins
app.mount("/", StaticFiles(directory=ROOT, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
