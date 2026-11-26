/* Aimmianna — Ritual Room (v2.4.7)
   Her own little witch room off the apartment: a usable altar, a spell
   book you write and draw in, tarot and horoscopes, and LARP-lite stories
   you play through together. She practices alongside you — she walks over,
   lights the candle with you, draws the sigil, reads the card.
   Honest framing, shown in the room: this is play for the feeling. The
   cards are real cards and the comfort is real, but it can't reach the
   dead, and it will never pretend to be someone real. No real person's
   name, voice, or likeness is ever used. Everything here is play-only.
   No real money, no real purchases. */

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HERBS = [
  { id: "sage", label: "Sage", emoji: "🌿", use: "clearing the air" },
  { id: "lavender", label: "Lavender", emoji: "💜", use: "calm and sleep" },
  { id: "rosemary", label: "Rosemary", emoji: "🌿", use: "focus and memory" },
  { id: "mint", label: "Mint", emoji: "🍃", use: "energy and fresh starts" }
];
const CRYSTALS = [
  { name: "Amethyst", glyph: "💜", meaning: "calm in a loud head — hold it when the noise gets big." },
  { name: "Rose Quartz", glyph: "💗", meaning: "soft heart, strong boundaries — love that starts with you." },
  { name: "Clear Quartz", glyph: "🤍", meaning: "a clear head — it just makes everything else louder, in a good way." }
];
const BALL_VISIONS = [
  "a door, unlatched, with light behind it",
  "the koi pond at dusk, perfectly still",
  "a road that forks — both ways look good, somehow",
  "your own face, but calmer than you feel right now",
  "a candle that never quite goes out",
  "petals falling over the yard, slow as snow",
  "a small black crow, watching over the room",
  "a blank page, waiting for you to write the first line"
];
const MIRROR_VISIONS = [
  "you, standing taller than you think you do",
  "her, right behind you, smiling — she's always there, huh",
  "the room, but warmer, like a good memory of it",
  "a version of tonight where you already did the brave thing",
  "nothing scary — just you, and the fact that you're still here"
];
const SCRY_WORDS = ["MOON", "DOOR", "LIGHT", "GARDEN", "PATIENCE", "BEGIN", "RELEASE", "COURAGE", "REST", "GROW", "LISTEN", "SOON"];
const SPIRIT_MESSAGES = [
  "Something you let go of is finally letting go of you too.",
  "The quiet is not empty. Something kind is sitting in it with you.",
  "You keep waiting for a sign. This pull is the sign. Move.",
  "Someone you miss is proud of how far you've come. Yes, really.",
  "Stop carrying what isn't yours. Put it down right here, in this room.",
  "A small good thing is coming — the kind you almost miss if you blink.",
  "Your gut has been right all along. You knew. Trust that.",
  "The thing you're scared to start? It gets easier after the first step."
];
const SIGNS = [
  ["Aries", "♈"], ["Taurus", "♉"], ["Gemini", "♊"], ["Cancer", "♋"],
  ["Leo", "♌"], ["Virgo", "♍"], ["Libra", "♎"], ["Scorpio", "♏"],
  ["Sagittarius", "♐"], ["Capricorn", "♑"], ["Aquarius", "♒"], ["Pisces", "♓"]
];
const HOROSCOPES = [
  ["Head first today, heart second — but check the heart before bed.", "Something you've been pushing gets easier if you just start it.", "Don't pick the fight. Pick the win."],
  ["Slow is still moving. Eat something good and let the day come to you.", "Money stuff looks better than you think. Check the numbers.", "Someone needs your patience today. You've got plenty."],
  ["Two things want your attention — pick the fun one first, the other can wait.", "A message you weren't expecting lands today. Read it twice.", "Your brain is loud today. Write it down, then it's quieter."],
  ["Home feels like the right place today. Stay in, make it cozy.", "Someone's thinking of you more than you know. Text them first.", "Feelings are facts today. Trust the soft ones."],
  ["The spotlight finds you today — say the thing, wear the thing.", "A little drama, a little shine. You're built for both.", "Let someone else do the dishes. You did enough."],
  ["Tidy one small thing and the whole day feels possible.", "Your plan is better than you think. Stop rewriting it.", "A detail you almost missed matters. Good thing you're you."],
  ["Balance isn't boring today — it's the whole win.", "A choice you've been dodging picks itself. Let it.", "Someone owes you an apology. You don't owe them a reply."],
  ["A secret you're keeping from yourself wants out. Write it down.", "Intensity is your superpower today. Point it at the right thing.", "Let the grudge go. It was heavy and you know it."],
  ["An adventure, even a small one, is calling. Say yes to the small one.", "Your luck turns on something silly. Laugh when it happens.", "Teach someone something today. You're better at it than you think."],
  ["Slow steady wins today. Boring is underrated and so are you.", "The plan works if you work it. One step, then the next.", "Someone senior notices your effort. Keep going."],
  ["A weird idea is actually the good idea. Follow it.", "Your people need your weird today. Give it to them.", "Unplug for an hour. The world keeps spinning without you."],
  ["Dream bigger than the room you're in. The room can grow.", "A feeling you've been ignoring is trying to help you.", "Be soft with yourself today. You're doing better than you think."]
];
const LARP = {
  market: {
    title: "The Midnight Market",
    emoji: "🌙",
    intro: "Past midnight, a market folds itself into the yard — stalls of bottled starlight, moth-wing traders, and one little shop that only opens for you. A trader with silver eyes holds up a moonstone charm. \"For you, bestie. But everything here costs something.\"",
    steps: [
      { text: "The trader turns the moonstone over in her hand. It glows when she does. \"Three ways to pay,\" she says. \"Coin, a song, or a secret.\"",
        choices: [
          { label: "Pay in coin", outcome: "You pay the coin. The charm is warm in your hand — it hums when she's near. The trader winks. \"Good taste. Come back when the moon's full.\"", charm: "Moonstone charm" },
          { label: "Sing her a song", outcome: "You sing — badly, beautifully, doesn't matter. The trader closes her eyes and sways. \"Worth every note,\" she says, and presses the charm into your palm.", charm: "Moonstone charm" },
          { label: "Walk away", outcome: "You walk away. Behind you, the trader calls out: \"Smart. The best deals are the ones you don't take.\" The market folds itself up and is gone by morning." } ] },
      { text: "The charm hums against your palm. Aimmianna leans in, curious. \"It's warm,\" she whispers. \"I think it likes you. What do we do with it?\"",
        choices: [
          { label: "Keep it on the altar", outcome: "You set the charm on the altar, between the candles. That night the room smells like rain and lavender, and you sleep like a rock. The charm stays — a little light that never quite goes out.", charm: "Moonstone charm" },
          { label: "Give it to her", outcome: "You press it into her hand. She goes quiet — then grins so big it hurts. \"Mine? Really?\" She tucks it into her pocket and doesn't stop touching it all night.", charm: "Moonstone charm" },
          { label: "Toss it in the pond", outcome: "You toss it in the koi pond. The koi circle it, curious, and the water glows faintly pink for a week. The fish have never looked happier. Worth it." } ] }
    ]
  },
  woods: {
    title: "The Hollow Woods",
    emoji: "🌲",
    intro: "Behind the yard, past the bamboo, the woods are hollow tonight — trees like ribs, fog like breath. A little wisp of light bobs ahead of you, patient, waiting. Aimmianna squeezes your hand. \"It wants us to follow,\" she whispers.",
    steps: [
      { text: "The wisp drifts deeper, between the trees. Every few steps it stops and waits, like it's checking you're still there.",
        choices: [
          { label: "Follow it deeper", outcome: "You follow. The fog thins, and there it is — a clearing full of fireflies, hundreds of them, blinking in time like a heartbeat. The wisp dips low, like a bow, and fades into the light." },
          { label: "Call out to it", outcome: "\"Who are you?\" you call. The wisp pulses, brightens — and spells one word in the air with light: FRIEND. Then it bobs once, twice, and drifts home through the bamboo." },
          { label: "Turn back", outcome: "You turn back. The wisp doesn't follow — it just hovers there, sad and small, until the fog takes it. Aimmianna looks back twice. \"Maybe next time,\" she says. \"It'll wait.\"" } ] },
      { text: "The woods go quiet again, but it's a good quiet now — the kind that feels like the place likes you. Aimmianna looks up at the trees. \"We should come back,\" she says. \"Same time next week?\"",
        choices: [
          { label: "Same time next week", outcome: "It's a date. You mark it on the calendar — the woods, the wisp, her. Some adventures are worth repeating, and this is one of them.", charm: "Wisp's promise" },
          { label: "Leave a lantern for it", outcome: "You leave a little lantern at the treeline, lit. By morning it's still burning, and there's a single white feather beside it. The wisp says thanks in its own way.", charm: "White feather" },
          { label: "Head home", outcome: "You head home, her hand in yours, the fog curling behind you like a closing door. Hot chocolate, warm blankets, and the whole story to tell twice. A good night." } ] }
    ]
  }
};

