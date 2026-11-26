/* Aimmianna — CCG: Dark Duel + Spirit Pals (v2.4.3)
   Two full card games, not mini-games. All cards, creatures and names are
   original — nothing from Pokemon, Yu-Gi-Oh, MTG or any other game or brand.
   - Dark Duel (Yu-Gi-Oh style): 4000 Life Points, monsters with levels and
     tribute summons, spell cards, face-down trap cards, and FUSION.
   - Spirit Pals (Pokemon style): creatures with HP and energy-cost attacks,
     evolution chains, type weakness (double damage), and prize cards.
   Shared engine: decks (20-40 cards), star levels 1-5 (STAR_XP, same shape
   as the Runway Show game), Sparkle Dust polishing, localStorage save via
   the app state, and Aimmianna AI rivals with smart levels.
   Everything here is play-only. No real money, no real purchases. */

const STAR_XP = [0, 3, 7, 12, 20];             // xp needed for 1..5 stars
const POLISH_COST = [10, 20, 35, 55];          // dust to add +2 xp, by current star
const RARITY_ORDER = ["common", "rare", "epic", "legendary"];
const RARITY_LABEL = (r) => r[0].toUpperCase() + r.slice(1);
const RARITY_DUST = { common: 5, rare: 10, epic: 20, legendary: 40 };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- ability building blocks (cards.js style) ----------
   t is the type, n the number. A card has at most 2 blocks. */
const FX = {
  add:     { text: (f) => `+${f.n} damage.` },
  heal:    { text: (f) => `Heal ${f.n}.` },
  draw:    { text: (f) => `Draw ${f.n} card${f.n === 1 ? "" : "s"}.` },
  drain:   { text: (f) => `Deal ${f.n} damage and heal that much.` },
  burn:    { text: (f) => `Burn: the enemy takes ${f.n} at the start of their turn.` },
  shield:  { text: (f) => `Block the next ${f.n} damage.` },
  weak:    { text: (f) => `The enemy loses ${f.n} attack this battle.` },
  pierce:  { text: () => `Damage goes through defence.` },
  ward:    { text: () => `Survives the first time it would be destroyed.` },
  lp:      { text: (f) => f.n < 0 ? `Heal ${-f.n} Life Points.` : `Deal ${f.n} damage to the enemy.` },
  buff:    { text: (f) => `Your monsters get +${f.n} attack this turn.` },
  destroy: { text: (f) => `Destroy an enemy monster with attack ${f.n} or less.` },
  fuse:    { text: () => `Fuse two monsters on your field into a fusion monster.` },
  reflect: { text: (f) => `Negate the attack and deal ${f.n} back.` },
  destroyAtk: { text: () => `Destroy the attacking monster.` },
  negateSpell: { text: (f) => `Negate a spell and heal ${f.n}.` },
  weakenAtk: { text: (f) => `The attacking monster loses ${f.n} attack.` }
};
const fxText = (fxList) => (fxList || []).map((f) => FX[f.t] ? FX[f.t].text(f) : "").filter(Boolean).join(" ");

/* ---------- Dark Duel card set (Yu-Gi-Oh style) ---------- */
const DUEL_CARDS = [
  // monsters: id, level, atk, def, attribute, type, rarity, glyph, color
  { id: "dd_gloomkit", kind: "monster", name: "Gloomkit", level: 2, atk: 900, def: 800, attr: "dark", mtype: "Fiend", rarity: "common", glyph: "🐾", color: "#8b7bb8", ability: ["Scratch", "+200 attack when it attacks."], fx: [{ t: "add", n: 200 }], starter: true },
  { id: "dd_moonbat", kind: "monster", name: "Moonbat", level: 2, atk: 800, def: 1000, attr: "moon", mtype: "Winged", rarity: "common", glyph: "🦇", color: "#7a86ff", ability: ["Night Flutter", "Survives the first time it would be destroyed."], fx: [{ t: "ward" }], starter: true },
  { id: "dd_candlewisp", kind: "monster", name: "Candlewisp", level: 1, atk: 500, def: 600, attr: "spirit", mtype: "Spirit", rarity: "common", glyph: "🕯", color: "#ffb86b", ability: ["Little Light", "When it destroys a monster, heal 300 Life Points."], fx: [{ t: "drain", n: 300 }], starter: true },
  { id: "dd_thornpup", kind: "monster", name: "Thornpup", level: 3, atk: 1200, def: 900, attr: "blood", mtype: "Beast", rarity: "common", glyph: "🌹", color: "#e06b8a", ability: ["Thorn Bite", "+300 attack when it attacks."], fx: [{ t: "add", n: 300 }], starter: true },
  { id: "dd_bloodhound", kind: "monster", name: "Bloodhound", level: 3, atk: 1300, def: 1100, attr: "blood", mtype: "Beast", rarity: "common", glyph: "🐺", color: "#c0392b", ability: ["Scent of Fear", "The enemy it attacks loses 300 attack this battle."], fx: [{ t: "weak", n: 300 }] },
  { id: "dd_graveknight", kind: "monster", name: "Grave Knight", level: 4, atk: 1600, def: 1200, attr: "dark", mtype: "Warrior", rarity: "rare", glyph: "⚔", color: "#9a8fa6", ability: ["Grave Oath", "Damage from this card goes through defence."], fx: [{ t: "pierce" }], starter: true },
  { id: "dd_velvetvamp", kind: "monster", name: "Velvet Vamp", level: 4, atk: 1700, def: 1400, attr: "blood", mtype: "Vampire", rarity: "rare", glyph: "🧛", color: "#c0392b", ability: ["Blood Sip", "When it destroys a monster, heal 500 Life Points."], fx: [{ t: "drain", n: 500 }] },
  { id: "dd_hexwitch", kind: "monster", name: "Hex Witch", level: 4, atk: 1500, def: 1800, attr: "shadow", mtype: "Spellcaster", rarity: "rare", glyph: "🔮", color: "#a55eea", ability: ["Hex", "The enemy it attacks loses 400 attack this battle."], fx: [{ t: "weak", n: 400 }] },
  { id: "dd_nightmare", kind: "monster", name: "Nightmare Steed", level: 5, atk: 2100, def: 1600, attr: "shadow", mtype: "Fiend", rarity: "epic", glyph: "🐴", color: "#5b4a8a", ability: ["Dream Trample", "+400 attack when it attacks."], fx: [{ t: "add", n: 400 }] },
  { id: "dd_duskmoth", kind: "monster", name: "Duskmoth", level: 6, atk: 2400, def: 2000, attr: "moon", mtype: "Winged", rarity: "epic", glyph: "🦋", color: "#b48be0", ability: ["Dusk Powder", "Burn: the enemy takes 300 at the start of their turn."], fx: [{ t: "burn", n: 300 }] },
  { id: "dd_crimsonduchess", kind: "monster", name: "Crimson Duchess", level: 7, atk: 2600, def: 2200, attr: "blood", mtype: "Vampire", rarity: "epic", glyph: "👑", color: "#d4af37", ability: ["Royal Drain", "When it destroys a monster, heal 800 Life Points."], fx: [{ t: "drain", n: 800 }] },
  { id: "dd_voidreaper", kind: "monster", name: "Void Reaper", level: 8, atk: 3000, def: 2500, attr: "dark", mtype: "Fiend", rarity: "legendary", glyph: "💀", color: "#e0e0e0", ability: ["Void Scythe", "Damage from this card goes through defence."], fx: [{ t: "pierce" }] },
  // fusion monsters: fusion: [material id, material id]
  { id: "dd_lilith", kind: "monster", name: "Lilith, Grave Queen", level: 7, atk: 2700, def: 2300, attr: "dark", mtype: "Fusion", rarity: "legendary", glyph: "👸", color: "#ff5fa8", fusion: ["dd_graveknight", "dd_hexwitch"], ability: ["Queen's Hex", "The enemy it attacks loses 600 attack this battle."], fx: [{ t: "weak", n: 600 }] },
  { id: "dd_eclipsequeen", kind: "monster", name: "Eclipse Queen", level: 8, atk: 2900, def: 2600, attr: "moon", mtype: "Fusion", rarity: "legendary", glyph: "🌑", color: "#a55eea", fusion: ["dd_velvetvamp", "dd_duskmoth"], ability: ["Eclipse Drain", "When it destroys a monster, heal 1000 Life Points."], fx: [{ t: "drain", n: 1000 }] },
  // spells
  { id: "dd_darkmoon", kind: "spell", name: "Dark Moon Rising", rarity: "rare", glyph: "🌙", color: "#7a86ff", ability: ["Dark Moon", "Your monsters get +500 attack this turn."], fx: [{ t: "buff", n: 500 }], starter: true },
  { id: "dd_bloodpact", kind: "spell", name: "Blood Pact", rarity: "common", glyph: "🩸", color: "#c0392b", ability: ["Blood Pact", "Draw 2 cards. You lose 300 Life Points."], fx: [{ t: "draw", n: 2 }, { t: "lp", n: 300 }], starter: true },
  { id: "dd_soulharvest", kind: "spell", name: "Soul Harvest", rarity: "rare", glyph: "⚰", color: "#8b7bb8", ability: ["Soul Harvest", "Destroy an enemy monster with attack 1500 or less."], fx: [{ t: "destroy", n: 1500 }] },
  { id: "dd_moonlight", kind: "spell", name: "Moonlight Mend", rarity: "common", glyph: "✚", color: "#9cc8ff", ability: ["Moonlight Mend", "Heal 1000 Life Points."], fx: [{ t: "lp", n: -1000 }], starter: true },
  { id: "dd_fusionrite", kind: "spell", name: "Fusion Rite", rarity: "rare", glyph: "🌀", color: "#ff5fa8", ability: ["Fusion Rite", "Fuse two monsters on your field into a fusion monster."], fx: [{ t: "fuse" }], starter: true },
  { id: "dd_hexbolt", kind: "spell", name: "Hexbolt", rarity: "common", glyph: "⚡", color: "#f1c75b", ability: ["Hexbolt", "Deal 800 damage to the enemy."], fx: [{ t: "lp", n: 800 }] },
  // traps (set face-down, trigger on the enemy's move)
  { id: "dd_mirrorveil", kind: "trap", name: "Mirror Veil", rarity: "rare", glyph: "🪞", color: "#9cc8ff", ability: ["Mirror Veil", "Negate the attack and deal 500 back."], fx: [{ t: "reflect", n: 500 }] },
  { id: "dd_gravesnare", kind: "trap", name: "Grave Snare", rarity: "rare", glyph: "🕳", color: "#5b4a8a", ability: ["Grave Snare", "Destroy the attacking monster."], fx: [{ t: "destroyAtk" }] },
  { id: "dd_bloodward", kind: "trap", name: "Blood Ward", rarity: "common", glyph: "🛡", color: "#c0392b", ability: ["Blood Ward", "Negate a spell and heal 500."], fx: [{ t: "negateSpell", n: 500 }] },
  { id: "dd_shadowbind", kind: "trap", name: "Shadow Bind", rarity: "common", glyph: "⛓", color: "#4a4a6a", ability: ["Shadow Bind", "The attacking monster loses 1000 attack."], fx: [{ t: "weakenAtk", n: 1000 }] }
];

/* ---------- Spirit Pals card set (Pokemon style) ----------
   Types: ember, shade, bloom, frost, spark, moon.
   Weakness: ember<frost, frost<ember, shade<moon, moon<shade, bloom<ember, spark<bloom. */
