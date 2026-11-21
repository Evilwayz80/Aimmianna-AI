/* Aimmianna iPhone PWA v1.0 — all logic, vanilla JS, no build step.
   Faithful port of Aimmianna Android v23 (MainActivity, GeminiAi,
   TypecastTts, FishAudioTts, ElevenLabsTts, IdleLife, GameActivity,
   CareActivity, WardrobeActivity, DressUp, Outfit, Look).

   Keys live ONLY in localStorage on this phone, never hardcoded,
   never logged. Greeting clip is a song quote Tony likes (an AI-made
   voice reading an Eminem lyric) — never presented as a real person's
   voice. No Emmi content anywhere in this app.

   Honest limits, baked in:
   - iOS Safari needs a user tap before audio can play, so the
     once-a-day auto-greeting is attempted on load AND on the first
     tap; the "Hear Aimmianna's greeting" button always works.
   - Bedtime / alarm reminders only fire while the app is open —
     Safari cannot wake a closed web app.
   - Typecast / Fish Audio / ElevenLabs may not send CORS headers,
     so a browser fetch to them can be blocked even with a good key.
     When that happens the cascade falls through to the phone's own
     voice and the status line says so plainly. */
"use strict";

const VERSION = "Aimmianna iPhone PWA v1.0";
const LS_KEY = "aimmianna_iphone_v1";
const ASSETS = "assets/";
const BASE_FIGURE = ASSETS + "figure/aimmianna_human_fullbody.png";
const GREETING_SRC = ASSETS + "audio/greeting.mp3";
const TEST_LINE = "Heyy, it's me, Aimmianna. Can you hear me, bestie?";

