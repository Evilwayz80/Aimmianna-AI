/* Aimmianna — Spirit Game (v2.4.4)
   A spirit-hunting game built to FEEL real. Tony knows it cannot contact
   the dead — the goal is the feeling: accurate question-and-answer sessions,
   a spirit-box radio that sweeps and catches words, things seen through the
   AR camera, and real sensor readings shaping what comes through so
   responses feel earned, not canned.
   Honest framing, shown in How to play: the readings are real, the voices
   are generated. It can't reach the dead, and it will never pretend to be
   someone real. No real person's name, voice, or likeness is ever used.
   Everything here is play-only. No real money, no real purchases. */

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtTime = (s) => { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ":" + String(r).padStart(2, "0"); };

/* ---------- word banks: all original, no real-person names ---------- */
const BOX_WORDS = [
  "cold", "behind you", "listen", "the stairs", "not alone", "follow",
  "darkness", "waiting", "go back", "knock", "the window", "mirror",
  "candle", "whisper", "shiver", "the door", "attic", "basement",
  "old house", "the garden", "run", "stay", "leave", "help me",
  "come closer", "too late", "the bridge", "a light", "the well",
  "hush", "the cellar", "don't go", "again", "the road", "a bell",
  "the gate", "the woods", "my room", "the smoke", "a shadow",
  "the hallway", "down here", "look up", "the floor", "a key",
  "the fire", "the rain", "tonight", "a voice", "the stairs again"
];
const SPIRIT_NAMES = [
  "Wisp", "Hollow", "Marrow", "The Caretaker", "Little Lantern",
  "The Gardener", "Sable", "Wren", "The Watcher", "Ember",
  "The Ferryman", "Moth"
];
const OUIJA_WORDS = [
  "YES", "NO", "MAYBE", "LATER", "NOT NOW", "ASK AGAIN", "LEAVE",
  "STAY", "FOLLOW", "LISTEN", "COLD", "DARK", "LIGHT", "DOOR",
  "BEHIND", "NEAR", "FAR", "SOON", "NEVER", "ALWAYS", "GOODBYE"
];
const ASK_PHRASES = [
  "not yet", "the door is open", "it watches", "a cold spot",
  "soon, very soon", "the old one knows", "follow the sound",
  "not here", "deeper in", "the light fades", "ask the board",
  "it heard you", "the stairs creak", "a name you don't know",
  "the garden gate", "the mirror lies", "listen closer",
  "after midnight", "when the bell rings", "the feeling stays"
];
const ASK_KEYS = [
  { keys: ["door", "gate", "open"], words: ["the door is open", "a door, unlatched", "the gate creaks"] },
  { keys: ["cold", "chill", "freez"], words: ["a cold spot", "the cold follows you", "colder than before"] },
  { keys: ["who", "name"], words: ["a name you don't know", "it won't say", "the old one knows"] },
  { keys: ["where", "place", "here"], words: ["not here", "deeper in", "the old house"] },
  { keys: ["safe", "harm", "hurt"], words: ["not tonight", "it only watches", "stay near the light"] },
  { keys: ["leave", "go away", "gone"], words: ["it never left", "the road is long", "not yet"] },
  { keys: ["love", "miss", "care"], words: ["it remembers", "the feeling stays", "a light in the dark"] },
  { keys: ["when", "time", "soon"], words: ["soon, very soon", "when the bell rings", "after midnight"] }
];
const WISP_GLYPHS = ["☾", "✦", "✧", "❋", "○", "◌"];

/* ================================================================
   makeSpiritGame(container, deps)
   container: element to render into.
   deps: { state: () => appState, save: () => saveState(),
           toast: (msg) => void, gainXP: (kind, n) => void,
           speak: (text) => void } — every field is optional; when
   state/save are missing the module keeps its own localStorage save.
   Returns { render, status, open(view), _debug }.
   ================================================================ */
