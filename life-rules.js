import { restoreStoryProgress } from "./life-stories.js";
import { cleanProject, PROJECT_DRILLS, CREATOR_STEPS, cleanSkit } from "./life-projects.js";

export const SKILLS = {
  home: "Homemaking", tech: "Technology", intuition: "Intuition", play: "Games",
  herTech: "Aimmianna's studies", herArt: "Aimmianna's creativity",
};
export const OUTFITS = {
  dusk: { name: "Dusk tee", color: 0x54546d, pants: 0x222336, cost: 0, cut: 0 },
  jacket: { name: "Midnight jacket", color: 0x25242d, pants: 0x30303e, cost: 48, cut: 1 },
  violet: { name: "Violet streetwear", color: 0x643f92, pants: 0x252035, cost: 95, cut: 2 },
  formal: { name: "Garnet evening suit", color: 0x743143, pants: 0x22181d, cost: 165, cut: 1, needs: ["bond", 3] },
  frost: { name: "Frost utility coat", color: 0x466578, pants: 0x273442, cost: 245, cut: 2, needs: ["tech", 3] },
};
/* Tony's own wardrobe, for his Tripo 3D figure. His model is one mesh with
   one texture, so a hoodie colour is a tint that washes over the whole
   figure (tint) — the solid colour is what the built-in figure wears.
   Chains are real 3D pieces hung on the figure. Pants and boots are baked
   into his model and need a new export to change on their own. */