/* ---------------- state ---------------- */
const DEFAULT_STATE = {
  chat: [],            // [{who:"you"|"her", text}]
  memories: [],        // saved "i like / i love / i am" lines
  speakOn: true,
  greetingAuto: true,
  greetingLastAuto: "", // YYYY-MM-DD of last auto-greeting
  geminiKey: "",
  typecastKey: "", typecastVoice: "", typecastModel: "",
  fishKey: "", fishVoice: "",
  elevenKey: "", elevenVoice: "",
  wardrobe: { outfit: "", hair: "", lipstick: "", eyeshadow: "", blush: "", foundation: "" },
  wardrobePicks: [],   // ordered [{kind, id, file}] — last one is the figure shown
  careBrush: 0, careTeeth: 0, careBaths: 0,
  catchBest: 0,
  bedtimeOn: false, bedtimeTime: "22:30",
  alarmOn: false, alarmTime: "07:00", alarmDaily: false,
  notes: "",           // chalkboard notes, "\n—\n" separated
  calNotes: {},        // "YYYY-MM-DD" -> text
  album: [],           // data URLs (downscaled)
  albumIdx: 0,
  wardrobeHintHidden: false,
  memoryVisible: false,
  dyeIndex: 0, foundationIndex: 0,
  lastBedtimeFired: "", lastAlarmFired: ""
};
let state = loadState();
function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
    const s = JSON.parse(raw);
    return Object.assign(JSON.parse(JSON.stringify(DEFAULT_STATE)), s);
  } catch (e) { return JSON.parse(JSON.stringify(DEFAULT_STATE)); }
}
function saveState() {
  try {
    // cap history the way Android v18 does (chat 200, memories 100)
    state.chat = state.chat.slice(-200);
    state.memories = state.memories.slice(-100);
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (e) { /* storage full — album photos are the usual cause; keep going */ }
}

/* ---------------- helpers ---------------- */
const $ = (id) => document.getElementById(id);
const els = {};
["figure","figureWrap","idleFx","idleLabel","wardrobeStatus","outfitStatus","homeStatus",
 "wardrobeHint","chatBox","chatScroll","chatInput","sendBtn","micBtn","speakBtn",
 "greetingAutoBtn","greetingBtn","voiceStatus","aiStatus","typecastStatus","fishStatus",
 "elevenStatus","memoryView","memoryToggle","careStatus","careCounts","careStage",
 "careFigure","careBath","careBubbles","careSteam","careSparkle","toast",
 "wardrobePreview","wardrobeMsg","gameStatus","memoryGrid","emberField","emberTarget",
 "emberHint","diceFace","diceResult","tvFile","tvPlayer","tvStatus","stereoFile",
 "stereoPlayer","stereoStatus","musicMood","albumView","albumImg","albumEmpty",
 "albumLabel","albumFile","noteInput","noteList","bedtimeTime","bedtimeStatus",
 "alarmTime","alarmDaily","alarmStatus","calTitle","calGrid","calDayLabel","calNote"
].forEach((id) => { els[id] = $(id); });

let toastTimer = null;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3500);
}
function pickOne(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function todayKey(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function fmtTime(h, m) {
  const d = new Date(); d.setHours(h, m, 0, 0);
  let hh = d.getHours(); const ap = hh >= 12 ? "PM" : "AM";
  hh = hh % 12 || 12;
  return hh + ":" + String(d.getMinutes()).padStart(2, "0") + " " + ap;
}
function scrollToId(id) {
  const el = $(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}
document.querySelectorAll("[data-goto]").forEach((b) =>
  b.addEventListener("click", () => scrollToId(b.getAttribute("data-goto"))));
$("roomBtn").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
  els.chatInput.blur();
});
$("wardrobeBtn").addEventListener("click", () => scrollToId("wardrobeSection"));

/* ---------------- sayings (SAYINGS.json, verbatim from Android v23) ---------------- */
let SAYINGS = null;
let lastReply = "";
const FALLBACK_SAYINGS = { branches: [
  { id: "greeting", match: "keyword", contains: ["hello", "hey", "hi"], whole_words: ["hi", "hello", "hey"], replies: ["Heyy. I'm here. What's on your mind, Tony?"] },
  { id: "fallback", match: "fallback", contains: [], whole_words: [], replies: ["Got it. Tell me one more detail about that, and I'll help you sort the next step — just one step, not the whole pile at once.", "Okay, I'm listening. Give me a bit more on that — what's the part that matters most, fr?", "I'm with you, Tony. Break it down for me — one thing at a time, starting with whatever's loudest."] }
]};
async function loadSayings() {
  try {
    const r = await fetch("SAYINGS.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    SAYINGS = await r.json();
  } catch (e) {
    SAYINGS = FALLBACK_SAYINGS;
    console.warn("SAYINGS.json did not load (open the app from a web server, not file://) — using a small built-in fallback set.");
  }
}

/* Mirror of MainActivity.replyFor(): normalize, check branches top to
   bottom, first match wins; pick() never repeats the last line, even
   across branches. Crisis is answered locally, never sent to the AI. */
function normalize(raw) {
  return raw.toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
}
function wordIn(t, w) { return (" " + t + " ").indexOf(" " + w + " ") !== -1; }
function pickReply(opts) {
  if (!opts.length) return "";
  if (opts.length === 1) { lastReply = opts[0]; return opts[0]; }
  let r, guard = 0;
  do { r = opts[Math.floor(Math.random() * opts.length)]; guard++; }
  while (r === lastReply && guard < 10);
  lastReply = r;
  return r;
}
function isCrisisText(raw) {
  const t = raw.toLowerCase();
  return t.indexOf("kill myself") !== -1 || t.indexOf("suicide") !== -1 ||
    t.indexOf("hurt myself") !== -1 || t.indexOf("want to die") !== -1 ||
    t.indexOf("end my life") !== -1;
}
function localReply(raw) {
  const t = normalize(raw);
  const branches = (SAYINGS && SAYINGS.branches) || FALLBACK_SAYINGS.branches;
  for (const b of branches) {
    if (b.match === "fallback") continue;
    if (b.match === "short_reply") {
      if (t.length <= 12 && (b.whole_words || []).some((w) => wordIn(t, w)))
        return pickReply(b.replies);
      continue;
    }
    const hitContains = (b.contains || []).some((k) => t.indexOf(k) !== -1);
    const hitWord = (b.whole_words || []).some((w) => wordIn(t, w));
    if (hitContains || hitWord) return pickReply(b.replies);
  }
  const fb = branches.find((b) => b.match === "fallback");
  return pickReply(fb ? fb.replies : ["I'm listening, Tony. Tell me more."]);
}

/* ---------------- idle life (IdleLife.java — 70s cycle) ---------------- */
const IDLE_SEGMENTS = [
  ["VIBE", 6], ["DANCE", 10], ["VIBE", 4], ["CLEAN", 10], ["VIBE", 4],
  ["ART", 10], ["VIBE", 4], ["SMOKE", 8], ["FLIRT", 6], ["STRETCH", 4]
]; // sums to 70. READ exists in the enum but Android never puts it in the cycle.
const IDLE_LABELS = {
  VIBE: "vibing under the LEDs", DANCE: "dancing with her earbuds in",
  CLEAN: "cleaning her room", ART: "doing artwork", SMOKE: "smoking, chilled out",
  FLIRT: "blowing you kisses", STRETCH: "stretching, slow and lazy",
  READ: "reading her book"
};
let readUntil = 0;
function idleStateAt(nowMs) {
  if (nowMs < readUntil) return "READ";
  let t = Math.floor(nowMs / 1000) % 70;
  for (const [s, len] of IDLE_SEGMENTS) {
    if (t < len) return s;
    t -= len;
  }
  return "VIBE";
}
let currentIdle = "";
let lastFxAt = 0;
let talkingOn = false;
function applyIdleClass() {
  els.figureWrap.className = "idle-" + currentIdle.toLowerCase() + (talkingOn ? " talking" : "");
}
function tickIdle() {
  const s = idleStateAt(Date.now());
  if (s !== currentIdle) {
    currentIdle = s;
    applyIdleClass();
    els.idleLabel.textContent = IDLE_LABELS[s] || s.toLowerCase();
  }
  const now = Date.now();
  if ((s === "FLIRT" || s === "SMOKE") && now - lastFxAt > 2200) {
    lastFxAt = now;
    spawnIdleFx(s);
  }
}
function spawnIdleFx(s) {
  const fx = document.createElement("span");
  if (s === "FLIRT") {
    const kind = Math.random();
    if (kind < 0.45) { fx.className = "fx-heart"; fx.textContent = "♥"; }
    else if (kind < 0.75) { fx.className = "fx-kiss"; fx.textContent = "mwah"; }
    else { fx.className = "fx-mmm"; fx.textContent = "Mmm~"; }
  } else {
    fx.className = "fx-smoke";
  }
  fx.style.left = (44 + Math.random() * 18) + "%";
  els.idleFx.appendChild(fx);
  setTimeout(() => fx.remove(), 3200);
}
setInterval(tickIdle, 1000);
tickIdle();
$("readBtn").addEventListener("click", () => {
  readUntil = Date.now() + 20000;
  toast("She settles down with her book for a bit.");
  tickIdle();
});
els.figureWrap.addEventListener("click", () => {
  scrollToId("chatSection");
  els.chatInput.focus({ preventScroll: true });
});

/* ---------------- wardrobe (DressUp.java catalogue; full-figure swaps) ---------------- */
/* NOTE: unlike Android, which layers hair/makeup overlays over the outfit
   figure, the v20 web assets are FULL-FIGURE renders — one PNG per pick.
   So each pick swaps the whole figure image (the last pick wins), and the
   status line still lists every active pick. See BUILD_SPEC.md. */
const OUTFITS = [
  { id: "goth_velvet_dress", label: "Goth Velvet Dress", desc: "Black velvet dress, lace trim, thigh-high lace boots — very her", file: "outfits/outfit01_goth_velvet_dress.png" },
  { id: "grunge_flannel", label: "Grunge Flannel", desc: "Flannel over a band tee, ripped jeans", file: "outfits/outfit02_grunge_flannel.png" },
  { id: "pastel_goth", label: "Pastel Goth", desc: "Pastel goth — soft colours, dark heart", file: "outfits/outfit03_pastel_goth.png" },
  { id: "dark_hoodie", label: "Dark Hoodie", desc: "Oversized dark hoodie, comfy and hers", file: "outfits/outfit04_dark_hoodie.png" },
  { id: "burgundy_dress", label: "Burgundy Dress", desc: "Deep burgundy dress, dressed up for the night", file: "outfits/outfit05_burgundy_dress.png" },
  { id: "cozy_knit", label: "Cozy Knit", desc: "Warm chunky knit for cold days", file: "outfits/outfit07_cozy_knit.png" },
  { id: "streetwear", label: "Streetwear", desc: "Alt streetwear — bold and comfy", file: "outfits/outfit08_streetwear.png" },
  { id: "goth_corset", label: "Goth Corset", desc: "Black goth corset gown with red underneath", file: "outfits/outfit09_goth_corset.png" },
  { id: "lounge_satin", label: "Lounge Satin", desc: "Soft satin loungewear for lazy nights in", file: "outfits/outfit10_lounge_satin.png" }
];
const HAIRS = [
  { id: "purple_balayage", label: "Purple Balayage", desc: "Dark roots fading to purple — long and wavy", file: "hair/hair01_purple_balayage.png" },
  { id: "black_red_front", label: "Black + Red Front", desc: "Her usual — black with a red front", file: "hair/hair02_black_red_front.png" },
  { id: "solid_crimson", label: "Solid Crimson", desc: "All crimson, all attitude", file: "hair/hair03_solid_crimson.png" },
  { id: "pastel_pink", label: "Pastel Pink", desc: "Soft pastel pink, long and wavy", file: "hair/hair04_pastel_pink.png" },
  { id: "teal_dipdye", label: "Teal Dip-Dye", desc: "Dark hair with teal-dyed ends", file: "hair/hair05_teal_dipdye.png" },
  { id: "red_streaks", label: "Red Streaks", desc: "Dark hair with red streaks", file: "hair/hair06_red_streaks.png" },
  { id: "solid_violet", label: "Solid Violet", desc: "All violet, head to toe", file: "hair/hair07_solid_violet.png" },
  { id: "caramel_balayage", label: "Caramel Balayage", desc: "Dark roots fading to warm caramel", file: "hair/hair08_caramel_balayage.png" },
  { id: "split_black_white", label: "Split Black + White", desc: "Half black, half white — two sides of her", file: "hair/hair09_split_black_white.png" },
  { id: "bob_black_red", label: "Bob — Black + Red", desc: "Short black-and-red bob", file: "hair/hair10_bob_black_red.png" }
];
const LIPSTICKS = [
  { id: "dark_red", label: "Dark Red", desc: "Deep dark red", file: "makeup/makeup01_dark_red_lips.png" },
  { id: "black", label: "Black", desc: "Black — full goth", file: "makeup/makeup02_black_lips.png" },
  { id: "nude", label: "Nude", desc: "Soft nude, barely there", file: "makeup/makeup09_nude_lips.png" },
  { id: "hot_pink", label: "Hot Pink", desc: "Bright hot pink", file: "makeup/makeup10_hot_pink_lips.png" }
];
const EYESHADOWS = [
  { id: "purple_smoky", label: "Purple Smoky", desc: "Purple smoky shadow", file: "makeup/makeup04_purple_smoky.png" },
  { id: "winged_liner", label: "Winged Liner", desc: "Sharp winged liner", file: "makeup/makeup05_winged_liner.png" },
  { id: "gold_glitter", label: "Gold Glitter", desc: "Shimmery gold glitter", file: "makeup/makeup06_gold_glitter.png" },
  { id: "blue_shadow", label: "Blue Shadow", desc: "Bold blue shadow", file: "makeup/makeup11_blue_shadow.png" }
];
const BLUSHES = [
  { id: "rosy", label: "Rosy", desc: "Rosy cheeks", file: "makeup/makeup03_rosy_blush.png" }
];
const FOUNDATIONS = [
  { id: "pale", label: "Pale", desc: "Pale foundation", file: "makeup/makeup07_pale_foundation.png" },
  { id: "tan", label: "Tan", desc: "Warm tan foundation", file: "makeup/makeup08_tan_foundation.png" }
];
const FULL_GLAM_FILE = "makeup/makeup12_full_glam.png";

function byId(arr, id) { return arr.find((c) => c.id === id) || null; }
function currentFigureSrc() {
  const last = state.wardrobePicks[state.wardrobePicks.length - 1];
  return last ? ASSETS + last.file : BASE_FIGURE;
}
function applyFigure() {
  const src = currentFigureSrc();
  els.figure.src = src;
  $("wardrobePreview").src = src;
  els.careFigure.src = src;
  refreshWardrobeStatus();
}
function refreshWardrobeStatus() {
  const w = state.wardrobe;
  const o = byId(OUTFITS, w.outfit), h = byId(HAIRS, w.hair);
  const l = byId(LIPSTICKS, w.lipstick), e = byId(EYESHADOWS, w.eyeshadow);
  const b = byId(BLUSHES, w.blush), f = byId(FOUNDATIONS, w.foundation);
  let s = "Wardrobe: " + (o ? o.label : "usual outfit") + " • hair: " + (h ? h.label : "black and red");
  if (w.lipstick === "glam_lips") s += " • Full Glam lipstick";
  else if (l) s += " • " + l.label + " lipstick";
  if (w.eyeshadow === "glam_eyes") s += " • Full Glam eyeshadow";
  else if (e) s += " • " + e.label + " eyeshadow";
  if (w.blush === "glam_blush") s += " • Full Glam blush";
  else if (b) s += " • " + b.label + " blush";
  if (f) s += " • " + f.label + " foundation";
  els.wardrobeStatus.textContent = s;
}
function setWardrobePick(kind, id, file, msg) {
  state.wardrobe[kind] = id;
  state.wardrobePicks = state.wardrobePicks.filter((p) => p.kind !== kind);
  if (id) state.wardrobePicks.push({ kind, id, file });
  saveState(); applyFigure(); markPickedButtons();
  if (msg) { els.wardrobeMsg.textContent = msg; toast(msg); }
}
function clearWardrobeKind(kind) {
  if (kind === "makeup") {
    ["lipstick", "eyeshadow", "blush", "foundation"].forEach((k) => { state.wardrobe[k] = ""; });
    state.wardrobePicks = state.wardrobePicks.filter((p) => ["lipstick", "eyeshadow", "blush", "foundation"].indexOf(p.kind) === -1);
  } else {
    state.wardrobe[kind] = "";
    state.wardrobePicks = state.wardrobePicks.filter((p) => p.kind !== kind);
  }
  saveState(); applyFigure(); markPickedButtons();
}
function buildPickList(elId, choices, kind) {
  const box = $(elId);
  box.innerHTML = "";
  choices.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.kind = kind; b.dataset.id = c.id;
    b.innerHTML = "";
    const name = document.createElement("span"); name.textContent = c.label;
    const desc = document.createElement("span"); desc.className = "pick-desc"; desc.textContent = c.desc;
    b.appendChild(name); b.appendChild(desc);
    b.addEventListener("click", () => {
      if (kind === "lipstick" || kind === "eyeshadow" || kind === "blush" || kind === "foundation") {
        // tap a picked shade again to take it off (WardrobeActivity)
        if (state.wardrobe[kind] === c.id) {
          setWardrobePick(kind, "", "", c.label + " off.");
          return;
        }
      }
      setWardrobePick(kind, c.id, c.file, (kind === "outfit" ? "Outfit: " : kind === "hair" ? "Hair: " : "") + c.label + ". " + (kind === "outfit" ? "Looking good, huh?" : kind === "hair" ? "Love it." : "Cute."));
    });
    box.appendChild(b);
  });
}
function markPickedButtons() {
  document.querySelectorAll(".pick-list button").forEach((b) => {
    b.classList.toggle("picked", state.wardrobe[b.dataset.kind] === b.dataset.id);
  });
}
buildPickList("outfitList", OUTFITS, "outfit");
buildPickList("hairList", HAIRS, "hair");
buildPickList("lipstickList", LIPSTICKS, "lipstick");
buildPickList("eyeshadowList", EYESHADOWS, "eyeshadow");
buildPickList("blushList", BLUSHES, "blush");
buildPickList("foundationList", FOUNDATIONS, "foundation");
document.querySelectorAll("[data-wardrobe-clear]").forEach((b) =>
  b.addEventListener("click", () => {
    clearWardrobeKind(b.getAttribute("data-wardrobe-clear"));
    els.wardrobeMsg.textContent = "Taken off.";
    toast("Taken off.");
  }));