export function makeSpiritGame(container, deps) {
  deps = deps || {};
  const LS_KEY = "aimmianna_spirit_v1";
  let fallback = null;
  function fallbackState() {
    if (fallback) return fallback;
    try { fallback = JSON.parse(localStorage.getItem(LS_KEY) || "null") || {}; } catch (e) { fallback = {}; }
    return fallback;
  }
  function fallbackSave() { try { localStorage.setItem(LS_KEY, JSON.stringify(fallback || {})); } catch (e) {} }
  const state = () => (deps.state ? deps.state() : fallbackState());
  const save = () => { if (deps.save) deps.save(); else fallbackSave(); };
  const toast = (m) => { if (deps.toast) deps.toast(m); };
  const gainXP = (k, n) => { if (deps.gainXP) deps.gainXP(k, n); };
  const speak = (t) => { if (deps.speak) deps.speak(t); };

  function S() {
    const st = state();
    if (!st.spirit) st.spirit = { log: [], evp: [], words: [], captures: 0, counts: { box: 0, ask: 0, ouija: 0, evp: 0 } };
    const s = st.spirit;
    s.log = s.log || []; s.evp = s.evp || []; s.words = s.words || [];
    s.counts = s.counts || { box: 0, ask: 0, ouija: 0, evp: 0 };
    s.captures = s.captures || 0;
    return s;
  }

  /* ---------------------------------------------------------- dom helpers */
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function injectStyles() {
    if (document.getElementById("spirit-style")) return;
    const s = document.createElement("style"); s.id = "spirit-style";
    s.textContent = [
      ".spirit-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}",
      ".spirit-tabs button{flex:1 1 auto;padding:8px 6px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:13px;cursor:pointer}",
      ".spirit-tabs button.on{background:var(--purple);border-color:var(--purple-soft);color:#fff}",
      ".spirit-sensors{font-size:12px;color:var(--muted);background:#120b16;border:1px solid var(--border);border-radius:10px;padding:7px 10px;margin:6px 0;line-height:1.5}",
      ".spirit-sensors b{color:var(--text)}",
      ".spirit-meter{height:12px;border-radius:6px;background:#241a2c;border:1px solid var(--border);overflow:hidden;margin:8px 0}",
      ".spirit-meter i{display:block;height:100%;width:0%;background:linear-gradient(90deg,var(--purple-soft),var(--pink));transition:width .15s}",
      ".spirit-word{font-size:26px;font-weight:700;color:var(--pink);text-align:center;min-height:36px;margin:10px 0;letter-spacing:.02em}",
      ".spirit-word small{display:block;font-size:12px;color:var(--muted);font-weight:400;margin-top:2px}",
      ".spirit-freq{font-size:13px;color:var(--muted);text-align:center}",
      ".spirit-freq b{color:var(--gold)}",
      ".spirit-board{position:relative;border:1px solid var(--border);border-radius:14px;background:linear-gradient(160deg,#241a2c,#120b16);padding:14px 10px 10px;margin:10px 0;overflow:hidden}",
      ".spirit-board .row{display:flex;flex-wrap:wrap;justify-content:center;gap:2px}",
      ".spirit-board .cell{width:30px;height:30px;display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--text);font-size:15px;border-radius:6px}",
      ".spirit-board .cell.num{color:var(--gold)}",
      ".spirit-board .corner{display:flex;justify-content:space-between;margin-bottom:8px}",
      ".spirit-board .corner span{font-size:13px;font-weight:700;color:var(--pink);padding:2px 8px;border:1px solid var(--border);border-radius:8px}",
      ".spirit-planchette{position:absolute;width:64px;height:44px;margin:-22px 0 0 -32px;border-radius:50% 50% 40% 40%;background:rgba(165,94,234,.28);border:2px solid var(--purple-soft);box-shadow:0 0 18px rgba(165,94,234,.55);pointer-events:none;transition:left .3s ease,top .3s ease;z-index:2}",
      ".spirit-planchette:after{content:\"\";position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;background:#fff;opacity:.85}",
      ".spirit-lens{position:relative;border-radius:14px;overflow:hidden;border:1px solid var(--border);background:#000;aspect-ratio:3/4;max-height:62vh;margin:10px auto}",
      ".spirit-lens video{width:100%;height:100%;object-fit:cover;display:block}",
      ".spirit-lens canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}",
      ".spirit-lens .lens-off{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;text-align:center;padding:20px}",
      ".spirit-log{list-style:none;padding:8px 10px;margin:8px 0;border-radius:12px;background:#120b16;border:1px solid var(--border);font-size:12.5px;color:var(--muted);max-height:220px;overflow-y:auto}",
      ".spirit-log li{padding:4px 0;border-bottom:1px solid #241a2c}",
      ".spirit-log li:last-child{border-bottom:0}",
      ".spirit-log b{color:var(--text)}",
      ".spirit-log .a{color:var(--pink)}",
      ".spirit-input{width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:14px;margin:8px 0}",
      ".spirit-answer{font-size:17px;font-weight:700;color:var(--pink);text-align:center;min-height:26px;margin:8px 0}",
      ".spirit-evp{display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #241a2c;font-size:13px}",
      ".spirit-evp audio{flex:1;min-width:0;height:32px}",
      ".spirit-evp .meta{color:var(--muted);font-size:12px;white-space:nowrap}"
    ].join("\n");
    document.head.appendChild(s);
  }

  /* ---------------------------------------------------------- sensors */
  const sensors = { motion: 0, heading: null, mic: 0, motionOn: false, orientOn: false, micOn: false, listening: false, lastHeading: null, headingMove: 0 };
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const x = a.x || 0, y = a.y || 0, z = a.z || 0;
    const mag = Math.sqrt(x * x + y * y + z * z);
    const move = clamp(Math.abs(mag - 9.81) / 3, 0, 1);
    sensors.motion = sensors.motion * 0.7 + move * 0.3;
    sensors.motionOn = true;
  }
  function onOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === "number") h = e.webkitCompassHeading;
    else if (typeof e.alpha === "number") h = (360 - e.alpha) % 360;
    if (h === null) return;
    if (sensors.lastHeading !== null) {
      let d = Math.abs(h - sensors.lastHeading);
      if (d > 180) d = 360 - d;
      sensors.headingMove = sensors.headingMove * 0.8 + Math.min(d / 30, 1) * 0.2;
    }
    sensors.lastHeading = h; sensors.heading = h; sensors.orientOn = true;
  }
  function startSensorListeners() {
    if (sensors.listening) return;
    sensors.listening = true;
    try {
      window.addEventListener("devicemotion", onMotion, { passive: true });
      window.addEventListener("deviceorientation", onOrient, { passive: true });
    } catch (e) {}
  }
  function needsSensorPermission() {
    try {
      return (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") ||
        (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function");
    } catch (e) { return false; }
  }
  async function enableSensors() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== "granted") { toast("Sensor permission was not granted — the game still works, but the readings stay flat."); return; }
      }
      if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
        await DeviceMotionEvent.requestPermission();
      }
    } catch (e) { toast("Couldn't ask for sensor permission on this device."); return; }
    startSensorListeners();
    render();
  }
  function presence() {
    return clamp(0.5 * sensors.motion + 0.35 * sensors.mic + 0.15 * sensors.headingMove + 0.05, 0, 1);
  }
  // Start listening right away where no permission prompt exists (Android/desktop).
  if (!needsSensorPermission()) startSensorListeners();

  /* ---------------------------------------------------------- audio */
  let audioCtx = null, micStream = null, micAnalyser = null, micData = null, micTick = null;
  function ensureAudio() {
    if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function noiseBuffer(ctx) {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  function staticBurst(dur) {
    const ctx = ensureAudio(); if (!ctx) return;
    try {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.35, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.4));
      src.connect(g); g.connect(ctx.destination);
      src.start(); src.stop(ctx.currentTime + (dur || 0.4) + 0.05);
    } catch (e) {}
  }
  async function enableMic() {
    if (micStream) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("This device doesn't offer mic access here."); return false; }
    try {
      const ctx = ensureAudio(); if (!ctx) return false;
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const src = ctx.createMediaStreamSource(micStream);
      micAnalyser = ctx.createAnalyser(); micAnalyser.fftSize = 512;
      micData = new Uint8Array(micAnalyser.fftSize);
      src.connect(micAnalyser);
      sensors.micOn = true;
      if (!micTick) micTick = setInterval(() => {
        if (!micAnalyser || !micData) return;
        micAnalyser.getByteTimeDomainData(micData);
        let sum = 0;
        for (let i = 0; i < micData.length; i++) { const v = (micData[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / micData.length);
        sensors.mic = clamp(sensors.mic * 0.6 + Math.min(rms * 4, 1) * 0.4, 0, 1);
      }, 120);
      return true;
    } catch (e) { toast("Mic is blocked — the game still works, but the mic meter stays flat."); return false; }
  }
  function whisper(text) {
    try {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.7; u.pitch = 0.6; u.volume = 0.9;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ---------------------------------------------------------- shared live bits */
  let view = "box";
  let sensorTick = null;
  function sensorLineText() {
    const h = sensors.heading === null ? "—" : Math.round(sensors.heading) + "°";
    return "Motion " + sensors.motion.toFixed(2) + " · Heading " + h + " · Mic " + sensors.mic.toFixed(2) + " · Presence " + Math.round(presence() * 100) + "%";
  }
  function startSensorTick() {
    if (sensorTick) return;
    sensorTick = setInterval(() => {
      // Let the readings settle when nothing is feeding them.
      sensors.motion *= 0.96;
      if (!sensors.micOn) sensors.mic *= 0.9;
      const line = document.getElementById("spirit-sensor-line");
      if (line) line.textContent = sensorLineText();
      const fill = document.getElementById("spirit-presence-fill");
      if (fill) fill.style.width = Math.round(presence() * 100) + "%";
    }, 200);
  }
  function sensorRow(box) {
    const row = el("div", "spirit-sensors");
    const line = el("span", "", sensorLineText()); line.id = "spirit-sensor-line";
    row.append(document.createTextNode("Readings are live: "));
    row.append(line);
    if (needsSensorPermission() && !sensors.listening) {
      const b = el("button", "wide-btn", "Enable motion + compass"); b.type = "button";
      b.addEventListener("click", enableSensors);
      box.append(b);
    } else if (!sensors.micOn) {
      const b = el("button", "wide-btn", "Enable mic for live readings"); b.type = "button";
      b.addEventListener("click", async () => { await enableMic(); render(); });
      box.append(b);
    }
    box.append(row);
    const meter = el("div", "spirit-meter");
    const fill = el("i", ""); fill.id = "spirit-presence-fill"; fill.style.width = Math.round(presence() * 100) + "%";
    meter.append(fill);
    box.append(meter);
    box.append(el("p", "help", "Presence rises when the phone moves, the compass turns, or the mic hears something. What comes through follows the readings — it isn't canned."));
  }
  function logEntry(kind, q, a) {
    const s = S();
    s.log.unshift({ t: Date.now(), kind, q: q || "", a: a || "" });
    if (s.log.length > 60) s.log.length = 60;
    save();
  }
  function logView(box) {
    const s = S();
    box.append(el("h4", "", "Session log"));
    if (!s.log.length) { box.append(el("p", "help", "Nothing yet. Ask something, sweep the box, or try the board.")); return; }
    const ul = el("ul", "spirit-log");
    s.log.slice(0, 12).forEach((e) => {
      const li = el("li", "");
      const when = new Date(e.t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      li.append(el("b", "", "[" + e.kind + "] " + when + " "));
      if (e.q) li.append(document.createTextNode("“" + e.q + "” "));
      li.append(el("span", "a", "→ " + e.a));
      ul.append(li);
    });
    box.append(ul);
    const clear = el("button", "wide-btn", "Clear log"); clear.type = "button";
    clear.addEventListener("click", () => { if (confirm("Clear the whole session log?")) { S().log = []; save(); render(); } });
    box.append(clear);
  }

  /* ---------------------------------------------------------- spirit box */
  let boxState = { running: false, auto: false, sweptOnce: false, src: null, gain: null, filter: null, timer: null, stations: [], lastWord: 0, freq: 200 };
  function boxStations() {
    const n = 2 + Math.floor(Math.random() * 3);
    const out = [];
    for (let i = 0; i < n; i++) out.push(300 + Math.random() * 3500);
    return out;
  }
  function boxStart(auto) {
    const ctx = ensureAudio();
    if (!ctx) { toast("Audio isn't available on this device."); return; }
    boxStop();
    boxState.auto = !!auto; boxState.sweptOnce = false; boxState.running = true;
    boxState.freq = 200; boxState.stations = boxStations(); boxState.lastWord = 0;
    try {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx); src.loop = true;
      const filter = ctx.createBiquadFilter(); filter.type = "bandpass"; filter.frequency.value = 200; filter.Q.value = 8;
      const gain = ctx.createGain(); gain.gain.value = 0.015;
      src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
      src.start();
      boxState.src = src; boxState.gain = gain; boxState.filter = filter;
    } catch (e) { boxState.running = false; toast("Couldn't start the radio."); return; }
    boxState.timer = setInterval(boxStep, 60);
    render();
  }
  function boxStep() {
    if (!boxState.running) return;
    const ctx = audioCtx;
    boxState.freq += 55;
    if (boxState.freq > 4000) {
      boxState.freq = 200;
      boxState.stations = boxStations();
      if (!boxState.auto) { boxStop(); render(); return; }
      boxState.sweptOnce = true;
    }
    let near = 0;
    boxState.stations.forEach((f) => { const d = Math.abs(f - boxState.freq); near = Math.max(near, clamp(1 - d / 450, 0, 1)); });
    const sig = clamp(near * 0.75 + presence() * 0.35, 0, 1);
    try {
      boxState.filter.frequency.setTargetAtTime(boxState.freq, ctx.currentTime, 0.03);
      boxState.gain.gain.setTargetAtTime(0.015 + sig * 0.22, ctx.currentTime, 0.05);
    } catch (e) {}
    const freqEl = document.getElementById("spirit-freq-val");
    if (freqEl) freqEl.textContent = (boxState.freq / 1000).toFixed(2) + " MHz";
    const meter = document.getElementById("spirit-box-meter");
    if (meter) meter.style.width = Math.round(sig * 100) + "%";
    const sigEl = document.getElementById("spirit-box-sig");
    if (sigEl) sigEl.textContent = sig > 0.72 ? "STRONG SIGNAL" : sig > 0.45 ? "signal rising…" : "static…";
    if (sig > 0.72 && Date.now() - boxState.lastWord > 6000) {
      boxState.lastWord = Date.now();
      surfaceWord();
    }
  }
  function surfaceWord() {
    const w = pick(BOX_WORDS);
    const who = pick(SPIRIT_NAMES);
    const wordEl = document.getElementById("spirit-word");
    if (wordEl) {
      wordEl.innerHTML = "";
      wordEl.append(document.createTextNode("“" + w + "”"));
      wordEl.append(el("small", "", "caught on the sweep · " + who));
    }
    whisper(w);
    const s = S();
    s.counts.box += 1;
    if (s.words.indexOf(w) === -1) s.words.push(w);
    logEntry("box", "", w + " (" + who + ")");
    gainXP("gamer", 1);
  }
  function boxStop() {
    boxState.running = false;
    if (boxState.timer) { clearInterval(boxState.timer); boxState.timer = null; }
    try { if (boxState.src) boxState.src.stop(); } catch (e) {}
    try { if (boxState.src) boxState.src.disconnect(); } catch (e) {}
    boxState.src = null; boxState.gain = null; boxState.filter = null;
  }
  function boxView(box) {
    box.append(el("h3", "", "Spirit Box"));
    box.append(el("p", "help", "A radio that sweeps the static. When the signal peaks, a word comes through. The sweep follows your readings — move the phone, make a sound, and watch the meter."));
    sensorRow(box);
    const freq = el("p", "spirit-freq");
    freq.append(document.createTextNode("Tuning: "));
    const fv = el("b", "", (boxState.freq / 1000).toFixed(2) + " MHz"); fv.id = "spirit-freq-val";
    freq.append(fv);
    box.append(freq);
    const meter = el("div", "spirit-meter");
    const fill = el("i", ""); fill.id = "spirit-box-meter"; fill.style.width = "0%";
    meter.append(fill);
    box.append(meter);
    const sig = el("p", "spirit-freq"); sig.id = "spirit-box-sig"; sig.textContent = boxState.running ? "sweeping…" : "static…";
    box.append(sig);
    const word = el("div", "spirit-word"); word.id = "spirit-word";
    if (!S().words.length) word.textContent = "—";
    else { word.append(document.createTextNode("“" + S().words[S().words.length - 1] + "”")); word.append(el("small", "", "last word caught")); }
    box.append(word);
    const row = el("div", "btn-row");
    if (!boxState.running) {
      const sweep = el("button", "wide-btn accent", "Sweep once"); sweep.type = "button";
      sweep.addEventListener("click", () => boxStart(false));
      const auto = el("button", "wide-btn", "Auto-sweep"); auto.type = "button";
      auto.addEventListener("click", () => boxStart(true));
      row.append(sweep, auto);
    } else {
      const stop = el("button", "wide-btn accent", "Stop the radio"); stop.type = "button";
      stop.addEventListener("click", () => { boxStop(); render(); });
      row.append(stop);
    }
    box.append(row);
    const s = S();
    box.append(el("p", "help", s.counts.box + " word" + (s.counts.box === 1 ? "" : "s") + " caught this way · " + s.words.length + " different words so far."));
    logView(box);
  }


  /* ---------------------------------------------------------- ask */
  let lastAsk = { q: "", a: "" };
  let askBusy = false;
  function askAnswer(q) {
    const p = presence();
    const lower = (q || "").toLowerCase();
    let phrase = null;
    ASK_KEYS.forEach((k) => { if (!phrase && k.keys.some((kw) => lower.indexOf(kw) !== -1)) phrase = pick(k.words); });
    if (!phrase) phrase = pick(ASK_PHRASES);
    const r = Math.random();
    let verdict;
    if (p > 0.6) verdict = r < 0.42 ? "YES" : r < 0.84 ? "NO" : "MAYBE";
    else verdict = r < 0.28 ? "YES" : r < 0.56 ? "NO" : r < 0.8 ? "MAYBE" : "UNCLEAR";
    return verdict + " — " + phrase;
  }
  function askView(box) {
    box.append(el("h3", "", "Ask"));
    box.append(el("p", "help", "Ask a question out loud or type it. The box catches an answer — shaped by what the readings are doing right now, not a canned line."));
    sensorRow(box);
    const input = el("input", "spirit-input");
    input.type = "text"; input.placeholder = "Ask something…"; input.id = "spirit-ask-input";
    box.append(input);
    const row = el("div", "btn-row");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const micBtn = el("button", "wide-btn", "Ask out loud"); micBtn.type = "button";
      micBtn.addEventListener("click", () => {
        try {
          const rec = new SR();
          rec.lang = "en-US"; rec.interimResults = false; rec.maxAlternatives = 1;
          rec.onresult = (e) => { const t = e.results[0][0].transcript; const inp = document.getElementById("spirit-ask-input"); if (inp) inp.value = t; };
          rec.onerror = () => toast("Couldn't hear that — type it instead.");
          rec.start();
          toast("Listening…");
        } catch (e) { toast("Voice input isn't available here."); }
      });
      row.append(micBtn);
    }
    const askBtn = el("button", "wide-btn accent", "Ask"); askBtn.type = "button";
    askBtn.addEventListener("click", () => {
      const inp = document.getElementById("spirit-ask-input");
      const q = (inp && inp.value.trim()) || "";
      if (!q) { toast("Type a question first."); return; }
      if (askBusy) return;
      askBusy = true;
      staticBurst(0.5);
      const ansEl = document.getElementById("spirit-ask-answer");
      if (ansEl) ansEl.textContent = "listening…";
      const delay = Math.round(1400 - presence() * 700);
      setTimeout(() => {
        askBusy = false;
        const a = askAnswer(q);
        lastAsk = { q, a };
        const phrase = a.split(" — ")[1] || a;
        whisper(phrase);
        logEntry("ask", q, a);
        const s = S(); s.counts.ask += 1; save();
        gainXP("gamer", 1);
        render();
      }, delay);
    });
    row.append(askBtn);
    box.append(row);
    const ans = el("div", "spirit-answer"); ans.id = "spirit-ask-answer";
    if (lastAsk.a) ans.textContent = "“" + lastAsk.a + "”";
    box.append(ans);
    if (lastAsk.q) box.append(el("p", "help", "Last question: “" + lastAsk.q + "”"));
    logView(box);
  }

  /* ---------------------------------------------------------- ouija board */
  let ouijaQ = "";
  let ouijaLastAns = "";
  let ouijaTimer = null;
  function ouijaStop() { if (ouijaTimer) { clearTimeout(ouijaTimer); ouijaTimer = null; } }
  function ouijaPick() {
    const r = Math.random();
    if (r < 0.25) return "YES";
    if (r < 0.5) return "NO";
    return pick(OUIJA_WORDS);
  }
  function planchetteTo(cellEl) {
    const p = document.getElementById("spirit-planchette");
    if (!p || !cellEl) return;
    p.style.left = (cellEl.offsetLeft + cellEl.offsetWidth / 2) + "px";
    p.style.top = (cellEl.offsetTop + cellEl.offsetHeight / 2) + "px";
  }
  function spellOut(ans) {
    ouijaStop();
    const letters = ans.replace(/[^A-Z]/g, "").split("");
    const out = document.getElementById("spirit-ouija-out");
    if (out) out.textContent = "";
    let i = 0;
    const step = () => {
      if (i >= letters.length) {
        ouijaLastAns = ans;
        const o = document.getElementById("spirit-ouija-out");
        if (o) o.textContent = "“" + ans + "”";
        logEntry("ouija", ouijaQ, ans);
        const s = S(); s.counts.ouija += 1; save();
        gainXP("gamer", 1);
        return;
      }
      const ch = letters[i];
      const cell = document.getElementById("ouija-" + ch);
      planchetteTo(cell);
      const o = document.getElementById("spirit-ouija-out");
      if (o) o.textContent = ans.slice(0, i + 1);
      i++;
      const delay = clamp(520 - sensors.motion * 320, 200, 520);
      ouijaTimer = setTimeout(step, delay);
    };
    step();
  }
  function ouijaView(box) {
    box.append(el("h3", "", "Ouija Board"));
    box.append(el("p", "help", "Ask, then watch the planchette glide. It moves faster when the phone is moving — the readings steer its hand."));
    sensorRow(box);
    const board = el("div", "spirit-board");
    const corner = el("div", "corner");
    corner.append(el("span", "", "YES"), el("span", "", "NO"));
    board.append(corner);
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const row1 = el("div", "row"); const row2 = el("div", "row");
    letters.forEach((ch, i) => {
      const cell = el("span", "cell", ch); cell.id = "ouija-" + ch;
      (i < 13 ? row1 : row2).append(cell);
    });
    board.append(row1, row2);
    const nums = el("div", "row");
    "0123456789".split("").forEach((n) => nums.append(el("span", "cell num", n)));
    board.append(nums);
    const bye = el("div", "corner");
    bye.append(el("span", "", "GOODBYE"));
    board.append(bye);
    const plan = el("div", "spirit-planchette"); plan.id = "spirit-planchette";
    plan.style.left = "50%"; plan.style.top = "50%";
    board.append(plan);
    box.append(board);
    const input = el("input", "spirit-input");
    input.type = "text"; input.placeholder = "Ask the board…"; input.id = "spirit-ouija-input";
    box.append(input);
    const row = el("div", "btn-row");
    const askBtn = el("button", "wide-btn accent", "Ask the board"); askBtn.type = "button";
    askBtn.addEventListener("click", () => {
      const inp = document.getElementById("spirit-ouija-input");
      ouijaQ = (inp && inp.value.trim()) || "…";
      ouijaLastAns = "";
      spellOut(ouijaPick());
    });
    const byeBtn = el("button", "wide-btn", "Say goodbye"); byeBtn.type = "button";
    byeBtn.addEventListener("click", () => { ouijaQ = "goodbye"; ouijaLastAns = ""; spellOut("GOODBYE"); });
    row.append(askBtn, byeBtn);
    box.append(row);
    const out = el("div", "spirit-answer"); out.id = "spirit-ouija-out";
    if (ouijaLastAns) out.textContent = "“" + ouijaLastAns + "”";
    box.append(out);
    logView(box);
  }

  /* ---------------------------------------------------------- EVP recorder */
  let evpState = { rec: null, stream: null, analyser: null, data: null, chunks: [], startAt: 0, peak: 0, peakAt: 0, timer: null, recs: [] };
  async function evpStart() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast("This device doesn't offer mic access here."); return; }
    if (typeof MediaRecorder === "undefined") { toast("Recording isn't available on this device."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      evpState.stream = stream;
      const ctx = ensureAudio();
      if (ctx) {
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser(); an.fftSize = 512;
        evpState.analyser = an; evpState.data = new Uint8Array(an.fftSize);
        src.connect(an);
      }
      evpState.chunks = []; evpState.peak = 0; evpState.peakAt = 0; evpState.startAt = Date.now();
      const rec = new MediaRecorder(stream);
      evpState.rec = rec;
      rec.ondataavailable = (e) => { if (e.data && e.data.size) evpState.chunks.push(e.data); };
      rec.onstop = () => { evpFinish(); };
      rec.start(250);
      evpState.timer = setInterval(() => {
        const t = document.getElementById("spirit-evp-time");
        if (t) t.textContent = "Recording " + fmtTime((Date.now() - evpState.startAt) / 1000) + "…";
        if (evpState.analyser && evpState.data) {
          evpState.analyser.getByteTimeDomainData(evpState.data);
          let sum = 0;
          for (let i = 0; i < evpState.data.length; i++) { const v = (evpState.data[i] - 128) / 128; sum += v * v; }
          const rms = Math.sqrt(sum / evpState.data.length);
          if (rms > evpState.peak) { evpState.peak = rms; evpState.peakAt = (Date.now() - evpState.startAt) / 1000; }
        }
      }, 100);
      render();
    } catch (e) { toast("Couldn't start the mic — check the browser permission."); }
  }
  function evpStop() { try { if (evpState.rec && evpState.rec.state !== "inactive") evpState.rec.stop(); } catch (e) {} }
  function evpFinish() {
    if (evpState.timer) { clearInterval(evpState.timer); evpState.timer = null; }
    if (evpState.stream) { evpState.stream.getTracks().forEach((t) => t.stop()); evpState.stream = null; }
    const blob = new Blob(evpState.chunks, { type: (evpState.rec && evpState.rec.mimeType) || "audio/webm" });
    const dur = (Date.now() - evpState.startAt) / 1000;
    const rec = { url: URL.createObjectURL(blob), at: Date.now(), dur: dur, peakAt: evpState.peakAt };
    evpState.recs.unshift(rec);
    if (evpState.recs.length > 12) { const old = evpState.recs.pop(); try { URL.revokeObjectURL(old.url); } catch (e) {} }
    const s = S();
    s.evp.unshift({ at: rec.at, dur: rec.dur, peakAt: rec.peakAt });
    if (s.evp.length > 40) s.evp.length = 40;
    s.counts.evp += 1;
    save();
    evpState.rec = null;
    gainXP("gamer", 1);
    if (view === "evp") render();
  }
  function evpAbort() {
    if (evpState.rec) { try { evpState.rec.stop(); } catch (e) {} }
  }
  function evpView(box) {
    box.append(el("h3", "", "EVP Recorder"));
    box.append(el("p", "help", "Record the room, then play it back. Playback is your real recording only — nothing is added to it. The loudest moment is marked so you know where to listen."));
    sensorRow(box);
    const status = el("p", "spirit-freq");
    status.id = "spirit-evp-time";
    status.textContent = evpState.rec ? "Recording…" : "Not recording.";
    box.append(status);
    const row = el("div", "btn-row");
    if (!evpState.rec) {
      const recBtn = el("button", "wide-btn accent", "Record"); recBtn.type = "button";
      recBtn.addEventListener("click", evpStart);
      row.append(recBtn);
    } else {
      const stopBtn = el("button", "wide-btn accent", "Stop"); stopBtn.type = "button";
      stopBtn.addEventListener("click", evpStop);
      row.append(stopBtn);
    }
    box.append(row);
    box.append(el("h4", "", "Recordings"));
    if (!evpState.recs.length) box.append(el("p", "help", "No recordings yet this session. Recordings live on this device only, for this session."));
    evpState.recs.forEach((r, idx) => {
      const line = el("div", "spirit-evp");
      const audio = document.createElement("audio");
      audio.controls = true; audio.src = r.url;
      const meta = el("span", "meta", fmtTime(r.dur) + " · loudest " + fmtTime(r.peakAt));
      const del = el("button", "", "✕"); del.type = "button";
      del.addEventListener("click", () => { try { URL.revokeObjectURL(r.url); } catch (e) {} evpState.recs.splice(idx, 1); render(); });
      line.append(audio, meta, del);
      box.append(line);
    });
    const s = S();
    box.append(el("p", "help", s.evp.length + " recording" + (s.evp.length === 1 ? "" : "s") + " saved across sessions (the audio itself is only kept while the app is open)."));
    logView(box);
  }

  /* ---------------------------------------------------------- AR lens */
  let lensState = { stream: null, raf: null, video: null, canvas: null, wisps: [], running: false, cameraOff: false };
  function makeWisps(n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push({ x: Math.random(), y: Math.random(), r: 14 + Math.random() * 46, vx: (Math.random() - 0.5) * 0.0006, vy: (Math.random() - 0.5) * 0.0006, ph: Math.random() * Math.PI * 2, glyph: pick(WISP_GLYPHS), hue: pick(["#c9b8ff", "#ff9ecf", "#9cc8ff", "#e8e0ff"]) });
    return out;
  }
  function drawWisps(g, w, h) {
    const p = presence();
    const now = Date.now();
    lensState.wisps.forEach((o) => {
      o.x += o.vx + Math.sin(now / 2400 + o.ph) * 0.0002;
      o.y += o.vy + Math.cos(now / 3000 + o.ph) * 0.0002;
      if (o.x < -0.1) o.x = 1.1; if (o.x > 1.1) o.x = -0.1;
      if (o.y < -0.1) o.y = 1.1; if (o.y > 1.1) o.y = -0.1;
      const x = o.x * w, y = o.y * h, r = Math.max(10, o.r * (w / 360));
      const a = clamp(0.10 + p * 0.30 + Math.sin(now / 900 + o.ph) * 0.05, 0.05, 0.45);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, o.hue);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.globalAlpha = a;
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      g.globalAlpha = Math.min(a * 1.6, 0.7);
      g.fillStyle = "#ffffff";
      g.font = Math.round(r * 0.7) + "px sans-serif";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(o.glyph, x, y);
      g.globalAlpha = 1;
    });
  }
  function lensLoop() {
    if (!lensState.running) return;
    const c = lensState.canvas;
    if (c) {
      const g = c.getContext("2d");
      const w = c.width, h = c.height;
      g.clearRect(0, 0, w, h);
      if (Math.random() < 0.004 && presence() > 0.5 && lensState.wisps.length < 10) lensState.wisps.push(makeWisps(1)[0]);
      drawWisps(g, w, h);
      const m = document.getElementById("spirit-lens-presence");
      if (m) m.textContent = "Presence " + Math.round(presence() * 100) + "%";
    }
    lensState.raf = requestAnimationFrame(lensLoop);
  }
  async function lensStart() {
    lensStop();
    lensState.wisps = makeWisps(5);
    lensState.running = true;
    lensState.cameraOff = false;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try { lensState.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); }
      catch (e) { lensState.cameraOff = true; }
    } else { lensState.cameraOff = true; }
    render();
  }
  function lensStop() {
    lensState.running = false;
    if (lensState.raf) { cancelAnimationFrame(lensState.raf); lensState.raf = null; }
    if (lensState.stream) { lensState.stream.getTracks().forEach((t) => t.stop()); lensState.stream = null; }
  }
  function lensCapture() {
    const v = lensState.video;
    const c = document.createElement("canvas");
    if (v && v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
    else { c.width = 640; c.height = 853; }
    const g = c.getContext("2d");
    if (v && v.videoWidth) g.drawImage(v, 0, 0, c.width, c.height);
    else { const grad = g.createLinearGradient(0, 0, 0, c.height); grad.addColorStop(0, "#120b16"); grad.addColorStop(1, "#000000"); g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height); }
    drawWisps(g, c.width, c.height);
    c.toBlob((b) => {
      if (!b) { toast("Couldn't make the snapshot."); return; }
      const url = URL.createObjectURL(b);
      const a = document.createElement("a");
      a.href = url; a.download = "spirit-capture-" + Date.now() + ".png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      const s = S(); s.captures = (s.captures || 0) + 1; save();
      toast("Snapshot saved.");
    }, "image/png");
  }
  function lensView(box) {
    box.append(el("h3", "", "AR Lens"));
    box.append(el("p", "help", "Point the camera around the room. Faint shapes drift across the lens — brighter when the presence meter climbs. Capture a snapshot any time."));
    sensorRow(box);
    const wrap = el("div", "spirit-lens");
    const video = el("video", "");
    video.setAttribute("playsinline", ""); video.setAttribute("autoplay", ""); video.muted = true;
    const canvas = el("canvas", "");
    wrap.append(video, canvas);
    if (!lensState.running || lensState.cameraOff) {
      const off = el("div", "lens-off", lensState.running ? "Camera is off — the lens is still listening. Wisps drift in the dark." : "Camera is off. Tap Start the lens to look through it.");
      wrap.append(off);
    }
    box.append(wrap);
    const pres = el("p", "spirit-freq"); pres.id = "spirit-lens-presence"; pres.textContent = "Presence " + Math.round(presence() * 100) + "%";
    box.append(pres);
    const row = el("div", "btn-row");
    if (!lensState.running) {
      const start = el("button", "wide-btn accent", "Start the lens"); start.type = "button";
      start.addEventListener("click", lensStart);
      row.append(start);
    } else {
      const cap = el("button", "wide-btn accent", "Capture"); cap.type = "button";
      cap.addEventListener("click", lensCapture);
      const stop = el("button", "wide-btn", "Stop the lens"); stop.type = "button";
      stop.addEventListener("click", () => { lensStop(); render(); });
      row.append(cap, stop);
    }
    box.append(row);
    box.append(el("p", "help", S().captures + " snapshot" + (S().captures === 1 ? "" : "s") + " captured."));
    // (Re)attach the camera and (re)start the overlay loop whenever this view renders.
    lensState.video = video; lensState.canvas = canvas;
    if (lensState.running) {
      if (lensState.stream) {
        video.srcObject = lensState.stream;
        try { const pr = video.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
      }
      canvas.width = canvas.clientWidth || 360;
      canvas.height = canvas.clientHeight || 480;
      if (!lensState.raf) lensState.raf = requestAnimationFrame(lensLoop);
    }
  }

  /* ---------------------------------------------------------- how to play */
  function howView(box) {
    box.append(el("h3", "", "How to play"));
    box.append(el("p", "", "A simulation for the feeling — the readings are real, the voices are generated. It can't reach the dead, and it will never pretend to be someone real."));
    box.append(el("h4", "", "Spirit Box"));
    box.append(el("p", "help", "A radio sweeping the static. When the signal peaks, a word comes through — whispered, slow and low. Sweep once, or let it auto-sweep. Move the phone or make a sound and the meter moves with you."));
    box.append(el("h4", "", "Ask"));
    box.append(el("p", "help", "Ask a question out loud or type it. The box catches an answer: YES, NO, MAYBE, or UNCLEAR, plus a few words. When the presence is high, the answers get more certain. When it's low, they get foggy."));
    box.append(el("h4", "", "Ouija Board"));
    box.append(el("p", "help", "Ask the board and watch the planchette glide letter by letter. It moves faster when the phone is moving. Say goodbye to close the session."));
    box.append(el("h4", "", "EVP Recorder"));
    box.append(el("p", "help", "Record the room, play it back. What you hear is your real recording — nothing is added. The loudest moment is marked so you know where to listen."));
    box.append(el("h4", "", "AR Lens"));
    box.append(el("p", "help", "Look through the camera. Faint shapes drift across the lens and brighten when the presence climbs. Capture saves a snapshot of what the lens saw."));
    box.append(el("h4", "", "The readings"));
    box.append(el("p", "help", "Motion comes from the phone's movement sensor, heading from its compass, and the mic level from the microphone. On iPhone, tap Enable motion + compass first — Apple asks permission. The mic only turns on when you tap it. Nothing leaves the phone: no audio, no video, and no recording is ever uploaded."));
    box.append(el("h4", "", "The honest part"));
    box.append(el("p", "help", "This is a game built to feel real. The sensor readings are genuinely live, but the words, answers, and shapes are generated from them. It cannot contact the dead, and it will never pretend to be someone real."));
  }

  /* ---------------------------------------------------------- lifecycle */
  function stopAllLive() {
    boxStop();
    ouijaStop();
    evpAbort();
    lensStop();
  }
  function tabs() {
    const bar = el("div", "spirit-tabs"); bar.setAttribute("role", "tablist");
    [["box", "Spirit Box"], ["ask", "Ask"], ["ouija", "Ouija"], ["evp", "EVP"], ["lens", "AR Lens"], ["how", "How to play"]].forEach(([id, label]) => {
      const b = el("button", view === id ? "on" : "", label); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(view === id));
      b.addEventListener("click", () => { stopAllLive(); view = id; render(); });
      bar.append(b);
    });
    return bar;
  }
  function render() {
    if (!container) return;
    injectStyles();
    startSensorTick();
    container.innerHTML = "";
    container.append(tabs());
    const box = el("div", "spirit-body");
    if (view === "ask") askView(box);
    else if (view === "ouija") ouijaView(box);
    else if (view === "evp") evpView(box);
    else if (view === "lens") lensView(box);
    else if (view === "how") howView(box);
    else boxView(box);
    container.append(box);
  }

  return {
    render,
    open(v) { if (["box", "ask", "ouija", "evp", "lens", "how"].indexOf(v) !== -1) { stopAllLive(); view = v; render(); } },
    status() {
      const s = S();
      return {
        view, questions: s.log.length, words: s.words.length, evp: s.evp.length, captures: s.captures,
        presence: Math.round(presence() * 100),
        sensors: { motion: sensors.motionOn, orient: sensors.orientOn, mic: sensors.micOn }
      };
    },
    _debug: {
      data: () => ({ boxWords: BOX_WORDS, ouija: OUIJA_WORDS, spirits: SPIRIT_NAMES }),
      presence: () => presence(),
      sensors: () => ({ motion: sensors.motion, heading: sensors.heading, mic: sensors.mic }),
      ask: (q) => askAnswer(q)
    }
  };
}
