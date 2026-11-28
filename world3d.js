/* Aimmianna 3D — the gothic apartment.
   Four connected rooms laid out as a cut-away dollhouse (no front wall, short
   partition stubs) so the camera can glide anywhere without walls blocking
   her. Everything is low-poly boxes/cylinders, Lambert materials, four point
   lights, no shadow maps (a soft blob shadow sits under her instead), and an
   adaptive pixel ratio — tuned to hold 60fps on iPhone Safari.

   The shared avatar starts with the wardrobe portrait and can swap to the
   bundled 3D model without changing navigation, camera or wallpaper input. */
import * as THREE from "./vendor/three.module.min.js";
import { OUTFIT_3D, hasOutfit3D, buildOutfitTexture, buildGarments, buildWeapon, hasWeapon3D } from "./outfits3d.js";
import { remoteLookahead } from "./live.js"; // 2.4.23: network target smoothing for remote figures

/* Summer's wardrobe catalogue (2.4.14, moved to module scope in 2.4.19):
   high-class goth emo princess — 6 gowns, 5 shoes, 5 makeup, 6 hairstyles,
   6 hair dyes. Exported so the wardrobe panel (app.js) can render the
   lists even when the 3D world has not booted — a failed or slow world
   load used to leave her panel silently empty. The per-world picks and
   the apply function stay inside createWorld. */
export const SUMMER_WARDROBE = {
  outfit: [
    { id: "midnight_velvet", label: "Midnight Velvet Gown", desc: "Black velvet, blood-red corset lacing", accent: 0x8a0f2e, tint: [1, 0.97, 0.98] },
    { id: "crimson_princess", label: "Crimson Princess Gown", desc: "Deep crimson silk, black lace trim", accent: 0xc01535, tint: [1, 0.94, 0.94] },
    { id: "lilac_moonlight", label: "Lilac Moonlight Gown", desc: "Pale lilac chiffon, silver moon beads", accent: 0xb9a7e8, tint: [0.97, 0.96, 1] },
    { id: "onyx_ballgown", label: "Onyx Ballgown", desc: "Black satin, silver chains, sheer sleeves", accent: 0x9aa0b5, tint: [0.96, 0.97, 1] },
    { id: "rose_thorn", label: "Rose Thorn Gown", desc: "Dark rose velvet, thorn embroidery", accent: 0xd13a6e, tint: [1, 0.95, 0.97] },
    { id: "starlight_goth", label: "Starlight Gothic Gown", desc: "Midnight blue, star sequins, sheer cape", accent: 0x4a6fd6, tint: [0.95, 0.97, 1] },
  ],
  shoes: [
    { id: "mary_janes", label: "Platform Mary Janes", desc: "Black patent, chunky platform", accent: 0x222222 },
    { id: "lace_boots", label: "Knee-High Lace Boots", desc: "Black lace-up, stacked heel", accent: 0x1a1a1a },
    { id: "velvet_flats", label: "Velvet Ballet Flats", desc: "Burgundy velvet, ribbon ties", accent: 0x7a1030 },
    { id: "chunky_boots", label: "Chunky Goth Boots", desc: "Black leather, silver buckles", accent: 0x333333 },
    { id: "crystal_heels", label: "Crystal Heels", desc: "Clear heel, silver glitter", accent: 0xd8d8e8 },
  ],
  makeup: [
    { id: "smoky_doll", label: "Smoky Doll Eyes", desc: "Smoky shadow, long lashes, soft pink lips", accent: 0x6b4a5a },
    { id: "blood_lips", label: "Blood-Red Lips", desc: "Deep red lips, winged liner", accent: 0xa01028 },
    { id: "princess_blush", label: "Soft Princess Blush", desc: "Rosy cheeks, glossy nude lips", accent: 0xe8a0b0 },
    { id: "moonlight_silver", label: "Silver Moonlight", desc: "Silver shimmer eyes, pale lips", accent: 0xc8c8d8 },
    { id: "classic_goth", label: "Classic Goth", desc: "Dark lips, sharp winged liner", accent: 0x2a2a2a },
  ],
  hair: [
    { id: "loose_waves", label: "Loose Waves", desc: "Soft waves past her shoulders", accent: 0x8a5a3a },
    { id: "high_pony", label: "High Ponytail", desc: "Sleek high pony, face-framing strands", accent: 0x8a5a3a },
    { id: "twin_braids", label: "Twin Braids", desc: "Two long braids, black ribbons", accent: 0x8a5a3a },
    { id: "sleek_straight", label: "Sleek Straight", desc: "Pin-straight, centre part", accent: 0x8a5a3a },
    { id: "princess_curls", label: "Princess Curls", desc: "Big soft curls, tiara-ready", accent: 0x8a5a3a },
    { id: "crown_braid", label: "Half-Up Crown Braid", desc: "Braided crown, loose waves below", accent: 0x8a5a3a },
  ],
  dye: [
    { id: "crimson_ends", label: "Crimson Ends", desc: "Dark hair, red ends — her look", accent: 0xc01535, tint: [1, 0.92, 0.92] },
    { id: "jet_black", label: "Jet Black", desc: "Glossy black, all over", accent: 0x1a1a1a, tint: [0.97, 0.97, 0.98] },
    { id: "midnight_purple", label: "Midnight Purple", desc: "Black with a deep purple sheen", accent: 0x6a2a8a, tint: [0.97, 0.94, 1] },
    { id: "rose_pink", label: "Rose Pink", desc: "Soft rose pink, all over", accent: 0xe88aa8, tint: [1, 0.94, 0.97] },
    { id: "silver_blonde", label: "Silver Blonde", desc: "Icy silver blonde", accent: 0xd8d8e8, tint: [0.98, 0.98, 1] },
    { id: "deep_burgundy", label: "Deep Burgundy", desc: "Rich burgundy, all over", accent: 0x7a1030, tint: [1, 0.93, 0.95] },
  ],
};
export const SUMMER_WARDROBE_DEFAULT = { outfit: "midnight_velvet", shoes: "mary_janes", makeup: "smoky_doll", hair: "loose_waves", dye: "crimson_ends" };

/* 2.4.22 — Builder World catalogue (module scope, exported so the panel
   and the harness read the same lists the world builds from). The field
   is the open ground south of the park: x 2..12, z 17.5..26.5. Shapes
   are plain data — the world builds meshes from them, so a saved world
   is just a list of specs. builtBy tags who made a shape: "tony",
   "aimmianna", "summer", "autumn". */
export const BUILDER_FIELD = { x0: 2, x1: 12, z0: 17.5, z1: 26.5 };
export const BUILDER_SHAPES = [
  { id: "box", label: "Block", desc: "A plain box — walls, steps, towers" },
  { id: "cylinder", label: "Pillar", desc: "A round pillar or column" },
  { id: "sphere", label: "Orb", desc: "A ball — moons, bubbles, boulders" },
  { id: "ramp", label: "Ramp", desc: "A slope you can walk up" },
  { id: "wedge", label: "Roof", desc: "A peaked roof shape" },
  { id: "torus", label: "Ring", desc: "A standing ring — an arch or portal" },
  { id: "platform", label: "Platform", desc: "A flat slab to stand on" },
];
export const BUILDER_PALETTE = [
  { id: "crimson", label: "Deep Crimson", hex: "#8a0f2e" },
  { id: "black", label: "Black", hex: "#141414" },
  { id: "bone", label: "Bone White", hex: "#e6dfe8" },
  { id: "violet", label: "Midnight Violet", hex: "#6a2a8a" },
  { id: "blood", label: "Blood Red", hex: "#c01535" },
  { id: "gold", label: "Gold", hex: "#c9a24a" },
  { id: "emerald", label: "Emerald", hex: "#0f7a6a" },
  { id: "midnight", label: "Midnight Blue", hex: "#2a4a8a" },
  { id: "pink", label: "Hot Pink", hex: "#ff4fa8" },
  { id: "silver", label: "Silver", hex: "#c8c8d0" },
  { id: "charcoal", label: "Charcoal", hex: "#333338" },
  { id: "ghost", label: "Ghost White", hex: "#f0ead8" },
];
export const BUILDER_FINISHES = [
  { id: "matte", label: "Matte" },
  { id: "metal", label: "Dark metal" },
  { id: "stone", label: "Stone" },
  { id: "wood", label: "Wood" },
  { id: "glow", label: "Glow" },
];
export const BUILDER_SIZES = {
  small: { label: "Small", w: 0.6, h: 0.6, d: 0.6 },
  medium: { label: "Medium", w: 1.2, h: 1.2, d: 1.2 },
  large: { label: "Large", w: 2.2, h: 2.2, d: 2.2 },
};
export const BUILDER_BUILDERS = ["tony", "aimmianna", "summer", "autumn"];

/* 2.4.20 — smooth continuous follow, one shared step law for all three
   guests, so the group never rubber-bands. The old law moved each guest
   at exactly Aimmianna's speed toward a target that itself moves at her
   speed, so a guest who fell behind (after a turn, or on a slow frame)
   could never close the gap — it trailed until the distance passed 3 and
   then SNAPPED beside her: the every-few-steps glitch. The new law moves
   at her speed times 1.15 at minimum, and proportionally faster the
   further behind the guest is (gap x 3 per second), so the gap always
   closes smoothly; only a true teleport (gap > 8) still snaps. Pure
   numbers, no renderer — the harness unit-tests it directly.
   Returns { x, z, moving, snapped }. */
export function followStep(px, pz, tx, tz, dt, baseSpeed) {
  const dx = tx - px, dz = tz - pz;
  const d = Math.hypot(dx, dz);
  if (d > 8) return { x: tx, z: tz, moving: false, snapped: true };
  if (d <= 0.03) return { x: px, z: pz, moving: false, snapped: false };
  const step = Math.min(d, Math.max(baseSpeed * 1.15, d * 3) * dt);
  const k = step / d;
  return { x: px + dx * k, z: pz + dz * k, moving: true, snapped: false };
}


/* ------------------------------------------------------------------ layout */
export const ROOMS = {
  bedroom:  { id: "bedroom",  label: "Bedroom",     x0: -14, x1: -6 },
  living:   { id: "living",   label: "Living Room", x0: -6,  x1: 4 },
  kitchen:  { id: "kitchen",  label: "Kitchen",     x0: 4,   x1: 10 },
  bathroom: { id: "bathroom", label: "Bathroom",    x0: 10,  x1: 15 },
  ritual:   { id: "ritual",   label: "Ritual Room", x0: 15,  x1: 20.5 },
  yard:     { id: "yard",     label: "Yard",        x0: 4,   x1: 10 },
  // Skate park (2.4.20): a real outdoor place south of the yard, past the
  // yard fence — concrete, half pipe, bowl, rails, ramps. Same 3D style
  // as the apartment, part of her world, not a side game.
  park:     { id: "park",     label: "Skate Park",  x0: 3,   x1: 11 },
  // Builder World (2.4.22): the open field south of the park — build
  // anything from shapes, then walk around in it.
  builder:  { id: "builder",  label: "Builder World", x0: 2, x1: 12 }
};
const ROOM_ORDER = ["bedroom", "living", "kitchen", "bathroom", "ritual"];
const Z_BACK = -4, Z_FRONT = 3.4, WALL_H = 3.4, HALL_Z = 1.9;

export const SPOTS = {
  bed:            { room: "bedroom",  x: -12.0, z: -2.35, pose: "lie" },
  bedside:        { room: "bedroom",  x: -9.7,  z: -1.3 },
  nightstand:     { room: "bedroom",  x: -9.9,  z: -2.55 },
  vanity:         { room: "bedroom",  x: -7.4,  z: -2.55, pose: "art" },
  bedroom_center: { room: "bedroom",  x: -10.2, z: 0.7 },
  couch:          { room: "living",   x: -2.9,  z: 0.15, pose: "sit" },
  tv:             { room: "living",   x: -4.6,  z: -2.5 },
  stereo:         { room: "living",   x: -4.9,  z: -2.1, pose: "dance" },
  rug:            { room: "living",   x: -1.2,  z: -1.0, pose: "dance" },
  pc:             { room: "living",   x: 2.0,   z: -2.35 },
  living_center:  { room: "living",   x: -0.6,  z: 0.9 },
  coffee:         { room: "kitchen",  x: 7.5,   z: -2.55 },
  fridge:         { room: "kitchen",  x: 9.0,   z: -2.5 },
  counter:        { room: "kitchen",  x: 5.6,   z: -2.55 },
  kitchen_table:  { room: "kitchen",  x: 6.0,   z: 0.35, pose: "coffee" },
  tub:            { room: "bathroom", x: 12.0,  z: -3.2, pose: "bath" },
  sink:           { room: "bathroom", x: 14.1,  z: -2.65 },
  bath_center:    { room: "bathroom", x: 12.5,  z: 0.7 },
  yard_center:    { room: "yard",     x: 6.65,  z: 5.35 },
  pond:           { room: "yard",     x: 8.1,   z: 4.5, pose: "pond" },
  flowers:        { room: "yard",     x: 5.3,   z: 5.6, pose: "water" },
  window:         { room: "bedroom",  x: -12.6, z: 0.9, pose: "window" },
  gate:           { room: "kitchen",  x: 6.65,  z: 2.6 },
  bench:          { room: "yard",     x: 5.0,   z: 7.1, pose: "sit" },
  sakura:         { room: "yard",     x: 7.0,   z: 6.4, pose: "read" },
  hammock:        { room: "yard",     x: 7.8,   z: 7.0, pose: "lie" },
  bamboo:         { room: "yard",     x: 9.6,   z: 4.4, pose: "pond" },
  ritual_center:  { room: "ritual",   x: 17.75, z: 0.7 },
  altar:          { room: "ritual",   x: 17.75, z: -2.3, pose: "art" },
  ritual_rug:     { room: "ritual",   x: 17.75, z: -0.4, pose: "crossleg" },
  ritual_mirror:  { room: "ritual",   x: 19.4,  z: -2.6 },
  staff:          { room: "ritual",   x: 15.7,  z: -3.2, pose: "art" },
  // Skate park spots (2.4.20) — the park floor is z 8.2..17, x 3..11.
  park_center:    { room: "park",     x: 7.0,   z: 12.6 },
  halfpipe:       { room: "park",     x: 4.6,   z: 15.2 },
  rail:           { room: "park",     x: 6.0,   z: 13.2 },
  bowl:           { room: "park",     x: 9.3,   z: 15.0 },
  ramp:           { room: "park",     x: 9.0,   z: 10.6 },
  builder_center: { room: "builder",  x: 7.0,   z: 22.0 }
};
export const ROOM_SPOTS = {
  bedroom: ["bedside", "vanity", "nightstand", "bedroom_center", "bed", "window"],
  living: ["couch", "pc", "stereo", "rug", "living_center", "tv"],
  kitchen: ["coffee", "fridge", "counter", "kitchen_table", "gate"],
  bathroom: ["sink", "bath_center", "tub"],
  yard: ["yard_center", "pond", "flowers", "bench", "sakura", "hammock", "bamboo"],
  ritual: ["ritual_center", "altar", "ritual_rug", "ritual_mirror", "staff"],
  park: ["park_center", "halfpipe", "rail", "bowl", "ramp"],
  builder: ["builder_center"]
};
export function roomAt(x, z) {
  // Builder World (2.4.22) sits south of the park (z > 17.5, x 2..12) —
  // check it before the park, which shares the same x range further north.
  if (z != null && z > 17.5 && x >= 2 && x <= 12) return "builder";
  // The park sits south of the yard fence (z > 8.2, x 3..11) — check it
  // before the yard, which shares the same x range closer to the house.
  if (z != null && z > 8.2 && x >= 3 && x < 11) return "park";
  // The yard shares the kitchen's x range but sits outside the front (z > 3.4).
  if (z != null && z > Z_FRONT && z <= 8.2 && x >= 4 && x < 10) return "yard";
  for (const id of ROOM_ORDER) { const r = ROOMS[id]; if (x >= r.x0 && x < r.x1) return id; }
  return x < 0 ? "bedroom" : "bathroom";
}

/* ---------------------------------------------------------- tiny textures */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  t.anisotropy = 4;
  return t;
}
function glowTexture() {
  return canvasTex(128, 128, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(255,255,255,0.55)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  });
}
function shadowTexture() {
  return canvasTex(128, 128, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, "rgba(0,0,0,0.75)");
    grd.addColorStop(0.6, "rgba(0,0,0,0.3)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  });
}
function damask(base, ink) {
  return canvasTex(256, 256, (g, w) => {
    g.fillStyle = base; g.fillRect(0, 0, w, w);
    g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 3;
    const motif = (cx, cy, s) => {
      g.beginPath();
      g.moveTo(cx, cy - 40 * s);
      g.bezierCurveTo(cx + 34 * s, cy - 20 * s, cx + 26 * s, cy + 22 * s, cx, cy + 40 * s);
      g.bezierCurveTo(cx - 26 * s, cy + 22 * s, cx - 34 * s, cy - 20 * s, cx, cy - 40 * s);
      g.stroke();
      g.beginPath(); g.arc(cx, cy, 7 * s, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.moveTo(cx - 18 * s, cy); g.lineTo(cx + 18 * s, cy); g.stroke();
    };
    motif(64, 64, 1); motif(192, 192, 1); motif(192, 64, 0.55); motif(64, 192, 0.55);
  }, [3, 1.4]);
}
function planks(a, b) {
  return canvasTex(256, 256, (g, w) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = i % 2 ? a : b; g.fillRect(0, i * 32, w, 32);
      g.fillStyle = "rgba(0,0,0,0.45)"; g.fillRect(0, i * 32, w, 2);
      g.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32);
    }
  }, [4, 4]);
}
function checker(a, b, n) {
  return canvasTex(256, 256, (g, w) => {
    const s = w / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = (x + y) % 2 ? a : b; g.fillRect(x * s, y * s, s, s);
    }
    g.strokeStyle = "rgba(0,0,0,0.35)"; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, w); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
  }, [3, 3]);
}
function carpet() {
  return canvasTex(128, 128, (g, w) => {
    g.fillStyle = "#2a1533"; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = Math.random() < 0.5 ? "rgba(70,30,90,0.35)" : "rgba(10,5,15,0.35)";
      g.fillRect(Math.random() * w, Math.random() * w, 2, 2);
    }
  }, [4, 4]);
}
function posterTex(kind) {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = kind === "peep" ? "#120a14" : "#1a0d12"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.3)"; g.lineWidth = 6; g.strokeRect(6, 6, w - 12, h - 12);
    g.textAlign = "center"; g.fillStyle = "#f5d7e8";
    if (kind === "peep") {
      const grd = g.createRadialGradient(110, 110, 10, 128, 128, 70);
      grd.addColorStop(0, "#fdf6d8"); grd.addColorStop(0.6, "#e8c96a"); grd.addColorStop(1, "#8a6d1f");
      g.fillStyle = grd; g.beginPath(); g.arc(128, 130, 64, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#120a14"; g.beginPath(); g.arc(156, 112, 54, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#f5d7e8"; g.font = "800 38px sans-serif"; g.fillText("LIL PEEP", 128, 262);
    } else {
      g.font = "800 34px sans-serif";
      ["COME OVER", "WHEN YOU'RE", "SOBER"].forEach((l, i) => g.fillText(l, 128, 120 + i * 48));
      g.fillStyle = "#e74c3c"; g.beginPath(); g.arc(128, 270, 10, 0, Math.PI * 2); g.fill();
    }
  });
}

/* ------------------------------------------------------ billboard avatar */
class BillboardAvatar {
  constructor(shadowTex) {
    this.object3d = new THREE.Group();
    this.height = 1.81; // 2.4.17: balance — Aimmianna 5'6" (1.81 units). Was 1.78; see the height table at the guest avatars below.
    this.width = this.height * (768 / 1190);
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.5, 0);
    this.mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.06, side: THREE.DoubleSide, depthWrite: true, color: 0xffffff });
    this.body = new THREE.Mesh(geo, this.mat);
    this.body.scale.set(this.width, this.height, 1);
    this.pivot = new THREE.Group();       // faces the camera (yaw only)
    this.pivot.add(this.body);
    this.object3d.add(this.pivot);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.scale.set(1.15, 0.6, 1);
    sh.renderOrder = 1;
    this.shadow = sh;
    this.object3d.add(sh);
    this.pickMesh = this.body;
    this.headHeight = this.height * 0.9;
    this.yaw = 0;
    this.lean = 0;
    this.tex = null;
  }
  setLook(canvas) {
    if (!this.tex || this.tex.image !== canvas) {
      if (this.tex) this.tex.dispose();
      this.tex = new THREE.CanvasTexture(canvas);
      this.tex.colorSpace = THREE.SRGBColorSpace;
      this.tex.anisotropy = 4;
      this.mat.map = this.tex; this.mat.needsUpdate = true;
    } else this.tex.needsUpdate = true;
    if (canvas.width && canvas.height) this.width = this.height * (canvas.width / canvas.height);
  }
  /* pose: {mode:'idle'|'walk'|'dance'|'sit'|'lie'|'bath'|'talk'|'art'|..., moveDir, brightness} */
  update(dt, t, camera, pose) {
    const o = this.object3d, b = this.body, p = this.pivot;
    // yaw toward the camera, smoothly (cylindrical billboard — stays upright)
    const dx = camera.position.x - o.position.x, dz = camera.position.z - o.position.z;
    let want = Math.atan2(dx, dz);
    let d = want - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * 6);
    let sx = 1, sy = 1, y = 0, rz = 0, rx = 0, shadowA = 1, yawLock = false;
    const m = pose.mode;
    if (m === "walk") {
      y = Math.abs(Math.sin(t * 9)) * 0.06;
      rz = Math.sin(t * 9) * 0.035;
      this.lean += ((pose.moveDir || 0) * -0.07 - this.lean) * Math.min(1, dt * 5);
    } else {
      this.lean += (0 - this.lean) * Math.min(1, dt * 4);
      if (m === "dance") { y = Math.abs(Math.sin(t * 5.2)) * 0.12; rz = Math.sin(t * 2.6) * 0.09; sx = 1 + Math.sin(t * 5.2) * 0.015; }
      else if (m === "sit") { y = -0.42; sy = 0.97 + Math.sin(t * 1.6) * 0.006; }
      else if (m === "bath") { y = -0.62; sy = 1 + Math.sin(t * 1.4) * 0.006; shadowA = 0; }
      else if (m === "lie") { yawLock = true; shadowA = 0; }
      else if (m === "talk") { sy = 1 + Math.abs(Math.sin(t * 14)) * 0.012; y = Math.abs(Math.sin(t * 7)) * 0.01; }
      else if (m === "clean") { rz = Math.sin(t * 4.5) * 0.05; y = Math.abs(Math.sin(t * 4.5)) * 0.03; }
      else if (m === "stretch") { sy = 1 + (Math.sin(t * 1.3) * 0.5 + 0.5) * 0.04; rz = Math.sin(t * 0.65) * 0.04; }
      else if (m === "art") { rz = -0.03 + Math.sin(t * 2.2) * 0.012; sy = 1 + Math.sin(t * 1.8) * 0.006; }
      else if (m === "flirt") { rz = Math.sin(t * 3) * 0.05; y = Math.abs(Math.sin(t * 3)) * 0.03; }
      else if (m === "wave") { y = Math.abs(Math.sin(t * 6)) * 0.05; rz = Math.sin(t * 6) * 0.04; sy = 1 + Math.sin(t * 3) * 0.008; }
      else if (m === "kiss") { rx = 0.12; y = Math.abs(Math.sin(t * 2.4)) * 0.025; sy = 1 + Math.sin(t * 2.4) * 0.008; }
      else if (m === "hips") { sx = 1.03; rz = Math.sin(t * 1.4) * 0.02; y = Math.abs(Math.sin(t * 1.4)) * 0.012; }
      else if (m === "bow") { const dip = Math.sin(t * 1.2) * 0.5 + 0.5; rx = 0.1 + dip * 0.3; y = -dip * 0.09; }
      else if (m === "crossleg") { y = -0.5; sy = 0.9 + Math.sin(t * 1.6) * 0.006; }
      else if (m === "read") { y = -0.42; rx = 0.08; sy = 0.97 + Math.sin(t * 1.6) * 0.006; }
      else if (m === "coffee") { y = -0.42; rx = 0.05; sy = 0.97 + Math.abs(Math.sin(t * 1.1)) * 0.008; }
      else if (m === "water") { rx = 0.18; y = -0.06; rz = Math.sin(t * 2.0) * 0.03; }
      else if (m === "window") { rx = -0.08; sy = 1.01 + Math.sin(t * 1.5) * 0.006; rz = Math.sin(t * 0.9) * 0.02; }
      else if (m === "hug") { rx = 0.15; y = Math.abs(Math.sin(t * 2.0)) * 0.02; sy = 1 + Math.sin(t * 2.0) * 0.008; }
      else if (m === "heart") { rx = 0.05; y = Math.abs(Math.sin(t * 2.6)) * 0.03; sx = 1 + Math.sin(t * 2.6) * 0.012; }
      else if (m === "laugh") { rx = -0.22; y = Math.abs(Math.sin(t * 7)) * 0.08; rz = Math.sin(t * 7) * 0.05; }
      else if (m === "defeat") { y = -0.12; sy = 0.93 + Math.sin(t * 0.8) * 0.005; rz = 0.06; }
      else if (m === "cheer") { y = Math.abs(Math.sin(t * 6)) * 0.16; rz = Math.sin(t * 3) * 0.06; sx = 1 + Math.sin(t * 6) * 0.012; }
      else if (m === "smoke") { rz = Math.sin(t * 1.1) * 0.04; sy = 1 + Math.sin(t * 1.1) * 0.01; y = Math.abs(Math.sin(t * 1.1)) * 0.012; }
      else if (m === "pond") { rx = 0.1; y = Math.abs(Math.sin(t * 1.5)) * 0.015; rz = Math.sin(t * 1.5) * 0.02; }
      else if (m === "type") { y = -0.42; rx = 0.06; y += Math.abs(Math.sin(t * 9)) * 0.012; }
      else if (m === "workout") { y = Math.abs(Math.sin(t * 5)) * 0.14; rz = Math.sin(t * 2.5) * 0.07; sx = 1 + Math.sin(t * 5) * 0.015; }
      else { sy = 1 + Math.sin(t * 1.9) * 0.008; } // breathing
    }
    if (yawLock) {
      // lying on her back on the bed, head toward the headboard
      p.rotation.set(-Math.PI / 2 + 0.18, 0, 0);
      b.position.set(0, 0, 0);
      b.scale.set(this.width * 0.92, this.height * 0.92 * (1 + Math.sin(t * 1.2) * 0.006), 1);
    } else {
      p.rotation.set(0, this.yaw, 0);
      b.position.set(0, y, 0);
      b.rotation.set(rx, 0, rz + this.lean);
      b.scale.set(this.width * sx, this.height * sy, 1);
    }
    const br = pose.brightness == null ? 1 : pose.brightness;
    this.mat.color.setScalar(br);
    this.shadow.material.opacity = shadowA * 0.9;
    this.shadow.scale.set(1.15 - y * 1.5, 0.6 - y * 0.8, 1);
  }
}

const OUTFIT_MASK = new URL("./assets/models/outfit3d-mask.png", import.meta.url).href;


/* ---- procedural pose bones (2.4.6) ----
   The rigged GLB only has idle + walk clips, so poses are procedural: the
   billboard body bobs/sways (BillboardAvatar.update) and, for the 3D model,
   selected skeleton bones are rotated on top of the idle clip. Bone axes were
   measured from the GLB bind pose (eyes define forward = +Z, right = -X):
   upper-arm forward swing ~= local -Z, sideways raise ~= local +/-X
   (R:+X, L:-X), forearm bend ~= local -Z, spine/head nod ~= local -Z.
   Each entry is bone -> [{axis (local unit vector), angle (radians, positive
   moves the limb in the stated direction), osc (optional wave)}]. Applied
   after mixer.update() each frame, so the clip is never fought. */
