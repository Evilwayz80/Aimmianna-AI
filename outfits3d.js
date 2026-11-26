/* Aimmianna 3D — wardrobe on the 3D model (v2.3.1).
   Every closet outfit has a 3D "recipe":
   - top / bottom / shoes repaint her own clothes on the model's texture
     (a mask marks which bits of the texture are top, bottoms and shoes, and
     skin is always left alone), keeping the original folds and shading;
   - optional real 3D pieces (skirts, dresses, floor gowns, underlayers, lace
     trims, a witch hat, a vampire collar, a belt flashlight) are built here
     and skinned to her skeleton so they move when she walks. */
import * as THREE from "./vendor/three.module.min.js";
const BODY = {"cx":0.005,"cz":0.06,"ys":[0.6,0.58,0.56,0.54,0.52,0.5,0.48,0.46,0.44,0.42,0.4,0.38,0.36,0.34,0.32,0.3],"r":[[0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0],[0.067,0.0,0.0,0.0,0.049,0.0,0.043,0.039,0.039,0.039,0.042,0.042,0.049,0.049,0.056,0.056,0.062,0.066,0.067,0.072,0.076,0.077,0.077,0.078,0.079,0.079,0.08,0.08,0.079,0.075,0.075,0.072],[0.069,0.069,0.065,0.06,0.055,0.051,0.047,0.044,0.042,0.043,0.046,0.048,0.052,0.056,0.059,0.063,0.063,0.064,0.069,0.072,0.073,0.075,0.077,0.078,0.079,0.079,0.078,0.079,0.079,0.076,0.075,0.071],[0.073,0.072,0.067,0.067,0.056,0.056,0.047,0.043,0.042,0.042,0.051,0.051,0.057,0.064,0.065,0.065,0.067,0.069,0.073,0.074,0.077,0.078,0.078,0.079,0.08,0.08,0.08,0.081,0.081,0.079,0.077,0.075],[0.078,0.077,0.073,0.07,0.067,0.066,0.053,0.05,0.048,0.048,0.054,0.063,0.063,0.064,0.069,0.071,0.072,0.074,0.075,0.075,0.075,0.077,0.077,0.079,0.08,0.08,0.079,0.08,0.08,0.08,0.08,0.08],[0.085,0.083,0.075,0.07,0.067,0.063,0.053,0.058,0.058,0.054,0.054,0.063,0.063,0.064,0.068,0.078,0.08,0.08,0.08,0.077,0.075,0.075,0.075,0.076,0.077,0.077,0.078,0.079,0.079,0.081,0.085,0.085],[0.087,0.083,0.088,0.088,0.082,0.077,0.073,0.065,0.064,0.069,0.071,0.077,0.082,0.082,0.082,0.078,0.083,0.084,0.083,0.082,0.076,0.073,0.07,0.066,0.069,0.069,0.066,0.076,0.081,0.087,0.089,0.089],[0.092,0.0,0.089,0.089,0.088,0.083,0.077,0.069,0.066,0.073,0.075,0.081,0.084,0.084,0.084,0.0,0.086,0.086,0.084,0.08,0.068,0.058,0.0,0.057,0.059,0.059,0.056,0.0,0.071,0.083,0.087,0.092],[0.094,0.093,0.093,0.091,0.088,0.086,0.076,0.066,0.066,0.07,0.076,0.081,0.086,0.086,0.088,0.088,0.088,0.088,0.084,0.076,0.067,0.059,0.045,0.053,0.055,0.055,0.052,0.052,0.074,0.079,0.0,0.094],[0.094,0.0,0.0,0.09,0.088,0.083,0.071,0.059,0.049,0.048,0.074,0.08,0.082,0.085,0.0,0.089,0.089,0.088,0.08,0.08,0.067,0.06,0.049,0.037,0.037,0.037,0.043,0.052,0.073,0.073,0.087,0.094],[0.093,0.093,0.089,0.085,0.075,0.063,0.039,0.0,0.0,0.033,0.049,0.066,0.072,0.077,0.0,0.088,0.088,0.086,0.083,0.0,0.0,0.052,0.041,0.029,0.012,0.004,0.042,0.042,0.073,0.082,0.082,0.092],[0.09,0.089,0.0,0.0,0.062,0.062,0.038,0.002,0.015,0.027,0.0,0.061,0.065,0.074,0.083,0.083,0.086,0.086,0.078,0.077,0.064,0.05,0.0,0.012,0.012,0.004,0.041,0.053,0.073,0.082,0.082,0.09],[0.087,0.008,0.08,0.075,0.058,0.058,0.039,0.0,0.0,0.031,0.045,0.057,0.067,0.067,0.002,0.0,0.078,0.078,0.072,0.072,0.065,0.058,0.035,0.0,0.0,0.0,0.0,0.045,0.045,0.073,0.082,0.087],[0.082,0.0,0.01,0.066,0.066,0.026,0.026,0.0,0.0,0.0,0.045,0.053,0.064,0.004,0.0,0.0,0.078,0.075,0.072,0.0,0.049,0.049,0.022,0.0,0.0,0.0,0.0,0.036,0.055,0.066,0.073,0.082],[0.079,0.076,0.011,0.066,0.066,0.052,0.038,0.0,0.0,0.031,0.045,0.045,0.007,0.066,0.0,0.07,0.07,0.004,0.0,0.058,0.053,0.038,0.017,0.0,0.0,0.0,0.0,0.031,0.036,0.066,0.066,0.072],[0.076,0.076,0.073,0.069,0.063,0.04,0.04,0.0,0.0,0.029,0.029,0.0,0.061,0.066,0.069,0.07,0.07,0.066,0.059,0.044,0.044,0.017,0.0,0.0,0.0,0.0,0.0,0.0,0.028,0.039,0.061,0.061]]};

