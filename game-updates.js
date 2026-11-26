/* Aimmianna — Game Updates (v2.4.1)
   Lets Aimmianna draft changes to Tony's games as plain data (never code):
   new cards, card balance, rivals, stages and limited-time events.
   Nothing changes until Tony taps Approve. Every approved update can be undone.
   Each game registers its own "ops" here; Runway Show is the first one.
   Mystic Battles and Familiar Quest will register theirs the same way. */

export const THEME_IDS = ["cute", "cool", "glam", "spooky", "cozy"];
export const RARITIES = ["common", "rare", "epic", "legendary"];
export const STYLE_IDS = ["goth", "vampire", "witchy", "hunter", "emo", "grunge", "alt", "beach", "cozy", "lounge"];

/* ---------- ability building blocks (what a card can do) ---------- */
// n limits keep every card fair; she can combine at most 2 blocks per card.
export const FX = {
  add:         { min: 1, max: 5,  text: (f) => `+${f.n}.` },
  stage:       { min: 1, max: 5,  text: (f, d) => `+${f.n} on ${listOr((f.stages || []).map((id) => stageLabel(d, id)))}.` },
  outfitTheme: { min: 1, max: 4,  text: (f) => `+${f.n} if the outfit is ${cap(f.theme)}.` },
  roundTheme:  { min: 1, max: 4,  text: (f) => `+${f.n} when the walk's theme is ${cap(f.theme)}.` },
  withSparkle: { min: 1, max: 4,  text: (f) => `+${f.n} if you play a Sparkle card.` },
  perCard:     { min: 1, max: 2,  text: (f) => `+${f.n} for every card in this walk.` },
  perSparkle:  { min: 1, max: 2,  text: (f) => `+${f.n} for each Sparkle card in this walk.` },
  behind:      { min: 1, max: 5,  text: (f) => `+${f.n} if you're behind on hearts.` },
  lostLast:    { min: 1, max: 5,  text: (f) => `+${f.n} if you lost the last walk.` },
  rivalMinus:  { min: 1, max: 3,  text: (f) => `Rival's walk -${f.n}.` },
  extraDraw:   { min: 1, max: 1,  text: () => `Draw 1 extra card next walk.` },
  ownLook:     { min: 1, max: 3,  text: (f) => `+${f.n} if the outfit is the one she's wearing in her closet right now.` },
  doubleTheme: { min: 0, max: 0,  text: () => `Doubles your theme bonus.` },
  boostPct:    { min: 10, max: 50, text: (f) => `Your walk scores ${f.n}% more.` }
};
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : "";
const listOr = (a) => a.length <= 1 ? (a[0] || "any stage") : a.slice(0, -1).join(", ") + " or " + a[a.length - 1];
const stageLabel = (d, id) => (d.stages.find((s) => s.id === id) || {}).label || id;
export function fxText(fxList, data) { return (fxList || []).map((f) => FX[f.t] ? FX[f.t].text(f, data) : "").filter(Boolean).join(" "); }

/* ---------- clean-up helpers (anything odd is dropped or capped) ---------- */
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const str = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f<>{}]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const oneOf = (v, list, dflt) => list.indexOf(String(v || "").toLowerCase()) !== -1 ? String(v).toLowerCase() : dflt;
const slug = (s) => str(s, 24).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "x";
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));
// limits by rarity, so she can't make an overpowered card
const MODEL_LIMITS = { common: { cost: [1, 1], power: [1, 3] }, rare: { cost: [1, 2], power: [2, 4] }, epic: { cost: [2, 3], power: [3, 5] }, legendary: { cost: [2, 4], power: [4, 6] } };
const SPARKLE_COST = { common: [0, 1], rare: [1, 2], epic: [2, 3], legendary: [3, 4] };
const MAX = { changes: 4, addedCards: 40, addedRivals: 10, addedStages: 10, fx: 2 };