export const TONY_HOODIES = [
  { id: "black", label: "Black skull hoodie", tint: 0xffffff, solid: 0x1a1a1f },
  { id: "red", label: "Blood red skull hoodie", tint: 0xd8a0a0, solid: 0x6e2b2b },
  { id: "violet", label: "Deep violet skull hoodie", tint: 0xa8a0d8, solid: 0x4a2d6e },
  { id: "blue", label: "Midnight blue skull hoodie", tint: 0x90a8d8, solid: 0x2b3a6e },
  { id: "green", label: "Forest skull hoodie", tint: 0x9ac8a0, solid: 0x2b4a34 },
];
export const TONY_CHAINS = [
  { id: "none", label: "No chain" },
  { id: "chain", label: "Silver chain" },
  { id: "cross", label: "Gothic cross necklace" },
  { id: "both", label: "Chain + cross necklace" },
];
export const UPGRADES = {
  lamp: { name: "Amber floor lamp", cost: 75, note: "Adds a warm pool of light to the lounge." },
  rug: { name: "Garnet lounge rug", cost: 110, note: "Adds a garnet rug beside the seating area." },
  playerPhone: { name: "Your upgraded phone", cost: 135, note: "Unlocks Rush gigs, a faster and better-paid shift." },
  herPhone: { name: "Aimmianna's upgraded phone", cost: 145, note: "Unlocks a new check-in scene and bonus bond from check-ins." },
  computer: { name: "Dual-screen workstation", cost: 190, needs: ["tech", 2], note: "Adds a display, cuts study time to 16 seconds, and adds advanced workshops to the daily lesson rotation." },
  herComputer: { name: "Aimmianna's study laptop", cost: 205, needs: ["herTech", 2], note: "Adds a laptop and gives her extra in-game study XP." },
  tv: { name: "Cinema light kit", cost: 240, needs: ["bond", 3], note: "Lights the TV surround and boosts movie-night bond." },
  kitchen: { name: "Coffee station", cost: 160, needs: ["home", 2], note: "Adds a coffee kit and raises pay on kitchen jobs." },
  studio: { name: "Violet game console", cost: 310, needs: ["play", 3], note: "Adds a console under the TV and raises card-game rewards." },
  archive: { name: "Fieldwork shelf", cost: 265, needs: ["intuition", 3], note: "Adds an evidence display and raises ghost-case rewards." },
};
export const MARKET_MODELS = {
  board: { label: "Skateboard wall display", cost: 40, place: "Living room wall", spot: "living_center" },
  planter: { label: "Flower planter", cost: 35, place: "Outside yard", spot: "yard_center" },
  records: { label: "Record crate", cost: 45, place: "Beside the stereo", spot: "stereo" },
};
export const MARKET_COLORS = [
  { name: "Oxide black", hex: 0x322832 }, { name: "Distressed plum", hex: 0x815175 },
  { name: "Forest green", hex: 0x44694e }, { name: "Warm walnut", hex: 0x946443 },
];
const JOBS = [
  { name: "Dinner for two", skill: "home", spot: "kitchen_table", order: ["Gather ingredients", "Cook dinner", "Set the table"], clue: "Start with ingredients, then cook, then set the table." },
  { name: "Coffee shift", skill: "home", spot: "coffee", order: ["Grind beans", "Brew coffee", "Serve cups"], clue: "Grind first, brew next, serve last." },
  { name: "Home network tune-up", skill: "tech", spot: "pc", order: ["Check connection", "Apply settings", "Test the result"], clue: "Check what's wrong before changing settings and testing." },
  { name: "Movie-night setup", skill: "play", spot: "couch", order: ["Set the lights", "Ready the snacks", "Start the feature"], clue: "Set the mood first, then get snacks, then start the film." },
  { name: "Apartment reset", skill: "home", spot: "living_center", order: ["Collect clutter", "Clear surfaces", "Put things away"], clue: "Collect clutter, clear surfaces, then put everything away." },
  { name: "Digital archive shift", skill: "tech", spot: "pc", order: ["Sort the files", "Make a backup", "Verify the copy"], clue: "Sort the files first, make the backup, then verify it." },
];
const LEVEL_BLOCK = 24;
const owns = (obj, key) => Object.hasOwn(obj, key);
const safeCount = (x, fallback = 0) => Number.isSafeInteger(x) && x >= 0 ? Math.min(x, 1e9) : fallback;
const pickKeys = (arr, catalog) => Array.isArray(arr) ? [...new Set(arr.filter((id) => owns(catalog, id)))] : [];
const clampInt = (x, max, fallback) => Number.isSafeInteger(x) && x >= 0 && x <= max ? x : fallback;
export function freshLife() {
  return {
    version: 1, player: { name: "Me", skin: 2, hair: 0, style: 0 }, cash: 0, bond: 0,
    xp: Object.fromEntries(Object.keys(SKILLS).map((key) => [key, 0])),
    owned: ["dusk"], outfit: "dusk", tonyStyle: { hoodie: "black", chain: "none" }, upgrades: [], jobs: 0, moments: 0, movieNights: 0, lastNight: "", notes: [],
    lessons: 0, lastLesson: "", lastLessonTitle: "", takeaways: [], lastRealMoment: "", reflections: [],
    dinners: 0, routineLog: [], stories: {}, yardShifts: 0, lastYardShift: "", projects: [],
    jar: 0, savingsGoal: 0, paidProjects: [], marketItems: {}, labDone: [], labPlans: [], creatorNotes: {}, skit: cleanSkit(null),
  };
}
export function loadLife(raw) {
  const out = freshLife();
  try {
    const src = JSON.parse(raw);
    if (!src || src.version !== 1) return out;
    const name = typeof src.player?.name === "string" ? src.player.name.trim().slice(0, 24) : "";
    out.player = { name: name || "Me", skin: clampInt(src.player?.skin, 5, 2), hair: clampInt(src.player?.hair, 4, 0), style: clampInt(src.player?.style, 2, 0) };
    for (const k of ["cash", "bond", "jobs", "moments", "movieNights", "lessons", "dinners", "yardShifts"]) out[k] = safeCount(src[k]);
    for (const key of Object.keys(SKILLS)) out.xp[key] = safeCount(src.xp?.[key]);
    out.owned = [...new Set(["dusk", ...pickKeys(src.owned, OUTFITS)])];
    out.outfit = out.owned.includes(src.outfit) ? src.outfit : "dusk";
    const ts = src.tonyStyle || {};
    out.tonyStyle = {
      hoodie: TONY_HOODIES.some((h) => h.id === ts.hoodie) ? ts.hoodie : "black",
      chain: TONY_CHAINS.some((c) => c.id === ts.chain) ? ts.chain : "none",
    };
    out.upgrades = pickKeys(src.upgrades, UPGRADES);
    out.lastNight = typeof src.lastNight === "string" ? src.lastNight.slice(0, 16) : "";
    out.notes = Array.isArray(src.notes) ? src.notes.filter((x) => typeof x === "string").slice(0, 8).map((x) => x.slice(0, 170)) : [];
    out.lastLesson = typeof src.lastLesson === "string" ? src.lastLesson.slice(0, 16) : "";
    out.lastLessonTitle = typeof src.lastLessonTitle === "string" ? src.lastLessonTitle.slice(0, 80) : "";
    out.takeaways = Array.isArray(src.takeaways) ? src.takeaways.filter((x) => x && typeof x.title === "string" && typeof x.text === "string").slice(0, 24)
      .map(({ title, text }) => ({ title: title.slice(0, 80), text: text.slice(0, 420) })) : [];
    out.lastRealMoment = typeof src.lastRealMoment === "string" ? src.lastRealMoment.slice(0, 16) : "";
    out.reflections = Array.isArray(src.reflections) ? src.reflections.filter((x) => typeof x === "string").slice(0, 8).map((x) => x.slice(0, 200)) : [];
    out.routineLog = Array.isArray(src.routineLog) ? src.routineLog.filter((x) =>
      x && ["Dinner", "Water", "Movement break"].includes(x.kind) && Number.isFinite(x.at) && x.at > 0 && x.at <= 8.64e15
    ).slice(0, 15).map(({ kind, at }) => ({ kind, at })) : [];
    out.stories = restoreStoryProgress(src.stories);
    out.lastYardShift = typeof src.lastYardShift === "string" ? src.lastYardShift.slice(0, 16) : "";
    out.projects = Array.isArray(src.projects) ? src.projects.filter((x) => typeof x === "string").slice(0, 12).map((x) => x.slice(0, 160)) : [];
    out.jar = safeCount(src.jar);
    out.savingsGoal = safeCount(src.savingsGoal);
    out.paidProjects = Array.isArray(src.paidProjects) ? src.paidProjects.filter((x) =>
      x && typeof x.label === "string" && x.label.trim() && Number.isSafeInteger(x.cents) && x.cents > 0 && x.cents <= 99999999 &&
      Number.isSafeInteger(x.at) && x.at > 0 && x.at <= 8.64e15
    ).slice(0, 16).map(({ label, cents, at }) => ({ label: label.slice(0, 80), cents, at })) : [];
    for (const id of Object.keys(MARKET_MODELS)) {
      const item = src.marketItems?.[id];
      if (typeof item?.name === "string" && item.name.trim())
        out.marketItems[id] = { name: item.name.trim().slice(0, 50), color: clampInt(item.color, MARKET_COLORS.length - 1, 0) };
    }
    out.labDone = Array.isArray(src.labDone) ? PROJECT_DRILLS.filter((d) => src.labDone.includes(d.id)).map((d) => d.id) : [];
    out.labPlans = Array.isArray(src.labPlans) ? src.labPlans.slice(0, 16).map(cleanProject).filter((p) => p.id && p.name).slice(0, 8) : [];
    for (const { id } of CREATOR_STEPS) {
      const note = src.creatorNotes?.[id];
      if (typeof note === "string" && note.trim().length >= 8) out.creatorNotes[id] = note.trim().slice(0, 260);
    }
    out.skit = cleanSkit(src.skit);
  } catch { /* A malformed save never breaks the companion app. */ }
    return out;
}
export function skillLevel(state, id) {
  const n = id === "bond" ? state.bond : state.xp[id] || 0;
  return 1 + Math.floor(Math.sqrt(n / (id === "bond" ? 10 : LEVEL_BLOCK)));
}
export function nextLevelAt(state, id) {
  return skillLevel(state, id) ** 2 * (id === "bond" ? 10 : LEVEL_BLOCK);
}
export function reward(state, { cash = 0, bond = 0, skill, xp = 0, label }) {
  state.cash = Math.min(1e9, state.cash + cash);
  state.bond = Math.min(1e9, state.bond + bond);
  if (owns(SKILLS, skill)) state.xp[skill] = Math.min(1e9, state.xp[skill] + xp);
  const receipt = [label, cash ? `+${cash} game cash` : "", xp && owns(SKILLS, skill) ? `+${xp} ${SKILLS[skill]} XP` : "", bond ? `+${bond} bond` : ""].filter(Boolean).join(" · ");
  if (label) state.notes = [receipt, ...state.notes].slice(0, 8);
  return receipt;
}
export function buy(state, id, type = "upgrade") {
  const wardrobe = type === "outfit", catalog = wardrobe ? OUTFITS : UPGRADES;
  if (!owns(catalog, id)) return false;
  const entry = catalog[id], inventory = wardrobe ? state.owned : state.upgrades;
  if (inventory.includes(id) || state.cash < entry.cost || (entry.needs && skillLevel(state, entry.needs[0]) < entry.needs[1])) return false;
  state.cash -= entry.cost;
  inventory.push(id);
  return true;
}
export function moveGameCash(state, amount, intoJar) {
  const source = intoJar ? "cash" : "jar", target = intoJar ? "jar" : "cash";
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > state[source] || state[target] + amount > 1e9) return false;
  state[source] -= amount; state[target] += amount;
  return true;
}
export function centsFromInput(value) {
  const match = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(value.trim());
  return match ? Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0")) : 0;
}
export function placeMarketItem(state, id, name, color) {
  if (!owns(MARKET_MODELS, id) || typeof name !== "string" || !name.trim()) return false;
  const cost = owns(state.marketItems, id) ? 0 : MARKET_MODELS[id].cost;
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.marketItems[id] = { name: name.trim().slice(0, 50), color: clampInt(color, MARKET_COLORS.length - 1, 0) };
  return true;
}
export function currentJob(state, rush = false) {
  const template = JOBS[state.jobs % JOBS.length];
  const rank = 1 + Math.floor(state.jobs / JOBS.length);
  return { ...template, rank, cash: 52 + 5 * Math.min(12, rank - 1) + 3 * (skillLevel(state, template.skill) - 1)
    + (rush ? 20 : 0) + (template.skill === "home" && state.upgrades.includes("kitchen") ? 15 : 0) };
}
export function videoUrl(value) {
  try {
    const input = new URL(value);
    if (input.protocol !== "https:" || input.username || input.password || input.port) return null;
    const path = input.pathname.split("/").filter(Boolean), host = input.hostname;
    if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"].includes(host)) {
      const id = host === "youtu.be" ? path[0] : path[0] === "watch" ? input.searchParams.get("v") : ["shorts", "live"].includes(path[0]) ? path[1] : null;
      return typeof id === "string" && /^[\w-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
    }
    if (["primevideo.com", "www.primevideo.com"].includes(host) || (["amazon.com", "www.amazon.com"].includes(host) && /^\/(?:gp\/video|primevideo)(?:\/|$)/.test(input.pathname)))
      return `${input.origin}${input.pathname}`;
  } catch { /* invalid URL */ }
  return null;
}