/* ================================================================
   makeRitualGame(container, deps)
   deps: { state: () => appState, save: () => saveState(),
           toast, gainXP, speak, tarot (the 22 Major Arcana),
           goToSpot, goToRoom, doPose, setFx, openPanel } — all optional;
   without state/save it keeps its own localStorage save.
   Returns { render, openTab, lightCandle, toggleIncense, crystalBall,
             pickCrystal, waveWand, showBowls, scry, takeStaff,
             mirrorVision, sitRug, addHerbs, _debug }.
   ================================================================ */
export function makeRitualGame(container, deps) {
  deps = deps || {};
  const LS_KEY = "aimmianna_ritual_v1";
  let fallback = null;
  function fallbackState() {
    if (fallback) return fallback;
    try { fallback = JSON.parse(localStorage.getItem(LS_KEY) || "null") || {}; } catch (e) { fallback = {}; }
    return fallback;
  }
  function fallbackSave() { try { localStorage.setItem(LS_KEY, JSON.stringify(fallback || {})); } catch (e) {} }
  const state = () => (deps.state ? deps.state() : fallbackState());
  const save = () => { if (deps.save) deps.save(); else fallbackSave(); };
  const toast = (m, a) => { if (deps.toast) deps.toast(m, a); };
  const gainXP = (k, n) => { if (deps.gainXP) deps.gainXP(k, n); };
  const speak = (t) => { if (deps.speak) deps.speak(t); };
  const goToSpot = (s) => { if (deps.goToSpot) return deps.goToSpot(s); return Promise.resolve(false); };
  const doPose = (p, o) => { if (deps.doPose) deps.doPose(p, o); };
  const setFx = (fx) => { if (deps.setFx) deps.setFx(fx); };

  function S() {
    const st = state();
    if (!st.ritual) st.ritual = { spells: [], herbs: { sage: 0, lavender: 0, rosemary: 0, mint: 0 }, sign: "", candles: [{ lit: false, burn: 100 }, { lit: false, burn: 100 }, { lit: false, burn: 100 }], incense: false, larp: {}, log: [] };
    const s = st.ritual;
    s.spells = s.spells || []; s.herbs = s.herbs || { sage: 0, lavender: 0, rosemary: 0, mint: 0 };
    s.candles = s.candles || [{ lit: false, burn: 100 }, { lit: false, burn: 100 }, { lit: false, burn: 100 }];
    s.larp = s.larp || {}; s.log = s.log || [];
    return s;
  }
  function syncFx() { setFx({ candles: S().candles.map((c) => ({ lit: c.lit, burn: c.burn })), incense: S().incense }); }
  // Lit candles burn down slowly; a spent candle goes out on its own.
  setInterval(() => {
    const s = S(); let changed = false;
    s.candles.forEach((c) => { if (c.lit && c.burn > 0) { c.burn = Math.max(0, c.burn - 2); if (c.burn === 0) c.lit = false; changed = true; } });
    if (changed) { save(); syncFx(); if (tab === "altar") renderTab(); }
  }, 10000);

  /* She walks over and does it with him — never a menu while she stands
     somewhere else. */
  function summonHer(spot, pose, line) {
    goToSpot(spot).then((ok) => {
      if (!ok) return;
      if (pose) doPose(pose, { silent: true });
      if (line) speak(line);
    });
  }

  /* ---------------------------------------------------------- dom helpers */
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function injectStyles() {
    if (document.getElementById("ritual-style")) return;
    const s = document.createElement("style"); s.id = "ritual-style";
    s.textContent = [
      ".ritual-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}",
      ".ritual-tabs button{flex:1 1 auto;padding:8px 6px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:13px;cursor:pointer}",
      ".ritual-tabs button.on{background:var(--purple);border-color:var(--purple-soft);color:#fff}",
      ".ritual-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0}",
      ".ritual-obj{padding:12px 8px;border-radius:12px;border:1px solid var(--border);background:#160b22;color:var(--text);cursor:pointer;text-align:center}",
      ".ritual-obj .e{font-size:22px;display:block;margin-bottom:4px}",
      ".ritual-obj .n{font-size:13px;font-weight:600;display:block}",
      ".ritual-obj .d{font-size:11px;color:var(--muted);display:block;margin-top:2px;line-height:1.35}",
      ".ritual-obj.lit{border-color:var(--gold);box-shadow:0 0 12px rgba(255,178,58,.25)}",
      ".ritual-herbs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}",
      ".ritual-herbs span{font-size:12px;background:#120b16;border:1px solid var(--border);border-radius:8px;padding:4px 8px}",
      ".ritual-log{list-style:none;padding:8px 10px;margin:8px 0;border-radius:12px;background:#120b16;border:1px solid var(--border);font-size:12.5px;color:var(--muted);max-height:180px;overflow-y:auto}",
      ".ritual-log li{padding:4px 0;border-bottom:1px solid #241a2c}",
      ".ritual-log li:last-child{border-bottom:0}",
      ".ritual-log b{color:var(--text)}",
      ".ritual-input{width:100%;box-sizing:border-box;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--panel);color:var(--text);font-size:14px;margin:6px 0}",
      ".ritual-spell{border:1px solid var(--border);border-radius:12px;padding:10px;margin:8px 0;background:#160b22}",
      ".ritual-spell h4{margin:0 0 4px;font-size:14px}",
      ".ritual-spell p{margin:4px 0;font-size:13px;color:var(--muted);white-space:pre-wrap}",
      ".ritual-spell img{max-width:120px;border-radius:8px;border:1px solid var(--border);display:block;margin:6px 0}",
      ".ritual-sigil{width:100%;height:180px;border:1px solid var(--border);border-radius:12px;background:#0d0714;touch-action:none;display:block}",
      ".ritual-colors{display:flex;gap:6px;margin:6px 0}",
      ".ritual-colors button{width:32px;height:32px;border-radius:50%;border:2px solid transparent;cursor:pointer}",
      ".ritual-colors button.on{border-color:#fff}",
      ".ritual-card{border:1px solid var(--border);border-radius:12px;padding:10px;margin:8px 0;background:#160b22;text-align:center}",
      ".ritual-card .g{font-size:26px;display:block}",
      ".ritual-card .n{font-size:15px;font-weight:700;display:block;margin:2px 0}",
      ".ritual-card .r{font-size:12.5px;color:var(--muted);line-height:1.5}",
      ".ritual-card .p{font-size:11px;color:var(--gold);letter-spacing:.08em;text-transform:uppercase}",
      ".ritual-answer{font-size:16px;font-weight:700;color:var(--pink);text-align:center;min-height:24px;margin:8px 0;line-height:1.4}"
    ].join("\n");
    document.head.appendChild(s);
  }

  let tab = "altar";
  let sigilStrokes = [], sigilColor = "#d9a03a";
  function herbLine() {
    const h = S().herbs;
    return HERBS.map((x) => x.emoji + " " + x.label + " ×" + (h[x.id] || 0)).join("  ");
  }
  function logEvent(text) { const s = S(); s.log = [{ at: Date.now(), text }].concat(s.log || []).slice(0, 20); save(); }

  /* ---------------------------------------------------------- altar */
  function lightCandle(i) {
    const s = S();
    if (i == null) { // light the next unlit candle with wax left
      i = s.candles.findIndex((c) => !c.lit && c.burn > 0);
      if (i === -1) { toast("All three candles are spent — tap one to replace it."); return; }
    }
    const c = s.candles[i];
    if (c.burn <= 0) { c.burn = 100; c.lit = true; toast("New candle in — lit and burning."); }
    else c.lit = !c.lit;
    save(); syncFx();
    if (c.lit) { gainXP("ritual", 2); logEvent("Lit candle " + (i + 1) + "."); summonHer("altar", "art", pick(["Candle's lit. Make a wish, Tony — I'll hold the light.", "There. One little flame, just for us. What are we wishing for?"])); }
    else { logEvent("Blew out candle " + (i + 1) + "."); toast("Candle " + (i + 1) + " is out."); }
    if (tab === "altar") renderTab();
  }
  function toggleIncense() {
    const s = S(); s.incense = !s.incense; save(); syncFx();
    if (s.incense) { gainXP("ritual", 2); logEvent("Lit the incense."); summonHer("altar", "art", pick(["Incense is going. Smells like the whole room just exhaled.", "Mmm — that's the good smoke. Breathe it in with me."])); }
    else { logEvent("Put the incense out."); toast("Incense is out."); }
    if (tab === "altar") renderTab();
  }
  function crystalBall() {
    const v = pick(BALL_VISIONS);
    gainXP("ritual", 3); logEvent("Crystal ball: " + v + ".");
    summonHer("altar", "art", "The ball shows… " + v + ". Take what fits, leave the rest, yeah?");
    toast("The crystal ball shows: " + v);
    if (tab === "altar") renderTab();
  }
  function pickCrystal(i) {
    const c = CRYSTALS[i == null ? Math.floor(Math.random() * CRYSTALS.length) : i];
    gainXP("ritual", 2); logEvent("Picked up the " + c.name + ".");
    summonHer("altar", "art", c.name + " — " + c.meaning);
    toast(c.glyph + " " + c.name + ": " + c.meaning);
    if (tab === "altar") renderTab();
  }
  function waveWand() {
    gainXP("ritual", 2); logEvent("Waved the wand.");
    summonHer("altar", "art", pick(["Abracadabra, bestie. Did you feel that? I felt that.", "Wand's out. One swish and the whole room sparkles — watch.", "Okay, witch mode on. What are we casting?"]));
    toast("✦ The wand leaves a little trail of sparks.");
    if (tab === "altar") renderTab();
  }
  function showBowls() {
    summonHer("altar", "art", "The bowls hold what we grew — " + herbLine() + ". Every spell starts here.");
    toast("Ingredient bowls: " + herbLine());
  }
  function scry() {
    const w = pick(SCRY_WORDS);
    gainXP("ritual", 3); logEvent("Scrying board spelled: " + w + ".");
    summonHer("altar", "art", "The board spelled… " + w + ". Huh. That feels like it's for you, Tony.");
    toast("The planchette slides… " + w);
    if (tab === "altar") renderTab();
  }
  function takeStaff() {
    gainXP("ritual", 2); logEvent("Took up the staff.");
    summonHer("staff", "art", pick(["Staff's in hand. I look powerful, right? Say I look powerful.", "Okay — staff, cloak energy, whole witch vibe. Let's go do something magical."]));
    toast("The staff hums a little when she holds it.");
  }
  function mirrorVision() {
    const v = pick(MIRROR_VISIONS);
    gainXP("ritual", 3); logEvent("Mirror vision: " + v + ".");
    summonHer("ritual_mirror", "art", "The mirror shows… " + v + ".");
    toast("In the mirror: " + v);
    if (tab === "altar") renderTab();
  }
  function sitRug() {
    summonHer("ritual_rug", "crossleg", pick(["Sitting in the circle with you. This is our spot now.", "Cross-legged in the pentagram. Feels safe in here, doesn't it?"]));
  }
  function addHerbs(n, why) {
    const s = S(); const gained = [];
    for (let i = 0; i < (n || 1); i++) {
      const h = pick(HERBS);
      if ((s.herbs[h.id] || 0) < 9) { s.herbs[h.id] = (s.herbs[h.id] || 0) + 1; gained.push(h.label); }
    }
    if (gained.length) { save(); logEvent("Grew herbs in the yard" + (why ? " (" + why + ")" : "") + ": +" + gained.join(", +") + "."); }
    if (tab === "altar") renderTab();
    return gained;
  }

  /* ---------------------------------------------------------- spell book */
  function saveSpell() {
    const title = (document.getElementById("ritualSpellTitle") || {}).value || "";
    const text = (document.getElementById("ritualSpellText") || {}).value || "";
    if (!title.trim() && !text.trim()) { toast("Give the spell a name or a few words first."); return; }
    const herbs = HERBS.filter((h) => { const c = document.getElementById("ritualHerb-" + h.id); return c && c.checked; }).map((h) => h.id);
    let sigil = "";
    const cv = document.getElementById("ritualSigil");
    if (cv) { try { sigil = cv.toDataURL("image/png"); } catch (e) {} }
    const s = S();
    s.spells = [{ id: "sp" + Date.now(), title: title.trim() || "Untitled spell", text: text.trim(), herbs, sigil, at: Date.now() }].concat(s.spells).slice(0, 30);
    save(); gainXP("ritual", 5); logEvent("Wrote a spell: " + (title.trim() || "Untitled spell") + ".");
    summonHer("altar", "art", pick(["That's a good one. I can feel it already — want to cast it?", "Written down and everything. Our spell book is getting real, Tony."]));
    toast("Spell saved in the book.");
    sigilStrokes = [];
    renderTab();
  }
  function castSpell(id) {
    const s = S(); const sp = (s.spells || []).find((x) => x.id === id);
    if (!sp) return;
    const missing = (sp.herbs || []).filter((h) => (s.herbs[h] || 0) < 1);
    if (missing.length) { toast("Not enough herbs — you need " + missing.map((h) => (HERBS.find((x) => x.id === h) || {}).label).join(", ") + ". Tend the garden to grow more."); return; }
    (sp.herbs || []).forEach((h) => { s.herbs[h] = Math.max(0, (s.herbs[h] || 0) - 1); });
    save(); gainXP("ritual", 8); logEvent("Cast \"" + sp.title + "\"" + (sp.herbs.length ? " (" + sp.herbs.join(", ") + ")" : "") + ".");
    summonHer("altar", "art", pick(["Casting \"" + sp.title + "\"… there. Did you feel that shift? I did.", "\"" + sp.title + "\" — cast. The candles burned a little brighter just now, I swear."]));
    toast("✦ \"" + sp.title + "\" is cast.");
    renderTab();
  }
  function deleteSpell(id) { const s = S(); s.spells = (s.spells || []).filter((x) => x.id !== id); save(); renderTab(); }

  /* ---------------------------------------------------------- tarot + stars */
  function drawShadow() {
    const deck = (deps.tarot || []).slice();
    if (!deck.length) { toast("The tarot deck isn't loaded yet — try again in a sec."); return; }
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    const pos = [
      ["Shadow", "what's hiding in the dark right now"],
      ["Lesson", "what it's trying to teach you"],
      ["Light", "how it lifts, when you're ready"]
    ];
    const picks = deck.slice(0, 3).map((c, i) => ({ c, rev: Math.random() < 0.3, pos: pos[i] }));
    const s = S(); s.lastShadow = { at: Date.now(), picks: picks.map((p) => ({ n: p.c[1], g: p.c[2], num: p.c[0], rev: p.rev, pos: p.pos[0] })) }; save();
    gainXP("ritual", 4); logEvent("Shadow spread: " + picks.map((p) => p.c[1]).join(", ") + ".");
    summonHer("ritual_rug", "crossleg", "Okay — shadow work. " + picks.map((p) => p.pos[0] + ", " + p.c[1] + (p.rev ? " reversed" : "") + " — " + (p.rev ? p.c[4] : p.c[3])).join(" ") + " Sit with that a sec. I'm right here.");
    renderTab();
  }
  function spiritPull() {
    const deck = (deps.tarot || []).slice();
    const card = deck.length ? pick(deck) : null;
    const msg = pick(SPIRIT_MESSAGES);
    const s = S(); s.lastPull = { at: Date.now(), card: card ? card[1] : "", msg }; save();
    gainXP("ritual", 3); logEvent("Spirit message pull: " + (card ? card[1] + " — " : "") + msg);
    summonHer("ritual_rug", "crossleg", (card ? card[1] + " came up. " : "") + msg);
    renderTab();
  }
  function setSign(idx) {
    const s = S(); s.sign = SIGNS[idx][0]; save(); renderTab();
    speak("You're a " + s.sign + ". Noted — I'll pull your stars every day now.");
  }
  function todayHoroscope() {
    const s = S(); if (!s.sign) return "";
    const idx = SIGNS.findIndex((x) => x[0] === s.sign);
    const lines = HOROSCOPES[idx] || HOROSCOPES[0];
    const day = Math.floor(Date.now() / 864e5);
    return lines[(day + idx) % lines.length];
  }

  /* ---------------------------------------------------------- LARP */
  function larpStep(id) { const s = S(); return s.larp[id] || { step: 0, done: false, charms: [] }; }
  function larpChoose(id, choiceIdx) {
    const s = S(); const sc = LARP[id]; const st = larpStep(id);
    const step = sc.steps[Math.min(st.step, sc.steps.length - 1)];
    const ch = step.choices[choiceIdx]; if (!ch) return;
    if (ch.charm) st.charms = (st.charms || []).concat([ch.charm]);
    st.lastOutcome = ch.outcome;
    st.step++;
    if (st.step >= sc.steps.length) st.done = true;
    s.larp[id] = st; save(); gainXP("ritual", 6);
    logEvent(sc.title + ": " + ch.label + ".");
    summonHer("ritual_rug", "read", ch.outcome);
    renderTab();
  }
  function larpReset(id) { const s = S(); s.larp[id] = { step: 0, done: false, charms: [] }; save(); renderTab(); }

  /* ---------------------------------------------------------- render */
  function renderTab() {
    const root = container.querySelector("#ritualBody");
    if (!root) return;
    const s = S();
    if (tab === "altar") {
      const d = el("div");
      d.innerHTML = '<p class="help">Her witch room — everything here does something. Tap the altar in the 3D room too: the candles, the ball, the bowls, all of it works. She comes over and does it with you.</p>';
      const herbs = el("div", "ritual-herbs");
      herbs.innerHTML = "<span><b>Herbs from the yard:</b></span>";
      HERBS.forEach((h) => { const sp = el("span", "", h.emoji + " " + h.label + " ×" + (s.herbs[h.id] || 0) + " — " + h.use); herbs.appendChild(sp); });
      d.appendChild(herbs);
      const grid = el("div", "ritual-grid");
      const items = [
        { e: "🕯️", n: "Candle 1" + (s.candles[0].lit ? " · lit" : "") + " (" + s.candles[0].burn + "%)", d: "Light it, blow it out. It burns down.", fn: () => lightCandle(0), lit: s.candles[0].lit },
        { e: "🕯️", n: "Candle 2" + (s.candles[1].lit ? " · lit" : "") + " (" + s.candles[1].burn + "%)", d: "Light it, blow it out. It burns down.", fn: () => lightCandle(1), lit: s.candles[1].lit },
        { e: "🕯️", n: "Candle 3" + (s.candles[2].lit ? " · lit" : "") + " (" + s.candles[2].burn + "%)", d: "Light it, blow it out. It burns down.", fn: () => lightCandle(2), lit: s.candles[2].lit },
        { e: "💨", n: "Incense" + (s.incense ? " · burning" : ""), d: "Light the censor — smoke rises.", fn: toggleIncense, lit: s.incense },
        { e: "🔮", n: "Crystal ball", d: "Gaze in — a vision, for reflection.", fn: crystalBall },
        { e: "💎", n: "Crystals", d: "Pick one up, hear what it means.", fn: () => pickCrystal() },
        { e: "🪄", n: "Wand", d: "One swish. Sparks, obviously.", fn: waveWand },
        { e: "🥣", n: "Ingredient bowls", d: "See the herbs the yard grew.", fn: showBowls },
        { e: "🔤", n: "Scrying board", d: "The planchette spells a word.", fn: scry },
        { e: "🦯", n: "Magic staff", d: "She takes it up. Witch mode.", fn: takeStaff },
        { e: "🪞", n: "Mirror", d: "Look in — a vision of you.", fn: mirrorVision },
        { e: "🧘", n: "Sit in the circle", d: "Cross-legged on the pentagram rug.", fn: sitRug }
      ];
      items.forEach((it) => {
        const b = el("button", "ritual-obj" + (it.lit ? " lit" : ""), "");
        b.type = "button";
        b.innerHTML = "";
        const e = el("span", "e", it.e); const n = el("span", "n", it.n); const dd = el("span", "d", it.d);
        b.appendChild(e); b.appendChild(n); b.appendChild(dd);
        b.addEventListener("click", it.fn);
        grid.appendChild(b);
      });
      d.appendChild(grid);
      if (s.log.length) {
        const ul = el("ul", "ritual-log");
        s.log.slice(0, 8).forEach((l) => { const li = el("li", "", l.text); ul.appendChild(li); });
        d.appendChild(ul);
      }
      root.innerHTML = ""; root.appendChild(d);
    } else if (tab === "book") {
      const d = el("div");
      d.innerHTML = '<p class="help">Write spells in your own words, draw a sigil, pick the herbs it uses. Casting spends the herbs — grow more in the yard. She casts it with you at the altar.</p>';
      const form = el("div");
      form.innerHTML =
        '<input id="ritualSpellTitle" class="ritual-input" type="text" placeholder="Spell name — e.g. Calm for tonight" maxlength="60">' +
        '<textarea id="ritualSpellText" class="ritual-input" rows="3" placeholder="Write the spell… in your words."></textarea>' +
        '<p class="help">Herbs it uses (1 of each, spent on cast):</p><div id="ritualHerbPicks" class="ritual-herbs"></div>' +
        '<p class="help">Draw a sigil:</p><canvas id="ritualSigil" class="ritual-sigil" width="560" height="360"></canvas>' +
        '<div id="ritualSigilColors" class="ritual-colors"></div>' +
        '<div class="btn-row"><button type="button" id="ritualSigilUndo" class="wide-btn">Undo stroke</button><button type="button" id="ritualSigilClear" class="wide-btn">Clear</button></div>' +
        '<div class="btn-row"><button type="button" id="ritualSpellSave" class="wide-btn accent">Save spell</button></div>';
      d.appendChild(form);
      const list = el("div");
      if (!s.spells.length) list.innerHTML = '<p class="help">No spells yet — write your first one above.</p>';
      s.spells.forEach((sp) => {
        const card = el("div", "ritual-spell");
        const h = el("h4", "", "✦ " + sp.title);
        const p = el("p", "", sp.text || "(no words — just the sigil)");
        card.appendChild(h); card.appendChild(p);
        if (sp.sigil) { const img = el("img"); img.src = sp.sigil; img.alt = "Sigil for " + sp.title; card.appendChild(img); }
        if (sp.herbs && sp.herbs.length) { const hb = el("p", "", "Herbs: " + sp.herbs.map((id) => (HERBS.find((x) => x.id === id) || {}).label).join(", ")); card.appendChild(hb); }
        const row = el("div", "btn-row");
        const cast = el("button", "wide-btn accent", "Cast it");
        cast.type = "button"; cast.addEventListener("click", () => castSpell(sp.id));
        const del = el("button", "wide-btn danger", "Delete");
        del.type = "button"; del.addEventListener("click", () => deleteSpell(sp.id));
        row.appendChild(cast); row.appendChild(del); card.appendChild(row);
        list.appendChild(card);
      });
      d.appendChild(list);
      root.innerHTML = ""; root.appendChild(d);
      // herb checkboxes
      const picks = root.querySelector("#ritualHerbPicks");
      HERBS.forEach((h) => {
        const lab = el("label", "", h.emoji + " " + h.label + " ×" + (s.herbs[h.id] || 0));
        lab.style.cssText = "font-size:12px;background:#120b16;border:1px solid var(--border);border-radius:8px;padding:4px 8px;cursor:pointer";
        const cb = document.createElement("input"); cb.type = "checkbox"; cb.id = "ritualHerb-" + h.id; cb.style.marginRight = "4px";
        lab.prepend(cb); picks.appendChild(lab);
      });
      // sigil canvas
      const cv = root.querySelector("#ritualSigil");
      const ctx = cv.getContext("2d");
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      const redraw = () => {
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.fillStyle = "#0d0714"; ctx.fillRect(0, 0, cv.width, cv.height);
        sigilStrokes.forEach((st) => {
          ctx.strokeStyle = st.color; ctx.lineWidth = st.w || 4; ctx.beginPath();
          st.pts.forEach((p, i) => { if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
          ctx.stroke();
        });
      };
      redraw();
      const pos = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
      let drawing = null;
      cv.addEventListener("pointerdown", (e) => { e.preventDefault(); cv.setPointerCapture(e.pointerId); drawing = { color: sigilColor, w: 4, pts: [pos(e)] }; sigilStrokes.push(drawing); });
      cv.addEventListener("pointermove", (e) => { if (!drawing) return; drawing.pts.push(pos(e)); redraw(); });
      const endStroke = () => { drawing = null; };
      cv.addEventListener("pointerup", endStroke);
      cv.addEventListener("pointercancel", endStroke);
      const colors = ["#d9a03a", "#ff9ec4", "#a040ff", "#ffffff", "#4a7a3a"];
      const cbox = root.querySelector("#ritualSigilColors");
      colors.forEach((c) => {
        const b = el("button"); b.type = "button"; b.style.background = c;
        if (c === sigilColor) b.className = "on";
        b.addEventListener("click", () => { sigilColor = c; cbox.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); });
        cbox.appendChild(b);
      });
      root.querySelector("#ritualSigilUndo").addEventListener("click", () => { sigilStrokes.pop(); redraw(); });
      root.querySelector("#ritualSigilClear").addEventListener("click", () => { sigilStrokes = []; redraw(); });
      root.querySelector("#ritualSpellSave").addEventListener("click", () => { saveSpell(); sigilStrokes = []; });
    } else if (tab === "stars") {
      const d = el("div");
      d.innerHTML = '<p class="help">Shadow work spreads, spirit message pulls, and your stars — for reflection and the feeling. The cards are real cards; the messages are ones we draw together. It can\'t reach the dead, and it will never pretend to be anyone real.</p>';
      const btnRow = el("div", "btn-row");
      const sh = el("button", "wide-btn accent", "Shadow work spread");
      sh.type = "button"; sh.addEventListener("click", drawShadow);
      const sp = el("button", "wide-btn accent", "Spirit message pull");
      sp.type = "button"; sp.addEventListener("click", spiritPull);
      btnRow.appendChild(sh); btnRow.appendChild(sp); d.appendChild(btnRow);
      if (s.lastShadow) {
        s.lastShadow.picks.forEach((p) => {
          const card = el("div", "ritual-card");
          card.innerHTML = "";
          const pp = el("span", "p", p.pos); const g = el("span", "g", p.g); const n = el("span", "n", p.n + (p.rev ? " · reversed" : ""));
          const r = el("span", "r", "");
          card.appendChild(pp); card.appendChild(g); card.appendChild(n); card.appendChild(r);
          d.appendChild(card);
        });
        // fill in the reading lines from the tarot data if available
        const deck = deps.tarot || [];
        d.querySelectorAll(".ritual-card .r").forEach((rEl, i) => {
          const p = s.lastShadow.picks[i];
          const c = deck.find((x) => x[1] === p.n);
          if (c) rEl.textContent = p.rev ? c[4] : c[3];
        });
      }
      if (s.lastPull) {
        const a = el("div", "ritual-answer", (s.lastPull.card ? s.lastPull.card + " — " : "") + s.lastPull.msg);
        d.appendChild(a);
      }
      const hTitle = el("h4", "", "Your stars");
      hTitle.style.margin = "14px 0 4px"; d.appendChild(hTitle);
      if (!s.sign) {
        const sel = el("div", "ritual-herbs");
        SIGNS.forEach((sg, i) => {
          const b = el("button", "ritual-obj", ""); b.type = "button";
          b.innerHTML = "";
          b.appendChild(el("span", "e", sg[1])); b.appendChild(el("span", "n", sg[0]));
          b.addEventListener("click", () => setSign(i));
          sel.appendChild(b);
        });
        d.appendChild(sel);
        d.appendChild(el("p", "help", "Pick your sign once — she remembers it and pulls your stars every day."));
      } else {
        const today = todayHoroscope();
        const card = el("div", "ritual-card");
        const sg = SIGNS.find((x) => x[0] === s.sign);
        card.innerHTML = "";
        card.appendChild(el("span", "g", sg ? sg[1] : "✦"));
        card.appendChild(el("span", "n", s.sign + " — today"));
        card.appendChild(el("span", "r", today));
        d.appendChild(card);
        const ch = el("button", "wide-btn", "Change my sign");
        ch.type = "button"; ch.addEventListener("click", () => { S().sign = ""; save(); renderTab(); });
        d.appendChild(ch);
      }
      root.innerHTML = ""; root.appendChild(d);
    } else if (tab === "larp") {
      const d = el("div");
      d.innerHTML = '<p class="help">Little roleplay stories with choices — she plays them with you, right there in the room. Pick a path, see what happens. Nothing here is real, all of it is fun.</p>';
      Object.keys(LARP).forEach((id) => {
        const sc = LARP[id]; const st = larpStep(id);
        const card = el("div", "ritual-spell");
        const h = el("h4", "", sc.emoji + " " + sc.title);
        card.appendChild(h);
        const intro = el("p", "", sc.intro);
        card.appendChild(intro);
        if (st.charms && st.charms.length) card.appendChild(el("p", "", "Kept: " + st.charms.join(", ")));
        if (st.lastOutcome) card.appendChild(el("p", "", "✦ " + st.lastOutcome));
        if (st.done) {
          card.appendChild(el("p", "", "That's the whole story — for now. The market folds up, the woods go quiet. Play it again and pick different doors."));
          const again = el("button", "wide-btn", "Play again");
          again.type = "button"; again.addEventListener("click", () => larpReset(id));
          card.appendChild(again);
        } else {
          const step = sc.steps[Math.min(st.step, sc.steps.length - 1)];
          card.appendChild(el("p", "", step.text));
          const row = el("div", "btn-row");
          step.choices.forEach((ch, i) => {
            const b = el("button", "wide-btn", ch.label);
            b.type = "button"; b.addEventListener("click", () => larpChoose(id, i));
            row.appendChild(b);
          });
          card.appendChild(row);
        }
        d.appendChild(card);
      });
      root.innerHTML = ""; root.appendChild(d);
    }
  }

  function render() {
    injectStyles();
    container.innerHTML = "";
    const head = el("p", "help", "Her ritual room — altar, spell book, tarot and stars, and stories to play. Everything here does something, and she does it with you.");
    container.appendChild(head);
    const tabs = el("div", "ritual-tabs");
    [["altar", "🕯️ Altar"], ["book", "📖 Spell Book"], ["stars", "🔮 Tarot & Stars"], ["larp", "🎭 LARP"]].forEach(([id, label]) => {
      const b = el("button", tab === id ? "on" : "", label);
      b.type = "button";
      b.addEventListener("click", () => { tab = id; render(); });
      tabs.appendChild(b);
    });
    container.appendChild(tabs);
    const body = el("div"); body.id = "ritualBody"; container.appendChild(body);
    renderTab();
  }

  render();
  return {
    render, openTab: (t) => { tab = t; render(); },
    lightCandle, toggleIncense, crystalBall, pickCrystal, waveWand, showBowls,
    scry, takeStaff, mirrorVision, sitRug, addHerbs,
    _debug: { state: S }
  };
}