const PALS_TYPES = {
  ember: { label: "Ember", color: "#ff7a4d", glyph: "🔥", weak: "frost" },
  shade: { label: "Shade", color: "#8b7bb8", glyph: "👻", weak: "moon" },
  bloom: { label: "Bloom", color: "#7bc96b", glyph: "🌸", weak: "ember" },
  frost: { label: "Frost", color: "#7ec8e3", glyph: "❄", weak: "ember" },
  spark: { label: "Spark", color: "#f1c75b", glyph: "⚡", weak: "bloom" },
  moon:  { label: "Moon",  color: "#a55eea", glyph: "🌙", weak: "shade" }
};
const PALS_CARDS = [
  // evolution line 1: ember
  { id: "sp_emberkit", kind: "creature", name: "Emberkit", stage: 0, hp: 60, type: "ember", rarity: "common", glyph: "🦊", ability: ["Warm Paws", "Scratch and flicker — a starter friend."], fx: [], attacks: [{ name: "Scratch", cost: 1, dmg: 10, fx: [] }, { name: "Ember Flick", cost: 2, dmg: 20, fx: [{ t: "burn", n: 10 }] }], starter: true },
  { id: "sp_emberfox", kind: "creature", name: "Emberfox", stage: 1, hp: 90, type: "ember", rarity: "rare", glyph: "🦊", evolvesFrom: "sp_emberkit", ability: ["Kindling", "Its tail fire never goes out."], fx: [], attacks: [{ name: "Flame Dash", cost: 2, dmg: 30, fx: [{ t: "add", n: 10 }] }, { name: "Kindling", cost: 2, dmg: 20, fx: [{ t: "burn", n: 20 }] }] },
  { id: "sp_infernox", kind: "creature", name: "Infernox", stage: 2, hp: 130, type: "ember", rarity: "epic", glyph: "🔥", evolvesFrom: "sp_emberfox", ability: ["Wildfire Heart", "Burns bright, burns everything."], fx: [], attacks: [{ name: "Wildfire", cost: 3, dmg: 60, fx: [{ t: "burn", n: 20 }] }, { name: "Cinder Storm", cost: 3, dmg: 50, fx: [{ t: "add", n: 20 }] }] },
  // evolution line 2: shade
  { id: "sp_wispup", kind: "creature", name: "Wispup", stage: 0, hp: 50, type: "shade", rarity: "common", glyph: "👻", ability: ["Boo!", "Small, round, and a little bit haunted."], fx: [], attacks: [{ name: "Boo", cost: 1, dmg: 10, fx: [] }, { name: "Spook", cost: 1, dmg: 10, fx: [{ t: "weak", n: 10 }] }], starter: true },
  { id: "sp_shadehound", kind: "creature", name: "Shadehound", stage: 1, hp: 80, type: "shade", rarity: "rare", glyph: "🐺", evolvesFrom: "sp_wispup", ability: ["Grave Howl", "You hear it before you see it."], fx: [], attacks: [{ name: "Shadow Bite", cost: 2, dmg: 30, fx: [{ t: "drain", n: 20 }] }, { name: "Howl", cost: 1, dmg: 10, fx: [{ t: "weak", n: 20 }] }] },
  { id: "sp_gravehowler", kind: "creature", name: "Gravehowler", stage: 2, hp: 120, type: "shade", rarity: "epic", glyph: "🌑", evolvesFrom: "sp_shadehound", ability: ["Midnight Song", "Its song makes the whole graveyard listen."], fx: [], attacks: [{ name: "Soul Wail", cost: 3, dmg: 60, fx: [{ t: "weak", n: 20 }] }, { name: "Grave Drain", cost: 2, dmg: 40, fx: [{ t: "drain", n: 30 }] }] },
  // other basics
  { id: "sp_bloomkit", kind: "creature", name: "Bloomkit", stage: 0, hp: 70, type: "bloom", rarity: "common", glyph: "🌸", ability: ["Petal Nap", "Smells like rain and old books."], fx: [], attacks: [{ name: "Petal Slap", cost: 1, dmg: 10, fx: [] }, { name: "Bloom Heal", cost: 2, dmg: 10, fx: [{ t: "heal", n: 20 }] }], starter: true },
  { id: "sp_frostnip", kind: "creature", name: "Frostnip", stage: 0, hp: 60, type: "frost", rarity: "common", glyph: "❄", ability: ["Cold Nose", "Leaves frost on everything it sniffs."], fx: [], attacks: [{ name: "Snowball", cost: 1, dmg: 10, fx: [] }, { name: "Chill Bite", cost: 2, dmg: 20, fx: [{ t: "weak", n: 10 }] }], starter: true },
  { id: "sp_sparkmouse", kind: "creature", name: "Sparkmouse", stage: 0, hp: 50, type: "spark", rarity: "common", glyph: "🐭", ability: ["Static Fur", "Touch it and your hair stands up."], fx: [], attacks: [{ name: "Zap", cost: 1, dmg: 10, fx: [] }, { name: "Static Burst", cost: 2, dmg: 20, fx: [{ t: "add", n: 10 }] }], starter: true },
  { id: "sp_moonmoth", kind: "creature", name: "Moonmoth", stage: 0, hp: 60, type: "moon", rarity: "common", glyph: "🦋", ability: ["Lunar Dust", "Its wings glow when the moon is out."], fx: [], attacks: [{ name: "Dust Puff", cost: 1, dmg: 10, fx: [] }, { name: "Moonbeam", cost: 2, dmg: 20, fx: [{ t: "heal", n: 10 }] }], starter: true },
  { id: "sp_thorncub", kind: "creature", name: "Thorncub", stage: 0, hp: 70, type: "bloom", rarity: "common", glyph: "🦁", ability: ["Thorn Roar", "Small roar, sharp thorns."], fx: [], attacks: [{ name: "Thorn Tackle", cost: 1, dmg: 20, fx: [] }, { name: "Bramble Guard", cost: 1, dmg: 10, fx: [{ t: "shield", n: 20 }] }] },
  { id: "sp_cindercrow", kind: "creature", name: "Cindercrow", stage: 0, hp: 60, type: "ember", rarity: "common", glyph: "🐦‍⬛", ability: ["Cinder Caw", "Caws smoke rings."], fx: [], attacks: [{ name: "Peck", cost: 1, dmg: 10, fx: [] }, { name: "Ash Cloud", cost: 2, dmg: 20, fx: [{ t: "weak", n: 10 }] }] },
  // stage 1s for the other basics
  { id: "sp_bloomfox", kind: "creature", name: "Bloomfox", stage: 1, hp: 100, type: "bloom", rarity: "rare", glyph: "🦊", evolvesFrom: "sp_bloomkit", ability: ["Garden Magic", "Flowers bloom where it walks."], fx: [], attacks: [{ name: "Petal Storm", cost: 2, dmg: 30, fx: [{ t: "add", n: 10 }] }, { name: "Bloom Heal", cost: 2, dmg: 20, fx: [{ t: "heal", n: 30 }] }] },
  { id: "sp_bloomqueen", kind: "creature", name: "Bloomqueen", stage: 2, hp: 120, type: "bloom", rarity: "epic", glyph: "👸", evolvesFrom: "sp_bloomfox", ability: ["Eternal Spring", "Wherever she rests, the garden grows."], fx: [], attacks: [{ name: "Petal Cyclone", cost: 3, dmg: 60, fx: [{ t: "add", n: 10 }] }, { name: "Spring Mend", cost: 2, dmg: 30, fx: [{ t: "heal", n: 40 }] }] },
  { id: "sp_frostwolf", kind: "creature", name: "Frostwolf", stage: 1, hp: 90, type: "frost", rarity: "rare", glyph: "🐺", evolvesFrom: "sp_frostnip", ability: ["Blizzard Run", "Leaves a trail of snow behind it."], fx: [], attacks: [{ name: "Ice Fang", cost: 2, dmg: 30, fx: [{ t: "weak", n: 10 }] }, { name: "Snow Drift", cost: 2, dmg: 20, fx: [{ t: "shield", n: 20 }] }] },
  { id: "sp_stormhare", kind: "creature", name: "Stormhare", stage: 1, hp: 80, type: "spark", rarity: "rare", glyph: "🐇", evolvesFrom: "sp_sparkmouse", ability: ["Thunder Hop", "Faster than the lightning it makes."], fx: [], attacks: [{ name: "Volt Kick", cost: 2, dmg: 30, fx: [] }, { name: "Storm Charge", cost: 1, dmg: 10, fx: [{ t: "add", n: 20 }] }] },
  // energy
  { id: "sp_energy_ember", kind: "energy", name: "Ember Energy", etype: "ember", rarity: "common", glyph: "🔥", ability: ["Ember Energy", "Attach to a creature. It powers Ember attacks."], fx: [], starter: true },
  { id: "sp_energy_shade", kind: "energy", name: "Shade Energy", etype: "shade", rarity: "common", glyph: "👻", ability: ["Shade Energy", "Attach to a creature. It powers Shade attacks."], fx: [], starter: true },
  { id: "sp_energy_bloom", kind: "energy", name: "Bloom Energy", etype: "bloom", rarity: "common", glyph: "🌸", ability: ["Bloom Energy", "Attach to a creature. It powers Bloom attacks."], fx: [], starter: true },
  { id: "sp_energy_wild", kind: "energy", name: "Wild Energy", etype: "wild", rarity: "rare", glyph: "✦", ability: ["Wild Energy", "Attach to a creature. It counts as any type."], fx: [] },
  // trainers
  { id: "sp_moonberry", kind: "trainer", name: "Moonberry", rarity: "common", glyph: "🫐", ability: ["Moonberry", "Heal your active creature by 30."], fx: [{ t: "heal", n: 30 }], starter: true },
  { id: "sp_darklantern", kind: "trainer", name: "Dark Lantern", rarity: "common", glyph: "🏮", ability: ["Dark Lantern", "Draw 2 cards."], fx: [{ t: "draw", n: 2 }], starter: true },
  { id: "sp_revivecharm", kind: "trainer", name: "Revive Charm", rarity: "rare", glyph: "🧿", ability: ["Revive Charm", "Heal your active creature by 50."], fx: [{ t: "heal", n: 50 }] },
  { id: "sp_shadowcloak", kind: "trainer", name: "Shadow Cloak", rarity: "rare", glyph: "🥷", ability: ["Shadow Cloak", "Block the next 20 damage to your active creature."], fx: [{ t: "shield", n: 20 }] }
];

/* ---------- rivals (AI difficulty, smart levels like the Runway Show) ---------- */
const DUEL_RIVALS = [
  { id: "dr_gus", name: "Grim Gus", rank: 0, smart: 0.45, line: "Heh. The graveyard's full of losers like you.", glyph: "🪦", color: "#9a8fa6" },
  { id: "dr_moth", name: "Madame Moth", rank: 1, smart: 0.65, line: "Flutter closer, little duelist. Let's see your cards.", glyph: "🦋", color: "#b48be0" },
  { id: "dr_vex", name: "Vex the Hollow", rank: 2, smart: 0.8, line: "I don't lose. I just collect new ghosts.", glyph: "💀", color: "#e0e0e0" },
  { id: "dr_dusk", name: "Duchess of Dusk", rank: 3, smart: 0.95, line: "Darling, the dark only bows to one of us.", glyph: "👑", color: "#d4af37" }
];
const PALS_RIVALS = [
  { id: "pr_bramble", name: "Coach Bramble", rank: 0, smart: 0.45, line: "Every pal starts somewhere. Yours starts losing.", glyph: "🌿", color: "#7bc96b" },
  { id: "pr_faye", name: "Frost Faye", rank: 1, smart: 0.65, line: "Cold hands, warm pals. Let's battle.", glyph: "❄", color: "#7ec8e3" },
  { id: "pr_petal", name: "Professor Petal", rank: 2, smart: 0.8, line: "I've studied every pal. Yours is... adequate.", glyph: "🌸", color: "#ff8fc8" },
  { id: "pr_nova", name: "Nova Night", rank: 3, smart: 0.95, line: "Three prizes. Mine. Try to take one.", glyph: "🌙", color: "#a55eea" }
];
const DUEL_RANKS = [
  { id: "rookie", label: "Rookie Duelist", wins: 0, boost: 0 },
  { id: "club", label: "Club Duelist", wins: 3, boost: 1 },
  { id: "shadow", label: "Shadow Duelist", wins: 7, boost: 2 },
  { id: "master", label: "Dark Master", wins: 12, boost: 3 }
];
const PALS_RANKS = [
  { id: "rookie", label: "Rookie Trainer", wins: 0, boost: 0 },
  { id: "club", label: "Club Trainer", wins: 3, boost: 1 },
  { id: "star", label: "Star Trainer", wins: 7, boost: 2 },
  { id: "master", label: "Pal Master", wins: 12, boost: 3 }
];

/* ================================================================
   makeCCGGame(container, deps)
   container: element to render into.
   deps: { state: () => appState, save: () => saveState(),
           toast: (msg) => void, gainXP: (kind, n) => void,
           speak: (text) => void } — every field is optional; when
   state/save are missing the module keeps its own localStorage save.
   Returns { render, status, open(game), _debug }.
   ================================================================ */
