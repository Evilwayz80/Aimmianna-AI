/* Aimmianna — Runway Show card game (v2.4.0)
   - Every closet outfit she has kept at least once becomes an Outfit card.
   - Model cards (original characters) and Sparkle cards (quick tricks) are won
     from shows and the daily gift box.
   - Runway Show: 3 walks, each with a theme and a stage. Pick one model, one
     outfit and any Sparkle cards you can afford, then the crowd scores both
     walks. Most hearts after 3 walks wins.
   - Cards earn star levels (1 to 5) from shows; Sparkle Dust polishes them.
   Everything here is play-only. No real money, no real purchases.
   v2.4.1: card abilities are building blocks (fx) so Aimmianna can draft
   game updates (game-updates.js) that Tony approves or undoes. */
import { applyUpdates, validateProposal, designerPrompt, parseJSON, fxText } from "./game-updates.js";

const THEMES = {
  cute:   { label: "Cute",   color: "#ff8fc8", glyph: "♡" },
  cool:   { label: "Cool",   color: "#5fb8ff", glyph: "✦" },
  glam:   { label: "Glam",   color: "#f1c75b", glyph: "♛" },
  spooky: { label: "Spooky", color: "#a77bff", glyph: "☾" },
  cozy:   { label: "Cozy",   color: "#e9a27a", glyph: "☕" }
};
const STYLE_THEME = { goth: "glam", vampire: "spooky", witchy: "spooky", hunter: "spooky", emo: "cool", grunge: "cool", alt: "cute", beach: "cute", cozy: "cozy", lounge: "cozy" };
const STAGES = [
  { id: "night",   label: "Night Party",   desc: "Goth, emo and grunge looks +2", styles: ["goth", "emo", "grunge"], bonus: 2 },
  { id: "beach",   label: "Beach Boardwalk", desc: "Beach looks +4", styles: ["beach"], bonus: 4 },
  { id: "candy",   label: "Candy Land",    desc: "Cute cards +3", themes: ["cute"], bonus: 3 },
  { id: "haunted", label: "Haunted Manor", desc: "Witchy, vampire and ghost hunter looks +3", styles: ["witchy", "vampire", "hunter"], bonus: 3 },
  { id: "gala",    label: "Grand Gala",    desc: "Epic and Legendary outfits +2", rarities: ["epic", "legendary"], bonus: 2 },
  { id: "cabin",   label: "Snowy Cabin",   desc: "Cozy looks +3", themes: ["cozy"], bonus: 3 }
];
const RANKS = [
  { id: "local", label: "Local Show",  wins: 0,  boost: 0, smart: 0.45 },
  { id: "city",  label: "City Show",   wins: 3,  boost: 1, smart: 0.65 },
  { id: "star",  label: "Star Runway", wins: 7,  boost: 2, smart: 0.8 },
  { id: "gala",  label: "Grand Gala",  wins: 12, boost: 3, smart: 0.95 }
];
const RARITY_STATS = { common: { cost: 1, power: 3 }, rare: { cost: 2, power: 5 }, epic: { cost: 3, power: 7 }, legendary: { cost: 4, power: 9 } };
const STAR_XP = [0, 3, 7, 12, 20];             // xp needed for 1..5 stars
const POLISH_COST = [10, 20, 35, 55];          // dust to add +2 xp, by current star
const STYLE_ABILITY = {
  goth:    ["Velvet Night", "+2 on Night Party or Grand Gala."],
  vampire: ["Blood Moon Allure", "Steals 2 points from the rival's walk."],
  witchy:  ["Moon Charm", "+1 now and you draw 1 extra card next walk."],
  hunter:  ["Spirit Flash", "+2 for each Sparkle card in this walk."],
  emo:     ["Heartache Encore", "+3 if you're behind on hearts."],
  grunge:  ["Mosh Pit", "+1 for every card in this walk."],
  alt:     ["Mix & Match", "Always counts as matching the theme."],
  beach:   ["Sun-Kissed", "+1, or +4 on the Beach Boardwalk."],
  cozy:    ["Comfy Calm", "This walk never scores below 9."],
  lounge:  ["Comfy Calm", "This walk never scores below 9."]
};
// Original characters (not from any other game or brand).
const MODELS = [
  { id: "m_aimmianna", fx: [{ t: "ownLook", n: 3 }], name: "Aimmianna",     theme: "glam",   rarity: "legendary", cost: 2, power: 4, art: "figure/aimmianna_human_fullbody.png",
    ability: ["Her Own Look", "+3 if the outfit is the one she's wearing in her closet right now."], starter: true },
  { id: "m_bunny", fx: [{ t: "outfitTheme", n: 1, theme: "cute" }],  name: "Velvet Bunny",     theme: "cute",   rarity: "common", cost: 1, power: 2, art: "cards/m_bunny.webp", ability: ["Hop On", "+1 if the outfit is Cute."], starter: true },
  { id: "m_mew", fx: [{ t: "add", n: 1 }],    name: "Midnight Mew",     theme: "cool",   rarity: "common", cost: 1, power: 2, art: "cards/m_mew.webp", ability: ["Cat Walk", "+1 on every stage."], starter: true },
  { id: "m_pip", fx: [{ t: "stage", n: 2, stages: ["night", "haunted"] }],    name: "Pip the Bat",      theme: "spooky", rarity: "rare",   cost: 1, power: 3, art: "cards/m_pip.webp", ability: ["Night Flutter", "+2 on Night Party or Haunted Manor."] },
  { id: "m_coral", fx: [{ t: "stage", n: 3, stages: ["beach"] }],  name: "Coral Sea-Pup",    theme: "cute",   rarity: "rare",   cost: 2, power: 3, art: "cards/m_coral.webp", ability: ["Splash Pose", "+3 on the Beach Boardwalk."] },
  { id: "m_ember", fx: [{ t: "withSparkle", n: 2 }],  name: "Ember Kit",        theme: "glam",   rarity: "rare",   cost: 2, power: 4, art: "cards/m_ember.webp", ability: ["Fox Fire", "+2 if you play a Sparkle card."] },
  { id: "m_lune", fx: [{ t: "stage", n: 2, stages: ["haunted", "gala"] }],   name: "Moth Princess Lune", theme: "spooky", rarity: "epic", cost: 2, power: 5, art: "cards/m_lune.webp", ability: ["Moonlit Wings", "+2 on Haunted Manor or Grand Gala."] },
  { id: "m_raven", fx: [{ t: "rivalMinus", n: 2 }],  name: "Duchess Raven",    theme: "glam",   rarity: "legendary", cost: 3, power: 6, art: "cards/m_raven.webp", ability: ["Rival's Stare", "Rival's walk -2."] }
];
const SPARKLES = [
  { id: "s_twirl", fx: [{ t: "add", n: 2 }],    name: "Runway Twirl",    rarity: "common", cost: 0, ability: ["Twirl", "+2."], glyph: "✺", starter: true },
  { id: "s_flash", fx: [{ t: "add", n: 3 }],    name: "Camera Flash",    rarity: "common", cost: 1, ability: ["Flash!", "+3."], glyph: "✸", starter: true },
  { id: "s_spot", fx: [{ t: "doubleTheme" }],     name: "Spotlight",       rarity: "rare",   cost: 2, ability: ["Spotlight", "Doubles your theme bonus."], glyph: "◎" },
  { id: "s_confetti", fx: [{ t: "add", n: 2 }, { t: "perCard", n: 1 }], name: "Confetti Blast",  rarity: "rare",   cost: 2, ability: ["Confetti", "+2, plus 1 for every card in this walk."], glyph: "❋" },
  { id: "s_encore", fx: [{ t: "lostLast", n: 4 }],   name: "Encore",          rarity: "rare",   cost: 1, ability: ["Encore", "+4 if you lost the last walk."], glyph: "♬" },
  { id: "s_paps", fx: [{ t: "rivalMinus", n: 3 }],     name: "Paparazzi Swarm", rarity: "epic",   cost: 2, ability: ["Swarm", "Rival's walk -3."], glyph: "✧" },
  { id: "s_fav", fx: [{ t: "add", n: 5 }],      name: "Crowd Favorite",  rarity: "epic",   cost: 3, ability: ["Fan Love", "+5."], glyph: "♥" },
  { id: "s_golden", fx: [{ t: "boostPct", n: 50 }],   name: "Golden Hour",     rarity: "legendary", cost: 4, ability: ["Golden Hour", "Your walk scores 50% more."], glyph: "☀" }
];
// Rivals. Their looks are drawn as cards with their own names (they don't borrow her clothes).
const RIVALS = [
  { id: "pom",    name: "Pixie Pom",      rank: 0, theme: "cute",   line: "Sugar and sparkle, babe. Try to keep up.",
    looks: [["Pink Sugar Dress", "cute", "common"], ["Bubblegum Overalls", "cute", "common"], ["Starlight Tutu", "cute", "rare"], ["Lollipop Coat", "cozy", "common"]] },
  { id: "marina", name: "Coach Marina",   rank: 0, theme: "cute",   line: "Sun's out. Let's see your boardwalk strut.",
    looks: [["Surf Wetsuit", "cool", "common"], ["Tropic Bikini", "cute", "rare"], ["Sunset Sarong", "cute", "common"], ["Lifeguard Jacket", "cool", "common"]] },
  { id: "riff",   name: "Riff Riot",      rank: 1, theme: "cool",   line: "Loud boots, louder style. Bring it.",
    looks: [["Spiked Leather", "cool", "rare"], ["Band Tee Stack", "cool", "common"], ["Chain Cargo", "cool", "rare"], ["Neon Hoodie", "cute", "common"]] },
  { id: "velour", name: "Count Velour",   rank: 2, theme: "spooky", line: "The night is long. So is my cape.",
    looks: [["Crimson Cape Suit", "spooky", "epic"], ["Bat-Wing Coat", "spooky", "rare"], ["Candlelight Vest", "glam", "rare"], ["Grave Lace Shirt", "spooky", "common"]] },
  { id: "raven",  name: "Duchess Raven",  rank: 3, theme: "glam",   line: "Darling, the Gala crowd only cheers for one of us.",
    looks: [["Obsidian Ballgown", "glam", "legendary"], ["Black Swan Dress", "glam", "epic"], ["Silver Thorn Gown", "spooky", "epic"], ["Pearl Noir Suit", "glam", "rare"]] }
];
const RARITY_ORDER = ["common", "rare", "epic", "legendary"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const hashN = (s) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h); };