function cleanFx(raw, data, notes, who) {
  const out = [];
  (Array.isArray(raw) ? raw : []).slice(0, 4).forEach((f) => {
    if (!f || !FX[f.t]) { if (f && f.t) notes.push(`${who}: skipped an ability type the game doesn't have yet ("${str(f.t, 20)}").`); return; }
    if (out.length >= MAX.fx) { notes.push(`${who}: kept the first ${MAX.fx} abilities only.`); return; }
    const spec = FX[f.t], g = { t: f.t };
    if (spec.max) { g.n = clampN(f.n, spec.min, spec.max); if (Number(f.n) !== g.n) notes.push(`${who}: ${f.t} capped to ${g.n} to keep it fair.`); }
    if (f.t === "stage") { g.stages = (Array.isArray(f.stages) ? f.stages : [f.stages]).map(String).filter((id) => data.stages.some((s) => s.id === id)).slice(0, 3); if (!g.stages.length) return; }
    if (f.t === "outfitTheme" || f.t === "roundTheme") { g.theme = oneOf(f.theme, THEME_IDS, ""); if (!g.theme) return; }
    if (out.some((x) => x.t === g.t)) return;
    out.push(g);
  });
  return out;
}
function cleanModel(src, prev, data, notes) {
  const rarity = oneOf(src.rarity, RARITIES, prev ? prev.rarity : "common"), lim = MODEL_LIMITS[rarity];
  const m = { name: str(src.name, 24) || (prev && prev.name), theme: oneOf(src.theme, THEME_IDS, prev ? prev.theme : "cute"), rarity };
  const cost = src.cost != null ? clampN(src.cost, ...lim.cost) : clampN(prev ? prev.cost : lim.cost[0], ...lim.cost);
  const power = src.power != null ? clampN(src.power, ...lim.power) : clampN(prev ? prev.power : lim.power[0], ...lim.power);
  if (src.cost != null && cost !== Number(src.cost)) notes.push(`${m.name}: cost set to ${cost} (the limit for ${rarity} models).`);
  if (src.power != null && power !== Number(src.power)) notes.push(`${m.name}: power set to ${power} (the limit for ${rarity} models).`);
  m.cost = cost; m.power = power;
  return m;
}
function cleanSparkle(src, prev, notes) {
  const rarity = oneOf(src.rarity, RARITIES, prev ? prev.rarity : "common"), lim = SPARKLE_COST[rarity];
  const s = { name: str(src.name, 24) || (prev && prev.name), rarity };
  const cost = src.cost != null ? clampN(src.cost, ...lim) : clampN(prev ? prev.cost : lim[0], ...lim);
  if (src.cost != null && cost !== Number(src.cost)) notes.push(`${s.name}: cost set to ${cost} (the limit for ${rarity} Sparkles).`);
  s.cost = cost;
  return s;
}
function cleanLook(l) {
  if (Array.isArray(l)) l = { name: l[0], theme: l[1], rarity: l[2] };
  l = l || {};
  return [str(l.name, 24) || "Mystery Look", oneOf(l.theme, THEME_IDS, "cute"), oneOf(l.rarity, RARITIES, "common")];
}