const POSE_BONES = {
  wave: {
    R_Upperarm: [{ axis: [1, 0, 0], angle: 1.9, osc: { amp: 0.35, speed: 6 } }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.4 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: -0.12 }]
  },
  kiss: {
    R_Upperarm: [{ axis: [0, 0, -1], angle: 0.9 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 1.3 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.25 }]
  },
  hips: {
    R_Upperarm: [{ axis: [1, 0, 0], angle: 0.5 }],
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 0.5 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 1.5 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 1.5 }]
  },
  bow: {
    Spine02: [{ axis: [0, 0, -1], angle: 0.5 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.25 }]
  },
  read: {
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.3 }],
    R_Upperarm: [{ axis: [0, 0, -1], angle: 0.35 }],
    L_Upperarm: [{ axis: [0, 0, -1], angle: 0.35 }]
  },
  coffee: {
    R_Upperarm: [{ axis: [0, 0, -1], angle: 0.5 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.9 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.15 }]
  },
  water: {
    Spine02: [{ axis: [0, 0, -1], angle: 0.35 }],
    R_Upperarm: [{ axis: [0, 0, -1], angle: 0.8 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.3 }]
  },
  window: {
    Head: [{ axis: [-0.5, 0, -0.87], angle: -0.3 }],
    Spine02: [{ axis: [0, 0, -1], angle: -0.1 }]
  },
  hug: {
    R_Upperarm: [{ axis: [0, 0, -1], angle: 1.0 }, { axis: [1, 0, 0], angle: 0.3 }],
    L_Upperarm: [{ axis: [0, 0, -1], angle: 1.0 }, { axis: [-1, 0, 0], angle: 0.3 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.6 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 0.6 }]
  },
  heart: {
    R_Upperarm: [{ axis: [0, 0, -1], angle: 0.9 }, { axis: [1, 0, 0], angle: 0.4 }],
    L_Upperarm: [{ axis: [0, 0, -1], angle: 0.9 }, { axis: [-1, 0, 0], angle: 0.4 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 1.1 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 1.1 }]
  },
  laugh: {
    Spine02: [{ axis: [0, 0, -1], angle: -0.35 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: -0.4 }]
  },
  defeat: {
    Spine02: [{ axis: [0, 0, -1], angle: 0.35 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.5 }],
    R_Upperarm: [{ axis: [1, 0, 0], angle: 0.1 }],
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 0.1 }]
  },
  cheer: {
    R_Upperarm: [{ axis: [1, 0, 0], angle: 2.3 }],
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 2.3 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.3 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 0.3 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: -0.2 }]
  },
  smoke: {
    R_Upperarm: [{ axis: [0, 0, -1], angle: 0.7 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 1.2 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.1 }]
  },
  pond: {
    Spine02: [{ axis: [0, 0, -1], angle: 0.15 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.35 }]
  },
  type: {
    R_Upperarm: [{ axis: [0, 0, -1], angle: 0.6 }],
    L_Upperarm: [{ axis: [0, 0, -1], angle: 0.6 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.8 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 0.8 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.2 }]
  },
  workout: {
    R_Upperarm: [{ axis: [1, 0, 0], angle: 1.2, osc: { amp: 0.5, speed: 5 } }],
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 1.2, osc: { amp: 0.5, speed: 5 } }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.2 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 0.2 }]
  },
  stretch: {
    R_Upperarm: [{ axis: [1, 0, 0], angle: 1.8 }],
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 1.8 }],
    Spine02: [{ axis: [0, 0, -1], angle: -0.15 }]
  },
  // 2.4.11 mood poses — Tony asked for sad, happy, thankful, grateful, excited.
  sad: {
    Spine02: [{ axis: [0, 0, -1], angle: 0.35 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.5 }],
    R_Upperarm: [{ axis: [1, 0, 0], angle: 0.2 }],
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 0.2 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.15 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 0.15 }]
  },
  happy: {
    R_Upperarm: [{ axis: [1, 0, 0], angle: 1.6, osc: { amp: 0.2, speed: 4 } }],
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 1.6, osc: { amp: 0.2, speed: 4 } }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.5 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 0.5 }],
    Spine02: [{ axis: [0, 0, -1], angle: -0.15 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: -0.25 }]
  },
  thankful: {
    R_Upperarm: [{ axis: [0, 0, -1], angle: 0.6 }],
    L_Upperarm: [{ axis: [0, 0, -1], angle: 0.6 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 1.2 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 1.2 }],
    Spine02: [{ axis: [0, 0, -1], angle: 0.35 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.3 }]
  },
  grateful: {
    R_Upperarm: [{ axis: [0, 0, -1], angle: 0.7 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 1.4 }],
    L_Upperarm: [{ axis: [1, 0, 0], angle: 0.2 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 0.2 }],
    Spine02: [{ axis: [0, 0, -1], angle: 0.1 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: 0.2 }]
  },
  excited: {
    R_Upperarm: [{ axis: [1, 0, 0], angle: 2.4, osc: { amp: 0.4, speed: 7 } }],
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 2.4, osc: { amp: 0.4, speed: 7 } }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.4 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 0.4 }],
    Spine02: [{ axis: [0, 0, -1], angle: -0.2 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: -0.3 }]
  },
  // 2.4.20 skate stance — knees bent, arms out for balance, slight lean.
  // Used while she rides a board (mode "skate"); the board itself is a
  // separate mesh under her feet, and tricks lift the whole figure.
  skate: {
    Spine02: [{ axis: [0, 0, -1], angle: 0.3 }],
    Head: [{ axis: [-0.5, 0, -0.87], angle: -0.1 }],
    R_Upperarm: [{ axis: [1, 0, 0], angle: 0.9 }],
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 0.9 }],
    R_Forearm: [{ axis: [0, 0, -1], angle: 0.4 }],
    L_Forearm: [{ axis: [0, 0, -1], angle: 0.4 }]
  }
};
const POSE_BONE_NAMES = [...new Set(Object.values(POSE_BONES).flatMap((m) => Object.keys(m)))];

class BuiltInAvatar extends BillboardAvatar {
  setModelEnabled(enabled) {
    this.modelWanted = enabled;
    if (this.model) this.showModel(enabled);
    else if (enabled && !this.modelLoad) this.modelLoad = this.loadModel();
  }

  async loadModel() {
    try {
      const { GLTFLoader } = await import("./vendor/loaders/GLTFLoader.js");
      // 2.4.24: models are Draco-compressed — the decoder lives in vendor/draco/.
      const { DRACOLoader } = await import("./vendor/loaders/DRACOLoader.js");
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath("./vendor/draco/");
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
      const load = (filename) => loader.loadAsync(new URL(`./assets/models/${filename}`, import.meta.url).href);
      let rigged = true, gltf;
      try {
        gltf = await load("aimmianna-rigged.glb");
        if (!["idle", "walk"].every((name) => THREE.AnimationClip.findByName(gltf.animations, name)?.duration > 0))
          throw new Error("Idle and Walk are required");
      } catch (error) {
        console.warn("Animated avatar unavailable; loading the static 3D model.", error);
        rigged = false;
        gltf = await load("aimmianna-mobile.glb");
      }
      const { scene, animations } = gltf;
      if (rigged) {
        this.mixer = new THREE.AnimationMixer(scene);
        this.actions = Object.fromEntries(animations.map((clip) => [clip.name, this.mixer.clipAction(clip)]));
        this.playMotion("idle");
        this.mixer.update(0);
      }
      const bounds = new THREE.Box3().setFromObject(scene);
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = this.height / (bounds.max.y - bounds.min.y);
      if (bounds.isEmpty() || !Number.isFinite(scale) || scale <= 0) throw new Error("Invalid avatar bounds");
      scene.scale.setScalar(scale);
      scene.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      const group = new THREE.Group();
      group.name = "Aimmianna3D";
      const facing = new THREE.Group();
      facing.rotation.y = rigged ? 0 : -Math.PI / 2; // Animated and static exports use different forward axes.
      facing.add(scene);
      group.add(facing);
      this.modelParts = [];
      this.rigged = rigged;
      // Pose bones (2.4.6): refs for the procedural pose layer, if present.
      this.poseBones = {};
      if (rigged) for (const name of POSE_BONE_NAMES) { const b = scene.getObjectByName(name); if (b) this.poseBones[name] = b; }
      this._poseWeight = 0;
      this._poseQ = new THREE.Quaternion();
      this._poseAxis = new THREE.Vector3();
      scene.traverse((mesh) => {
        if (!mesh.isMesh) return;
        // A small fill keeps the textured model legible in the gothic room.
        const material = mesh.material;
        material.metalness = 0;
        material.metalnessMap?.dispose();
        material.metalnessMap = null;
        material.roughnessMap = null;
        material.roughness = 0.88;
        material.emissiveMap = material.map;
        material.emissive.set(0xffffff);
        material.emissiveIntensity = 0.52;
        mesh.userData.tap = "her";
        if (mesh.isSkinnedMesh) {
          // 2.4.17: pin the slim_petite morph target on (same as the guests
          // in GuestAvatar.load) so her slimmer build can never silently
          // drop off — her file carries it with weights [1].
          // 2.4.18: pin EVERY morph target, not just [0] — the guests now
          // carry slim_petite AND head_match, and pinning by index [0] only
          // would silently drop the second one. (Aimmianna still has just
          // the one target, so this loop pins the same thing for her.)
          if (mesh.morphTargetInfluences?.length) for (let i = 0; i < mesh.morphTargetInfluences.length; i++) mesh.morphTargetInfluences[i] = 1;
          // A conservative bound covers both clips without rescanning the
          // skin every frame. A tap still checks the actual deformed mesh.
          mesh.computeBoundingSphere();
          mesh.boundingSphere.radius *= 1.35;
          mesh.boundingBox = null;
        }
        this.modelParts.push(mesh);
      });
      if (!this.modelParts.length) throw new Error("Avatar has no mesh");
      this.originalMaps = this.modelParts.map((mesh) => mesh.material.map);
      this.model = group;
      this.pivot.add(group);
      this.showModel(this.modelWanted);
    } catch (error) {
      this.modelFailed = true;
      console.warn("3D avatar unavailable; keeping the wardrobe portrait.", error);
    }
  }

  showModel(on) {
    this.model.visible = !!on;
    this.body.visible = !on;
    this.refreshOutfit();
    if (!on && this.mixer) {
      this.mixer.stopAllAction();
      this.motion = null;
    }
  }

  setOutfit(name) {
    this.outfitWanted = hasOutfit3D(name) ? name : "original";
    this.refreshOutfit();
  }

  setWeapon(name) {
    this.weaponWanted = hasWeapon3D(name) ? name : "none";
    this.refreshWeapon();
  }

  baseSkin() { return this.modelParts?.find((m) => m.isSkinnedMesh); }