const C = (h) => new THREE.Color(h);
// paint: [color, pattern, color2, shine]
export const OUTFIT_3D = {
  original: null,
  "black-top": { top: ["#121014"] },
  goth_velvet_dress:   { top: ["#17101a", "velvet"], bottom: ["#0d0b0f", "lace", "#3a2c3c"], shoes: ["#0c0b0d"], skirt: { len: "mini", color: "#160f19", folds: 9, trim: "#2a2030" } },
  grunge_flannel:      { top: ["#7a1620", "plaid", "#121012"], bottom: ["#34435f", "ripped"], shoes: ["#151313"] },
  pastel_goth:         { top: ["#e6b3d3", "knit"], bottom: ["#121014", "stripes", "#e8d6ef"], shoes: ["#101012"], skirt: { len: "mini", color: "#c9b4e8", folds: 14, trim: "#121014" } },
  dark_hoodie:         { top: ["#2a2a31", "knit"], bottom: ["#121216"], shoes: ["#121212"] },
  burgundy_dress:      { top: ["#5c1022", "velvet"], bottom: ["#120c10"], shoes: ["#0e0c0d"], skirt: { len: "knee", color: "#5a0f20", folds: 10 } },
  cozy_knit:           { top: ["#d8c4a4", "knit"], bottom: ["#3b3a40"], shoes: ["#5a3d2a"] },
  streetwear:          { top: ["#141416"], bottom: ["#4a4f36", "cargo"], shoes: ["#e9e6e1"] },
  goth_corset:         { top: ["#0f0d10", "corset", "#8c1020"], bottom: ["#0f0d10"], shoes: ["#0c0b0d"], skirt: { len: "gown", color: "#120f12", folds: 12, under: "#8c1020" } },
  lounge_satin:        { top: ["#c98f9c", "satin"], bottom: ["#c98f9c", "satin"], shoes: ["#e7c3cb"] },
  violet_velvet_dress: { top: ["#3d1a5c", "velvet"], bottom: ["#0d0b0f", "lace", "#4b3266"], shoes: ["#0c0b0d"], skirt: { len: "mini", color: "#3a1858", folds: 9, trim: "#1a0e24" } },
  crimson_emo_hoodie:  { top: ["#8e0f1c", "knit"], bottom: ["#111013", "ripped"], shoes: ["#0f0e10"] },
  scene_kid_hoodie:    { top: ["#d41c8c", "knit"], bottom: ["#101012"], shoes: ["#101012", "check", "#efefef"] },
  purple_grunge_flannel: { top: ["#4c1f73", "plaid", "#111014"], bottom: ["#121114", "ripped"], shoes: ["#151313"] },
  violet_corset_gown:  { top: ["#0f0d10", "corset", "#5d2a8f"], bottom: ["#0f0d10"], shoes: ["#0c0b0d"], skirt: { len: "gown", color: "#120f14", folds: 12, under: "#5d2a8f" } },
  lilac_pastel_goth:   { top: ["#c3a6e6", "knit"], bottom: ["#101012", "stripes", "#f2eef5"], shoes: ["#0f0f11"], skirt: { len: "mini", color: "#121014", folds: 12, trim: "#c3a6e6" } },
  midnight_plum_dress: { top: ["#3b1235", "velvet"], bottom: ["#140a13"], shoes: ["#0e0a0d"], skirt: { len: "gown", color: "#3a1134", folds: 11 }, collar: "#e8e0e8" },
  oxblood_knit:        { top: ["#5a1414", "knit"], bottom: ["#0e0c0e", "lace", "#2b1d22"], shoes: ["#6b4a36", "fuzzy"] },
  violet_rose_streetwear: { top: ["#4b2470", "roses", "#c04d8e"], bottom: ["#17161a", "cargo"], shoes: ["#7a3fb4"] },
  gold_trim_satin:     { top: ["#121014", "piping", "#c9a24a"], bottom: ["#121014", "piping", "#c9a24a"], shoes: ["#151316"] },
  witch_moon:          { top: ["#110f14", "moons", "#bfc6d8"], bottom: ["#0d0c10"], shoes: ["#0c0b0d"], skirt: { len: "gown", color: "#141218", folds: 13, under: "#2c2638", ragged: true }, hat: "#141218" },
  vampire_gown:        { top: ["#7a0a14", "velvet"], bottom: ["#120a0c"], shoes: ["#0e0a0b"], skirt: { len: "gown", color: "#750a14", folds: 12, trim: "#1a0b0e" }, collar: "#120a0c" },
  goth_beach:          { top: ["#0d0c0f", "satin"], bottom: ["#dca48e", "fishnet", "#0d0c0f"], shoes: ["#0d0c0f"], skirt: { len: "sarong", color: "#3a2a48", folds: 10, sheer: 0.42 } },
  ghost_hunter:        { top: ["#5a3626", "leather"], bottom: ["#6a6448", "cargo"], shoes: ["#0f0e0e"], flashlight: true }
};
export const hasOutfit3D = (name) => Object.prototype.hasOwnProperty.call(OUTFIT_3D, name);