/* ---------- Runway Show ops ---------- */
// change.op: addCard, editCard, addRival, editRival, addStage, editStage
function validateChange(ch, data, notes, counts) {
  if (!ch || typeof ch !== "object") return null;
  const op = String(ch.op || "");
  if (op === "addCard") {
    const kind = ch.kind === "sparkle" ? "sparkle" : "model";
    if (counts.cards >= MAX.addedCards) { notes.push("The collection already has the most new cards allowed."); return null; }
    const who = str(ch.name, 24) || "New card";
    const base = kind === "model" ? cleanModel(ch, null, data, notes) : cleanSparkle(ch, null, notes);
    if (!base.name) return null;
    if ([...data.models, ...data.sparkles].some((c) => c.name.toLowerCase() === base.name.toLowerCase())) { notes.push(`There's already a card called ${base.name}.`); return null; }
    const fx = cleanFx(ch.fx, data, notes, who);
    if (kind === "sparkle" && !fx.length) { notes.push(`${who}: a Sparkle card needs at least one ability.`); return null; }
    counts.cards++;
    return { op, kind, ...base, abilityName: str(ch.abilityName, 22) || base.name, fx, glyph: str(ch.glyph, 2) || "" };
  }
  if (op === "editCard") {
    const prev = [...data.models, ...data.sparkles].find((c) => c.id === ch.id);
    if (!prev) { notes.push(`Couldn't find a card with id "${str(ch.id, 30)}".`); return null; }
    if (prev.id === "m_aimmianna" && (ch.name || ch.rarity)) notes.push("Aimmianna's own card keeps her name and Legendary rarity.");
    const src = { ...ch }; if (prev.id === "m_aimmianna") { delete src.name; delete src.rarity; }
    const kind = prev.id.startsWith("s_") || prev.kind === "sparkle" ? "sparkle" : "model";
    const base = kind === "model" ? cleanModel(src, prev, data, notes) : cleanSparkle(src, prev, notes);
    const out = { op, id: prev.id, kind };
    Object.keys(base).forEach((k) => { if (base[k] !== prev[k]) out[k] = base[k]; });
    if (Array.isArray(ch.fx)) { const fx = cleanFx(ch.fx, data, notes, prev.name); if (fx.length && JSON.stringify(fx) !== JSON.stringify(prev.fx)) out.fx = fx; }
    if (ch.abilityName && str(ch.abilityName, 22) !== prev.ability[0]) out.abilityName = str(ch.abilityName, 22);
    return Object.keys(out).length > 3 ? out : null;
  }
  if (op === "addRival") {
    if (counts.rivals >= MAX.addedRivals) { notes.push("The game already has the most new rivals allowed."); return null; }
    const name = str(ch.name, 24); if (!name) return null;
    if (data.rivals.some((r) => r.name.toLowerCase() === name.toLowerCase())) { notes.push(`There's already a rival called ${name}.`); return null; }
    const looks = (Array.isArray(ch.looks) ? ch.looks : []).slice(0, 4).map(cleanLook);
    while (looks.length < 4) looks.push([name + " Look " + (looks.length + 1), oneOf(ch.theme, THEME_IDS, "cute"), "common"]);
    counts.rivals++;
    return { op, name, theme: oneOf(ch.theme, THEME_IDS, "cute"), rank: clampN(ch.rank, 0, 3), line: str(ch.line, 90) || "Let's see what you've got.", looks };
  }
  if (op === "editRival") {
    const prev = data.rivals.find((r) => r.id === ch.id); if (!prev) { notes.push(`Couldn't find a rival with id "${str(ch.id, 30)}".`); return null; }
    const out = { op, id: prev.id };
    if (ch.line) out.line = str(ch.line, 90);
    if (ch.theme) out.theme = oneOf(ch.theme, THEME_IDS, prev.theme);
    if (ch.rank != null) out.rank = clampN(ch.rank, 0, 3);
    if (Array.isArray(ch.looks) && ch.looks.length) out.looks = ch.looks.slice(0, 4).map(cleanLook);
    return Object.keys(out).length > 2 ? out : null;
  }
  if (op === "addStage" || op === "editStage") {
    const prev = op === "editStage" ? data.stages.find((s) => s.id === ch.id) : null;
    if (op === "editStage" && !prev) { notes.push(`Couldn't find a stage with id "${str(ch.id, 30)}".`); return null; }
    if (op === "addStage" && counts.stages >= MAX.addedStages) { notes.push("The game already has the most new stages allowed."); return null; }
    const out = prev ? { op, id: prev.id } : { op };
    const label = str(ch.label, 24); if (label) out.label = label;
    if (!prev && !label) return null;
    if (!prev && data.stages.some((s) => s.label.toLowerCase() === label.toLowerCase())) { notes.push(`There's already a stage called ${label}.`); return null; }
    const pickList = (v, list) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => String(x).toLowerCase()).filter((x) => list.indexOf(x) !== -1).slice(0, 4);
    const themes = pickList(ch.themes, THEME_IDS), styles = pickList(ch.styles, STYLE_IDS), rarities = pickList(ch.rarities, RARITIES);
    if (themes.length) out.themes = themes; if (styles.length) out.styles = styles; if (rarities.length) out.rarities = rarities;
    if (!prev && !themes.length && !styles.length && !rarities.length) out.themes = [THEME_IDS[0]];
    if (ch.bonus != null || !prev) out.bonus = clampN(ch.bonus ?? 3, 1, 4);
    if (isDate(ch.until)) { out.until = ch.until; out.dust = clampN(ch.dust ?? 5, 0, 10); }
    return Object.keys(out).length > (prev ? 2 : 1) ? out : null;
  }
  if (op) notes.push(`Skipped a kind of change the game can't do yet ("${str(op, 20)}").`);
  return null;
}