export function makeCCGGame(container, deps) {
  deps = deps || {};
  const LS_KEY = "aimmianna_ccg_v1";
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

  const DUEL_BY_ID = Object.fromEntries(DUEL_CARDS.map((c) => [c.id, c]));
  const PALS_BY_ID = Object.fromEntries(PALS_CARDS.map((c) => [c.id, c]));
  const cardById = (id) => DUEL_BY_ID[id] || PALS_BY_ID[id];
  const gameOf = (card) => (card.id.startsWith("dd_") ? "duel" : "pals");
  const cardsOf = (game) => (game === "duel" ? DUEL_CARDS : PALS_CARDS);

  function S() {
    const st = state();
    if (!st.ccg) st.ccg = { dust: 0 };
    const c = st.ccg;
    c.dust = c.dust || 0;
    c.duel = c.duel || { have: {}, xp: {}, wins: 0, losses: 0, deck: null, fresh: [], rivalWins: {} };
    c.pals = c.pals || { have: {}, xp: {}, wins: 0, losses: 0, deck: null, fresh: [], rivalWins: {} };
    if (!c.started) {
      c.started = 1;
      DUEL_CARDS.filter((x) => x.starter).forEach((x) => { c.duel.have[x.id] = (c.duel.have[x.id] || 0) + (x.kind === "monster" ? 3 : 2); });
      PALS_CARDS.filter((x) => x.starter).forEach((x) => { c.pals.have[x.id] = (c.pals.have[x.id] || 0) + (x.kind === "creature" ? 3 : x.kind === "energy" ? 4 : 3); });
    }
    return c;
  }
  const gstate = (game) => S()[game];
  const owned = (game, id) => (gstate(game).have[id] || 0) > 0;
  const copies = (game, id) => gstate(game).have[id] || 0;
  function stars(game, id) { const x = gstate(game).xp[id] || 0; let s = 1; STAR_XP.forEach((need, i) => { if (x >= need) s = i + 1; }); return s; }
  const duelAtk = (card) => card.atk + (stars("duel", card.id) - 1) * 100;
  const duelDef = (card) => card.def + (stars("duel", card.id) - 1) * 100;
  const palsHp = (card) => card.hp + (stars("pals", card.id) - 1) * 10;

  /* ---------------------------------------------------------- dom helpers */
  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }
  function injectStyles() {
    if (document.getElementById("ccg2-style")) return;
    const s = document.createElement("style"); s.id = "ccg2-style";
    s.textContent = [
      ".ccg-field{display:flex;flex-direction:column;gap:6px;margin:10px 0}",
      ".ccg-zone{display:flex;gap:6px;min-height:58px;padding:6px;border-radius:12px;border:1px dashed #4a3550;background:#150e1a;flex-wrap:wrap;align-items:center}",
      ".ccg-zone .ccg-card.small{width:86px}",
      ".ccg-zone .ccg-card.small .ccg-art{height:56px}",
      ".ccg-zone-label{font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}",
      ".ccg-log{list-style:none;padding:8px 10px;margin:8px 0;border-radius:12px;background:#120b16;border:1px solid var(--border);font-size:12.5px;color:var(--muted);max-height:150px;overflow-y:auto}",
      ".ccg-log li{padding:2px 0}",
      ".ccg-log li b{color:var(--text)}",
      ".ccg-lp{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;font-size:13px;font-weight:700;margin:6px 0}",
      ".ccg-lp .you{color:var(--pink)} .ccg-lp .foe{color:#9cc8ff;text-align:right}",
      ".ccg-prizes{display:flex;gap:6px;align-items:center}",
      ".ccg-prizes i{width:18px;height:18px;border-radius:50%;border:2px solid var(--gold);display:inline-block}",
      ".ccg-prizes i.won{background:var(--gold);box-shadow:0 0 8px rgba(212,175,55,.8)}",
      ".ccg-battle-btns{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}",
      ".ccg-battle-btns .wide-btn{flex:1 1 auto}",
      ".ccg-hand .ccg-card.sel{transform:translateY(-8px);box-shadow:0 0 0 3px var(--pink),0 0 18px rgba(255,122,184,.5)}",
      ".ccg-hand .ccg-card.atk-ok{box-shadow:0 0 0 2px var(--gold)}",
      ".ccg-hand .ccg-card.faded{opacity:.45}",
      ".ccg-deckrow{display:flex;align-items:center;gap:8px;padding:8px 10px;margin:4px 0;border-radius:12px;border:1px solid var(--border);background:#150e1a}",
      ".ccg-deckrow .nm{flex:1;min-width:0}",
      ".ccg-deckrow .nm b{display:block;font-size:13px}",
      ".ccg-deckrow .nm span{font-size:11px;color:var(--muted)}",
      ".ccg-deckrow button{flex:0 0 auto;width:34px;height:34px;border-radius:50%;font-size:18px;font-weight:800;padding:0}",
      ".ccg-deckrow .ct{min-width:26px;text-align:center;font-weight:800}",
      ".ccg-trap{filter:brightness(.7) sepia(.4)}",
      ".ccg-atkline{font-size:11px;line-height:1.35;padding:3px 0;border-top:1px solid rgba(255,255,255,.08)}",
      ".ccg-atkline b{color:var(--theme)}"
    ].join("\n");
    document.head.append(s);
  }

  /* ---------------------------------------------------------- card element */
  function cardEl(card, opts = {}) {
    const game = gameOf(card);
    const n = el(opts.button ? "button" : "div", "ccg-card r-" + card.rarity + " k-" + card.kind + (opts.small ? " small" : "") + (opts.locked ? " locked" : "") + (opts.sel ? " sel" : "") + (opts.faded ? " faded" : ""));
    if (opts.button) n.type = "button";
    const color = card.color || (card.type && PALS_TYPES[card.type] ? PALS_TYPES[card.type].color : "#a55eea");
    n.style.setProperty("--theme", color);
    const costBadge = card.kind === "monster" ? String(card.level) : card.kind === "creature" ? String(card.stage) : card.kind === "energy" ? "1" : "✦";
    n.append(el("span", "ccg-cost", costBadge));
    const art = el("span", "ccg-art");
    art.append(el("span", "ccg-glyph", card.glyph || "✦"));
    n.append(art);
    n.append(el("span", "ccg-name", card.name));
    let typeLine = "";
    if (card.kind === "monster") typeLine = `Lv ${card.level} · ${card.mtype} · ${card.attr}`;
    else if (card.kind === "spell") typeLine = "Spell";
    else if (card.kind === "trap") typeLine = "Trap · set face-down";
    else if (card.kind === "creature") typeLine = `Stage ${card.stage} · ${PALS_TYPES[card.type].label} · ${palsHp(card)} HP`;
    else if (card.kind === "energy") typeLine = `Energy · ${card.etype === "wild" ? "Wild" : PALS_TYPES[card.etype].label}`;
    else if (card.kind === "trainer") typeLine = "Trainer";
    n.append(el("span", "ccg-type", typeLine));
    if (!opts.small) {
      const ab = el("span", "ccg-ability");
      ab.append(el("b", "", card.ability[0] + ": "));
      ab.append(document.createTextNode(card.ability[1]));
      n.append(ab);
      if (card.kind === "creature") {
        (card.attacks || []).forEach((a) => {
          const line = el("span", "ccg-atkline");
          line.append(el("b", "", `${a.name} · ${"●".repeat(a.cost)} `));
          line.append(document.createTextNode(`${a.dmg} dmg` + (a.fx && a.fx.length ? " — " + fxText(a.fx) : "")));
          n.append(line);
        });
        if (card.evolvesFrom) n.append(el("span", "ccg-type", "Evolves from " + (PALS_BY_ID[card.evolvesFrom] || {}).name));
      }
      if (card.fusion) n.append(el("span", "ccg-type", "Fusion: " + card.fusion.map((id) => (DUEL_BY_ID[id] || {}).name).join(" + ")));
    }
    if (card.kind === "monster") n.append(el("span", "ccg-power", String(duelAtk(card))));
    if (card.kind === "creature") n.append(el("span", "ccg-power", String(palsHp(card))));
    n.append(el("span", "ccg-stars", "★".repeat(stars(game, card.id)) + "☆".repeat(5 - stars(game, card.id))));
    if (opts.count > 1) n.append(el("span", "ccg-count", "×" + opts.count));
    if (opts.fresh) n.append(el("span", "ccg-new", "NEW"));
    if (opts.locked) n.append(el("span", "ccg-lock", opts.lockText || "Not owned yet"));
    if (opts.faceDown) n.append(el("span", "ccg-lock", "Face-down"));
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
  function rankIndex(game) { const w = gstate(game).wins; const ranks = game === "duel" ? DUEL_RANKS : PALS_RANKS; let i = 0; ranks.forEach((r, k) => { if (w >= r.wins) i = k; }); return i; }
  function rollCard(game, rankIdx) {
    const odds = [[70, 24, 5, 1], [55, 32, 10, 3], [42, 35, 17, 6], [30, 36, 23, 11]][rankIdx] || [70, 24, 5, 1];
    let r = Math.random() * 100, rar = "common";
    for (let i = 3; i >= 0; i--) { const top = odds.slice(i).reduce((a, b) => a + b, 0); if (r >= 100 - top) { rar = RARITY_ORDER[i]; break; } }
    let pool = cardsOf(game).filter((x) => x.rarity === rar && x.kind !== "energy");
    if (!pool.length) pool = cardsOf(game).filter((x) => x.rarity === "common" && x.kind !== "energy");
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function grant(game, card) {
    const g = gstate(game), max = game === "duel" ? 3 : 4, had = g.have[card.id] || 0;
    if (had >= max) { const d = RARITY_DUST[card.rarity]; S().dust += d; return { dust: d }; }
    g.have[card.id] = had + 1;
    if (!had) g.fresh.push(card.id);
    return { added: true };
  }
  function polish(game, card) {
    const g = gstate(game), s = stars(game, card.id);
    if (s >= 5) return;
    const cost = POLISH_COST[s - 1];
    if (S().dust < cost) { toast(`Polishing needs ${cost} Sparkle Dust. You have ${S().dust}.`); return; }
    S().dust -= cost; g.xp[card.id] = (g.xp[card.id] || 0) + 2; save();
    const now = stars(game, card.id);
    toast(now > s ? `${card.name} is now ${now} stars.` : `${card.name} polished. Getting closer to ${s + 1} stars.`);
    render();
  }
  function awardWin(game, usedIds, rival) {
    const g = gstate(game), rIdx = rival ? rival.rank : 0;
    const dust = 10 + rIdx * 5;
    S().dust += dust;
    const starUps = [];
    usedIds.forEach((id) => {
      const before = stars(game, id); g.xp[id] = (g.xp[id] || 0) + 2;
      if (stars(game, id) > before) starUps.push(`${(cardById(id) || {}).name} reached ${stars(game, id)} stars`);
    });
    g.wins++; if (rival) g.rivalWins[rival.id] = (g.rivalWins[rival.id] || 0) + 1;
    const prize = rollCard(game, rIdx), prizeRes = grant(game, prize);
    gainXP("gamer", 2);
    save();
    return { dust, starUps, prize, prizeRes };
  }
  function awardLoss(game, usedIds) {
    const g = gstate(game);
    S().dust += 3;
    usedIds.forEach((id) => { g.xp[id] = (g.xp[id] || 0) + 1; });
    g.losses++;
    save();
    return { dust: 3 };
  }

  /* ---------------------------------------------------------- decks */
  function defaultDeck(game) {
    const g = gstate(game), ids = [];
    const ownedCards = cardsOf(game).filter((c) => (g.have[c.id] || 0) > 0);
    const order = game === "duel"
      ? ["monster", "spell", "trap"]
      : ["creature", "energy", "trainer"];
    const max = game === "duel" ? 3 : 4;
    order.forEach((kind) => {
      ownedCards.filter((c) => c.kind === kind).forEach((c) => {
        const n = Math.min(max, g.have[c.id] || 0);
        for (let i = 0; i < n && ids.length < 26; i++) ids.push(c.id);
      });
    });
    return ids;
  }
  function validateDeck(game, ids) {
    const errs = [];
    if (ids.length < 20) errs.push(`Deck needs at least 20 cards (has ${ids.length}).`);
    if (ids.length > 40) errs.push(`Deck can have at most 40 cards (has ${ids.length}).`);
    const counts = {};
    ids.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    const max = game === "duel" ? 3 : 4;
    Object.keys(counts).forEach((id) => { if (counts[id] > max) errs.push(`Too many copies of ${(cardById(id) || {}).name} (max ${max}).`); });
    if (game === "duel") {
      const mons = ids.filter((id) => (DUEL_BY_ID[id] || {}).kind === "monster").length;
      if (mons < 8) errs.push(`Duel decks need at least 8 monsters (has ${mons}).`);
    } else {
      const basics = ids.filter((id) => { const c = PALS_BY_ID[id]; return c && c.kind === "creature" && c.stage === 0; }).length;
      if (basics < 4) errs.push(`Pal decks need at least 4 basic creatures (has ${basics}).`);
      const energy = ids.filter((id) => (PALS_BY_ID[id] || {}).kind === "energy").length;
      if (energy < 6) errs.push(`Pal decks need at least 6 energy cards (has ${energy}).`);
    }
    return errs;
  }
  function deckIds(game) {
    const g = gstate(game);
    if (g.deck && g.deck.length) return g.deck.slice();
    const d = defaultDeck(game);
    g.deck = d; save();
    return d.slice();
  }
  function buildDeckList(game, ids) {
    // expand stored ids into per-copy instances with uids
    return shuffle(ids.map((id, i) => ({ ...cardById(id), uid: id + "#" + i })));
  }

  /* ---------------------------------------------------------- views */
  let view = "duel", collGame = "duel", collFilter = "all", battle = null, busy = false;
  let deckDraft = null; // { game, ids }

  function tabs() {
    const bar = el("div", "ccg-tabs"); bar.setAttribute("role", "tablist");
    [["duel", "Dark Duel"], ["pals", "Spirit Pals"], ["collection", "Collection"], ["how", "How to play"]].forEach(([id, label]) => {
      const active = view === id || (id === "duel" && view === "duel-battle") || (id === "pals" && view === "pals-battle") || (id === "duel" && view === "duel-deck") || (id === "pals" && view === "pals-deck");
      const b = el("button", active ? "on" : "", label); b.type = "button"; b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(active));
      const freshCount = S().duel.fresh.length + S().pals.fresh.length;
      if (freshCount && id === "collection") b.append(el("span", "ccg-dot", String(freshCount)));
      b.addEventListener("click", () => {
        if (battle && battle.phase !== "done") { if (!confirm("Leave this battle? It won't count.")) return; battle = null; }
        view = id; render();
      });
      bar.append(b);
    });
    return bar;
  }

  function rankHead(game, box) {
    const g = gstate(game), ranks = game === "duel" ? DUEL_RANKS : PALS_RANKS, rIdx = rankIndex(game), next = ranks[rIdx + 1];
    const head = el("div", "ccg-rank");
    head.append(el("b", "", ranks[rIdx].label));
    head.append(el("span", "", `${g.wins} wins · ${g.losses} losses · ${S().dust} Sparkle Dust` + (next ? ` · ${next.wins - g.wins} more wins to reach ${next.label}` : " · Top rank")));
    box.append(head);
  }

  function playView(game, box) {
    const rivals = game === "duel" ? DUEL_RIVALS : PALS_RIVALS;
    const g = gstate(game), rIdx = rankIndex(game);
    rankHead(game, box);
    const deck = deckIds(game), errs = validateDeck(game, deck);
    box.append(el("p", "help", game === "duel"
      ? `Your deck: ${deck.length} cards. Duel is 4000 Life Points — summon monsters, set traps, fuse when you can.`
      : `Your deck: ${deck.length} cards. First to 3 prize cards wins — evolve your pals, attach energy, mind the weakness.`));
    if (errs.length) box.append(el("p", "gu-warn", "Deck problem: " + errs.join(" ")));
    const deckBtn = el("button", "wide-btn", "Build my deck"); deckBtn.type = "button";
    deckBtn.addEventListener("click", () => { deckDraft = { game, ids: deckIds(game) }; view = game + "-deck"; render(); });
    box.append(deckBtn);
    box.append(el("h4", "", "Pick a rival"));
    const list = el("div", "ccg-rivals");
    rivals.forEach((r) => {
      const open = rIdx >= r.rank;
      const b = el("button", "ccg-rival" + (open ? "" : " locked")); b.type = "button"; b.disabled = !open;
      b.style.setProperty("--theme", r.color);
      b.append(el("span", "ccg-rival-glyph", r.glyph));
      const t = el("span", "ccg-rival-text");
      t.append(el("b", "", r.name));
      t.append(el("span", "", open ? `${(game === "duel" ? DUEL_RANKS : PALS_RANKS)[r.rank].label} · beaten ${g.rivalWins[r.id] || 0}×` : `Unlocks at ${(game === "duel" ? DUEL_RANKS : PALS_RANKS)[r.rank].label}`));
      b.append(t);
      b.addEventListener("click", () => { if (game === "duel") startDuel(r); else startPals(r); });
      list.append(b);
      if (open) {
        const line = el("p", "help", `“${r.line}”`);
        list.append(line);
      }
    });
    box.append(list);
  }

  function deckBuilderView(box) {
    const game = deckDraft.game, g = gstate(game);
    const counts = {};
    deckDraft.ids.forEach((id) => { counts[id] = (counts[id] || 0) + 1; });
    box.append(el("h4", "", game === "duel" ? "Build your Dark Duel deck" : "Build your Spirit Pals deck"));
    box.append(el("p", "help", game === "duel"
      ? "20-40 cards, at most 3 copies of any card, at least 8 monsters. Tribute rules: level 5-6 needs 1 tribute, level 7+ needs 2."
      : "20-40 cards, at most 4 copies of any card, at least 4 basic creatures and 6 energy cards."));
    const total = el("p", "book-total", `${deckDraft.ids.length} cards in deck`);
    box.append(total);
    const errs = validateDeck(game, deckDraft.ids);
    if (errs.length) box.append(el("p", "gu-warn", errs.join(" ")));
    const saveBtn = el("button", "wide-btn accent", "Save deck"); saveBtn.type = "button";
    saveBtn.disabled = !!errs.length;
    saveBtn.addEventListener("click", () => { g.deck = deckDraft.ids.slice(); save(); toast("Deck saved."); view = game; render(); });
    const resetBtn = el("button", "wide-btn", "Back to starter deck"); resetBtn.type = "button";
    resetBtn.addEventListener("click", () => { deckDraft.ids = defaultDeck(game); render(); });
    box.append(saveBtn, resetBtn);
    const kinds = game === "duel" ? ["monster", "spell", "trap"] : ["creature", "energy", "trainer"];
    kinds.forEach((kind) => {
      box.append(el("h4", "", kind[0].toUpperCase() + kind.slice(1) + "s"));
      cardsOf(game).filter((c) => c.kind === kind).forEach((card) => {
        const have = g.have[card.id] || 0, inDeck = counts[card.id] || 0;
        const row = el("div", "ccg-deckrow");
        const nm = el("span", "nm");
        nm.append(el("b", "", card.name));
        nm.append(el("span", "", `${RARITY_LABEL(card.rarity)} · you own ${have}` + (card.kind === "monster" ? ` · Lv ${card.level} · ${card.atk}/${card.def}` : card.kind === "creature" ? ` · Stage ${card.stage} · ${card.hp} HP` : "")));
        row.append(nm);
        const minus = el("button", "", "−"); minus.type = "button"; minus.disabled = inDeck === 0;
        minus.addEventListener("click", () => { const i = deckDraft.ids.indexOf(card.id); if (i !== -1) deckDraft.ids.splice(i, 1); render(); });
        const ct = el("span", "ct", String(inDeck));
        const plus = el("button", "", "+"); plus.type = "button";
        plus.disabled = have === 0 || inDeck >= (game === "duel" ? 3 : 4) || deckDraft.ids.length >= 40;
        plus.addEventListener("click", () => { deckDraft.ids.push(card.id); render(); });
        row.append(minus, ct, plus);
        if (have === 0) row.style.opacity = ".45";
        box.append(row);
      });
    });
    const back = el("button", "wide-btn", "Back without saving"); back.type = "button";
    back.addEventListener("click", () => { deckDraft = null; view = game; render(); });
    box.append(back);
  }

  function collectionView(box) {
    const g = gstate(collGame);
    const cards = cardsOf(collGame);
    const have = cards.filter((c) => (g.have[c.id] || 0) > 0).length;
    box.append(el("p", "book-total", `${have} of ${cards.length} ${collGame === "duel" ? "Dark Duel" : "Spirit Pals"} cards · ${S().dust} Sparkle Dust`));
    const gf = el("div", "ccg-filter");
    [["duel", "Dark Duel"], ["pals", "Spirit Pals"]].forEach(([id, l]) => {
      const b = el("button", collGame === id ? "on" : "", l); b.type = "button";
      b.addEventListener("click", () => { collGame = id; render(); }); gf.append(b);
    });
    box.append(gf);
    const f = el("div", "ccg-filter");
    [["all", "All"], ["monster", "Monsters"], ["creature", "Creatures"], ["spell", "Spells"], ["trap", "Traps"], ["energy", "Energy"], ["trainer", "Trainers"]].forEach(([id, l]) => {
      const b = el("button", collFilter === id ? "on" : "", l); b.type = "button";
      b.addEventListener("click", () => { collFilter = id; render(); }); f.append(b);
    });
    box.append(f);
    const grid = el("div", "ccg-grid");
    cards.filter((x) => collFilter === "all" || x.kind === collFilter)
      .sort((a, b) => (((g.have[b.id] || 0) > 0) - ((g.have[a.id] || 0) > 0)) || (RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity)))
      .forEach((card) => {
        const isOwned = (g.have[card.id] || 0) > 0;
        const n = cardEl(card, { button: true, small: true, locked: !isOwned, lockText: "Win battles to find", count: g.have[card.id] || 0, fresh: g.fresh.indexOf(card.id) !== -1 });
        n.addEventListener("click", () => detail(card));
        grid.append(n);
      });
    box.append(grid);
  }

  function detail(card) {
    const game = gameOf(card), g = gstate(game);
    const i = g.fresh.indexOf(card.id); if (i !== -1) { g.fresh.splice(i, 1); save(); }
    const ov = el("div", "ccg-reveal"); ov.setAttribute("role", "dialog"); ov.setAttribute("aria-label", card.name);
    const box = el("div", "ccg-reveal-box");
    box.append(cardEl(card, { locked: !(g.have[card.id] || 0) > 0, lockText: "Win battles to find" }));
    const s = stars(game, card.id), xp = g.xp[card.id] || 0;
    const info = el("p", "", (g.have[card.id] || 0) > 0
      ? (s < 5 ? `${s} stars · ${xp} of ${STAR_XP[s]} experience to ${s + 1} stars. Each star adds ${game === "duel" ? "+100 attack and defence" : "+10 HP"}.` : "5 stars. Fully powered up.")
      : "Win battles or open the daily gift box to find this card.");
    box.append(info);
    const btns = el("div", "ccg-detail-btns");
    if ((g.have[card.id] || 0) > 0 && s < 5) {
      const p = el("button", "wide-btn accent", `Polish with ${POLISH_COST[s - 1]} Sparkle Dust`); p.type = "button";
      p.disabled = S().dust < POLISH_COST[s - 1];
      p.addEventListener("click", () => { ov.remove(); polish(game, card); });
      btns.append(p);
    }
    const close = el("button", "wide-btn", "Close"); close.type = "button";
    close.addEventListener("click", () => { ov.remove(); render(); });
    btns.append(close); box.append(btns); ov.append(box);
    ov.addEventListener("click", (e) => { if (e.target === ov) { ov.remove(); render(); } });
    document.body.append(ov);
  }

  function howView(box) {
    const p = (t) => box.append(el("p", "", t));
    box.append(el("h4", "", "Dark Duel"));
    p("Both duelists start at 4000 Life Points. Each turn you draw 1 card, summon 1 monster, and each monster can attack once.");
    p("Levels: level 1-4 summon free. Level 5-6 needs 1 tribute (a monster you already have on the field). Level 7+ needs 2 tributes.");
    p("Attacking: your monster's attack vs theirs. Higher attack wins and the loser is destroyed — the difference hits Life Points. Against a defence monster, higher attack destroys it with no Life Point damage; lower attack hurts you instead.");
    p("Traps: set them face-down. They fire on their own when the enemy attacks or casts a spell. Fusion: play Fusion Rite while both material monsters are on your field.");
    p("Win by taking the enemy to 0 Life Points.");
    box.append(el("h4", "", "Spirit Pals"));
    p("Each side starts with 7 cards and puts a basic creature out front, with up to 3 on the bench. Each turn: draw 1, attach 1 energy, evolve once, play trainers, then attack.");
    p("Attacks cost the energy attached to that creature. Evolve by playing a stage 1 on its basic, or a stage 2 on its stage 1.");
    p("Weakness: if the attacker's type matches the defender's weakness, damage doubles. Knock a creature out and you take 1 prize card — first to 3 prizes wins.");
    box.append(el("h4", "", "Getting better cards"));
    p("Win battles for a prize card and Sparkle Dust. Cards you use gain experience; each star (up to 5) makes them stronger. Polish a card with Sparkle Dust in the Collection.");
    p("Build your decks in the deck builder: 20-40 cards. Duel decks need 8 monsters, Pal decks need 4 basics and 6 energy.");
    p("Everything here uses play rewards only. There are no real purchases.");
  }

  /* ---------------------------------------------------------- Dark Duel battle */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function duelInst(card, uid) {
    return { ...card, uid, atk: duelAtk(card), def: duelDef(card), pos: "atk", hasAttacked: false, wardUsed: false };
  }
  function startDuel(rival) {
    const errs = validateDeck("duel", deckIds("duel"));
    if (errs.length) { toast("Fix your deck first: " + errs[0]); view = "duel-deck"; deckDraft = { game: "duel", ids: deckIds("duel") }; render(); return; }
    battle = {
      game: "duel", rival, phase: "turn", turn: "you", winner: null,
      lp: { you: 4000, rival: 4000 },
      deck: { you: buildDeckList("duel", deckIds("duel")), rival: buildDeckList("duel", aiDeck("duel", rival)) },
      hand: { you: [], rival: [] }, field: { you: [], rival: [] },
      traps: { you: [], rival: [] }, grave: { you: [], rival: [] },
      summoned: false, buff: { you: 0, rival: 0 }, burn: { you: 0, rival: 0 },
      used: new Set(), log: [], sel: null
    };
    duelDraw("you", 5); duelDraw("rival", 5);
    logLine(`<b>${rival.name}</b> steps up. “${rival.line}”`);
    logLine("You go first. Draw 1, summon 1 monster, then attack.");
    view = "duel-battle"; render();
    speak(pick(["Duel time. Let's win this.", "Okay, focus. 4000 Life Points each.", `${rival.name}? I've got your back.`]));
  }
  function aiDeck(game, rival) {
    // the rival's deck: fair copies from the same card pool, scaled by rank
    const pool = cardsOf(game);
    const ids = [];
    const rankBoost = rival.rank;
    const take = (pred, n) => { const list = pool.filter(pred); for (let i = 0; i < n && list.length; i++) ids.push(pick(list).id); };
    if (game === "duel") {
      take((c) => c.kind === "monster" && c.level <= 4, 12 + rankBoost);
      take((c) => c.kind === "monster" && c.level >= 5, 4 + rankBoost);
      take((c) => c.kind === "spell", 5);
      take((c) => c.kind === "trap", 3);
    } else {
      take((c) => c.kind === "creature" && c.stage === 0, 10);
      take((c) => c.kind === "creature" && c.stage > 0, 4 + rankBoost);
      take((c) => c.kind === "energy", 7);
      take((c) => c.kind === "trainer", 3);
    }
    while (ids.length < 20) ids.push(pick(pool.filter((c) => c.kind !== "energy")).id);
    return ids.slice(0, 26);
  }
  function logLine(html) { if (!battle) return; battle.log.push(html); battle.log = battle.log.slice(-30); }
  function duelDraw(side, n) {
    for (let i = 0; i < n && battle.deck[side].length; i++) battle.hand[side].push(battle.deck[side].pop());
  }
  function fxOf(card) { return card.fx || []; }
  function hasFx(card, t) { return fxOf(card).some((f) => f.t === t); }
  function fxN(card, t) { const f = fxOf(card).find((x) => x.t === t); return f ? f.n || 0 : 0; }
  function effAtk(inst, side) { return inst.atk + (battle.buff[side] || 0) + (inst.pos === "atk" ? fxN(inst, "add") : 0); }
  function startDuelTurn(side) {
    battle.turn = side; battle.summoned = false; battle.buff = { you: 0, rival: 0 };
    battle.field[side].forEach((m) => { m.hasAttacked = false; });
    if (battle.burn[side] > 0) {
      battle.lp[side] -= battle.burn[side];
      logLine(`Burn: ${side === "you" ? "you take" : battle.rival.name + " takes"} ${battle.burn[side]} damage.`);
      battle.burn[side] = 0;
    }
    duelDraw(side, 1);
    checkDuelWin();
  }
  function tributeCost(card) { return card.level >= 7 ? 2 : card.level >= 5 ? 1 : 0; }
  function canSummon(side, card) {
    if (card.kind !== "monster" || card.fusion) return false;
    if (battle.summoned) return false;
    return battle.field[side].length >= tributeCost(card);
  }
  function doTributes(side, n) {
    const field = battle.field[side].slice().sort((a, b) => a.atk - b.atk);
    for (let i = 0; i < n && field.length; i++) {
      const t = field.shift();
      battle.field[side] = battle.field[side].filter((m) => m.uid !== t.uid);
      battle.grave[side].push(t);
      logLine(`${side === "you" ? "You tribute" : battle.rival.name + " tributes"} ${t.name}.`);
    }
  }
  function summonMonster(side, card) {
    const cost = tributeCost(card);
    if (cost) doTributes(side, cost);
    battle.hand[side] = battle.hand[side].filter((c) => c.uid !== card.uid);
    const inst = duelInst(card, card.uid);
    battle.field[side].push(inst);
    battle.summoned = true;
    battle.used.add(card.id);
    logLine(`${side === "you" ? "You summon" : battle.rival.name + " summons"} ${card.name} (${inst.atk}/${inst.def}).`);
    return inst;
  }
  function setTrap(side, card) {
    battle.hand[side] = battle.hand[side].filter((c) => c.uid !== card.uid);
    battle.traps[side].push({ ...card, uid: card.uid });
    battle.used.add(card.id);
    logLine(`${side === "you" ? "You set" : battle.rival.name + " sets"} a trap face-down.`);
  }
  function fireTrap(defSide, atkSide, attacker) {
    // returns true if the attack was stopped
    const trap = battle.traps[defSide][0];
    if (!trap) return false;
    if (atkSide === "you" && Math.random() > battle.rival.smart) return false; // AI holds its trap
    battle.traps[defSide].shift();
    battle.grave[defSide].push(trap);
    if (hasFx(trap, "destroyAtk")) {
      destroyMonster(atkSide, attacker);
      logLine(`${defSide === "you" ? "Your" : battle.rival.name + "'s"} Grave Snare destroys ${attacker.name}!`);
      return true;
    }
    if (hasFx(trap, "reflect")) {
      battle.lp[atkSide] -= fxN(trap, "reflect");
      logLine(`${defSide === "you" ? "Your" : battle.rival.name + "'s"} Mirror Veil reflects the attack — ${fxN(trap, "reflect")} damage back!`);
      return true;
    }
    if (hasFx(trap, "weakenAtk")) {
      attacker.atk = Math.max(0, attacker.atk - fxN(trap, "weakenAtk"));
      logLine(`${defSide === "you" ? "Your" : battle.rival.name + "'s"} Shadow Bind weakens ${attacker.name} by ${fxN(trap, "weakenAtk")}.`);
      return false;
    }
    return false;
  }
  function destroyMonster(side, inst) {
    if (hasFx(inst, "ward") && !inst.wardUsed) { inst.wardUsed = true; logLine(`${inst.name} survives — its ward holds!`); return false; }
    battle.field[side] = battle.field[side].filter((m) => m.uid !== inst.uid);
    battle.grave[side].push(inst);
    return true;
  }
  function duelAttack(attSide, attacker, target) {
    const defSide = attSide === "you" ? "rival" : "you";
    if (attacker.hasAttacked) { toast("That monster already attacked this turn."); return; }
    if (target) {
      // trap check first
      if (fireTrap(defSide, attSide, attacker)) { attacker.hasAttacked = true; checkDuelWin(); render(); return; }
      const aAtk = effAtk(attacker, attSide);
      const dAtk = target.atk, dDef = target.def;
      attacker.hasAttacked = true;
      battle.used.add(attacker.id);
      if (hasFx(attacker, "weak")) { target.atk = Math.max(0, target.atk - fxN(attacker, "weak")); logLine(`${attacker.name} weakens ${target.name} by ${fxN(attacker, "weak")}.`); }
      if (target.pos === "atk") {
        if (aAtk > dAtk) {
          destroyMonster(defSide, target);
          battle.lp[defSide] -= (aAtk - dAtk);
          logLine(`${attacker.name} destroys ${target.name}! ${defSide === "you" ? "You take" : battle.rival.name + " takes"} ${aAtk - dAtk} damage.`);
          if (hasFx(attacker, "drain")) { battle.lp[attSide] += fxN(attacker, "drain"); logLine(`${attacker.name} drains ${fxN(attacker, "drain")} back.`); }
        } else if (aAtk < dAtk) {
          destroyMonster(attSide, attacker);
          battle.lp[attSide] -= (dAtk - aAtk);
          logLine(`${target.name} destroys ${attacker.name}! ${attSide === "you" ? "You take" : battle.rival.name + " takes"} ${dAtk - aAtk} damage.`);
        } else {
          destroyMonster(defSide, target); destroyMonster(attSide, attacker);
          logLine(`${attacker.name} and ${target.name} destroy each other.`);
        }
      } else {
        if (aAtk > dDef) {
          destroyMonster(defSide, target);
          if (hasFx(attacker, "pierce")) { battle.lp[defSide] -= (aAtk - dDef); logLine(`${attacker.name} pierces through! ${target.name} is destroyed and ${aAtk - dDef} damage goes through.`); }
          else logLine(`${attacker.name} destroys ${target.name} (defence). No Life Point damage.`);
          if (hasFx(attacker, "drain")) { battle.lp[attSide] += fxN(attacker, "drain"); }
        } else if (aAtk < dDef) {
          battle.lp[attSide] -= (dDef - aAtk);
          logLine(`${attacker.name} bounces off ${target.name}'s defence. ${attSide === "you" ? "You take" : battle.rival.name + " takes"} ${dDef - aAtk} damage.`);
        } else logLine(`${attacker.name} matches ${target.name}'s defence. Nothing happens.`);
      }
    } else {
      // direct attack
      if (battle.field[defSide].length) { toast("Attack their monsters first — or attack directly when their field is empty."); return; }
      if (fireTrap(defSide, attSide, attacker)) { attacker.hasAttacked = true; checkDuelWin(); render(); return; }
      const aAtk = effAtk(attacker, attSide);
      attacker.hasAttacked = true;
      battle.used.add(attacker.id);
      battle.lp[defSide] -= aAtk;
      logLine(`${attacker.name} hits directly for ${aAtk}!`);
    }
    if (hasFx(attacker, "burn")) { battle.burn[defSide] = Math.max(battle.burn[defSide], fxN(attacker, "burn")); }
    checkDuelWin(); render();
  }
  function castDuelSpell(side, card) {
    const foe = side === "you" ? "rival" : "you";
    // blood ward check (enemy trap negates spells)
    const ward = battle.traps[foe].find((t) => hasFx(t, "negateSpell"));
    if (ward) {
      battle.traps[foe] = battle.traps[foe].filter((t) => t.uid !== ward.uid);
      battle.grave[foe].push(ward);
      battle.hand[side] = battle.hand[side].filter((c) => c.uid !== card.uid);
      battle.grave[side].push(card);
      battle.lp[foe] += fxN(ward, "negateSpell");
      logLine(`${foe === "you" ? "Your" : battle.rival.name + "'s"} Blood Ward negates ${card.name} and heals ${fxN(ward, "negateSpell")}!`);
      checkDuelWin(); render(); return;
    }
    battle.hand[side] = battle.hand[side].filter((c) => c.uid !== card.uid);
    battle.grave[side].push(card);
    battle.used.add(card.id);
    if (hasFx(card, "fuse")) {
      const mats = battle.field[side];
      const fusion = DUEL_CARDS.find((c) => c.fusion && c.fusion.every((id) => mats.some((m) => m.id === id)));
      if (!fusion) { toast("Fusion Rite needs both material monsters on your field."); battle.grave[side].pop(); battle.hand[side].push(card); render(); return; }
      fusion.fusion.forEach((id) => {
        const m = battle.field[side].find((x) => x.id === id);
        battle.field[side] = battle.field[side].filter((x) => x.uid !== m.uid);
        battle.grave[side].push(m);
      });
      const inst = duelInst(fusion, fusion.id + "#" + Date.now());
      battle.field[side].push(inst);
      logLine(`${side === "you" ? "You fuse" : battle.rival.name + " fuses"} ${fusion.fusion.map((id) => (DUEL_BY_ID[id] || {}).name).join(" + ")} into ${fusion.name}! (${inst.atk}/${inst.def})`);
    } else if (hasFx(card, "buff")) {
      battle.buff[side] += fxN(card, "buff");
      logLine(`${card.name}: your monsters get +${fxN(card, "buff")} attack this turn.`);
    } else if (hasFx(card, "draw")) {
      duelDraw(side, fxN(card, "draw"));
      if (card.id === "dd_bloodpact") { battle.lp[side] -= 300; logLine(`${card.name}: you draw 2 and lose 300 Life Points.`); }
      else logLine(`${card.name}: you draw ${fxN(card, "draw")}.`);
    } else if (hasFx(card, "destroy")) {
      const targets = battle.field[foe].filter((m) => m.atk <= fxN(card, "destroy")).sort((a, b) => b.atk - a.atk);
      if (!targets.length) { toast("No enemy monster weak enough to harvest."); battle.grave[side].pop(); battle.hand[side].push(card); render(); return; }
      destroyMonster(foe, targets[0]);
      logLine(`${card.name} destroys ${targets[0].name}.`);
    } else if (hasFx(card, "lp")) {
      const n = fxN(card, "lp");
      if (n < 0) { battle.lp[side] += -n; logLine(`${card.name}: heal ${-n} Life Points.`); }
      else { battle.lp[foe] -= n; logLine(`${card.name} deals ${n} damage to ${foe === "you" ? "you" : battle.rival.name}.`); }
    }
    checkDuelWin(); render();
  }
  function checkDuelWin() {
    if (!battle || battle.phase === "done") return;
    battle.lp.you = Math.max(0, battle.lp.you); battle.lp.rival = Math.max(0, battle.lp.rival);
    if (battle.lp.rival <= 0) endDuel("you");
    else if (battle.lp.you <= 0) endDuel("rival");
    else if (!battle.deck.you.length && !battle.hand.you.length && !battle.field.you.length) endDuel("rival");
    else if (!battle.deck.rival.length && !battle.hand.rival.length && !battle.field.rival.length) endDuel("you");
  }
  function endDuel(winner) {
    battle.phase = "done"; battle.winner = winner;
    const won = winner === "you";
    const used = [...battle.used];
    battle.summary = won ? awardWin("duel", used, battle.rival) : awardLoss("duel", used);
    battle.summary.won = won;
    logLine(won ? "You win the duel!" : `${battle.rival.name} wins the duel.`);
    speak(won ? pick(["We won the duel! Did you see that fusion?", "Dark Duel champion. Told you.", "That was a clean win."]) : pick(["Ugh, they got us. Rematch?", "Close one. We'll get them next time.", "Okay, that stung. Run it back."]));
    render();
  }
  async function aiDuelTurn() {
    if (!battle || battle.phase === "done") return;
    busy = true;
    startDuelTurn("rival");
    logLine(`${battle.rival.name}'s turn.`);
    render(); await sleep(600);
    if (battle.phase === "done") { busy = false; return; }
    const smart = battle.rival.smart;
    // fusion first if possible
    const rite = battle.hand.rival.find((c) => c.id === "dd_fusionrite");
    const canFuse = rite && DUEL_CARDS.some((c) => c.fusion && c.fusion.every((id) => battle.field.rival.some((m) => m.id === id)));
    if (rite && canFuse && Math.random() < smart + 0.2) { castDuelSpell("rival", rite); render(); await sleep(500); }
    // summon the strongest monster it can
    const summonable = battle.hand.rival.filter((c) => c.kind === "monster" && canSummon("rival", c));
    if (summonable.length && (!battle.summoned || Math.random() < 0.3)) {
      summonable.sort((a, b) => duelAtk(b) - duelAtk(a));
      const choice = Math.random() < smart ? summonable[0] : pick(summonable);
      summonMonster("rival", choice);
      render(); await sleep(500);
    }
    // set a trap
    const trap = battle.hand.rival.find((c) => c.kind === "trap");
    if (trap && !battle.traps.rival.length && Math.random() < smart + 0.2) { setTrap("rival", trap); render(); await sleep(400); }
    // cast a helpful spell
    const spell = battle.hand.rival.find((c) => c.kind === "spell" && (
      (c.id === "dd_hexbolt") || (c.id === "dd_moonlight" && battle.lp.rival < 2500) ||
      (c.id === "dd_darkmoon" && battle.field.rival.length > 0) ||
      (c.id === "dd_soulharvest" && battle.field.you.some((m) => m.atk <= 1500)) ||
      (c.id === "dd_bloodpact" && battle.hand.rival.length < 3)));
    if (spell && Math.random() < smart + 0.15) { castDuelSpell("rival", spell); render(); await sleep(500); }
    // attack with everything
    for (const m of battle.field.rival.slice()) {
      if (battle.phase === "done" || !battle.field.rival.some((x) => x.uid === m.uid)) continue;
      const targets = battle.field.you.slice().sort((a, b) => a.atk - b.atk);
      if (targets.length) {
        const t = Math.random() < smart ? targets[0] : pick(targets);
        duelAttack("rival", m, t);
      } else {
        duelAttack("rival", m, null);
      }
      render(); await sleep(650);
      if (battle.phase === "done") break;
    }
    if (battle.phase !== "done") {
      startDuelTurn("you");
      logLine("Your turn. Draw 1, summon, attack.");
      render();
    }
    busy = false;
  }

  /* ---------------------------------------------------------- Dark Duel view */
  function lpBar(b) {
    const row = el("div", "ccg-lp");
    row.append(el("span", "you", `You ♥ ${battle.lp.you}`));
    const bar = el("div", "ccg-h-bar"); const fill = el("span");
    fill.style.width = Math.round(battle.lp.you / 4000 * 100) + "%"; bar.append(fill); row.append(bar);
    row.append(el("span", "foe", `${battle.rival.name} ♥ ${battle.lp.rival}`));
    const foe = row.lastChild;
    foe.style.cursor = "pointer";
    foe.addEventListener("click", () => {
      if (!battle || battle.turn !== "you" || busy || battle.phase === "done") return;
      if (battle.sel && battle.sel.side === "you") {
        const att = battle.field.you.find((x) => x.uid === battle.sel.uid);
        if (att && !att.hasAttacked) { duelAttack("you", att, null); battle.sel = null; }
      }
    });
    b.append(row);
  }
  function duelBattleView(box) {
    const b = battle;
    lpBar(box);
    // rival side
    box.append(el("span", "ccg-zone-label", `${b.rival.name} · ${b.hand.rival.length} cards in hand · deck ${b.deck.rival.length}`));
    const rZone = el("div", "ccg-zone");
    if (!b.field.rival.length) rZone.append(el("span", "ccg-zone-label", "No monsters"));
    b.field.rival.forEach((m) => {
      const n = cardEl(m, { button: true, small: true });
      if (m.pos === "def") n.append(el("span", "ccg-lock", "DEF"));
      n.addEventListener("click", () => {
        if (b.turn !== "you" || busy || b.phase === "done") return;
        if (b.sel && b.sel.side === "you") {
          const att = b.field.you.find((x) => x.uid === b.sel.uid);
          if (att && !att.hasAttacked) { duelAttack("you", att, m); b.sel = null; }
        }
      });
      rZone.append(n);
    });
    box.append(rZone);
    const rTraps = el("div", "ccg-zone");
    if (!b.traps.rival.length) rTraps.append(el("span", "ccg-zone-label", "No set traps"));
    b.traps.rival.forEach((t) => { const n = cardEl(t, { small: true }); n.classList.add("ccg-trap"); n.append(el("span", "ccg-lock", "Face-down")); rTraps.append(n); });
    box.append(rTraps);
    // your side
    box.append(el("span", "ccg-zone-label", `Your field · traps ${b.traps.you.length} set`));
    const yZone = el("div", "ccg-zone");
    if (!b.field.you.length) yZone.append(el("span", "ccg-zone-label", "No monsters — summon one from your hand"));
    b.field.you.forEach((m) => {
      const n = cardEl(m, { button: true, small: true, sel: b.sel && b.sel.uid === m.uid });
      if (m.pos === "def") n.append(el("span", "ccg-lock", "DEF"));
      if (m.hasAttacked) n.classList.add("faded");
      n.addEventListener("click", () => {
        if (b.turn !== "you" || busy || b.phase === "done") return;
        b.sel = (b.sel && b.sel.uid === m.uid) ? null : { side: "you", uid: m.uid };
        render();
      });
      yZone.append(n);
    });
    box.append(yZone);
    const yTraps = el("div", "ccg-zone");
    if (!b.traps.you.length) yTraps.append(el("span", "ccg-zone-label", "No traps set"));
    b.traps.you.forEach((t) => { const n = cardEl(t, { small: true }); n.classList.add("ccg-trap"); n.append(el("span", "ccg-lock", "Face-down")); yTraps.append(n); });
    box.append(yTraps);
    // selected monster actions
    if (b.sel && b.turn === "you") {
      const m = b.field.you.find((x) => x.uid === b.sel.uid);
      if (m) {
        const bar = el("div", "ccg-battle-btns");
        bar.append(el("span", "", `${m.name} selected — tap an enemy monster to attack, or tap the rival's Life Points above to attack directly.`));
        const sw = el("button", "wide-btn", m.pos === "atk" ? "Switch to defence" : "Switch to attack"); sw.type = "button";
        sw.addEventListener("click", () => { m.pos = m.pos === "atk" ? "def" : "atk"; logLine(`${m.name} switches to ${m.pos === "atk" ? "attack" : "defence"} position.`); render(); });
        const cancel = el("button", "wide-btn", "Cancel"); cancel.type = "button";
        cancel.addEventListener("click", () => { b.sel = null; render(); });
        bar.append(sw, cancel);
        box.append(bar);
      }
    }
    // hand
    box.append(el("span", "ccg-zone-label", `Your hand · deck ${b.deck.you.length}`));
    const hand = el("div", "ccg-hand");
    b.hand.you.forEach((card) => {
      const n = cardEl(card, { button: true });
      const summonable = card.kind === "monster" && canSummon("you", card);
      if (card.kind === "monster" && !summonable) n.classList.add("faded");
      if (card.kind === "monster" && summonable) n.classList.add("atk-ok");
      n.addEventListener("click", () => {
        if (b.turn !== "you" || busy || b.phase === "done") return;
        if (card.kind === "monster") {
          if (card.fusion) { toast("Fusion monsters can't be summoned from your hand — fuse them with Fusion Rite."); return; }
          if (!summonable) {
            if (b.summoned) toast("You already summoned a monster this turn.");
            else toast(`That needs ${tributeCost(card)} tribute${tributeCost(card) === 1 ? "" : "s"} — you need ${tributeCost(card)} monster${tributeCost(card) === 1 ? "" : "s"} on the field.`);
            return;
          }
          summonMonster("you", card); render();
        } else if (card.kind === "trap") { setTrap("you", card); render(); }
        else if (card.kind === "spell") { castDuelSpell("you", card); }
      });
      hand.append(n);
    });
    box.append(hand);
    // log + end turn
    const log = el("ul", "ccg-log");
    b.log.slice(-12).forEach((l) => { const li = el("li", ""); li.innerHTML = l; log.append(li); });
    box.append(log);
    if (b.phase === "done") {
      const s = b.summary;
      const res = el("div", "ccg-final " + (s.won ? "won" : "lost"));
      res.append(el("h3", "", s.won ? "You won the duel!" : `${b.rival.name} won this time`));
      const ul = el("ul", "ccg-lines");
      ul.append(el("li", "", `+${s.dust} Sparkle Dust`));
      ul.append(el("li", "", "Cards you played gained experience"));
      (s.starUps || []).forEach((t) => ul.append(el("li", "", t)));
      res.append(ul);
      box.append(res);
      const again = el("button", "wide-btn accent", s.prize ? "Open your prize" : "Rematch"); again.type = "button";
      again.addEventListener("click", () => {
        if (s.prize) { const card = s.prize; const p = s.prizeRes; s.prize = null; reveal([card], "Duel prize", p.dust ? `You already had 3, so it became ${p.dust} Sparkle Dust.` : `${card.name} joined your collection.`); render(); }
        else startDuel(b.rival);
      });
      box.append(again);
      const back = el("button", "wide-btn", "Back to rivals"); back.type = "button";
      back.addEventListener("click", () => { battle = null; view = "duel"; render(); });
      box.append(back);
    } else {
      const end = el("button", "wide-btn accent ccg-go", b.turn === "you" ? "End turn" : `${b.rival.name} is thinking…`); end.type = "button";
      end.disabled = b.turn !== "you" || busy;
      end.addEventListener("click", async () => { if (busy) return; b.sel = null; render(); await aiDuelTurn(); });
      box.append(end);
      const quit = el("button", "wide-btn subtle", "Leave the duel"); quit.type = "button";
      quit.addEventListener("click", () => { if (confirm("Leave this duel? It won't count.")) { battle = null; view = "duel"; render(); } });
      box.append(quit);
    }
  }

  /* ---------------------------------------------------------- Spirit Pals battle */
  function palsInst(card, uid) {
    return { ...card, uid, hp: palsHp(card), maxHp: palsHp(card), energy: [], shield: 0, burn: 0, weak: 0 };
  }
  function palsDraw(side, n) {
    for (let i = 0; i < n && battle.deck[side].length; i++) battle.hand[side].push(battle.deck[side].pop());
  }
  function ensureBasic(side) {
    let tries = 0;
    while (!battle.hand[side].some((c) => c.kind === "creature" && c.stage === 0) && tries < 3) {
      battle.deck[side] = shuffle([...battle.deck[side], ...battle.hand[side]]);
      battle.hand[side] = [];
      palsDraw(side, 7);
      tries++;
    }
    if (!battle.hand[side].some((c) => c.kind === "creature" && c.stage === 0)) {
      const i = battle.deck[side].findIndex((c) => c.kind === "creature" && c.stage === 0);
      if (i !== -1) battle.hand[side].push(battle.deck[side].splice(i, 1)[0]);
    }
  }
  function setActive(side, card) {
    battle.hand[side] = battle.hand[side].filter((c) => c.uid !== card.uid);
    battle.active[side] = palsInst(card, card.uid);
    battle.used.add(card.id);
    logLine(`${side === "you" ? "You send out" : battle.rival.name + " sends out"} ${card.name}!`);
  }
  function startPals(rival) {
    const errs = validateDeck("pals", deckIds("pals"));
    if (errs.length) { toast("Fix your deck first: " + errs[0]); view = "pals-deck"; deckDraft = { game: "pals", ids: deckIds("pals") }; render(); return; }
    battle = {
      game: "pals", rival, phase: "setup", turn: "you", winner: null,
      deck: { you: buildDeckList("pals", deckIds("pals")), rival: buildDeckList("pals", aiDeck("pals", rival)) },
      hand: { you: [], rival: [] }, active: { you: null, rival: null }, bench: { you: [], rival: [] },
      discard: { you: [], rival: [] }, prizes: { you: 0, rival: 0 },
      attached: false, evolved: false, attacked: false, awaitPromote: false,
      used: new Set(), log: [], sel: null
    };
    palsDraw("you", 7); palsDraw("rival", 7);
    ensureBasic("you"); ensureBasic("rival");
    const aiBasics = battle.hand.rival.filter((c) => c.kind === "creature" && c.stage === 0);
    aiBasics.sort((a, b) => palsHp(b) - palsHp(a));
    setActive("rival", aiBasics[0]);
    logLine(`<b>${rival.name}</b> is ready. “${rival.line}”`);
    logLine("Pick a basic pal from your hand to send out first.");
    view = "pals-battle"; render();
    speak(pick(["Pal battle! Pick your starter.", "Okay, let's win some prizes.", `${rival.name}? Our pals have got this.`]));
  }
  function startPalsTurn(side) {
    battle.turn = side; battle.attached = false; battle.evolved = false; battle.attacked = false;
    const act = battle.active[side];
    if (act) {
      act.weak = 0;
      if (act.burn > 0) { logLine(`${act.name} takes ${act.burn} burn damage.`); damageCreature(side, act, act.burn); act.burn = 0; }
    }
    palsDraw(side, 1);
    checkPalsWin();
  }
  function damageCreature(side, inst, n) {
    let dmg = n;
    if (inst.shield > 0) {
      const blocked = Math.min(inst.shield, dmg);
      inst.shield -= blocked; dmg -= blocked;
      if (blocked) logLine(`${inst.name}'s cloak blocks ${blocked} damage.`);
    }
    if (dmg <= 0) return;
    inst.hp -= dmg;
    if (inst.hp <= 0) { inst.hp = 0; koCreature(side, inst); }
  }
  function koCreature(side, inst) {
    const foe = side === "you" ? "rival" : "you";
    battle.discard[side].push(inst);
    if (battle.active[side] && battle.active[side].uid === inst.uid) battle.active[side] = null;
    else battle.bench[side] = battle.bench[side].filter((b) => b.uid !== inst.uid);
    battle.prizes[foe]++;
    logLine(`${inst.name} is knocked out! ${foe === "you" ? "You take" : battle.rival.name + " takes"} a prize card (${battle.prizes[foe]}/3).`);
    checkPalsWin();
    if (battle.phase === "done") return;
    if (side === "you") {
      if (!battle.bench.you.length) { endPals("rival"); return; }
      battle.awaitPromote = true;
      logLine("Pick a pal from your bench to send out.");
    } else {
      if (!battle.bench.rival.length) { endPals("you"); return; }
      battle.bench.rival.sort((a, b) => b.hp - a.hp);
      const next = battle.bench.rival[0];
      battle.bench.rival = battle.bench.rival.filter((b) => b.uid !== next.uid);
      battle.active.rival = next;
      logLine(`${battle.rival.name} sends out ${next.name}.`);
    }
  }
  function checkPalsWin() {
    if (!battle || battle.phase === "done") return;
    if (battle.prizes.you >= 3) endPals("you");
    else if (battle.prizes.rival >= 3) endPals("rival");
  }
  function endPals(winner) {
    battle.phase = "done"; battle.winner = winner;
    const won = winner === "you";
    const used = [...battle.used];
    battle.summary = won ? awardWin("pals", used, battle.rival) : awardLoss("pals", used);
    battle.summary.won = won;
    logLine(won ? "You win the pal battle!" : `${battle.rival.name} wins the pal battle.`);
    speak(won ? pick(["We won! Three prizes, baby.", "Our pals are the best. Told you.", "That was a great battle."]) : pick(["So close. Rematch?", "They got us this time. Next battle is ours.", "Okay, that stung. Run it back."]));
    render();
  }
  function attachEnergy(side, energyCard, target) {
    if (battle.attached) { toast("You already attached energy this turn."); return; }
    battle.hand[side] = battle.hand[side].filter((c) => c.uid !== energyCard.uid);
    target.energy.push(energyCard.etype);
    battle.attached = true; battle.used.add(energyCard.id);
    logLine(`${target.name} gains ${energyCard.etype === "wild" ? "Wild" : PALS_TYPES[energyCard.etype].label} energy.`);
  }
  function evolvePal(side, evoCard, target) {
    if (battle.evolved) { toast("You already evolved a pal this turn."); return; }
    if (target.id !== evoCard.evolvesFrom) return;
    const inst = palsInst(evoCard, target.uid);
    inst.energy = target.energy; inst.shield = target.shield; inst.burn = target.burn;
    inst.hp = Math.max(1, inst.maxHp - (target.maxHp - target.hp));
    if (battle.active[side] && battle.active[side].uid === target.uid) battle.active[side] = inst;
    else { const i = battle.bench[side].findIndex((b) => b.uid === target.uid); if (i !== -1) battle.bench[side][i] = inst; }
    battle.hand[side] = battle.hand[side].filter((c) => c.uid !== evoCard.uid);
    battle.evolved = true; battle.used.add(evoCard.id);
    logLine(`${target.name} evolves into ${evoCard.name}!`);
  }
  function playTrainer(side, card) {
    battle.hand[side] = battle.hand[side].filter((c) => c.uid !== card.uid);
    battle.discard[side].push(card); battle.used.add(card.id);
    const act = battle.active[side];
    if (hasFx(card, "heal") && act) { act.hp = Math.min(act.maxHp, act.hp + fxN(card, "heal")); logLine(`${card.name} heals ${act.name} by ${fxN(card, "heal")}.`); }
    if (hasFx(card, "draw")) { palsDraw(side, fxN(card, "draw")); logLine(`${card.name}: draw ${fxN(card, "draw")} cards.`); }
    if (hasFx(card, "shield") && act) { act.shield = Math.max(act.shield, fxN(card, "shield")); logLine(`${act.name} is cloaked — blocks the next ${fxN(card, "shield")} damage.`); }
  }
  function retreatPal(side, benchInst) {
    const act = battle.active[side];
    if (!act || !act.energy.length) { toast("Retreat needs at least 1 energy on the active pal to discard."); return; }
    act.energy.pop();
    battle.active[side] = benchInst;
    battle.bench[side] = battle.bench[side].filter((b) => b.uid !== benchInst.uid);
    battle.bench[side].push(act);
    logLine(`${act.name} retreats. ${benchInst.name} takes the front!`);
  }
  function palsAttack(attSide, attack) {
    const defSide = attSide === "you" ? "rival" : "you";
    const att = battle.active[attSide], def = battle.active[defSide];
    if (!att || !def || battle.attacked) return;
    if (att.energy.length < attack.cost) { toast(`${attack.name} needs ${attack.cost} energy. ${att.name} has ${att.energy.length}.`); return; }
    let dmg = attack.dmg;
    if (att.weak) dmg = Math.max(0, dmg - att.weak);
    (attack.fx || []).forEach((f) => { if (f.t === "add") dmg += f.n; });
    if (PALS_TYPES[def.type].weak === att.type) { dmg *= 2; logLine("It's super effective! Weakness — double damage."); }
    battle.attacked = true;
    battle.used.add(att.id);
    logLine(`${att.name} uses ${attack.name} for ${dmg}!`);
    const before = def.hp;
    damageCreature(defSide, def, dmg);
    (attack.fx || []).forEach((f) => {
      if (f.t === "burn") { def.burn = Math.max(def.burn, f.n); logLine(`${def.name} is burning.`); }
      if (f.t === "heal") { att.hp = Math.min(att.maxHp, att.hp + f.n); logLine(`${att.name} heals ${f.n}.`); }
      if (f.t === "weak") { def.weak = Math.max(def.weak, f.n); logLine(`${def.name} is weakened by ${f.n}.`); }
      if (f.t === "shield") { att.shield = Math.max(att.shield, f.n); logLine(`${att.name} is shielded.`); }
      if (f.t === "drain") {
        const dealt = before - Math.max(0, def.hp);
        if (dealt > 0) { att.hp = Math.min(att.maxHp, att.hp + Math.min(f.n, dealt)); logLine(`${att.name} drains ${Math.min(f.n, dealt)} back.`); }
      }
    });
    checkPalsWin(); render();
  }
  async function aiPalsTurn() {
    if (!battle || battle.phase === "done") return;
    busy = true;
    startPalsTurn("rival");
    logLine(`${battle.rival.name}'s turn.`);
    render(); await sleep(600);
    if (battle.phase === "done") { busy = false; return; }
    const smart = battle.rival.smart;
    const act = battle.active.rival;
    // attach energy
    if (act && !battle.attached) {
      const e = battle.hand.rival.find((c) => c.kind === "energy" && (c.etype === act.type || c.etype === "wild")) || battle.hand.rival.find((c) => c.kind === "energy");
      if (e) { attachEnergy("rival", e, act); render(); await sleep(400); }
    }
    // evolve
    if (act && !battle.evolved) {
      const evo = battle.hand.rival.find((c) => c.kind === "creature" && c.evolvesFrom === act.id);
      const benchEvo = battle.bench.rival.map((b) => battle.hand.rival.find((c) => c.kind === "creature" && c.evolvesFrom === b.id)).find(Boolean);
      if (evo && Math.random() < smart + 0.2) { evolvePal("rival", evo, act); render(); await sleep(400); }
      else if (benchEvo && Math.random() < smart) { const t = battle.bench.rival.find((b) => b.id === benchEvo.evolvesFrom); evolvePal("rival", benchEvo, t); render(); await sleep(400); }
    }
    // trainer: heal when hurt, draw when low on cards
    const heal = battle.hand.rival.find((c) => c.kind === "trainer" && hasFx(c, "heal"));
    const drawT = battle.hand.rival.find((c) => c.kind === "trainer" && hasFx(c, "draw"));
    if (heal && battle.active.rival && battle.active.rival.hp < battle.active.rival.maxHp * 0.6 && Math.random() < smart + 0.2) { playTrainer("rival", heal); render(); await sleep(400); }
    else if (drawT && battle.hand.rival.length < 3 && Math.random() < smart) { playTrainer("rival", drawT); render(); await sleep(400); }
    // bench a basic if there's room
    if (battle.bench.rival.length < 3) {
      const basic = battle.hand.rival.find((c) => c.kind === "creature" && c.stage === 0);
      if (basic && Math.random() < smart + 0.2) {
        battle.hand.rival = battle.hand.rival.filter((c) => c.uid !== basic.uid);
        battle.bench.rival.push(palsInst(basic, basic.uid));
        logLine(`${battle.rival.name} puts ${basic.name} on the bench.`);
        render(); await sleep(400);
      }
    }
    // attack
    const a2 = battle.active.rival;
    if (a2 && battle.active.you && !battle.attacked) {
      const affordable = (a2.attacks || []).filter((atk) => a2.energy.length >= atk.cost);
      if (affordable.length) {
        affordable.sort((x, y) => y.dmg - x.dmg);
        const choice = Math.random() < smart ? affordable[0] : pick(affordable);
        palsAttack("rival", choice);
        render(); await sleep(650);
      } else logLine(`${a2.name} has no energy to attack.`);
    }
    if (battle.phase !== "done") {
      startPalsTurn("you");
      logLine("Your turn. Draw 1, attach energy, evolve, attack.");
      render();
    }
    busy = false;
  }

  /* ---------------------------------------------------------- Spirit Pals view */
  function hpBar(inst) {
    const row = el("div", "ccg-h-bar");
    const fill = el("span");
    fill.style.width = Math.round(inst.hp / inst.maxHp * 100) + "%";
    fill.style.background = "linear-gradient(90deg,#7bc96b,#a6e3a1)";
    row.append(fill);
    return row;
  }
  function energyDots(inst) {
    const row = el("span", "");
    (inst.energy || []).forEach((t) => {
      const d = el("i", "");
      d.textContent = "●";
      d.style.color = t === "wild" ? "#d4af37" : PALS_TYPES[t].color;
      d.style.fontStyle = "normal";
      row.append(d);
    });
    return row;
  }
  function palsCreatureEl(inst, opts = {}) {
    const wrap = el("div", "");
    const n = cardEl(inst, { button: !!opts.button, small: true, sel: opts.sel });
    if (inst.shield > 0) n.append(el("span", "ccg-lock", `Shield ${inst.shield}`));
    if (inst.burn > 0) n.append(el("span", "ccg-lock", `Burn ${inst.burn}`));
    if (opts.button) n.type = "button";
    wrap.append(n);
    const hp = el("span", "ccg-type", `${inst.hp}/${inst.maxHp} HP · energy `);
    hp.append(energyDots(inst));
    wrap.append(hp, hpBar(inst));
    return wrap;
  }
  function palsBattleView(box) {
    const b = battle;
    // prizes
    const pz = el("div", "ccg-lp");
    const py = el("span", "you", "Your prizes");
    const pd = el("span", "ccg-prizes");
    for (let i = 0; i < 3; i++) pd.append(el("i", i < b.prizes.you ? "won" : ""));
    const pf = el("span", "foe", `${b.rival.name}'s prizes`);
    const pd2 = el("span", "ccg-prizes");
    for (let i = 0; i < 3; i++) pd2.append(el("i", i < b.prizes.rival ? "won" : ""));
    pz.append(py, pd, pf, pd2);
    box.append(pz);
    if (b.phase === "setup") {
      box.append(el("p", "help", "Pick a basic pal from your hand to send out first. (Tap one.)"));
      const hand = el("div", "ccg-hand");
      b.hand.you.filter((c) => c.kind === "creature" && c.stage === 0).forEach((card) => {
        const n = cardEl(card, { button: true });
        n.addEventListener("click", () => {
          setActive("you", card);
          b.phase = "turn";
          startPalsTurn("you");
          logLine("Your turn. Draw 1, attach energy, evolve, attack.");
          render();
        });
        hand.append(n);
      });
      box.append(hand);
      const log = el("ul", "ccg-log");
      b.log.forEach((l) => { const li = el("li", ""); li.innerHTML = l; log.append(li); });
      box.append(log);
      return;
    }
    // rival side
    box.append(el("span", "ccg-zone-label", `${b.rival.name} · ${b.hand.rival.length} cards in hand · deck ${b.deck.rival.length}`));
    if (b.active.rival) box.append(palsCreatureEl(b.active.rival));
    const rBench = el("div", "ccg-zone");
    if (!b.bench.rival.length) rBench.append(el("span", "ccg-zone-label", "Bench empty"));
    b.bench.rival.forEach((m) => rBench.append(palsCreatureEl(m)));
    box.append(rBench);
    // your bench
    box.append(el("span", "ccg-zone-label", b.awaitPromote ? "Pick a pal from your bench to send out!" : "Your bench (tap to retreat, attach energy, or evolve)"));
    const yBench = el("div", "ccg-zone");
    if (!b.bench.you.length) yBench.append(el("span", "ccg-zone-label", "Bench empty — play basic pals from your hand"));
    b.bench.you.forEach((m) => {
      const w = palsCreatureEl(m, { button: true, sel: b.sel && b.sel.uid === m.uid });
      w.querySelector("button").addEventListener("click", () => onBenchTap(m));
      yBench.append(w);
    });
    box.append(yBench);
    // your active
    box.append(el("span", "ccg-zone-label", "Your active pal"));
    if (b.active.you) {
      const aw = palsCreatureEl(b.active.you, { button: true, sel: b.sel && b.sel.uid === b.active.you.uid });
      aw.querySelector("button").addEventListener("click", () => onActiveTap(b.active.you));
      box.append(aw);
      // attack buttons
      const atkRow = el("div", "ccg-battle-btns");
      (b.active.you.attacks || []).forEach((atk) => {
        const can = b.turn === "you" && !b.attacked && b.active.you.energy.length >= atk.cost && b.phase !== "done";
        const btn = el("button", "wide-btn" + (can ? " accent" : ""), `${atk.name} · ${"●".repeat(atk.cost)} · ${atk.dmg} dmg`);
        btn.type = "button"; btn.disabled = !can;
        btn.addEventListener("click", () => palsAttack("you", atk));
        atkRow.append(btn);
      });
      box.append(atkRow);
    } else if (!b.awaitPromote) {
      box.append(el("p", "help", "No active pal."));
    }
    // hand
    box.append(el("span", "ccg-zone-label", `Your hand · deck ${b.deck.you.length}`));
    const hand = el("div", "ccg-hand");
    b.hand.you.forEach((card) => {
      const n = cardEl(card, { button: true, sel: b.sel && b.sel.uid === card.uid });
      n.addEventListener("click", () => onHandTap(card));
      hand.append(n);
    });
    box.append(hand);
    const log = el("ul", "ccg-log");
    b.log.slice(-12).forEach((l) => { const li = el("li", ""); li.innerHTML = l; log.append(li); });
    box.append(log);
    if (b.phase === "done") {
      const s = b.summary;
      const res = el("div", "ccg-final " + (s.won ? "won" : "lost"));
      res.append(el("h3", "", s.won ? "You won the pal battle!" : `${b.rival.name} won this time`));
      res.append(el("p", "", `Prizes: you ${b.prizes.you}, ${b.rival.name} ${b.prizes.rival}.`));
      const ul = el("ul", "ccg-lines");
      ul.append(el("li", "", `+${s.dust} Sparkle Dust`));
      ul.append(el("li", "", "Pals you used gained experience"));
      (s.starUps || []).forEach((t) => ul.append(el("li", "", t)));
      res.append(ul);
      box.append(res);
      const again = el("button", "wide-btn accent", s.prize ? "Open your prize" : "Rematch"); again.type = "button";
      again.addEventListener("click", () => {
        if (s.prize) { const card = s.prize; const p = s.prizeRes; s.prize = null; reveal([card], "Battle prize", p.dust ? `You already had 4, so it became ${p.dust} Sparkle Dust.` : `${card.name} joined your collection.`); render(); }
        else startPals(b.rival);
      });
      box.append(again);
      const back = el("button", "wide-btn", "Back to rivals"); back.type = "button";
      back.addEventListener("click", () => { battle = null; view = "pals"; render(); });
      box.append(back);
    } else {
      const end = el("button", "wide-btn accent ccg-go", b.turn === "you" ? "End turn" : `${b.rival.name} is thinking…`); end.type = "button";
      end.disabled = b.turn !== "you" || busy;
      end.addEventListener("click", async () => { if (busy) return; b.sel = null; render(); await aiPalsTurn(); });
      box.append(end);
      const quit = el("button", "wide-btn subtle", "Leave the battle"); quit.type = "button";
      quit.addEventListener("click", () => { if (confirm("Leave this battle? It won't count.")) { battle = null; view = "pals"; render(); } });
      box.append(quit);
    }
  }
  function onHandTap(card) {
    const b = battle;
    if (!b || b.turn !== "you" || busy || b.phase === "done" || b.phase === "setup") return;
    if (card.kind === "creature" && card.stage === 0) {
      if (b.bench.you.length >= 3) { toast("Your bench is full (3 pals)."); return; }
      b.hand.you = b.hand.you.filter((c) => c.uid !== card.uid);
      b.bench.you.push(palsInst(card, card.uid));
      b.used.add(card.id);
      logLine(`You put ${card.name} on the bench.`);
      render();
    } else if (card.kind === "energy") {
      b.sel = (b.sel && b.sel.uid === card.uid) ? null : { kind: "energy", uid: card.uid };
      if (b.sel) toast("Now tap one of your pals to attach the energy.");
      render();
    } else if (card.kind === "creature") {
      b.sel = (b.sel && b.sel.uid === card.uid) ? null : { kind: "evolve", uid: card.uid };
      if (b.sel) toast(`Now tap the ${card.evolvesFrom ? (PALS_BY_ID[card.evolvesFrom] || {}).name : "pal"} it evolves from.`);
      render();
    } else if (card.kind === "trainer") {
      playTrainer("you", card);
      render();
    }
  }
  function onBenchTap(m) {
    const b = battle;
    if (!b || b.turn !== "you" || busy || b.phase === "done") return;
    if (b.awaitPromote) {
      b.bench.you = b.bench.you.filter((x) => x.uid !== m.uid);
      b.active.you = m;
      b.awaitPromote = false;
      logLine(`You send out ${m.name}!`);
      render();
      return;
    }
    if (b.sel && b.sel.kind === "energy") {
      const e = b.hand.you.find((c) => c.uid === b.sel.uid);
      if (e) { attachEnergy("you", e, m); b.sel = null; render(); }
      return;
    }
    if (b.sel && b.sel.kind === "evolve") {
      const evo = b.hand.you.find((c) => c.uid === b.sel.uid);
      if (evo) { evolvePal("you", evo, m); b.sel = null; render(); }
      return;
    }
    retreatPal("you", m);
    render();
  }
  function onActiveTap(m) {
    const b = battle;
    if (!b || b.turn !== "you" || busy || b.phase === "done") return;
    if (b.sel && b.sel.kind === "energy") {
      const e = b.hand.you.find((c) => c.uid === b.sel.uid);
      if (e) { attachEnergy("you", e, m); b.sel = null; render(); }
      return;
    }
    if (b.sel && b.sel.kind === "evolve") {
      const evo = b.hand.you.find((c) => c.uid === b.sel.uid);
      if (evo) { evolvePal("you", evo, m); b.sel = null; render(); }
      return;
    }
    b.sel = (b.sel && b.sel.uid === m.uid) ? null : { kind: "active", uid: m.uid };
    render();
  }

  /* ---------------------------------------------------------- render + export */
  function render() {
    if (!container) return;
    injectStyles();
    container.innerHTML = "";
    container.append(tabs());
    const box = el("div", "ccg-body");
    if (view === "duel-battle" && battle) duelBattleView(box);
    else if (view === "pals-battle" && battle) palsBattleView(box);
    else if (view === "duel-deck" || view === "pals-deck") deckBuilderView(box);
    else if (view === "collection") collectionView(box);
    else if (view === "how") howView(box);
    else if (view === "pals") playView("pals", box);
    else playView("duel", box);
    container.append(box);
  }

  return {
    render,
    open(game) { if (["duel", "pals", "collection", "how"].indexOf(game) !== -1) { if (battle && battle.phase !== "done") { if (!confirm("Leave this battle? It won't count.")) return; battle = null; } view = game; render(); } },
    status() {
      const c = S();
      return {
        dust: c.dust, view, phase: battle ? battle.phase : null,
        duel: { wins: c.duel.wins, losses: c.duel.losses, owned: DUEL_CARDS.filter((x) => (c.duel.have[x.id] || 0) > 0).length, total: DUEL_CARDS.length, deck: deckIds("duel").length },
        pals: { wins: c.pals.wins, losses: c.pals.losses, owned: PALS_CARDS.filter((x) => (c.pals.have[x.id] || 0) > 0).length, total: PALS_CARDS.length, deck: deckIds("pals").length }
      };
    },
    _debug: {
      data: () => ({ duel: DUEL_CARDS, pals: PALS_CARDS }),
      startDuel: (id) => startDuel(DUEL_RIVALS.find((r) => r.id === id) || DUEL_RIVALS[0]),
      startPals: (id) => startPals(PALS_RIVALS.find((r) => r.id === id) || PALS_RIVALS[0]),
      get battle() { return battle; }
    }
  };
}