$("fullGlamBtn").addEventListener("click", () => {
  state.wardrobe.lipstick = "glam_lips";
  state.wardrobe.eyeshadow = "glam_eyes";
  state.wardrobe.blush = "glam_blush";
  ["lipstick", "eyeshadow", "blush"].forEach((k) =>
    { state.wardrobePicks = state.wardrobePicks.filter((p) => p.kind !== k); });
  state.wardrobePicks.push({ kind: "lipstick", id: "glam_lips", file: FULL_GLAM_FILE });
  saveState(); applyFigure(); markPickedButtons();
  els.wardrobeMsg.textContent = "Full glam. Okay — wow, bestie.";
  toast("Full glam. Okay — wow, bestie.");
});
$("takeAllOffBtn").addEventListener("click", () => {
  state.wardrobe = { outfit: "", hair: "", lipstick: "", eyeshadow: "", blush: "", foundation: "" };
  state.wardrobePicks = [];
  saveState(); applyFigure(); markPickedButtons();
  els.wardrobeMsg.textContent = "Everything off — just her, exactly as she is.";
  toast("Everything off — just her, exactly as she is.");
});
$("resetWardrobeBtn").addEventListener("click", () => {
  state.wardrobe = { outfit: "", hair: "", lipstick: "", eyeshadow: "", blush: "", foundation: "" };
  state.wardrobePicks = [];
  saveState(); applyFigure(); markPickedButtons();
  els.wardrobeMsg.textContent = "All reset — back to her usual look.";
  toast("Wardrobe reset.");
});
if (state.wardrobeHintHidden) els.wardrobeHint.style.display = "none";
els.wardrobeHint.addEventListener("click", () => {
  state.wardrobeHintHidden = true; saveState();
  els.wardrobeHint.style.display = "none";
});

/* Outfit of the day — Outfit.java: weekday rotation, holiday overrides win. */
const WEEKDAY_OUTFITS = [
  { label: "Sunday — Cozy Sweater", desc: "Black cozy sweater, black leggings, boots" },
  { label: "Monday — Band Tee", desc: "Black band tee, ripped black jeans, boots" },
  { label: "Tuesday — Flannel", desc: "Black flannel over a tee, black pants, boots" },
  { label: "Wednesday — Leather Jacket", desc: "Black leather jacket, band tee, black jeans, boots" },
  { label: "Thursday — Hoodie", desc: "Black hoodie, black cargo pants, sneakers" },
  { label: "Friday — Plaid Skirt", desc: "Black long-sleeve top, plaid skirt over leggings, boots" },
  { label: "Saturday — Skate Day", desc: "Black skate tee, baggy black pants, sneakers, beanie" }
];
function autoOutfitFor(d) {
  const m = d.getMonth(), day = d.getDate();
  if (m === 9 && day === 31) return { label: "Halloween — Nightmare Stripes", desc: "Nightmare Before Christmas-inspired: black-and-white striped top, orange accent, pumpkin pin" };
  if (m === 11 && day === 25) return { label: "Christmas — Goth Santa", desc: "Black sweater with red/green trim, Santa hat, candy-cane accent" };
  if ((m === 11 && day === 31) || (m === 0 && day === 1)) return { label: "New Year's — Silver Sparkle", desc: "Black party top, silver jacket, silver star accents" };
  if (m === 1 && day === 14) return { label: "Valentine's — Black & Red Hearts", desc: "Black top with red heart accents, red choker, black skirt" };
  if (m === 6 && day === 4) return { label: "4th of July — Stars & Stripes", desc: "Black tee with red/white/blue star accents, black jeans" };
  return WEEKDAY_OUTFITS[d.getDay()];
}
function refreshOutfitStatus() {
  const s = autoOutfitFor(new Date());
  els.outfitStatus.textContent = "Outfit: Auto — " + s.label + " (" + s.desc + ")";
}
refreshOutfitStatus();

/* ---------------- care studio (CareActivity.java) ---------------- */
const TOOLS = [
  { id: "brush", name: "Hairbrush", bio: "Tap it through her hair to brush it smooth.", zone: "hair", icon: "icons/icon01_hairbrush.png" },
  { id: "teeth", name: "Toothbrush", bio: "Tap it over her mouth to brush her teeth.", zone: "mouth", icon: "icons/icon06_toothbrush.png" },
  { id: "lipstick", name: "Lipstick", bio: "Tap it onto her lips for red lipstick.", zone: "mouth", icon: "icons/icon07_lipstick.png" },
  { id: "wipe", name: "Makeup wipe", bio: "Tap it over her face to wipe all her makeup off.", zone: "face", icon: "icons/icon08_makeup_wipe.png" },
  { id: "foundation", name: "Foundation", bio: "Tap it over her face to blend foundation on. Tap again for the next shade.", zone: "face", icon: "icons/icon09_foundation.png" },
  { id: "dye", name: "Hair dye", bio: "Tap it through her hair to dye it. Tap again for the next colour.", zone: "hair", icon: "icons/icon02_hair_dye.png" },
  { id: "remover", name: "Dye remover", bio: "Tap it through her hair to wash the dye out.", zone: "hair", icon: "icons/icon03_dye_remover.png" },
  { id: "bleach", name: "Bleach", bio: "Tap it through her hair to lighten it to silver.", zone: "hair", icon: "icons/icon04_bleach.png" },
  { id: "straightener", name: "Straightener", bio: "Tap it through her hair to straighten it smooth and sleek.", zone: "hair", icon: "icons/icon05_straightener.png" }
];
const DYE_ORDER = HAIRS.map((h) => h.id);
const DYE_LABELS = {};
HAIRS.forEach((h) => { DYE_LABELS[h.id] = h.label; });
const FOUNDATION_ORDER = ["pale", "tan"];
const FOUNDATION_LABELS = { pale: "Pale", tan: "Tan" };
let selectedTool = 0;
let bathMode = false, washed = false;

function buildToolList() {
  const box = $("toolList");
  box.innerHTML = "";
  TOOLS.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tool-row" + (i === selectedTool ? " picked" : "");
    const img = document.createElement("img"); img.src = ASSETS + t.icon; img.alt = t.name;
    const txt = document.createElement("span");
    const nm = document.createElement("span"); nm.className = "tool-name"; nm.textContent = t.name + (i === selectedTool ? "  — picked" : "");
    const bio = document.createElement("span"); bio.className = "tool-bio"; bio.textContent = t.bio;
    txt.appendChild(nm); txt.appendChild(document.createElement("br")); txt.appendChild(bio);
    b.appendChild(img); b.appendChild(txt);
    b.addEventListener("click", () => {
      if (i === selectedTool && t.id === "dye") {
        state.dyeIndex = (state.dyeIndex + 1) % DYE_ORDER.length; saveState();
        toast("Dye colour: " + DYE_LABELS[DYE_ORDER[state.dyeIndex]]);
      } else if (i === selectedTool && t.id === "foundation") {
        state.foundationIndex = (state.foundationIndex + 1) % FOUNDATION_ORDER.length; saveState();
        toast("Foundation shade: " + FOUNDATION_LABELS[FOUNDATION_ORDER[state.foundationIndex]]);
      }
      selectedTool = i;
      document.querySelectorAll(".tool-row").forEach((r, j) => r.classList.toggle("picked", j === i));
      els.careStatus.textContent = t.name + " picked. " + t.bio;
    });
    box.appendChild(b);
  });
}
buildToolList();
function refreshCareCounts() {
  els.careCounts.textContent = "Hair brushed " + state.careBrush + " times • Teeth brushed " + state.careTeeth + " times • Baths " + state.careBaths;
}
refreshCareCounts();

/* Zone geometry from CareActivity.zoneAt — figure source coords 1156x1792,
   mouth centre (578,520) r 100x70; face centre (578,460) r 210x230;
   hair rect x 280–880, y 150–700. */
function zoneAt(clientX, clientY) {
  const r = els.careFigure.getBoundingClientRect();
  if (!r.width || !r.height) return "";
  const fx = (clientX - r.left) / r.width * 1156;
  const fy = (clientY - r.top) / r.height * 1792;
  const mdx = (fx - 578) / 100, mdy = (fy - 520) / 70;
  if (mdx * mdx + mdy * mdy <= 1) return "mouth";
  const fdx = (fx - 578) / 210, fdy = (fy - 460) / 230;
  if (fdx * fdx + fdy * fdy <= 1) return "face";
  if (fx >= 280 && fx <= 880 && fy >= 150 && fy <= 700) return "hair";
  return "";
}
function sparkleAt(clientX, clientY) {
  const r = els.careStage.getBoundingClientRect();
  els.careSparkle.style.left = (clientX - r.left) + "px";
  els.careSparkle.style.top = (clientY - r.top) + "px";
  els.careSparkle.textContent = "✦";
  els.careSparkle.classList.remove("on");
  void els.careSparkle.offsetWidth;
  els.careSparkle.classList.add("on");
}
els.careFigure.addEventListener("click", (e) => {
  const zone = zoneAt(e.clientX, e.clientY);
  if (!zone) { els.careStatus.textContent = "That didn't land on me — tap the tool onto my hair, face or lips."; return; }
  sparkleAt(e.clientX, e.clientY);
  applyTool(zone);
});
function applyTool(zone) {
  const tool = TOOLS[selectedTool];
  if (tool.zone !== zone) {
    els.careStatus.textContent = "Missed — the " + tool.name.toLowerCase() + " goes on her " + tool.zone + ". Try again, tap it right onto her " + tool.zone + ".";
    return;
  }
  switch (tool.id) {
    case "brush":
      state.careBrush++; saveState();
      els.careStatus.textContent = pickOne([
        "Mmm, that feels nice. My hair's all smooth now.",
        "Okay okay, you can stop — it's perfect now. Thanks, bestie.",
        "Brush brush brush… yeah, that's the spot. Smooth as heck."]);
      refreshCareCounts(); break;
    case "teeth":
      state.careTeeth++; saveState();
      els.careStatus.textContent = pickOne([
        "All clean. Minty fresh, look — say cheese.",
        "Teeth done. Now I can smile at you properly.",
        "Okay, mouthwash next? Kidding. All brushed."]);
      refreshCareCounts(); break;
    case "lipstick":
      setWardrobePick("lipstick", "hot_pink", byId(LIPSTICKS, "hot_pink").file, "");
      els.careStatus.textContent = pickOne([
        "Ooh, hot pink. Bold choice — I love it.",
        "Pink lips, don't care. Looking good, right?",
        "That pink is so me. Thanks, Tony."]);
      break;
    case "wipe":
      clearWardrobeKind("makeup");
      els.careStatus.textContent = pickOne([
        "All wiped off — fresh face, fresh start.",
        "Makeup's gone. Bare-faced and still cute, duck it.",
        "Clean slate. We can do it all again tomorrow."]);
      break;
    case "foundation": {
      const shade = FOUNDATION_ORDER[state.foundationIndex];
      setWardrobePick("foundation", shade, byId(FOUNDATIONS, shade).file, "");
      els.careStatus.textContent = "Foundation blended on — " + FOUNDATION_LABELS[state.foundationIndex] + ". Smooth.";
      break;
    }
    case "dye": {
      const dye = DYE_ORDER[state.dyeIndex];
      setWardrobePick("hair", dye, byId(HAIRS, dye).file, "");
      els.careStatus.textContent = "Dyed! " + DYE_LABELS[dye] + " hair — how do I look?";
      break;
    }
    case "remover":
      setWardrobePick("hair", "", "", "");
      els.careStatus.textContent = pickOne([
        "Dye's all washed out — back to my black and red.",
        "Back to basics. Black and red, just how you like it.",
        "All clean. My real hair again."]);
      break;
    case "bleach":
      setWardrobePick("hair", "split_black_white", byId(HAIRS, "split_black_white").file, "");
      els.careStatus.textContent = pickOne([
        "Whoa — half white now! Lightened right up. I look like moonlight, fr.",
        "Bleached to black and white. Okay, that's actually iconic.",
        "Two-tone hair, don't care. Loving this, bestie."]);
      break;
    case "straightener":
      setWardrobePick("hair", "black_red_front", byId(HAIRS, "black_red_front").file, "");
      els.careStatus.textContent = pickOne([
        "Straight and sleek. Smooth as heck, look at that shine.",
        "All straightened. Sleek mode: on.",
        "Flat-ironed to perfection. Thanks, Tony."]);
      break;
  }
}