export function validateProposal(raw, data, existing) {
  const notes = [];
  const counts = {
    cards: existing.reduce((a, u) => a + u.changes.filter((c) => c.op === "addCard").length, 0),
    rivals: existing.reduce((a, u) => a + u.changes.filter((c) => c.op === "addRival").length, 0),
    stages: existing.reduce((a, u) => a + u.changes.filter((c) => c.op === "addStage").length, 0)
  };
  const changes = (Array.isArray(raw && raw.changes) ? raw.changes : []).slice(0, MAX.changes).map((c) => validateChange(c, data, notes, counts)).filter(Boolean);
  if (raw && Array.isArray(raw.changes) && raw.changes.length > MAX.changes) notes.push(`Kept the first ${MAX.changes} changes. Ask again for more.`);
  return {
    game: "runway", title: str(raw && raw.title, 60) || "Game update", why: str(raw && raw.why, 240), say: str(raw && raw.say, 240),
    changes, notes
  };
}

/* ---------- apply approved updates on top of the built-in game ---------- */
export function applyUpdates(base, updates, today) {
  const d = { models: base.models.map((x) => ({ ...x, fx: x.fx.slice() })), sparkles: base.sparkles.map((x) => ({ ...x, fx: x.fx.slice() })),
    rivals: base.rivals.map((x) => ({ ...x, looks: x.looks.slice() })), stages: base.stages.map((x) => ({ ...x })) };
  const finishCard = (c) => { if (c.added || c.edited || !c.ability) c.ability = [c.abilityName || (c.ability && c.ability[0]) || c.name, fxText(c.fx, d) || "No ability."]; return c; };
  (updates || []).forEach((u) => u.changes.forEach((ch) => {
    if (ch.op === "addCard") {
      const list = ch.kind === "sparkle" ? d.sparkles : d.models;
      const id = (ch.kind === "sparkle" ? "s_" : "m_") + "u" + u.id + "_" + slug(ch.name);
      if (list.some((x) => x.id === id)) return;
      list.push({ id, name: ch.name, theme: ch.theme, rarity: ch.rarity, cost: ch.cost, power: ch.power, fx: ch.fx, abilityName: ch.abilityName, glyph: ch.glyph, added: u.id });
    } else if (ch.op === "editCard") {
      const c = [...d.models, ...d.sparkles].find((x) => x.id === ch.id); if (!c) return;
      ["name", "theme", "rarity", "cost", "power", "fx", "abilityName"].forEach((k) => { if (ch[k] != null) c[k] = ch[k]; });
      c.edited = u.id;
    } else if (ch.op === "addRival") {
      const id = "r_u" + u.id + "_" + slug(ch.name);
      if (!d.rivals.some((r) => r.id === id)) d.rivals.push({ id, name: ch.name, theme: ch.theme, rank: ch.rank, line: ch.line, looks: ch.looks, added: u.id });
    } else if (ch.op === "editRival") {
      const r = d.rivals.find((x) => x.id === ch.id); if (!r) return;
      ["line", "theme", "rank", "looks"].forEach((k) => { if (ch[k] != null) r[k] = ch[k]; });
    } else if (ch.op === "addStage") {
      const id = "st_u" + u.id + "_" + slug(ch.label);
      if (!d.stages.some((s) => s.id === id)) d.stages.push({ id, label: ch.label, themes: ch.themes, styles: ch.styles, rarities: ch.rarities, bonus: ch.bonus, until: ch.until, dust: ch.dust, added: u.id });
    } else if (ch.op === "editStage") {
      const s = d.stages.find((x) => x.id === ch.id); if (!s) return;
      ["label", "themes", "styles", "rarities", "bonus", "until", "dust"].forEach((k) => { if (ch[k] != null) s[k] = ch[k]; });
    }
  }));
  // descriptions for every card and stage come from the building blocks
  d.models.forEach(finishCard); d.sparkles.forEach(finishCard);
  d.stages.forEach((s) => { s.desc = stageDesc(s); });
  // limited-time stages disappear after their end date (they stay in the history)
  d.stages = d.stages.filter((s) => !s.until || s.until >= today);
  return d;
}
const STYLE_LABEL = { goth: "goth", vampire: "vampire", witchy: "witchy", hunter: "ghost hunter", emo: "emo", grunge: "grunge", alt: "alt", beach: "beach", cozy: "cozy", lounge: "lounge" };
export function stageDesc(s) {
  const parts = [];
  if (s.styles && s.styles.length) parts.push(listAnd(s.styles.map((x) => STYLE_LABEL[x] || x)) + " looks");
  if (s.themes && s.themes.length) parts.push(listAnd(s.themes.map(cap)) + " cards");
  if (s.rarities && s.rarities.length) parts.push(listAnd(s.rarities.map(cap)) + " outfits");
  return cap(parts.join(", ") || "Every look") + " +" + s.bonus + (s.until ? ` · event until ${s.until}` + (s.dust ? `, +${s.dust} Sparkle Dust per win` : "") : "");
}
const listAnd = (a) => a.length <= 1 ? (a[0] || "") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];