/* -------------------------------------------------------------- texture */
let maskData = null;
async function loadMask(url) {
  if (maskData) return maskData;
  const img = new Image();
  img.src = url;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d");
  g.drawImage(img, 0, 0);
  maskData = { w: img.width, h: img.height, d: g.getImageData(0, 0, img.width, img.height).data };
  return maskData;
}
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
function pattern(kind, x, y, base, alt, out) {
  // returns [r,g,b] multipliers / colors written to out, plus shine factor
  let c = base, shine = 1;
  switch (kind) {
    case "plaid": {
      const a = (x % 48) < 14, b = (y % 48) < 14, thin = (x % 48) === 30 || (y % 48) === 30;
      c = a && b ? alt : a || b ? mix(base, alt, 0.55) : base;
      if (thin) c = mix(c, [235, 225, 210], 0.35);
      break;
    }
    case "fishnet": c = ((x + y) % 11 < 2 || (x - y + 4096) % 11 < 2) ? alt : base; break;
    case "stripes": c = ((y >> 3) & 1) ? alt : base; break;
    case "check": c = (((x >> 4) + (y >> 4)) & 1) ? alt : base; break;
    case "lace": { const hole = ((x % 9) - 4) ** 2 + ((y % 9) - 4) ** 2 < 6; c = hole ? alt : base; break; }
    case "knit": shine = 0.82 + 0.3 * Math.abs(Math.sin(x * 0.9)) ; break;
    case "velvet": shine = 0.85 + 0.25 * hash(x >> 1, y >> 1); break;
    case "satin": shine = 1.15 + 0.25 * Math.sin((x + y) * 0.05); break;
    case "leather": shine = 1.05 + 0.2 * Math.sin(x * 0.04) * Math.sin(y * 0.05); break;
    case "fuzzy": shine = 0.7 + 0.6 * hash(x, y); break;
    case "cargo": shine = (y % 64) < 2 ? 0.6 : 1; break;
    case "ripped": { const r = hash(x >> 4, y >> 3); if (r > 0.95 && ((x & 15) > 3) && ((y & 7) > 1)) { out[3] = 1; return; } shine = 0.85 + 0.3 * hash(x >> 2, y); break; }
    case "corset": c = (x % 24) < 3 ? alt : (y % 18) < 2 ? mix(base, alt, 0.5) : base; break;
    case "roses": { const r = hash(x >> 5, y >> 5), dx = (x & 31) - 16, dy = (y & 31) - 16; if (r > 0.7 && dx * dx + dy * dy < 60) c = alt; break; }
    case "moons": { const r = hash(x >> 5, y >> 5), dx = (x & 31) - 16, dy = (y & 31) - 16; if (r > 0.75 && dx * dx + dy * dy < 40 && (dx + 3) ** 2 + dy * dy > 30) c = alt; break; }
    case "piping": c = (x % 40) < 2 || (y % 56) < 2 ? alt : base; shine = 1.15; break;
    default: break;
  }
  out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; out[3] = 0; out[4] = shine;
}
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = (hex) => { const c = C(hex); return [c.r * 255, c.g * 255, c.b * 255]; };
const SKIN = [218, 160, 138];
const isSkin = (r, g, b) => r > 90 && g > 50 && r > g && g > b && r - g < 100 && g - b > 8;
const MEDIAN = [32, 27, 20];