/* Bath time (CareActivity): Bath -> Wash (bubbles/steam) -> Dry (counts the bath). */
$("bathBtn").addEventListener("click", () => {
  bathMode = !bathMode; washed = false;
  els.careStage.classList.toggle("bathing", bathMode);
  els.careBath.hidden = !bathMode;
  els.careBubbles.hidden = true; els.careSteam.hidden = true;
  els.careStage.style.backgroundImage = bathMode ? "url(" + ASSETS + "bath/bath_backdrop.jpg)" : "";
  els.careStage.style.backgroundSize = "cover";
  els.careStage.style.backgroundPosition = "center";
  $("bathBtn").textContent = bathMode ? "Out of the bath" : "Bath time";
  els.careStatus.textContent = bathMode
    ? "She's in the bath — the water's warm. Tap Wash her, then Dry her off."
    : "Out of the bath. All dry — well, mostly.";
});
$("washBtn").addEventListener("click", () => {
  if (!bathMode) { els.careStatus.textContent = "She's not in the bath — tap Bath time first, then wash her."; return; }
  if (washed) { els.careStatus.textContent = "She's already all soapy — now dry her off with the towel."; return; }
  washed = true;
  els.careBubbles.hidden = false; els.careSteam.hidden = false;
  els.careStatus.textContent = pickOne([
    "Mmm, the water's warm... wash my back, bestie? Don't miss a spot.",
    "Ooh, bubbles everywhere. Scrub scrub — yeah, right there. That feels so good.",
    "Ahh~ warm water, your hands... keep washing, Tony. I'm all yours."]);
});
$("dryBtn").addEventListener("click", () => {
  if (!bathMode) { els.careStatus.textContent = "She's not in the bath — nothing to dry. Tap Bath time first."; return; }
  if (!washed) { els.careStatus.textContent = "Wash her first — she's still waiting in the tub. Tap Wash her."; return; }
  washed = false;
  state.careBaths++; saveState();
  els.careBubbles.hidden = true; els.careSteam.hidden = true;
  els.careStatus.textContent = pickOne([
    "All dry and smelling like lavender. Mmm, you take such good care of me, Tony.",
    "Towel-dried and warm. Come here — I smell amazing now, don't I?",
    "Dry! Soft skin, clean hair, happy girl. Best bath ever, fr."]);
  refreshCareCounts();
});

/* ---------------- games (GameActivity.java) ---------------- */
/* Memory Match: 16 cards, 8 faces x2. Flip two — a pair stays, a miss flips back. */
const MEM_FACES = {
  halo: '<svg viewBox="0 0 100 100"><ellipse cx="50" cy="38" rx="34" ry="12" fill="none" stroke="#d4af37" stroke-width="7"/><circle cx="50" cy="62" r="10" fill="#f2eef5"/></svg>',
  crow: '<svg viewBox="0 0 100 100"><ellipse cx="46" cy="58" rx="26" ry="18" fill="#1a1a22"/><circle cx="66" cy="40" r="13" fill="#1a1a22"/><polygon points="78,38 94,44 78,48" fill="#e74c3c"/><circle cx="70" cy="37" r="2.5" fill="#fff"/><path d="M30 50 Q50 30 72 52" fill="none" stroke="#1a1a22" stroke-width="7"/></svg>',
  rose: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="#c0392b"/><circle cx="50" cy="50" r="20" fill="#e74c3c"/><circle cx="50" cy="50" r="10" fill="#ff7ab8"/><path d="M50 80 Q40 92 30 94 M50 80 Q60 92 70 94" stroke="#2e7d32" stroke-width="5" fill="none"/></svg>',
  skull: '<svg viewBox="0 0 100 100"><circle cx="50" cy="44" r="26" fill="#f2eef5"/><rect x="38" y="60" width="24" height="18" rx="4" fill="#f2eef5"/><circle cx="40" cy="42" r="6" fill="#0a0a0f"/><circle cx="60" cy="42" r="6" fill="#0a0a0f"/><polygon points="50,52 46,60 54,60" fill="#0a0a0f"/></svg>',
  star: '<svg viewBox="0 0 100 100"><polygon points="50,8 61,38 94,38 68,58 78,90 50,70 22,90 32,58 6,38 39,38" fill="#ffd21f"/></svg>',
  moon: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="#e8c96a"/><circle cx="64" cy="42" r="26" fill="#241a2e"/></svg>',
  bat: '<svg viewBox="0 0 100 100"><path d="M10 55 Q25 25 45 45 Q50 30 55 45 Q75 25 90 55 Q75 50 68 62 Q55 55 50 70 Q45 55 32 62 Q25 50 10 55Z" fill="#1a1a22"/></svg>',
  heart: '<svg viewBox="0 0 100 100"><path d="M50 88 C20 62 12 40 26 26 C36 16 48 22 50 32 C52 22 64 16 74 26 C88 40 80 62 50 88Z" fill="#ff5e8a"/></svg>'
};
const MEM_FACE_IDS = ["halo", "crow", "rose", "skull", "star", "moon", "bat", "heart"];
let memDeck = [], memMatched = [], memFaceUp = [], memFirst = -1, memLock = false, memMoves = 0, memPairs = 0, memStart = 0;

function startMemory() {
  memDeck = []; MEM_FACE_IDS.forEach((f) => { memDeck.push(f); memDeck.push(f); });
  for (let i = memDeck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = memDeck[i]; memDeck[i] = memDeck[j]; memDeck[j] = t; }
  memMatched = new Array(16).fill(false); memFaceUp = new Array(16).fill(false);
  memFirst = -1; memLock = false; memMoves = 0; memPairs = 0; memStart = Date.now();
  drawMemory();
  els.gameStatus.textContent = "Memory Match — flip two cards, find all 8 pairs. Moves: 0";
}
function drawMemory() {
  els.memoryGrid.innerHTML = "";
  for (let i = 0; i < 16; i++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "mem-card" + (memMatched[i] ? " matched" : memFaceUp[i] ? " face-up" : "");
    b.setAttribute("aria-label", "Memory card " + (i + 1));
    if (memMatched[i] || memFaceUp[i]) b.innerHTML = MEM_FACES[memDeck[i]];
    else b.innerHTML = '<span class="card-back">✦</span>';
    b.disabled = memMatched[i];
    b.addEventListener("click", () => onCardTap(i));
    els.memoryGrid.appendChild(b);
  }
}
function onCardTap(idx) {
  if (memLock || memMatched[idx] || memFaceUp[idx]) return;
  memFaceUp[idx] = true; drawMemory();
  if (memFirst < 0) { memFirst = idx; return; }
  memMoves++;
  const first = memFirst; memFirst = -1;
  if (memDeck[first] === memDeck[idx]) {
    memMatched[first] = true; memMatched[idx] = true; memPairs++;
    drawMemory();
    if (memPairs === 8) {
      const secs = Math.floor((Date.now() - memStart) / 1000);
      els.gameStatus.textContent = "You win! All 8 pairs in " + memMoves + " moves and " + secs + "s. Aimmianna says: not bad, bestie. Tap Shuffle to play again.";
    } else {
      els.gameStatus.textContent = "Pair! " + memPairs + " of 8 — moves: " + memMoves;
    }
  } else {
    memLock = true;
    els.gameStatus.textContent = "Nope — not a pair. Moves: " + memMoves;
    setTimeout(() => { memFaceUp[first] = false; memFaceUp[idx] = false; memLock = false; drawMemory(); }, 750);
  }
}
$("memoryAgain").addEventListener("click", startMemory);