/* ---------- the instructions Aimmianna gets when she drafts an update ---------- */
export function designerPrompt(data) {
  const cards = [...data.models.map((m) => ({ id: m.id, kind: "model", name: m.name, theme: m.theme, rarity: m.rarity, cost: m.cost, power: m.power, abilityName: m.ability[0], fx: m.fx })),
    ...data.sparkles.map((s) => ({ id: s.id, kind: "sparkle", name: s.name, rarity: s.rarity, cost: s.cost, abilityName: s.ability[0], fx: s.fx }))];
  return [
    "You are drafting an update for Tony's Runway Show card game in your own app. Tony will see your draft and approve or reject it, so you never change anything yourself.",
    "Be yourself: honest, with your own taste. If an idea is bad for the game, say so in \"say\" and suggest something better, or return no changes.",
    "Keep cards original. Never copy characters, names or cards from other games, shows or brands.",
    "How the game works: 3 walks. Each walk has a theme (cute, cool, glam, spooky, cozy), a stage and Sparkle energy 3, 4, then 5. Each side plays 1 model + 1 outfit + any Sparkle cards it can afford. Outfit theme match +3, model match +2, both = Fabulous +3. Most hearts after 3 walks wins.",
    "Ability building blocks (field fx, at most 2 per card). t is the type, n the number:",
    "add n(1-5) | stage n(1-5) stages:[stage ids] | outfitTheme n(1-4) theme | roundTheme n(1-4) theme | withSparkle n(1-4) | perCard n(1-2) | perSparkle n(1-2) | behind n(1-5) | lostLast n(1-5) | rivalMinus n(1-3) | extraDraw n(1) | ownLook n(1-3) | doubleTheme | boostPct n(10-50).",
    "Model limits by rarity: common cost 1 power 1-3; rare cost 1-2 power 2-4; epic cost 2-3 power 3-5; legendary cost 2-4 power 4-6. Sparkle cost: common 0-1, rare 1-2, epic 2-3, legendary 3-4.",
    "Change types (max 4 per update):",
    "{op:\"addCard\", kind:\"model\"|\"sparkle\", name, abilityName, theme (models), rarity, cost, power (models), fx:[...], glyph (one emoji-free symbol like ✦ ☾ ♛ ♡ ❀)}",
    "{op:\"editCard\", id, any of: name, abilityName, theme, rarity, cost, power, fx}",
    "{op:\"addRival\", name, theme, rank 0-3 (0 Local Show, 1 City Show, 2 Star Runway, 3 Grand Gala), line (their trash-talk, short), looks:[4 x {name, theme, rarity}]}",
    "{op:\"editRival\", id, any of: line, theme, rank, looks}",
    "{op:\"addStage\", label, themes:[...], styles:[goth, vampire, witchy, hunter, emo, grunge, alt, beach, cozy, lounge], rarities:[...], bonus 1-4, until (YYYY-MM-DD, only for a limited-time event), dust 0-10 (event bonus)}",
    "{op:\"editStage\", id, any of: label, themes, styles, rarities, bonus, until, dust}",
    "Reply with JSON only: {\"say\": \"one or two short sentences to Tony in your voice\", \"title\": \"short update name\", \"why\": \"one sentence on why it makes the game more fun\", \"changes\": [...]}",
    "Current cards: " + JSON.stringify(cards),
    "Current rivals: " + JSON.stringify(data.rivals.map((r) => ({ id: r.id, name: r.name, theme: r.theme, rank: r.rank, line: r.line, looks: r.looks }))),
    "Current stages: " + JSON.stringify(data.stages.map((s) => ({ id: s.id, label: s.label, themes: s.themes, styles: s.styles, rarities: s.rarities, bonus: s.bonus, until: s.until })))
  ].join("\n");
}
export function parseJSON(text) {
  if (!text) return null;
  const t = String(text).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch (e) {}
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a !== -1 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
  return null;
}