export async function buildOutfitTexture(originalTexture, spec, maskUrl) {
  const src = originalTexture.image;
  const w = src.width, h = src.height;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const g = canvas.getContext("2d", { willReadFrequently: true });
  g.drawImage(src, 0, 0, w, h);
  const img = g.getImageData(0, 0, w, h), d = img.data;
  const mask = await loadMask(maskUrl);
  const sx = mask.w / w, sy = mask.h / h;
  const parts = [spec.top, spec.bottom, spec.shoes].map((p) => p && {
    base: p[0] === "skin" ? SKIN : rgb(p[0]), kind: p[0] === "skin" ? "skin" : p[1] || "solid", alt: p[2] ? rgb(p[2]) : null
  });
  const out = [0, 0, 0, 0, 1];
  for (let y = 0; y < h; y++) {
    const my = Math.min(mask.h - 1, (y * sy) | 0) * mask.w;
    for (let x = 0; x < w; x++) {
      const mi = (my + Math.min(mask.w - 1, (x * sx) | 0)) * 4;
      const k = mask.d[mi + 2] > 127 ? 2 : mask.d[mi + 1] > 127 ? 1 : mask.d[mi] > 127 ? 0 : -1;
      if (k < 0 || !parts[k]) continue;
      const i = (y * w + x) * 4, r = d[i], gg = d[i + 1], b = d[i + 2];
      if (isSkin(r, gg, b)) continue;
      const p = parts[k];
      const L = 0.3 * r + 0.59 * gg + 0.11 * b;
      let shade = Math.pow(Math.min(1.7, Math.max(0.35, L / MEDIAN[k])), p.kind === "fishnet" ? 0.15 : 0.55);
      if (p.kind === "skin") { shade = 0.9 + 0.12 * Math.pow(Math.min(1.6, Math.max(0.6, L / MEDIAN[k])), 0.5) - 0.12; d[i] = SKIN[0] * shade; d[i + 1] = SKIN[1] * shade; d[i + 2] = SKIN[2] * shade; continue; }
      pattern(p.kind, x, y, p.base, p.alt || p.base, out);
      if (out[3]) { d[i] = SKIN[0] * 0.95; d[i + 1] = SKIN[1] * 0.95; d[i + 2] = SKIN[2] * 0.95; continue; }
      shade *= out[4];
      // dark colours still need a little lift so seams and folds read
      d[i] = Math.min(255, out[0] * shade + 6 * shade);
      d[i + 1] = Math.min(255, out[1] * shade + 6 * shade);
      d[i + 2] = Math.min(255, out[2] * shade + 6 * shade);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  for (const key of ["colorSpace", "flipY", "magFilter", "minFilter", "wrapS", "wrapT", "anisotropy", "channel"]) tex[key] = originalTexture[key];
  tex.needsUpdate = true;
  return tex;
}

/* -------------------------------------------------------------- garments */
const LEN = { mini: 0.355, knee: 0.25, gown: 0.03, sarong: 0.2 };
const FLARE = { mini: 0.05, knee: 0.07, gown: 0.16, sarong: 0.04 };
function bodyRadius(angleIndex, yTop, yLow) {
  let r = 0;
  BODY.ys.forEach((y, row) => {
    if (y <= yTop + 0.001 && y >= yLow - 0.001) {
      for (const di of [-1, 0, 1]) r = Math.max(r, BODY.r[row][(angleIndex + di + 32) % 32]);
    }
  });
  return r || 0.08;
}
function boneIndex(skeleton, name) {
  const i = skeleton.bones.findIndex((b) => b.name === name || b.name.replace(/[^A-Za-z0-9_]/g, "") === name);
  return Math.max(0, i);
}
function skinned(base, geometry, material) {
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.position.copy(base.position); mesh.quaternion.copy(base.quaternion); mesh.scale.copy(base.scale);
  mesh.bind(base.skeleton, base.bindMatrix);
  mesh.frustumCulled = false;
  mesh.userData.tap = "her";
  return mesh;
}
function clothMaterial(hex, opts = {}) {
  const c = C(hex);
  return new THREE.MeshStandardMaterial({
    color: c, roughness: opts.shine ? 0.45 : 0.85, metalness: 0, side: THREE.DoubleSide,
    emissive: c.clone().multiplyScalar(0.55), transparent: !!opts.opacity, opacity: opts.opacity || 1,
    depthWrite: !opts.opacity
  });
}

function skirtGeometry(skeleton, opt) {
  const hip = boneIndex(skeleton, "Hip"), lt = boneIndex(skeleton, "L_Thigh"), rt = boneIndex(skeleton, "R_Thigh");
  const yTop = opt.yTop ?? 0.535, yLow = opt.yLow, A = 64, R = opt.rows ?? 14;
  const cx = BODY.cx, cz = BODY.cz;
  const pos = [], uv = [], si = [], sw = [], idx = [];
  const hipMax = []; for (let a = 0; a < 32; a++) hipMax.push(bodyRadius(a, yTop, Math.max(0.36, yLow)));
  const from = opt.from || 0, shell = opt.shell || 1;
  for (let row = 0; row <= R; row++) {
    const t = from + (1 - from) * row / R, y = yTop + (yLow - yTop) * t;
    for (let a = 0; a <= A; a++) {
      const th = -Math.PI + 2 * Math.PI * (a % A) / A;
      const ai = Math.round((a % A) / 2) % 32;
      const fit = bodyRadius(ai, yTop, Math.max(y, 0.36));
      const top = hipMax[ai];
      let r = Math.max(fit, t * top + (1 - t) * fit) + 0.010 + opt.flare * Math.pow(t, 1.4) + (opt.extra || 0);
      r += Math.sin(th * opt.folds) * 0.006 * (0.2 + t);           // soft folds
      let yy = y;
      if (opt.ragged && row === R) yy += (Math.abs(Math.sin(th * 7)) - 0.5) * 0.05;
      if (opt.slit && row > R * 0.4) { const s = Math.cos(th - 0.6); yy += Math.max(0, s - 0.6) * 0.25 * t; }
      r = r * shell + (shell > 1 ? 0.002 : 0);
      pos.push(cx + Math.cos(th) * r, yy, cz + Math.sin(th) * r);
      uv.push(a / A, t);

      const legs = Math.min(opt.legMax, Math.max(0, (0.47 - y) / 0.17));
      const side = Math.min(1, Math.max(0, 0.5 + Math.cos(th) * 0.9)); // +x is her left leg
      si.push(hip, lt, rt, 0);
      sw.push(1 - legs, legs * side, legs * (1 - side), 0);
    }
  }
  for (let row = 0; row < R; row++) for (let a = 0; a < A; a++) {
    const i = row * (A + 1) + a, j = i + A + 1;
    idx.push(i, j, i + 1, i + 1, j, j + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

function rigidGeometry(skeleton, boneName, geo) {
  const b = boneIndex(skeleton, boneName), n = geo.attributes.position.count;
  geo.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(new Array(n * 4).fill(0).map((_, k) => (k % 4 ? 0 : b)), 4));
  geo.setAttribute("skinWeight", new THREE.Float32BufferAttribute(new Array(n * 4).fill(0).map((_, k) => (k % 4 ? 0 : 1)), 4));
  return geo;
}

export function buildGarments(base, spec) {
  const list = [];
  if (!spec || !base?.isSkinnedMesh) return list;
  const sk = base.skeleton;
  if (spec.skirt) {
    const s = spec.skirt, yLow = LEN[s.len] ?? 0.35, flare = FLARE[s.len] ?? 0.05;
    const legMax = s.len === "gown" ? 0.55 : 0.9;
    if (s.under) list.push(skinned(base, skirtGeometry(sk, { yLow: yLow - 0.005, flare: flare * 0.85, folds: s.folds + 3, legMax, extra: -0.004, yTop: 0.47 }), clothMaterial(s.under)));
    list.push(skinned(base, skirtGeometry(sk, { yLow: s.under ? yLow + 0.06 : yLow, flare, folds: s.folds, legMax, ragged: s.ragged, slit: s.len === "sarong", rows: s.len === "gown" ? 20 : 12 }),
      clothMaterial(s.color, { opacity: s.sheer })));
    const mainOpt = { yLow: s.under ? yLow + 0.06 : yLow, flare, folds: s.folds, legMax, ragged: s.ragged, slit: s.len === "sarong", rows: s.len === "gown" ? 20 : 12 };
    if (s.trim) list.push(skinned(base, skirtGeometry(sk, { ...mainOpt, from: s.len === "gown" ? 0.93 : 0.82, shell: 1.025, rows: 3 }), clothMaterial(s.trim)));
  }
  if (spec.hat) {
    const g = new THREE.Group();
    const brim = new THREE.CylinderGeometry(0.21, 0.215, 0.012, 40);
    brim.translate(0.005, 0.935, 0.05);
    const cone = new THREE.ConeGeometry(0.115, 0.27, 32, 6, true);
    // bend the tip back a little, witch-style
    const p = cone.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = Math.max(0, p.getY(i) + 0.135); p.setZ(i, p.getZ(i) - Math.pow(y / 0.27, 2.2) * 0.07); p.setX(i, p.getX(i) + Math.pow(y / 0.27, 3) * 0.02); }
    cone.translate(0.005, 0.935 + 0.135, 0.05);
    const band = new THREE.CylinderGeometry(0.113, 0.116, 0.03, 32, 1, true);
    band.translate(0.005, 0.955, 0.05);
    for (const [geo, col] of [[brim, spec.hat], [cone, spec.hat], [band, "#5d2a8f"]]) {
      geo.computeVertexNormals();
      list.push(skinned(base, rigidGeometry(sk, "Head", geo), clothMaterial(col)));
    }
  }
  if (spec.collar) {
    const geo = new THREE.CylinderGeometry(0.085, 0.06, 0.075, 36, 1, true, Math.PI * 0.15, Math.PI * 1.7);
    geo.rotateY(Math.PI / 2);
    geo.translate(0.006, 0.745, 0.035);
    list.push(skinned(base, rigidGeometry(sk, "Spine02", geo), clothMaterial(spec.collar, { opacity: 0.9 })));
  }
  if (spec.flashlight) {
    const body = new THREE.CylinderGeometry(0.013, 0.013, 0.09, 14);
    body.translate(-0.088, 0.45, 0.08);
    const head = new THREE.CylinderGeometry(0.019, 0.014, 0.025, 14);
    head.translate(-0.088, 0.395, 0.08);
    const lens = new THREE.CircleGeometry(0.017, 14);
    lens.rotateX(Math.PI / 2); lens.translate(-0.088, 0.382, 0.08);
    list.push(skinned(base, rigidGeometry(sk, "Hip", body), clothMaterial("#2b2b2e", { shine: true })));
    list.push(skinned(base, rigidGeometry(sk, "Hip", head), clothMaterial("#3a3a3e", { shine: true })));
    const lm = clothMaterial("#fff6c8"); lm.emissive.set("#fff2b0"); lm.emissiveIntensity = 1.2;
    list.push(skinned(base, rigidGeometry(sk, "Hip", lens), lm));
  }
  return list;
}

/* -------------------------------------------------------------- weapons
   Fantasy weapons for adventure role-play. Each one is held in her hand
   (skinned to the hand bone) so it swings with her when she walks. */
export const WEAPONS_3D = {
  none:    { label: "No weapon" },
  sword:   { label: "Moonsteel Sword", desc: "A silver longsword with a violet moonstone" },
  dagger:  { label: "Vampire Dagger", desc: "Short black blade with a blood-red edge" },
  staff:   { label: "Witch Staff", desc: "Dark wood staff topped with a glowing amethyst" },
  wand:    { label: "Spell Wand", desc: "Bone-white wand with a star-bright tip" },
  scythe:  { label: "Reaper Scythe", desc: "Tall shadow scythe with a moon-curved blade" },
  bow:     { label: "Nightshade Bow", desc: "Black recurve bow strung with silver" }
};
export const hasWeapon3D = (name) => Object.prototype.hasOwnProperty.call(WEAPONS_3D, name);
function metal(hex, glow) {
  const c = C(hex);
  return new THREE.MeshStandardMaterial({ color: c, metalness: 0.1, roughness: 0.35, emissive: C(glow || hex).multiplyScalar(glow ? 0.9 : 0.45) });
}
export function buildWeapon(base, name) {
  const list = [];
  if (!base?.isSkinnedMesh || !name || name === "none" || !hasWeapon3D(name)) return list;
  const sk = base.skeleton;
  const right = name !== "bow";
  const gx = right ? -0.118 : 0.12, gy = 0.405, gz = 0.075;  // where her fist closes
  const bone = right ? "R_Hand" : "L_Hand";
  const add = (geo, mat) => { geo.computeVertexNormals(); list.push(skinned(base, rigidGeometry(sk, bone, geo), mat)); };
  const at = (geo, x, y, z) => { geo.translate(gx + x, gy + y, gz + z); return geo; };
  if (name === "sword" || name === "dagger") {
    const long = name === "sword", bladeLen = long ? 0.32 : 0.15;
    const bladeCol = long ? "#d9dde6" : "#1a1416", edge = long ? "#b49bff" : "#9c0c1a";
    add(at(new THREE.CylinderGeometry(0.008, 0.008, 0.055, 10), 0, 0, 0), metal("#2a1c22"));
    add(at(new THREE.BoxGeometry(long ? 0.07 : 0.045, 0.009, 0.014), 0, -0.032, 0), metal("#c9a24a"));
    add(at(new THREE.SphereGeometry(0.011, 12, 8), 0, 0.033, 0), metal(long ? "#8a5cff" : "#9c0c1a", long ? "#6a3cff" : "#70000c"));
    const blade = new THREE.CylinderGeometry(0.0025, long ? 0.013 : 0.011, bladeLen, 4, 1);
    blade.scale(1, 1, 0.35);
    add(at(blade, 0, -0.037 - bladeLen / 2, 0), metal(bladeCol));
    const e = new THREE.CylinderGeometry(0.001, long ? 0.004 : 0.004, bladeLen * 0.96, 4, 1);
    add(at(e, 0, -0.037 - bladeLen / 2, 0.003), metal(edge, edge));
  } else if (name === "staff" || name === "scythe") {
    const top = name === "staff" ? 0.5 : 0.56, bottom = -0.385;
    add(at(new THREE.CylinderGeometry(0.0105, 0.0105, top - bottom, 10), 0, (top + bottom) / 2, 0), metal(name === "staff" ? "#6b4428" : "#3a3440"));
    if (name === "staff") {
      add(at(new THREE.OctahedronGeometry(0.03, 0).scale(1, 1.5, 1), 0, top + 0.04, 0), metal("#a066ff", "#8040ff"));
      for (const a of [0, 2.1, 4.2]) add(at(new THREE.TorusGeometry(0.025, 0.003, 6, 12, Math.PI).rotateY(a), 0, top + 0.005, 0), metal("#c9a24a"));
    } else {
      const blade = new THREE.TorusGeometry(0.16, 0.012, 4, 24, Math.PI * 0.62);
      blade.scale(1, 1, 0.25); blade.rotateZ(-Math.PI * 0.12); blade.rotateY(-Math.PI / 2);
      add(at(blade, -0.01, top - 0.16, 0), metal("#cfd4de", "#5a5f70"));
    }
  } else if (name === "wand") {
    const w = new THREE.CylinderGeometry(0.003, 0.006, 0.17, 8); w.rotateX(Math.PI / 2);
    add(at(w, 0, -0.01, 0.07), metal("#efe6d4"));
    add(at(new THREE.SphereGeometry(0.011, 12, 8), 0, -0.01, 0.16), metal("#fff6c8", "#fff0a0"));
  } else if (name === "bow") {
    const arc = new THREE.TorusGeometry(0.22, 0.006, 6, 30, Math.PI * 0.8);
    arc.rotateZ(-Math.PI * 0.4); arc.rotateY(-Math.PI / 2);
    add(at(arc, 0, 0, -0.22), metal("#3a2a40"));
    const s = new THREE.CylinderGeometry(0.0012, 0.0012, 2 * 0.22 * Math.sin(Math.PI * 0.4), 4);
    add(at(s, 0, 0, -0.22 + 0.22 * Math.cos(Math.PI * 0.4)), metal("#e6e8ee"));
  }
  return list;
}