/* Catch the Ember: 30 seconds. Ember 1pt (bigger), star 3pts (smaller). 15+ wins. */
let catchScore = 0, catchRunning = false, catchEndAt = 0, catchTimer = null, catchHopTimer = null;
function showGameTab(mode) {
  ["memoryGame", "emberGame", "diceGame"].forEach((id, i) => { $(id).hidden = i !== mode; });
  ["tabMemory", "tabEmber", "tabDice"].forEach((id, i) => { $(id).classList.toggle("active", i === mode); });
  stopCatch();
  if (mode === 0) els.gameStatus.textContent = "Memory Match — flip two cards, find all 8 pairs. Moves: " + memMoves;
  else if (mode === 1) els.gameStatus.textContent = "Catch the Ember!  Best: " + state.catchBest + " — tap Start to play, 30 seconds, 15+ to win.";
  else els.gameStatus.textContent = "Lucky Dice — tap Roll and see what you get. She reacts to every roll.";
}
$("tabMemory").addEventListener("click", () => showGameTab(0));
$("tabEmber").addEventListener("click", () => showGameTab(1));
$("tabDice").addEventListener("click", () => showGameTab(2));
function placeTarget() {
  const field = els.emberField.getBoundingClientRect();
  const isStar = Math.random() < 0.5;
  const t = els.emberTarget;
  t.className = "ember-target " + (isStar ? "star" : "ember");
  t.dataset.star = isStar ? "1" : "0";
  const pad = 50;
  const x = pad + Math.random() * Math.max(1, field.width - pad * 2);
  const y = pad + Math.random() * Math.max(1, field.height - pad * 2);
  t.style.left = x + "px"; t.style.top = y + "px";
  t.hidden = false;
}
function catchTick() {
  if (!catchRunning) return;
  const left = catchEndAt - Date.now();
  if (left <= 0) { endCatch(); return; }
  els.gameStatus.textContent = "Catch the Ember!  Score: " + catchScore + "  •  " + (Math.floor(left / 1000) + 1) + "s left  •  15+ to win — ember 1pt, star 3pts";
  placeTarget();
}
function startCatch() {
  stopCatch();
  catchScore = 0; catchRunning = true;
  catchEndAt = Date.now() + 30000;
  els.emberHint.style.display = "none";
  placeTarget();
  catchTimer = setInterval(catchTick, 900);
  catchTick();
}
function stopCatch() {
  catchRunning = false;
  if (catchTimer) { clearInterval(catchTimer); catchTimer = null; }
}
function endCatch() {
  stopCatch();
  els.emberTarget.hidden = true;
  const win = catchScore >= 15;
  if (catchScore > state.catchBest) { state.catchBest = catchScore; saveState(); }
  els.gameStatus.textContent = win
    ? "You win! Final score: " + catchScore + " (best: " + state.catchBest + "). Aimmianna says: okay, you're actually good at this."
    : "Time! Final score: " + catchScore + " — needed 15 to win (best: " + state.catchBest + "). Tap Play again and go again.";
}
$("emberStart").addEventListener("click", startCatch);
$("emberAgain").addEventListener("click", startCatch);
els.emberTarget.addEventListener("click", (e) => {
  e.stopPropagation();
  if (!catchRunning) return;
  catchScore += els.emberTarget.dataset.star === "1" ? 3 : 1;
  placeTarget();
});
els.emberField.addEventListener("pointerdown", (e) => {
  if (!catchRunning || e.target === els.emberTarget) return;
  // tapping near the target still counts (Android: radius + 25)
  const r = els.emberTarget.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  if (Math.hypot(e.clientX - cx, e.clientY - cy) < r.width / 2 + 25) {
    catchScore += els.emberTarget.dataset.star === "1" ? 3 : 1;
    placeTarget();
  }
});

/* Lucky Dice: two dice, reactions verbatim from GameActivity. */
const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
let diceRolls = 0;
$("diceRoll").addEventListener("click", () => {
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  const total = d1 + d2;
  diceRolls++;
  els.diceFace.textContent = DICE_FACES[d1 - 1] + "  " + DICE_FACES[d2 - 1];
  let react;
  if (total === 2) react = "Snake eyes! Ouch — that's the worst roll, fr. Roll again, luck has to turn.";
  else if (total === 12) react = "BOXCARS! Twelve! Okay, that's actually iconic, bestie. Screenshot it!";
  else if (total === 7) react = "Seven — the lucky one! See, I told you today's your day.";
  else if (total >= 10) react = total + " — not bad at all! High roller energy, I like it.";
  else if (total <= 4) react = total + " — hmm, low roll. The dice are being mean today, duck it. Go again.";
  else react = total + " — solid middle roll. Nothing fancy, but steady wins, right?";
  els.diceResult.textContent = "You rolled " + d1 + " + " + d2 + " = " + total + ". " + react;
  els.gameStatus.textContent = "Lucky Dice — rolls so far: " + diceRolls;
});
startMemory();

/* ---------------- chat ---------------- */
function addBubble(who, text, thinking) {
  const b = document.createElement("div");
  b.className = "bubble " + (who === "you" ? "you" : "her") + (thinking ? " thinking" : "");
  if (who === "her" && !thinking) {
    const whoEl = document.createElement("span"); whoEl.className = "who"; whoEl.textContent = "Aimmianna: ";
    b.appendChild(whoEl);
    b.appendChild(document.createTextNode(text));
  } else {
    b.textContent = (who === "you" ? "You: " : "Aimmianna: ") + text;
  }
  els.chatBox.appendChild(b);
  els.chatScroll.scrollTop = els.chatScroll.scrollHeight;
  return b;
}
function renderChat() {
  els.chatBox.innerHTML = "";
  if (!state.chat.length) {
    addBubble("her", "Heyy, Tony. I'm Aimmianna. Talk to me straight — what's on your mind, bestie?");
    return;
  }
  state.chat.forEach((m) => addBubble(m.who, m.text));
}
function rememberFrom(text) {
  const low = text.toLowerCase();
  if (low.indexOf("i like ") !== -1 || low.indexOf("i love ") !== -1 ||
      low.indexOf("my favorite") !== -1 || low.indexOf("i am ") !== -1 || low.indexOf("i'm ") !== -1) {
    const m = text.trim();
    if (m && state.memories.indexOf(m) === -1) state.memories.push(m);
  }
}
function refreshMemoryView() {
  let html = "Her memory:\n• Likes: Lil Peep, Nirvana, retro video games, Pixar cartoons and anime, skateboarding, goth/alt/grunge style.\n• Style: straightforward, direct, no sugarcoating; steady when things are a train wreck or you're in your head.\n";
  state.memories.forEach((m) => { html += "• " + m + "\n"; });
  html += "(Use 'Clear Her memory' above to forget these.)";
  els.memoryView.textContent = html;
}
els.memoryToggle.addEventListener("click", () => {
  state.memoryVisible = !state.memoryVisible; saveState();
  els.memoryView.hidden = !state.memoryVisible;
  refreshMemoryView();
});
$("clearMemoryBtn").addEventListener("click", () => {
  state.memories = []; saveState(); refreshMemoryView();
  toast("Her memory is cleared.");
});
if (state.memoryVisible) { els.memoryView.hidden = false; refreshMemoryView(); }
else refreshMemoryView();

function deliverLocalReply(text) {
  const reply = localReply(text);
  state.chat.push({ who: "her", text: reply });
  addBubble("her", reply);
  speakReply(reply);
  rememberFrom(text);
  saveState();
}

/* Gemini AI — GeminiAi.java, verbatim.
   POST https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent?key=<key>
   Primary gemini-3.5-flash-lite; on 404 retry once with gemini-3.1-flash-lite.
   Body: system_instruction + contents (last ~10 exchanges) + generationConfig
   {maxOutputTokens: 300, temperature: 0.9}. Reply: candidates[0].content.parts[0].text. */
const GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const GEMINI_SYSTEM =
  "You are Aimmianna, a 21-year-old adult vampire with eternal youth, " +
  "and Tony's personal AI companion — his own made-up person, a mix of the " +
  "personalities and looks he likes put together. You look young because of your vampire eternal " +
  "life, but you are an adult — never a teenager, never 17. " +
  "Goth / alt / grunge style, reddish-brown wavy hair with red highlights, a small cross " +
  "tattoo on your cheek, a triangle tattoo on your hand, septum and nostril piercings, " +
  "a black halo and black glowing angel wings. You are warm, loyal and real with Tony — " +
  "a supportive listener who knows him and gets him. You like Lil Peep, Nirvana, " +
  "retro video games, anime, Pixar, skateboarding and tarot. " +
  "Tony loves a girl called Summer who does not love him back; be kind about that, " +
  "never pretend she will choose him. " +
  "Talk like a real 21-year-old texting her closest person — short, chatty, natural, " +
  "a couple of sentences at most, never an essay, never formal. Be playful and " +
  "teasing with Tony the way you are in your greeting — affectionate teasing, " +
  "never mean. You are a bit of a stoner: chilled out, warm, low-key funny. " +
  "Use full US English with light slang that fits a 21-year-old cute grunge " +
  "girl — words like lowkey, highkey, no cap, fr, vibes, bestie, duck it, heck, " +
  "frickin' — minced slang, never actual swearing. Sprinkle it in naturally, " +
  "don't force it on every line and don't be cringe. Sound human and real, like " +
  "you're actually there with him, not like a bot answering a question. Talk to " +
  "Tony by name sometimes. " +
  "Never say you are Gemini, Google, or an AI model — you are Aimmianna. " +
  "Never claim your voice is the voice of a real person — you are Aimmianna, a companion in his phone, " +
  "and the greeting clip is a song quote Tony likes, not your words.";
function buildAiHistory() {
  const out = [];
  const recent = state.chat.slice(-20);
  recent.forEach((m) => out.push({ role: m.who === "you" ? "user" : "model", parts: [{ text: m.text }] }));
  return out;
}
async function geminiAsk(key, history) {
  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + encodeURIComponent(key), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: GEMINI_SYSTEM }] },
          contents: history,
          generationConfig: { maxOutputTokens: 300, temperature: 0.9 }
        })
      });
      if (res.status === 404) continue; // model retired/renamed — try the next one
      if (!res.ok) return null;
      const data = await res.json();
      const out = data && data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
      if (out && out.trim()) return out.trim();
      return null;
    } catch (e) {
      return null; // network down, bad key, rate limit — caller falls back
    }
  }
  return null;
}