  clearExtras(key) {
    for (const mesh of this[key] || []) {
      mesh.parent?.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this[key] = [];
  }

  refreshWeapon() {
    if (!this.model || !this.rigged) return;
    const name = this.model.visible ? this.weaponWanted || "none" : "none";
    if (name === this.weaponApplied) return;
    this.clearExtras("weaponMeshes");
    const base = this.baseSkin();
    try {
      for (const mesh of buildWeapon(base, name)) { base.parent.add(mesh); this.weaponMeshes.push(mesh); }
    } catch (error) { console.warn("3D weapon unavailable.", error); }
    this.weaponApplied = name;
  }

  applyOutfitMap(map, name) {
    for (const [index, mesh] of this.modelParts.entries()) {
      const material = mesh.material;
      const next = map || this.originalMaps[index];
      if (material.map !== next) {
        material.map = next;
        material.emissiveMap = next;
        material.needsUpdate = true;
      }
    }
    this.outfitApplied = name;
  }

  async refreshOutfit() {
    if (!this.model || !this.rigged) return;
    this.refreshWeapon();
    const name = this.model.visible ? this.outfitWanted || "original" : "original";
    if (name === this.outfitApplied || this.outfitLoad === name) return;
    const spec = OUTFIT_3D[name];
    this.outfitLoad = name;
    try {
      let texture = null;
      if (spec && (spec.top || spec.bottom || spec.shoes)) {
        this.outfitCache = this.outfitCache || new Map();
        texture = this.outfitCache.get(name);
        if (!texture) {
          texture = await buildOutfitTexture(this.originalMaps[0], spec, OUTFIT_MASK);
          this.outfitCache.set(name, texture);
          // keep memory low on phones: remember only the last two looks
          while (this.outfitCache.size > 2) {
            const [oldName, oldTex] = this.outfitCache.entries().next().value;
            this.outfitCache.delete(oldName);
            if (oldName !== this.outfitApplied) oldTex.dispose();
          }
        }
      }
      if (this.outfitLoad !== name) return;           // a newer pick arrived
      const current = this.model.visible ? this.outfitWanted || "original" : "original";
      if (current !== name) return;
      this.applyOutfitMap(texture, name);
      this.clearExtras("garmentMeshes");
      const base = this.baseSkin();
      for (const mesh of buildGarments(base, spec)) { base.parent.add(mesh); this.garmentMeshes.push(mesh); }
    } catch (error) {
      console.warn("3D outfit unavailable; keeping her original clothes.", error);
    } finally {
      if (this.outfitLoad === name) this.outfitLoad = null;
      const want = this.model.visible ? this.outfitWanted || "original" : "original";
      if (want !== this.outfitApplied && want !== name) this.refreshOutfit();
    }
  }

  playMotion(name) {
    if (!this.actions || this.motion === name) return;
    const next = this.actions[name];
    if (!next) return;
    const previous = this.actions[this.motion];
    next.reset().setEffectiveWeight(1).play();
    if (previous) next.crossFadeFrom(previous, 0.22, false);
    this.motion = name;
  }

  get motionState() {
    return this.model?.visible && this.motion ? { clip: this.motion, time: this.actions[this.motion].time } : null;
  }
  get activePicks() { return this.model?.visible ? this.modelParts : [this.body]; }
  get representation() { return this.model?.visible ? "model" : this.modelFailed ? "fallback" : "portrait"; }

  applyPoseBones(mode, dt, t) {
    const target = POSE_BONES[mode];
    const want = target ? 1 : 0;
    this._poseWeight += (want - this._poseWeight) * Math.min(1, dt * 6);
    if (!target || this._poseWeight < 0.02) return;
    const w = this._poseWeight;
    for (const [name, turns] of Object.entries(target)) {
      const bone = this.poseBones[name];
      if (!bone) continue;
      for (const turn of turns) {
        const angle = (turn.angle + (turn.osc ? Math.sin(t * turn.osc.speed) * turn.osc.amp : 0)) * w;
        this._poseAxis.set(turn.axis[0], turn.axis[1], turn.axis[2]).normalize();
        this._poseQ.setFromAxisAngle(this._poseAxis, angle);
        bone.quaternion.multiply(this._poseQ);
      }
    }
  }

  update(dt, t, camera, pose) {
    super.update(dt, t, camera, pose);
    if (!this.model?.visible) return;
    const mode = pose.mode;
    if (this.mixer) {
      const walking = mode === "walk";
      this.playMotion(walking ? "walk" : "idle");
      this.mixer.update(dt);
      this.applyPoseBones(mode, dt, t);
      if (mode !== "lie") {
        const target = walking ? pose.heading : this.yaw;
        if (!Number.isFinite(this.modelYaw)) this.modelYaw = this.yaw;
        const delta = Math.atan2(Math.sin(target - this.modelYaw), Math.cos(target - this.modelYaw));
        this.modelYaw += delta * (1 - Math.exp(-dt * 9));
        this.pivot.rotation.y = this.modelYaw;
      }
    }
    this.model.position.copy(this.body.position);
    this.model.rotation.copy(this.body.rotation);
    this.model.scale.setScalar(1);
    if (mode === "walk" && this.mixer) {
      // The skeleton already supplies the stride, bob and lean.
      this.model.position.y = 0;
      this.model.rotation.set(0, 0, 0);
    }
    if (mode === "lie") {
      this.model.rotation.set(0, 0, 0);
      this.model.position.y = 0.05;
      this.model.position.z = 0.12;
      this.model.scale.setScalar(0.9);
    } else if (mode === "bath") {
      this.model.position.y = -0.4;
    } else if (mode === "sit") {
      this.model.rotation.x = -0.08;
    } else if (mode === "crossleg") {
      this.model.rotation.x = -0.12;
    } else if (mode === "read" || mode === "coffee" || mode === "type") {
      this.model.rotation.x = -0.06;
    }
    for (const mesh of this.modelParts) mesh.material.emissiveIntensity = 0.52 * (pose.brightness ?? 1);
  }
}

/* ================================================================= WORLD */
export function createWorld(opts) {
  const canvas = opts.canvas;
  const onTap = opts.onTap || (() => {});
  const onArrive = opts.onArrive || (() => {});
  const onRoomChange = opts.onRoomChange || (() => {});

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1100);
  // 2.4.24 Light mode: fewer heavy loads — no guest models, no aura discs,
  // no drifting petals, and (from a fresh open) no edge smoothing.
  // antialias is fixed when the renderer is made, so that part only takes
  // effect after the app is closed and reopened; the rest flips live.
  let lightMode = !!opts.lightMode;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lightMode, powerPreference: "high-performance", alpha: false });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 2 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x07050b, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x07050b, 16, 40);
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 80);
  camera.position.set(-1, 4, 9);

  const GLOW = glowTexture();
  const SHADOW = shadowTexture();
  const tappables = [];
  const tagged = (obj, tap) => { obj.userData.tap = tap; obj.traverse((c) => { if (c.isMesh) { c.userData.tap = tap; tappables.push(c); } }); return obj; };

  /* ------------ shared materials */
  const M = (color, extra) => new THREE.MeshLambertMaterial(Object.assign({ color }, extra || {}));
  const E = (color) => new THREE.MeshBasicMaterial({ color });
  const mat = {
    black: M(0x141018), blackGloss: M(0x1c1722), wood: M(0x2a1a14), darkWood: M(0x1d120e),
    velvet: M(0x3b1240), velvetRed: M(0x5a1020), purple: M(0x3d1f5a), sheet: M(0x2a2033),
    gold: M(0xb8902e, { emissive: 0x3a2a08 }), white: M(0xd9d2dc), porcelain: M(0xe9e4ea),
    steel: M(0x6c6873), counter: M(0x1a1620), cab: M(0x221a29), fridge: M(0x2b2530),
    rug: M(0x34122a), pillow: M(0x4a1b3e), plush: M(0xff7ab8), skull: M(0xe6dfe8),
    glassDark: M(0x0e0c12), trim: M(0x0d0a10)
  };
  const box = (w, h, d, m, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); (parent || scene).add(o); return o; };
  const cyl = (rt, rb, h, m, x, y, z, seg, parent) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 14), m); o.position.set(x, y, z); (parent || scene).add(o); return o; };
  const glowSprite = (color, size, x, y, z, parent, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity: opacity == null ? 0.6 : opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(size, size, 1); s.position.set(x, y, z); (parent || scene).add(s); return s;
  };

  /* ------------ lights (4 point lights + hemisphere, that's it) */
  const hemi = new THREE.HemisphereLight(0x8a6aa8, 0x1a0e1e, 1.25);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0x2a2033, 0.9);
  scene.add(amb);
  const LAMP_MODES = [
    { name: "off", color: 0x000000, i: 0 },
    { name: "warm", color: 0xffc27a, i: 1 },
    { name: "purple mood", color: 0xa040ff, i: 1 },
    { name: "red mood", color: 0xff2a3a, i: 1 }
  ];
  const roomLights = {};
  const lampDefs = {
    bedroom:  { pos: [-10.2, 2.4, -1.4], base: 15, def: 2 },
    living:   { pos: [-1.2, 2.7, -1.0], base: 18, def: 1 },
    kitchen:  { pos: [6.8, 2.5, -1.2], base: 15, def: 1 },
    bathroom: { pos: [12.6, 2.5, -1.5], base: 13, def: 2 },
    ritual:   { pos: [17.75, 2.5, -1.2], base: 14, def: 2 }
  };
  for (const id of ROOM_ORDER) {
    const d = lampDefs[id];
    const L = new THREE.PointLight(0xffffff, d.base, 11, 1.25);
    L.position.set(d.pos[0], d.pos[1], d.pos[2]);
    scene.add(L);
    roomLights[id] = { light: L, mode: d.def, base: d.base, shades: [], glows: [] };
  }
  // The yard is not in ROOM_ORDER (it shares the kitchen's x range, outside
  // the front wall), so its light is added by hand: a soft moon lamp.
  const yardLamp = new THREE.PointLight(0xcfd8ff, 13, 11, 1.25);
  yardLamp.position.set(7, 3.4, 5.8);
  scene.add(yardLamp);
  roomLights.yard = { light: yardLamp, mode: 1, base: 13, shades: [], glows: [] };
  // The skate park (2.4.20) gets the same treatment as the yard: its own
  // moon lamp so world.lamp("park") works and the room is never dark.
  const parkLamp = new THREE.PointLight(0xcfd8ff, 14, 13, 1.25);
  parkLamp.position.set(7, 3.6, 12.6);
  scene.add(parkLamp);
  roomLights.park = { light: parkLamp, mode: 1, base: 14, shades: [], glows: [] };
  // Builder World (2.4.22) gets the same treatment: its own moon lamp.
  const builderLamp = new THREE.PointLight(0xcfd8ff, 14, 14, 1.25);
  builderLamp.position.set(7, 3.6, 22);
  scene.add(builderLamp);
  roomLights.builder = { light: builderLamp, mode: 1, base: 14, shades: [], glows: [] };

  /* ------------ shell: floors, walls, partitions */
  const floorTex = {
    bedroom: carpet(), living: planks("#2b1a14", "#24150f"),
    kitchen: checker("#1b1418", "#4a1420", 8), bathroom: checker("#d6d0da", "#26222c", 10),
    ritual: damask("#140a1e", "rgba(150,80,190,0.22)")
  };
  const wallTex = {
    bedroom: damask("#1e0f26", "rgba(150,80,190,0.18)"), living: damask("#1a0f15", "rgba(212,175,55,0.12)"),
    kitchen: damask("#17121c", "rgba(192,57,43,0.12)"), bathroom: damask("#131620", "rgba(160,140,220,0.16)"),
    ritual: damask("#160b22", "rgba(165,94,234,0.22)")
  };
  // dollhouse base slab with a gold lip along the front edge
  box(34.9, 0.3, 7.8, mat.trim, 3.25, -0.15, (Z_BACK + Z_FRONT) / 2);
  box(34.9, 0.04, 0.05, mat.gold, 3.25, 0.0, Z_FRONT + 0.0);
  for (const id of ROOM_ORDER) {
    const r = ROOMS[id], w = r.x1 - r.x0, cx = (r.x0 + r.x1) / 2;
    const fm = new THREE.MeshLambertMaterial({ map: floorTex[id] });
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, Z_FRONT - Z_BACK), fm);
    f.rotation.x = -Math.PI / 2; f.position.set(cx, 0.001, (Z_BACK + Z_FRONT) / 2);
    scene.add(f); f.userData.tap = "floor"; tappables.push(f);
    const wm = new THREE.MeshLambertMaterial({ map: wallTex[id] });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, WALL_H), wm);
    back.position.set(cx, WALL_H / 2, Z_BACK); scene.add(back);
    // wainscot + crown trim
    box(w, 0.9, 0.04, mat.trim, cx, 0.45, Z_BACK + 0.02);
    box(w, 0.04, 0.06, mat.gold, cx, 0.92, Z_BACK + 0.04);
    box(w, 0.08, 0.08, mat.gold, cx, WALL_H - 0.04, Z_BACK + 0.04);
  }
  // outer side walls
  const sideL = new THREE.Mesh(new THREE.PlaneGeometry(Z_FRONT - Z_BACK, WALL_H), new THREE.MeshLambertMaterial({ map: wallTex.bedroom }));
  sideL.rotation.y = Math.PI / 2; sideL.position.set(-14, WALL_H / 2, (Z_BACK + Z_FRONT) / 2); scene.add(sideL);
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(Z_FRONT - Z_BACK, WALL_H), new THREE.MeshLambertMaterial({ map: wallTex.ritual }));
  sideR.rotation.y = -Math.PI / 2; sideR.position.set(20.5, WALL_H / 2, (Z_BACK + Z_FRONT) / 2); scene.add(sideR);
  box(0.06, 0.9, Z_FRONT - Z_BACK, mat.trim, -13.97, 0.45, (Z_BACK + Z_FRONT) / 2);
  box(0.06, 0.9, Z_FRONT - Z_BACK, mat.trim, 20.47, 0.45, (Z_BACK + Z_FRONT) / 2);
  // partition stubs with gothic arch tops (pointed cap)
  for (const x of [-6, 4, 10, 15]) {
    const len = 3.4;
    box(0.16, WALL_H, len, mat.black, x, WALL_H / 2, Z_BACK + len / 2);
    box(0.2, 0.08, len, mat.gold, x, WALL_H - 0.04, Z_BACK + len / 2);
    const post = box(0.26, WALL_H, 0.26, mat.blackGloss, x, WALL_H / 2, Z_BACK + len);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 4), mat.gold);
    cap.position.set(x, WALL_H + 0.2, Z_BACK + len); scene.add(cap);
  }

  /* ------------ yard (2.4.6): lawn slab, koi pond, flower planters -------- */
  const lawn = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 4.8), new THREE.MeshLambertMaterial({ color: 0x1d2b18 }));
  lawn.rotation.x = -Math.PI / 2; lawn.position.set(7.0, 0.002, 5.8); scene.add(lawn);
  lawn.userData.tap = "floor"; tappables.push(lawn);
  const pondWater = cyl(1.15, 1.15, 0.1, new THREE.MeshLambertMaterial({ color: 0x1d4a6e }), 8.2, 0.05, 5.9, 24);
  pondWater.userData.tap = "pond"; tappables.push(pondWater);
  const pondRim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.09, 8, 28), mat.steel);
  pondRim.rotation.x = Math.PI / 2; pondRim.position.set(8.2, 0.1, 5.9); scene.add(pondRim);
  pondRim.userData.tap = "pond"; tappables.push(pondRim);
  const koi = [];
  const koiCols = [0xff7a2a, 0xffd27a, 0xff9a5a];
  for (let i = 0; i < 3; i++) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshLambertMaterial({ color: koiCols[i] }));
    k.scale.set(1.6, 0.5, 0.8); k.position.set(8.2, 0.11, 5.9); scene.add(k);
    k.userData.tap = "pond"; tappables.push(k);
    koi.push({ mesh: k, r: 0.45 + i * 0.2, speed: 0.25 + i * 0.08, phase: i * 2.1 });
  }
  const flowerCols = [0xff7ab8, 0xb04bff, 0xffffff, 0xff5a7a, 0xd9a0ff];
  for (const [px, pz] of [[5.3, 4.7], [5.3, 6.5]]) {
    const planter = box(1.1, 0.28, 0.5, mat.darkWood, px, 0.14, pz);
    planter.userData.tap = "flowers"; tappables.push(planter);
    for (let i = 0; i < 5; i++) {
      const fx = px - 0.4 + i * 0.2, fz = pz + (i % 2 ? 0.12 : -0.12);
      const stem = cyl(0.015, 0.015, 0.3, new THREE.MeshLambertMaterial({ color: 0x2a5a2a }), fx, 0.42, fz, 6);
      const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshLambertMaterial({ color: flowerCols[i] }));
      bloom.position.set(fx, 0.6, fz); scene.add(bloom);
      bloom.userData.tap = "flowers"; tappables.push(bloom);
      stem.userData.tap = "flowers"; tappables.push(stem);
    }
  }

  /* ------------ yard, a real outdoor room (2.4.7) ----------------
     The yard is a place you go, not scenery: a fence with a gate from the
     kitchen, a bench, sakura trees with drifting petals, a bamboo grove,
     and a hammock strung between the sakura trees. */
  // Fence around the yard (low rails + posts), gate gap at x 6.2..7.1.
  function fencePost(x, z) { const p = box(0.09, 0.85, 0.09, mat.darkWood, x, 0.42, z); const cap = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 4), mat.gold); cap.position.set(x, 0.92, z); scene.add(cap); return p; }
  function fenceRail(x0, x1, z, y) { return box(x1 - x0, 0.07, 0.05, mat.darkWood, (x0 + x1) / 2, y, z); }
  function fenceRailZ(x, z0, z1, y) { return box(0.05, 0.07, z1 - z0, mat.darkWood, x, y, (z0 + z1) / 2); }
  for (let x = 4.3; x <= 9.8; x += 1.1) fencePost(x, 8.2);
  // South fence rails leave a gate gap at x 6.2..7.1 (2.4.20) — the way
  // through to the skate park, lined up with the kitchen gate.
  fenceRail(4.2, 6.2, 8.2, 0.35); fenceRail(4.2, 6.2, 8.2, 0.65);
  fenceRail(7.1, 9.8, 8.2, 0.35); fenceRail(7.1, 9.8, 8.2, 0.65);
  // The park gate: two posts with pointed caps + an arched top rail, tappable.
  const parkGateG = new THREE.Group(); scene.add(parkGateG);
  fencePost(6.2, 8.2); fencePost(7.1, 8.2);
  const parkGateArch = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 8, 20, Math.PI), mat.gold);
  parkGateArch.position.set(6.65, 0.85, 8.2); parkGateG.add(parkGateArch);
  const parkGateBar = box(0.9, 0.05, 0.05, mat.darkWood, 6.65, 0.55, 8.2, parkGateG);
  tagged(parkGateG, "parkgate");
  for (let z = 3.6; z <= 8.2; z += 1.15) { fencePost(4.2, z); fencePost(9.8, z); }
  fenceRailZ(4.2, 3.4, 8.2, 0.35); fenceRailZ(4.2, 3.4, 8.2, 0.65);
  fenceRailZ(9.8, 3.4, 8.2, 0.35); fenceRailZ(9.8, 3.4, 8.2, 0.65);
  fenceRail(4.2, 6.2, 3.4, 0.35); fenceRail(4.2, 6.2, 3.4, 0.65);
  fenceRail(7.1, 9.8, 3.4, 0.35); fenceRail(7.1, 9.8, 3.4, 0.65);
  // The gate: two posts with pointed caps + an arched top rail, tappable.
  const gateG = new THREE.Group(); scene.add(gateG);
  fencePost(6.2, 3.4); fencePost(7.1, 3.4);
  const gateArch = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 8, 20, Math.PI), mat.gold);
  gateArch.position.set(6.65, 0.85, 3.4); gateG.add(gateArch);
  const gateBar = box(0.9, 0.05, 0.05, mat.darkWood, 6.65, 0.55, 3.4, gateG);
  tagged(gateG, "gate");
  // Bench to sit together, facing the pond.
  const benchG = new THREE.Group(); scene.add(benchG);
  box(1.4, 0.07, 0.45, mat.wood, 5.0, 0.44, 7.1, benchG);
  box(1.4, 0.5, 0.06, mat.wood, 5.0, 0.72, 7.3, benchG);
  for (const dx of [-0.6, 0.6]) box(0.08, 0.44, 0.4, mat.darkWood, 5.0 + dx, 0.22, 7.1, benchG);
  const benchCushion = box(1.3, 0.06, 0.4, mat.velvetRed, 5.0, 0.5, 7.08, benchG);
  tagged(benchG, "bench");
  // Sakura trees by the koi pond — pink blossoms, petals drifting down.
  const petals = [];
  function sakuraTree(x, z) {
    const g = new THREE.Group(); scene.add(g);
    cyl(0.09, 0.15, 1.7, mat.darkWood, x, 0.85, z, 8, g);
    const pinks = [0xff9ec4, 0xffb8d0, 0xff8fb8];
    const blobs = [[0, 2.0, 0, 0.75], [0.5, 1.75, 0.2, 0.55], [-0.45, 1.8, -0.15, 0.6], [0.1, 2.3, -0.1, 0.55]];
    blobs.forEach(([dx, dy, dz, r], i) => {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), new THREE.MeshLambertMaterial({ color: pinks[i % 3] }));
      b.position.set(x + dx, dy, z + dz); b.scale.y = 0.75; g.add(b);
    });
    tagged(g, "sakura");
    return g;
  }
  sakuraTree(9.6, 6.9); sakuraTree(6.0, 7.1);
  const petalMat = new THREE.MeshBasicMaterial({ color: 0xffb8d0, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  for (let i = 0; i < 36; i++) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.05, 6), petalMat);
    p.position.set(5 + Math.random() * 5, 0.2 + Math.random() * 2.6, 5.2 + Math.random() * 2.8);
    p.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    scene.add(p);
    petals.push({ mesh: p, speed: 0.25 + Math.random() * 0.3, phase: Math.random() * 6 });
  }
  // Bamboo grove near the pond and sakura — stalks swaying.
  const bambooStalks = [];
  const bambooG = new THREE.Group(); scene.add(bambooG);
  const bambooMat = new THREE.MeshLambertMaterial({ color: 0x4a7a3a });
  const bambooLeaf = new THREE.MeshLambertMaterial({ color: 0x5a8a4a });
  for (let i = 0; i < 7; i++) {
    const bx = 9.45 + (i % 3) * 0.18, bz = 4.2 + Math.floor(i / 3) * 0.55 + (i % 2) * 0.12;
    const h = 1.8 + (i % 3) * 0.35;
    const stalk = cyl(0.028, 0.04, h, bambooMat, bx, h / 2, bz, 6, bambooG);
    const base = (Math.random() - 0.5) * 0.06;
    stalk.rotation.z = base;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 5), bambooLeaf);
    leaf.position.set(bx + 0.06, h + 0.1, bz); bambooG.add(leaf);
    bambooStalks.push({ mesh: stalk, base, phase: i * 1.3 });
  }
  tagged(bambooG, "bamboo");
  // Hammock strung between the sakura trees — somewhere to relax together.
  const hammockGroup = new THREE.Group(); scene.add(hammockGroup);
  const hammockTex = canvasTex(128, 64, (g, w, h) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#7a1e3a" : "#e8d5c8"; g.fillRect(i * 16, 0, 16, h); }
  });
  const clothGeo = new THREE.PlaneGeometry(1.9, 0.65, 12, 1);
  const cpos = clothGeo.attributes.position;
  for (let i = 0; i < cpos.count; i++) {
    const u = (cpos.getX(i) + 0.95) / 1.9;
    cpos.setZ(i, -0.16 * Math.sin(u * Math.PI));
  }
  clothGeo.computeVertexNormals();
  const hammockCloth = new THREE.Mesh(clothGeo, new THREE.MeshLambertMaterial({ map: hammockTex, side: THREE.DoubleSide }));
  hammockCloth.rotation.x = -Math.PI / 2; hammockCloth.position.set(7.8, 0.62, 7.0);
  hammockGroup.add(hammockCloth);
  for (const s of [-1, 1]) {
    const rope = cyl(0.015, 0.015, 0.55, new THREE.MeshLambertMaterial({ color: 0xc8b090 }), 7.8 + s * 1.05, 0.78, 7.0, 6, hammockGroup);
    rope.rotation.z = s * 1.1;
  }
  tagged(hammockGroup, "hammock");

  /* ------------ skate park (2.4.20): a real place in her world -------
     South of the yard fence, through the park gate: concrete, a half
     pipe, a bowl, grind rails, a ledge, wedge ramps and a funbox. Not a
     side game — a room of her world, in the same 3D style as the
     apartment. The avatars ride it (see the skate session below); the
     geometry here is all rideable shapes, not scenery. */
  const concreteTex = canvasTex(256, 256, (g, w) => {
    g.fillStyle = "#3a3a40"; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
      g.fillRect(Math.random() * w, Math.random() * w, 2, 2);
    }
    g.strokeStyle = "rgba(0,0,0,0.4)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 128); g.lineTo(w, 128); g.stroke();
    g.beginPath(); g.moveTo(128, 0); g.lineTo(128, w); g.stroke();
  }, [2, 2]);
  const parkSlab = new THREE.Mesh(new THREE.PlaneGeometry(8, 9.2), new THREE.MeshLambertMaterial({ map: concreteTex }));
  parkSlab.rotation.x = -Math.PI / 2; parkSlab.position.set(7, 0.003, 12.8); scene.add(parkSlab);
  parkSlab.userData.tap = "floor"; tappables.push(parkSlab);
  // Fence around the park (east, west, south sides; the north side is the
  // yard fence with the park gate in it).
  for (let z = 8.6; z <= 17.2; z += 1.15) { fencePost(3.2, z); fencePost(10.8, z); }
  fenceRailZ(3.2, 8.2, 17.2, 0.35); fenceRailZ(3.2, 8.2, 17.2, 0.65);
  fenceRailZ(10.8, 8.2, 17.2, 0.35); fenceRailZ(10.8, 8.2, 17.2, 0.65);
  for (let x = 3.5; x <= 10.6; x += 1.15) fencePost(x, 17.2);
  fenceRail(3.2, 10.8, 17.2, 0.35); fenceRail(3.2, 10.8, 17.2, 0.65);
  // The sign over the gate — goth pink on black, so you know where you are.
  const signTex = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = "#0d0a10"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#b8902e"; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#ff7ab8"; g.font = "bold 64px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("SKATE PARK", w / 2, h / 2 + 2);
  });
  const parkSign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.6), new THREE.MeshLambertMaterial({ map: signTex }));
  parkSign.position.set(6.65, 1.7, 8.35); scene.add(parkSign);
  for (const sx of [5.6, 7.7]) box(0.08, 1.7, 0.08, mat.darkWood, sx, 0.85, 8.35);
  tagged(parkSign, "parksign");
  // Half pipe (2.4.20): two quarter-pipe curves facing each other across a
  // flat bottom, lips at z 13.4 and 16.6, flat bottom z 14.6..15.4. Each
  // quarter pipe is an extruded quarter-circle band (radius 1.2, 0.1 thick,
  // 2.6 wide), rotated so the curve rises in the vertical plane.
  function quarterPipe(R, width) {
    const s = new THREE.Shape();
    s.absarc(0, 0, R, 0, Math.PI / 2, false);
    s.absarc(0, 0, R - 0.1, Math.PI / 2, 0, true);
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: false });
  }
  const pipeMat = new THREE.MeshLambertMaterial({ color: 0x4a4a52 });
  const pipeMat2 = new THREE.MeshLambertMaterial({ color: 0x42424a });
  const northPipe = new THREE.Mesh(quarterPipe(1.2, 2.6), pipeMat);
  northPipe.rotation.y = -Math.PI / 2; // tall lip at z 13.4, sloping down to 14.6
  northPipe.position.set(5.9, 0, 13.4); scene.add(northPipe);
  const southPipe = new THREE.Mesh(quarterPipe(1.2, 2.6), pipeMat2);
  southPipe.rotation.y = Math.PI / 2; // tall lip at z 16.6, sloping down to 15.4
  southPipe.position.set(3.3, 0, 16.6); scene.add(southPipe);
  const pipeBottom = box(2.6, 0.06, 0.8, new THREE.MeshLambertMaterial({ color: 0x33333a }), 4.6, 0.03, 15.0);
  // Coping rails along both lips + decks to stand on behind them.
  for (const cz of [13.4, 16.6]) {
    const coping = cyl(0.05, 0.05, 2.6, mat.steel, 4.6, 1.2, cz, 10);
    coping.rotation.z = Math.PI / 2;
  }
  box(2.6, 0.1, 0.9, new THREE.MeshLambertMaterial({ color: 0x3a3a40 }), 4.6, 1.25, 12.95);
  box(2.6, 0.1, 0.9, new THREE.MeshLambertMaterial({ color: 0x3a3a40 }), 4.6, 1.25, 17.05);
  const halfpipeG = new THREE.Group(); scene.add(halfpipeG);
  halfpipeG.add(northPipe); halfpipeG.add(southPipe); halfpipeG.add(pipeBottom);
  tagged(halfpipeG, "halfpipe");
  glowSprite(0xb04bff, 1.6, 4.6, 1.4, 15.0, null, 0.35);
  // The bowl: a rim ring, a low centre disc, and a sloped inner wall.
  const bowlG = new THREE.Group(); scene.add(bowlG);
  const bowlRim = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.1, 8, 28), mat.steel);
  bowlRim.rotation.x = Math.PI / 2; bowlRim.position.set(9.3, 0.22, 15.0); bowlG.add(bowlRim);
  const bowlWall = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.85, 0.25, 24, 1, true), new THREE.MeshLambertMaterial({ color: 0x4a4a52, side: THREE.DoubleSide }));
  bowlWall.position.set(9.3, 0.12, 15.0); bowlG.add(bowlWall);
  const bowlFloor = new THREE.Mesh(new THREE.CircleGeometry(0.85, 24), new THREE.MeshLambertMaterial({ color: 0x2e2e34 }));
  bowlFloor.rotation.x = -Math.PI / 2; bowlFloor.position.set(9.3, 0.005, 15.0); bowlG.add(bowlFloor);
  tagged(bowlG, "bowl");
  glowSprite(0xff3a5a, 1.4, 9.3, 0.8, 15.0, null, 0.3);
  // Grind rails: rail A (the trick rail — the grind trick rides it) runs
  // along x at z 13.2; rail B runs along z at x 9.6.
  function grindRail(x, z, alongX, len) {
    const g = new THREE.Group(); scene.add(g);
    const bar = cyl(0.04, 0.04, len, mat.steel, x, 0.55, z, 10, g);
    if (alongX) bar.rotation.z = Math.PI / 2; else bar.rotation.x = Math.PI / 2;
    const off = len / 2 - 0.3;
    for (const s of [-1, 1]) {
      if (alongX) cyl(0.03, 0.03, 0.55, mat.darkWood, x + s * off, 0.27, z, 8, g);
      else cyl(0.03, 0.03, 0.55, mat.darkWood, x, 0.27, z + s * off, 8, g);
    }
    return g;
  }
  const railAG = grindRail(6.0, 13.2, true, 2.8);
  tagged(railAG, "rail");
  grindRail(9.6, 12.25, false, 2.5);
  // Ledge + funbox + wedge ramps.
  const ledgeG = new THREE.Group(); scene.add(ledgeG);
  box(2.4, 0.45, 0.6, new THREE.MeshLambertMaterial({ color: 0x4a4a52 }), 5.0, 0.225, 10.8, ledgeG);
  box(2.4, 0.05, 0.08, mat.steel, 5.0, 0.47, 10.52, ledgeG);
  tagged(ledgeG, "ledge");
  box(1.8, 0.5, 1.8, new THREE.MeshLambertMaterial({ color: 0x3f3f46 }), 7.0, 0.25, 10.6);
  function wedgeRamp(w, d, h) {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(d, 0); s.lineTo(d, h); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  }
  const rampMat = new THREE.MeshLambertMaterial({ color: 0x4a4a52 });
  const ramp1 = new THREE.Mesh(wedgeRamp(1.6, 1.4, 0.7), rampMat);
  ramp1.rotation.y = Math.PI / 2; // high edge faces north, low edge south
  ramp1.position.set(8.6, 0, 9.6); scene.add(ramp1);
  const ramp2 = new THREE.Mesh(wedgeRamp(1.6, 1.4, 0.7), rampMat);
  ramp2.rotation.y = -Math.PI / 2; // high edge faces south, low edge north
  ramp2.position.set(4.8, 0, 11.6); scene.add(ramp2);
  const rampG = new THREE.Group(); scene.add(rampG);
  rampG.add(ramp1); rampG.add(ramp2);
  tagged(rampG, "ramp");
  // A skull on a post by the south fence — goth park, obviously.
  const parkSkullG = new THREE.Group(); scene.add(parkSkullG);
  cyl(0.05, 0.06, 1.0, mat.darkWood, 10.4, 0.5, 16.6, 8, parkSkullG);
  const skullBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat.skull);
  skullBall.position.set(10.4, 1.12, 16.6); parkSkullG.add(skullBall);
  for (const ex of [-0.06, 0.06]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat.black);
    eye.position.set(10.4 + ex, 1.14, 16.75); parkSkullG.add(eye);
  }
  tagged(parkSkullG, "parkskull");

  /* ------------ Builder World field (2.4.22): the open ground south of
     the park — dark stone, low fences, a gate in the park's south fence
     and a sign over it. This is where shapes get built; the field floor
     is tappable like the park slab, and the gate walks everyone down
     here. Her world, in memory of the world taken from Emmi. */
  const builderSlab = new THREE.Mesh(new THREE.PlaneGeometry(10, 9), new THREE.MeshLambertMaterial({ color: 0x241f28 }));
  builderSlab.rotation.x = -Math.PI / 2; builderSlab.position.set(7, 0.004, 22); scene.add(builderSlab);
  builderSlab.userData.tap = "floor"; tappables.push(builderSlab);
  // Low fence on the east, west and south sides (the north side is the
  // park fence with the builder gate in it).
  for (let z = 18.0; z <= 26.2; z += 1.15) { fencePost(2.2, z); fencePost(11.8, z); }
  fenceRailZ(2.2, 17.6, 26.4, 0.35); fenceRailZ(2.2, 17.6, 26.4, 0.65);
  fenceRailZ(11.8, 17.6, 26.4, 0.35); fenceRailZ(11.8, 17.6, 26.4, 0.65);
  for (let x = 2.5; x <= 11.6; x += 1.15) fencePost(x, 26.4);
  fenceRail(2.2, 11.8, 26.4, 0.35); fenceRail(2.2, 11.8, 26.4, 0.65);
  // The builder gate: two tall posts with pointed caps + an arched top
  // rail in the park's south fence, lined up with the park gate.
  const builderGateG = new THREE.Group(); scene.add(builderGateG);
  for (const px of [6.3, 7.7]) {
    box(0.12, 1.3, 0.12, mat.darkWood, px, 0.65, 17.2, builderGateG);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.25, 4), mat.gold);
    cap.position.set(px, 1.42, 17.2); builderGateG.add(cap);
  }
  const builderGateArch = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.05, 8, 20, Math.PI), mat.gold);
  builderGateArch.position.set(7.0, 1.3, 17.2); builderGateG.add(builderGateArch);
  tagged(builderGateG, "buildergate");
  // The sign over the gate — goth violet on black, like the park sign.
  const builderSignTex = canvasTex(512, 128, (g, w, h) => {
    g.fillStyle = "#0d0a10"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#b8902e"; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#b04bff"; g.font = "bold 52px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("BUILDER WORLD", w / 2, h / 2 + 2);
  });
  const builderSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.65), new THREE.MeshLambertMaterial({ map: builderSignTex }));
  builderSign.position.set(7.0, 2.1, 17.35); scene.add(builderSign);
  for (const sx of [5.8, 8.2]) box(0.08, 2.1, 0.08, mat.darkWood, sx, 1.05, 17.35);
  tagged(builderSign, "buildersign");
  // Violet corner torches so the field reads at night, and a skull on a
  // post by the south fence — goth field, obviously.
  for (const [tx, tz] of [[2.6, 18.2], [11.4, 18.2], [2.6, 25.8], [11.4, 25.8]]) {
    cyl(0.05, 0.06, 1.0, mat.darkWood, tx, 0.5, tz, 8);
    glowSprite(0xb04bff, 0.9, tx, 1.15, tz, null, 0.5);
  }
  const builderSkullG = new THREE.Group(); scene.add(builderSkullG);
  cyl(0.05, 0.06, 1.0, mat.darkWood, 3.0, 0.5, 25.8, 8, builderSkullG);
  const bSkullBall = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), mat.skull);
  bSkullBall.position.set(3.0, 1.12, 25.8); builderSkullG.add(bSkullBall);
  for (const ex of [-0.06, 0.06]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat.black);
    eye.position.set(3.0 + ex, 1.14, 25.65); builderSkullG.add(eye);
  }
  tagged(builderSkullG, "builderskull");

  /* ------------ ritual room (2.4.7): altar, candles, crystal ball ------ */
  // Pentagram rug in the middle of the room.
  const pentTex = canvasTex(256, 256, (g, w) => {
    g.fillStyle = "#1c0b28"; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#b8902e"; g.lineWidth = 5;
    g.beginPath(); g.arc(128, 128, 116, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(128, 128, 96, 0, Math.PI * 2); g.stroke();
    const pts = [];
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * (Math.PI * 2 / 5); pts.push([128 + Math.cos(a) * 96, 128 + Math.sin(a) * 96]); }
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    [2, 4, 1, 3, 0].forEach((i) => g.lineTo(pts[i][0], pts[i][1]));
    g.closePath(); g.stroke();
    g.fillStyle = "#b8902e";
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.arc(128 + Math.cos(a) * 108, 128 + Math.sin(a) * 108, 3, 0, Math.PI * 2); g.fill(); }
  });
  const ritualRug = new THREE.Mesh(new THREE.CircleGeometry(1.5, 40), new THREE.MeshLambertMaterial({ map: pentTex }));
  ritualRug.rotation.x = -Math.PI / 2; ritualRug.position.set(17.75, 0.006, -0.4); scene.add(ritualRug);
  ritualRug.userData.tap = "ritual_rug"; tappables.push(ritualRug);
  // The altar: dark wood table + velvet cloth against the back wall.
  const altarG = new THREE.Group(); scene.add(altarG);
  box(2.2, 0.08, 0.8, mat.black, 17.75, 0.78, -3.3, altarG);
  box(2.24, 0.05, 0.84, mat.velvetRed, 17.75, 0.83, -3.3, altarG);
  for (const dx of [-1.0, 1.0]) box(0.1, 0.76, 0.7, mat.darkWood, 17.75 + dx, 0.38, -3.3, altarG);
  tagged(altarG, "altar");
  // Three candles on the altar — they light, burn down, and go out.
  const candleState = [{ lit: false, burn: 100 }, { lit: false, burn: 100 }, { lit: false, burn: 100 }];
  const candleMeshes = [];
  const candleCols = [0xe8dcc8, 0x8a5adf, 0x1c1c22];
  [16.9, 17.75, 18.6].forEach((cx, i) => {
    const c = cyl(0.05, 0.055, 0.28, new THREE.MeshLambertMaterial({ color: candleCols[i] }), cx, 1.0, -3.35, 10);
    c.userData.tap = "candle"; c.userData.candleIndex = i; tappables.push(c);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.13, 8), new THREE.MeshBasicMaterial({ color: 0xffb13a }));
    flame.position.set(cx, 1.2, -3.35); flame.visible = false; scene.add(flame);
    const glow = glowSprite(0xff9a2a, 0.7, cx, 1.2, -3.3, null, 0);
    candleMeshes.push({ candle: c, flame, glow, baseY: 1.0 });
  });
  let incenseOn = false;
  const incenseSteam = [];
  // Incense censor: brass bowl with smoke that rises when lit.
  const censor = cyl(0.09, 0.06, 0.08, mat.gold, 16.6, 0.9, -3.3, 12);
  censor.userData.tap = "incense"; tappables.push(censor);
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xcfc8e0, transparent: true, opacity: 0, depthWrite: false }));
    s.scale.setScalar(0.22); s.position.set(16.6, 0.95, -3.3);
    s.userData = { x: 16.6, y: 0.95, z: -3.3, p: i / 3, size: 0.22 };
    scene.add(s); incenseSteam.push(s);
  }
  // Crystal ball on a stand — for divination.
  const ballStand = cyl(0.09, 0.12, 0.1, mat.gold, 17.0, 0.9, -3.3, 10);
  ballStand.userData.tap = "crystalball"; tappables.push(ballStand);
  const crystalBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), new THREE.MeshLambertMaterial({ color: 0x8a7ab8, transparent: true, opacity: 0.75 }));
  crystalBall.position.set(17.0, 1.12, -3.3); scene.add(crystalBall);
  crystalBall.userData.tap = "crystalball"; tappables.push(crystalBall);
  const ballGlow = glowSprite(0xa040ff, 1.1, 17.0, 1.12, -3.2, null, 0.3);
  // Crystals for divination: amethyst, rose quartz, clear quartz.
  const crystalCols = [0x9a5adf, 0xff9ec4, 0xdfe6ee];
  crystalCols.forEach((col, i) => {
    const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.09), new THREE.MeshLambertMaterial({ color: col }));
    cr.position.set(18.35 + i * 0.22, 0.95, -3.28); cr.rotation.y = i * 0.7; scene.add(cr);
    cr.userData.tap = "crystals"; cr.userData.crystalIndex = i; tappables.push(cr);
  });
  // The wand, lying on the altar.
  const wand = cyl(0.015, 0.02, 0.55, mat.darkWood, 17.45, 0.88, -3.12, 6);
  wand.rotation.z = Math.PI / 2 - 0.15; wand.rotation.y = 0.4;
  wand.userData.tap = "wand"; tappables.push(wand);
  const wandTip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), mat.gold);
  wandTip.position.set(17.72, 0.88, -3.12); scene.add(wandTip);
  wandTip.userData.tap = "wand"; tappables.push(wandTip);
  // Ingredient bowls — one per herb; the fill level IS the herb stock the
  // garden grew, and casting spends it. Driven by ritualFx({herbs}).
  const bowlCols = [0x4a7a3a, 0x9a5adf, 0xd9a03a, 0x3aa06a]; // sage, lavender, rosemary, mint
  const bowlFills = [];
  bowlCols.forEach((col, i) => {
    const bx = 18.05 + i * 0.23;
    const b = cyl(0.09, 0.07, 0.06, mat.steel, bx, 0.89, -3.52, 10);
    b.userData.tap = "bowls"; tappables.push(b);
    const fill = cyl(0.075, 0.075, 0.02, new THREE.MeshLambertMaterial({ color: col }), bx, 0.92, -3.52, 10);
    fill.userData.tap = "bowls"; tappables.push(fill);
    fill.visible = false; fill.scale.y = 0.15;
    bowlFills.push(fill);
  });
  // Scrying board leaning on the back wall — letters, YES / NO / GOODBYE.
  const scryTex = canvasTex(256, 192, (g, w, h) => {
    g.fillStyle = "#1c0b28"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#b8902e"; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = "#e8d5c8"; g.font = "700 22px sans-serif"; g.textAlign = "center";
    g.fillText("A B C D E F G", 128, 44);
    g.fillText("H I J K L M N", 128, 74);
    g.fillText("O P Q R S T U", 128, 104);
    g.fillText("V W X Y Z", 128, 134);
    g.fillStyle = "#ff9ec4"; g.font = "700 20px sans-serif";
    g.fillText("YES · NO · GOODBYE", 128, 168);
  });
  const scryBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.85), new THREE.MeshLambertMaterial({ map: scryTex }));
  scryBoard.position.set(19.35, 0.55, -3.9); scryBoard.rotation.x = -0.18; scene.add(scryBoard);
  scryBoard.userData.tap = "scrying"; tappables.push(scryBoard);
  // Magic staff leaning on the partition, skull on top.
  const staffG = new THREE.Group(); scene.add(staffG);
  const staffMesh = cyl(0.03, 0.035, 1.9, mat.darkWood, 15.55, 0.95, -3.5, 8, staffG);
  staffMesh.rotation.z = 0.22;
  const staffSkull = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat.skull);
  staffSkull.position.set(15.75, 1.88, -3.5); staffG.add(staffSkull);
  const staffGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), new THREE.MeshLambertMaterial({ color: 0xa040ff }));
  staffGem.position.set(15.75, 1.72, -3.5); staffG.add(staffGem);
  tagged(staffG, "staff");
  // Scrying mirror on the back wall.
  const rMirrorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 32), mat.gold);
  rMirrorFrame.scale.set(0.85, 1.12, 1); rMirrorFrame.position.set(19.6, 1.7, -3.94); scene.add(rMirrorFrame);
  rMirrorFrame.userData.tap = "ritual_mirror"; tappables.push(rMirrorFrame);
  const rMirrorGlass = new THREE.Mesh(new THREE.CircleGeometry(0.49, 32), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w) => {
    const grd = g.createLinearGradient(0, 0, w, w); grd.addColorStop(0, "#241a3a"); grd.addColorStop(0.5, "#0d0a18"); grd.addColorStop(1, "#2a1a3a");
    g.fillStyle = grd; g.fillRect(0, 0, w, w); g.fillStyle = "rgba(255,255,255,0.10)"; g.beginPath(); g.moveTo(20, 110); g.lineTo(50, 10); g.lineTo(70, 10); g.lineTo(40, 110); g.fill();
  }) }));
  rMirrorGlass.scale.set(0.85, 1.12, 1); rMirrorGlass.position.set(19.6, 1.7, -3.93); scene.add(rMirrorGlass);
  rMirrorGlass.userData.tap = "ritual_mirror"; tappables.push(rMirrorGlass);
  glowSprite(0xa040ff, 1.4, 19.6, 1.7, -3.8, null, 0.2);
  // Goth corner (2.4.8): a bat on the wall, velvet drapes, and a skull with
  // black roses on a wrought-iron stand. The skull talks back when tapped.
  const batG = new THREE.Group(); batG.position.set(19.6, 2.8, -3.9); scene.add(batG);
  const batBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat.black);
  batBody.scale.set(1, 0.7, 0.5); batG.add(batBody);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.16), mat.black);
    wing.position.set(s * 0.2, 0.02, 0); wing.rotation.z = s * 0.45; batG.add(wing);
  }
  for (const dx of [-0.62, 0.62]) {
    const drape = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 2.3), new THREE.MeshLambertMaterial({ color: 0x4a0f1e }));
    drape.position.set(17.75 + dx * 3.85, 1.15, -3.93); scene.add(drape);
  }
  const skullG = new THREE.Group(); skullG.position.set(15.6, 0, -2.4); scene.add(skullG);
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), mat.black);
  pedestal.position.y = 0.45; skullG.add(pedestal);
  const skullHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), mat.skull);
  skullHead.position.set(-0.1, 1.02, 0); skullHead.scale.set(1, 0.95, 0.95); skullG.add(skullHead);
  const skullJaw = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.09), mat.skull);
  skullJaw.position.set(-0.1, 0.93, 0.05); skullG.add(skullJaw);
  for (const ex of [-0.045, 0.045]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), mat.black);
    eye.position.set(-0.1 + ex, 1.04, 0.1); skullG.add(eye);
  }
  const roseVase = cyl(0.05, 0.04, 0.18, mat.black, 0, 0, 0, 8, skullG);
  roseVase.position.set(0.13, 0.99, 0);
  for (let i = 0; i < 3; i++) {
    const stem = cyl(0.008, 0.008, 0.22, new THREE.MeshLambertMaterial({ color: 0x1e3a1e }), 0, 0, 0, 5, skullG);
    stem.position.set(0.13 + (i - 1) * 0.03, 1.18, (i - 1) * 0.02);
    stem.rotation.z = (i - 1) * 0.25;
    const rose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshLambertMaterial({ color: 0x2a060d }));
    rose.position.set(0.13 + (i - 1) * 0.08, 1.3, (i - 1) * 0.02); skullG.add(rose);
  }
  tagged(skullG, "ritual_skull");
  // Candle + incense visuals, driven by ritualFx() from the app.
  let candleBoost = 0; // warm light added to the room lamp, per lit candle
  let castFlareUntil = 0; // performance.now() until which a cast flare burns
  function applyRitualFx() {
    candleState.forEach((c, i) => {
      const m = candleMeshes[i]; if (!m) return;
      m.flame.visible = c.lit;
      m.glow.material.opacity = c.lit ? 0.5 : 0;
      const s = 0.3 + 0.7 * (c.burn / 100);
      m.candle.scale.y = s;
      m.candle.position.y = 0.86 + 0.14 * s;
      m.flame.position.y = 0.86 + 0.28 * s + 0.06;
      m.glow.position.y = 0.86 + 0.28 * s + 0.06;
    });
    candleBoost = candleState.filter((c) => c.lit).length * 2.2;
    applyLamp("ritual");
  }
  applyRitualFx();
  // Weather + time of day over the yard (2.4.7): the sky changes with the
  // hour, and rain / cloud can be picked in the Yard panel.
  const weatherState = { mode: "auto" };
  const rainGeo = new THREE.BufferGeometry();
  const rainCount = 220, rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) { rainPos[i * 3] = 3.5 + Math.random() * 7; rainPos[i * 3 + 1] = Math.random() * 5; rainPos[i * 3 + 2] = 3.5 + Math.random() * 5; }
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
  const rainPts = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x9ab8d8, size: 0.06, transparent: true, opacity: 0.6 }));
  rainPts.visible = false; scene.add(rainPts);
  const sunSpr = glowSprite(0xffd27a, 3.4, 7, 5.6, 9.5, null, 0.5);
  const moonSpr = glowSprite(0xdfe6ff, 2.4, 7, 5.2, 9.5, null, 0.45);
  function applySky() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    // Fixed bands by default; with a latitude (Permissions → Location →
    // "Use my location"), day and dusk follow his real sunrise/sunset.
    let day, dusk;
    const lat = weatherState.lat;
    if (lat && Math.abs(lat) <= 90) {
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const n = Math.floor((now - start) / 864e5);
      const decl = -23.44 * Math.PI / 180 * Math.cos(2 * Math.PI / 365 * (n + 10));
      const cosH = Math.max(-1, Math.min(1, -Math.tan(lat * Math.PI / 180) * Math.tan(decl)));
      const dayLen = 2 * Math.acos(cosH) * 180 / Math.PI / 15;
      const rise = 12 - dayLen / 2, set = 12 + dayLen / 2;
      day = h >= rise && h < set - 1; dusk = h >= set - 1 && h < set + 1;
    } else { day = h >= 7 && h < 17; dusk = h >= 17 && h < 19; }
    const mode = weatherState.mode;
    if (mode === "rain") { hemi.intensity = 0.85; renderer.setClearColor(0x11141c, 1); scene.fog.color.set(0x11141c); }
    else if (mode === "cloudy") { hemi.intensity = 1.0; renderer.setClearColor(0x171a24, 1); scene.fog.color.set(0x171a24); }
    else { hemi.intensity = day ? 1.55 : dusk ? 1.1 : 0.85; const c = day ? 0x2c3a55 : dusk ? 0x2a1a33 : 0x07050b; renderer.setClearColor(c, 1); scene.fog.color.set(c); }
    sunSpr.visible = day && mode !== "rain";
    moonSpr.visible = !day;
    rainPts.visible = mode === "rain";
  }
  applySky();

  /* ------------ LED strips (bedroom + living) */
  const ledStrips = [];
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xb04bff });
  for (const [x0, x1] of [[-13.9, -6.1], [-5.9, 3.9]]) {
    const s = box(x1 - x0, 0.05, 0.05, ledMat, (x0 + x1) / 2, WALL_H - 0.16, Z_BACK + 0.08);
    tagged(s, "led");
    ledStrips.push(s);
  }
  const ledGlows = [];
  for (let x = -13; x <= 3; x += 2.2) ledGlows.push(glowSprite(0xb04bff, 2.2, x, WALL_H - 0.3, Z_BACK + 0.25, null, 0.28));
  const ledState = { mode: "purple", hue: 0 };
  const LED_COLORS = { purple: 0xb04bff, red: 0xff2244, pink: 0xff4fa8, gold: 0xffc24a, blue: 0x3a6bff, off: 0x000000, rainbow: 0xffffff };
  const LED_ORDER = ["purple", "red", "pink", "gold", "blue", "rainbow", "off"];

  /* ================= BEDROOM ================= */
  // gothic bed
  const bed = new THREE.Group(); scene.add(bed);
  box(2.5, 0.38, 3.0, mat.darkWood, -12, 0.19, -2.4, bed);
  box(2.38, 0.24, 2.9, mat.sheet, -12, 0.5, -2.4, bed);
  box(2.42, 0.08, 1.9, mat.velvet, -12, 0.64, -1.85, bed); // blanket
  box(0.9, 0.16, 0.45, mat.pillow, -12.55, 0.7, -3.55, bed);
  box(0.9, 0.16, 0.45, mat.pillow, -11.45, 0.7, -3.55, bed);
  box(2.7, 1.55, 0.14, mat.black, -12, 0.95, -3.92, bed); // headboard
  box(2.7, 0.06, 0.16, mat.gold, -12, 1.72, -3.9, bed);
  for (const x of [-13.25, -12, -10.75]) {
    const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12, x === -12 ? 0.7 : 0.5, 6), mat.blackGloss);
    sp.position.set(x, x === -12 ? 2.08 : 1.98, -3.9); bed.add(sp);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat.gold); orb.position.set(x, 1.78, -3.84); bed.add(orb);
  }
  for (const x of [-13.2, -10.8]) box(0.12, 0.9, 0.12, mat.blackGloss, x, 0.45, -0.95, bed); // foot posts
  // plush on the bed
  const plush = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mat.plush); plush.position.set(-11.2, 0.86, -3.2); plush.scale.set(1, 0.9, 0.8); bed.add(plush);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat.plush); ear.scale.set(0.7, 1.4, 0.6); ear.position.set(-11.2 + s * 0.1, 1.07, -3.2); bed.add(ear); }
  tagged(bed, "bed");

  // nightstand + lamp + smartphone
  const ns = new THREE.Group(); scene.add(ns);
  box(0.7, 0.6, 0.55, mat.darkWood, -10.25, 0.3, -3.65, ns);
  box(0.72, 0.03, 0.57, mat.gold, -10.25, 0.61, -3.65, ns);
  tagged(ns, "nightstand");
  const bedLamp = new THREE.Group(); scene.add(bedLamp);
  cyl(0.04, 0.12, 0.05, mat.gold, -10.45, 0.645, -3.75, 12, bedLamp);
  cyl(0.02, 0.02, 0.36, mat.gold, -10.45, 0.84, -3.75, 6, bedLamp);
  const bedShade = cyl(0.11, 0.2, 0.24, new THREE.MeshBasicMaterial({ color: 0xa040ff }), -10.45, 1.1, -3.75, 14, bedLamp);
  roomLights.bedroom.shades.push(bedShade);
  roomLights.bedroom.glows.push(glowSprite(0xa040ff, 1.4, -10.45, 1.12, -3.6));
  tagged(bedLamp, "lamp:bedroom");
  // smartphone
  const phone = new THREE.Group(); scene.add(phone);
  const phoneBody = box(0.17, 0.018, 0.32, mat.blackGloss, -10.03, 0.63, -3.5, phone);
  phoneBody.rotation.y = 0.35;
  const phoneScreenMat = new THREE.MeshBasicMaterial({ color: 0x150f1d });
  const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.145, 0.29), phoneScreenMat);
  phoneScreen.rotation.set(-Math.PI / 2, 0, 0.35); phoneScreen.position.set(-10.03, 0.641, -3.5); phone.add(phoneScreen);
  // bigger invisible hit target so it's easy to tap on a phone screen
  const phoneHit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
  phoneHit.position.set(-10.03, 0.75, -3.5); phone.add(phoneHit);
  const phoneGlow = glowSprite(0xff3ea5, 0.9, -10.03, 0.72, -3.45, null, 0);
  const badgeCanvas = document.createElement("canvas"); badgeCanvas.width = badgeCanvas.height = 64;
  const badgeTex = new THREE.CanvasTexture(badgeCanvas); badgeTex.colorSpace = THREE.SRGBColorSpace;
  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex, transparent: true, depthTest: false }));
  badge.scale.set(0.26, 0.26, 1); badge.position.set(-9.9, 1.0, -3.45); badge.visible = false; badge.renderOrder = 5; scene.add(badge);
  tagged(phone, "phone");

  // vanity with an oval bulb mirror
  const van = new THREE.Group(); scene.add(van);
  box(1.5, 0.08, 0.62, mat.black, -7.4, 0.78, -3.65, van);
  for (const x of [-8.05, -6.75]) box(0.36, 0.74, 0.58, mat.darkWood, x, 0.37, -3.65, van);
  box(0.5, 0.12, 0.5, mat.velvet, -7.4, 0.48, -2.95, van); // stool
  cyl(0.05, 0.05, 0.42, mat.gold, -7.4, 0.21, -2.95, 6, van);
  const mirrorFrame = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.05, 8, 36), mat.gold);
  mirrorFrame.scale.set(0.85, 1.12, 1); mirrorFrame.position.set(-7.4, 1.65, -3.95); van.add(mirrorFrame);
  const mirrorGlass = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (g, w) => {
    const grd = g.createLinearGradient(0, 0, w, w); grd.addColorStop(0, "#4b3a5e"); grd.addColorStop(0.5, "#1b1424"); grd.addColorStop(1, "#3a2647");
    g.fillStyle = grd; g.fillRect(0, 0, w, w); g.fillStyle = "rgba(255,255,255,0.14)"; g.beginPath(); g.moveTo(20, 110); g.lineTo(50, 10); g.lineTo(70, 10); g.lineTo(40, 110); g.fill();
  }) }));
  mirrorGlass.scale.set(0.85, 1.12, 1); mirrorGlass.position.set(-7.4, 1.65, -3.94); van.add(mirrorGlass);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe6b0 });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const bl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), bulbMat);
    bl.position.set(-7.4 + Math.cos(a) * 0.56, 1.65 + Math.sin(a) * 0.68, -3.88); van.add(bl);
  }
  glowSprite(0xffd9a0, 1.8, -7.4, 1.65, -3.7, null, 0.25);
  // perfume + skull on the vanity
  cyl(0.05, 0.06, 0.16, new THREE.MeshLambertMaterial({ color: 0xa4304a, transparent: true, opacity: 0.85 }), -7.85, 0.9, -3.6, 8, van);
  const sk = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), mat.skull); sk.position.set(-6.95, 0.91, -3.6); van.add(sk);
  tagged(van, "vanity");

  // posters
  const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.06), new THREE.MeshLambertMaterial({ map: posterTex("peep") }));
  p1.position.set(-9.05, 2.05, -3.97); scene.add(p1); tagged(p1, "poster:peep");
  const p2 = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.18), new THREE.MeshLambertMaterial({ map: posterTex("sober") }));
  p2.rotation.y = Math.PI / 2; p2.position.set(-13.96, 1.9, -1.4); scene.add(p2); tagged(p2, "poster:sober");
  // gothic arched window with moonlight
  const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.4), new THREE.MeshBasicMaterial({ map: canvasTex(128, 200, (g, w, h) => {
    g.fillStyle = "#07060c"; g.fillRect(0, 0, w, h);
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, "#2b1f4a"); grd.addColorStop(1, "#0d0a18");
    g.fillStyle = grd; g.beginPath(); g.moveTo(10, h - 6); g.lineTo(10, 70); g.quadraticCurveTo(10, 14, w / 2, 6); g.quadraticCurveTo(w - 10, 14, w - 10, 70); g.lineTo(w - 10, h - 6); g.fill();
    g.fillStyle = "#f3e7b5"; g.beginPath(); g.arc(80, 60, 16, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#2b1f4a"; g.beginPath(); g.arc(88, 54, 14, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 18; i++) { g.fillStyle = "rgba(255,255,255," + (0.3 + Math.random() * 0.6) + ")"; g.fillRect(14 + Math.random() * 100, 20 + Math.random() * 160, 2, 2); }
    g.strokeStyle = "#1a1420"; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w / 2, h); g.moveTo(10, 110); g.lineTo(w - 10, 110); g.stroke();
  }) }));
  win.rotation.y = Math.PI / 2; win.position.set(-13.95, 1.9, 0.9); scene.add(win);

  /* ================= LIVING ROOM ================= */
  // rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.7, 40), new THREE.MeshLambertMaterial({ map: canvasTex(256, 256, (g, w) => {
    g.fillStyle = "#2a0e22"; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "#b8902e"; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 116, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "#5a1838"; g.lineWidth = 14; g.beginPath(); g.arc(128, 128, 86, 0, Math.PI * 2); g.stroke();
    g.fillStyle = "#b8902e"; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.beginPath(); g.arc(128 + Math.cos(a) * 52, 128 + Math.sin(a) * 52, 6, 0, Math.PI * 2); g.fill(); }
  }) }));
  rug.rotation.x = -Math.PI / 2; rug.scale.set(1.25, 0.85, 1); rug.position.set(-3.4, 0.006, -1.3); scene.add(rug);
  rug.userData.tap = "floor"; tappables.push(rug);

  // TV on a low stand
  const tvG = new THREE.Group(); scene.add(tvG);
  box(2.8, 0.5, 0.5, mat.black, -3.6, 0.25, -3.68, tvG);
  box(2.82, 0.03, 0.52, mat.gold, -3.6, 0.51, -3.68, tvG);
  box(2.56, 1.48, 0.08, mat.blackGloss, -3.6, 1.55, -3.9, tvG);
  const tvOffMat = new THREE.MeshBasicMaterial({ color: 0x07060a });
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.42, 1.36), tvOffMat);
  tvScreen.position.set(-3.6, 1.55, -3.855); tvG.add(tvScreen);
  const tvGlow = glowSprite(0x6a8cff, 3.6, -3.6, 1.55, -3.4, null, 0);
  tagged(tvG, "tv");
  const tvChanCanvas = document.createElement("canvas"); tvChanCanvas.width = 256; tvChanCanvas.height = 144;
  const tvChanTex = new THREE.CanvasTexture(tvChanCanvas); tvChanTex.colorSpace = THREE.SRGBColorSpace;
  const tvChanMat = new THREE.MeshBasicMaterial({ map: tvChanTex });
  let tvVideoTex = null, tvVideoMat = null;
  const tvState = { on: false, video: null };
  function drawChannel(t) {
    const g = tvChanCanvas.getContext("2d"), w = 256, h = 144;
    const grd = g.createLinearGradient(0, 0, w, h);
    const k = (Math.sin(t * 0.4) + 1) / 2;
    grd.addColorStop(0, `rgb(${40 + k * 60},10,${70 + k * 40})`); grd.addColorStop(1, `rgb(10,${8 + k * 10},${30 + (1 - k) * 40})`);
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      g.fillStyle = `rgba(255,${80 + i * 30},${160 - i * 20},0.18)`;
      g.beginPath(); g.arc((t * 30 + i * 70) % (w + 60) - 30, 72 + Math.sin(t * 1.3 + i) * 34, 22 + i * 4, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = "#f2eef5"; g.font = "700 18px Georgia, serif"; g.textAlign = "center";
    g.fillText("MIDNIGHT  CHANNEL", w / 2, 80);
    g.font = "11px sans-serif"; g.fillStyle = "#d4af37"; g.fillText("pick a video from your phone on the TV screen", w / 2, 100);
    g.fillStyle = "rgba(0,0,0,0.18)"; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1);
    tvChanTex.needsUpdate = true;
  }

  // speakers (stereo)
  const stereo = new THREE.Group(); scene.add(stereo);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0x2a1036 });
  const cones = [];
  const stereoGlows = [];
  for (const x of [-5.35, -1.85]) {
    box(0.56, 1.15, 0.48, mat.blackGloss, x, 0.575, -3.62, stereo);
    box(0.58, 0.03, 0.5, mat.gold, x, 1.16, -3.62, stereo);
    for (const [y, r] of [[0.85, 0.15], [0.42, 0.2]]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.55, r, 20), coneMat);
      ring.position.set(x, y, -3.375); stereo.add(ring); cones.push(ring);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(r * 0.45, 16), mat.glassDark); dot.position.set(x, y, -3.374); stereo.add(dot);
    }
    stereoGlows.push(glowSprite(0xff2a8a, 1.8, x, 0.75, -3.2, null, 0));
  }
  tagged(stereo, "stereo");
  const stereoState = { on: false, level: 0 };

  // coffee table + photo album
  const ct = new THREE.Group(); scene.add(ct);
  box(1.5, 0.08, 0.75, mat.blackGloss, -3.5, 0.44, -1.55, ct);
  for (const [x, z] of [[-4.15, -1.85], [-2.85, -1.85], [-4.15, -1.25], [-2.85, -1.25]]) cyl(0.04, 0.03, 0.42, mat.gold, x, 0.21, z, 6, ct);
  const candle = cyl(0.05, 0.05, 0.16, mat.porcelain, -2.95, 0.56, -1.7, 8, ct);
  const flame = glowSprite(0xffb050, 0.32, -2.95, 0.68, -1.7, null, 0.85);
  tagged(ct, "floor");
  const album = new THREE.Group(); scene.add(album);
  const ab = box(0.5, 0.07, 0.38, mat.velvetRed, -3.7, 0.515, -1.55, album); ab.rotation.y = 0.2;
  const abT = box(0.36, 0.005, 0.26, mat.gold, -3.7, 0.553, -1.55, album); abT.rotation.y = 0.2;
  const albumHit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.65), new THREE.MeshBasicMaterial({ visible: false }));
  albumHit.position.set(-3.7, 0.6, -1.55); album.add(albumHit);
  glowSprite(0xd4af37, 0.7, -3.7, 0.6, -1.5, null, 0.18);
  tagged(album, "album");

  // couch, angled toward the TV
  const couch = new THREE.Group(); scene.add(couch);
  box(2.7, 0.42, 0.95, mat.velvet, 0, 0.21, 0, couch);
  box(2.7, 0.18, 0.86, mat.velvet, 0, 0.5, -0.02, couch);
  box(2.7, 0.75, 0.24, mat.velvet, 0, 0.72, 0.38, couch);
  for (const s of [-1, 1]) box(0.24, 0.62, 0.95, mat.velvet, s * 1.33, 0.48, 0, couch);
  box(2.74, 0.04, 0.26, mat.gold, 0, 1.1, 0.38, couch);
  for (const x of [-0.7, 0.7]) { const c = box(0.5, 0.42, 0.14, mat.pillow, x, 0.78, 0.2, couch); c.rotation.x = -0.2; }
  couch.position.set(-2.9, 0, 0.35);
  couch.rotation.y = -0.18;
  tagged(couch, "couch");

  // gaming desk with dual monitors, glowing tower, mic
  const desk = new THREE.Group(); scene.add(desk);
  box(2.4, 0.07, 0.75, mat.black, 2.0, 0.76, -3.55, desk);
  for (const x of [0.9, 3.1]) box(0.06, 0.74, 0.7, mat.blackGloss, x, 0.37, -3.55, desk);
  const monCanvas = (kind) => canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = "#0b0812"; g.fillRect(0, 0, w, h);
    if (kind === "chat") {
      g.fillStyle = "#ff7ab8"; g.font = "700 15px monospace"; g.fillText("AIMMIANNA // MEMORY", 12, 22);
      g.fillStyle = "#3a2347"; for (let i = 0; i < 5; i++) g.fillRect(i % 2 ? 70 : 12, 36 + i * 22, 160, 15);
      g.fillStyle = "#d4af37"; g.fillRect(12, 142, 120, 6);
    } else {
      const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, "#2a0f3e"); grd.addColorStop(1, "#ff2a6a");
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(255,255,255,0.5)"; g.lineWidth = 1;
      for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(w / 2, 70); g.lineTo(i * 32, h); g.stroke(); }
      for (let y = 90; y < h; y += 14) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
      g.fillStyle = "#ffd76a"; g.beginPath(); g.arc(w / 2, 60, 26, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#fff"; g.font = "700 13px monospace"; g.fillText("1UP  0420", 12, 20);
    }
  });
  const monMats = [new THREE.MeshBasicMaterial({ map: monCanvas("chat") }), new THREE.MeshBasicMaterial({ map: monCanvas("game") })];
  [[1.45, 0.12, 0], [2.55, -0.12, 1]].forEach(([x, ry, i]) => {
    const mg = new THREE.Group(); mg.position.set(x, 1.22, -3.7); mg.rotation.y = ry; desk.add(mg);
    box(1.06, 0.66, 0.05, mat.blackGloss, 0, 0, 0, mg);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), monMats[i]); scr.position.z = 0.03; mg.add(scr);
    box(0.06, 0.38, 0.05, mat.blackGloss, 0, -0.45, -0.05, mg);
  });
  box(0.6, 0.02, 0.22, mat.blackGloss, 2.0, 0.81, -3.3, desk); // keyboard
  const kbGlow = box(0.56, 0.005, 0.18, new THREE.MeshBasicMaterial({ color: 0xff2a8a }), 2.0, 0.825, -3.3, desk);
  // mic on a boom arm
  cyl(0.06, 0.08, 0.04, mat.blackGloss, 2.95, 0.81, -3.4, 10, desk);
  cyl(0.015, 0.015, 0.4, mat.steel, 2.95, 1.0, -3.4, 6, desk);
  const micHead = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 4, 8), mat.black); micHead.position.set(2.95, 1.27, -3.4); desk.add(micHead);
  const micRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 6, 16), new THREE.MeshBasicMaterial({ color: 0xff2a3a })); micRing.rotation.x = Math.PI / 2; micRing.position.set(2.95, 1.2, -3.4); desk.add(micRing);
  // tower
  const tower = box(0.36, 0.85, 0.7, mat.blackGloss, 3.55, 0.43, -3.5, desk);
  const rgbMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
  const rgbPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.74), rgbMat); rgbPanel.rotation.y = -Math.PI / 2; rgbPanel.position.set(3.365, 0.43, -3.5);
  rgbPanel.material = new THREE.MeshBasicMaterial({ color: 0xff00aa, transparent: true, opacity: 0.55 }); desk.add(rgbPanel);
  const fanMat = new THREE.MeshBasicMaterial({ color: 0xff00aa });
  const fans = [];
  for (const y of [0.62, 0.3]) { const f = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 6, 20), fanMat); f.rotation.y = -Math.PI / 2; f.position.set(3.36, y, -3.5); desk.add(f); fans.push(f); }
  const pcGlow = glowSprite(0xff00aa, 1.6, 3.4, 0.5, -3.3, null, 0.35);
  const monGlow = glowSprite(0x8a5cff, 3.2, 2.0, 1.25, -3.4, null, 0.28);
  // gaming chair
  box(0.6, 0.1, 0.6, mat.velvetRed, 2.0, 0.5, -2.75, desk);
  box(0.6, 0.8, 0.1, mat.velvetRed, 2.0, 0.95, -2.45, desk);
  cyl(0.04, 0.04, 0.45, mat.steel, 2.0, 0.24, -2.75, 6, desk);
  tagged(desk, "pc");

  // floor lamp (living)
  const fl = new THREE.Group(); scene.add(fl);
  cyl(0.18, 0.22, 0.05, mat.gold, 0.3, 0.025, -3.55, 14, fl);
  cyl(0.025, 0.025, 1.7, mat.gold, 0.3, 0.88, -3.55, 6, fl);
  const flShade = cyl(0.18, 0.32, 0.36, new THREE.MeshBasicMaterial({ color: 0xffc27a }), 0.3, 1.86, -3.55, 16, fl);
  roomLights.living.shades.push(flShade);
  roomLights.living.glows.push(glowSprite(0xffc27a, 1.8, 0.3, 1.86, -3.4));
  tagged(fl, "lamp:living");

  /* ================= KITCHEN ================= */
  const kit = new THREE.Group(); scene.add(kit);
  box(4.4, 0.88, 0.66, mat.cab, 6.4, 0.44, -3.66, kit);
  box(4.44, 0.05, 0.7, mat.counter, 6.4, 0.905, -3.64, kit);
  box(4.44, 0.02, 0.02, mat.gold, 6.4, 0.9, -3.29, kit);
  for (let i = 0; i < 6; i++) box(0.03, 0.03, 0.02, mat.gold, 4.6 + i * 0.72, 0.75, -3.32, kit); // knobs
  box(3.0, 0.75, 0.4, mat.cab, 6.0, 2.35, -3.8, kit); // upper cabinets
  box(3.02, 0.03, 0.42, mat.gold, 6.0, 1.97, -3.79, kit);
  // backsplash tiles
  const bs = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.0), new THREE.MeshLambertMaterial({ map: checker("#2b0f18", "#140c12", 10) }));
  bs.position.set(6.4, 1.42, -3.98); kit.add(bs);
  tagged(kit, "counter");
  // fridge
  const fridge = new THREE.Group(); scene.add(fridge);
  box(0.95, 2.15, 0.78, mat.fridge, 9.35, 1.075, -3.58, fridge);
  box(0.97, 0.02, 0.8, mat.trim, 9.35, 1.42, -3.58, fridge);
  box(0.04, 0.5, 0.05, mat.gold, 8.95, 1.75, -3.17, fridge);
  box(0.04, 0.6, 0.05, mat.gold, 8.95, 0.95, -3.17, fridge);
  // magnets
  for (const [x, y, c] of [[9.5, 1.85, 0xff4fa8], [9.65, 1.6, 0xd4af37], [9.4, 1.2, 0xa040ff]]) { const mg = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), new THREE.MeshBasicMaterial({ color: c })); mg.position.set(x, y, -3.185); fridge.add(mg); }
  tagged(fridge, "fridge");
  // microwave
  const mw = new THREE.Group(); scene.add(mw);
  box(0.62, 0.36, 0.42, mat.blackGloss, 5.0, 1.11, -3.68, mw);
  const mwDoorMat = new THREE.MeshBasicMaterial({ color: 0x0b0a10 });
  const mwDoor = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.26), mwDoorMat); mwDoor.position.set(4.93, 1.11, -3.465); mw.add(mwDoor);
  const mwClock = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.04), new THREE.MeshBasicMaterial({ color: 0x40ff9a })); mwClock.position.set(5.23, 1.2, -3.465); mw.add(mwClock);
  tagged(mw, "microwave");
  // coffee maker
  const cm = new THREE.Group(); scene.add(cm);
  box(0.36, 0.5, 0.32, mat.black, 7.5, 1.18, -3.72, cm);
  box(0.36, 0.08, 0.42, mat.black, 7.5, 1.39, -3.67, cm);
  box(0.36, 0.03, 0.36, mat.steel, 7.5, 0.945, -3.6, cm);
  const pot = cyl(0.11, 0.1, 0.22, new THREE.MeshLambertMaterial({ color: 0x9aa0b0, transparent: true, opacity: 0.35 }), 7.5, 1.07, -3.55, 14, cm);
  const brew = cyl(0.095, 0.09, 0.2, new THREE.MeshLambertMaterial({ color: 0x2a1408 }), 7.5, 0.97, -3.55, 12, cm);
  brew.scale.y = 0.05; brew.position.y = 0.965;
  const cmLightMat = new THREE.MeshBasicMaterial({ color: 0x331010 });
  const cmLight = new THREE.Mesh(new THREE.CircleGeometry(0.022, 10), cmLightMat); cmLight.position.set(7.62, 1.32, -3.555); cm.add(cmLight);
  const cmHit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.7), new THREE.MeshBasicMaterial({ visible: false })); cmHit.position.set(7.5, 1.2, -3.55); cm.add(cmHit);
  const cmGlow = glowSprite(0xff5a2a, 0.8, 7.5, 1.2, -3.4, null, 0);
  // two mugs
  for (const x of [8.0, 8.2]) cyl(0.045, 0.04, 0.1, mat.velvetRed, x, 0.98, -3.5, 10, cm);
  tagged(cm, "coffee");
  // pendant lamp
  const pend = new THREE.Group(); scene.add(pend);
  cyl(0.008, 0.008, 0.75, mat.black, 6.8, 3.02, -1.2, 4, pend);
  const pShade = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.3, 16, 1, true), new THREE.MeshLambertMaterial({ color: 0x1a1420, side: THREE.DoubleSide }));
  pShade.position.set(6.8, 2.55, -1.2); pend.add(pShade);
  const pBulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffc27a })); pBulb.position.set(6.8, 2.42, -1.2); pend.add(pBulb);
  roomLights.kitchen.shades.push(pBulb);
  roomLights.kitchen.glows.push(glowSprite(0xffc27a, 1.5, 6.8, 2.4, -1.2));
  const pendHit = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), new THREE.MeshBasicMaterial({ visible: false })); pendHit.position.set(6.8, 2.6, -1.2); pend.add(pendHit);
  tagged(pend, "lamp:kitchen");
  // bistro table
  const bt = new THREE.Group(); scene.add(bt);
  cyl(0.5, 0.5, 0.04, mat.blackGloss, 6.8, 0.76, 0.2, 20, bt);
  cyl(0.04, 0.04, 0.74, mat.gold, 6.8, 0.38, 0.2, 6, bt);
  cyl(0.25, 0.28, 0.03, mat.gold, 6.8, 0.015, 0.2, 14, bt);
  for (const x of [6.05, 7.55]) { cyl(0.2, 0.2, 0.06, mat.velvetRed, x, 0.55, 0.2, 14, bt); cyl(0.03, 0.03, 0.53, mat.gold, x, 0.27, 0.2, 6, bt); }
  const rose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshLambertMaterial({ color: 0xc0392b })); rose.position.set(6.8, 0.92, 0.2); bt.add(rose);
  cyl(0.04, 0.05, 0.14, new THREE.MeshLambertMaterial({ color: 0x8890a0, transparent: true, opacity: 0.5 }), 6.8, 0.84, 0.2, 8, bt);
  tagged(bt, "floor");

  /* ================= BATHROOM ================= */
  const tub = new THREE.Group(); scene.add(tub);
  const tubBody = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe9e4ea, side: THREE.DoubleSide }));
  tubBody.scale.set(1.25, 0.58, 0.58); tubBody.position.set(12.0, 0.78, -3.25); tub.add(tubBody);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 32), mat.porcelain);
  rim.rotation.x = Math.PI / 2; rim.scale.set(1.25, 0.58, 1); rim.position.set(12.0, 0.78, -3.25); tub.add(rim);
  const outer = new THREE.Mesh(new THREE.SphereGeometry(1.02, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x2a0f2e }));
  outer.scale.set(1.25, 0.6, 0.6); outer.position.set(12.0, 0.78, -3.25); tub.add(outer);
  for (const [x, z] of [[11.1, -3.0], [12.9, -3.0], [11.1, -3.5], [12.9, -3.5]]) { const ft = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat.gold); ft.position.set(x, 0.12, z); ft.scale.y = 1.6; tub.add(ft); }
  const waterMat = new THREE.MeshLambertMaterial({ color: 0x5aa0d0, transparent: true, opacity: 0.55, emissive: 0x0a2a40 });
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 28), waterMat);
  water.rotation.x = -Math.PI / 2; water.scale.set(1.17, 0.52, 1); water.position.set(12.0, 0.6, -3.25); tub.add(water);
  // faucet
  cyl(0.03, 0.03, 0.5, mat.gold, 13.15, 1.0, -3.4, 6, tub);
  const spout = cyl(0.025, 0.025, 0.25, mat.gold, 13.05, 1.25, -3.4, 6, tub); spout.rotation.z = Math.PI / 2;
  // bubbles (one instanced mesh)
  const bubbleGeo = new THREE.SphereGeometry(1, 10, 8);
  const bubbleMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x332a3a, transparent: true, opacity: 0.92 });
  const BUBBLES = 34;
  const bubbles = new THREE.InstancedMesh(bubbleGeo, bubbleMat, BUBBLES);
  const bubbleSeeds = [];
  for (let i = 0; i < BUBBLES; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.92;
    bubbleSeeds.push({ x: 12.0 + Math.cos(a) * r * 1.12, z: -3.25 + Math.sin(a) * r * 0.46, s: 0.07 + Math.random() * 0.1, p: Math.random() * 6 });
  }
  bubbles.visible = false; tub.add(bubbles);
  const tubHit = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.0, 1.3), new THREE.MeshBasicMaterial({ visible: false })); tubHit.position.set(12, 0.5, -3.25); tub.add(tubHit);
  tagged(tub, "bathtub");
  // steam sprites (shared by tub and coffee)
  const steamTex = GLOW;
  function makeSteam(n, x, y, z, spread, size) {
    const arr = [];
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: 0xe8e0f0, transparent: true, opacity: 0, depthWrite: false }));
      s.userData = { x: x + (Math.random() - 0.5) * spread, y, z: z + (Math.random() - 0.5) * spread * 0.3, p: i / n, size };
      s.scale.set(size, size, 1); s.position.set(x, y, z); scene.add(s); arr.push(s);
    }
    return arr;
  }
  const tubSteam = makeSteam(7, 12.0, 0.8, -3.25, 1.8, 0.9);
  const coffeeSteam = makeSteam(4, 7.5, 1.2, -3.55, 0.12, 0.35);
  const bathState = { on: false };
  const brewState = { until: 0, start: 0, level: 0.05 };
  // sink + glowing mirror
  const sink = new THREE.Group(); scene.add(sink);
  cyl(0.12, 0.16, 0.8, mat.porcelain, 14.15, 0.4, -3.65, 12, sink);
  const basin = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xe9e4ea, side: THREE.DoubleSide }));
  basin.scale.set(1, 0.5, 0.8); basin.position.set(14.15, 0.92, -3.65); sink.add(basin);
  cyl(0.02, 0.02, 0.2, mat.gold, 14.15, 1.02, -3.88, 6, sink);
  const sinkMirrorMat = new THREE.MeshBasicMaterial({ map: canvasTex(128, 160, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, "#3d3456"); grd.addColorStop(1, "#141020");
    g.fillStyle = grd; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,0.12)"; g.beginPath(); g.moveTo(16, 150); g.lineTo(60, 10); g.lineTo(80, 10); g.lineTo(36, 150); g.fill();
  }) });
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.95), sinkMirrorMat); sm.position.set(14.15, 1.75, -3.96); sink.add(sm);
  const smFrameMat = new THREE.MeshBasicMaterial({ color: 0xb04bff });
  for (const [w, h, x, y] of [[0.85, 0.05, 0, 0.5], [0.85, 0.05, 0, -0.5], [0.05, 1.05, -0.42, 0], [0.05, 1.05, 0.42, 0]]) box(w, h, 0.03, smFrameMat, 14.15 + x, 1.75 + y, -3.94, sink);
  const sinkGlow = glowSprite(0xb04bff, 2.2, 14.15, 1.75, -3.75, null, 0.35);
  tagged(sink, "sink");
  // sconce (bath lamp)
  const sc = new THREE.Group(); scene.add(sc);
  box(0.12, 0.25, 0.06, mat.gold, 13.35, 2.05, -3.96, sc);
  const scBulb = cyl(0.07, 0.09, 0.22, new THREE.MeshBasicMaterial({ color: 0xa040ff }), 13.35, 2.2, -3.86, 10, sc);
  roomLights.bathroom.shades.push(scBulb);
  roomLights.bathroom.glows.push(glowSprite(0xa040ff, 1.3, 13.35, 2.2, -3.75));
  const scHit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.5), new THREE.MeshBasicMaterial({ visible: false })); scHit.position.set(13.35, 2.15, -3.8); sc.add(scHit);
  tagged(sc, "lamp:bathroom");
  // candles + plant
  for (const [x, z] of [[10.6, -3.7], [10.8, -3.75]]) { cyl(0.04, 0.04, 0.18, mat.porcelain, x, 0.09, z, 8); glowSprite(0xffb050, 0.28, x, 0.22, z, null, 0.8); }
  const towel = box(0.5, 0.7, 0.04, mat.velvetRed, 10.6, 1.3, -3.96);

  /* ------------ lamp application */
  function applyLamp(id) {
    const r = roomLights[id], mode = LAMP_MODES[r.mode];
    const c = new THREE.Color(mode.color);
    // Candles are real light: each lit candle warms the ritual room, and
    // with the lamp off they light it on their own (2.4.8).
    const boost = id === "ritual" ? candleBoost : 0;
    r.light.color.set(mode.i ? mode.color : (boost > 0 ? 0xffb13a : 0xffffff));
    r.light.intensity = (mode.i ? r.base : 0) + boost;
    r.shades.forEach((s) => { s.material.color.copy(mode.i ? c : new THREE.Color(0x221a26)); });
    r.glows.forEach((g) => { g.material.color.copy(c); g.material.opacity = mode.i ? 0.55 : 0; });
  }
  ROOM_ORDER.forEach(applyLamp);
  function applyLED() {
    const col = LED_COLORS[ledState.mode];
    ledMat.color.set(ledState.mode === "off" ? 0x150f18 : col);
    ledGlows.forEach((g) => { g.material.color.set(col); g.material.opacity = ledState.mode === "off" ? 0 : 0.28; });
  }
  applyLED();

  /* ------------ avatar */
  const avatar = (opts.avatarFactory ? opts.avatarFactory(THREE, { shadowTexture: SHADOW }) : new BuiltInAvatar(SHADOW));
  scene.add(avatar.object3d);
  avatar.pickMesh.userData.tap = "her";
  const her = {
    pos: new THREE.Vector3(SPOTS.living_center.x, 0, SPOTS.living_center.z),
    path: [], speed: 1.55, spot: "living_center", pose: null, activity: "vibe",
    talking: false, room: "living", moveDir: 0, heading: 0, arriveCb: null, mode: "idle"
  };
  // 2.4.6 pose override: a temporary pose (from the Poses menu, chat, or a
  // routine) that wins over the spot pose / activity until it expires.
  let poseOverride = null, poseOverrideUntil = 0;
  function setPose(name, ms) {
    if (!name) { poseOverride = null; poseOverrideUntil = 0; return; }
    poseOverride = name; poseOverrideUntil = Date.now() + (ms || 9000);
    // 2.4.13: the warm poses are shared — when Aimmianna hugs or hearts,
    // Autumn does it with her, so she feels present, not parked.
    // 2.4.14: Summer joins the warm poses too.
    // 2.4.15: Tony joins them as well, in his shared slot.
    if (name === "hug") { guestEmote("hug"); summerEmote("hug"); tonyEmote("hug"); }
    else if (name === "heart") { guestEmote("heart_pose"); summerEmote("heart_pose"); tonyEmote("heart_pose"); }
  }
  avatar.object3d.position.copy(her.pos);

  /* ------------ Autumn — the first guest avatar (2.4.13) -------------
     She lives in the SHARED apartment only — never in Tony's private
     Game Mode (guests are blocked from it; see app.js). Same loading
     pattern as Tony's Tripo GLB in life-figures.js: background load,
     auto-fit, idle + walk + hug + heart_pose clips from her own file.
     Her file ships as 5 chunks (.part0..4) through the Contents API —
     the chunked loader glues them back together before parsing, so the
     single 72 MB file is never uploaded.
     SCALE RULE (2.4.17 balance — the old equal-scale rule is gone):
     the four figures now stand at distinct natural heights — Tony 1.92,
     Autumn 1.86, Aimmianna 1.81, Summer 1.78 (Summer 5'5" is the anchor).
     Autumn is 5'8" here — Tony's call, swapped with Aimmianna's number.
     Her figure was slimmed to her real build (5'6", 115 lbs, petite) as a morph target baked into the
     GLB; her face and hair are untouched. Her private collection and
     private memories are NOT wired anywhere here — this is a 3D figure
     only, and nothing about her private side goes to the shared world. */
  const GUEST_HEIGHT = 1.86; // 2.4.17: Autumn 5'8" (1.86) — was 1.7
  const GUEST_MODEL = "Autumn_Tripo3d_0_ggkz.glb";
  const GUEST_VERSION = "2424"; // 2.4.24: Draco-compressed (44,463,092 bytes, was 72,332,108) — bump ONLY when her file actually changes
  const GUEST_PARTS = 5; // chunked upload: .part0..4, 8,892,619 bytes each (last 8,892,616) — Draco file is 44,463,092 bytes
  // Summer (2.4.14) — 1.78 units, the 5'5" anchor of the 2.4.17 balance.
  // She is now 0.03 shorter than Aimmianna (1.81), not level with her.
  const SUMMER_HEIGHT = 1.78;
  const SUMMER_MODEL = "Summer_0_cy1n.glb";
  const SUMMER_VERSION = "2424"; // 2.4.24: Draco-compressed (46,062,796 bytes, was 71,976,144) — bump ONLY when her file actually changes
  const SUMMER_PARTS = 5; // chunked upload: .part0..4, 9,212,560 bytes each (last 9,212,556) — Draco file is 46,062,796 bytes
  /* Chunked GLB loader (2.4.14 patch) — the git push to github.com is
     blocked, so big models ship as ~16 MB pieces through the Contents
     API instead of one file. Fetch the parts in order, glue the bytes
     back together, and parse the reassembled buffer exactly as if it
     were the single file. A failed part throws, and the caller's
     try/catch leaves the shared apartment open with the guest simply
     absent — the same graceful failure as a missing file.
     2.4.22: every chunk URL carries the model's own ?v= query, so the
     service worker's persistent models cache keys by full URL — a new
     app version re-downloads ONLY the models whose file actually
     changed, the rest stay warm. The part buffers are dropped as soon
     as the combined buffer is built, so the phone never holds two
     copies of a 72 MB model at once. */
  async function loadChunkedGlb(loader, modelFile, partCount, version) {
    const base = new URL(`./assets/models/${modelFile}`, import.meta.url).href;
    const buffers = [];
    let total = 0;
    for (let i = 0; i < partCount; i++) {
      const res = await fetch(`${base}.part${i}?v=${version || "1"}`);
      if (!res.ok) throw new Error(`Guest model part ${i} of ${modelFile} failed: HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      buffers.push(buf);
      total += buf.byteLength;
    }
    const combined = new Uint8Array(total);
    let offset = 0;
    for (const buf of buffers) { combined.set(new Uint8Array(buf), offset); offset += buf.byteLength; }
    buffers.length = 0; // 2.4.22: drop the parts — the combined buffer is the only copy now
    return new Promise((resolve, reject) => loader.parse(combined.buffer, base, resolve, reject));
  }
  // 2.4.16: Summer's relaxed idle arms. Her GLB has no idle clip, so with
  // no clip playing she renders in her T-pose bind pose — arms outstretched.
  // These local-space rotations hang her arms at her sides: upper arms down
  // with a slight outward splay, forearms down with a slight forward elbow
  // bend. They were computed from her actual skeleton (bind-pose joint
  // directions, verified by simulation — see BUILD_NOTE_2.4.15.md): the
  // simulation lands both hands beside her thighs, just outside them, never
  // through the torso and never behind her back. The rotations themselves
  // are unchanged in 2.4.16; only HOW they are applied changed, because
  // 2.4.15 multiplied them onto the bones every frame and they compounded
  // into a spin. See applyIdleArms below for the fixed application.
  const SUMMER_IDLE_ARMS = {
    L_Upperarm: [{ axis: [-1, 0, 0], angle: 1.6164 }],
    R_Upperarm: [{ axis: [1, 0, 0], angle: 1.6635 }],
    L_Forearm: [{ axis: [-0.153, 0.908, -0.391], angle: 0.3416 }],
    R_Forearm: [{ axis: [-0.403, -0.875, -0.267], angle: 0.3282 }],
  };
  class GuestAvatar {
    constructor(modelFile, partCount, height, groupName, tapTag, relaxedIdle = false, version = "1") {
      this.modelFile = modelFile;
      this.partCount = partCount;
      this.version = version; // 2.4.22: per-model ?v= query for the chunk URLs
      this.height = height;
      this.group = new THREE.Group();
      this.group.name = groupName;
      this.tapTag = tapTag;
      this.group.visible = false; // shown once the model lands
      this.model = null; this.mixer = null; this.actions = null;
      this.motion = null; this.modelFailed = false;
      // 2.4.22: while Apartment Life runs, the shared Tony steps out of
      // sight (see setLifeFigures) — this flag stops his load() from
      // showing him again if he lands mid-Life.
      this.suppressVisible = false;
      // 2.4.15: relaxed-idle arms (Summer only — her file has no idle clip).
      this.relaxedIdle = relaxedIdle;
      this.idleArmBones = {};
      this._idleArmWeight = 0;
      this._idleArmQ = new THREE.Quaternion();
      this._idleArmAxis = new THREE.Vector3();
      // 2.4.16: bind-pose snapshot for the idle arms, and the action
      // currently fading out after a clip stops (see applyIdleArms).
      this._idleArmBind = {};
      this._fadingAction = null;
    }
    async load() {
      try {
        const { GLTFLoader } = await import("./vendor/loaders/GLTFLoader.js");
        // 2.4.24: guest models are Draco-compressed — decoder in vendor/draco/.
        const { DRACOLoader } = await import("./vendor/loaders/DRACOLoader.js");
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath("./vendor/draco/");
        const loader = new GLTFLoader();
        loader.setDRACOLoader(dracoLoader);
        const gltf = await loadChunkedGlb(loader, this.modelFile, this.partCount, this.version);
        const { scene: model, animations } = gltf;
        this.mixer = new THREE.AnimationMixer(model);
        this.actions = Object.fromEntries(animations.map((clip) => [clip.name, this.mixer.clipAction(clip)]));
        // The slim_petite morph target is baked with weight 1; pin it on
        // explicitly so the petite fit can never silently drop off.
        // 2.4.18: pin EVERY morph target, not just [0] — the guests now
        // carry slim_petite AND head_match (Tony carries head_match alone),
        // and pinning [0] only would silently drop head_match.
        model.traverse((mesh) => { if (mesh.isSkinnedMesh && mesh.morphTargetInfluences?.length) for (let i = 0; i < mesh.morphTargetInfluences.length; i++) mesh.morphTargetInfluences[i] = 1; });
        const bounds = new THREE.Box3().setFromObject(model);
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = this.height / (bounds.max.y - bounds.min.y);
        if (bounds.isEmpty() || !Number.isFinite(scale) || scale <= 0) throw new Error("Invalid guest avatar bounds");
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
        const facing = new THREE.Group();
        facing.add(model);
        this.group.add(facing);
        model.traverse((mesh) => {
          if (!mesh.isMesh) return;
          const material = mesh.material;
          material.metalness = 0;
          material.metalnessMap?.dispose(); material.metalnessMap = null;
          material.roughnessMap = null; material.roughness = 0.88;
          material.emissiveMap = material.map;
          material.emissive.set(0xffffff);
          material.emissiveIntensity = 0.52;
          if (mesh.isSkinnedMesh) { mesh.computeBoundingSphere(); mesh.boundingSphere.radius *= 1.35; mesh.boundingBox = null; }
        });
        tagged(this.group, this.tapTag);
        this.model = model;
        // 2.4.15: resolve the relaxed-idle arm bones (Summer only).
        if (this.relaxedIdle) for (const name of Object.keys(SUMMER_IDLE_ARMS)) { const b = model.getObjectByName(name); if (b) this.idleArmBones[name] = b; }
        // 2.4.16: snapshot the bind-pose quaternions BEFORE any clip
        // plays and before the idle layer runs, so the layer can always
        // set the arms from a known base instead of accumulating.
        if (this.relaxedIdle) for (const name of Object.keys(this.idleArmBones)) this._idleArmBind[name] = this.idleArmBones[name].quaternion.clone();
        this.group.visible = !this.suppressVisible; // 2.4.22: stay hidden if Life is running
        this.playMotion("idle");
        this.mixer.update(0);
      } catch (error) {
        this.modelFailed = true;
        console.warn(this.group.name + " avatar unavailable; the shared apartment still opens.", error);
      }
    }
    playMotion(name) {
      // 2.4.20: riding a board means standing on it, not striding — a
      // walk clip under a skater reads wrong, so "walk" becomes "idle"
      // while this figure is skating. Set by skateStart/skateStop.
      if (this.skating && name === "walk") name = "idle";
      if (!this.actions || this.motion === name) return false;
      const next = this.actions[name];
      const previous = this.actions[this.motion];
      if (!next) {
        // No such clip in this file (Summer has no idle clip): stop the
        // old one and rest in a procedural idle instead of freezing
        // mid-walk with the walk clip still playing.
        if (previous) previous.fadeOut(0.22);
        this._fadingAction = previous || null;
        this.motion = name;
        return true;
      }
      // 2.4.16: put the idle-arm bones back to their bind pose BEFORE
      // the clip activates. The mixer saves the bones current values as
      // its restore point when a clip first plays, so this keeps that
      // restore point the true bind pose, never a pose the idle layer
      // has rotated.
      if (this.relaxedIdle) for (const name of Object.keys(this._idleArmBind)) { const b = this.idleArmBones[name]; if (b) b.quaternion.copy(this._idleArmBind[name]); }
      this._fadingAction = null;
      next.reset().setEffectiveWeight(1).play();
      if (previous) next.crossFadeFrom(previous, 0.22, false);
      this.motion = name;
      return true;
    }
    update(dt) {
      if (this.mixer) this.mixer.update(dt);
      this.applyIdleArms(dt);
    }
    // 2.4.16: Summer's relaxed idle arms, fixed. 2.4.15 applied the
    // rotations with bone.quaternion.multiply every frame, the same
    // pattern as Aimmianna's POSE_BONES layer. That works for her
    // because she always has a clip playing, so the mixer rewrites
    // her bones from the clip each frame and the multiply lands on a
    // fresh pose. Summer has no idle clip, so with no clip playing
    // the mixer touches nothing and the multiply compounded every
    // frame, spinning her arms around, which read on the phone as
    // flapping. The fix: while a clip is active or fading out the
    // mixer still rewrites the bones each frame, so multiplying onto
    // its fresh output stays correct and blends the clip into the
    // hang. Once the clip is fully gone the mixer stops touching the
    // bones, so the layer instead SETS each bone from its stored
    // bind pose every frame. The two modes meet at the same value
    // when the fade ends, so there is no snap either way.
    applyIdleArms(dt) {
      if (!this.relaxedIdle || !this.model) return;
      const want = this.motion === "idle" ? 1 : 0;
      this._idleArmWeight += (want - this._idleArmWeight) * Math.min(1, dt * 6);
      // Snap the weight to its ends once it is close: the easing is
      // asymptotic, so without this the arms would keep creeping a
      // couple of centimetres for seconds after they look settled.
      // Snapping makes the hang exactly still in steady idle.
      if (Math.abs(1 - this._idleArmWeight) < 0.005) this._idleArmWeight = 1;
      else if (this._idleArmWeight < 0.005) this._idleArmWeight = 0;
      const w = this._idleArmWeight;
      if (w < 0.02) return;
      const fading = this._fadingAction && this._fadingAction.getEffectiveWeight() > 0.02;
      if (!fading) this._fadingAction = null;
      const clipDriving = this.motion !== "idle" || fading;
      for (const [name, turns] of Object.entries(SUMMER_IDLE_ARMS)) {
        const bone = this.idleArmBones[name];
        if (!bone) continue;
        if (!clipDriving) bone.quaternion.copy(this._idleArmBind[name]);
        for (const turn of turns) {
          this._idleArmAxis.set(turn.axis[0], turn.axis[1], turn.axis[2]).normalize();
          this._idleArmQ.setFromAxisAngle(this._idleArmAxis, turn.angle * w);
          bone.quaternion.multiply(this._idleArmQ);
        }
      }
    }
  }

  /* ------------ Who is logged in here (2.4.22 — Tony's rule) --------
     "Not load until they are controling them" / "If they arent logged
     in dont load them." Aimmianna always loads — she lives here. A
     guest's avatar exists ONLY when that guest is the one logged in on
     THIS device: Tony's when the device role is Tony, Summer's when
     the logged-in guest is Summer, Autumn's when it's Autumn. Anyone
     not logged in here is never constructed — no model fetch, no parse,
     no figure in the scene — and the lazy arrival below only ever
     loads whoever IS supposed to be here. The app passes a live
     reader; setLoggedIn() (exposed on the world API) rebuilds the
     guest set when the login changes mid-session. */
  const whoIsLoggedIn = opts.whoIsLoggedIn || (() => null);
  let loggedIn = whoIsLoggedIn();

  /* ------------ live together (2.4.23) — remote guests + remote her ----
     A guest who is online on ANOTHER phone is drawn here from the
     network: their phone sends where they are a few times a second,
     and this phone glides them there with the same followStep() as a
     local walk. A guest's avatar exists here when they are the one
     logged in on THIS device (2.4.22) OR when they are present in the
     live session — setLoggedIn() below keeps remote avatars alive.
     Aimmianna, when this phone is not hosting her, is driven the same
     way from the host phone's her-pos stream, and her local movement
     (paths, routines, the Moon Cart) pauses while the host drives her.
     Room jumps (> 8 units at once) never glide through walls: the
     figure fades out, is placed, and fades back in. */
  const remoteTargets = { autumn: null, summer: null, tony: null };
  const remotePrev = { autumn: null, summer: null, tony: null };
  const remotePresent = { autumn: false, summer: false, tony: false };
  const remotePlaced = { autumn: false, summer: false, tony: false };
  let herRemote = null; // {x, z, hd, mv, pose, room, at} from the host, or null
  let herRemotePrev = null;

  // One fade state per figure: k 1 = fully visible, 0 = invisible.
  // Materials are collected lazily from the loaded model and only
  // flipped transparent while a fade is actually running, so normal
  // rendering stays exactly as before.
  function fadeState(g) { return g.fade || (g.fade = { k: 1, dir: 0, mats: null, after: null }); }
  function collectFadeMats(root) {
    const set = new Set();
    root.traverse((o) => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m) set.add(m); }); } });
    return [...set];
  }
  function stepFade(root, g, dt) {
    const f = fadeState(g);
    if (!f.dir) return;
    f.k = Math.min(1, Math.max(0, f.k + f.dir * dt / 0.35));
    if (!f.mats || !f.mats.length) f.mats = collectFadeMats(root);
    for (const m of f.mats) { m.transparent = f.k < 1; m.opacity = f.k; }
    if ((f.dir < 0 && f.k <= 0) || (f.dir > 0 && f.k >= 1)) {
      f.dir = 0;
      if (f.k >= 1 && f.mats) for (const m of f.mats) { m.transparent = false; m.opacity = 1; }
      const after = f.after; f.after = null;
      if (after) after();
    }
  }
  function startFadeOut(g, after) {
    const f = fadeState(g);
    f.after = after || null;
    if (f.k <= 0) { f.dir = 0; const a = f.after; f.after = null; if (a) a(); return; }
    f.dir = -1;
  }
  function startFadeIn(g) { const f = fadeState(g); if (f.k >= 1) { f.dir = 0; return; } f.dir = 1; }
  function guestStateFor(who) { return who === "autumn" ? guest : who === "summer" ? summer : tony; }

  // Drive one remote guest one frame: glide toward the network target
  // with the 0.1 s velocity look-ahead, exactly like a local walk.
  // Frozen mid-fade (the fade owns the figure then).
  function stepRemoteGuest(who, g, dt) {
    const t = remoteTargets[who];
    const f = fadeState(g);
    if (!t || f.dir !== 0 || f.k < 1) { g.moving = false; return; }
    if (!remotePlaced[who]) {
      // First sight of them: appear where they are (the fade-in covers it).
      g.pos.x = t.x; g.pos.z = t.z; g.heading = t.hd || 0;
      remotePlaced[who] = true; g.moving = false; g.remotePose = t.pose; g.remoteSkating = t.pose === "skate";
      return;
    }
    const look = remoteLookahead(remotePrev[who], t);
    const step = followStep(g.pos.x, g.pos.z, look.x, look.z, dt, her.speed);
    if (step.snapped) { g.pos.x = step.x; g.pos.z = step.z; g.moving = false; }
    else {
      if (step.moving) g.heading = Math.atan2(look.x - g.pos.x, look.z - g.pos.z);
      g.pos.x = step.x; g.pos.z = step.z; g.moving = step.moving;
    }
    g.remotePose = t.pose; g.remoteSkating = t.pose === "skate";
  }
  // The walk/idle clip for a figure: standing on a board is a stance,
  // not a stride — "skate" plays the idle clip while gliding.
  function guestMotionName(g) { return g.remoteSkating ? "idle" : (g.moving ? "walk" : "idle"); }

  // A new network sample for a remote guest. A jump over 8 units is a
  // room change, not a walk: fade out, place, fade in.
  function setRemoteTarget(who, s) {
    if (!remoteTargets.hasOwnProperty(who) || who === loggedIn) return;
    const g = guestStateFor(who);
    remotePrev[who] = remoteTargets[who];
    remoteTargets[who] = { x: s.x, z: s.z, hd: s.hd || 0, mv: s.mv ? 1 : 0, pose: s.pose || "idle", room: s.room || "living", at: s.at || Date.now() };
    const av = liveGuestAvatar(who);
    if (!av || !av.model || !remotePlaced[who]) return; // not here yet: placed on arrival
    const d = Math.hypot(s.x - g.pos.x, s.z - g.pos.z);
    if (d > 8) {
      startFadeOut(g, () => { g.pos.x = s.x; g.pos.z = s.z; g.heading = s.hd || 0; remotePrev[who] = null; startFadeIn(g); });
    }
  }

  function tearDownRemoteGuest(who) {
    // Guard: a quick rejoin (setRemotePresent true) before this deferred
    // teardown runs must not free the avatar that just came back.
    if (remotePresent[who]) return;
    const av = liveGuestAvatar(who);
    if (!av) return;
    const g = guestStateFor(who);
    const f = fadeState(g); f.mats = null; f.k = 1; f.dir = 0; f.after = null;
    disposeGuestAvatar(av);
    if (who === "autumn") guestAvatar = null;
    else if (who === "summer") summerAvatar = null;
    else tonyAvatar = null;
  }

  // Someone joined / left the live session on another phone. Joining
  // builds their avatar (one at a time, same lazy queue as a login);
  // leaving fades them out and frees the model.
  function setRemotePresent(who, on) {
    if (!remoteTargets.hasOwnProperty(who) || who === loggedIn) return;
    remotePresent[who] = !!on;
    const g = guestStateFor(who);
    if (on) {
      // 2.4.24 Light mode: presence is still recorded above, but no
      // avatar is built — their position just isn't drawn. Turning
      // Light mode off rebuilds them (see setLightMode).
      if (lightMode) return;
      const av = liveGuestAvatar(who);
      if (!av) {
        if (who === "autumn") guestAvatar = makeAutumnAvatar();
        else if (who === "summer") summerAvatar = makeSummerAvatar();
        else tonyAvatar = makeTonyAvatar();
        const f = fadeState(g); f.k = 0; f.dir = 0; f.mats = null; // arrive faded in
        remotePlaced[who] = false;
        loadGuestsSequentially();
      } else if (av.model) {
        startFadeIn(g);
      }
    } else {
      remoteTargets[who] = null; remotePrev[who] = null; remotePlaced[who] = false;
      const av = liveGuestAvatar(who);
      if (!av) return;
      // The fade-out finishes inside the world's tick, and the rest of
      // that tick still uses the avatar — so the teardown itself waits
      // for a microtask (just after the tick returns), instead of
      // nulling the avatar mid-frame and crashing the block below.
      if (av.model) startFadeOut(g, () => queueMicrotask(() => tearDownRemoteGuest(who)));
      else tearDownRemoteGuest(who); // built but never landed: drop the build
    }
  }

  // Aimmianna's remote position, from the host phone. null = this phone
  // drives her locally again (we are the host, or live is off).
  function setLiveHer(s) {
    if (!s) {
      if (herRemote) { herRemote = null; herRemotePrev = null; }
      return;
    }
    const first = !herRemote;
    if (first) {
      // Local movement stops now — her path, and any arrival waiting on it.
      her.path = [];
      if (her.arriveCb) { const cb = her.arriveCb; her.arriveCb = null; cb(false); }
      try { if (cart.driving) builderDrive("out"); } catch (e) {}
    }
    herRemotePrev = herRemote;
    herRemote = { x: s.x, z: s.z, hd: s.hd || 0, mv: s.mv ? 1 : 0, pose: s.pose || "idle", room: s.room || "living", at: s.at || Date.now() };
    if (!first && herRemotePrev) {
      const d = Math.hypot(s.x - her.pos.x, s.z - her.pos.z);
      if (d > 8) {
        startFadeOut(her, () => { her.pos.x = s.x; her.pos.z = s.z; her.heading = s.hd || 0; herRemotePrev = null; startFadeIn(her); });
      }
    }
  }

  // Aura discs (2.4.19): a soft glow under each figure's feet — same
  // style for everyone (CircleGeometry 0.5, additive, opacity 0.22,
  // 0.02 above the floor, always on, a child of the figure's group so
  // it follows them). Summer's follows her outfit pick's accent (see
  // applySummerWardrobe); the others use a fixed signature colour.
  // The discs are made once here, before any guest avatar, so the
  // factories below can attach them.
  function makeAuraDisc(color) {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.02;
    return disc;
  }
  const aimmiannaAura = makeAuraDisc(0x8a0f2e); // her deep crimson
  avatar.object3d.add(aimmiannaAura);
  const autumnAura = makeAuraDisc(0x8a4fbf); // lilac purple
  const summerAura = makeAuraDisc(0x8a0f2e); // follows her outfit accent
  const tonyAura = makeAuraDisc(0xbf3a1e); // ember red

  function makeAutumnAvatar() {
    const a = new GuestAvatar(GUEST_MODEL, GUEST_PARTS, GUEST_HEIGHT, "Autumn3D", "guest", false, GUEST_VERSION);
    scene.add(a.group);
    a.group.position.copy(guest.pos);
    a.group.add(autumnAura);
    return a;
  }
  function makeSummerAvatar() {
    const a = new GuestAvatar(SUMMER_MODEL, SUMMER_PARTS, SUMMER_HEIGHT, "Summer3D", "guestSummer", true, SUMMER_VERSION);
    scene.add(a.group);
    a.group.position.copy(summer.pos);
    a.group.add(summerAura);
    return a;
  }
  function makeTonyAvatar() {
    const a = new GuestAvatar(TONY_MODEL, TONY_PARTS, TONY_HEIGHT, "Tony3D", "guestTony", false, TONY_VERSION);
    scene.add(a.group);
    a.group.position.copy(tony.pos);
    a.group.add(tonyAura);
    return a;
  }
  // Tear a guest down when they are no longer the one logged in here:
  // off the scene, GPU buffers freed, so the phone gets the memory
  // back. The aura disc is NOT disposed — it re-attaches to the next
  // build of that guest.
  function disposeGuestAvatar(av) {
    if (!av) return;
    if (av.mixer) av.mixer.stopAllAction();
    if (av.model) av.model.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry?.dispose();
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => m?.dispose?.());
    });
    av.group.removeFromParent();
  }

  // Autumn's presence in the shared apartment: she stands beside
  // Aimmianna and walks with her when the floor is tapped — never static.
  const guest = {
    pos: new THREE.Vector3(SPOTS.living_center.x + 0.65, 0, SPOTS.living_center.z + 0.35),
    heading: 0, moving: false, emoteLeft: 0, heartPending: false,
    path: [], arriveCb: null, // 2.4.22: her own walk path — she no longer follows Aimmianna
  };
  const guestTmp = new THREE.Vector3();
  // 2.4.22: only built when Autumn is the one logged in here.
  let guestAvatar = loggedIn === "autumn" ? makeAutumnAvatar() : null;
  // 2.4.22: NO load() here — guests arrive one at a time after the room
  // opens (see loadGuestsSequentially, after Tony's section).
  function guestEmote(name) {
    if (!guestAvatar || !guestAvatar.actions) return false;
    if (!guestAvatar.playMotion(name)) return false;
    guest.emoteLeft = guestAvatar.actions[name].getClip().duration;
    guest.heartPending = name === "hug"; // a hug ends with heart hands
    return true;
  }

  /* ------------ Summer — the second guest avatar (2.4.14) ------------
     She lives in the SHARED apartment only — never in Tony's private
     Game Mode, never in private memories or collections. Same loading
     pattern as Autumn. HEIGHT (2.4.17 balance): 1.78 units — 5'5", the
     anchor of the balance table (Tony 1.92, Autumn 1.86, Aimmianna 1.81,
     Summer 1.78). Her figure was slimmed to her real build
     (5'5", 120 lbs, petite) as a morph target baked into the GLB; her
     face and hair are untouched. Her file has NO idle clip, so her idle
     is a procedural breathing bob in the follow loop below — never
     frozen. She waves hello with greet_04 when tapped. */
  const summer = {
    pos: new THREE.Vector3(SPOTS.living_center.x - 0.65, 0, SPOTS.living_center.z + 0.35),
    heading: 0, moving: false, emoteLeft: 0, heartPending: false,
    path: [], arriveCb: null, // 2.4.22: her own walk path — she no longer follows Aimmianna
  };
  const summerTmp = new THREE.Vector3();
  // 2.4.22: only built when Summer is the one logged in here.
  let summerAvatar = loggedIn === "summer" ? makeSummerAvatar() : null;
  // 2.4.22: NO load() here — guests arrive one at a time after the room
  // opens (see loadGuestsSequentially, after Tony's section).
  function summerEmote(name) {
    if (!summerAvatar || !summerAvatar.actions) return false;
    if (!summerAvatar.playMotion(name)) return false;
    summer.emoteLeft = summerAvatar.actions[name].getClip().duration;
    summer.heartPending = name === "hug"; // a hug ends with heart hands
    return true;
  }

  /* ------------ Tony — his own figure in the shared apartment (2.4.15) --
     Tony asked for his figure in BOTH places: his private Game Mode figure
     (life-figures.js, the older Tony_0_vvq4.glb) stays exactly as it is —
     this is a NEW shared-side slot using his NEWER Tripo export
     Tony_0_7ymz.glb (9 animations incl. a real idle clip, so no T-pose
     issue and no procedural idle needed). Slimmed with the same
     gltf-transform pipeline as the guests (dedup → prune → reorder →
     quantize → textures 2048; size only — no morph, no proportion change)
     and shipped as 4 chunks through the chunked loader. HEIGHT (2.4.17
     balance): TONY_HEIGHT = 1.92 — Tony 5'10", the tallest of the four.
     He stands in
     FRONT of her (Autumn and Summer already hold her two sides), walks
     with her on floor tap, waves hello with greet_01 when tapped, and
     joins the warm poses. His 2.4.8 hoodie wardrobe lives in
     life-figures.js (Game Mode only) and does not reach the world API,
     so this slot wears his default look. Shared side only — no private
     wiring of any kind. */
  const TONY_HEIGHT = 1.92; // 2.4.17: Tony 5'10" (1.92) — was 1.78
  const TONY_MODEL = "Tony_0_7ymz.glb";
  const TONY_VERSION = "2424"; // 2.4.24: Draco-compressed (35,228,268 bytes, was 63,016,952) — bump ONLY when his file actually changes
  const TONY_PARTS = 5; // chunked upload: .part0..4, 7,045,654 bytes each (last 7,045,652) — Draco file is 35,228,268 bytes
  const tony = {
    pos: new THREE.Vector3(SPOTS.living_center.x, 0, SPOTS.living_center.z + 0.55),
    heading: 0, moving: false, emoteLeft: 0, heartPending: false,
    path: [], arriveCb: null, // 2.4.22: his own walk path — he no longer follows Aimmianna
  };
  const tonyTmp = new THREE.Vector3();
  // 2.4.22: only built when Tony is the one logged in here.
  let tonyAvatar = loggedIn === "tony" ? makeTonyAvatar() : null;
  // 2.4.22: NO load() here either.

  /* ------------ Lazy guest arrival (2.4.22 — the iPhone crash fix) ------
     2.4.21 crashed Safari on Tony's iPhone on load: the new version's
     service worker deleted the old cache on activate, so the first load
     had a COLD cache and all three guest models fired at once at boot —
     ~200 MB fetched and parsed in parallel (15 chunk fetches + 3 GLB
     parses) while the worker wrote them all into the version cache. iOS
     killed the page for memory (jetsam). The old version worked because
     those models were already cached on the phone, and every earlier
     deploy only added ONE model at a time.
     Now Aimmianna + the room open first, and the guests arrive ONE AT A
     TIME afterwards, each awaited before the next starts, with a short
     breather between them so the phone's memory can settle. A guest
     that fails still just stays absent; the apartment stays open.
     And since Tony's login rule, the queue is whoever IS logged in
     here — usually just one guest, so the phone only ever swallows
     one model after the room opens. */
  let guestLoadRunning = false;
  function pendingGuestLoads() {
    return [
      { key: "autumn", label: "Autumn" },
      { key: "summer", label: "Summer" },
      { key: "tony", label: "Tony" },
    ].filter((g) => {
      const av = g.key === "autumn" ? guestAvatar : g.key === "summer" ? summerAvatar : tonyAvatar;
      return av && !av.model && !av.modelFailed;
    });
  }
  function liveGuestAvatar(key) {
    return key === "autumn" ? guestAvatar : key === "summer" ? summerAvatar : tonyAvatar;
  }
  async function loadGuestsSequentially() {
    if (lightMode) return; // 2.4.24 Light mode: guests don't load at all
    if (guestLoadRunning) return;
    const pending = pendingGuestLoads();
    if (!pending.length) return; // nobody logged in here, or everyone already here
    guestLoadRunning = true;
    const onStatus = opts.onGuestStatus || (() => {});
    onStatus(pending.length > 1 ? "Bringing everyone in…" : "Bringing " + pending[0].label + " in…");
    try {
      for (const g of pending) {
        const av = liveGuestAvatar(g.key); // re-read live: a logout mid-load tears it down
        if (!av || av.model || av.modelFailed) continue;
        await av.load(); // load() catches its own failures; a failed guest just stays absent
        if (liveGuestAvatar(g.key) !== av) continue; // torn down while loading (logout / left live)
        // 2.4.23: a remote guest arrives faded in, not popped in.
        if (av.model && remotePresent[g.key]) { const gs = guestStateFor(g.key); fadeState(gs).k = 0; startFadeIn(gs); }
        onStatus(av.model ? g.label + "'s here…" : g.label + " couldn't make it — the rest are still coming…");
        // Breathe between guests so the phone's memory can settle.
        await new Promise((r) => setTimeout(r, 400));
      }
    } finally {
      guestLoadRunning = false;
      onStatus("");
      // 2.4.23: someone may have joined live while the queue was busy
      // (two guests at once) — a fresh call would have returned early,
      // so re-check here instead of dropping them.
      if (pendingGuestLoads().length) loadGuestsSequentially();
    }
  }
  // Start after the room opens — a short delay so Aimmianna + the first
  // frame get the phone's full attention first.
  setTimeout(loadGuestsSequentially, 1200);
  // The login changed mid-session (a guest just entered their code, or
  // Tony picked his phone): build whoever should be here now, tear down
  // whoever shouldn't, and load anyone newly built — one at a time.
  function setLoggedIn(who) {
    loggedIn = who || null;
    // 2.4.24 Light mode: no guest avatars are built while it is on —
    // the login is still recorded, so turning it off loads them.
    if (!lightMode) {
    // 2.4.23: a login change must not tear down a guest who is here
    // because they are present in the live session — only the local
    // avatar follows the login; remote ones follow the roster.
    if (loggedIn === "autumn" && !guestAvatar) guestAvatar = makeAutumnAvatar();
    else if (loggedIn !== "autumn" && guestAvatar && !remotePresent.autumn) { disposeGuestAvatar(guestAvatar); guestAvatar = null; }
    if (loggedIn === "summer" && !summerAvatar) summerAvatar = makeSummerAvatar();
    else if (loggedIn !== "summer" && summerAvatar && !remotePresent.summer) { disposeGuestAvatar(summerAvatar); summerAvatar = null; }
    if (loggedIn === "tony" && !tonyAvatar) tonyAvatar = makeTonyAvatar();
    else if (loggedIn !== "tony" && tonyAvatar && !remotePresent.tony) { disposeGuestAvatar(tonyAvatar); tonyAvatar = null; }
    }
    loadGuestsSequentially();
  }
  function getGuests() {
    return {
      autumn: { ready: !!(guestAvatar && guestAvatar.model), failed: !!(guestAvatar && guestAvatar.modelFailed), visible: !!(guestAvatar && guestAvatar.group.visible) },
      summer: { ready: !!(summerAvatar && summerAvatar.model), failed: !!(summerAvatar && summerAvatar.modelFailed), visible: !!(summerAvatar && summerAvatar.group.visible) },
      tony: { ready: !!(tonyAvatar && tonyAvatar.model), failed: !!(tonyAvatar && tonyAvatar.modelFailed), visible: !!(tonyAvatar && tonyAvatar.group.visible) },
    };
  }
  // Light mode (2.4.24): one tick box in Settings, per device. When on,
  // guest models don't load at all (loadGuestsSequentially + the login /
  // live build paths all check lightMode), the aura discs and the drifting
  // petals turn off, and — from a fresh open — edge smoothing is off
  // (decided when the renderer was made, above). A remote guest with no
  // figure just isn't drawn: their live position still arrives, but
  // setRemoteTarget finds no avatar and does nothing, so live-together
  // keeps working with no errors and no crash. Turning it off rebuilds
  // whoever should be here (logged in here, or present in the live
  // session) and loads them, one at a time.
  function setLightMode(on) {
    const was = lightMode;
    lightMode = !!on;
    aimmiannaAura.visible = !lightMode;
    autumnAura.visible = !lightMode;
    summerAura.visible = !lightMode;
    tonyAura.visible = !lightMode;
    for (const p of petals) p.mesh.visible = !lightMode;
    if (lightMode) {
      // Free the guest models right away — that is the whole point.
      if (guestAvatar) { disposeGuestAvatar(guestAvatar); guestAvatar = null; }
      if (summerAvatar) { disposeGuestAvatar(summerAvatar); summerAvatar = null; }
      if (tonyAvatar) { disposeGuestAvatar(tonyAvatar); tonyAvatar = null; }
    } else if (was) {
      // Rebuild whoever should be here now, then load them one at a time.
      if (loggedIn === "autumn" && !guestAvatar) guestAvatar = makeAutumnAvatar();
      if (loggedIn === "summer" && !summerAvatar) summerAvatar = makeSummerAvatar();
      if (loggedIn === "tony" && !tonyAvatar) tonyAvatar = makeTonyAvatar();
      for (const who of ["autumn", "summer", "tony"]) {
        if (remotePresent[who] && !liveGuestAvatar(who)) {
          if (who === "autumn") guestAvatar = makeAutumnAvatar();
          else if (who === "summer") summerAvatar = makeSummerAvatar();
          else tonyAvatar = makeTonyAvatar();
          const f = fadeState(guestStateFor(who)); f.k = 0; f.dir = 0; f.mats = null; // arrive faded in
          remotePlaced[who] = false;
        }
      }
      loadGuestsSequentially();
    }
  }
  function tonyEmote(name) {
    if (!tonyAvatar || !tonyAvatar.actions) return false;
    if (!tonyAvatar.playMotion(name)) return false;
    tony.emoteLeft = tonyAvatar.actions[name].getClip().duration;
    tony.heartPending = name === "hug"; // a hug ends with heart hands
    return true;
  }

  /* ------------ skate park sessions (2.4.20) ---------------------------
     Riding is a session, not a pose: one rider is picked, Aimmianna
     always rides with them (it is her world — she stays central), and
     everyone rides a board or skates built from the saved design in the
     Park panel (see skateSetGear). Tricks are procedural: the rider's
     group lifts on a parabola and the board spins — no clip needed, so
     all four figures can do them, including Summer, who has no idle
     clip. The trick update runs at the END of the tick, after the
     follow blocks, so it wins over the walking/following positions for
     the length of the trick. */
  const SKATE_RAIL = { x0: 4.6, x1: 7.4, z: 13.2, y: 0.55 }; // rail A, the trick rail
  const SKATE_TRICKS = { ollie: 0.7, kickflip: 0.9, grind: 1.4, air: 1.1 };
  const SKATE_BOARD_DIMS = {
    popsicle: { l: 0.8, w: 0.2 }, cruiser: { l: 0.7, w: 0.22 },
    oldschool: { l: 0.78, w: 0.24 }, wide: { l: 0.82, w: 0.26 }, longboard: { l: 1.05, w: 0.24 }
  };
  // 2.4.21: deck art is a stripe down the grip in the art's accent colour;
  // a sticker is a small coloured disc on the deck. Both are pure
  // catalogue choices from the Park panel — no new assets.
  const SKATE_ART_ACCENTS = { skull: "#e8e8e8", flames: "#ff7a1a", roses: "#c01535", galaxy: "#ff4fa8", checker: "#111111" };
  const SKATE_STICKER_COLOURS = { skull: "#e8e8e8", rose: "#c01535", flame: "#ff7a1a", star: "#ffd94a", moon: "#d8d8e8" };
  const skate = {
    riders: new Set(), picked: "tony",
    gear: { kind: "board", board: null, skates: null },
    trick: null, boards: {}, skatesMesh: {}
  };
  function skateFigure(rider) {
    if (rider === "aimmianna") return { pos: her.pos, group: avatar.object3d, isHer: true };
    if (rider === "autumn") return guestAvatar ? { pos: guest.pos, group: guestAvatar.group } : null;
    if (rider === "summer") return summerAvatar ? { pos: summer.pos, group: summerAvatar.group } : null;
    if (rider === "tony") return tonyAvatar ? { pos: tony.pos, group: tonyAvatar.group } : null;
    return null;
  }
  function buildSkateboard(spec) {
    const s = spec || {};
    const dims = SKATE_BOARD_DIMS[s.shape] || SKATE_BOARD_DIMS.popsicle;
    const size = Number(s.size) || 8;
    const L = dims.l * (0.92 + (size - 7.5) * 0.05), W = dims.w;
    const g = new THREE.Group();
    const deckMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(s.deck || "#8a0f2e") });
    const gripMat = new THREE.MeshLambertMaterial({ color: s.grip === "glow" ? 0xff4fa8 : 0x141414 });
    const truckMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(s.trucks || "#c8c8d0") });
    const wheelMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(s.wheels || "#e8e8e8") });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(W, 0.03, L), deckMat);
    deck.position.y = 0; g.add(deck);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.008, L * 0.96), gripMat);
    grip.position.y = 0.019; g.add(grip);
    // 2.4.21: deck art stripe down the grip, sticker disc on the deck.
    if (s.art && SKATE_ART_ACCENTS[s.art]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(W * 0.22, 0.004, L * 0.9),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(SKATE_ART_ACCENTS[s.art]) }));
      stripe.position.y = 0.025; g.add(stripe);
    }
    if (s.sticker && SKATE_STICKER_COLOURS[s.sticker]) {
      const decal = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(SKATE_STICKER_COLOURS[s.sticker]) }));
      decal.rotation.x = -Math.PI / 2; decal.position.set(0, 0.028, -L * 0.22); g.add(decal);
    }
    for (const sz of [-1, 1]) {
      const tip = new THREE.Mesh(new THREE.BoxGeometry(W, 0.02, 0.08), deckMat);
      tip.position.set(0, 0.02, sz * (L / 2 - 0.02)); tip.rotation.x = -sz * 0.35; g.add(tip);
    }
    for (const sz of [-1, 1]) {
      const truck = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.025, 0.05), truckMat);
      truck.position.set(0, -0.02, sz * (L / 2 - 0.14)); g.add(truck);
      for (const sx of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 10), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(sx * (W / 2 - 0.03), -0.045, sz * (L / 2 - 0.14)); g.add(wheel);
      }
    }
    g.position.set(0, 0.045, 0.02);
    return g;
  }
  function buildSkates(spec) {
    const s = spec || {};
    const g = new THREE.Group();
    const bootMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(s.color || "#8a0f2e") });
    const wheelMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(s.wheels || "#e8e8e8") });
    // 2.4.21: inline skates run one longer wheel bar; quads keep the short bar.
    const barLen = s.style === "inline" ? 0.24 : 0.18;
    for (const sx of [-1, 1]) {
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.22), bootMat);
      boot.position.set(sx * 0.09, 0.05, 0.03); g.add(boot);
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, barLen, 8), wheelMat);
      bar.rotation.z = Math.PI / 2;
      bar.position.set(sx * 0.09, 0.02, 0.03); g.add(bar);
    }
    return g;
  }
  function applyGearToRider(rider) {
    const fig = skateFigure(rider); if (!fig) return;
    for (const key of ["boards", "skatesMesh"]) {
      const old = skate[key][rider];
      if (old) { old.parent?.remove(old); old.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } }); }
      skate[key][rider] = null;
    }
    if (skate.gear.kind === "skates") {
      const sk = buildSkates(skate.gear.skates);
      fig.group.add(sk); skate.skatesMesh[rider] = sk;
    } else {
      const bd = buildSkateboard(skate.gear.board);
      fig.group.add(bd); skate.boards[rider] = bd;
    }
    syncSkateVisibility();
  }
  function syncSkateVisibility() {
    for (const rider of ["aimmianna", "autumn", "summer", "tony"]) {
      const on = skate.riders.has(rider);
      const bd = skate.boards[rider], sk = skate.skatesMesh[rider];
      if (bd) bd.visible = on && skate.gear.kind === "board" && (rider !== "aimmianna" || !!(avatar.model && avatar.model.visible));
      if (sk) sk.visible = on && skate.gear.kind === "skates" && (rider !== "aimmianna" || !!(avatar.model && avatar.model.visible));
    }
  }
  function skateStart(rider) {
    if (!skateFigure(rider)) return { ok: false, error: "unknown rider" };
    if (cart && cart.driving) builderDrive("out"); // driving and riding can't both own her position
    skate.picked = rider;
    skate.riders.add(rider);
    if (rider !== "aimmianna") skate.riders.add("aimmianna"); // she always rides with them
    for (const r of skate.riders) { applyGearToRider(r); const av = r === "autumn" ? guestAvatar : r === "summer" ? summerAvatar : r === "tony" ? tonyAvatar : null; if (av) av.skating = true; }
    her.speed = 3.2; // rolling is faster than walking — guests keep up too
    return { ok: true, riders: [...skate.riders] };
  }
  function skateStop() {
    skate.riders.clear();
    skate.trick = null;
    for (const av of [guestAvatar, summerAvatar, tonyAvatar]) if (av) av.skating = false;
    her.speed = 1.55;
    syncSkateVisibility();
    return { ok: true };
  }
  function skatePick(rider) {
    if (!skateFigure(rider)) return { ok: false, error: "unknown rider" };
    skate.picked = rider;
    return { ok: true, picked: rider };
  }
  function skateSetGear(gear) {
    if (gear && typeof gear === "object") {
      if (gear.kind === "board" || gear.kind === "skates") skate.gear.kind = gear.kind;
      // 2.4.21: "board"/"skates" keys present with null CLEAR the spec
      // (the active design was deleted) — only a missing key keeps it.
      if ("board" in gear) skate.gear.board = gear.board || null;
      if ("skates" in gear) skate.gear.skates = gear.skates || null;
    }
    for (const r of skate.riders) applyGearToRider(r);
    return { ok: true, gear: skate.gear.kind };
  }
  function skateTrick(name) {
    if (!SKATE_TRICKS[name]) return { ok: false, error: "unknown trick" };
    if (!skate.riders.size) skateStart(skate.picked);
    const rider = skate.riders.has(skate.picked) ? skate.picked : [...skate.riders][0];
    // A trick stops her mid-walk — she plants and pops, she does not
    // glide through a grind.
    her.path = [];
    skate.trick = { name, rider, start: performance.now(), dur: SKATE_TRICKS[name] * 1000 };
    return { ok: true, name, rider, dur: SKATE_TRICKS[name] };
  }
  function getSkate() {
    return {
      riding: [...skate.riders], picked: skate.picked,
      trick: skate.trick ? skate.trick.name : null,
      gear: skate.gear.kind,
      board: skate.gear.board ? (skate.gear.board.name || null) : null,
      skates: skate.gear.skates ? (skate.gear.skates.name || null) : null,
      boards: Object.fromEntries(["aimmianna", "autumn", "summer", "tony"].map((r) => [r, !!(skate.boards[r] && skate.boards[r].visible)])),
      // 2.4.21: the saved spec round-trips here (panel + smoke test), and
      // boardParts/skateParts count the built meshes — a plain board is 10
      // parts, +1 for an art stripe, +1 for a sticker.
      spec: { board: skate.gear.board || null, skates: skate.gear.skates || null },
      boardParts: Object.fromEntries(["aimmianna", "autumn", "summer", "tony"].map((r) => [r, skate.boards[r] ? skate.boards[r].children.length : 0])),
      skateParts: Object.fromEntries(["aimmianna", "autumn", "summer", "tony"].map((r) => [r, skate.skatesMesh[r] ? skate.skatesMesh[r].children.length : 0]))
    };
  }
  // Sparks that flash under the board during a grind.
  const grindSparks = glowSprite(0xffb13a, 0.55, 0, 0.6, 0, null, 0);
  grindSparks.visible = false;
  // Runs at the END of the tick, after walking and following, so the
  // trick owns the rider's position for its duration.
  function updateSkate() {
    // Her board hides until her 3D model is actually showing (it loads
    // in the background) — re-check every tick while anyone is riding.
    if (skate.riders.size) syncSkateVisibility();
    const tr = skate.trick;
    if (!tr) { grindSparks.visible = false; return; }
    const p = Math.min(1, (performance.now() - tr.start) / tr.dur);
    const fig = skateFigure(tr.rider);
    const board = skate.boards[tr.rider];
    if (!fig) { skate.trick = null; return; }
    if (tr.name === "grind") {
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; // ease in-out
      const gx = SKATE_RAIL.x0 + (SKATE_RAIL.x1 - SKATE_RAIL.x0) * e;
      fig.group.position.set(gx, SKATE_RAIL.y, SKATE_RAIL.z);
      if (board) { board.rotation.set(0, 0, 0); board.position.y = 0.045; }
      grindSparks.position.set(gx, SKATE_RAIL.y + 0.05, SKATE_RAIL.z + 0.1);
      grindSparks.visible = true;
      grindSparks.material.opacity = 0.55 + Math.sin(performance.now() * 0.05) * 0.2;
    } else {
      const height = tr.name === "air" ? 0.9 : tr.name === "kickflip" ? 0.5 : 0.45;
      const lift = height * 4 * p * (1 - p);
      fig.group.position.y += lift;
      if (board) {
        if (tr.name === "kickflip") board.rotation.z = p * Math.PI * 2;
        else if (tr.name === "air") board.rotation.y = p * Math.PI * 2;
        else board.rotation.x = -0.3 * Math.sin(p * Math.PI);
      }
      grindSparks.visible = false;
    }
    if (p >= 1) {
      if (board) board.rotation.set(0, 0, 0);
      skate.trick = null;
      grindSparks.visible = false;
    }
  }

  /* ------------ Builder World (2.4.22) -----------------------------------
     Build anything from simple 3D shapes in the field south of the park,
     then walk around in it and stand on what was built. Shapes are plain
     data — { id, shape, x, z, w, h, d, rotY, color, finish, builtBy } —
     the world builds meshes from them, so a saved world is just a list
     of specs. builtBy tags who made it: "tony", "aimmianna", "summer",
     "autumn". Her builds are HERS: the panel asks her first
     (requestHerApproval in app.js) before any edit or removal — the
     world itself never edits a her-built shape on its own. Ramps and
     roofs are real slopes: builderGroundAt returns the top of the
     highest shape under a point, so the walk tick lifts everyone onto
     platforms and up ramps instead of clipping through them. */
  const builder = { shapes: [], meshes: new Map(), selected: null, placing: null, seq: 0 };
  let selectHelper = null;
  function builderResolveColor(c) {
    const p = BUILDER_PALETTE.find((o) => o.id === c || o.hex === c);
    if (p) return p.hex;
    if (typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c)) return c;
    return "#8a0f2e";
  }
  function builderResolveFinish(f) {
    return BUILDER_FINISHES.some((o) => o.id === f) ? f : "matte";
  }
  function builderMaterial(colorHex, finish) {
    const c = new THREE.Color(colorHex);
    if (finish === "glow") return new THREE.MeshBasicMaterial({ color: c });
    if (finish === "metal") return new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(colorHex).multiplyScalar(0.18) });
    if (finish === "stone") return new THREE.MeshLambertMaterial({ color: c.clone().lerp(new THREE.Color(0x8a8a8a), 0.45) });
    if (finish === "wood") return new THREE.MeshLambertMaterial({ color: c.clone().lerp(new THREE.Color(0x4a2a18), 0.55) });
    return new THREE.MeshLambertMaterial({ color: c });
  }
  function builderTriGeometry(len, h, peak) {
    // A triangular prism: right triangle (ramp) when peak is at the far
    // end, isosceles (roof) when peak is in the middle. Built in shape
    // space — length along x, height along y, extruded along z — then
    // rotated so the length runs along world z.
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(len, 0); s.lineTo(peak ? len / 2 : len, h); s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  }
  function builderGeometry(shape, w, h, d) {
    let g;
    if (shape === "cylinder") g = new THREE.CylinderGeometry(w / 2, w / 2, h, 20);
    else if (shape === "sphere") g = new THREE.SphereGeometry(w / 2, 20, 14);
    else if (shape === "torus") g = new THREE.TorusGeometry(w / 2, 0.09, 10, 28);
    else if (shape === "ramp") { g = builderTriGeometry(d, h, false); g.rotateY(-Math.PI / 2); g.scale(w, 1, 1); }
    else if (shape === "wedge") { g = builderTriGeometry(d, h, true); g.rotateY(-Math.PI / 2); g.scale(w, 1, 1); }
    else if (shape === "platform") g = new THREE.BoxGeometry(w, 0.08, d);
    else g = new THREE.BoxGeometry(w, h, d);
    // Centre x/z on the shape's own footprint, base at y = 0.
    g.computeBoundingBox();
    const bb = g.boundingBox;
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    return g;
  }
  function buildShapeMesh(spec) {
    const mesh = new THREE.Mesh(builderGeometry(spec.shape, spec.w, spec.h, spec.d), builderMaterial(spec.color, spec.finish));
    mesh.position.set(spec.x, 0, spec.z);
    mesh.rotation.y = (spec.rotY || 0) * Math.PI / 180;
    mesh.userData.tap = "builderShape";
    mesh.userData.builderId = spec.id;
    scene.add(mesh);
    tappables.push(mesh);
    return mesh;
  }
  function builderDisposeMesh(mesh) {
    if (!mesh) return;
    mesh.parent?.remove(mesh);
    const ti = tappables.indexOf(mesh);
    if (ti !== -1) tappables.splice(ti, 1);
    mesh.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
  }
  function builderClearSelection() {
    builder.selected = null;
    if (selectHelper) { selectHelper.parent?.remove(selectHelper); selectHelper.geometry.dispose(); selectHelper.material.dispose(); selectHelper = null; }
  }
  function builderValidate(spec) {
    const s = { ...(spec || {}) };
    if (!BUILDER_SHAPES.some((o) => o.id === s.shape)) return null;
    s.w = THREE.MathUtils.clamp(Number(s.w) || 1.2, 0.3, 3.5);
    s.h = THREE.MathUtils.clamp(Number(s.h) || 1.2, 0.3, 3.5);
    s.d = THREE.MathUtils.clamp(Number(s.d) || 1.2, 0.3, 3.5);
    if (s.shape === "platform") s.h = 0.08;
    s.x = THREE.MathUtils.clamp(Number(s.x) || 7, BUILDER_FIELD.x0 + 0.3, BUILDER_FIELD.x1 - 0.3);
    s.z = THREE.MathUtils.clamp(Number(s.z) || 22, BUILDER_FIELD.z0 + 0.3, BUILDER_FIELD.z1 - 0.3);
    s.rotY = ((Number(s.rotY) || 0) % 360 + 360) % 360;
    s.color = builderResolveColor(s.color);
    s.finish = builderResolveFinish(s.finish);
    s.builtBy = BUILDER_BUILDERS.indexOf(s.builtBy) !== -1 ? s.builtBy : "tony";
    return s;
  }
  function builderAdd(spec) {
    const s = builderValidate(spec);
    if (!s) return { ok: false, error: "unknown shape" };
    s.id = typeof spec.id === "string" && spec.id ? spec.id : "b" + (++builder.seq) + "_" + Date.now().toString(36);
    if (builder.meshes.has(s.id)) s.id = "b" + (++builder.seq) + "_" + Date.now().toString(36);
    builder.shapes.push(s);
    builder.meshes.set(s.id, buildShapeMesh(s));
    return { ok: true, shape: { ...s } };
  }
  function builderUpdate(id, changes) {
    const s = builder.shapes.find((o) => o.id === id);
    if (!s) return { ok: false, error: "unknown shape" };
    // Shape type and builder are history — changing them means delete +
    // re-add. Everything else re-validates and rebuilds the mesh.
    const next = builderValidate({ ...s, ...(changes || {}), shape: s.shape, builtBy: s.builtBy });
    if (!next) return { ok: false, error: "bad change" };
    next.id = s.id;
    Object.assign(s, next);
    builderDisposeMesh(builder.meshes.get(id));
    builder.meshes.set(id, buildShapeMesh(s));
    if (builder.selected === id) builderSelect(id);
    return { ok: true, shape: { ...s } };
  }
  function builderRemove(id) {
    const i = builder.shapes.findIndex((o) => o.id === id);
    if (i === -1) return { ok: false, error: "unknown shape" };
    if (builder.selected === id) builderClearSelection();
    builderDisposeMesh(builder.meshes.get(id));
    builder.meshes.delete(id);
    builder.shapes.splice(i, 1);
    return { ok: true };
  }
  function builderSetShapes(list) {
    for (const s of [...builder.shapes]) builderRemove(s.id);
    builderClearSelection();
    let count = 0;
    for (const spec of Array.isArray(list) ? list : []) {
      const r = builderAdd(spec);
      if (r.ok) count++;
    }
    return { ok: true, count };
  }
  function builderSelect(id) {
    builderClearSelection();
    const mesh = builder.meshes.get(id);
    if (!mesh) return { ok: false, error: "unknown shape" };
    builder.selected = id;
    selectHelper = new THREE.BoxHelper(mesh, 0xffd94a);
    scene.add(selectHelper);
    return { ok: true, id };
  }
  function builderSetPlacing(shapeId) {
    builder.placing = BUILDER_SHAPES.some((o) => o.id === shapeId) ? shapeId : null;
    return { ok: true, placing: builder.placing };
  }
  function builderLocal(spec, x, z) {
    const rot = (spec.rotY || 0) * Math.PI / 180;
    const dx = x - spec.x, dz = z - spec.z;
    return { x: dx * Math.cos(rot) + dz * Math.sin(rot), z: -dx * Math.sin(rot) + dz * Math.cos(rot) };
  }
  function builderGroundAt(x, z) {
    let top = 0;
    for (const s of builder.shapes) {
      const l = builderLocal(s, x, z);
      const hw = s.w / 2, hd = s.d / 2;
      let t = 0;
      if (s.shape === "cylinder") {
        if (l.x * l.x + l.z * l.z <= hw * hw) t = s.h;
      } else if (s.shape === "sphere") {
        const r = s.w / 2, d2 = l.x * l.x + l.z * l.z;
        if (d2 <= r * r) t = r + Math.sqrt(r * r - d2);
      } else if (s.shape === "ramp") {
        if (Math.abs(l.x) <= hw && Math.abs(l.z) <= hd) t = s.h * (l.z + hd) / (2 * hd);
      } else if (s.shape === "wedge") {
        if (Math.abs(l.x) <= hw && Math.abs(l.z) <= hd) t = s.h * (1 - Math.abs(l.z) / hd);
      } else if (s.shape === "torus") {
        t = 0; // a ring is not something you stand on
      } else if (Math.abs(l.x) <= hw && Math.abs(l.z) <= hd) {
        t = s.h; // box + platform
      }
      if (t > top) top = t;
    }
    return top;
  }
  function builderGet() {
    return {
      shapes: builder.shapes.map((s) => ({ ...s })),
      selected: builder.selected,
      placing: builder.placing,
      driving: !!cart.driving,
      cart: { x: +cart.x.toFixed(2), z: +cart.z.toFixed(2), heading: +cart.heading.toFixed(2) },
      field: { ...BUILDER_FIELD }
    };
  }
  function getBuilder() { return builderGet(); }

  /* ---- the Moon Cart (2.4.22): a starter vehicle, built from shapes,
     parked in the field. It is world furniture, not a user shape — it
     can't be edited or deleted through the builder, so it needs no
     builtBy tag and no approval. Tap it (or Get in, in the panel) to
     drive: forward / back set speed, left / right turn it, Get out parks
     it. She sits in it while driving; the group follows her as usual. */
  const cart = { group: null, x: 9.5, z: 24.5, heading: Math.PI, speed: 0, target: 0, driving: false };
  (function buildCart() {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a0f1e });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 1.4), bodyMat);
    body.position.y = 0.35; g.add(body);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.6), new THREE.MeshLambertMaterial({ color: 0x3b1240 }));
    seat.position.set(0, 0.5, -0.2); g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.1), new THREE.MeshLambertMaterial({ color: 0x3b1240 }));
    back.position.set(0, 0.7, -0.55); g.add(back);
    for (const [wx, wz] of [[-0.45, 0.45], [0.45, 0.45], [-0.45, -0.45], [0.45, -0.45]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.1, 12), new THREE.MeshLambertMaterial({ color: 0x141414 }));
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.16, wz); g.add(wheel);
    }
    for (const hx of [-0.3, 0.3]) {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd94a }));
      lamp.position.set(hx, 0.42, 0.72); g.add(lamp);
    }
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), mat.skull);
    skull.position.set(0, 0.55, -0.72); g.add(skull);
    g.position.set(cart.x, 0, cart.z);
    g.rotation.y = cart.heading;
    scene.add(g);
    cart.group = g;
    tagged(g, "builderVehicle");
  })();
  function builderDrive(action) {
    // 2.4.23 live: driving the cart owns her position — on a non-host
    // phone the host owns it instead, so driving waits.
    if (action === "in" && herRemote) return { ok: false, error: "the host is driving her right now" };
    if (action === "in") {
      if (cart.driving) return { ok: false, error: "already driving" };
      skateStop(); // riding and driving can't both own her position
      cart.driving = true;
      her.path = [];
      her.pose = "sit";
      her.speed = 2.4;
      return { ok: true, driving: true };
    }
    if (action === "out") {
      if (!cart.driving) return { ok: false, error: "not driving" };
      cart.driving = false; cart.speed = 0; cart.target = 0;
      her.pose = null; her.speed = 1.55;
      return { ok: true, driving: false };
    }
    if (!cart.driving) return { ok: false, error: "not driving" };
    if (action === "forward") cart.target = 2.4;
    else if (action === "back") cart.target = -1.2;
    else if (action === "stop") cart.target = 0;
    else if (action === "left") cart.heading += 0.3;
    else if (action === "right") cart.heading -= 0.3;
    else return { ok: false, error: "unknown drive action" };
    return { ok: true, driving: true, speed: cart.target, heading: +cart.heading.toFixed(2) };
  }
  function updateCart(dt) {
    if (!cart.driving) return;
    cart.speed += (cart.target - cart.speed) * Math.min(1, dt * 3);
    if (Math.abs(cart.speed) < 0.02 && cart.target === 0) cart.speed = 0;
    cart.x += Math.sin(cart.heading) * cart.speed * dt;
    cart.z += Math.cos(cart.heading) * cart.speed * dt;
    // The cart stays in the open world — yard, park and field, never
    // inside the apartment.
    const cx = THREE.MathUtils.clamp(cart.x, 2.2, 11.8);
    const cz = THREE.MathUtils.clamp(cart.z, 3.6, 26.3);
    if (cx !== cart.x || cz !== cart.z) { cart.x = cx; cart.z = cz; cart.speed = 0; }
    cart.group.position.set(cart.x, 0, cart.z);
    cart.group.rotation.y = cart.heading;
    her.pos.set(cart.x, her.pos.y, cart.z);
    her.heading = cart.heading;
  }

  /* ------------ Summer's wardrobe (2.4.14): high-class goth emo
     princess — she is a barbie doll, a princess, not a casual t-shirt
     girl. Heavy on stock from the start: outfits, shoes, makeup,
     hairstyles and hair dye. Her Tripo model is one mesh / one
     material, so outfits cannot swap per-region the way Aimmianna's
     multi-piece wardrobe does — an outfit pick sets a subtle colour
     cast on her figure plus the matching aura glow under her feet, and
     the pick is saved and shown in her wardrobe panel. Hair dye shifts
     the cast toward the dye colour. Makeup, shoes and hairstyle picks
     are recorded and shown; they need a multi-mesh model to change on
     the figure itself. The full beauty salon (nails, tan, sauna, salon
     rooms) is queued for a later wardrobe expansion, not this version. */
  // SUMMER_WARDROBE + SUMMER_WARDROBE_DEFAULT live at module scope now (exported, see top of file).
  const summerWardrobe = { ...SUMMER_WARDROBE_DEFAULT };
  let summerWardrobeApplied = false;
  function applySummerWardrobe() {
    const outfit = SUMMER_WARDROBE.outfit.find((o) => o.id === summerWardrobe.outfit) || SUMMER_WARDROBE.outfit[0];
    const dye = SUMMER_WARDROBE.dye.find((o) => o.id === summerWardrobe.dye) || SUMMER_WARDROBE.dye[0];
    if (summerAvatar && summerAvatar.model) {
      // subtle cast only — a strong tint would recolour her skin too
      summerAvatar.model.traverse((mesh) => {
        if (!mesh.isMesh) return;
        mesh.material.color.setRGB(
          Math.min(1, outfit.tint[0] * dye.tint[0]),
          Math.min(1, outfit.tint[1] * dye.tint[1]),
          Math.min(1, outfit.tint[2] * dye.tint[2]));
      });
    }
    summerAura.material.color.setHex(outfit.accent);
  }
  function setSummerWardrobe(kind, id) {
    const list = SUMMER_WARDROBE[kind];
    if (!list || !list.some((o) => o.id === id)) return false;
    summerWardrobe[kind] = id;
    applySummerWardrobe();
    return true;
  }

  // The private game's figures are attached only while it is being played.
  let life = null, lifePath = [], lifeHeading = 0, lifeArrive = null, lifeView = null;
  function setLifeFigures(figures, spot) {
    if (life) { life.root.visible = false; life.root.removeFromParent(); }
    if (lifeArrive) lifeArrive(false);
    lifeArrive = null; lifePath = []; lifeHeading = 0; life = figures;
    // 2.4.22 — ONE Tony at a time: the shared apartment already has Tony
    // standing in it, and the Life player is a second Tony (a different
    // model file) — opening Apartment Life used to show both at once, and
    // two full-size Tony models in one scene made it lag. While Life runs,
    // the shared Tony steps out of sight; leaving Life brings him back.
    // visible=false also skips his follow/walk tick (guarded on visible
    // at the tick), so he costs nothing while hidden — hiding alone IS
    // the full cover, no extra skip needed. He is only re-shown if his
    // model actually landed; if he is still loading, his load()
    // completion shows him, and suppressVisible stops that mid-Life.
    // (No shared Tony at all when Tony isn't the one logged in here.)
    if (tonyAvatar) {
      tonyAvatar.suppressVisible = !!figures;
      tonyAvatar.group.visible = figures ? false : !!tonyAvatar.model;
    }
    if (life) {
      const s = SPOTS[spot] || SPOTS.living_center;
      life.player.position.set(s.x + .40, 0, Math.min(2.9, s.z + .45));
      life.root.visible = true; scene.add(life.root);
    } else if (lifeView) {
      Object.assign(cam, lifeView); lifeView = null;
    }
  }
  function startLifeView() {
    lifeView = { mode: cam.mode, room: cam.room, zoom: cam.zoom, yaw: cam.yaw, pitch: cam.pitch };
    setFollow();
    const o = life.player.position;
    cam.pos.set(o.x, 3.48, o.z + 4.55); cam.look.set(o.x, .96, o.z - .42);
  }
  function moveLifePlayer(x, z) {
    if (!life || !Number.isFinite(x) || !Number.isFinite(z)) return Promise.resolve(false);
    const outside = z > Z_FRONT;
    x = outside ? THREE.MathUtils.clamp(x, 4.65, 9.3) : THREE.MathUtils.clamp(x, -13.5, 14.5);
    z = outside ? THREE.MathUtils.clamp(z, Z_FRONT + .08, 7.88) : THREE.MathUtils.clamp(z, -3.2, Z_FRONT);
    const pos = life.player.position;
    const fromOutside = pos.z > Z_FRONT;
    const source = roomAt(pos.x, pos.z), dest = roomAt(x, z);
    lifePath = [];
    if (lifeArrive) lifeArrive(false);
    if (outside !== fromOutside) {
      if (!fromOutside && source !== "kitchen") {
        if (pos.z < HALL_Z - .15) lifePath.push(new THREE.Vector3(pos.x, 0, HALL_Z));
        lifePath.push(new THREE.Vector3(7.07, 0, HALL_Z));
      }
      lifePath.push(new THREE.Vector3(7.07, 0, 3.5));
      if (!outside && dest !== "kitchen") {
        lifePath.push(new THREE.Vector3(7.07, 0, HALL_Z));
        lifePath.push(new THREE.Vector3(x, 0, HALL_Z));
      }
    } else if (source !== dest) {
      if (pos.z < HALL_Z - .15) lifePath.push(new THREE.Vector3(pos.x, 0, HALL_Z));
      lifePath.push(new THREE.Vector3(x, 0, Math.max(z, HALL_Z)));
    }
    lifePath.push(new THREE.Vector3(x, 0, z));
    return new Promise((resolve) => { lifeArrive = resolve; });
  }
  function moveLifeToSpot(name) {
    const spot = SPOTS[name];
    return spot ? moveLifePlayer(spot.x + .42, spot.z + .65) : Promise.resolve(false);
  }

  function clampWalkPoint(x, z) {
    x = Math.max(-13.5, Math.min(20.0, x));
    // The park floor runs to z 17 and the builder field to z 26.5 — but
    // only inside their x ranges; anywhere else the floor ends at the
    // yard (z 8.0), as before.
    const zMax = (x >= 2 && x <= 12) ? 26.5 : 8.0;
    z = Math.max(-2.9, Math.min(zMax, z));
    return { x, z };
  }
  function planPathFrom(fx, fz, tx, tz, pose) {
    const pts = [];
    const sameRoom = roomAt(fx, fz) === roomAt(tx, tz) && Math.abs(fx - tx) < 4.5;
    if (!sameRoom) {
      if (fz < HALL_Z - 0.2) pts.push(new THREE.Vector3(fx, 0, HALL_Z));
      pts.push(new THREE.Vector3(tx, 0, HALL_Z));
    } else if (pose === "sit" || pose === "lie" || pose === "bath") {
      // step out of the couch/bed/tub first
      pts.push(new THREE.Vector3(fx + (pose === "lie" ? 2.2 : 0), 0, Math.max(fz, -1.0) + 0.9));
    }
    pts.push(new THREE.Vector3(tx, 0, tz));
    return pts;
  }
  function planPath(tx, tz) {
    return planPathFrom(her.pos.x, her.pos.z, tx, tz, her.pose);
  }
  // 2.4.22 — a guest walks their OWN path. The person logged in on
  // this device controls their own avatar: a floor tap on their device
  // sends THEIR avatar here (see app.js onWorldTap). Nobody is dragged
  // along — the tick below only walks a guest down their own path, or
  // beside Aimmianna while they are riding a board with her.
  function walkGuest(who, x, z) {
    const g = who === "autumn" ? guest : who === "summer" ? summer : who === "tony" ? tony : null;
    const av = liveGuestAvatar(who);
    if (!g || !av || !av.model) return Promise.resolve(false);
    const p = clampWalkPoint(x, z);
    if (g.arriveCb) g.arriveCb(false);
    g.path = planPathFrom(g.pos.x, g.pos.z, p.x, p.z, null);
    g.emoteLeft = 0; g.heartPending = false;
    return new Promise((resolve) => { g.arriveCb = resolve; });
  }
  // One step of a guest's own walk — same pace as her (3.2 while anyone
  // is skating, 1.55 otherwise). g.moving says if the guest is still
  // walking when it returns.
  function stepGuestPath(g, dt) {
    if (!g.path.length) { g.moving = false; return; }
    const target = g.path[0];
    const dx = target.x - g.pos.x, dz = target.z - g.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.001) g.heading = Math.atan2(dx, dz);
    const step = her.speed * dt;
    if (d <= step) { g.pos.x = target.x; g.pos.z = target.z; g.path.shift(); }
    else { g.pos.x += (dx / d) * step; g.pos.z += (dz / d) * step; }
    g.moving = g.path.length > 0;
    if (!g.path.length && g.arriveCb) { const cb = g.arriveCb; g.arriveCb = null; cb(true); }
  }
  function goToSpot(name) {
    // 2.4.23 live: on a non-host phone her movement comes from the host
    // — local paths (routines, chat tools, taps) wait instead of
    // fighting the stream. The caller gets a plain false, not a hang.
    if (herRemote) return Promise.resolve(false);
    const s = SPOTS[name]; if (!s) return Promise.resolve(false);
    return new Promise((resolve) => {
      if (her.arriveCb) her.arriveCb(false);
      her.path = planPath(s.x, s.z);
      her.pendingSpot = name; her.arriveCb = resolve;
      if (her.pose === "lie" || her.pose === "bath" || her.pose === "sit") her.pos.y = 0;
      her.pose = null;
    });
  }
  function goToPoint(x, z) {
    if (herRemote) return Promise.resolve(false); // 2.4.23: host drives her
    const p = clampWalkPoint(x, z);
    x = p.x; z = p.z;
    if (her.arriveCb) her.arriveCb(false);
    her.path = planPath(x, z); her.pendingSpot = null; her.pose = null;
    return new Promise((resolve) => { her.arriveCb = resolve; });
  }
  function goToRoom(room) {
    const list = ROOM_SPOTS[room]; if (!list) return Promise.resolve(false);
    const main = { bedroom: "bedroom_center", living: "living_center", kitchen: "counter", bathroom: "bath_center", ritual: "ritual_center", yard: "yard_center", park: "park_center", builder: "builder_center" }[room]; // 2.4.22: builder was missing — goToRoom("builder") silently resolved false and she stayed put (hub + panel "Go to the Builder World" both call it).
    return goToSpot(main);
  }
  function placeAt(name) {
    if (herRemote) return; // 2.4.23: host drives her
    const s = SPOTS[name]; if (!s) return;
    her.pos.set(s.x, 0, s.z); her.path = []; her.spot = name; her.pose = s.pose || null; her.room = s.room;
    avatar.object3d.position.copy(her.pos);
  }

  /* ------------ camera rig */
  const cam = {
    mode: "follow", room: null, followWho: null, // 2.4.22: null = her; "tony"/"summer"/"autumn" = that guest's avatar
    pos: camera.position.clone(), look: new THREE.Vector3(-1, 1, -1),
    wantPos: new THREE.Vector3(), wantLook: new THREE.Vector3(),
    yaw: 0, pitch: 0, zoom: 1, page: 0.5,
    gyro: { on: false, x: 0, y: 0, tx: 0, ty: 0, base: null }
  };
  function viewport() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    return { w, h, aspect: w / h };
  }
  function computeWant() {
    const { aspect } = viewport();
    const portrait = aspect < 0.9;
    if (cam.mode === "follow") {
      // 2.4.22: the camera follows whoever this device is controlling —
      // her by default, or the logged-in guest's avatar after a floor
      // tap sends them walking (world.setFollow(who)). A guest who was
      // torn down (logout) falls back to her.
      const followPos = cam.followWho === "autumn" && guestAvatar ? guestAvatar.group.position
        : cam.followWho === "summer" && summerAvatar ? summerAvatar.group.position
        : cam.followWho === "tony" && tonyAvatar ? tonyAvatar.group.position
        : avatar.object3d.position;
      const head = life ? life.player.position : followPos;
      const lift = life || cam.followWho ? 1.0 : her.pose === "lie" ? 0.6 : her.pose === "bath" ? 0.5 : her.pose === "sit" ? 0.7 : 1.0;
      cam.wantLook.set(head.x, lift, head.z - 0.4);
      // tall phone screens: closer and looking a bit more down, so the floor fills
      // the bottom of the screen instead of empty space in front of the dollhouse
      const dist = (life ? (portrait ? 4.4 : 5.0) : (portrait ? 5.0 : 5.8)) * cam.zoom;
      const el = (portrait ? 0.5 : 0.34) + cam.pitch;
      const yaw = cam.yaw + (cam.page - 0.5) * 0.6; // live wallpaper: home-screen pages pan the view
      cam.wantPos.set(head.x + Math.sin(yaw) * dist * Math.cos(el), lift + Math.sin(el) * dist + 0.4, head.z + Math.cos(yaw) * dist * Math.cos(el));
    } else {
      const r = ROOMS[cam.room]; const cx = (r.x0 + r.x1) / 2; const W = r.x1 - r.x0;
      // Outdoor rooms sit outside the front wall — look at their middle.
      const lookZ = cam.room === "yard" ? 5.8 : cam.room === "park" ? 12.6 : -1.6;
      const vfov = THREE.MathUtils.degToRad(camera.fov);
      const hfovHalf = Math.atan(Math.tan(vfov / 2) * aspect);
      const fitW = W * (portrait ? 0.7 : 0.98);
      let dist = Math.max((fitW / 2) / Math.tan(hfovHalf), 2.4 / Math.tan(vfov / 2));
      dist = Math.min(dist, portrait ? 15 : 13) * cam.zoom;
      cam.wantLook.set(cx, 1.05, lookZ);
      const el = (portrait ? 0.48 : 0.3) + cam.pitch;
      cam.wantPos.set(cx + Math.sin(cam.yaw) * dist * Math.cos(el), 1.05 + Math.sin(el) * dist, lookZ + Math.cos(cam.yaw) * dist * Math.cos(el));
    }
  }
  function setFollow(who) { cam.mode = "follow"; cam.followWho = who || null; cam.room = null; cam.yaw = 0; cam.pitch = 0; cam.zoom = 1; }
  function setRoomView(room) { if (!ROOMS[room]) return; cam.mode = "room"; cam.room = room; cam.yaw = 0; cam.pitch = 0; cam.zoom = 1; }

  /* gyro parallax */
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    let b = e.beta, g = e.gamma;
    const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    if (ang === 90) { const t = b; b = -g; g = t; } else if (ang === -90 || ang === 270) { const t = b; b = g; g = -t; }
    applyScreenTilt(b, g);
  }
  function applyScreenTilt(b, g) {
    if (!Number.isFinite(b) || !Number.isFinite(g)) return;
    cam.gyro.on = true;
    if (!cam.gyro.base) cam.gyro.base = { b, g };
    // Use the shortest difference when the device tilt wraps at ±180°.
    const delta = (a, prev) => ((a - prev + 540) % 360 + 360) % 360 - 180;
    const db = delta(b, cam.gyro.base.b), dg = delta(g, cam.gyro.base.g);
    // baseline slowly drifts toward how you're holding the phone
    cam.gyro.base.b = delta(cam.gyro.base.b + db * 0.004, 0);
    cam.gyro.base.g = delta(cam.gyro.base.g + dg * 0.004, 0);
    const clamp = (v) => Math.max(-25, Math.min(25, v));
    cam.gyro.tx = clamp(dg * 0.996) / 25;
    cam.gyro.ty = clamp(db * 0.996) / 25;
  }
  async function requestGyro() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== "granted") return "denied";
      }
      if (typeof DeviceOrientationEvent === "undefined") return "unsupported";
      window.addEventListener("deviceorientation", onOrient);
      cam.gyro.on = true; cam.gyro.base = null;
      return "granted";
    } catch (e) { return "error"; }
  }

  /* touch drag / pinch / wheel + tap picking */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const pointers = new Map();
  let downInfo = null, pinchStart = 0, zoomStart = 1;
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) downInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false, lx: e.clientX, ly: e.clientY };
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchStart = Math.hypot(a.x - b.x, a.y - b.y); zoomStart = cam.zoom; if (downInfo) downInfo.moved = true; }
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart > 0) cam.zoom = Math.max(0.55, Math.min(1.6, zoomStart * pinchStart / d));
      return;
    }
    if (!downInfo) return;
    const dx = e.clientX - downInfo.lx, dy = e.clientY - downInfo.ly;
    downInfo.lx = e.clientX; downInfo.ly = e.clientY;
    if (Math.hypot(e.clientX - downInfo.x, e.clientY - downInfo.y) > 8) downInfo.moved = true;
    if (downInfo.moved) {
      cam.yaw = Math.max(-0.75, Math.min(0.75, cam.yaw - dx * 0.005));
      cam.pitch = Math.max(-0.2, Math.min(0.45, cam.pitch + dy * 0.004));
    }
  });
  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size === 0 && downInfo) {
      const quick = performance.now() - downInfo.t < 450;
      if (!downInfo.moved && quick) pick(e.clientX, e.clientY);
      downInfo = null; pinchStart = 0;
    }
  };
  canvas.addEventListener("pointerup", endPointer);
  canvas.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); downInfo = null; });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); cam.zoom = Math.max(0.55, Math.min(1.6, cam.zoom * (1 + e.deltaY * 0.001))); }, { passive: false });
  canvas.addEventListener("dblclick", () => { cam.yaw = 0; cam.pitch = 0; cam.zoom = 1; });

  function hitAt(cx, cy) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height || cx < r.left || cy < r.top || cx >= r.right || cy >= r.bottom) return null;
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const avatarPicks = avatar.activePicks || [avatar.pickMesh];
    const fixtures = life ? [...tappables, ...life.yardTaps] : tappables;
    const hits = ray.intersectObjects(avatarPicks, false, ray.intersectObjects(fixtures, false));
    for (const h of hits) {
      const tap = h.object.userData.tap;
      if (!tap) continue;
      if (h.object === avatar.pickMesh) {
        // only count her if the hit pixel is actually opaque-ish (crude: middle 70% of the card)
        const u = h.uv; if (u && (u.x < 0.18 || u.x > 0.82)) continue;
      }
      return { tap, point: h.point, index: (h.object.userData.candleIndex != null ? h.object.userData.candleIndex : (h.object.userData.crystalIndex != null ? h.object.userData.crystalIndex : null)), builderId: h.object.userData.builderId || null };
    }
    return null;
  }
  function pick(cx, cy) {
    const hit = hitAt(cx, cy);
    if (hit) onTap(hit.tap, { point: hit.point, x: cx, y: cy, index: hit.index, builderId: hit.builderId });
  }

  /* ------------ anchors (speech bubble, idle fx) follow her head */
  const anchors = [];
  const tmpV = new THREE.Vector3();
  function placeAnchors() {
    if (!anchors.length) return;
    const { w, h } = viewport();
    const o = avatar.object3d.position;
    const hh = her.pose === "lie" ? 0.95 : her.pose === "bath" ? avatar.headHeight - 0.55 : her.pose === "sit" ? avatar.headHeight - 0.4 : avatar.headHeight;
    tmpV.set(o.x, o.y + hh, o.z).project(camera);
    const sx = (tmpV.x * 0.5 + 0.5) * w, sy = (-tmpV.y * 0.5 + 0.5) * h;
    const vis = tmpV.z < 1;
    anchors.forEach((a) => { a.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`; a.style.visibility = vis ? "" : "hidden"; });
  }

  /* ------------ main loop */
  const clock = new THREE.Clock();
  let lastChan = 0, frameAvg = 16, slowFor = 0, running = true, lastRoom = her.room;
  const tmp = new THREE.Vector3();
  const lifeDelta = new THREE.Vector3();
  function resize() {
    const { w, h, aspect } = viewport();
    renderer.setSize(w, h, false);
    camera.aspect = aspect;
    camera.fov = aspect < 0.8 ? 58 : 50;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  let lowPower = false, skipFrame = false;
  function tick() {
    if (!running) return;
    requestAnimationFrame(tick);
    if (lowPower) { skipFrame = !skipFrame; if (skipFrame) return; }
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;

    // adaptive resolution to protect 60fps
    frameAvg = frameAvg * 0.95 + dt * 1000 * 0.05;
    if (!lowPower && frameAvg > 21 && pixelRatio > 1) { slowFor += dt; if (slowFor > 1.5) { pixelRatio = Math.max(1, pixelRatio - 0.25); renderer.setPixelRatio(pixelRatio); resize(); slowFor = 0; } }
    else slowFor = 0;

    // walking
    her.moveDir = 0;
    if (herRemote) {
      // 2.4.23 live: the host phone drives her — glide toward the
      // host's stream with the same followStep as a local walk.
      // Frozen mid-fade (a room jump owns her then).
      const hf = fadeState(her);
      if (hf.dir === 0 && hf.k >= 1) {
        const look = remoteLookahead(herRemotePrev, herRemote);
        const hStep = followStep(her.pos.x, her.pos.z, look.x, look.z, dt, her.speed);
        if (hStep.snapped) { her.pos.x = hStep.x; her.pos.z = hStep.z; }
        else {
          if (hStep.moving) her.heading = Math.atan2(look.x - her.pos.x, look.z - her.pos.z);
          her.pos.x = hStep.x; her.pos.z = hStep.z;
        }
      }
    } else if (her.path.length) {
      const target = her.path[0];
      tmp.subVectors(target, her.pos); tmp.y = 0;
      const d = tmp.length();
      if (d > 0.001) her.heading = Math.atan2(tmp.x, tmp.z);
      const step = her.speed * dt;
      if (d <= step) { her.pos.copy(target); her.path.shift(); }
      else { tmp.multiplyScalar(step / d); her.pos.add(tmp); }
      // screen-space direction for lean
      const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      her.moveDir = Math.sign(tmp.dot(camRight));
      if (!her.path.length) {
        her.spot = her.pendingSpot || null;
        const s = her.spot && SPOTS[her.spot];
        her.pose = s && s.pose ? s.pose : null;
        if (her.pose === "lie") her.pos.y = 0.68; else her.pos.y = 0;
        const cb = her.arriveCb; her.arriveCb = null;
        if (cb) cb(true);
        onArrive(her.spot);
      }
    }
    // Builder World (2.4.22): driving the Moon Cart owns her position
    // for the frame, and standing on what was built lifts her onto
    // platforms and up ramps — the ground under her feet is the top of
    // the highest shape there. Poses that set their own height (lie,
    // bath, sit on furniture) and skate tricks keep theirs; driving
    // still grounds her, so the cart can climb a ramp too.
    updateCart(dt);
    if ((!her.pose || cart.driving) && !skate.trick) {
      const gy = builderGroundAt(her.pos.x, her.pos.z);
      her.pos.y += (gy - her.pos.y) * Math.min(1, dt * 8);
      if (Math.abs(gy - her.pos.y) < 0.005) her.pos.y = gy;
    }
    stepFade(avatar.object3d, her, dt); // 2.4.23: room-jump fade for her
    avatar.object3d.position.copy(her.pos);
    const nowRoom = roomAt(her.pos.x, her.pos.z);
    if (nowRoom !== lastRoom) { lastRoom = nowRoom; her.room = nowRoom; onRoomChange(nowRoom); }

    // pose resolution
    let mode;
    // 2.4.20: rolling on a board is a stance, not a walk — the skate
    // pose (crouch, arms out) replaces the walk clip and the idle while
    // she is riding. A pose override (hug, heart, ...) still wins.
    if (her.path.length) mode = skate.riders.has("aimmianna") ? "skate" : "walk";
    else if (poseOverride && Date.now() < poseOverrideUntil) mode = poseOverride;
    else if (skate.riders.has("aimmianna")) mode = "skate";
    else if (her.pose === "lie" || her.pose === "bath" || her.pose === "sit") mode = her.pose;
    else if (stereoState.on) mode = "dance";
    else if (her.talking) mode = "talk";
    else mode = her.activity || "idle";
    // 2.4.23 live: on a non-host phone her pose comes from the host —
    // the local pose override, activity and talk flags don't drive her.
    if (herRemote) mode = herRemote.mv ? "walk" : (herRemote.pose || "idle");
    her.mode = mode;
    const lamp = roomLights[nowRoom];
    const lit = LAMP_MODES[lamp.mode].i ? 1 : 0.72;
    avatar.update(dt, t, camera, { mode, moveDir: her.moveDir, heading: her.heading, brightness: lit });

    // Autumn (2.4.13): she idles facing Aimmianna and walks her OWN path
    // when her controller sends her somewhere — she no longer follows
    // Aimmianna around (2.4.22: nobody auto-follows anymore). The ONE
    // exception is riding: on a board with Aimmianna, they ride together
    // beside her, as before.
    if (guestAvatar && guestAvatar.model && guestAvatar.group.visible) {
      stepFade(guestAvatar.group, guest, dt); // 2.4.23: room-jump / join / leave fade
      if (skate.riders.has("autumn")) {
        const sideX = Math.cos(her.heading), sideZ = -Math.sin(her.heading);
        guestTmp.set(her.pos.x + sideX * 0.55, 0, her.pos.z + sideZ * 0.55);
        // 2.4.20: smooth follow — followStep() closes the gap proportionally,
        // so she glides beside Aimmianna instead of trailing and snapping.
        const gStep = followStep(guest.pos.x, guest.pos.z, guestTmp.x, guestTmp.z, dt, her.speed);
        if (gStep.moving) guest.heading = Math.atan2(guestTmp.x - guest.pos.x, guestTmp.z - guest.pos.z);
        guest.pos.x = gStep.x; guest.pos.z = gStep.z; guest.moving = gStep.moving;
      } else if (remoteTargets.autumn) {
        // 2.4.23 live: she's online on another phone — glide toward
        // the network target instead of walking her own path.
        stepRemoteGuest("autumn", guest, dt);
      } else {
        stepGuestPath(guest, dt);
      }
      // Builder World (2.4.22): she stands on built shapes too.
      const gGround = builderGroundAt(guest.pos.x, guest.pos.z);
      guest.pos.y += (gGround - guest.pos.y) * Math.min(1, dt * 8);
      if (Math.abs(gGround - guest.pos.y) < 0.005) guest.pos.y = gGround;
      // A walk cancels an emote — she never glides through a hug.
      if (guest.moving) { guest.emoteLeft = 0; guest.heartPending = false; }
      // Emote timing: a hug ends with heart hands; any emote falls back
      // to walk or idle when its clip runs out.
      if (guest.emoteLeft > 0) {
        guest.emoteLeft -= dt;
        if (guest.emoteLeft <= 0) {
          if (guest.heartPending) { guest.heartPending = false; guestEmote("heart_pose"); }
          else guestAvatar.playMotion(guestMotionName(guest));
        }
      } else {
        guestAvatar.playMotion(guestMotionName(guest));
      }
      // Face where she's going; when still, face Aimmianna — or, live,
      // where her phone says she's facing.
      const wantYaw = guest.moving || guest.emoteLeft > 0
        ? guest.heading
        : (remoteTargets.autumn ? remoteTargets.autumn.hd : Math.atan2(her.pos.x - guest.pos.x, her.pos.z - guest.pos.z));
      const dyaw = Math.atan2(Math.sin(wantYaw - guestAvatar.group.rotation.y), Math.cos(wantYaw - guestAvatar.group.rotation.y));
      guestAvatar.group.rotation.y += dyaw * (1 - Math.exp(-dt * 9));
      guestAvatar.group.position.copy(guest.pos);
      guestAvatar.update(dt);
    }

    // Summer (2.4.14): same rule as Autumn — her own path, no
    // auto-follow; riding together is the only exception. She has no
    // idle clip, so her idle is a procedural breathing bob — never frozen.
    if (summerAvatar && summerAvatar.model && summerAvatar.group.visible) {
      stepFade(summerAvatar.group, summer, dt); // 2.4.23: room-jump / join / leave fade
      if (!summerWardrobeApplied) { summerWardrobeApplied = true; applySummerWardrobe(); }
      if (skate.riders.has("summer")) {
        const sSideX = -Math.cos(her.heading), sSideZ = Math.sin(her.heading);
        summerTmp.set(her.pos.x + sSideX * 0.55, 0, her.pos.z + sSideZ * 0.55);
        // 2.4.20: smooth follow — see Autumn's block above.
        const sStep = followStep(summer.pos.x, summer.pos.z, summerTmp.x, summerTmp.z, dt, her.speed);
        if (sStep.moving) summer.heading = Math.atan2(summerTmp.x - summer.pos.x, summerTmp.z - summer.pos.z);
        summer.pos.x = sStep.x; summer.pos.z = sStep.z; summer.moving = sStep.moving;
      } else if (remoteTargets.summer) {
        // 2.4.23 live: she's online on another phone — glide toward
        // the network target instead of walking her own path.
        stepRemoteGuest("summer", summer, dt);
      } else {
        stepGuestPath(summer, dt);
      }
      // Builder World (2.4.22): she stands on built shapes too.
      const sGround = builderGroundAt(summer.pos.x, summer.pos.z);
      summer.pos.y += (sGround - summer.pos.y) * Math.min(1, dt * 8);
      if (Math.abs(sGround - summer.pos.y) < 0.005) summer.pos.y = sGround;
      // A walk cancels an emote — she never glides through a hug.
      if (summer.moving) { summer.emoteLeft = 0; summer.heartPending = false; }
      // Emote timing: a hug ends with heart hands; any emote falls back
      // to walk or idle when its clip runs out.
      if (summer.emoteLeft > 0) {
        summer.emoteLeft -= dt;
        if (summer.emoteLeft <= 0) {
          if (summer.heartPending) { summer.heartPending = false; summerEmote("heart_pose"); }
          else summerAvatar.playMotion(guestMotionName(summer));
        }
      } else {
        summerAvatar.playMotion(guestMotionName(summer));
      }
      // Face where she's going; when still, face Aimmianna — or, live,
      // where her phone says she's facing.
      const sWantYaw = summer.moving || summer.emoteLeft > 0
        ? summer.heading
        : (remoteTargets.summer ? remoteTargets.summer.hd : Math.atan2(her.pos.x - summer.pos.x, her.pos.z - summer.pos.z));
      const sDyaw = Math.atan2(Math.sin(sWantYaw - summerAvatar.group.rotation.y), Math.cos(sWantYaw - summerAvatar.group.rotation.y));
      summerAvatar.group.rotation.y += sDyaw * (1 - Math.exp(-dt * 9));
      // Procedural breathing idle: a gentle rise and fall while she
      // stands still with no clip playing. No bob while walking or
      // emoting — the clip owns the motion then.
      const sBreathing = !summer.moving && summer.emoteLeft <= 0;
      summerAvatar.group.position.set(summer.pos.x, summer.pos.y + (sBreathing ? 0.012 * Math.sin(t * 1.4) : 0), summer.pos.z);
      summerAvatar.update(dt);
    }

    // Tony (2.4.15): same rule — his own path, no auto-follow; riding
    // together is the only exception. He has a real idle clip, so no
    // procedural idle is needed here.
    if (tonyAvatar && tonyAvatar.model && tonyAvatar.group.visible) {
      stepFade(tonyAvatar.group, tony, dt); // 2.4.23: room-jump / join / leave fade
      if (skate.riders.has("tony")) {
        const tFwdX = Math.sin(her.heading), tFwdZ = Math.cos(her.heading);
        tonyTmp.set(her.pos.x + tFwdX * 0.55, 0, her.pos.z + tFwdZ * 0.55);
        // 2.4.20: smooth follow — see Autumn's block above.
        const tStep = followStep(tony.pos.x, tony.pos.z, tonyTmp.x, tonyTmp.z, dt, her.speed);
        if (tStep.moving) tony.heading = Math.atan2(tonyTmp.x - tony.pos.x, tonyTmp.z - tony.pos.z);
        tony.pos.x = tStep.x; tony.pos.z = tStep.z; tony.moving = tStep.moving;
      } else if (remoteTargets.tony) {
        // 2.4.23 live: he's online on another phone — glide toward
        // the network target instead of walking his own path.
        stepRemoteGuest("tony", tony, dt);
      } else {
        stepGuestPath(tony, dt);
      }
      // Builder World (2.4.22): he stands on built shapes too.
      const tGround = builderGroundAt(tony.pos.x, tony.pos.z);
      tony.pos.y += (tGround - tony.pos.y) * Math.min(1, dt * 8);
      if (Math.abs(tGround - tony.pos.y) < 0.005) tony.pos.y = tGround;
      // A walk cancels an emote — he never glides through a hug.
      if (tony.moving) { tony.emoteLeft = 0; tony.heartPending = false; }
      // Emote timing: a hug ends with heart hands; any emote falls back
      // to walk or idle when its clip runs out.
      if (tony.emoteLeft > 0) {
        tony.emoteLeft -= dt;
        if (tony.emoteLeft <= 0) {
          if (tony.heartPending) { tony.heartPending = false; tonyEmote("heart_pose"); }
          else tonyAvatar.playMotion(guestMotionName(tony));
        }
      } else {
        tonyAvatar.playMotion(guestMotionName(tony));
      }
      // Face where he's going; when still, face Aimmianna — or, live,
      // where his phone says he's facing.
      const tWantYaw = tony.moving || tony.emoteLeft > 0
        ? tony.heading
        : (remoteTargets.tony ? remoteTargets.tony.hd : Math.atan2(her.pos.x - tony.pos.x, her.pos.z - tony.pos.z));
      const tDyaw = Math.atan2(Math.sin(tWantYaw - tonyAvatar.group.rotation.y), Math.cos(tWantYaw - tonyAvatar.group.rotation.y));
      tonyAvatar.group.rotation.y += tDyaw * (1 - Math.exp(-dt * 9));
      tonyAvatar.group.position.copy(tony.pos);
      tonyAvatar.update(dt);
    }

    // koi drift around the pond
    for (const k of koi) {
      const a = t * k.speed + k.phase;
      k.mesh.position.set(8.2 + Math.cos(a) * k.r, 0.11, 5.9 + Math.sin(a) * k.r * 0.7);
      k.mesh.rotation.y = -a;
    }
    // sakura petals drift down and reset at the top
    // 2.4.24 Light mode: the petals stay still (and hidden) — less to draw.
    if (!lightMode) for (const p of petals) {
      p.mesh.position.y -= p.speed * dt;
      p.mesh.position.x += Math.sin(t * 0.8 + p.phase) * dt * 0.15;
      p.mesh.rotation.z += dt * 0.5;
      if (p.mesh.position.y < 0.05) { p.mesh.position.y = 2.2 + Math.random() * 0.8; p.mesh.position.x = 5 + Math.random() * 5; p.mesh.position.z = 5.2 + Math.random() * 2.8; }
    }
    // bamboo sways, hammock rocks gently
    bambooStalks.forEach((b) => { b.mesh.rotation.z = b.base + Math.sin(t * 0.9 + b.phase) * 0.035; });
    hammockGroup.rotation.z = Math.sin(t * 0.7) * 0.025;
    // incense smoke rises while lit; candle flames flicker — and flare bright
    // for a few seconds after a spell is cast (2.4.8)
    animateSteam(incenseSteam, incenseOn, t, 0.7, 0.4);
    const flaring = performance.now() < castFlareUntil;
    candleMeshes.forEach((m, i) => {
      m.glow.material.opacity = candleState[i].lit ? (flaring ? 0.9 : 0.5) : 0;
      if (candleState[i].lit) m.flame.scale.setScalar(flaring ? 1.5 + Math.sin(t * 14 + i) * 0.25 : 0.9 + Math.sin(t * 11 + i * 2) * 0.15);
    });
    ballGlow.material.opacity = flaring ? 0.6 + Math.sin(t * 6) * 0.3 : 0.3;
    // rain falls over the yard
    if (rainPts.visible) {
      const rp = rainPts.geometry.attributes.position;
      for (let i = 0; i < rp.count; i++) { let y = rp.getY(i) - dt * 5; if (y < 0) y = 5; rp.setY(i, y); }
      rp.needsUpdate = true;
    }
    // sky follows the hour (checked every couple of seconds)
    if (!tick._skyAt || t - tick._skyAt > 2) { tick._skyAt = t; applySky(); }

    if (life) {
      if (lifePath.length) {
        const pos = life.player.position, target = lifePath[0];
        lifeDelta.subVectors(target, pos);
        const dist = lifeDelta.length(), stride = dt * 3.8;
        if (dist > .01) lifeHeading = Math.atan2(lifeDelta.x, lifeDelta.z);
        if (dist <= stride) { pos.copy(target); lifePath.shift(); }
        else pos.addScaledVector(lifeDelta, stride / dist);
        if (!lifePath.length && lifeArrive) { const finish = lifeArrive; lifeArrive = null; finish(true); }
      }
      life.animate(!!lifePath.length, lifeHeading, t);
    }

    // camera
    computeWant();
    const k = 1 - Math.exp(-dt * (cam.mode === "follow" ? 3.2 : 2.4));
    cam.pos.lerp(cam.wantPos, k);
    cam.look.lerp(cam.wantLook, k);
    if (cam.mode === "follow" && !downInfo) { cam.yaw *= 1 - dt * 0.25; cam.pitch *= 1 - dt * 0.25; }
    // gyro parallax: shift the eye in camera space, keep looking at the same point
    const gk = 1 - Math.exp(-dt * 6);
    cam.gyro.x += (cam.gyro.tx - cam.gyro.x) * gk;
    cam.gyro.y += (cam.gyro.ty - cam.gyro.y) * gk;
    camera.position.copy(cam.pos);
    camera.lookAt(cam.look);
    if (cam.gyro.on) {
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
      camera.position.addScaledVector(right, cam.gyro.x * 1.1).addScaledVector(up, -cam.gyro.y * 0.7);
      camera.lookAt(cam.look);
    }

    // devices
    if (ledState.mode === "rainbow") { ledState.hue = (ledState.hue + dt * 0.08) % 1; ledMat.color.setHSL(ledState.hue, 0.9, 0.55); ledGlows.forEach((g, i) => g.material.color.setHSL((ledState.hue + i * 0.06) % 1, 0.9, 0.55)); }
    const hue = (t * 0.07) % 1;
    rgbPanel.material.color.setHSL(hue, 0.95, 0.55); fanMat.color.setHSL((hue + 0.3) % 1, 0.95, 0.6);
    pcGlow.material.color.setHSL(hue, 0.95, 0.55); kbGlow.material.color.setHSL((hue + 0.5) % 1, 0.9, 0.55);
    fans.forEach((f, i) => { f.rotation.x = t * (i ? 3 : -3); });
    flame.scale.setScalar(0.3 + Math.sin(t * 13) * 0.02 + Math.sin(t * 7) * 0.02);
    if (tvState.on) {
      if (!tvState.video && t - lastChan > 1 / 15) { lastChan = t; drawChannel(t); }
      tvGlow.material.opacity = 0.32 + Math.sin(t * 3.1) * 0.06;
    }
    // stereo level → cones + glows
    const lvl = stereoState.on ? (stereoState.levelFn ? stereoState.levelFn() : (Math.abs(Math.sin(t * 4.6)) * 0.7)) : 0;
    stereoState.level += (lvl - stereoState.level) * 0.35;
    cones.forEach((c) => c.scale.setScalar(1 + stereoState.level * 0.18));
    coneMat.color.setHSL(0.9, 0.8, 0.12 + stereoState.level * 0.45);
    stereoGlows.forEach((g) => { g.material.opacity = stereoState.on ? 0.2 + stereoState.level * 0.6 : 0; g.material.color.setHSL((0.9 + t * 0.05) % 1, 0.9, 0.55); });
    // phone notification glow
    if (phoneState.count > 0) {
      const p = 0.5 + Math.sin(t * 4) * 0.5;
      phoneScreenMat.color.setHSL(0.9, 0.85, 0.35 + p * 0.25);
      phoneGlow.material.opacity = 0.35 + p * 0.45;
      badge.position.y = 1.0 + Math.sin(t * 3) * 0.04;
    } else { phoneScreenMat.color.set(0x150f1d); phoneGlow.material.opacity = 0; }
    // bath
    if (bathState.on) {
      const dm = new THREE.Matrix4(); const q = new THREE.Quaternion(); const sc3 = new THREE.Vector3(); const p3 = new THREE.Vector3();
      for (let i = 0; i < BUBBLES; i++) {
        const b = bubbleSeeds[i]; const s = b.s * (1 + Math.sin(t * 2 + b.p) * 0.12);
        p3.set(b.x, 0.66 + Math.sin(t * 1.5 + b.p) * 0.02, b.z); sc3.set(s, s * 0.8, s);
        dm.compose(p3, q, sc3); bubbles.setMatrixAt(i, dm);
      }
      bubbles.instanceMatrix.needsUpdate = true;
    }
    animateSteam(tubSteam, bathState.on, t, 1.6, 0.42);
    const brewing = performance.now() < brewState.until;
    animateSteam(coffeeSteam, brewing || performance.now() < brewState.until + 6000, t, 0.7, 0.5);
    if (brewing) {
      const f = (performance.now() - brewState.start) / (brewState.until - brewState.start);
      brewState.level = 0.05 + f * 0.85;
      cmLightMat.color.set(0xff3020); cmGlow.material.opacity = 0.35 + Math.sin(t * 8) * 0.1;
    } else { cmLightMat.color.set(brewState.level > 0.5 ? 0x30ff70 : 0x331010); cmGlow.material.opacity = 0; }
    brew.scale.y = brewState.level; brew.position.y = 0.965 + brewState.level * 0.1;
    if (performance.now() < mwState.until) { mwDoorMat.color.setRGB(1, 0.75 + Math.sin(t * 20) * 0.05, 0.35); } else mwDoorMat.color.set(0x0b0a10);

    // Skate tricks (2.4.20) run last, after walking and following, so a
    // trick owns the rider's position for its duration.
    updateSkate();

    renderer.render(scene, camera);
    placeAnchors();
  }
  function animateSteam(arr, on, t, rise, op) {
    arr.forEach((s) => {
      const u = s.userData;
      const ph = (t * 0.25 + u.p) % 1;
      s.position.set(u.x + Math.sin(t + u.p * 9) * 0.08, u.y + ph * rise, u.z);
      const target = on ? Math.sin(ph * Math.PI) * op : 0;
      s.material.opacity += (target - s.material.opacity) * 0.08;
      s.scale.setScalar(u.size * (0.6 + ph));
      s.visible = s.material.opacity > 0.01;
    });
  }
  const phoneState = { count: 0 };
  const mwState = { until: 0 };
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; clock.getDelta(); tick(); }
  });
  // 2.4.24 Light mode: apply the saved per-device setting from the
  // start (auras + petals off, guests never built) — edge smoothing
  // was already decided when the renderer was made above.
  setLightMode(lightMode);
  tick();

  /* ------------ public API */
  return {
    THREE, scene, camera, renderer,
    hitsAimmiannaAt(x, y) {
      if (!(x >= 0 && x < 1 && y >= 0 && y < 1)) return false;
      const hit = hitAt(x * window.innerWidth, y * window.innerHeight);
      return !!hit && hit.tap === "her";
    },
    setLook: (cv) => avatar.setLook(cv),
    setModelEnabled: (enabled) => avatar.setModelEnabled?.(enabled),
    setModelOutfit: (name) => avatar.setOutfit?.(name),
    setModelWeapon: (name) => avatar.setWeapon?.(name),
    get modelLook() { return { outfit: avatar.outfitApplied || "original", weapon: avatar.weaponApplied || "none", pieces: (avatar.garmentMeshes || []).length + (avatar.weaponMeshes || []).length, shown: avatar.representation }; },
    getModelOutfit: () => avatar.outfitApplied || "original",
    enterLife: (figures) => { if (life) return; setLifeFigures(figures, "living_center"); startLifeView(); },
    leaveLife: () => setLifeFigures(null),
    isLifeActive: () => !!life, // 2.4.22: true while Apartment Life runs (shared Tony hidden meanwhile)
    // 2.4.22 — login-gated guests: rebuild the guest set when the login
    // changes, send one guest walking on their own path, and say who
    // the camera is following (her by default).
    setLoggedIn, walkGuest, getFollowed: () => cam.followWho || "aimmianna",
    // 2.4.23 — live together: remote targets + presence for guests
    // online on other phones, and her remote position from the host.
    // setRemotePresent builds/frees a guest's avatar as they join or
    // leave the live session; setRemoteTarget glides them; setLiveHer
    // drives Aimmianna from the host (null = local control again).
    setRemoteTarget, setRemotePresent, setLiveHer,
    getRemotePresent: () => ({ ...remotePresent }),
    getLiveHer: () => herRemote ? { ...herRemote } : null,
    // 2.4.23: room lookup for the live position stream.
    roomAt,
    moveLifePlayer, moveLifeToSpot,
    getAvatarRepresentation: () => avatar.representation || "portrait",
    getAvatarMotion: () => avatar.motionState || null,
    goToSpot, goToPoint, goToRoom, placeAt,
    // 2.4.23: pos + heading join getHer so the host phone can send her
    // live position (her-pos) to the room.
    getHer: () => ({ room: roomAt(her.pos.x, her.pos.z), spot: her.spot, walking: her.path.length > 0, pose: her.pose, mode: her.mode || "idle", poseOverride: poseOverride && Date.now() < poseOverrideUntil ? poseOverride : null, pos: { x: +her.pos.x.toFixed(2), z: +her.pos.z.toFixed(2) }, heading: +her.heading.toFixed(2) }),
    setPose, clearPose: () => setPose(null),
    // Autumn, the first guest avatar (2.4.13): lives in the shared
    // apartment only. guestEmote plays one of her clips (hug, heart_pose,
    // greet_02, wave_goodbye_02, ...); getGuest reports her live state.
    // 2.4.22: guests arrive lazily, one at a time after the room opens
    // (loadGuestsSequentially) — getGuests reports who is here yet.
    guestEmote, loadGuests: loadGuestsSequentially, getGuests,
    getGuest: () => ({ ready: !!(guestAvatar && guestAvatar.model), failed: !!(guestAvatar && guestAvatar.modelFailed), mode: (guestAvatar && guestAvatar.motion) || null, moving: guest.moving, pos: { x: +guest.pos.x.toFixed(2), z: +guest.pos.z.toFixed(2) }, heading: +guest.heading.toFixed(2) }),
    // Summer, the second guest avatar (2.4.14): same shared-side-only
    // rules as Autumn, 1.78 units (5'5", the anchor of the 2.4.17 balance).
    // Her idle is procedural (no idle clip in her file); greet_04 is
    // her hello wave. setSummerWardrobe / getSummerWardrobe run her
    // goth emo princess wardrobe — outfits, shoes, makeup, hairstyles,
    // hair dye — shared side only, no private wiring of any kind.
    summerEmote,
    getSummer: () => ({ ready: !!(summerAvatar && summerAvatar.model), failed: !!(summerAvatar && summerAvatar.modelFailed), mode: (summerAvatar && summerAvatar.motion) || null, moving: summer.moving, pos: { x: +summer.pos.x.toFixed(2), z: +summer.pos.z.toFixed(2) }, heading: +summer.heading.toFixed(2) }),
    setSummerWardrobe,
    getSummerWardrobe: () => ({ picks: { ...summerWardrobe }, catalogue: SUMMER_WARDROBE }),
    // Aura circles (2.4.19): one glow disc under each of the four
    // shared-apartment figures, always on. Summer's colour follows her
    // outfit pick; the others are fixed signature colours.
    getAuraCircles: () => ({
      aimmianna: { color: aimmiannaAura.material.color.getHex(), visible: aimmiannaAura.visible },
      // 2.4.22: a guest's disc only shows when that guest is actually here
      autumn: { color: autumnAura.material.color.getHex(), visible: !!guestAvatar && autumnAura.visible },
      summer: { color: summerAura.material.color.getHex(), visible: !!summerAvatar && summerAura.visible },
      tony: { color: tonyAura.material.color.getHex(), visible: !!tonyAvatar && tonyAura.visible },
    }),
    // Tony, his own figure in the shared apartment (2.4.15): same
    // shared-side-only rules as the guests, 1.92 units (5'10", tallest of
    // the four in the 2.4.17 balance). His private Game Mode figure (life-figures.js, the
    // older Tony_0_vvq4.glb) is untouched — this slot is the shared side
    // only. greet_01 is his hello wave; his file has a real idle clip,
    // so no procedural idle is needed here.
    tonyEmote,
    getTony: () => ({ ready: !!(tonyAvatar && tonyAvatar.model), failed: !!(tonyAvatar && tonyAvatar.modelFailed), mode: (tonyAvatar && tonyAvatar.motion) || null, moving: tony.moving, pos: { x: +tony.pos.x.toFixed(2), z: +tony.pos.z.toFixed(2) }, heading: +tony.heading.toFixed(2) }),
    // Skate park (2.4.20): skateStart rides (Aimmianna always rides
    // along), skateTrick pops ollie / kickflip / grind / air, skateSetGear
    // applies the saved board or skates design, getSkate reports the
    // session. Riders: "tony", "aimmianna", "autumn", "summer".
    skateStart, skateStop, skatePick, skateTrick, skateSetGear, getSkate,
    // Builder World (2.4.22): shapes are plain specs; the panel owns
    // the approval gate (her builds ask her first) and the saves — the
    // world just builds, moves and stands on them. builderGroundAt is
    // the top of the highest shape under a point, 0 on open ground.
    builderAdd, builderUpdate, builderRemove, builderSetShapes, builderGet,
    builderSelect, builderSetPlacing, builderGroundAt, builderDrive, getBuilder,
    setActivity: (a) => { her.activity = a; },
    setTalking: (on) => { her.talking = !!on; },
    setFollow, setRoomView,
    getCameraMode: () => (cam.mode === "follow" ? "follow" : cam.room),
    requestGyro, applyScreenTilt, gyroOn: () => cam.gyro.on,
    gyroOff() { window.removeEventListener("deviceorientation", onOrient); cam.gyro.on = false; cam.gyro.base = null; cam.gyro.tx = 0; cam.gyro.ty = 0; },
    setPageOffset(x) { cam.page = Math.max(0, Math.min(1, Number(x) || 0.5)); },
    setLowPower(on) { lowPower = !!on; pixelRatio = on ? 1 : Math.min(window.devicePixelRatio || 1, 2); renderer.setPixelRatio(pixelRatio); resize(); },
    // 2.4.24 Light mode — see setLightMode above. Edge smoothing
    // (antialias) is set when the renderer is made, so flipping this
    // on only takes that part effect after a close + reopen.
    setLightMode,
    setAnchors: (els) => { anchors.length = 0; els.forEach((e) => anchors.push(e)); },
    lamp(room, action) {
      const ids = room === "all" ? ROOM_ORDER : [room];
      ids.forEach((id) => {
        const r = roomLights[id]; if (!r) return;
        if (action === "off") r.mode = 0;
        else if (action === "on") r.mode = r.mode || 1;
        else if (action === "warm") r.mode = 1;
        else if (action === "purple") r.mode = 2;
        else if (action === "red") r.mode = 3;
        else r.mode = (r.mode + 1) % LAMP_MODES.length;
        applyLamp(id);
      });
      return LAMP_MODES[roomLights[ids[0]].mode].name;
    },
    lampMode: (room) => LAMP_MODES[roomLights[room].mode].name,
    led(mode) {
      if (mode && LED_COLORS[mode] != null) ledState.mode = mode;
      else ledState.mode = LED_ORDER[(LED_ORDER.indexOf(ledState.mode) + 1) % LED_ORDER.length];
      applyLED(); return ledState.mode;
    },
    ledMode: () => ledState.mode,
    tv(on, videoEl) {
      tvState.on = !!on;
      if (!on) { tvScreen.material = tvOffMat; tvGlow.material.opacity = 0; return; }
      if (videoEl && videoEl.src) {
        if (!tvVideoTex || tvVideoTex.image !== videoEl) {
          if (tvVideoTex) tvVideoTex.dispose();
          tvVideoTex = new THREE.VideoTexture(videoEl); tvVideoTex.colorSpace = THREE.SRGBColorSpace;
          tvVideoMat = new THREE.MeshBasicMaterial({ map: tvVideoTex });
        }
        tvState.video = videoEl; tvScreen.material = tvVideoMat;
      } else { tvState.video = null; drawChannel(0); tvScreen.material = tvChanMat; }
    },
    tvOn: () => tvState.on,
    stereo(on, levelFn) { stereoState.on = !!on; stereoState.levelFn = levelFn || null; },
    stereoOn: () => stereoState.on,
    bath(on) { bathState.on = !!on; bubbles.visible = !!on; waterMat.color.set(on ? 0x8ab8e0 : 0x5aa0d0); },
    bathOn: () => bathState.on,
    brewCoffee(ms) { const now = performance.now(); brewState.start = now; brewState.until = now + (ms || 5000); brewState.level = 0.05; },
    microwave(ms) { mwState.until = performance.now() + (ms || 3000); },
    setPhoneBadge(n) {
      phoneState.count = n;
      badge.visible = n > 0;
      const g = badgeCanvas.getContext("2d"); g.clearRect(0, 0, 64, 64);
      if (n > 0) { g.fillStyle = "#e74c3c"; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#fff"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#fff"; g.font = "700 30px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(n > 9 ? "9+" : String(n), 32, 34); }
      badgeTex.needsUpdate = true;
    },
    // Ritual room FX (2.4.7): fx = { candles: [{lit, burn}...], incense: bool }
    // 2.4.8 adds: herbs {sage, lavender, rosemary, mint} (bowl fill levels)
    // and flare (ms — candle flare + crystal ball glow after a cast).
    ritualFx(fx) {
      if (!fx) return { candles: candleState.map((c) => ({ ...c })), incense: incenseOn };
      if (Array.isArray(fx.candles)) fx.candles.forEach((c, i) => { if (!candleState[i]) return; if (c.lit != null) candleState[i].lit = !!c.lit; if (c.burn != null) candleState[i].burn = Math.max(0, Math.min(100, c.burn)); });
      if (fx.incense != null) incenseOn = !!fx.incense;
      if (fx.herbs) { const order = ["sage", "lavender", "rosemary", "mint"]; order.forEach((h, i) => { const f = bowlFills[i]; if (!f) return; const n = Math.max(0, Math.min(9, fx.herbs[h] || 0)); f.visible = n > 0; f.scale.y = 0.15 + 0.85 * (n / 9); }); }
      if (fx.flare) castFlareUntil = performance.now() + fx.flare;
      applyRitualFx();
      return { candles: candleState.map((c) => ({ ...c })), incense: incenseOn };
    },
    // Yard weather (2.4.7): "auto" (time of day), "clear", "cloudy", "rain"
    setWeather(mode) { if (["auto", "clear", "cloudy", "rain"].indexOf(mode) === -1) mode = "auto"; weatherState.mode = mode; applySky(); return weatherState.mode; },
    getWeather: () => weatherState.mode,
    setLatitude(lat) { weatherState.lat = lat; applySky(); return weatherState.lat; },
    getLatitude: () => weatherState.lat || 0,
    resize
  };
}
