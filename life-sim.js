import { SKILLS, OUTFITS, TONY_HOODIES, TONY_CHAINS, UPGRADES, MARKET_MODELS, MARKET_COLORS, loadLife, skillLevel, nextLevelAt, reward, buy, currentJob, videoUrl, moveGameCash, centsFromInput, placeMarketItem } from "./life-rules.js";
import { makeLifeFigures } from "./life-figures.js";
import { lessonFor } from "./life-lessons.js";
import { STORIES } from "./life-stories.js";
import { PROJECT_DRILLS, PROJECT_TYPES, newProject, cleanProject, projectAmount, projectMath, CREATOR_STEPS, parseAnimationSpeed, SKIT_BEATS, cleanSkit } from "./life-projects.js";
import { makeSignalRadio } from "./life-signals.js";
import { makeSignalCamera } from "./life-signal-camera.js";
import { SIGNAL_SESSION_LIMIT, SIGNAL_MARK_LIMIT, loadSignalSessions, startSignalSession, addSignalField, sessionSummary } from "./life-signal-sessions.js";

const TABS = { home: "Home", jobs: "Jobs", study: "Study", together: "Together", wardrobe: "My Wardrobe", shop: "Upgrades", routine: "Dinner & routines", stories: "Story Shelf", yard: "Yard & DIY", bank: "Shared Piggy Bank" };
const YARD_GIGS = [
  { name: "Tidy the yard", steps: ["Pick up branches", "Rake the path", "Bag the leaves"] },
  { name: "Planter refresh", steps: ["Clear old pots", "Set out seedlings", "Water the planter"] },
  { name: "Bench upkeep", steps: ["Check for loose parts", "Tag the worn slat", "Tidy the work area"] },
];
const PROJECT_IDEAS = ["Plan a low-maintenance container garden", "Make a seasonal yard cleanup checklist", "How do I tell if an outdoor bench needs repair?"];
const MAJOR = [
  ["The Fool", "What would you try if being a beginner didn’t bother you?"],
  ["The Magician", "Which tool or ability do you already have but underuse?"],
  ["The High Priestess", "What do you notice when you stop looking for an answer?"],
  ["The Empress", "What could use more care rather than more effort?"],
  ["The Emperor", "Where would a clear boundary make things easier?"],
  ["The Hierophant", "Which tradition would you keep, and which would you change?"],
  ["The Lovers", "Which choice feels closest to your values right now?"],
  ["The Chariot", "What one direction is worth committing to this week?"],
  ["Strength", "When has patience worked better for you than pushing harder?"],
  ["The Hermit", "What do you want to hear when you finally get a quiet moment?"],
  ["Wheel of Fortune", "What can you influence even when the timing is out of your hands?"],
  ["Justice", "What would a fair outcome look like to both people?"],
  ["The Hanged Man", "What looks different if you stop trying to solve it the usual way?"],
  ["Death", "What are you ready to let end so something new has room?"],
  ["Temperance", "Which two things need more balance in your life?"],
  ["The Devil", "Which habit feels good in the moment but costs you more later?"],
  ["The Tower", "If your current plan fell apart, what would you keep from it?"],
  ["The Star", "What gives you hope that isn’t tied to an outcome?"],
  ["The Moon", "What can you verify before acting on a gut feeling?"],
  ["The Sun", "What small win deserves more credit than you gave it?"],
  ["Judgement", "Which old belief about yourself are you ready to rethink?"],
  ["The World", "What have you finished that you haven’t taken time to celebrate?"],
];
const FIELD = [
  { name: "The empty hallway", clues: "A repeating buzz is loudest near the fuse box. It stops with the breaker off.", options: ["Wiring hum", "Moving shadow", "Cold draft"], key: 0 },
  { name: "The living-room window", clues: "The curtain moves when the door opens. A cold patch follows the edge of the frame.", options: ["Wiring hum", "Light reflection", "Cold draft"], key: 2 },
  { name: "The midnight silhouette", clues: "The shape appears in glass only when a car passes. It vanishes when the blind goes down.", options: ["Cold draft", "Light reflection", "Wiring hum"], key: 1 },
  { name: "Three knocks upstairs", clues: "The knocks follow each burst of hot water. The noise is loudest against the pipe wall.", options: ["Pipe expansion", "Cold draft", "Light reflection"], key: 0 },
  { name: "The note that moved", clues: "The paper slides each time the fan oscillates. Turning the fan off keeps it in place.", options: ["Hot pipe", "Loose floorboard", "Airflow"], key: 2 },
  { name: "The face in the mirror", clues: "A face-like pattern stays still and breaks into separate objects when viewed from the side.", options: ["Electrical noise", "Object alignment", "Floor vibration"], key: 1 },
];
const CHECKINS = [
  { line: "Aimmianna: Want to do something together or do you need some quiet?", choices: ["Make a plan together", "Ask about her day", "Share a quiet minute"] },
  { line: "Aimmianna: If we could make this apartment feel a little more like ours, where would you start?", choices: ["A better movie corner", "A cozy study space", "Room for our hobbies"] },
  { line: "Aimmianna: I keep thinking about what I’d learn if I had a whole evening free.", choices: ["Work on a creative project", "Study something practical", "Make it a game night"] },
  { line: "Aimmianna: What counts as a good day for you lately?", choices: ["Finishing one useful thing", "Making time for each other", "Getting some rest"] },
  { line: "Aimmianna: It’s late. We don’t have to solve everything tonight.", choices: ["Pick one thing for tomorrow", "Talk it out a little", "Call it a night"] },
];
const rankText = (id, n) => id === "bond" ? `Game bond Lv ${n}` : `${SKILLS[id]} Lv ${n}`;
const cardLabel = (n) => ({ 1: "Ace", 11: "Jack", 12: "Queen", 13: "King" })[n] || String(n);
const shuffle = (input) => {
  const out = [...input];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

function deviceSave() {
  const native = window.AimmiannaLifeSave, pending = new Map();
  if (!native && !window.AimmiannaNative) return async (action, data) => {
    const key = action.endsWith("-sessions") ? "aimmianna_companion_signal_sessions_v1" : "aimmianna_companion_life_v1";
    try {
      if (action.startsWith("read")) return { ok: true, data: localStorage.getItem(key) || "" };
      if (action.startsWith("write")) { localStorage.setItem(key, data); return { ok: true }; }
    } catch { /* Don’t overwrite anything if device storage is unavailable. */ }
    return { ok: false };
  };
  let seq = 0;
  if (native) native.onmessage = (event) => {
    try {
      const r = JSON.parse(event.data);
      pending.get(r.id)?.(r);
    } catch { /* timed-out or malformed response */ }
  };
  return (action, data) => {
    if (!native) return Promise.resolve({ ok: false });
    return new Promise((resolve) => {
      const id = ++seq;
      const done = (result) => { clearTimeout(timer); pending.delete(id); resolve(result); };
      const timer = setTimeout(() => done({ ok: false }), 2500);
      pending.set(id, done);
      try { native.postMessage(JSON.stringify({ id, action, data })); }
      catch { done({ ok: false }); }
    });
  };
}

export async function makeLifeSim({ world, openPanel, closePanel, openExternal, openPractice, readCompanionBond, shareGameMoment, addRealReminder, researchProject, onEnter, onExit }) {
  const mount = document.getElementById("lifeBody"), hud = document.getElementById("lifeHud");
  const compact = document.getElementById("lifeHudSummary"), status = document.getElementById("lifeNotice");
  const storage = deviceSave(), initial = await storage("read");
  const canWrite = !!initial.ok; // Never overwrite a save if it failed to load.
  let storageOK = canWrite;
  const state = loadLife(initial.data);
  const figures = makeLifeFigures(world.THREE);
  let active = false, tab = "home", pending = null, study = null, field = null, cards = null, tarot = null, checkin = true, movieTitle = "", movieLink = "";
  let ticker = null, note = "", seat = false, takeawayDraft = "", momentDraft = "", reflectionDraft = "", dinnerScene = false;
  let routineKind = "Dinner", realDate = "", realTime = "";
  let selectedStory = "", yardProgress = null, projectDraft = "";
  let research = null, researchId = 0, jarAmount = "", goalAmount = "", paidLabel = "", paidAmount = "";
  let marketName = "", marketIndex = 0, marketColor = 0;
  let labForm = null, labResult = null, drillFeedback = {};
  let creatorIndex = null, creatorDrafts = {};
  let animationDraft = "const speed = 45;";
  let skitDraft = null, stopSkit = null;
  let radio = null, radioReady = false, radioError = false, radioVolume = 28, signalGuess = null;
  let sessionState = "loading", sessions = [], signalSession = null, sessionBusy = false, sessionNotice = "", showSessions = false;
  const signalCamera = makeSignalCamera(markSignalMoment);
  storage("read-sessions").then((result) => {
    try {
      if (!result.ok) throw new Error("Session storage unavailable");
      sessions = loadSignalSessions(result.data);
      sessionState = "ready";
    } catch { sessionState = "unavailable"; }
    if (active && tab === "together") render();
  });
  const magnetic = window.AimmiannaSignalSensor;
  const browserMotion = !window.AimmiannaNative && typeof window.DeviceMotionEvent === "function";
  let motionListener = null;
  let sensorId = 0, sensorSequence = 0, sensorTimer = null, sensorField = null, sensorError = "";
  let motionId = 0, motionTimer = null, motionError = "", tiltAvailable = null, spinAvailable = null;
  let radioTilt = 0, radioSweep = 0, radioPeak = false;
  const el = (tag, value, cls) => {
    const n = document.createElement(tag); if (value !== undefined) n.textContent = value; if (cls) n.className = cls; return n;
  };
  function save() {
    if (canWrite) storage("write", JSON.stringify(state)).then((r) => {
      storageOK = !!r.ok;
      if (!storageOK && active) report(note);
    });
    figures.look(state); updateHud();
  }
  function updateHud() { compact.textContent = `${state.player.name} · ${state.cash.toLocaleString()} cash · Bond ${skillLevel(state, "bond")}`; }
  function report(value) {
    note = value; status.textContent = note;
    const panelNotice = document.getElementById("lifePanelNotice");
    if (panelNotice) panelNotice.textContent = `${storageOK ? "" : "Local saving is unavailable. "}${note}`;
  }
  function award(params) { report(reward(state, params)); save(); }
  function button(text, action, { primary = false, disabled = false } = {}) {
    const b = el("button", text, primary ? "life-button primary" : "life-button"); b.type = "button"; b.disabled = disabled;
    b.addEventListener("click", action); return b;
  }
  function section(parent, title, detail) {
    const block = el("section", undefined, "life-card");
    block.append(el("h3", title));
    if (detail) block.append(el("p", detail, "life-detail"));
    parent.append(block); return block;
  }
  function group(parent, ...items) { const n = el("div", undefined, "life-actions"); n.append(...items); parent.append(n); return n; }
  function open(which = "home") {
    if (!active) return;
    if (which !== "together") { signalCamera.close(); stopSignals(); }
    tab = Object.hasOwn(TABS, which) || which === "lab" ? which : "home";
    render(); openPanel("lifeSection");
  }
  function enter() {
    if (active) return open();
    if (!onEnter()) return;
    active = true; note = ""; seat = false;
    document.body.classList.add("life-active");
    hud.hidden = false;
    figures.look(state); world.enterLife(figures); world.goToSpot("living_center");
    updateHud(); report("Tap the floor to walk. Tap furniture to use it.");
    ticker = setInterval(studyTick, 250);
    open(state.player.name === "Me" && !state.jobs ? "wardrobe" : "home");
  }
  function leave() {
    if (!active) return;
    signalCamera.close(); stopSignals(); signalGuess = null; radioError = false;
    active = false; pending = null; study = null; field = null; cards = null; tarot = null; seat = false; checkin = true; dinnerScene = false; selectedStory = ""; yardProgress = null;
    research = null; researchId++; projectDraft = ""; jarAmount = ""; goalAmount = ""; paidLabel = ""; paidAmount = "";
    marketName = ""; marketIndex = 0; marketColor = 0;
    labForm = null; labResult = null; drillFeedback = {};
    creatorIndex = null; creatorDrafts = {};
    animationDraft = "const speed = 45;";
    skitDraft = null; stopSkit?.(); stopSkit = null;
    clearInterval(ticker); ticker = null;
    hud.hidden = true;
    document.body.classList.remove("life-active");
    closePanel(); world.leaveLife(); onExit();
  }
  function walk(spot, companion = false) {
    if (study) {
      study = null; report("Study canceled when you left the desk.");
    }
    if (companion) world.goToSpot(spot);
    world.moveLifeToSpot(spot);
  }
  function walkRoom(value) {
    const spots = { bedroom: "bedroom_center", living: "living_center", kitchen: "kitchen_table", bathroom: "bath_center", yard: "yard_center" };
    if (spots[value]) walk(spots[value]);
  }
  function focusArea(which, spot, companion = false) { walk(spot, companion); open(which); }
  function hit(name, info) {
    if (!active) return false;
    const mapped = {
      her: ["together", "living_center"], tv: ["together", "couch"], couch: ["together", "couch"],
      pc: ["study", "pc"], vanity: ["wardrobe", "vanity"], phone: ["jobs", "bedside"], nightstand: ["jobs", "bedside"],
      coffee: ["jobs", "coffee"], counter: ["routine", "kitchen_table"], fridge: ["routine", "kitchen_table"], microwave: ["routine", "kitchen_table"],
      yard_work: ["yard", "yard_center"],
    };
    if (name === "floor" && info?.point) {
      if (study) { study = null; report("Study canceled when you left the desk."); }
      closePanel(); world.moveLifePlayer(info.point.x, info.point.z);
    } else if (Object.hasOwn(mapped, name)) {
      const [which, spot] = mapped[name];
      if (name === "tv" || name === "couch") seat = true;
      focusArea(which, spot, which === "together");
    } else if (name === "bed" || name === "sink" || name === "bathtub") {
      closePanel(); walk(name === "bed" ? "bedside" : "bath_center");
    }
    return true;
  }
  function focusSelection(title, options, current, choose) {
    const label = el("label", title), select = el("select");
    options.forEach((name, i) => { const op = el("option", name); op.value = String(i); select.append(op); });
    select.value = String(current);
    select.addEventListener("change", () => choose(Number(select.value)));
    label.append(select); return label;
  }
  function wardrobe(parent) {
    const b = section(parent, "Create your avatar", "Your Tripo 3D model is your character here once it loads. The choices below shape the built-in character instead.");
    const form = el("form", undefined, "life-fields");
    const name = el("label", "Display name"), input = el("input"); input.type = "text"; input.maxLength = 24; input.value = state.player.name; name.append(input);
    function rename() { state.player.name = input.value.trim().slice(0, 24) || "Me"; input.value = state.player.name; save(); }
    input.addEventListener("change", rename);
    form.append(name,
      focusSelection("Skin tone", ["Porcelain", "Fair", "Tan", "Golden", "Brown", "Deep"], state.player.skin, (i) => { state.player.skin = i; save(); }),
      focusSelection("Hair color", ["Espresso", "Chestnut", "Black", "Blond", "Auburn"], state.player.hair, (i) => { state.player.hair = i; save(); }),
      focusSelection("Hair style", ["Side swept", "Close crop", "Shoulder length"], state.player.style, (i) => { state.player.style = i; save(); }));
    form.addEventListener("submit", (e) => { e.preventDefault(); rename(); });
    b.append(form);
    group(b, button("See my avatar", () => { rename(); closePanel(); }, { primary: true }));
    // Tony's own wardrobe, for his Tripo 3D figure — hoodie colours and
    // chains, in his style. Plain words, no game cash: it's his look.
    const tony = section(parent, "Your 3D figure — Tony's wardrobe", "Your Tripo model wears these in the apartment. A hoodie colour washes over the whole figure, since his model is one piece — pants and boots need a new model made for that.");
    for (const h of TONY_HOODIES) {
      const equipped = (state.tonyStyle.hoodie || "black") === h.id;
      row(tony, h.label, equipped ? "Wearing now" : "Hoodie colour for your figure",
        button(equipped ? "Wearing" : "Wear it", () => { state.tonyStyle.hoodie = h.id; save(); report(`You're wearing the ${h.label.toLowerCase()}.`); render(); }, { disabled: equipped }),
        `#${h.solid.toString(16).padStart(6, "0")}`);
    }
    for (const c of TONY_CHAINS) {
      const equipped = (state.tonyStyle.chain || "none") === c.id;
      const detail = equipped ? "Wearing now"
        : c.id === "cross" ? "A gothic necklace with a cross charm"
        : c.id === "both" ? "Silver chain, with the gothic cross underneath"
        : c.id === "chain" ? "A silver chain across the chest" : "Nothing around your neck";
      row(tony, c.label, detail,
        button(equipped ? "Wearing" : "Wear it", () => { state.tonyStyle.chain = c.id; save(); report(c.id === "none" ? "Chain off." : `You're wearing the ${c.label.toLowerCase()}.`); render(); }, { disabled: equipped }));
    }
    const list = section(parent, "My game wardrobe", "Clothes earned here only show on your character.");
    for (const [id, item] of Object.entries(OUTFITS)) {
      const owned = state.owned.includes(id), equipped = state.outfit === id, gated = item.needs && skillLevel(state, item.needs[0]) < item.needs[1];
      row(list, item.name, equipped ? "Wearing now" : owned ? "Owned" : gated ? `Needs ${rankText(...item.needs)}` : `${item.cost} game cash`,
        button(equipped ? "Equipped" : owned ? "Equip" : `Buy · ${item.cost}`, () => {
          if (!owned && !buy(state, id, "outfit")) return;
          state.outfit = id; save(); report(`You equipped ${item.name}.`); render();
        }, { disabled: equipped || (!owned && (gated || state.cash < item.cost)) }),
        `#${item.color.toString(16).padStart(6, "0")}`);
    }
  }
  function row(parent, title, detail, action, color) {
    const item = el("div", undefined, "life-row");
    if (color) { const swatch = el("span", undefined, "life-swatch"); swatch.style.backgroundColor = color; item.append(swatch); }
    const text = el("div"); text.append(el("strong", title), el("small", detail)); item.append(text);
    if (action) item.append(action); parent.append(item);
  }
  function home(parent) {
    const b = section(parent, "Your apartment", "Tap the floor to walk. Use the PC to study, the TV for movie night, the phone for gigs, and the kitchen for dinner.");
    group(b, button("Explore apartment", closePanel, { primary: true }),
      button("Get a job", () => open("jobs")), button("Spend time together", () => open("together")),
      button("Open dinner", () => focusArea("routine", "kitchen_table", true)),
      button("Browse stories", () => focusArea("stories", "couch", true)),
      button("Head outside", () => focusArea("yard", "yard_center")), button("Open piggy bank", () => open("bank")),
      button("Project Lab", () => focusArea("lab", "pc")));
    const p = section(parent, "Progress", `${state.jobs} completed gigs · ${state.moments} shared moments · ${state.lessons} practical lessons · ${state.movieNights} movie nights`);
    for (const id of [...Object.keys(SKILLS), "bond"]) {
      const xp = id === "bond" ? state.bond : state.xp[id];
      const meter = el("progress"); meter.max = nextLevelAt(state, id); meter.value = xp; meter.setAttribute("aria-label", rankText(id, skillLevel(state, id)));
      row(p, rankText(id, skillLevel(state, id)), `${xp} / ${meter.max} total ${id === "bond" ? "bond points" : "XP"}`, meter);
    }
    const history = section(parent, "Recent activity", state.notes.length ? "" : "Complete a gig or spend time together to start the log.");
    for (const n of state.notes) history.append(el("p", n, "life-detail"));
  }
  function startJob(rush) {
    const job = currentJob(state, rush);
    pending = { job, index: 0, choices: shuffle(job.order), message: "", key: state.jobs };
    walk(job.spot, job.skill === "home"); render();
  }
  function jobStep(name) {
    if (!pending || pending.key !== state.jobs) return;
    const { job, index } = pending;
    if (name !== job.order[index]) { pending.message = "Not that step yet. Try another; you haven’t lost any progress."; render(); return; }
    if (++pending.index === job.order.length) {
      pending = null; state.jobs++; if (job.skill === "home") state.moments++;
      award({ label: `${job.name} finished`, cash: job.cash, skill: job.skill, xp: 12, bond: job.skill === "home" ? 3 : 0 });
    } else pending.message = `Done: ${name}.`;
    render();
  }
  function jobs(parent) {
    const job = pending?.job || currentJob(state);
    const b = section(parent, pending ? job.name : "Job board on your phone",
      pending ? `Shift ${job.rank} · Step ${pending.index + 1} of 3 · ${job.cash} game cash` : `Next: ${job.name} · ${job.cash} game cash · Shift ${job.rank}`);
    if (pending) {
      b.append(el("p", job.clue, "life-detail"));
      if (pending.message) b.append(el("p", pending.message, "life-inline-note"));
      group(b, ...pending.choices.filter((value) => !job.order.slice(0, pending.index).includes(value)).map((name) => button(name, () => jobStep(name), { primary: true })));
      b.append(button("Cancel gig", () => { pending = null; render(); }));
    } else {
      group(b, button("Accept gig", () => startJob(false), { primary: true }),
        ...(state.upgrades.includes("playerPhone") ? [button(`Rush gig · ${currentJob(state, true).cash}`, () => startJob(true))] : []));
      b.append(el("p", "Each gig trains a skill. Finish the rotation and a new shift rank starts.", "life-detail"));
    }
    section(parent, "Your phone", state.upgrades.includes("playerPhone") ? "Upgraded handset · Rush gigs available." : "Starter handset · The upgraded phone opens better-paid Rush gigs.");
    if (state.jobs && !pending) {
      const meal = section(parent, "Dinner at home", "Take a break together or use the game as a cue for a real meal.");
      meal.append(button("Open dinner scene", () => focusArea("routine", "kitchen_table", true)));
    }
  }
  function startStudy(topic) {
    if (study) return;
    const seconds = state.upgrades.includes("computer") ? 16 : 24;
    const next = { topic, remaining: seconds * 1000, mark: performance.now(), arrived: false };
    study = next;
    world.goToSpot("pc");
    world.moveLifeToSpot("pc").then((ok) => {
      if (study !== next) return;
      if (!ok) { study = null; report("Study canceled before reaching the desk."); }
      else { study.arrived = true; study.mark = performance.now(); }
      if (tab === "study" && document.getElementById("lifeSection").classList.contains("active")) render();
    });
    render();
  }
  function studyTick() {
    if (!active || !study) return;
    const now = performance.now();
    if (study.arrived && !document.hidden) study.remaining -= Math.min(now - study.mark, 600);
    study.mark = now;
    if (study.remaining > 0) {
      const timer = document.getElementById("lifeStudyTimer");
      if (timer) timer.textContent = study.arrived ? `${Math.ceil(study.remaining / 1000)} seconds left` : "Walking to the workstation…";
      return;
    }
    const current = study; study = null;
    const id = current.topic === "creative" ? "herArt" : "herTech";
    state.moments++;
    state.xp.tech = Math.min(1e9, state.xp.tech + 10);
    award({ label: "Study session complete (+10 Technology XP)", skill: id, xp: state.upgrades.includes("herComputer") ? 20 : 13, bond: 4 });
    if (tab === "study") render();
  }
  function studyPanel(parent) {
    const lab = section(parent, "Project Lab", "Practice a game budget, price a gig, or test an idea before you spend. Start a separate real-life plan when you’re ready.");
    lab.append(button("Open Project Lab", () => focusArea("lab", "pc"), { primary: true }));
    dailyLesson(parent);
    const b = section(parent, "Study at the computer", "Walk to the desk and stay there to study with Aimmianna. Study XP is fictional; it never trains Gemini or changes her real skills.");
    if (study) {
      const remaining = el("p", study.arrived ? `${Math.ceil(study.remaining / 1000)} seconds left` : "Walking to the workstation…", "life-inline-note");
      remaining.id = "lifeStudyTimer";
      group(b, remaining, button("Cancel study", () => { study = null; render(); }));
    } else group(b, button("Study technology together", () => startStudy("tech"), { primary: true }), button("Practice creative skills", () => startStudy("creative")));
    section(parent, "Workstation upgrades", state.upgrades.includes("computer") ? "Dual-screen workstation installed. Study takes 16 seconds, and advanced workshops are now in the daily rotation." : "Starter computer. Study takes 24 seconds at the desk.");
    diy(parent);
  }
  function projectLab(parent) {
    const intro = section(parent, "Project Lab with Aimmianna", "This is the practice room for making things — and maybe earning from them. Everything here uses pretend money and real learning: try a decision, then use the planner for a real one. Nothing here spends real money or posts anything.");
    group(intro, button("Back to Study", () => open("study")),
      button("Go to private project planner", () => document.getElementById("lifeProjectPlanner")?.scrollIntoView({ block: "start" })));
    creatorTrack(parent);
    for (const drill of PROJECT_DRILLS) {
      const card = section(parent, drill.title, drill.setup);
      card.append(el("p", drill.question, "life-detail"));
      group(card, ...drill.options.map(([choice, feedback], i) => button(choice, () => {
        const solved = i === drill.correct;
        drillFeedback[drill.id] = feedback;
        if (solved && !state.labDone.includes(drill.id)) {
          state.labDone.push(drill.id);
          award({ label: `Project Lab: ${drill.title}`, skill: "home", xp: 8, bond: 2 });
        }
        render();
      })));
      if (drillFeedback[drill.id]) {
        const answer = el("p", `Aimmianna: ${drillFeedback[drill.id]}`, "life-inline-note");
        answer.setAttribute("role", "status"); card.append(answer);
      }
      if (state.labDone.includes(drill.id)) card.append(el("p", "Practiced · first-time XP earned", "life-detail"));
    }
    if (!labForm) editLabPlan(newProject());
    const p = section(parent, "Real-life project planner", "Enter your own USD and time estimates. Save a first step and what you learned. The plan stays on this device and is never copied to search or chat.");
    p.id = "lifeProjectPlanner";
    const types = Object.entries(PROJECT_TYPES);
    const basics = el("div", undefined, "life-fields");
    const usd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
    function inputField(box, title, key, limit, mode, multiline = false) {
      const label = el("label", title, multiline ? "life-lesson-field" : undefined);
      const input = el(multiline ? "textarea" : "input");
      if (multiline) input.rows = 2; else input.type = "text";
      input.maxLength = limit; input.value = labForm[key];
      if (mode) input.inputMode = mode;
      input.addEventListener("input", () => {
        labForm[key] = input.value;
        labResult = null;
        document.getElementById("lifeLabEstimates")?.replaceChildren();
      });
      label.append(input); box.append(label);
    }
    basics.append(focusSelection("Project type", types.map(([, name]) => name), types.findIndex(([id]) => id === labForm.type), (i) => {
      labForm.type = types[i][0]; labResult = null; render();
      document.querySelector("#lifeProjectPlanner select")?.focus();
    }));
    inputField(basics, "Project name", "name", 70);
    p.append(basics);
    inputField(p, labForm.type === "business" ? "What will you offer, and who is it for?" : "What is included, and what isn’t?", "scope", 220, undefined, true);
    inputField(p, labForm.type === "business" ? "First test before spending" : "Smallest next action", "next", 220, undefined, true);
    const budget = el("div", undefined, "life-fields");
    for (const [title, id] of [
      ["Spending limit (USD)", "cap"], ["Materials or supplies (USD)", "materials"],
      ["Other costs or fees (USD)", "other"], ["Reserve to leave untouched (USD)", "reserve"],
      ...(labForm.type === "diy" ? [] : [["Expected payment (USD)", "payment"]]),
    ]) inputField(budget, title, id, 9, "decimal");
    inputField(budget, "Total time in minutes", "minutes", 5, "numeric");
    p.append(budget);
    inputField(p, "What did we learn?", "lesson", 220, undefined, true);
    function checkPlan(store) {
      const values = {};
      for (const key of ["cap", "materials", "other", "reserve", ...(labForm.type === "diy" ? [] : ["payment"])]) {
        const n = projectAmount(labForm[key]);
        if (n === null) { report("Use dollars and cents, such as 12.50, or leave an estimate blank."); return; }
        values[key] = n;
      }
      const minutes = labForm.minutes.trim();
      if (minutes && (!/^\d+$/.test(minutes) || Number(minutes) > 60000)) { report("Enter total time as whole minutes (up to 60,000)."); return; }
      const plan = cleanProject({ ...labForm, ...values, minutes: Number(minutes) });
      if (store && !plan.name) { report("Give the project a name before saving."); return; }
      labResult = { plan, calculated: projectMath(plan) };
      if (store) {
        plan.id ||= globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        if (!state.labPlans.some((item) => item.id === plan.id) && state.labPlans.length >= 8) {
          report("Your notebook holds eight plans. Remove an old one or edit it to make room."); return;
        }
        labForm.id = plan.id;
        state.labPlans = [plan, ...state.labPlans.filter((item) => item.id !== plan.id)];
        save(); report("Project plan saved on this device.");
      }
      render();
    }
    group(p, button("Check estimates", () => checkPlan(false)),
      button(labForm.id ? "Update private plan" : "Save private plan", () => checkPlan(true), { primary: true }),
      button("Start a new plan", () => { editLabPlan(newProject()); render(); }));
    const results = el("div"); results.id = "lifeLabEstimates"; results.setAttribute("aria-live", "polite"); p.append(results);
    if (labResult) {
      const { plan, calculated: m } = labResult;
      row(results, "Estimated spending", `${usd.format(m.spending / 100)} plus ${usd.format(plan.reserve / 100)} held in reserve.`);
      const budgetStatus = !plan.cap ? "No spending limit entered."
        : m.budgetRoom < 0 ? `${usd.format(-m.budgetRoom / 100)} over your limit after setting the reserve aside.`
          : `${usd.format(m.budgetRoom / 100)} still available after setting the reserve aside.`;
      row(results, "Budget check", budgetStatus);
      if (plan.type !== "diy" && plan.payment > 0) {
        row(results, "Estimated net before tax", `${usd.format(m.net / 100)} after costs. ${m.perHour === null ? "Enter the time to estimate net per hour." : `${usd.format(m.perHour / 100)} per hour before tax.`}`);
        results.append(el("p", "This is a planning estimate, not guaranteed pay. Include time spent on setup, messages, or cleanup.", "life-detail"));
      } else if (plan.type !== "diy") row(results, "Estimated net before tax", "Enter an expected payment to see estimated net and hourly pay.");
    }
    const notebook = section(parent, "Saved project plans", "Open a plan after doing the work and update what you learned. Nothing is shared automatically.");
    for (const saved of state.labPlans) {
      const card = section(notebook, saved.name, `${PROJECT_TYPES[saved.type]}${saved.next ? ` · Next: ${saved.next}` : ""}`);
      group(card, button(`Open ${saved.name}`, () => {
        editLabPlan(saved); render(); document.getElementById("lifeProjectPlanner")?.scrollIntoView({ block: "start" });
      }), button("Use project name to draft research", () => {
        projectDraft = saved.name;
        open("study");
        document.querySelector("#lifeBody textarea[aria-label='Search or project idea']")?.focus();
      }), button(`Remove ${saved.name}`, () => {
        state.labPlans = state.labPlans.filter((item) => item.id !== saved.id);
        if (labForm.id === saved.id) editLabPlan(newProject());
        save(); render();
      }));
    }
  }
  function creatorTrack(parent) {
    const progress = Object.keys(state.creatorNotes).length;
    const block = section(parent, "Creator Track: 3D, AR & apps", `Build one thing yourself, then decide what it could be useful for. ${progress}/${CREATOR_STEPS.length} practice notes saved. Aimmianna can coach, but the work and decisions stay yours.`);
    const first = CREATOR_STEPS.findIndex(({ id }) => !state.creatorNotes[id]);
    const index = creatorIndex ?? (first < 0 ? CREATOR_STEPS.length - 1 : first);
    const step = CREATOR_STEPS[index];
    const choices = el("div", undefined, "life-fields");
    choices.append(focusSelection("Creator mission", CREATOR_STEPS.map((item) => item.title), index, (i) => {
      creatorIndex = i; render(); document.getElementById("lifeCreator")?.querySelector("select")?.focus();
    }));
    block.id = "lifeCreator"; block.append(choices);
    row(block, "Do this first", step.start);
    const details = el("details"), summary = el("summary", "Show me the next steps and what the words mean");
    details.className = "life-card";
    details.append(summary, el("p", step.do, "life-detail"), el("p", step.words, "life-detail"));
    block.append(details);
    row(block, "What you’ll build toward", step.result);
    if (step.id === "animation") animationLesson(block);
    if (step.id === "skit") skitLesson(block);
    if (step.source) block.append(button(step.source[0], () => openExternal(step.source[1])));
    const label = el("label", "What I built or tested", "life-lesson-field"), note = el("textarea");
    note.rows = 2; note.maxLength = 260; note.value = creatorDrafts[step.id] ?? state.creatorNotes[step.id] ?? "";
    note.addEventListener("input", () => { creatorDrafts[step.id] = note.value; }); label.append(note); block.append(label);
    group(block, button(state.creatorNotes[step.id] ? "Update creator note" : "Save creator practice", () => {
      const text = note.value.trim();
      if (text.length < 8) { report("Write what you actually built or tested first."); note.focus(); return; }
      const fresh = !state.creatorNotes[step.id];
      state.creatorNotes[step.id] = text;
      delete creatorDrafts[step.id];
      if (fresh) { state.moments++; award({ label: `Creator practice: ${step.title}`, skill: "tech", xp: 10, bond: 2 }); }
      else { save(); report("Creator note updated on this device."); }
      creatorIndex = index; render();
    }, { primary: true }), button("Draft a coaching question", () => {
      if (!openPractice(step.prompt)) report("Finish or clear your existing companion chat draft first.");
    }));
    if (state.creatorNotes[step.id]) {
      block.append(button("Draft this saved lesson for Aimmianna", () => {
        const chosen = state.creatorNotes[step.id];
        if (!openPractice(`Aimmianna, here’s something I learned while practicing “${step.title}”: ${chosen}`))
          report("Finish or clear your existing companion chat draft first.");
      }));
    }
    block.append(el("p", "A coaching draft doesn’t include practice notes. The separate lesson draft includes only this mission’s saved note, and you decide whether to send it in chat. Neither updates her code or trains Gemini.", "life-detail"));
    if (index + 1 < CREATOR_STEPS.length) block.append(button("Next creator mission", () => {
      creatorIndex = index + 1; render(); document.getElementById("lifeCreator")?.scrollIntoView({ block: "start" });
    }));
    if (step.id === "portfolio") block.append(button("Open planner for a potential gig", () => {
      if (!labForm.id && !labForm.name.trim()) { labForm.type = "gig"; render(); }
      document.getElementById("lifeProjectPlanner")?.scrollIntoView({ block: "start" });
    }));
  }
  function animationLesson(parent) {
    const lesson = el("div", undefined, "life-animation-lesson");
    const label = el("label", "JavaScript speed line", "life-lesson-field"), input = el("textarea");
    input.rows = 1; input.maxLength = 54; input.spellcheck = false; input.autocapitalize = "off"; input.value = animationDraft;
    input.addEventListener("input", () => { animationDraft = input.value; }); label.append(input); lesson.append(label);
    const stage = el("div", undefined, "life-animation-stage"), deck = el("span", undefined, "life-animation-deck");
    stage.setAttribute("aria-label", "Skateboard animation preview"); stage.setAttribute("role", "img"); stage.append(deck); lesson.append(stage);
    const hint = el("p", "The deck won’t move until you press Run animation.", "life-detail");
    hint.setAttribute("role", "status"); lesson.append(hint);
    let playing = null;
    group(lesson, button("Run animation", () => {
      const speed = parseAnimationSpeed(input.value);
      if (speed === null) { hint.textContent = "Keep the line in this shape: const speed = 45; Use a whole number from -360 to 360."; return; }
      playing?.cancel(); playing = null;
      if (!speed) { hint.textContent = "At 0 degrees per second, the deck doesn’t turn."; return; }
      playing = deck.animate([{ transform: "rotate(0deg)" }, { transform: `rotate(${speed < 0 ? -360 : 360}deg)` }],
        { duration: 360000 / Math.abs(speed), iterations: Infinity });
      hint.textContent = `Turning ${speed < 0 ? "counterclockwise" : "clockwise"} at ${Math.abs(speed)} degrees per second.`;
    }, { primary: true }), button("Pause animation", () => {
      if (playing) { playing.pause(); hint.textContent = "Paused. Press Run animation to restart."; }
    }));
    parent.append(lesson);
  }
  function skitLesson(parent) {
    if (!skitDraft) skitDraft = cleanSkit(state.skit);
    const card = section(parent, "Three-beat skit rehearsal", "Edit the captions and give each shot 1 to 8 seconds. The preview plays your timing with simple movement.");
    for (const [i, beat] of SKIT_BEATS.entries()) {
      const fields = el("div", undefined, "life-fields");
      const lineLabel = el("label", `${beat.label} caption`), line = el("input");
      line.type = "text"; line.maxLength = 100; line.value = skitDraft[i].line;
      line.addEventListener("input", () => { skitDraft[i].line = line.value; });
      lineLabel.append(line);
      const timeLabel = el("label", `${beat.label} seconds`), time = el("input");
      time.type = "number"; time.min = "1"; time.max = "8"; time.step = "1"; time.inputMode = "numeric"; time.value = String(skitDraft[i].seconds);
      time.addEventListener("input", () => { skitDraft[i].seconds = Number(time.value); });
      timeLabel.append(time); fields.append(lineLabel, timeLabel); card.append(fields);
    }
    const stage = el("div", undefined, "life-animation-stage"), prop = el("span", undefined, "life-animation-deck");
    const caption = el("p", "Press Play skit to rehearse.", "life-detail"); caption.setAttribute("role", "status");
    stage.append(prop); card.append(stage, caption);
    let timer = null, motion = null;
    stopSkit = () => { clearTimeout(timer); timer = null; motion?.cancel(); motion = null; };
    const validate = () => {
      if (skitDraft.some(({ line, seconds }) => !line.trim() || !Number.isInteger(seconds) || seconds < 1 || seconds > 8)) {
        caption.textContent = "Give each beat a caption and a whole duration from 1 to 8 seconds."; return null;
      }
      return cleanSkit(skitDraft);
    };
    group(card, button("Play skit", () => {
      stopSkit?.();
      const frames = validate();
      if (!frames) return;
      const preview = (i) => {
        if (!stage.isConnected) return;
        motion?.cancel();
        if (i === frames.length) { caption.textContent = "That’s the end. Try changing a line or moving the pause."; return; }
        const { line, seconds } = frames[i], { label, actor } = SKIT_BEATS[i];
        caption.textContent = `${label} · ${actor}: ${line}`;
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const movements = [
            [{ transform: "translateX(-6rem)" }, { transform: "translateX(0)" }],
            [{ transform: "translateX(-2rem) rotate(-12deg)" }, { transform: "translateX(2rem) rotate(24deg)" }],
            [{ transform: "rotate(11deg)" }, { transform: "rotate(0)" }],
          ];
          motion = prop.animate(movements[i], { duration: Math.min(700, seconds * 1000), easing: "ease-out", fill: "forwards" });
        }
        timer = setTimeout(() => preview(i + 1), seconds * 1000);
      };
      preview(0);
    }, { primary: true }), button("Stop skit", () => {
      stopSkit?.(); caption.textContent = "Stopped. Adjust the timing or play it again.";
    }), button("Save skit privately", () => {
      const frames = validate();
      if (!frames) return;
      state.skit = frames; save(); report("Skit rehearsal saved on this device.");
    }));
  }
  function editLabPlan(plan) {
    labForm = { ...plan, minutes: plan.minutes ? String(plan.minutes) : "" };
    for (const key of ["cap", "materials", "other", "reserve", "payment"]) labForm[key] = plan[key] ? (plan[key] / 100).toFixed(2) : "";
    labResult = null;
  }
  // A dev/income idea from Routines, carried into the planner so he can
  // price it out for real. The idea stays saved in Routines either way.
  function prefillLabFromIdea(idea) {
    if (!idea || !idea.title) return false;
    editLabPlan({
      ...newProject(),
      type: /gig/i.test(idea.kind || "") ? "gig" : "business",
      name: String(idea.title).slice(0, 70),
      scope: (idea.plain || "") + (idea.pays ? " Pays like this: " + idea.pays : ""),
      next: (idea.setup && idea.setup[0]) || "",
      lesson: "",
    });
    open("lab");
    report(`Planner filled in with “${idea.title}” — check the numbers, then save it.`);
    return true;
  }
  function dailyLesson(parent) {
    const today = new Date().toDateString(), done = state.lastLesson === today;
    const current = lessonFor(state);
    const b = section(parent, "Daily practical lesson", done
      ? `Finished today: ${state.lastLessonTitle}. A new exercise becomes available tomorrow.`
      : "Try the exercise in real life, then write what you learned. The game saves your takeaway privately.");
    if (!done) {
      row(b, current.title, `${current.skill} · ${current.task}`);
      const label = el("label", "My takeaway", "life-lesson-field"), input = el("textarea");
      input.maxLength = 420; input.value = takeawayDraft; input.rows = 3;
      input.addEventListener("input", () => { takeawayDraft = input.value; });
      label.append(input); b.append(label);
      group(b, button("Complete lesson", () => {
        const text = takeawayDraft.trim();
        if (state.lastLesson === new Date().toDateString()) return;
        if (text.length < 8) { report("Write a short takeaway about what you tried or learned first."); input.focus(); return; }
        state.lastLesson = new Date().toDateString(); state.lastLessonTitle = current.title; state.lessons++; state.moments++;
        state.takeaways = [{ title: current.title, text }, ...state.takeaways].slice(0, 24);
        takeawayDraft = ""; checkin = true;
        award({ label: `Practical lesson finished: ${current.title}`, cash: 30, bond: 5, skill: "herTech", xp: 12 }); render();
      }, { primary: true }));
      if (state.upgrades.includes("herComputer")) b.append(el("p", "Aimmianna’s laptop tip: write down what you tried, what happened, and what you’d do next.", "life-detail"));
      b.append(el("p", "The next button opens a draft. It doesn’t send anything or include your private takeaway.", "life-detail"));
      b.append(button("Draft practice in companion chat", () => {
        if (!openPractice(current.prompt)) report("Finish or clear your existing companion chat draft first.");
      }));
    }
    if (state.takeaways.length) {
      const log = section(parent, "Private learning notebook", "Your last 24 takeaways stay in this game save. They aren’t copied to the companion’s memory.");
      for (const item of state.takeaways) row(log, item.title, item.text);
    }
  }
  function check(parent) {
    const available = checkin;
    const p = CHECKINS[(state.moments + (state.upgrades.includes("herPhone") ? 2 : 0)) % CHECKINS.length];
    const text = state.upgrades.includes("herPhone") ? "Aimmianna's upgraded phone" : "A moment with Aimmianna";
    const b = section(parent, text, available ? p.line : "You shared a moment. Try a game, study session, or another activity before checking in again.");
    if (!available) return;
    group(b, ...p.choices.map((option) => button(option, () => {
      if (!checkin) return;
      checkin = false; state.moments++;
      award({ label: option, bond: state.upgrades.includes("herPhone") ? 8 : 5 }); render();
    })));
  }
  function tarotPanel(parent) {
    const b = section(parent, "Tarot for two", "A three-card reflection on choices, change, and connection. Not a prediction or a substitute for advice.");
    if (!tarot) {
      b.append(button("Draw a three-card spread", () => { tarot = shuffle(MAJOR).slice(0, 3); render(); })); return;
    }
    ["What to leave behind", "What to notice", "What to try"].forEach((name, i) => {
      row(b, `${name} · ${tarot[i][0]}`, tarot[i][1]);
    });
    b.append(button("Finish reflection", () => {
      if (!tarot) return;
      tarot = null; checkin = true; state.moments++;
      award({ label: "Tarot reflection shared", bond: 4, skill: "intuition", xp: 9 }); render();
    }));
  }
  function newCards() { return { deck: shuffle(Array.from({ length: 52 }, (_, i) => i % 13 + 1)), previous: 0, current: 0, round: 0, wins: 0, message: "", done: false }; }
  function dealCards() {
    cards = newCards(); cards.current = cards.deck.pop(); render();
    mount.querySelector("#life-card-higher")?.focus({ preventScroll: true });
  }
  function cardReaction(game, lastCallRight) {
    const last = cardLabel(game.current);
    if (game.wins === 3) return `Oh, come on. You even called that ${last}. I like this game, but I want a rematch.`;
    if (game.wins === 2 && lastCallRight) return `Ugh, that ${last} got me. Okay, that was fun. Rematch?`;
    if (game.wins === 2) return `I got you with that ${last}, but you still beat me. Okay, rematch?`;
    if (lastCallRight) return `Nice call on that ${last}. I still got you this time. One more?`;
    if (game.wins === 1) return `Ha, I knew that ${last} would get you. That was fun. One more?`;
    return `That ${last} was mean. I’m not gonna lie, I like this game. One more?`;
  }
  function callCard(up) {
    if (!cards || cards.done) return;
    cards.previous = cards.current; cards.current = cards.deck.pop();
    const diff = cards.current - cards.previous;
    if (!diff) cards.message = "Tie. That card didn’t count as a round.";
    else {
      cards.round++;
      const win = up === (diff > 0);
      if (win) cards.wins++;
      cards.message = win ? "Good call." : "Aimmianna takes that round.";
    }
    if (cards.round >= 3) {
      cards.done = true; checkin = true; state.moments++;
      cards.reaction = cardReaction(cards, up === (diff > 0));
      award({ label: cards.wins >= 2 ? "You won Higher or Lower" : "Higher or Lower finished", cash: 8 + cards.wins * (state.upgrades.includes("studio") ? 8 : 5), skill: "play", xp: 10, bond: 3 });
    }
    render();
    if (cards.done) mount.querySelector("#life-card-reaction")?.focus({ preventScroll: true });
  }
  function cardPanel(parent) {
    const b = section(parent, "Higher or Lower", "Call the next card three times. Ace is low, King is high. No wager or real money.");
    if (cards) {
      const last = cards.previous ? `Last: ${cardLabel(cards.previous)}. ` : "";
      row(b, `Showing ${cardLabel(cards.current)} · ${cards.wins} right`, `${last}${cards.message || "Call the next card."} ${cards.round} of 3 rounds.`);
    }
    if (!cards) b.append(button("Deal cards", dealCards));
    else if (cards.done) {
      const reply = el("p", `Aimmianna: ${cards.declined ? "Fair. We’ll play another time." : cards.reaction}`, "life-detail");
      reply.id = "life-card-reaction"; reply.tabIndex = -1;
      b.append(reply);
      if (cards.declined) b.append(button("Deal cards", dealCards));
      else group(b, button("Rematch", dealCards, { primary: true }), button("Not tonight", () => {
        cards.declined = true; render();
        mount.querySelector("#life-card-reaction")?.focus({ preventScroll: true });
      }));
    } else {
      const higher = button("Higher", () => callCard(true), { primary: true });
      higher.id = "life-card-higher";
      group(b, higher, button("Lower", () => callCard(false)));
    }
  }
  function fieldPanel(parent) {
    const b = section(parent, "Ghost signal casework", "A fictional investigation game. Read the evidence and identify the cause. No real sensors, betting, or cash-out.");
    if (!field) { b.append(button("Open a case", () => { field = FIELD[Math.floor(Math.random() * FIELD.length)]; render(); })); return; }
    row(b, field.name, field.clues);
    group(b, ...field.options.map((text, i) => button(text, () => {
      if (!field) return;
      if (i !== field.key) { report("That doesn’t explain all the clues. You can try again."); return; }
      field = null; checkin = true;
      award({ label: "Ghost signal case solved", skill: "intuition", xp: 12, cash: state.upgrades.includes("archive") ? 42 : 28, bond: 2 }); render();
    })));
  }
  function stopSignals() {
    stopSensor();
    stopMotion();
    const current = radio;
    radio = null; radioReady = false;
    current?.stop();
  }
  function pauseSignals(keepPendingCamera = false) {
    signalCamera.pause(keepPendingCamera);
    if (!radio) return;
    stopSignals();
    if (active && tab === "together") render();
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) pauseSignals(true); });
  window.addEventListener("pagehide", () => { signalCamera.close(); stopSignals(); });
  function updateCameraReadout() {
    const readings = [];
    if (sensorId && sensorField !== null) readings.push(`Magnetic field: ${sensorField.toFixed(1)} µT`);
    if (motionId) readings.push(motionText());
    signalCamera.setReadout(readings.join(" · ") || "No live sensor mode on. Turn one on at the radio to see readings here.");
  }
  function stopSensor() {
    const id = sensorId;
    sensorId = 0; sensorField = null; sensorError = "";
    clearTimeout(sensorTimer); sensorTimer = null;
    if (id) {
      try { magnetic.postMessage(JSON.stringify({ action: "stop", id })); } catch { /* bridge closed */ }
      radio?.texture(0);
    }
  }
  function sensorUnavailable(message) {
    stopSensor();
    sensorError = message;
    if (active && tab === "together") render();
  }
  if (magnetic) magnetic.onmessage = (event) => {
    let response;
    try { response = JSON.parse(event.data); } catch { return; }
    if (!response || !radioReady || document.hidden) return;
    if (motionId && response.id === motionId) { handleRadioMotion(response); return; }
    if (!sensorId || response.id !== sensorId) return;
    if (response.unavailable) { sensorUnavailable("No magnetic sensor is available. The quiet radio still works."); return; }
    if (!Number.isFinite(response.field) || response.field < 0) return;
    clearTimeout(sensorTimer); sensorTimer = null;
    radio?.texture(sensorField === null ? 0 : response.field - sensorField);
    sensorField = response.field;
    if (!sessionBusy) addSignalField(signalSession, sensorField);
    const meter = mount.querySelector("#signalMeter");
    if (meter) meter.textContent = `Magnetic field: ${sensorField.toFixed(1)} µT`;
    updateCameraReadout();
  };
  function toggleSensor() {
    if (!radioReady || !magnetic) return;
    if (sensorId) {
      stopSensor();
    } else {
      sensorError = ""; sensorId = ++sensorSequence;
      try { magnetic.postMessage(JSON.stringify({ action: "start", id: sensorId })); }
      catch { sensorUnavailable("I couldn’t start the live sensor. The quiet radio still works."); return; }
      sensorTimer = setTimeout(() => sensorUnavailable("No readings came through. The quiet radio still works."), 4500);
    }
    render();
    mount.querySelector("#signalSensorPower")?.focus({ preventScroll: true });
  }
  function stopMotion() {
    const id = motionId;
    motionId = 0; motionError = ""; tiltAvailable = null; spinAvailable = null;
    radioTilt = 0; radioSweep = 0; radioPeak = false;
    clearTimeout(motionTimer); motionTimer = null;
    if (id) {
      if (motionListener) {
        window.removeEventListener("devicemotion", motionListener);
        motionListener = null;
      }
      try { magnetic?.postMessage(JSON.stringify({ action: "stop-motion", id })); } catch { /* bridge closed */ }
      radio?.motion(0, 0, false);
    }
  }
  function motionUnavailable(message) {
    stopMotion();
    motionError = message;
    if (active && tab === "together") render();
  }
  function motionText() {
    if (!motionId) return motionError;
    if (tiltAvailable === null) return "Waiting for the motion sensors…";
    const tilt = radioTilt < -0.25 ? "low" : radioTilt > 0.25 ? "bright" : "mid";
    const sweep = radioSweep < -0.22 ? "left" : radioSweep > 0.22 ? "right" : "center";
    return `${tiltAvailable ? `Tuning: ${tilt}` : "Tilt sensor unavailable"} · ${spinAvailable ? `Sweep: ${sweep}` : "Gyroscope unavailable"}${radioPeak ? " · Static peak" : ""}`;
  }
  function handleRadioMotion(response) {
    const clamp = (v) => Math.min(1, Math.max(-1, v));
    if (typeof response.tiltAvailable === "boolean" && typeof response.spinAvailable === "boolean") {
      if (!response.tiltAvailable && !response.spinAvailable) {
        motionUnavailable("No motion sensors available. You can still listen normally.");
        return;
      }
      tiltAvailable = response.tiltAvailable; spinAvailable = response.spinAvailable;
    } else {
      let changed = false;
      if (tiltAvailable && Number.isFinite(response.tilt)) {
        radioTilt += (clamp(response.tilt) - radioTilt) * 0.55;
        changed = true;
      }
      if (spinAvailable && Number.isFinite(response.spin)) {
        const spin = Math.abs(response.spin) < 0.12 ? 0 : -response.spin / 1.8;
        radioSweep = clamp(spin);
        changed = true;
      }
      if (!changed) return;
      clearTimeout(motionTimer); motionTimer = null;
      const wasPeak = radioPeak;
      radioPeak = !!radio?.motion(radioTilt, radioSweep);
      if (signalSession && !sessionBusy) {
        signalSession.motionUsed = true;
        if (radioPeak && !wasPeak) signalSession.peaks++;
      }
    }
    const meter = mount.querySelector("#signalMotionMeter");
    const line = motionText();
    if (meter && meter.textContent !== line) meter.textContent = line;
    updateCameraReadout();
  }
  async function toggleMotion() {
    if (!radioReady || (!magnetic && !browserMotion)) return;
    if (motionId) stopMotion();
    else {
      motionError = ""; motionId = ++sensorSequence;
      const id = motionId;
      try {
        if (magnetic) magnetic.postMessage(JSON.stringify({ action: "start-motion", id }));
        else {
          const permission = typeof DeviceMotionEvent.requestPermission !== "function" || await DeviceMotionEvent.requestPermission() === "granted";
          if (motionId !== id || !radioReady) return;
          if (!permission) { motionUnavailable("Motion access wasn’t allowed. You can still listen normally."); return; }
          let latest = 0;
          motionListener = (event) => {
            if (motionId !== id || event.timeStamp - latest < 100) return;
            latest = event.timeStamp;
            const tilt = event.accelerationIncludingGravity?.x;
            const spin = event.rotationRate?.alpha;
            const hasTilt = Number.isFinite(tilt), hasSpin = Number.isFinite(spin);
            if (!hasTilt && !hasSpin) return;
            handleRadioMotion({ tiltAvailable: hasTilt, spinAvailable: hasSpin });
            handleRadioMotion({ tilt: hasTilt ? tilt / 9.81 : null, spin: hasSpin ? spin * Math.PI / 180 : null });
          };
          window.addEventListener("devicemotion", motionListener, { passive: true });
        }
        motionTimer = setTimeout(() => motionUnavailable("No motion readings came through. The radio still works."), 4500);
      }
      catch { motionUnavailable("I couldn’t start live motion. The radio still works."); return; }
    }
    render();
    mount.querySelector("#signalMotionPower")?.focus({ preventScroll: true });
  }
  async function toggleSignals() {
    if (radio) {
      stopSignals();
    } else {
      let next;
      try {
        next = makeSignalRadio(radioVolume);
        radio = next; radioError = false;
        walk("couch", true);
        render(); mount.querySelector("#signalPower")?.focus({ preventScroll: true });
        await next.ready;
        if (radio !== next) return;
        radioReady = true;
      } catch {
        if (next && radio !== next) return;
        stopSignals(); radioError = true;
      }
    }
    render(); mount.querySelector("#signalPower")?.focus({ preventScroll: true });
  }
  function markSignalMoment() {
    if (!signalSession || sessionBusy) return "No active session.";
    if (signalSession.marks.length >= SIGNAL_MARK_LIMIT) return "This session has reached 24 markers.";
    signalSession.marks.push(Math.max(signalSession.started, Date.now()));
    sessionNotice = `Marker ${signalSession.marks.length} added to this draft.`;
    const notice = mount.querySelector("#signalSessionNotice");
    if (notice) notice.textContent = sessionNotice;
    return sessionNotice;
  }
  async function saveSignalSession() {
    if (!signalSession || sessionState !== "ready" || sessionBusy || sessions.length >= SIGNAL_SESSION_LIMIT) return;
    sessionBusy = true; sessionNotice = "Saving on this device…"; render();
    const draft = signalSession;
    const entry = { ...draft, title: draft.title.trim() || "Untitled investigation", notes: draft.notes.trim(),
      ended: Math.max(Date.now(), draft.started, ...draft.marks) };
    const next = [entry, ...sessions];
    const result = await storage("write-sessions", JSON.stringify({ version: 1, sessions: next }));
    sessionBusy = false;
    if (result.ok) {
      sessions = next; signalSession = null; showSessions = true; sessionNotice = "Session saved on this device.";
    } else sessionNotice = "The session didn’t save. Your draft is still here; try again.";
    if (active && tab === "together") {
      render();
      mount.querySelector(result.ok ? "#signalSavedSessions" : "#signalSaveSession")?.focus({ preventScroll: true });
    }
  }
  function signalSessionsPanel(parent) {
    const b = section(parent, "Investigation sessions", "Start a session to log magnetic ranges, motion peaks, and any moments you mark. Add notes and save it here for later. The camera never records, and sessions stay on this device.");
    const notice = el("p", sessionNotice, "life-inline-note");
    notice.id = "signalSessionNotice"; notice.setAttribute("role", "status"); b.append(notice);
    if (sessionState !== "ready") {
      b.append(el("p", sessionState === "loading" ? "Opening your local log…" : "The local log isn’t available. The radio still works.", "life-detail"));
      return;
    }
    if (signalSession) {
      const title = el("input"), notes = el("textarea");
      title.id = "signalSessionTitle"; title.type = "text"; title.maxLength = 65; title.placeholder = "Session name (optional)"; title.value = signalSession.title;
      notes.maxLength = 600; notes.rows = 3; notes.placeholder = "What did you notice? (optional)"; notes.value = signalSession.notes;
      for (const [input, key] of [[title, "title"], [notes, "notes"]]) {
        input.setAttribute("aria-label", input.placeholder); input.disabled = sessionBusy;
        input.addEventListener("input", () => { signalSession[key] = input.value; });
        const fields = el("label", undefined, "life-lesson-field signal-session-field");
        fields.append(el("span", input.placeholder), input); b.append(fields);
      }
      const save = button("Save session", saveSignalSession, { primary: true, disabled: sessionBusy });
      save.id = "signalSaveSession";
      group(b, button("Mark this moment", markSignalMoment, { disabled: sessionBusy }), save, button("Discard draft", () => {
        if (!window.confirm("Discard this unsaved investigation?")) return;
        signalSession = null; sessionNotice = "Draft discarded."; render();
        mount.querySelector("#signalStartSession")?.focus({ preventScroll: true });
      }, { disabled: sessionBusy }));
      b.append(el("p", "Draft only. Tap Save session before closing the app.", "life-detail"));
    } else {
      const start = button("Start investigation", () => {
        signalSession = startSignalSession(); sessionNotice = "Investigation started. Use the radio sensors or add a note."; render();
        mount.querySelector("#signalSessionTitle")?.focus({ preventScroll: true });
      }, { primary: true, disabled: sessions.length >= SIGNAL_SESSION_LIMIT });
      start.id = "signalStartSession"; b.append(start);
      if (sessions.length >= SIGNAL_SESSION_LIMIT) b.append(el("p", "The local log is full (30 sessions). Delete one from the list to make room.", "life-detail"));
    }
    const history = el("details", undefined, "life-radio-caption");
    history.open = showSessions; history.addEventListener("toggle", () => { if (history.isConnected) showSessions = history.open; });
    const summary = el("summary", `Saved sessions (${sessions.length})`);
    summary.id = "signalSavedSessions"; history.append(summary);
    if (!sessions.length) history.append(el("p", "No saved investigations yet.", "life-detail"));
    for (const entry of sessions) {
      const detail = el("details", undefined, "signal-session-entry");
      const label = new Date(entry.started).toLocaleString();
      detail.append(el("summary", `${entry.title} · ${label}`),
        el("p", `Ended ${new Date(entry.ended).toLocaleString()} · ${sessionSummary(entry)}`, "life-detail"));
      if (entry.notes) detail.append(el("p", entry.notes, "signal-session-notes"));
      if (entry.marks.length) {
        const list = el("ol", undefined, "signal-session-notes");
        for (const mark of entry.marks) list.append(el("li", new Date(mark).toLocaleTimeString()));
        detail.append(list);
      }
      detail.append(button("Delete saved session", async () => {
        if (sessionBusy || !window.confirm(`Delete “${entry.title}” from this device?`)) return;
        sessionBusy = true;
        const next = sessions.filter((s) => s !== entry);
        const result = await storage("write-sessions", JSON.stringify({ version: 1, sessions: next }));
        sessionBusy = false;
        if (result.ok) sessions = next;
        sessionNotice = result.ok ? "Saved session deleted." : "Couldn’t delete the session. Try again.";
        if (active && tab === "together") render();
      }, { disabled: sessionBusy }));
      history.append(detail);
    }
    b.append(history, el("p", "Readings describe the phone’s sensors, not paranormal activity. Fictional clues aren’t logged as readings.", "life-detail"));
  }
  function signalsPanel(parent) {
    updateCameraReadout();
    signalCamera.showMarker(!!signalSession && !sessionBusy);
    const b = section(parent, "Late-Night Signals", "Sit with Aimmianna by a little radio. Soft rain and static, with a fictional mystery if you want one. No microphone, live broadcasts, or spirit detection.");
    const line = radioError ? "The radio couldn’t start. You can try again."
      : radioReady ? "Aimmianna: I kinda like the quiet. We can leave it just like this."
      : radio ? "Turning on the radio…" : "The radio is off.";
    const status = el("p", line, "life-inline-note");
    status.setAttribute("role", "status");
    b.append(status);
    const power = button(radio ? "Turn radio off" : "Turn radio on", toggleSignals, { primary: !radio });
    power.id = "signalPower";
    group(b, power, button("Open AR camera view", () => signalCamera.open(), { disabled: !signalCamera.canOpen }));

    const volume = el("label", undefined, "life-radio-volume");
    volume.append(el("span", "Radio volume"));
    const slider = el("input"); slider.type = "range"; slider.min = "0"; slider.max = "100"; slider.value = String(radioVolume);
    slider.addEventListener("input", () => { radioVolume = Number(slider.value); radio?.volume(radioVolume); });
    volume.append(slider); b.append(volume);
    if (radioReady) {
      if (magnetic) {
        const live = button(sensorId ? "Turn live sensor off" : "Use live magnetic sensor", toggleSensor);
        live.id = "signalSensorPower"; b.append(live);
        b.append(el("p", "Real magnetic readings can change the static. They never trigger the fictional clues. Only a session you choose to save keeps a magnetic range.", "life-detail"));
        const meter = el("p", sensorError, "life-inline-note");
        meter.id = "signalMeter";
        if (sensorId) meter.textContent = sensorField === null ? "Waiting for magnetic readings…" : `Magnetic field: ${sensorField.toFixed(1)} µT`;
        b.append(meter);
      } else b.append(el("p", "Live magnetic readings aren’t available in this browser. The radio still works.", "life-detail"));
      if (magnetic || browserMotion) {
        const motion = button(motionId ? "Turn live motion off" : "Use live motion", toggleMotion);
        motion.id = "signalMotionPower"; b.append(motion);
        b.append(el("p", "Tilt gently side to side to tune the static, or turn the device like a dial to sweep it left or right. A soft ping marks a motion peak; it isn’t a mystery clue.", "life-detail"));
        const motionMeter = el("p", motionText(), "life-inline-note");
        motionMeter.id = "signalMotionMeter";
        b.append(motionMeter);
      }
    }

    if (signalGuess === null) {
      b.append(button("Tune into a mystery", () => { signalGuess = ""; radio?.playClue(); render(); }));
      return;
    }
    row(b, "The sound behind the static", "Aimmianna: There’s something under the rain. What do you hear?");
    if (!radioReady) b.append(el("p", "Turn on the radio to hear the clue, or use the caption.", "life-detail"));
    group(b, button("Replay clue", () => radio?.playClue(), { disabled: !radioReady }),
      button("Back to quiet", () => { radio?.quietClue(); signalGuess = null; render(); }));
    const caption = el("details", undefined, "life-radio-caption");
    caption.append(el("summary", "Read the sound caption"), el("p", "Rain and static. Tap, tap, tap. Then only the rain again.", "life-detail"));
    b.append(caption);
    if (signalGuess === "Three taps") {
      b.append(el("p", "Aimmianna: Three taps, yeah. There’s a loose branch against the window. Mystery solved. Want to leave the rain on?", "life-inline-note"));
    } else {
      group(b, ...["Two scratches", "Three taps", "One long tone"].map((answer) =>
        button(answer, () => { signalGuess = answer; render(); })));
      if (signalGuess) b.append(el("p", "Aimmianna: I’m not sure about that one. We can play it again or call it a night.", "life-inline-note"));
    }
  }
  function movie(parent) {
    const b = section(parent, "Movie night", "Settle in by the TV. Open a YouTube or Prime Video link in its own app or browser, then return to log a movie night together.");
    const title = el("input"), link = el("input");
    title.type = "text"; title.maxLength = 70; title.value = movieTitle; title.placeholder = "Movie or video title"; title.setAttribute("aria-label", title.placeholder);
    title.addEventListener("input", () => { movieTitle = title.value; });
    link.type = "url"; link.maxLength = 700; link.value = movieLink; link.placeholder = "https://…"; link.setAttribute("aria-label", "YouTube or Prime Video link");
    link.addEventListener("input", () => { movieLink = link.value; });
    const inputs = el("div", undefined, "life-fields"); inputs.append(title, link); b.append(inputs);
    const today = new Date().toDateString();
    group(b, button(seat ? "Return to couch" : "Sit by the TV", () => { seat = true; walk("couch", true); closePanel(); }),
      button("Open video", () => {
        const url = videoUrl(movieLink.trim());
        if (!url) { report("Paste an HTTPS YouTube video or Prime Video link first."); return; }
        openExternal(url);
      }),
      button(state.lastNight === today ? "Logged today" : "Log movie night", () => {
        if (state.lastNight === today) return;
        const label = movieTitle.trim();
        if (!label) { report("Type the movie or video title first."); return; }
        state.lastNight = today; state.movieNights++; state.moments++; checkin = true;
        award({ label: `Movie night: ${label}`, bond: state.upgrades.includes("tv") ? 11 : 7 }); render();
      }, { disabled: state.lastNight === today }));
  }
  function sharedBond(parent) {
    const today = new Date().toDateString(), companion = readCompanionBond();
    const b = section(parent, "Bond across game and life",
      `Game bond Lv ${skillLevel(state, "bond")} · Companion bond Lv ${companion.level}. Each grows on its own. You decide which moments to carry across.`);
    function fieldFor(text, value, update) {
      const label = el("label", text, "life-lesson-field"), input = el("textarea");
      input.rows = 2; input.maxLength = 200; input.value = value;
      input.addEventListener("input", () => update(input.value));
      label.append(input); b.append(label); return input;
    }
    b.append(el("p", "Life → game: remember something useful you did together outside the game. Only your typed reflection stays in this local save.", "life-detail"));
    if (state.lastRealMoment === today) b.append(el("p", "Real-life moment logged today.", "life-inline-note"));
    else {
      const input = fieldFor("Real-life moment", reflectionDraft, (v) => { reflectionDraft = v; });
      b.append(button("Bring moment into game", () => {
        if (state.lastRealMoment === new Date().toDateString()) return;
        const text = reflectionDraft.trim();
        if (text.length < 8) { report("Write a short real-life moment first."); input.focus(); return; }
        state.lastRealMoment = new Date().toDateString();
        state.reflections = [text, ...state.reflections].slice(0, 8);
        reflectionDraft = ""; checkin = true;
        award({ label: "Real-life moment brought into the game", bond: 6 }); render();
      }));
    }
    if (state.reflections.length) row(b, "Most recent real-life moment", state.reflections[0]);
    b.append(el("p", "Game → life: choose a moment worth remembering. Only the text you enter is copied to Companion Notes, which follow your existing companion backup and sync settings.", "life-detail"));
    if (companion.sharedToday) b.append(el("p", "Game moment shared with the companion today.", "life-inline-note"));
    else if (!state.moments) b.append(el("p", "Spend a moment together in the game first.", "life-detail"));
    else {
      const input = fieldFor("Game moment to share", momentDraft, (v) => { momentDraft = v; });
      b.append(button("Share to Companion Notes", () => {
        const text = momentDraft.trim();
        if (text.length < 8) { report("Write a short game moment first."); input.focus(); return; }
        if (!shareGameMoment(text)) return;
        figures.playEmote("hug");
        momentDraft = ""; report("Saved to Companion Notes · +6 companion bond XP."); render();
      }));
    }
  }
  function together(parent) {
    check(parent); signalsPanel(parent); signalSessionsPanel(parent); sharedBond(parent); movie(parent); cardPanel(parent); tarotPanel(parent); fieldPanel(parent);
  }
  function routine(parent) {
    const dinner = section(parent, "Dinner with Aimmianna", state.dinners
      ? `${state.dinners} dinners played together. The game remembers these as fictional shared moments.`
      : "Sit down together and play out a quiet dinner scene in the apartment.");
    if (dinnerScene) {
      dinner.append(el("p", "Aimmianna: Let’s make this a real break. We can talk about the day, or just enjoy a minute of quiet.", "life-detail"));
      group(dinner, ...["Talk about today", "Plan tomorrow", "Share a quiet meal"].map((choice) => button(choice, () => {
        if (!dinnerScene) return;
        dinnerScene = false; checkin = true; state.dinners++; state.moments++;
        award({ label: `Dinner for two: ${choice}`, skill: "home", xp: 6, bond: 3 }); render();
      })));
    } else dinner.append(button("Sit down for dinner", () => { dinnerScene = true; walk("kitchen_table", true); render(); }, { primary: true }));
    const log = section(parent, "Real-life check-in", "Only log something you actually did. This is a manual routine log, not a health monitor. It doesn’t measure anything or make medical recommendations.");
    const dedupe = (kind) => state.routineLog.find((r) => r.kind === kind && Date.now() - r.at >= 0 && Date.now() - r.at < 60000);
    group(log, ...["Dinner", "Water", "Movement break"].map((kind) => button(`Log ${kind.toLowerCase()}`, () => {
      if (dedupe(kind)) { report("That was just logged."); return; }
      state.routineLog = [{ kind, at: Date.now() }, ...state.routineLog].slice(0, 15);
      save(); report(`Real ${kind.toLowerCase()} logged on this device.`); render();
    })));
    if (!state.routineLog.length) log.append(el("p", "No real-life check-ins logged yet.", "life-detail"));
    for (const { kind, at } of state.routineLog) row(log, kind, new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }));
    if (state.routineLog.length) {
      const latest = state.routineLog[0];
      log.append(button("Undo latest check-in", () => {
        if (state.routineLog[0] !== latest) return;
        state.routineLog.shift(); save(); report("Latest real-life check-in removed."); render();
      }));
    }
    const plan = section(parent, "Set a real reminder", "Pick a time yourself. This adds one reminder to your companion’s Phone → Reminders. Reminders use your Android notification settings.");
    const kinds = ["Dinner", "Water", "Movement break"];
    const fields = el("div", undefined, "life-fields"), form = el("form");
    const kind = focusSelection("Reminder type", kinds, kinds.indexOf(routineKind), (i) => { routineKind = kinds[i]; });
    function when(label, type, value, change) {
      const wrapper = el("label", label), input = el("input"); input.type = type; input.required = true; input.value = value;
      input.addEventListener("input", () => change(input.value)); wrapper.append(input); return wrapper;
    }
    fields.append(kind, when("Reminder date", "date", realDate, (v) => { realDate = v; }),
      when("Reminder time", "time", realTime, (v) => { realTime = v; }));
    const submit = el("button", "Set real reminder", "life-button primary"); submit.type = "submit";
    form.append(fields); group(form, submit); plan.append(form);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const result = addRealReminder(routineKind, realDate, realTime);
      if (!result.ok) { report(result.message); return; }
      realDate = ""; realTime = "";
      report(`Real reminder added: ${result.message}.`); render();
    });
  }
  function stories(parent) {
    const b = section(parent, "After-hours Story Shelf", "Short fiction and branching adventures. Bookmarks and endings save on this device.");
    if (!Object.hasOwn(STORIES, selectedStory)) {
      for (const [id, story] of Object.entries(STORIES)) {
        const progress = state.stories[id];
        const count = Object.values(story.pages).filter((p) => !p.next && !p.choices).length;
        const extra = progress?.endings.length ? ` · ${count > 1 ? `${progress.endings.length}/${count} endings` : "Finished"}` : "";
        row(b, story.title, `${story.genre}${extra}. ${story.hook}`,
          button(progress ? `Open ${story.title}` : `Start ${story.title}`, () => {
            selectedStory = id;
            if (!progress) { state.stories[id] = { page: "start", endings: [] }; save(); }
            showStoryPage();
          }));
      }
      return;
    }
    const story = STORIES[selectedStory], progress = state.stories[selectedStory], page = story.pages[progress.page];
    const book = section(parent, story.title, story.genre);
    book.classList.add("life-story");
    const heading = el("h4", page.title); heading.tabIndex = -1; heading.id = "lifeStoryPage"; book.append(heading);
    for (const paragraph of page.text) book.append(el("p", paragraph));
    const move = (key) => {
      const next = story.pages[key];
      if (!next || progress.page === key) return;
      progress.page = key;
      if (!next.next && !next.choices && !progress.endings.includes(key)) progress.endings.push(key);
      save(); showStoryPage();
    };
    if (page.choices) group(book, ...page.choices.map(([text, key]) => button(text, () => move(key))));
    else if (page.next) book.append(button("Continue reading", () => move(page.next), { primary: true }));
    else group(book, button("Read from the beginning", () => move("start")));
    book.append(button("Back to the shelf", () => { selectedStory = ""; render(); parent.closest(".sheet-body")?.scrollTo(0, 0); }));
  }
  function showStoryPage() {
    render();
    document.getElementById("lifeStoryPage")?.focus();
  }
  function yard(parent) {
    const today = new Date().toDateString(), claimed = state.lastYardShift === today;
    const gig = yardProgress?.gig || YARD_GIGS[state.yardShifts % YARD_GIGS.length];
    const b = section(parent, "Outside yard", "Step onto the front path to reach the planters and bench. Yard jobs pay game cash; they don’t mark any real work complete.");
    group(b, button("Explore the yard", () => { walk("yard_center"); closePanel(); }, { primary: true }),
      button("Back to the kitchen", () => { walk("kitchen_table"); closePanel(); }));
    const work = section(parent, "Yard work", claimed
      ? `${state.yardShifts} yard shifts completed. A new paid shift is available tomorrow.`
      : `${gig.name} · 36 game cash · ${state.yardShifts} yard shifts completed`);
    if (!claimed && !yardProgress) work.append(button("Start yard shift", () => {
      yardProgress = { gig, index: 0, order: shuffle(gig.steps) }; walk("yard_center"); render();
    }));
    if (!claimed && yardProgress) {
      work.append(el("p", `Order: ${gig.steps.join(" → ")}.`, "life-detail"));
      group(work, ...yardProgress.order.filter((step) => !gig.steps.slice(0, yardProgress.index).includes(step)).map((step) => button(step, () => {
        if (!yardProgress || state.lastYardShift === new Date().toDateString()) return;
        if (step !== gig.steps[yardProgress.index]) { report("Try the earlier step first."); return; }
        yardProgress.index++;
        if (yardProgress.index === gig.steps.length) {
          yardProgress = null; state.lastYardShift = new Date().toDateString(); state.yardShifts++;
          award({ label: `Yard work: ${gig.name}`, cash: 36, skill: "home", xp: 9 });
        }
        render();
      })));
    }
    group(work, button("Plan a real project at the computer", () => focusArea("study", "pc")));
    diy(parent);
  }
  function diy(parent) {
    const b = section(parent, "DIY desk & everyday questions", "Save an idea here, or ask Aimmianna to research it. Search sends only the topic you choose to Google/Gemini, not your game save or payment log.");
    const label = el("label", "Search or project idea", "life-lesson-field"), input = el("textarea");
    input.setAttribute("aria-label", "Search or project idea");
    input.rows = 2; input.maxLength = 160; input.value = projectDraft;
    input.addEventListener("input", () => { projectDraft = input.value; });
    label.append(input); b.append(label);
    group(b, ...PROJECT_IDEAS.map((idea, i) => button(["Garden idea", "Yard checklist", "Bench repair idea"][i], () => {
      projectDraft = idea; input.value = idea; input.focus();
    })));
    const use = (action) => () => {
      const text = projectDraft.trim();
      if (text.length < 3) { report("Type a project idea or question first."); input.focus(); return; }
      action(text);
    };
    group(b, button("Save idea privately", use((text) => {
      if (state.projects.includes(text)) { report("That idea is already in your notebook."); return; }
      state.projects = [text, ...state.projects].slice(0, 12); projectDraft = "";
      save(); report("Project idea saved on this device."); render();
    })), button("Open web search", use((text) => openExternal(`https://www.google.com/search?q=${encodeURIComponent(text)}`))),
    button("Draft question for Aimmianna", use((text) => {
      if (!openPractice(text)) report("Finish or clear your existing companion chat draft first.");
    })));
    async function ask(mode) {
      if (research?.busy) return;
      const topic = projectDraft.trim() || (mode === "ideas" ? "simple low-cost patio, yard or apartment weekend projects" : "");
      if (topic.length < 3) {
        report(mode === "gigs" ? "What kind of project or gig should she look for?"
          : mode === "market" ? "What kind of item or style should she look for?" : "What should she look up?");
        input.focus(); return;
      }
      const id = ++researchId;
      research = { busy: true, topic, mode }; render();
      let result;
      try { result = await researchProject(topic, mode); }
      catch { result = { ok: false, error: "Search did not finish. Try again or open a browser search." }; }
      if (id !== researchId) return;
      research = { ...result, topic, mode };
      if (tab === "study" || tab === "yard") render();
    }
    group(b, button("Have Aimmianna search", () => ask("search"), { disabled: !!research?.busy }),
      button("Ask for DIY ideas", () => ask("ideas"), { disabled: !!research?.busy }),
      button("Find project opportunities", () => ask("gigs"), { disabled: !!research?.busy }),
      button("Look for marketplace inspiration", () => ask("market"), { disabled: !!research?.busy }));
    b.append(el("p", "Findings are for you to review. Aimmianna doesn’t contact anyone, apply, buy, or commit to work from here.", "life-detail"));
    if (research) {
      const result = el("div"); result.setAttribute("role", "status");
      if (research.busy) result.append(el("p", "Aimmianna is looking for sources…", "life-inline-note"));
      else if (!research.ok) result.append(el("p", research.error, "life-inline-note"));
      else {
        row(result, research.topic, research.answer);
        group(result, ...research.sources.map(({ uri, title }, i) =>
          button(title ? title.slice(0, 54) : `Open result ${i + 1}`, () => openExternal(uri))));
        result.append(button("Refine the search", () => { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }));
        if (research.mode === "market") result.append(button("Make an inspired virtual item", () => {
          marketName = research.topic.slice(0, 50); open("shop");
          document.getElementById("lifeMarket")?.scrollIntoView({ block: "start" });
        }));
      }
      b.append(result);
    }
    for (const idea of state.projects) row(b, idea, "Private project idea", button("Use idea", () => {
      projectDraft = idea; input.value = idea; input.focus();
    }));
  }
  function bank(parent) {
    const b = section(parent, "Our shared piggy bank", "You and Aimmianna can see the same game savings here. Only you can move game cash. No real money, conversion, or cash-out.");
    row(b, "Game wallet", `${state.cash.toLocaleString()} game cash you can spend.`);
    row(b, "Shared savings", `${state.jar.toLocaleString()} game cash set aside.`);
    if (state.savingsGoal) {
      const bar = el("progress");
      bar.max = state.savingsGoal; bar.value = state.jar;
      bar.setAttribute("aria-label", "Game savings goal progress");
      row(b, state.jar >= state.savingsGoal ? "Goal reached" : "Savings goal", `${state.jar.toLocaleString()} / ${state.savingsGoal.toLocaleString()} game cash`, bar);
    }
    function field(labelText, value, change, { inputMode, limit = 10 } = {}) {
      const label = el("label", labelText), input = el("input");
      input.value = value; input.type = "text"; input.maxLength = limit;
      if (inputMode) input.inputMode = inputMode;
      input.addEventListener("input", () => change(input.value)); label.append(input); return label;
    }
    function fields(box, ...list) { const grid = el("div", undefined, "life-fields"); grid.append(...list); box.append(grid); }
    const integer = (value) => /^\d{1,10}$/.test(value.trim()) ? Number(value.trim()) : -1;
    fields(b, field("Game cash to move", jarAmount, (v) => { jarAmount = v; }, { inputMode: "numeric" }),
      field("Game savings goal", goalAmount, (v) => { goalAmount = v; }, { inputMode: "numeric" }));
    function transfer(intoJar) {
      const amount = integer(jarAmount);
      if (!moveGameCash(state, amount, intoJar)) { report("Enter a whole amount you have available to move."); return; }
      jarAmount = ""; save(); report(intoJar ? "Game cash moved into shared savings." : "Game cash returned to the game wallet."); render();
    }
    group(b, button("Put in piggy bank", () => transfer(true)), button("Move back to wallet", () => transfer(false)),
      button("Set game goal", () => {
        const amount = integer(goalAmount);
        if (amount < 0 || amount > 1e9) { report("Enter a whole-number goal, or 0 to clear it."); return; }
        state.savingsGoal = amount; goalAmount = ""; save(); report(amount ? "Game savings goal updated." : "Game savings goal cleared."); render();
      }));
    const real = section(parent, "Real project payment log", "Optional local record of payments you already received elsewhere. This is not a bank account, and nothing moves or syncs. Don’t add banking details.");
    fields(real, field("Paid project name", paidLabel, (v) => { paidLabel = v; }, { limit: 80 }),
      field("Amount received (USD)", paidAmount, (v) => { paidAmount = v; }, { inputMode: "decimal", limit: 9 }));
    real.append(button("Log payment received", () => {
      const label = paidLabel.trim(), cents = centsFromInput(paidAmount);
      if (!label || !cents) { report("Enter a project name and an amount received, such as 15.50."); return; }
      state.paidProjects = [{ label, cents, at: Date.now() }, ...state.paidProjects].slice(0, 16);
      paidLabel = ""; paidAmount = ""; save(); report("Payment recorded locally. No money was moved."); render();
    }));
    const usd = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
    const total = usd.format(state.paidProjects.reduce((sum, p) => sum + p.cents, 0) / 100);
    row(real, "Total of displayed entries", total);
    group(real, button("Review totals with Aimmianna", () => {
      report(`Aimmianna: We’ve set aside ${state.jar.toLocaleString()} in game cash. Separately, you’ve logged ${total} across ${state.paidProjects.length} recent real project payments.`);
    }));
    for (const entry of state.paidProjects) row(real, entry.label,
      `${usd.format(entry.cents / 100)} · ${new Date(entry.at).toLocaleDateString()}`, button("Remove entry", () => {
        state.paidProjects = state.paidProjects.filter((p) => p !== entry); save(); render();
      }));
  }
  function shop(parent) {
    virtualMarket(parent);
    const b = section(parent, "Apartment and tech upgrades", "You spend only money earned in the game. Furniture appears in Game Mode, and devices can unlock better activities.");
    for (const [id, item] of Object.entries(UPGRADES)) {
      const owned = state.upgrades.includes(id), gate = item.needs && skillLevel(state, item.needs[0]) < item.needs[1];
      row(b, item.name, `${item.note}${!owned && gate ? ` Needs ${rankText(...item.needs)}.` : ""}`,
        button(owned ? "Installed" : `Buy · ${item.cost}`, () => {
          if (!buy(state, id)) return;
          report(`${item.name} installed.`); save(); render();
        }, { disabled: owned || !!gate || state.cash < item.cost }));
    }
  }
  function virtualMarket(parent) {
    const styles = Object.entries(MARKET_MODELS), [id, model] = styles[marketIndex];
    const already = state.marketItems[id];
    const b = section(parent, "Marketplace-inspired decor", "Use a find as inspiration. Pick a room-ready model and finish, then place it with game cash. No real listing data, accounts, or purchases are needed here.");
    b.id = "lifeMarket";
    const name = el("label", "Virtual item name"), input = el("input");
    input.type = "text"; input.maxLength = 50; input.value = marketName;
    input.placeholder = already?.name || model.label;
    input.addEventListener("input", () => { marketName = input.value; }); name.append(input);
    const grid = el("div", undefined, "life-fields");
    grid.append(name, focusSelection("Virtual model", styles.map(([, m]) => m.label), marketIndex, (i) => {
      marketIndex = i; marketColor = state.marketItems[styles[i][0]]?.color ?? 0; render();
    }), focusSelection("Virtual finish", MARKET_COLORS.map((c) => c.name), marketColor, (i) => { marketColor = i; }));
    b.append(grid);
    row(b, model.label, `${model.place} · ${already ? "Already unlocked. Restyle for free." : `${model.cost} game cash.`}`,
      button(already ? "Restyle and place" : `Place · ${model.cost} game cash`, () => {
        const label = marketName.trim() || already?.name || model.label;
        if (!placeMarketItem(state, id, label, marketColor)) { report("You don’t have enough game cash in your wallet."); return; }
        marketName = ""; save(); report(`Placed ${label} in your virtual apartment. No real purchase.`); render();
      }, { disabled: !already && state.cash < model.cost }));
    for (const [key, saved] of Object.entries(state.marketItems)) {
      const m = MARKET_MODELS[key];
      row(b, saved.name, `${MARKET_COLORS[saved.color].name} · ${m.place}`, button(`See ${saved.name}`, () => {
        walk(m.spot); closePanel();
      }));
    }
  }
  function render() {
    if (!active) return;
    stopSkit?.(); stopSkit = null;
    const old = mount.closest(".sheet-body")?.scrollTop || 0;
    const focused = document.activeElement;
    const focusLabel = mount.contains(focused) && focused?.tagName === "BUTTON" ? focused.textContent : "";
    mount.replaceChildren();
    const hero = el("header", undefined, "life-hero");
    hero.append(el("p", "LOCAL SAVE · PRIVATE GAME MODE", "life-kicker"),
      el("h3", "Apartment Life"), el("p", `${state.cash.toLocaleString()} game cash · Bond Lv ${skillLevel(state, "bond")}`, "life-balance"));
    mount.append(hero);
    const nav = el("nav", undefined, "life-tabs"); nav.setAttribute("aria-label", "Life Sim activities");
    for (const [id, name] of Object.entries(TABS)) {
      const current = tab === id || (tab === "lab" && id === "study");
      const b = button(name, () => { if (id !== tab) open(id); }, { primary: current });
      b.setAttribute("aria-current", current ? "page" : "false"); nav.append(b);
    }
    mount.append(nav);
    const notice = el("p", `${storageOK ? "" : "Local saving is unavailable. "}${note}`, "life-inline-note");
    notice.id = "lifePanelNotice";
    notice.setAttribute("role", "status"); mount.append(notice);
    ({ home, jobs, study: studyPanel, together, wardrobe, shop, routine, stories, yard, bank, lab: projectLab })[tab](mount);
    if (old && mount.closest(".sheet-body")) mount.closest(".sheet-body").scrollTop = old;
    if (focusLabel) [...mount.querySelectorAll("button:not(:disabled)")].find((b) => b.textContent === focusLabel)?.focus({ preventScroll: true });
  }
  function liveStatus() {
    return { active, tab, cash: state.cash, outfit: state.outfit, xp: { ...state.xp }, bond: state.bond, jobs: state.jobs, upgrades: [...state.upgrades],
      player: figures.player.position.toArray(), jobStep: pending?.index, study: study?.remaining || 0 };
  }
  return { enter, leave, open, hit, walkRoom, liveStatus, pauseSignals, prefillLabFromIdea, get active() { return active; } };
}