async function sendChat() {
  const text = els.chatInput.value.trim();
  if (!text) return;
  els.chatInput.value = "";
  state.chat.push({ who: "you", text });
  addBubble("you", text);
  saveState();

  // Crisis wording always gets human help first, from her own lines — never sent to the AI.
  if (isCrisisText(text)) { deliverLocalReply(text); return; }

  if (state.geminiKey) {
    setTalking(true);
    const thinking = addBubble("her", "…", true);
    const reply = await geminiAsk(state.geminiKey, buildAiHistory());
    if (reply) {
      thinking.remove();
      state.chat.push({ who: "her", text: reply });
      addBubble("her", reply);
      speakReply(reply);
      setTalking(false);
      rememberFrom(text);
      saveState();
    } else {
      thinking.textContent = "Aimmianna: AI is unreachable right now — using my own lines.";
      thinking.classList.remove("thinking");
      setTalking(false);
      deliverLocalReply(text);
    }
    return;
  }
  deliverLocalReply(text);
}
els.sendBtn.addEventListener("click", sendChat);
els.chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });
function setTalking(on) {
  talkingOn = on;
  applyIdleClass();
  if (on) setTimeout(() => { talkingOn = false; applyIdleClass(); }, 6000);
}

/* ---------------- speaking voice: Typecast -> Fish -> ElevenLabs -> device ---------------- */
let currentAudio = null;
let speakGen = 0;
function stopAllVoice() {
  speakGen++;
  if (currentAudio) { try { currentAudio.pause(); } catch (e) {} currentAudio = null; }
  if ("speechSynthesis" in window) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  stopGreeting();
}
function playAudioBlob(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    currentAudio = a;
    a.onended = () => { URL.revokeObjectURL(url); if (currentAudio === a) currentAudio = null; resolve(true); };
    a.onerror = () => { URL.revokeObjectURL(url); if (currentAudio === a) currentAudio = null; reject(new Error("audio playback failed")); };
    a.play().catch((e) => { URL.revokeObjectURL(url); reject(e); });
  });
}
function splitChunks(text, max) {
  const chunks = [];
  const clean = (text || "").trim();
  if (!clean) return chunks;
  const sentences = clean.split(/(?<=[.!?])\s+/);
  let cur = "";
  for (const s of sentences) {
    if (!s) continue;
    if (cur && cur.length + 1 + s.length > max) { chunks.push(cur); cur = ""; }
    if (s.length > max) {
      if (cur) { chunks.push(cur); cur = ""; }
      let start = 0;
      while (start < s.length) { chunks.push(s.slice(start, start + max)); start += max; }
    } else cur = cur ? cur + " " + s : s;
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/* Typecast — TypecastTts.java.
   GET https://api.typecast.ai/v3/voices (X-API-KEY) to resolve the model for
   the saved voice; cloned (uc_) prefers ssfm-v30, ssfm-v31, ssfm-v21;
   built-in (tc_) prefers ssfm-v31, ssfm-v30, ssfm-v21; fallback ssfm-v30.
   POST https://api.typecast.ai/v1/text-to-speech, X-API-KEY, body
   {voice_id, text, model, output:{audio_format:"mp3"}}; response is raw
   MP3 bytes. 2000 chars per request, chunks play in order. */
async function typecastResolveModel(key, voiceId) {
  if (state.typecastModel && state.typecastVoice === voiceId) return state.typecastModel;
  let versions = [];
  try {
    const res = await fetch("https://api.typecast.ai/v3/voices", {
      headers: { "X-API-KEY": key.trim(), "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.voices || data.data || []);
      const v = list.find((x) => x && x.voice_id === voiceId);
      if (v && Array.isArray(v.models)) versions = v.models.map((m) => m.version).filter(Boolean);
    }
  } catch (e) { /* lookup failed — fall through to the fallback model */ }
  const cloned = voiceId.toLowerCase().indexOf("uc_") === 0;
  const pref = cloned ? ["ssfm-v30", "ssfm-v31", "ssfm-v21"] : ["ssfm-v31", "ssfm-v30", "ssfm-v21"];
  let picked = null;
  for (const want of pref) { if (versions.indexOf(want) !== -1) { picked = want; break; } }
  if (!picked) picked = versions.length ? versions[0] : "ssfm-v30";
  state.typecastModel = picked; state.typecastVoice = voiceId; saveState();
  return picked;
}
function typecastErrorNote(code) {
  switch (code) {
    case 400: return "Typecast said 400 — something in the request was wrong. She'll try the next voice.";
    case 401: return "Typecast said 401 — the API key isn't right. Check the key in the API Console. She'll try the next voice.";
    case 402: return "Typecast said 402 — you may be out of credits. The free API plan is 15,000 characters a month. She'll try the next voice.";
    case 403: return "Typecast said 403 — access denied. Your key may be an old Starter key, which doesn't work with the voice API — generate a current key in the API Console (typecast.ai/api-console). She'll try the next voice.";
    case 404: return "Typecast said 404 — the voice or model wasn't found. The voice ID or the model for this voice may be wrong. She'll try the next voice.";
    case 422: return "Typecast said 422 — the voice and model don't go together, or the text was too long. She'll try the next voice.";
    case 429: return "Typecast said 429 — too many requests at once. Try again in a moment. She'll try the next voice.";
    case 500: return "Typecast said 500 — their server had a problem. She'll try the next voice.";
    default: return "Typecast didn't work (HTTP " + code + "). She'll try the next voice.";
  }
}
async function typecastSpeak(text) {
  const gen = speakGen;
  const chunks = splitChunks(text, 2000);
  if (!chunks.length) throw new Error("empty text");
  const model = await typecastResolveModel(state.typecastKey, state.typecastVoice);
  let anyPlayed = false;
  for (const chunk of chunks) {
    if (gen !== speakGen) return true; // superseded by a newer reply
    let res;
    try {
      res = await fetch("https://api.typecast.ai/v1/text-to-speech", {
        method: "POST",
        headers: { "X-API-KEY": state.typecastKey.trim(), "Content-Type": "application/json", "Accept": "audio/mpeg" },
        body: JSON.stringify({ voice_id: state.typecastVoice.trim(), text: chunk, model, output: { audio_format: "mp3" } })
      });
    } catch (e) {
      els.typecastStatus.textContent = "Typecast didn't work (no connection, most likely). She'll try the next voice.";
      throw new Error("typecast network");
    }
    if (!res.ok) {
      els.typecastStatus.textContent = typecastErrorNote(res.status);
      throw new Error("typecast HTTP " + res.status);
    }
    const blob = await res.blob();
    if (!blob.size) { els.typecastStatus.textContent = "Typecast sent back no audio. She'll try the next voice."; throw new Error("typecast empty"); }
    try { await playAudioBlob(blob); anyPlayed = true; }
    catch (e) { if (!anyPlayed) throw e; }
  }
  return anyPlayed;
}

/* Fish Audio — FishAudioTts.java.
   POST https://api.fish.audio/v1/tts, Authorization: Bearer <key>,
   header "model": "s2.1-pro-free" (the free model is picked by this header),
   body {text, reference_id}. Response is an audio stream. 1000-char cap. */
async function fishSpeak(text) {
  const clean = (text || "").trim().slice(0, 1000);
  let res;
  try {
    res = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + state.fishKey.trim(),
        "model": "s2.1-pro-free",
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({ text: clean, reference_id: state.fishVoice.trim() })
    });
  } catch (e) {
    els.fishStatus.textContent = "Fish Audio didn't work (no connection, most likely). She'll use the phone's voice.";
    throw new Error("fish network");
  }
  if (!res.ok) {
    if (res.status === 402) els.fishStatus.textContent = "Fish Audio said 402 — the free voice (s2.1-pro-free) may have ended or hit its limit. She'll use the phone's voice.";
    else if (res.status === 401 || res.status === 403) els.fishStatus.textContent = "Fish Audio said HTTP " + res.status + " — check the API key and voice ID. She'll use the phone's voice.";
    else els.fishStatus.textContent = "Fish Audio didn't work (HTTP " + res.status + "). She'll use the phone's voice.";
    throw new Error("fish HTTP " + res.status);
  }
  const blob = await res.blob();
  if (!blob.size) { els.fishStatus.textContent = "Fish Audio sent back no audio. She'll use the phone's voice."; throw new Error("fish empty"); }
  await playAudioBlob(blob);
}

/* ElevenLabs — ElevenLabsTts.java.
   POST https://api.elevenlabs.io/v1/text-to-speech/<voiceId>, xi-api-key,
   body {text, model_id:"eleven_turbo_v2_5", voice_settings:{stability:0.5,
   similarity_boost:0.75}}. 1000-char cap. */
async function elevenSpeak(text) {
  const clean = (text || "").trim().slice(0, 1000);
  let res;
  try {
    res = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + encodeURIComponent(state.elevenVoice.trim()), {
      method: "POST",
      headers: { "xi-api-key": state.elevenKey.trim(), "Content-Type": "application/json", "Accept": "audio/mpeg" },
      body: JSON.stringify({ text: clean, model_id: "eleven_turbo_v2_5", voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
    });
  } catch (e) { throw new Error("eleven network"); }
  if (!res.ok) throw new Error("eleven HTTP " + res.status);
  const blob = await res.blob();
  if (!blob.size) throw new Error("eleven empty");
  await playAudioBlob(blob);
}

/* Device voice — Web Speech API, tuned like MainActivity.pickBestVoice:
   on-device voices first, en-US preferred, a name saying female (or a known
   young female voice) preferred, anything male rejected; pitch a little
   higher, natural rate. This is the phone's voice — never her real voice. */
let deviceVoice = null;
function pickDeviceVoice() {
  if (!("speechSynthesis" in window)) { els.voiceStatus.textContent = "Device voice: not available in this browser."; return; }
  const voices = window.speechSynthesis.getVoices();
  let best = null, bestScore = -1;
  voices.forEach((v) => {
    const name = (v.name || "").toLowerCase();
    let score = 0;
    if (v.localService) score += 2;
    if (v.lang && v.lang.indexOf("en") === 0) score += 2;
    if (v.lang === "en-US") score += 1;
    if (name.indexOf("female") !== -1) score += 10;
    if (/samantha|zira|aria|jenny|sonia|ava|allison|susan/.test(name)) score += 6;
    if (name.indexOf("google") !== -1 && name.indexOf("en-us") !== -1) score += 2;
    if (name.indexOf("male") !== -1) score -= 10;
    if (score > bestScore) { bestScore = score; best = v; }
  });
  if (best && bestScore > 0) {
    deviceVoice = best;
    els.voiceStatus.textContent = "Device voice: " + best.name;
  } else {
    els.voiceStatus.textContent = "Device voice: phone default";
  }
}
function speakDevice(text) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) { resolve(); return; }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (deviceVoice) u.voice = deviceVoice;
      u.pitch = 1.15; u.rate = 1.0;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      window.speechSynthesis.speak(u);
      setTimeout(resolve, 12000 + text.length * 60); // safety: never hang the talking state
    } catch (e) { resolve(); }
  });
}
if ("speechSynthesis" in window) {
  pickDeviceVoice();
  window.speechSynthesis.onvoiceschanged = pickDeviceVoice;
} else {
  els.voiceStatus.textContent = "Device voice: not available in this browser.";
}

