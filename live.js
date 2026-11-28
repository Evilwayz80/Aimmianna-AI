/* Live together (2.4.23) — the live-together client.
   One WebSocket per phone to the household live room. No UI in this
   file, no DOM at import time, so Node can import it for the smoke
   harness. The app (app.js) owns the UI: the Live indicator, the
   shared feed, and the Live setup flow in Settings / the hub.

   Protocol: live-together-design-2026-11-27.md §3.1.
     hello {t, who, token, v:1} — token in the FIRST message only,
       never in the URL. Bad token -> the server closes the connection
       (4403) before any state is sent.
     pos {t, x, z, hd, mv, pose, room} — 5 Hz while moving, 1 Hz
       heartbeat while still.
     her-pos — same shape, sent by the HOST phone only, for Aimmianna.
     emote {t, name} — a tap, not a stream.
     shared-add {t, kind, text} / shared-del {t, id} — the shared
       memory store. shared-add text is capped at 240 chars here and
       on the server; the writer only ever accepts text created in
       shared contexts (the shared feed, shared events) — private
       chat, private notes, and private memory are never passed in.
     bye {t} — sent on page hide when possible; the server also
       drops anyone quiet for 15 s and broadcasts a bye.

   The household token is the 64-hex AUTH_TOKEN half of a pairing
   code (the part before the dot). Only that half is ever stored on
   the phone (localStorage, LIVE_TOKEN_KEY). The full code is shown
   ONCE when Tony makes it, for the one-time secure handoff to the
   server secret — it is never stored in full, never logged, and
   never hardcoded anywhere. No token here, no connection: live
   fails closed and the app works exactly as before.

   Host (Aimmianna): Tony's phone hosts her while he's online. If
   he goes offline, the guest who has been online longest takes
   over, so she stays one her instead of a different one on each
   phone. Election is deterministic from the roster every phone
   sees: Tony if present, else the earliest-joined guest. */

import { newPairingCode } from "./companion-memory.js";

export const LIVE_URL = "wss://aimmianna-live.aimmianna.workers.dev/room";
export const LIVE_TOKEN_KEY = "aimmianna_live_token_v1";
export const PRESENCE_TIMEOUT_MS = 15000; // quiet that long -> gone
const BACKOFF_MS = [1000, 2000, 5000, 15000, 30000];
const SEND_TICK_MS = 200; // 5 Hz while moving
const HEARTBEAT_MS = 1000; // 1 Hz while still
const MAX_SHARED_LEN = 240;
const TOKEN_RE = /^[a-f0-9]{64}$/;
const CODE_RE = /^[a-f0-9]{64}\.[a-f0-9]{64}$/;
const WHO = ["tony", "summer", "autumn"];
const SHARED_KINDS = ["note", "chat", "event", "routine", "game"];

// --- token handling (stored half only, never the full code) -------------

function defaultStore() {
  try { return globalThis.localStorage || null; } catch (e) { return null; }
}

export function liveTokenFromCode(code) {
  const c = String(code || "").trim().toLowerCase();
  if (!CODE_RE.test(c)) return "";
  return c.split(".")[0];
}

export function liveTokenValid(token) {
  return TOKEN_RE.test(String(token || "").trim().toLowerCase());
}

/* Pure look-ahead for a remote figure's target (design §4): the last
   received position plus velocity x 0.1 s, velocity from the last two
   samples, clamped to sane walking speed (3.2 — the fastest anyone
   moves, while skating). The world calls this from its tick; the
   harness unit-tests it directly. */
export function remoteLookahead(prev, last) {
  if (!prev || !last) return last ? { x: last.x, z: last.z } : { x: 0, z: 0 };
  const dt = (last.at - prev.at) / 1000;
  if (!(dt > 0)) return { x: last.x, z: last.z };
  let vx = (last.x - prev.x) / dt, vz = (last.z - prev.z) / dt;
  const sp = Math.hypot(vx, vz);
  const MAX_V = 3.2;
  if (sp > MAX_V) { vx *= MAX_V / sp; vz *= MAX_V / sp; }
  return { x: last.x + vx * 0.1, z: last.z + vz * 0.1 };
}