export function makeCardGame(ctx) {
  // ctx: { state, save, outfits, rarityOf, styleNames, assets, toast, gainXP, wear(outfitId), wearing(), isWorn(outfitId), speak(text) }
  const S = () => {
    const st = ctx.state();
    if (!st.cards) st.cards = {};
    const c = st.cards;
    c.have = c.have || {}; c.xp = c.xp || {}; c.dust = c.dust || 0; c.wins = c.wins || 0; c.losses = c.losses || 0;
    c.fresh = c.fresh || []; c.known = c.known || []; c.rivalWins = c.rivalWins || {};
    if (!c.started) {
      c.started = 1;
      [...D().models, ...D().sparkles].filter((x) => x.starter).forEach((x) => { c.have[x.id] = (c.have[x.id] || 0) + (x.id.startsWith("s_") ? 2 : 1); });
      ctx.outfits().forEach((o) => { if (ctx.isWorn(o.id)) c.known.push("o:" + o.id); });
    }
    return c;
  };
  const root = document.getElementById("cardsRoot");
  let view = "play", binderFilter = "all", match = null, busy = false, drafting = false, draftError = "";

  /* ---------------------------------------------------------- game updates (approved by Tony) */
  const BASE = { models: MODELS, sparkles: SPARKLES, rivals: RIVALS, stages: STAGES };
  const G = () => {
    const st = ctx.state();
    if (!st.gameUpdates) st.gameUpdates = {};
    const g = st.gameUpdates;
    g.applied = g.applied || []; g.undone = g.undone || []; g.nextId = g.nextId || 1;
    if (g.pending === undefined) g.pending = null;
    return g;
  };
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  let dataCache = null, dataKey = "";
  function D() {
    const g = G(), key = g.applied.map((u) => u.id).join(",") + "|" + today();
    if (key !== dataKey || !dataCache) { dataCache = applyUpdates(BASE, g.applied.filter((u) => u.game === "runway"), today()); dataKey = key; }
    return dataCache;
  }

  /* ---------------------------------------------------------- card data */
  function outfitCard(o) {
    const rarity = ctx.rarityOf(o.id), base = RARITY_STATS[rarity];
    const id = "o:" + o.id;
    return { id, kind: "outfit", outfitId: o.id, name: o.label, style: o.style, theme: STYLE_THEME[o.style] || "cute", rarity,
      cost: base.cost, power: base.power + (hashN(o.id) % 2), art: o.file, ability: STYLE_ABILITY[o.style] || STYLE_ABILITY.alt };
  }
  const modelCard = (m) => ({ ...m, kind: "model" });
  const sparkleCard = (s) => ({ ...s, kind: "sparkle" });
  function allCards() {
    return [...ctx.outfits().map(outfitCard), ...D().models.map(modelCard), ...D().sparkles.map(sparkleCard)];
  }
  const cardById = (id) => allCards().find((c) => c.id === id);
  function owned(card) {
    const c = S();
    if (card.kind === "outfit") return ctx.isWorn(card.outfitId);
    return (c.have[card.id] || 0) > 0;
  }
  const copies = (card) => card.kind === "outfit" ? (owned(card) ? 1 : 0) : (S().have[card.id] || 0);
  function stars(id) { const x = S().xp[id] || 0; let s = 1; STAR_XP.forEach((need, i) => { if (x >= need) s = i + 1; }); return s; }
  const powerOf = (card) => (card.power || 0) + (stars(card.id) - 1);

  /* ---------------------------------------------------------- outfit unlocks */
  function syncOutfits(announce) {
    const c = S(), fresh = [];
    ctx.outfits().forEach((o) => {
      const id = "o:" + o.id;
      if (ctx.isWorn(o.id) && c.known.indexOf(id) === -1) { c.known.push(id); fresh.push(id); if (c.fresh.indexOf(id) === -1) c.fresh.push(id); }
    });
    if (fresh.length) {
      ctx.save();
      if (announce) {
        const card = cardById(fresh[0]);
        reveal([card], "New card unlocked", fresh.length > 1 ? `${card.name} and ${fresh.length - 1} more joined your cards.` : `${card.name} is now a ${RARITY_LABEL(card.rarity)} card.`);
      }
    }
    return fresh;
  }
  const RARITY_LABEL = (r) => r[0].toUpperCase() + r.slice(1);

  /* ---------------------------------------------------------- card element */
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function cardEl(card, opts = {}) {
    const n = el(opts.button ? "button" : "div", "ccg-card r-" + card.rarity + " k-" + card.kind + (opts.small ? " small" : "") + (opts.locked ? " locked" : ""));
    if (opts.button) n.type = "button";
    const theme = THEMES[card.theme];
    if (theme) n.style.setProperty("--theme", theme.color);
    n.append(el("span", "ccg-cost", String(card.cost)));
    const art = el("span", "ccg-art");
    if (card.art) {
      const img = new Image(); img.alt = ""; img.loading = "lazy"; img.src = ctx.assets + card.art;
      img.onerror = () => { img.remove(); art.append(el("span", "ccg-glyph", (theme && theme.glyph) || "✦")); };
      art.append(img);
    } else art.append(el("span", "ccg-glyph", card.glyph || (theme && theme.glyph) || "✦"));
    n.append(art);
    n.append(el("span", "ccg-name", card.name));
    const typeLine = card.kind === "outfit" ? "Outfit · " + ctx.styleNames[card.style] : card.kind === "model" ? "Model" : card.kind === "rival" ? "Rival look" : "Sparkle";
    n.append(el("span", "ccg-type", typeLine + (theme ? " · " + theme.label : "")));
    if (!opts.small) {
      const ab = el("span", "ccg-ability"); ab.append(el("b", "", card.ability[0] + ": ")); ab.append(document.createTextNode(card.ability[1])); n.append(ab);
    }
    if (card.kind !== "sparkle") n.append(el("span", "ccg-power", String(card.kind === "rival" ? card.power : powerOf(card))));
    if (card.kind !== "rival") n.append(el("span", "ccg-stars", "★".repeat(stars(card.id)) + "☆".repeat(5 - stars(card.id))));
    if (opts.count > 1) n.append(el("span", "ccg-count", "×" + opts.count));
    if (opts.fresh) n.append(el("span", "ccg-new", "NEW"));
    if (opts.wearing) n.append(el("span", "ccg-wearing", "Wearing"));
    if (opts.locked) n.append(el("span", "ccg-lock", opts.lockText || "Locked"));
    n.setAttribute("aria-label", `${card.name}, ${RARITY_LABEL(card.rarity)} ${typeLine}, cost ${card.cost}` + (card.kind !== "sparkle" ? `, power ${card.kind === "rival" ? card.power : powerOf(card)}` : "") + `. ${card.ability[0]}: ${card.ability[1]}` + (opts.locked ? " Locked." : ""));
    return n;
  }

  /* ---------------------------------------------------------- reveal overlay */
  function reveal(cards, title, sub, after) {
    const ov = el("div", "ccg-reveal"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", title);
    const box = el("div", "ccg-reveal-box");
    box.append(el("h3", "", title));
    const row = el("div", "ccg-reveal-row");
    cards.slice(0, 3).forEach((c, i) => {
      const flip = el("div", "ccg-flip r-" + c.rarity); flip.style.animationDelay = (i * 0.25) + "s";
      flip.append(el("div", "ccg-back", "✦"), cardEl(c));
      row.append(flip);
    });
    box.append(row);
    if (sub) box.append(el("p", "", sub));
    const ok = el("button", "wide-btn accent", "Nice!"); ok.type = "button";
    ok.addEventListener("click", () => { ov.remove(); after && after(); render(); });
    box.append(ok); ov.append(box);
    document.body.append(ov);
    setTimeout(() => ok.focus(), 50);
  }

  /* ---------------------------------------------------------- rewards */
  function rollCard(rankIdx, luck = 0) {
    const odds = [[70, 24, 5, 1], [55, 32, 10, 3], [42, 35, 17, 6], [30, 36, 23, 11]][rankIdx] || [70, 24, 5, 1];
    let r = Math.random() * 100 - luck, rar = "common";
    for (let i = 3; i >= 0; i--) { const top = odds.slice(i).reduce((a, b) => a + b, 0); if (r >= 100 - top) { rar = RARITY_ORDER[i]; break; } }
    r = Math.random() * 100;
    let pool = [...D().models, ...D().sparkles].filter((x) => x.rarity === rar && x.id !== "m_aimmianna");
    if (!pool.length) pool = D().sparkles.filter((x) => x.rarity === "common");
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function grant(card) {
    const c = S(), had = c.have[card.id] || 0;
    // duplicates beyond 3 turn into Sparkle Dust
    if (had >= 3) { const d = { common: 5, rare: 10, epic: 20, legendary: 40 }[card.rarity]; c.dust += d; return { dust: d }; }
    c.have[card.id] = had + 1;
    if (!had) c.fresh.push(card.id);
    return { added: true };
  }
  function giftReady() { const c = S(); return c.lastGift !== new Date().toDateString(); }
  function openGift() {
    if (!giftReady()) return;
    const c = S(); c.lastGift = new Date().toDateString();
    const card = rollCard(rankIndex(), 5), res = grant(card);
    c.dust += 5; ctx.save();
    reveal([kindCard(card)], "Daily gift box", res.dust ? `Already had 3, so it turned into ${res.dust + 5} Sparkle Dust.` : `+5 Sparkle Dust too. Come back tomorrow for another box.`);
  }
  const kindCard = (x) => x.id.startsWith("m_") ? modelCard(x) : sparkleCard(x);
  const rankIndex = () => { const w = S().wins; let i = 0; RANKS.forEach((r, k) => { if (w >= r.wins) i = k; }); return i; };
  function polish(card) {
    const c = S(), s = stars(card.id);
    if (s >= 5) return;
    const cost = POLISH_COST[s - 1];
    if (c.dust < cost) { ctx.toast(`Polishing needs ${cost} Sparkle Dust. You have ${c.dust}.`); return; }
    c.dust -= cost; c.xp[card.id] = (c.xp[card.id] || 0) + 2; ctx.save();
    const now = stars(card.id);
    ctx.toast(now > s ? `${card.name} is now ${now} stars.` : `${card.name} polished. Getting closer to ${s + 1} stars.`);
    render();
  }

  /* ---------------------------------------------------------- decks */
  function playerDeck() {
    const cards = [];
    allCards().forEach((card) => { if (card.kind === "outfit" && owned(card)) cards.push(card); });
    while (cards.filter((x) => x.kind === "outfit").length < 4) {
      const themes = Object.keys(THEMES), t = themes[cards.length % themes.length];
      cards.push({ id: "borrow_" + cards.length, kind: "outfit", name: "Borrowed Look", style: "alt", theme: t, rarity: "common", cost: 1, power: 3, art: "figure/aimmianna_human_fullbody.png", ability: ["Borrowed", "A stand-in until she wears more of her closet."], borrowed: true });
    }
    D().models.concat(D().sparkles).forEach((x) => { const n = Math.min(2, S().have[x.id] || 0); for (let i = 0; i < n; i++) cards.push(kindCard(x)); });
    return shuffle(cards.map((c, i) => ({ ...c, uid: c.id + "#" + i })));
  }
  function rivalDeck(rival) {
    const boost = RANKS[rival.rank].boost, cards = [];
    rival.looks.forEach(([name, theme, rarity], i) => {
      const b = RARITY_STATS[rarity];
      for (let k = 0; k < 2; k++) cards.push({ id: "r_" + rival.id + i, uid: "r" + i + k, kind: "rival", role: "outfit", name, theme, rarity, cost: b.cost, power: b.power + boost, ability: ["Rival look", "Their signature style."], glyph: THEMES[theme].glyph });
    });
    const models = D().models.filter((m) => m.id !== "m_aimmianna" && (m.theme === rival.theme || m.rarity === "common"));
    models.slice(0, 3).forEach((m, i) => { for (let k = 0; k < 2; k++) cards.push({ ...modelCard(m), uid: "rm" + i + k, power: m.power + Math.floor(boost / 2) }); });
    D().sparkles.filter((s) => RARITY_ORDER.indexOf(s.rarity) <= rival.rank).forEach((s, i) => cards.push({ ...sparkleCard(s), uid: "rs" + i }));
    const golden = D().sparkles.find((x) => x.id === "s_golden");
    if (rival.id === "raven" && golden) cards.push({ ...sparkleCard(golden), uid: "rsg" });
    return shuffle(cards);
  }

  /* ---------------------------------------------------------- scoring */
  function scoreWalk(side, walk, round) {
    const lines = [], add = (label, pts) => { if (pts) lines.push([label, pts]); };
    const model = walk.find((c) => c.kind === "model"), outfit = walk.find((c) => c.kind === "outfit" || c.role === "outfit");
    const sparkles = walk.filter((c) => c.kind === "sparkle");
    const pw = (c) => c.kind === "rival" ? c.power : side === "you" ? powerOf(c) : c.power;
    if (model) add(model.name, pw(model)); else add("Stand-in model", 1);
    if (outfit) add(outfit.name, pw(outfit));
    const theme = round.theme, stage = round.stage;
    const outfitMatches = outfit && (outfit.theme === theme || outfit.style === "alt");
    let themeBonus = 0;
    if (outfitMatches) themeBonus += 3;
    if (model && model.theme === theme) themeBonus += 2;
    if (sparkles.some((s) => (s.fx || []).some((f) => f.t === "doubleTheme"))) themeBonus *= 2;
    add(THEMES[theme].label + " theme", themeBonus);
    if (outfitMatches && model && model.theme === theme) { add("Fabulous! full match", 3); walk.fabulous = true; }
    if (outfit) {
      const hitStyle = stage.styles && stage.styles.indexOf(outfit.style) !== -1;
      const hitTheme = stage.themes && stage.themes.indexOf(outfit.theme) !== -1;
      const hitRar = stage.rarities && stage.rarities.indexOf(outfit.rarity) !== -1;
      if (hitStyle || hitTheme || hitRar) add(stage.label + " stage", stage.bonus);
    }
    const cardsIn = walk.length;
    // outfit style abilities (her outfits)
    if (outfit && outfit.kind === "outfit" && !outfit.borrowed) {
      const st = outfit.style;
      if (st === "goth" && (stage.id === "night" || stage.id === "gala")) add("Velvet Night", 2);
      if (st === "witchy") { add("Moon Charm", 1); match.extraDraw = (match.extraDraw || 0) + 1; }
      if (st === "hunter") add("Spirit Flash", 2 * sparkles.length);
      if (st === "emo" && match.hearts.you < match.hearts.rival) add("Heartache Encore", 3);
      if (st === "grunge") add("Mosh Pit", cardsIn);
      if (st === "beach") add("Sun-Kissed", stage.id === "beach" ? 4 : 1);
    }
    // model and Sparkle abilities (building blocks, so updates can change them)
    let minus = 0, boost = 0;
    const other = side === "you" ? "rival" : "you";
    [model, ...sparkles].filter(Boolean).forEach((card) => {
      let pts = 0;
      (card.fx || []).forEach((f) => {
        const n = f.n || 0;
        if (f.t === "add") pts += n;
        else if (f.t === "stage") { if ((f.stages || []).indexOf(stage.id) !== -1) pts += n; }
        else if (f.t === "outfitTheme") { if (outfit && outfit.theme === f.theme) pts += n; }
        else if (f.t === "roundTheme") { if (theme === f.theme) pts += n; }
        else if (f.t === "withSparkle") { if (sparkles.filter((x) => x !== card).length) pts += n; }
        else if (f.t === "perCard") pts += n * cardsIn;
        else if (f.t === "perSparkle") pts += n * sparkles.length;
        else if (f.t === "behind") { if (match.hearts[side] < match.hearts[other]) pts += n; }
        else if (f.t === "lostLast") { if (match.lastWinner && match.lastWinner !== side) pts += n; }
        else if (f.t === "rivalMinus") minus += n;
        else if (f.t === "extraDraw") match.extraDraw = (match.extraDraw || 0) + n;
        else if (f.t === "ownLook") { if (outfit && outfit.outfitId && outfit.outfitId === ctx.wearing()) pts += n; }
        else if (f.t === "boostPct") boost = Math.max(boost, n);
      });
      add(card.kind === "model" ? card.ability[0] : card.name, pts);
    });
    let total = lines.reduce((a, [, p]) => a + p, 0);
    if (boost) { const g = Math.round(total * boost / 100); add(sparkles.find((x) => (x.fx || []).some((f) => f.t === "boostPct"))?.name || "Boost", g); total += g; }
    if (outfit && (outfit.style === "cozy" || outfit.style === "lounge") && total < 9) { add("Comfy Calm", 9 - total); total = 9; }
    return { lines, total, minus: minus + (outfit && outfit.style === "vampire" ? 2 : 0), steal: outfit && outfit.style === "vampire" };
  }

  /* ---------------------------------------------------------- AI */
  function aiChoose(hand, energy, round, smart) {
    const models = hand.filter((c) => c.kind === "model"), outfits = hand.filter((c) => c.role === "outfit" || c.kind === "outfit"), sp = hand.filter((c) => c.kind === "sparkle");
    let best = null, bestScore = -1;
    const tries = [];
    (models.length ? models : [null]).forEach((m) => (outfits.length ? outfits : [null]).forEach((o) => {
      const base = [m, o].filter(Boolean), cost = base.reduce((a, c) => a + c.cost, 0);
      if (cost > energy) return;
      const extra = [];
      let left = energy - cost;
      sp.slice().sort((a, b) => b.cost - a.cost).forEach((s) => { if (s.cost <= left && Math.random() < smart + 0.2) { extra.push(s); left -= s.cost; } });
      tries.push(base.concat(extra));
    }));
    if (!tries.length) { const cheap = hand.filter((c) => c.cost <= energy).sort((a, b) => a.cost - b.cost); return cheap.slice(0, 1); }
    tries.forEach((t) => {
      const saved = match.extraDraw; const s = scoreWalk("rival", t.slice(), round).total; match.extraDraw = saved;
      const noisy = s * (smart + (1 - smart) * Math.random());
      if (noisy > bestScore) { bestScore = noisy; best = t; }
    });
    return best;
  }

  /* ---------------------------------------------------------- match flow */
  function newRound(n) {
    const themes = Object.keys(THEMES);
    const stages = D().stages, events = stages.filter((x) => x.until);
    // a limited-time event stage shows up in about half the walks while it's on
    const stage = events.length && Math.random() < 0.5 ? pick(events) : pick(stages);
    return { n, theme: pick(themes), stage, energy: n + 2 };
  }
  function draw(side, count) {
    const m = match, deck = m.deck[side], hand = m.hand[side];
    for (let i = 0; i < count && deck.length; i++) hand.push(deck.pop());
    // always give a model if the hand has none and the deck still does
    if (!hand.some((c) => c.kind === "model")) { const i = deck.findIndex((c) => c.kind === "model"); if (i !== -1) hand.push(deck.splice(i, 1)[0]); }
    if (!hand.some((c) => c.kind === "outfit" || c.role === "outfit")) { const i = deck.findIndex((c) => c.kind === "outfit" || c.role === "outfit"); if (i !== -1) hand.push(deck.splice(i, 1)[0]); }
  }
  function startMatch(rival) {
    match = {
      rival, roundNo: 1, round: newRound(1), hearts: { you: 0, rival: 0 }, wins: { you: 0, rival: 0 },
      deck: { you: playerDeck(), rival: rivalDeck(rival) }, hand: { you: [], rival: [] }, picked: [], log: [], used: new Set(), lastWinner: null, phase: "pick"
    };
    if (match.round.stage.dust) match.eventDust = match.round.stage.dust;
    draw("you", 5); draw("rival", 5);
    view = "match"; render();
    ctx.speak && ctx.speak(pick(["Runway time. Let's win this crowd.", "Okay, fit check. Let's show them.", `${rival.name}? Oh, I've got this.`]));
  }
  function pickedCost() { return match.picked.reduce((a, uid) => a + (match.hand.you.find((c) => c.uid === uid)?.cost || 0), 0); }
  function togglePick(card) {
    if (busy || match.phase !== "pick") return;
    const i = match.picked.indexOf(card.uid);
    if (i !== -1) { match.picked.splice(i, 1); render(); return; }
    const chosen = match.picked.map((u) => match.hand.you.find((c) => c.uid === u));
    if (card.kind === "model" && chosen.some((c) => c.kind === "model")) match.picked = match.picked.filter((u) => match.hand.you.find((c) => c.uid === u).kind !== "model");
    if (card.kind === "outfit" && chosen.some((c) => c.kind === "outfit")) match.picked = match.picked.filter((u) => match.hand.you.find((c) => c.uid === u).kind !== "outfit");
    if (pickedCost() + card.cost > match.round.energy) { ctx.toast(`Not enough Sparkle energy. This walk has ${match.round.energy}.`); render(); return; }
    match.picked.push(card.uid); render();
  }
  async function walk() {
    if (busy || match.phase !== "pick") return;
    const mine = match.picked.map((u) => match.hand.you.find((c) => c.uid === u));
    if (!mine.some((c) => c.kind === "model") && match.hand.you.some((c) => c.kind === "model" && c.cost <= match.round.energy)) { ctx.toast("Pick a model to walk the runway first."); return; }
    busy = true;
    const round = match.round, smart = RANKS[match.rival.rank].smart;
    const theirs = aiChoose(match.hand.rival, round.energy, round, smart);
    match.extraDraw = 0;
    const a = scoreWalk("you", mine, round), extraYou = match.extraDraw; match.extraDraw = 0;
    const b = scoreWalk("rival", theirs, round), extraRival = match.extraDraw; match.extraDraw = 0;
    let you = a.total, them = b.total;
    if (b.minus) { a.lines.push(["Rival's tricks", -b.minus]); you = Math.max(0, you - b.minus); }
    if (a.minus) { b.lines.push(["Your tricks", -a.minus]); them = Math.max(0, them - a.minus); }
    // crowd surprise
    let surprise = "";
    if (Math.random() < 0.22) { const who = Math.random() < 0.5 ? "you" : "rival"; if (who === "you") { you += 2; a.lines.push(["Paparazzi flash!", 2]); } else { them += 2; b.lines.push(["Paparazzi flash!", 2]); } surprise = who === "you" ? "A photographer loved your walk: +2." : "The crowd went wild for the rival: +2."; }
    match.hearts.you += you; match.hearts.rival += them;
    const winner = you === them ? "tie" : you > them ? "you" : "rival";
    if (winner !== "tie") match.wins[winner]++;
    match.lastWinner = winner === "tie" ? null : winner;
    mine.forEach((c) => match.used.add(c.id));
    match.last = { mine, theirs, a, b, you, them, winner, surprise, fabulous: mine.fabulous };
    match.hand.you = match.hand.you.filter((c) => mine.indexOf(c) === -1);
    match.hand.rival = match.hand.rival.filter((c) => theirs.indexOf(c) === -1);
    match.picked = []; match.phase = "result";
    match.nextExtra = { you: extraYou, rival: extraRival };
    render();
    busy = false;
  }
  function nextWalk() {
    if (match.roundNo >= 3) return finish();
    match.roundNo++; match.round = newRound(match.roundNo); match.phase = "pick";
    if (match.round.stage.dust) match.eventDust = Math.max(match.eventDust || 0, match.round.stage.dust);
    draw("you", Math.max(2, 5 - match.hand.you.length) + (match.nextExtra?.you || 0)); draw("rival", Math.max(2, 5 - match.hand.rival.length) + (match.nextExtra?.rival || 0));
    render();
  }
  function finish() {
    const c = S(), m = match, won = m.hearts.you > m.hearts.rival, tie = m.hearts.you === m.hearts.rival;
    const rIdx = m.rival.rank;
    let dust = won ? 10 + rIdx * 5 : tie ? 6 : 3;
    if (won && m.eventDust) dust += m.eventDust;
    c.dust += dust;
    const starUps = [];
    m.used.forEach((id) => {
      if (id.startsWith("borrow_")) return;
      const before = stars(id); c.xp[id] = (c.xp[id] || 0) + (won ? 2 : 1);
      if (stars(id) > before) { const card = cardById(id); if (card) starUps.push(`${card.name} reached ${stars(id)} stars`); }
    });
    let prize = null, prizeRes = null;
    if (won) {
      c.wins++; c.rivalWins[m.rival.id] = (c.rivalWins[m.rival.id] || 0) + 1;
      prize = rollCard(rIdx); prizeRes = grant(prize);
      ctx.gainXP && ctx.gainXP("gamer", 2); ctx.gainXP && ctx.gainXP("stylist", 1);
    } else if (!tie) c.losses++;
    const rankBefore = m.rankBefore ?? rankIndex();
    ctx.save();
    m.phase = "done";
    m.summary = { won, tie, dust, starUps, prize, prizeRes, rankUp: rankIndex() > rankBefore ? RANKS[rankIndex()].label : "" };
    render();
    ctx.speak && ctx.speak(won ? pick(["We won! Did you hear that crowd?", "Told you. Runway queen.", "That walk was everything."]) : tie ? "A tie? We'll get them next time." : pick(["Ugh, close one. Rematch?", "They got lucky. Run it back.", "Okay, that one stung. Next show is ours."]));
  }

  /* ---------------------------------------------------------- views */
  function tabs() {
    const bar = el("div", "ccg-tabs"); bar.setAttribute("role", "tablist");
    [["play", "Runway Show"], ["binder", "My Cards"], ["updates", "Updates"], ["how", "How to play"]].forEach(([id, label]) => {
      const b = el("button", view === id || (id === "play" && view === "match") ? "on" : "", label); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(view === id));
      if (fresh().length && id === "binder") b.append(el("span", "ccg-dot", String(fresh().length)));
      if (G().pending && id === "updates") b.append(el("span", "ccg-dot", "1"));
      b.addEventListener("click", () => { if (view === "match" && match && match.phase !== "done" && id !== "play") { if (!confirm("Leave this show? It won't count.")) return; match = null; } view = id === "play" && match ? "match" : id; render(); });
      bar.append(b);
    });
    return bar;
  }
  const fresh = () => S().fresh;
  function playView(box) {
    const c = S(), rIdx = rankIndex(), next = RANKS[rIdx + 1];
    const head = el("div", "ccg-rank");
    head.append(el("b", "", RANKS[rIdx].label));
    head.append(el("span", "", `${c.wins} wins · ${c.dust} Sparkle Dust` + (next ? ` · ${next.wins - c.wins} more wins to reach ${next.label}` : " · Top rank")));
    box.append(head);
    const gift = el("button", "wide-btn" + (giftReady() ? " accent" : ""), giftReady() ? "Open today's gift box" : "Gift box opened today. Back tomorrow"); gift.type = "button";
    gift.disabled = !giftReady(); gift.addEventListener("click", openGift); box.append(gift);
    const cnt = playerDeck(), outfits = cnt.filter((x) => x.kind === "outfit" && !x.borrowed).length;
    box.append(el("p", "help", `Your deck is built automatically: ${outfits} outfit card${outfits === 1 ? "" : "s"} from her closet plus your models and Sparkle cards. Wear more outfits in the closet (tap Keep it) to unlock more cards.`));
    box.append(el("h4", "", "Pick a rival"));
    const list = el("div", "ccg-rivals");
    D().rivals.forEach((r) => {
      const open = rIdx >= r.rank;
      const b = el("button", "ccg-rival" + (open ? "" : " locked")); b.type = "button"; b.disabled = !open;
      b.style.setProperty("--theme", THEMES[r.theme].color);
      b.append(el("span", "ccg-rival-glyph", THEMES[r.theme].glyph));
      const t = el("span", "ccg-rival-text"); t.append(el("b", "", r.name)); t.append(el("span", "", open ? `${RANKS[r.rank].label} · ${THEMES[r.theme].label} style · beaten ${c.rivalWins[r.id] || 0}×` : `Unlocks at ${RANKS[r.rank].label}`));
      b.append(t);
      b.addEventListener("click", () => { match = null; startMatch(r); match.rankBefore = rIdx; });
      list.append(b);
    });
    box.append(list);
  }
  function heartsBar() {
    const m = match, tot = Math.max(1, m.hearts.you + m.hearts.rival);
    const w = el("div", "ccg-hearts");
    const you = el("span", "ccg-h-you", `You ♥ ${m.hearts.you}`), them = el("span", "ccg-h-rival", `${m.rival.name} ♥ ${m.hearts.rival}`);
    const bar = el("div", "ccg-h-bar"); const fill = el("span"); fill.style.width = Math.round(m.hearts.you / tot * 100) + "%"; bar.append(fill);
    w.append(you, bar, them);
    return w;
  }
  function matchView(box) {
    const m = match, r = m.round;
    box.append(heartsBar());
    const banner = el("div", "ccg-round");
    banner.style.setProperty("--theme", THEMES[r.theme].color);
    banner.append(el("b", "", `Walk ${m.roundNo} of 3 · ${THEMES[r.theme].label} theme`));
    banner.append(el("span", "", `${r.stage.label}: ${r.stage.desc}`));
    box.append(banner);
    if (m.phase === "pick") {
      const used = pickedCost();
      const energy = el("div", "ccg-energy");
      energy.append(el("span", "", "Sparkle energy"));
      const gems = el("span", "ccg-gems"); for (let i = 0; i < r.energy; i++) gems.append(el("i", i < used ? "used" : "")); energy.append(gems);
      energy.append(el("span", "", `${r.energy - used} left`));
      box.append(energy);
      box.append(el("p", "help", "Tap 1 model, 1 outfit and any Sparkle cards you can afford. Matching the theme scores extra, and a model and outfit that both match make it Fabulous."));
      const hand = el("div", "ccg-hand");
      m.hand.you.slice().sort((a, b) => ["model", "outfit", "sparkle"].indexOf(a.kind) - ["model", "outfit", "sparkle"].indexOf(b.kind)).forEach((card) => {
        const n = cardEl(card, { button: true, wearing: card.outfitId && card.outfitId === ctx.wearing() });
        if (m.picked.indexOf(card.uid) !== -1) n.classList.add("picked");
        if (card.theme === r.theme || card.style === "alt") n.classList.add("match");
        n.setAttribute("aria-pressed", String(m.picked.indexOf(card.uid) !== -1));
        n.addEventListener("click", () => togglePick(card));
        hand.append(n);
      });
      box.append(hand);
      const go = el("button", "wide-btn accent ccg-go", m.picked.length ? "Walk the runway" : "Pick your cards"); go.type = "button";
      go.disabled = !m.picked.length && m.hand.you.some((c) => c.cost <= r.energy);
      if (!m.hand.you.some((c) => c.cost <= r.energy)) go.textContent = "Walk with what you have";
      go.addEventListener("click", walk);
      box.append(go);
    } else if (m.phase === "result") {
      const L = m.last;
      const res = el("div", "ccg-result " + L.winner);
      if (L.fabulous) res.append(el("div", "ccg-fab", "Fabulous!"));
      res.append(el("h4", "", L.winner === "tie" ? "It's a tie" : L.winner === "you" ? "You won the walk" : `${m.rival.name} won the walk`));
      const cols = el("div", "ccg-cols");
      [["You", L.mine, L.a, L.you], [m.rival.name, L.theirs, L.b, L.them]].forEach(([who, cards, sc, tot]) => {
        const col = el("div", "ccg-col");
        col.append(el("b", "", `${who}: ${tot}`));
        const row = el("div", "ccg-walk"); cards.forEach((c) => row.append(cardEl(c, { small: true }))); col.append(row);
        const ul = el("ul", "ccg-lines"); sc.lines.forEach(([l, p]) => ul.append(el("li", p < 0 ? "neg" : "", `${l} ${p > 0 ? "+" : ""}${p}`))); col.append(ul);
        cols.append(col);
      });
      res.append(cols);
      if (L.surprise) res.append(el("p", "ccg-surprise", L.surprise));
      box.append(res);
      const nx = el("button", "wide-btn accent", m.roundNo >= 3 ? "See the results" : "Next walk"); nx.type = "button";
      nx.addEventListener("click", nextWalk); box.append(nx);
    } else if (m.phase === "done") {
      const s = m.summary;
      const res = el("div", "ccg-final " + (s.won ? "won" : s.tie ? "tie" : "lost"));
      res.append(el("h3", "", s.won ? "You won the show" : s.tie ? "The show is a tie" : `${m.rival.name} won this time`));
      res.append(el("p", "", `Hearts: you ${m.hearts.you}, ${m.rival.name} ${m.hearts.rival}.`));
      const ul = el("ul", "ccg-lines");
      ul.append(el("li", "", `+${s.dust} Sparkle Dust`));
      ul.append(el("li", "", `Cards you played gained experience`));
      s.starUps.forEach((t) => ul.append(el("li", "", t)));
      if (s.rankUp) ul.append(el("li", "", `New rank: ${s.rankUp}! New rivals unlocked.`));
      res.append(ul);
      box.append(res);
      const again = el("button", "wide-btn accent", s.prize ? "Open your prize" : "Play again"); again.type = "button";
      again.addEventListener("click", () => {
        if (s.prize) { const card = kindCard(s.prize); const p = s.prizeRes; s.prize = null; reveal([card], "Show prize", p.dust ? `You already had 3, so it became ${p.dust} Sparkle Dust.` : `${card.name} joined your cards.`); render(); }
        else startMatch(m.rival);
      });
      box.append(again);
      const back = el("button", "wide-btn", "Back to rivals"); back.type = "button";
      back.addEventListener("click", () => { match = null; view = "play"; render(); });
      box.append(back);
    }
    if (m.phase !== "done") {
      const quit = el("button", "wide-btn subtle", "Leave the show"); quit.type = "button";
      quit.addEventListener("click", () => { if (confirm("Leave this show? It won't count.")) { match = null; view = "play"; render(); } });
      box.append(quit);
    }
  }
  function binderView(box) {
    const c = S(), cards = allCards();
    const have = cards.filter(owned).length;
    box.append(el("p", "book-total", `${have} of ${cards.length} cards · ${c.dust} Sparkle Dust`));
    const f = el("div", "ccg-filter");
    [["all", "All"], ["outfit", "Outfits"], ["model", "Models"], ["sparkle", "Sparkles"]].forEach(([id, l]) => {
      const b = el("button", binderFilter === id ? "on" : "", l); b.type = "button";
      b.addEventListener("click", () => { binderFilter = id; render(); }); f.append(b);
    });
    box.append(f);
    const grid = el("div", "ccg-grid");
    cards.filter((x) => binderFilter === "all" || x.kind === binderFilter)
      .sort((a, b) => (owned(b) - owned(a)) || (RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)))
      .forEach((card) => {
        const isOwned = owned(card);
        const n = cardEl(card, { button: true, small: true, locked: !isOwned, lockText: card.kind === "outfit" ? "Wear it to unlock" : "Win shows to find",
          count: copies(card), fresh: c.fresh.indexOf(card.id) !== -1, wearing: card.outfitId && card.outfitId === ctx.wearing() });
        n.addEventListener("click", () => detail(card));
        grid.append(n);
      });
    box.append(grid);
  }
  function detail(card) {
    const c = S();
    const i = c.fresh.indexOf(card.id); if (i !== -1) { c.fresh.splice(i, 1); ctx.save(); }
    const ov = el("div", "ccg-reveal"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", card.name);
    const box = el("div", "ccg-reveal-box");
    box.append(cardEl(card, { locked: !owned(card), lockText: card.kind === "outfit" ? "Wear it to unlock" : "Win shows to find" }));
    const s = stars(card.id), xp = c.xp[card.id] || 0;
    const info = el("p", "", owned(card) ? (s < 5 ? `${s} stars · ${xp} of ${STAR_XP[s]} experience to ${s + 1} stars. Each star adds +1 power.` : "5 stars. Fully powered up.") :
      card.kind === "outfit" ? "Put this outfit on her in the closet and tap Keep it to unlock this card." : "Win Runway Shows or open the daily gift box to find this card.");
    box.append(info);
    const btns = el("div", "ccg-detail-btns");
    if (owned(card) && s < 5) {
      const p = el("button", "wide-btn accent", `Polish with ${POLISH_COST[s - 1]} Sparkle Dust`); p.type = "button";
      p.disabled = c.dust < POLISH_COST[s - 1];
      p.addEventListener("click", () => { ov.remove(); polish(card); });
      btns.append(p);
    }
    if (card.kind === "outfit") {
      const w = el("button", "wide-btn", card.outfitId === ctx.wearing() ? "She's wearing this" : owned(card) ? "Have her wear it" : "Try it on in the closet"); w.type = "button";
      w.disabled = card.outfitId === ctx.wearing();
      w.addEventListener("click", () => { ov.remove(); ctx.wear(card.outfitId, owned(card)); });
      btns.append(w);
    }
    const close = el("button", "wide-btn", "Close"); close.type = "button";
    close.addEventListener("click", () => { ov.remove(); render(); });
    btns.append(close); box.append(btns); ov.append(box);
    ov.addEventListener("click", (e) => { if (e.target === ov) { ov.remove(); render(); } });
    document.body.append(ov);
  }
  /* ---------------------------------------------------------- Game Updates view */
  async function draftUpdate(request) {
    if (drafting) return { ok: false, error: "She's already writing an update." };
    if (!ctx.ai) return { ok: false, error: "Her AI brain isn't connected." };
    drafting = true; draftError = ""; if (view === "updates") render();
    try {
      const ask = String(request || "").trim().slice(0, 600) || "Suggest one fun, fair update that would make the Runway Show more exciting right now. Your choice.";
      const r = await ctx.ai(designerPrompt(D()), "Today is " + today() + ". Tony's request: " + ask);
      if (!r.ok) { draftError = r.error || "She couldn't write the update."; return { ok: false, error: draftError }; }
      const raw = parseJSON(r.text);
      if (!raw) { draftError = "Her draft came back garbled. Try asking again."; return { ok: false, error: draftError }; }
      const g = G(), prop = validateProposal(raw, D(), g.applied);
      prop.request = request ? String(request).slice(0, 300) : ""; prop.at = Date.now();
      if (!prop.changes.length) {
        g.pending = null; ctx.save();
        draftError = prop.say || "She didn't think any change was needed.";
        if (prop.notes.length) draftError += " (" + prop.notes.join(" ") + ")";
        return { ok: true, noChanges: true, say: prop.say, notes: prop.notes };
      }
      g.pending = prop; ctx.save();
      ctx.notify && ctx.notify(`She drafted a game update for you: "${prop.title}". Open Card Games, then Game Updates, to approve it.`);
      return { ok: true, title: prop.title, say: prop.say, changes: prop.changes.length };
    } catch (e) {
      draftError = "Something went wrong while she wrote it."; return { ok: false, error: draftError };
    } finally { drafting = false; render(); }
  }
  function approvePending() {
    const g = G(), p = g.pending; if (!p) return;
    const u = { id: g.nextId++, game: p.game, title: p.title, why: p.why, say: p.say, changes: p.changes, request: p.request, at: Date.now() };
    g.applied.push(u); g.pending = null; dataCache = null;
    // a free copy of every new card she designed
    const added = [];
    D().models.concat(D().sparkles).filter((x) => x.added === u.id).forEach((x) => { grant(x); added.push(kindCard(x)); });
    ctx.save(); ctx.gainXP && ctx.gainXP("gamer", 1);
    ctx.speak && ctx.speak(pick(["Yes! Update's in. Let's go try it.", "Love that you said yes. It's live.", "Done. The game just got better."]));
    if (added.length) reveal(added, "New cards from her update", `${added.length === 1 ? added[0].name + " is" : added.length + " new cards are"} in your collection now.`);
    else { ctx.toast(`"${u.title}" is now in the game.`); render(); }
  }
  function rejectPending() {
    const g = G(); if (!g.pending) return;
    g.pending = null; ctx.save();
    ctx.speak && ctx.speak(pick(["Fair. Back to the drawing board.", "Okay, no. I'll think of something better.", "Rejected? Rude. But okay."]));
    render();
  }
  function undoUpdate(id) {
    const g = G(), i = g.applied.findIndex((u) => u.id === id); if (i === -1) return;
    const u = g.applied[i];
    if (!confirm(`Undo "${u.title}"? The game goes back to how it was before it.`)) return;
    g.applied.splice(i, 1); g.undone.unshift({ ...u, undoneAt: Date.now() }); g.undone = g.undone.slice(0, 20); dataCache = null;
    ctx.save(); ctx.toast(`"${u.title}" was undone.`); render();
  }
  function changeView(ch, before, after) {
    const row = el("div", "gu-change");
    const pair = (a, b) => { const r = el("div", "gu-pair"); if (a) { r.append(cardEl(a, { small: true })); r.append(el("span", "gu-arrow", "→")); } r.append(cardEl(b, { small: true })); return r; };
    if (ch.op === "addCard" || ch.op === "editCard") {
      const findIn = (d) => ch.op === "editCard" ? [...d.models, ...d.sparkles].find((x) => x.id === ch.id) : [...d.models, ...d.sparkles].find((x) => x.added === "preview" && x.name === ch.name);
      const b = findIn(before), a = findIn(after);
      row.append(el("b", "", ch.op === "addCard" ? `New ${ch.kind === "sparkle" ? "Sparkle" : "model"} card: ${ch.name}` : `Change ${b ? b.name : ch.id}`));
      if (a) row.append(pair(b && kindCard(b), kindCard(a)));
      if (b && a) {
        const diffs = [];
        if (b.cost !== a.cost) diffs.push(`Cost ${b.cost} → ${a.cost}`);
        if ((b.power || 0) !== (a.power || 0)) diffs.push(`Power ${b.power} → ${a.power}`);
        if (b.rarity !== a.rarity) diffs.push(`Rarity ${b.rarity} → ${a.rarity}`);
        if (b.name !== a.name) diffs.push(`Name ${b.name} → ${a.name}`);
        if (b.ability[1] !== a.ability[1] || b.ability[0] !== a.ability[0]) diffs.push(`Ability "${b.ability[0]}: ${b.ability[1]}" → "${a.ability[0]}: ${a.ability[1]}"`);
        const ul = el("ul", "ccg-lines"); diffs.forEach((t) => ul.append(el("li", "", t))); row.append(ul);
      }
    } else if (ch.op === "addRival" || ch.op === "editRival") {
      const r = ch.op === "addRival" ? after.rivals.find((x) => x.added === "preview" && x.name === ch.name) : after.rivals.find((x) => x.id === ch.id);
      const was = ch.op === "editRival" ? before.rivals.find((x) => x.id === ch.id) : null;
      row.append(el("b", "", ch.op === "addRival" ? `New rival: ${ch.name}` : `Change rival ${was ? was.name : ch.id}`));
      if (r) {
        row.append(el("p", "help", `${RANKS[r.rank].label} · ${THEMES[r.theme].label} style · "${r.line}"`));
        row.append(el("p", "help", "Looks: " + r.looks.map((l) => `${l[0]} (${l[2]})`).join(", ")));
        if (was && was.line !== r.line) row.append(el("p", "help", `Was: "${was.line}"`));
      }
    } else if (ch.op === "addStage" || ch.op === "editStage") {
      const st = ch.op === "addStage" ? after.stages.find((x) => x.added === "preview" && x.label === ch.label) : after.stages.find((x) => x.id === ch.id);
      const was = ch.op === "editStage" ? before.stages.find((x) => x.id === ch.id) : null;
      row.append(el("b", "", ch.op === "addStage" ? (ch.until ? `New event stage: ${ch.label}` : `New stage: ${ch.label}`) : `Change stage ${was ? was.label : ch.id}`));
      if (was) row.append(el("p", "help", `Before: ${was.desc}`));
      row.append(el("p", "help", (was ? "After: " : "") + (st ? st.desc : "Ends before today, so it won't show up.")));
    }
    return row;
  }
  function updatesView(box) {
    const g = G();
    box.append(el("p", "help", "Aimmianna can update this game for you: new cards, fairer cards, new rivals, new stages and limited-time events. Nothing changes until you tap Approve, and you can undo any update later."));
    if (!ctx.hasAI || !ctx.hasAI()) box.append(el("p", "gu-warn", "She needs her Gemini key to write updates. Add it in Settings, the same key she uses to chat."));
    const ta = el("textarea", "gu-ask"); ta.rows = 3; ta.maxLength = 600;
    ta.placeholder = "Tell her what to change. For example: \"Pip the Bat is too weak\" or \"Add a Halloween event this week\"";
    box.append(ta);
    const ask = el("button", "wide-btn accent", drafting ? "She's writing it…" : "Ask Aimmianna"); ask.type = "button";
    ask.disabled = drafting || !(ctx.hasAI && ctx.hasAI());
    ask.addEventListener("click", () => { if (!ta.value.trim()) { ctx.toast("Type what you'd like changed, or tap Let her pick."); return; } draftUpdate(ta.value); });
    const idea = el("button", "wide-btn", "Let her pick something"); idea.type = "button";
    idea.disabled = drafting || !(ctx.hasAI && ctx.hasAI());
    idea.addEventListener("click", () => draftUpdate(""));
    box.append(ask, idea);
    if (draftError) box.append(el("p", "gu-say", draftError));
    if (g.pending) {
      const p = g.pending, before = D(), after = applyUpdates(BASE, [...g.applied.filter((u) => u.game === "runway"), { id: "preview", changes: p.changes }], today());
      const card = el("div", "gu-draft");
      card.append(el("h4", "", "Her draft: " + p.title));
      if (p.say) card.append(el("p", "gu-say", "“" + p.say + "”"));
      if (p.why) card.append(el("p", "help", "Why: " + p.why));
      p.changes.forEach((ch) => card.append(changeView(ch, before, after)));
      if (p.notes.length) { const ul = el("ul", "ccg-lines"); p.notes.forEach((t) => ul.append(el("li", "", "Safety check: " + t))); card.append(ul); }
      const ok = el("button", "wide-btn accent", "Approve"); ok.type = "button"; ok.addEventListener("click", approvePending);
      const no = el("button", "wide-btn", "Reject"); no.type = "button"; no.addEventListener("click", rejectPending);
      card.append(ok, no); box.append(card);
    }
    box.append(el("h4", "", "Approved updates"));
    const mine = g.applied.slice().reverse();
    if (!mine.length) box.append(el("p", "help", "None yet."));
    mine.forEach((u) => {
      const r = el("div", "gu-item");
      const t = el("div", "gu-item-text"); t.append(el("b", "", u.title)); t.append(el("span", "", new Date(u.at).toLocaleDateString() + " · " + u.changes.length + " change" + (u.changes.length === 1 ? "" : "s")));
      const un = el("button", "", "Undo"); un.type = "button"; un.addEventListener("click", () => undoUpdate(u.id));
      r.append(t, un); box.append(r);
    });
  }
  function howView(box) {
    const p = (t) => box.append(el("p", "", t));
    box.append(el("h4", "", "Runway Show"));
    p("A show has 3 walks. Each walk has a theme (Cute, Cool, Glam, Spooky or Cozy) and a stage that gives some looks a bonus.");
    p("Each walk, tap 1 model, 1 outfit and any Sparkle cards you can afford with your Sparkle energy (3, then 4, then 5). Then tap Walk the runway.");
    p("The crowd scores both walks. Theme match: outfit +3, model +2. If both match, it's Fabulous: +3 more. Each outfit style has its own ability, shown on the card.");
    p("Your walk score becomes hearts. Most hearts after 3 walks wins the show.");
    box.append(el("h4", "", "Getting better cards"));
    p("Her outfits: every outfit she keeps in the closet becomes a card. Rarer outfits make stronger cards.");
    p("Models and Sparkles: win shows for a prize card, and open the free gift box once a day.");
    p("Stars: cards you play gain experience. Each star (up to 5) adds +1 power. You can also polish a card with Sparkle Dust.");
    p("Ranks: Local Show, City Show, Star Runway, then Grand Gala. Higher ranks bring tougher rivals and better prize odds.");
    p("Tip: put the outfit on her in the closet, then play it with the Aimmianna model card for +3.");
    box.append(el("h4", "", "Game Updates"));
    p("Ask Aimmianna to change the game, in chat or in the Game Updates tab. She writes a draft, you see exactly what changes, and nothing happens until you tap Approve. You can undo any update.");
    p("Everything here uses play rewards only. There are no real purchases.");
  }
  function render() {
    if (!root) return;
    root.innerHTML = "";
    root.append(tabs());
    const box = el("div", "ccg-body");
    if (view === "match" && match) matchView(box);
    else if (view === "binder") binderView(box);
    else if (view === "how") howView(box);
    else if (view === "updates") updatesView(box);
    else playView(box);
    root.append(box);
  }

  return {
    render,
    draftUpdate,
    pendingUpdate: () => G().pending,
    openUpdates() { view = "updates"; render(); },
    onOutfitKept() { syncOutfits(true); },
    sync() { syncOutfits(false); },
    status() { const c = S(); return { wins: c.wins, losses: c.losses, dust: c.dust, rank: RANKS[rankIndex()].label, owned: allCards().filter(owned).length, total: allCards().length, view, phase: match?.phase || null, hearts: match?.hearts || null }; },
    _debug: { get match() { return match; }, data: () => D(), approvePending, rejectPending, undoUpdate, validate: (raw) => validateProposal(raw, D(), G().applied), setPending: (raw) => { const p = validateProposal(raw, D(), G().applied); G().pending = p; ctx.save(); render(); return p; }, startMatch: (id) => startMatch(D().rivals.find((r) => r.id === id) || D().rivals[0]), togglePick, walk, nextWalk }
  };
}