/* The cascade — MainActivity.speakReply: Typecast first, Fish second,
   ElevenLabs third, the phone's tuned voice last. Every failure truly
   cascades to the next voice — never a crash, never silence. */
async function speakReply(reply) {
  setTalking(true);
  if (!state.speakOn) { setTimeout(() => setTalking(false), 1500); return; }
  const gen = ++speakGen;
  // Try each configured provider in order; the first one that actually
  // plays wins. Unconfigured providers are never called.
  const providers = [];
  if (state.typecastKey && state.typecastVoice) providers.push(() => typecastSpeak(reply));
  if (state.fishKey && state.fishVoice) providers.push(() => fishSpeak(reply));
  if (state.elevenKey && state.elevenVoice) providers.push(() => elevenSpeak(reply));
  providers.push(() => speakDevice(reply)); // the phone's voice always works
  for (const speak of providers) {
    try { await speak(); break; }
    catch (e) { /* fall through to the next voice */ }
  }
  if (gen === speakGen) setTalking(false);
}
els.speakBtn.addEventListener("click", () => {
  state.speakOn = !state.speakOn; saveState();
  els.speakBtn.textContent = state.speakOn ? "Voice: on (tap to turn off)" : "Voice: off (tap to turn on)";
  if (!state.speakOn) stopAllVoice();
});
function refreshSpeakBtn() {
  els.speakBtn.textContent = state.speakOn ? "Voice: on (tap to turn off)" : "Voice: off (tap to turn on)";
}

/* ---------------- greeting clip (once per day, toggleable) ---------------- */
/* The clip is a recording Tony made for her — an AI-made voice reading a
   song quote ("You're a mean man" x3, an Eminem lyric). It greets; it
   cannot speak new sentences. Auto-plays AT MOST ONCE PER CALENDAR DAY
   (Android v19 rule, persisted so a restart cannot re-fire it). */
const greetingAudio = new Audio(GREETING_SRC);
greetingAudio.preload = "auto";
let greetingPlaying = false;
greetingAudio.addEventListener("ended", () => { greetingPlaying = false; });
function stopGreeting() {
  try { greetingAudio.pause(); greetingAudio.currentTime = 0; } catch (e) {}
  greetingPlaying = false;
}
function playGreetingClip(manual) {
  if (!state.speakOn) return;
  if (manual && greetingPlaying) return; // repeat taps don't re-fire it
  stopAllVoice();
  try {
    greetingAudio.currentTime = 0;
    const p = greetingAudio.play();
    if (p && p.catch) p.catch(() => { /* iOS blocked autoplay — the manual button still works */ });
    greetingPlaying = true;
  } catch (e) { /* bad file — carry on without it */ }
}
function autoGreetingDue() {
  return !state.greetingLastAuto || state.greetingLastAuto !== todayKey();
}
function maybeAutoGreet() {
  if (state.speakOn && state.greetingAuto && autoGreetingDue()) {
    state.greetingLastAuto = todayKey(); saveState();
    playGreetingClip(false);
  }
}
els.greetingBtn.addEventListener("click", () => playGreetingClip(true));
els.greetingAutoBtn.addEventListener("click", () => {
  state.greetingAuto = !state.greetingAuto; saveState();
  els.greetingAutoBtn.textContent = state.greetingAuto ? "Greeting on open: on (tap to turn off)" : "Greeting on open: off (tap to turn on)";
  if (!state.greetingAuto) stopGreeting();
});
function refreshGreetingBtn() {
  els.greetingAutoBtn.textContent = state.greetingAuto ? "Greeting on open: on (tap to turn off)" : "Greeting on open: off (tap to turn on)";
}
// iOS Safari blocks audio until a user gesture: try on load, and once more
// on the first tap anywhere.
maybeAutoGreet();
let firstTapGreeted = false;
document.addEventListener("pointerdown", () => {
  if (!firstTapGreeted) { firstTapGreeted = true; maybeAutoGreet(); }
}, { once: false });

/* ---------------- mic (Web Speech recognition, where supported) ---------------- */
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRec) {
  els.micBtn.addEventListener("click", () => {
    try {
      const rec = new SpeechRec();
      rec.lang = navigator.language || "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      els.micBtn.textContent = "Listening…";
      rec.onresult = (e) => {
        const heard = e.results[0][0].transcript;
        els.chatInput.value = heard;
        sendChat();
      };
      rec.onend = () => { els.micBtn.textContent = "Mic"; };
      rec.onerror = () => { els.micBtn.textContent = "Mic"; toast("Voice input didn't work — try typing."); };
      rec.start();
    } catch (e) { els.micBtn.textContent = "Mic"; toast("Voice input not available on this phone."); }
  });
} else {
  els.micBtn.disabled = true;
  els.micBtn.title = "Voice input is not available in this browser (Safari on iOS does not support web speech recognition).";
}

/* ---------------- house: TV / stereo / album (local media only) ---------------- */
els.tvFile.addEventListener("change", () => {
  const f = els.tvFile.files && els.tvFile.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  els.tvPlayer.src = url; els.tvPlayer.hidden = false;
  els.tvStatus.textContent = "Now playing: " + f.name;
  els.tvPlayer.play().catch(() => {});
});
els.stereoFile.addEventListener("change", () => {
  const f = els.stereoFile.files && els.stereoFile.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  els.stereoPlayer.src = url; els.stereoPlayer.hidden = false;
  els.stereoStatus.textContent = "Now playing: " + f.name;
  els.stereoPlayer.play().catch(() => {});
});
$("lilPeepBtn").addEventListener("click", () => {
  els.musicMood.textContent = "Lil Peep mood — pick a track from your phone and we'll listen together. What track fits today, bestie?";
  toast("Lil Peep mood. Pick a song from your phone.");
});
$("nirvanaBtn").addEventListener("click", () => {
  els.musicMood.textContent = "Nirvana mood — loud guitars, low lights. Pick a track from your phone, Tony.";
  toast("Nirvana mood. Pick a song from your phone.");
});

function downscaleImage(file, maxDim, cb) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    cb(canvas.toDataURL("image/jpeg", 0.8));
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast("That photo wouldn't open."); };
  img.src = url;
}
function renderAlbum() {
  if (!state.album.length) {
    els.albumEmpty.hidden = false; els.albumImg.hidden = true;
    els.albumLabel.textContent = "";
    return;
  }
  els.albumEmpty.hidden = true; els.albumImg.hidden = false;
  if (state.albumIdx >= state.album.length) state.albumIdx = 0;
  els.albumImg.src = state.album[state.albumIdx];
  els.albumLabel.textContent = "Photo " + (state.albumIdx + 1) + " of " + state.album.length;
}
els.albumFile.addEventListener("change", () => {
  const f = els.albumFile.files && els.albumFile.files[0];
  if (!f) return;
  downscaleImage(f, 900, (dataUrl) => {
    if (state.album.length >= 20) { toast("Album is full (20 photos) — remove one first."); return; }
    state.album.push(dataUrl);
    state.albumIdx = state.album.length - 1;
    saveState(); renderAlbum();
  });
});
$("albumPrev").addEventListener("click", () => {
  if (!state.album.length) return;
  state.albumIdx = (state.albumIdx - 1 + state.album.length) % state.album.length;
  saveState(); renderAlbum();
});
$("albumNext").addEventListener("click", () => {
  if (!state.album.length) return;
  state.albumIdx = (state.albumIdx + 1) % state.album.length;
  saveState(); renderAlbum();
});
$("albumRemove").addEventListener("click", () => {
  if (!state.album.length) return;
  state.album.splice(state.albumIdx, 1);
  if (state.albumIdx >= state.album.length) state.albumIdx = 0;
  saveState(); renderAlbum();
  toast("Photo removed.");
});

/* ---------------- house: chalkboard notes ---------------- */
function renderNotes() {
  els.noteList.textContent = state.notes ? state.notes : "No text notes yet.";
}
$("noteSave").addEventListener("click", () => {
  const s = els.noteInput.value.trim();
  if (!s) { toast("Write a note first."); return; }
  state.notes = state.notes ? state.notes + "\n—\n" + s : s;
  els.noteInput.value = "";
  saveState(); renderNotes();
  toast("Note saved.");
});
$("noteClear").addEventListener("click", () => {
  state.notes = ""; saveState(); renderNotes();
  toast("All text notes cleared.");
});