// --- the client ----------------------------------------------------------

export function createLiveClient(opts = {}) {
  const store = opts.storage || null; // tests pass a Map-backed store
  const WS = opts.WebSocket || globalThis.WebSocket;
  const now = opts.now || (() => Date.now());
  const presenceTimeoutMs = opts.presenceTimeoutMs || PRESENCE_TIMEOUT_MS;
  const url = opts.url || LIVE_URL;
  const hooks = opts.hooks || {};
  const storage = () => store || defaultStore();

  let ws = null;
  let who = null; // "tony" | "summer" | "autumn"
  let state = "off"; // off | connecting | live
  let attempt = 0; // reconnect backoff step
  let welcomed = false; // true once a welcome has arrived this session
  let connectTimer = null;
  let sendTimer = null;
  let watchTimer = null;
  let manualClose = false;
  let lastSentAt = 0;
  let lastSentPose = null;
  let lastHerSentAt = 0;
  let lastHerSentPose = null;
  let present = []; // roster, in server order
  let joined = {}; // who -> ms (server "joined" map when present)
  let lastSeen = {}; // who -> ms of last message from them
  let host = null; // elected host for Aimmianna

  function say(msg) { try { if (hooks.onStatus) hooks.onStatus(msg); } catch (e) {} }

  function storeGet() { try { const s = storage(); return s ? s.getItem(LIVE_TOKEN_KEY) || "" : ""; } catch (e) { return ""; } }
  function storeSet(v) { try { const s = storage(); if (s) s.setItem(LIVE_TOKEN_KEY, v); } catch (e) {} }
  function storeClear() { try { const s = storage(); if (s) s.removeItem(LIVE_TOKEN_KEY); } catch (e) {} }

  function hasToken() { return liveTokenValid(storeGet()); }

  // Make a fresh live code (Tony's phone). Returns the FULL code for
  // the one-time secure handoff — show it once, never store it in
  // full, never log it. Only the token half is kept on the phone.
  function makeCode() {
    const code = newPairingCode();
    const token = liveTokenFromCode(code);
    if (!token) throw new Error("Could not make a live code — try again.");
    storeSet(token);
    return code;
  }

  // Save a live code typed on this phone (Tony's code, handed over
  // once). Validates the full code, keeps only the token half.
  function setCode(code) {
    const token = liveTokenFromCode(code);
    if (!token) return false;
    storeSet(token);
    return true;
  }

  function clearToken() { storeClear(); disconnect(); }

  function electHost() {
    let next = null;
    if (present.includes("tony")) next = "tony";
    else if (present.length) {
      let best = null, bestAt = Infinity;
      for (const w of present) {
        const at = joined[w] != null ? joined[w] : Infinity;
        if (at < bestAt) { bestAt = at; best = w; }
      }
      next = best || present[0];
    }
    if (next !== host) {
      host = next;
      try { if (hooks.onHostChange) hooks.onHostChange(host); } catch (e) {}
    }
    return host;
  }

  function amHost() { return !!who && host === who; }

  function send(obj) {
    if (!ws || ws.readyState !== 1) return false; // 1 = OPEN
    try { ws.send(JSON.stringify(obj)); return true; }
    catch (e) { return false; }
  }

  function sendTick() {
    if (state !== "live") return;
    const t = now();
    // My own position: 5 Hz while moving or the pose changed, else a
    // 1 Hz heartbeat (which is also the presence proof).
    try {
      const local = hooks.getLocalState ? hooks.getLocalState() : null;
      if (local && typeof local.x === "number" && typeof local.z === "number") {
        const moving = local.mv === 1;
        const poseChanged = local.pose !== lastSentPose;
        if (moving || poseChanged || t - lastSentAt >= HEARTBEAT_MS) {
          if (send({ t: "pos", x: +local.x.toFixed(2), z: +local.z.toFixed(2), hd: +(local.hd || 0).toFixed(2), mv: moving ? 1 : 0, pose: String(local.pose || "idle").slice(0, 32), room: String(local.room || "living").slice(0, 32) })) {
            lastSentAt = t; lastSentPose = local.pose;
          }
        }
      }
    } catch (e) {}
    // Aimmianna, from the host phone only, on the same cadence.
    try {
      if (amHost() && hooks.getHerState) {
        const her = hooks.getHerState();
        if (her && typeof her.x === "number" && typeof her.z === "number") {
          const moving = her.mv === 1;
          const poseChanged = her.pose !== lastHerSentPose;
          if (moving || poseChanged || t - lastHerSentAt >= HEARTBEAT_MS) {
            if (send({ t: "her-pos", x: +her.x.toFixed(2), z: +her.z.toFixed(2), hd: +(her.hd || 0).toFixed(2), mv: moving ? 1 : 0, pose: String(her.pose || "idle").slice(0, 32), room: String(her.room || "living").slice(0, 32) })) {
              lastHerSentAt = t; lastHerSentPose = her.pose;
            }
          }
        }
      }
    } catch (e) {}
  }

  function watchPresence() {
    if (state !== "live") return;
    const t = now();
    for (const w of [...present]) {
      if (w === who) continue;
      if (lastSeen[w] != null && t - lastSeen[w] > presenceTimeoutMs) {
        noteBye(w);
      }
    }
  }

  function noteJoin(w) {
    if (!WHO.includes(w) || w === who) return;
    if (!present.includes(w)) {
      present.push(w);
      if (joined[w] == null) joined[w] = now();
      lastSeen[w] = now();
      electHost();
    }
  }

  function noteBye(w) {
    if (!WHO.includes(w)) return;
    const wasThere = present.includes(w);
    present = present.filter((x) => x !== w);
    delete joined[w];
    delete lastSeen[w];
    electHost();
    if (wasThere) { try { if (hooks.onBye) hooks.onBye(w); } catch (e) {} }
  }

  function dispatch(data) {
    if (!data || typeof data !== "object" || typeof data.t !== "string") return;
    switch (data.t) {
      case "welcome": {
        welcomed = true;
        attempt = 0;
        present = Array.isArray(data.present) ? data.present.filter((w) => WHO.includes(w)) : [];
        joined = {};
        const t0 = now();
        if (data.joined && typeof data.joined === "object") {
          for (const w of present) if (typeof data.joined[w] === "number") joined[w] = data.joined[w];
        }
        // No joined map (older server): roster order is join order.
        present.forEach((w, i) => { if (joined[w] == null) joined[w] = t0 + i; });
        lastSeen = {};
        for (const w of present) lastSeen[w] = t0;
        // Become live BEFORE any hook fires: the hooks (the app's Live
        // indicator, the host line) read isConnected(), and a welcome
        // that renders while the state still says "connecting" leaves
        // the room looking off until the next roster event.
        const wasLive = state === "live";
        state = "live";
        if (!wasLive) {
          sendTimer = setInterval(sendTick, SEND_TICK_MS);
          watchTimer = setInterval(watchPresence, 1000);
        }
        electHost();
        try { if (hooks.onWelcome) hooks.onWelcome({ present: [...present], sharedRecent: Array.isArray(data.sharedRecent) ? data.sharedRecent : [], joined: { ...joined } }); } catch (e) {}
        if (!wasLive) sendTick();
        return;
      }
      case "pos": {
        if (!WHO.includes(data.who) || data.who === who) return;
        if (typeof data.x !== "number" || typeof data.z !== "number") return;
        noteJoin(data.who);
        lastSeen[data.who] = now();
        try { if (hooks.onPos) hooks.onPos(data.who, { x: data.x, z: data.z, hd: typeof data.hd === "number" ? data.hd : 0, mv: data.mv === 1 ? 1 : 0, pose: typeof data.pose === "string" ? data.pose : "idle", room: typeof data.room === "string" ? data.room : "living", seq: data.seq, at: now() }); } catch (e) {}
        return;
      }
      case "her-pos": {
        // Only the elected host's her counts — anyone else's is ignored.
        // (The server stamps host from the connection; a stale host's
        // positions must never fight the new host's.)
        if (data.host !== host || !data.host || data.host === who) return;
        if (typeof data.x !== "number" || typeof data.z !== "number") return;
        try { if (hooks.onHerPos) hooks.onHerPos({ x: data.x, z: data.z, hd: typeof data.hd === "number" ? data.hd : 0, mv: data.mv === 1 ? 1 : 0, pose: typeof data.pose === "string" ? data.pose : "idle", room: typeof data.room === "string" ? data.room : "living", host: data.host, seq: data.seq, at: now() }); } catch (e) {}
        return;
      }
      case "emote": {
        if (!WHO.includes(data.who) || data.who === who) return;
        if (typeof data.name !== "string") return;
        try { if (hooks.onEmote) hooks.onEmote(data.who, data.name); } catch (e) {}
        return;
      }
      case "shared": {
        if (!data.entry || typeof data.entry !== "object") return;
        try { if (hooks.onShared) hooks.onShared(data.entry); } catch (e) {}
        return;
      }
      case "shared-del": {
        if (typeof data.id !== "string") return;
        try { if (hooks.onSharedDel) hooks.onSharedDel(data.id); } catch (e) {}
        return;
      }
      case "bye": {
        if (!WHO.includes(data.who)) return;
        noteBye(data.who);
        return;
      }
      default: return;
    }
  }

  function clearTimers() {
    if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
    if (sendTimer) { clearInterval(sendTimer); sendTimer = null; }
    if (watchTimer) { clearInterval(watchTimer); watchTimer = null; }
  }

  function scheduleReconnect() {
    if (manualClose || state === "off") return;
    // Never welcomed after 3 tries: the room isn't answering (no token
    // on the server, or no network). Stop quietly instead of hammering
    // it — the app works fine offline, and opening the app again
    // retries. An established session that drops keeps retrying.
    if (!welcomed && attempt >= 3) {
      state = "off";
      say("The live room isn't answering right now — live stays off, and the app works as before. It'll try again when you open the app.");
      return;
    }
    const delay = BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length - 1)];
    attempt++;
    state = "connecting";
    connectTimer = setTimeout(() => { if (!manualClose && state !== "off") openSocket(); }, delay);
  }

  function openSocket() {
    if (!who || !hasToken()) { state = "off"; return; }
    if (!WS) { state = "off"; say("This phone can't open a live connection — live stays off."); return; }
    state = "connecting";
    let socket;
    try { socket = new WS(url); }
    catch (e) { scheduleReconnect(); return; }
    ws = socket;
    socket.onopen = () => {
      // The token goes in this FIRST message only, never in the URL.
      send({ t: "hello", who, token: storeGet(), v: 1 });
    };
    socket.onmessage = (ev) => {
      let data = null;
      try { data = JSON.parse(typeof ev.data === "string" ? ev.data : ""); } catch (e) { return; }
      dispatch(data);
      if (state === "connecting" && welcomed) {
        state = "live";
        sendTimer = setInterval(sendTick, SEND_TICK_MS);
        watchTimer = setInterval(watchPresence, 1000);
        sendTick();
      }
    };
    socket.onclose = (ev) => {
      clearTimers();
      if (ws === socket) ws = null;
      if (manualClose || state === "off") { state = "off"; return; }
      // 4403 = the room refused this phone (bad token / no token on the
      // server). Don't retry a refused hello — say so plainly.
      if (ev && ev.code === 4403) {
        state = "off";
        say("The live room refused this phone — the live code isn't right, or the room's lock isn't set yet. Check Live setup in Settings.");
        return;
      }
      if (ev && (ev.code === 4408 || ev.code === 4409)) {
        state = "off";
        say("The live room closed the connection (too many messages, or one too big). Live stays off for now.");
        return;
      }
      scheduleReconnect();
    };
    socket.onerror = () => { /* onclose follows and drives the retry */ };
  }

  function connect(nextWho) {
    if (!WHO.includes(nextWho)) return false;
    if (state === "live" && who === nextWho) return true;
    disconnect();
    who = nextWho;
    manualClose = false;
    welcomed = false;
    attempt = 0;
    present = [];
    joined = {};
    lastSeen = {};
    host = null;
    if (!hasToken()) {
      state = "off";
      say("Live isn't set up on this phone yet — see Live together in the hub or Settings.");
      return false;
    }
    openSocket();
    return true;
  }

  function disconnect() {
    manualClose = true;
    clearTimers();
    if (ws) {
      try { if (ws.readyState === 1) ws.send(JSON.stringify({ t: "bye" })); } catch (e) {}
      try { ws.close(1000, "bye"); } catch (e) {}
      ws = null;
    }
    state = "off";
    present = [];
    joined = {};
    lastSeen = {};
    if (host !== null) { host = null; try { if (hooks.onHostChange) hooks.onHostChange(null); } catch (e) {} }
    who = null;
  }

  // Shared memory: the ONLY way anything reaches the shared store.
  // Callers pass text created in shared contexts only (the shared
  // feed box, shared events). Private chat, private notes, and
  // private memory are never passed here — the server can't tell
  // private from shared, so the client must never send it.
  function sharedAdd(kind, text) {
    if (state !== "live") return false;
    if (!SHARED_KINDS.includes(kind)) return false;
    const clean = String(text || "").trim().slice(0, MAX_SHARED_LEN);
    if (!clean) return false;
    return send({ t: "shared-add", kind, text: clean });
  }

  function sharedDel(id) {
    if (state !== "live") return false;
    if (typeof id !== "string" || !id) return false;
    return send({ t: "shared-del", id });
  }

  function sendEmote(name) {
    if (state !== "live") return false;
    if (typeof name !== "string" || !/^[A-Za-z0-9_]{1,32}$/.test(name)) return false;
    return send({ t: "emote", name });
  }

  // Backgrounding: say bye so the room drops this avatar at once
  // instead of waiting out the 15-second timeout; coming back
  // re-says hello and gets a fresh welcome. Guarded for Node.
  // (Suspend is not a manual disconnect: the visible half reconnects.)
  let suspended = false;
  if (typeof document !== "undefined" && document && document.addEventListener) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (state === "live" && ws) { try { ws.send(JSON.stringify({ t: "bye" })); } catch (e) {} }
        suspended = true;
        clearTimers();
        if (ws) { try { ws.close(1000, "hidden"); } catch (e) {} ws = null; }
        state = "off";
      } else if (suspended && who && hasToken() && state === "off") {
        suspended = false;
        manualClose = false;
        openSocket();
      }
    });
  }
  if (typeof window !== "undefined" && window && window.addEventListener) {
    window.addEventListener("pagehide", () => {
      if (state === "live" && ws) { try { ws.send(JSON.stringify({ t: "bye" })); } catch (e) {} }
    });
    window.addEventListener("online", () => {
      if (who && hasToken() && state === "off") { manualClose = false; openSocket(); }
    });
  }

  return {
    connect, disconnect, sendEmote, sharedAdd, sharedDel,
    makeCode, setCode, clearToken, hasToken,
    isConnected: () => state === "live",
    getState: () => state,
    getWho: () => who,
    getHost: () => host,
    amHost: () => amHost(),
    getPresent: () => [...present],
  };
}