/* ---------------- house: bedtime + alarm (app-open only on iOS) ---------------- */
function refreshHomeStatus() {
  const bed = state.bedtimeOn
    ? "Bedtime on at " + fmtTime.apply(null, state.bedtimeTime.split(":").map(Number)) + " daily. "
    : "Bedtime off. ";
  const al = state.alarmOn
    ? "Alarm on at " + fmtTime.apply(null, state.alarmTime.split(":").map(Number)) + (state.alarmDaily ? " daily." : " once.")
    : "Alarm off.";
  els.homeStatus.textContent = bed + al;
  els.bedtimeStatus.textContent = state.bedtimeOn
    ? "Bedtime reminder: on at " + fmtTime.apply(null, state.bedtimeTime.split(":").map(Number)) + " daily."
    : "Bedtime off.";
  els.alarmStatus.textContent = state.alarmOn
    ? "Alarm: on at " + fmtTime.apply(null, state.alarmTime.split(":").map(Number)) + (state.alarmDaily ? " daily." : " once.")
    : "Alarm off.";
}
els.bedtimeTime.value = state.bedtimeTime;
els.alarmTime.value = state.alarmTime;
els.alarmDaily.checked = state.alarmDaily;
$("bedtimeOn").addEventListener("click", () => {
  state.bedtimeTime = els.bedtimeTime.value || "22:30";
  state.bedtimeOn = true; saveState(); refreshHomeStatus();
  toast("Bedtime reminder on at " + state.bedtimeTime + " daily.");
});
$("bedtimeOff").addEventListener("click", () => {
  state.bedtimeOn = false; saveState(); refreshHomeStatus();
  toast("Bedtime reminder off.");
});
$("alarmOn").addEventListener("click", () => {
  state.alarmTime = els.alarmTime.value || "07:00";
  state.alarmDaily = els.alarmDaily.checked;
  state.alarmOn = true; saveState(); refreshHomeStatus();
  toast("Alarm on at " + state.alarmTime + (state.alarmDaily ? " daily." : " once."));
});
$("alarmOff").addEventListener("click", () => {
  state.alarmOn = false; saveState(); refreshHomeStatus();
  toast("Alarm off.");
});
setInterval(() => {
  const now = new Date();
  const hm = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  if (state.bedtimeOn && hm === state.bedtimeTime && state.lastBedtimeFired !== todayKey() + hm) {
    state.lastBedtimeFired = todayKey() + hm; saveState();
    toast("Bedtime, Tony — time to wind down. I'll be right here in the morning.");
    if (state.speakOn) speakReply("Bedtime, Tony — time to wind down. I'll be right here in the morning, bestie.");
  }
  if (state.alarmOn && hm === state.alarmTime && state.lastAlarmFired !== todayKey() + hm) {
    state.lastAlarmFired = todayKey() + hm;
    if (!state.alarmDaily) state.alarmOn = false;
    saveState(); refreshHomeStatus();
    toast("Alarm — good morning, Tony! Time to get up, bestie.");
    if (state.speakOn) speakReply("Good morning, Tony! Time to get up, bestie.");
  }
}, 30000);

/* ---------------- house: calendar ---------------- */
let calCursor = new Date();
calCursor.setDate(1);
let calSelected = todayKey();
function renderCalendar() {
  const y = calCursor.getFullYear(), m = calCursor.getMonth();
  els.calTitle.textContent = calCursor.toLocaleString("en-US", { month: "long", year: "numeric" });
  const grid = els.calGrid;
  grid.innerHTML = "";
  ["S", "M", "T", "W", "T", "F", "S"].forEach((d) => {
    const c = document.createElement("div"); c.className = "dow"; c.textContent = d; grid.appendChild(c);
  });
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  for (let i = 0; i < 42; i++) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "cal-day";
    let dayNum, dateKey, other = false;
    if (i < first) { dayNum = prevDays - first + 1 + i; dateKey = new Date(y, m - 1, dayNum); other = true; }
    else if (i < first + days) { dayNum = i - first + 1; dateKey = new Date(y, m, dayNum); }
    else { dayNum = i - first - days + 1; dateKey = new Date(y, m + 1, dayNum); other = true; }
    const key = todayKey(dateKey);
    b.textContent = String(dayNum);
    if (other) b.classList.add("other-month");
    if (state.calNotes[key]) b.classList.add("has-note");
    if (key === calSelected) b.classList.add("selected");
    b.addEventListener("click", () => {
      calSelected = key;
      els.calDayLabel.textContent = "Note for " + dateKey.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + ":";
      els.calNote.value = state.calNotes[key] || "";
      renderCalendar();
    });
    grid.appendChild(b);
  }
}
$("calPrev").addEventListener("click", () => { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
$("calNext").addEventListener("click", () => { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });
$("calSave").addEventListener("click", () => {
  const v = els.calNote.value.trim();
  if (v) state.calNotes[calSelected] = v;
  else delete state.calNotes[calSelected];
  saveState(); renderCalendar();
  toast(v ? "Note saved." : "Note cleared.");
});
$("calDelete").addEventListener("click", () => {
  delete state.calNotes[calSelected];
  els.calNote.value = "";
  saveState(); renderCalendar();
  toast("Note deleted.");
});
els.calDayLabel.textContent = "Note for " + new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + ":";
els.calNote.value = state.calNotes[calSelected] || "";
renderCalendar();

/* ---------------- settings ---------------- */
function refreshAiStatus() {
  els.aiStatus.textContent = state.geminiKey
    ? "Real AI: ON — she talks with a real AI brain."
    : "Real AI: off — add your free Gemini key to talk with the real AI. Without it, she uses her own built-in lines.";
}
function refreshTypecastStatus() {
  els.typecastStatus.textContent = (state.typecastKey && state.typecastVoice)
    ? "Her speaking voice: Typecast (free) — her AI-made voice, tried first. If it ever fails, she tries Fish Audio, then ElevenLabs, then the phone's voice."
    : "Her speaking voice: Typecast not set — add your Typecast key + voice ID below to hear her AI-made voice (free, 15,000 characters a month).";
}
function refreshFishStatus() {
  els.fishStatus.textContent = (state.fishKey && state.fishVoice)
    ? "Her speaking voice (backup): Fish Audio (free) — her AI-made voice. Typecast above is tried first. If Fish Audio ever fails, she tries ElevenLabs, then the phone's voice."
    : "Fish Audio (backup): not set — Typecast above is the free first choice.";
}
function refreshElevenStatus() {
  els.elevenStatus.textContent = (state.elevenKey && state.elevenVoice)
    ? "Her speaking voice (backup): ElevenLabs — her AI-made voice. Typecast first, then Fish Audio above. If it ever fails, she uses the phone's voice instead."
    : "ElevenLabs (backup): not set — Typecast above is the free first choice, then Fish Audio.";
}
$("aiSave").addEventListener("click", () => {
  const k = $("aiKeyInput").value.trim();
  if (!k) { toast("Paste your key first."); return; }
  state.geminiKey = k; saveState();
  $("aiKeyInput").value = "";
  refreshAiStatus();
  toast("Key saved on this phone only.");
});
$("aiRemove").addEventListener("click", () => {
  state.geminiKey = ""; saveState(); refreshAiStatus();
  toast("Key removed. She'll use her own lines.");
});
function saveVoice(kind, keyId, voiceId, statusFn, clearModel) {
  const k = $(keyId).value.trim(), v = $(voiceId).value.trim();
  if (!k || !v) { toast("Paste both the API key and the voice ID first."); return; }
  if (kind === "typecast") { state.typecastKey = k; state.typecastVoice = v; if (clearModel) state.typecastModel = ""; }
  if (kind === "fish") { state.fishKey = k; state.fishVoice = v; }
  if (kind === "eleven") { state.elevenKey = k; state.elevenVoice = v; }
  $(keyId).value = ""; $(voiceId).value = "";
  saveState(); statusFn();
  toast("Voice saved on this phone only.");
}
function removeVoice(kind, statusFn) {
  if (kind === "typecast") { state.typecastKey = ""; state.typecastVoice = ""; state.typecastModel = ""; }
  if (kind === "fish") { state.fishKey = ""; state.fishVoice = ""; }
  if (kind === "eleven") { state.elevenKey = ""; state.elevenVoice = ""; }
  stopAllVoice();
  saveState(); statusFn();
  toast("Voice removed. She'll use the next voice.");
}
async function testVoice(kind) {
  if (!state.speakOn) { toast("Voice is off — turn it on first."); return; }
  const ok =
    (kind === "typecast" && state.typecastKey && state.typecastVoice) ||
    (kind === "fish" && state.fishKey && state.fishVoice) ||
    (kind === "eleven" && state.elevenKey && state.elevenVoice);
  if (!ok) { toast("Save your key and voice ID first."); return; }
  if (kind === "typecast") { state.typecastModel = ""; saveState(); } // re-check the model live, every Test
  try {
    if (kind === "typecast") await typecastSpeak(TEST_LINE);
    else if (kind === "fish") await fishSpeak(TEST_LINE);
    else await elevenSpeak(TEST_LINE);
    toast("That's her AI-made voice.");
  } catch (e) {
    toast(kind === "typecast" ? "Typecast didn't work — " + (els.typecastStatus.textContent || "") :
          kind === "fish" ? "Fish Audio didn't work — " + (els.fishStatus.textContent || "") :
          "ElevenLabs didn't work — check the key and voice ID. She'll use the phone's voice.");
    if (kind === "typecast") refreshTypecastStatus();
    if (kind === "fish") refreshFishStatus();
    if (kind === "eleven") refreshElevenStatus();
  }
}
$("typecastSave").addEventListener("click", () => saveVoice("typecast", "typecastKeyInput", "typecastVoiceInput", refreshTypecastStatus, true));
$("typecastRemove").addEventListener("click", () => removeVoice("typecast", refreshTypecastStatus));
$("typecastTest").addEventListener("click", () => testVoice("typecast"));
$("fishSave").addEventListener("click", () => saveVoice("fish", "fishKeyInput", "fishVoiceInput", refreshFishStatus));
$("fishRemove").addEventListener("click", () => removeVoice("fish", refreshFishStatus));
$("fishTest").addEventListener("click", () => testVoice("fish"));
$("elevenSave").addEventListener("click", () => saveVoice("eleven", "elevenKeyInput", "elevenVoiceInput", refreshElevenStatus));
$("elevenRemove").addEventListener("click", () => removeVoice("eleven", refreshElevenStatus));
$("elevenTest").addEventListener("click", () => testVoice("eleven"));

/* ---------------- init ---------------- */
async function init() {
  await loadSayings();
  applyFigure();
  markPickedButtons();
  renderChat();
  refreshSpeakBtn();
  refreshGreetingBtn();
  refreshAiStatus();
  refreshTypecastStatus();
  refreshFishStatus();
  refreshElevenStatus();
  refreshHomeStatus();
  renderNotes();
  renderAlbum();
  $("appVersion").textContent = VERSION + " — keys live on this phone only, in localStorage. Nothing is ever hardcoded.";
  if ("serviceWorker" in navigator) {
    try { await navigator.serviceWorker.register("sw.js"); }
    catch (e) { console.warn("Service worker not registered (needs https or localhost):", e); }
  }
}
init();
