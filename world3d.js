/* Aimmianna 3D — the gothic apartment.
   Four connected rooms laid out as a cut-away dollhouse (no front wall, short
   partition stubs) so the camera can glide anywhere without walls blocking
   her. Everything is low-poly boxes/cylinders, Lambert materials, four point
   lights, no shadow maps (a soft blob shadow sits under her instead), and an
   adaptive pixel ratio — tuned to hold 60fps on iPhone Safari.

   The avatar is a separate class (BillboardAvatar). To upgrade to a full 3D
   model later, write a class with the same small interface
   (object3d, setLook(canvas), update(dt, t, camera, pose), headHeight,
   pickMesh) and pass it in createWorld({ avatarFactory }). */
import * as THREE from "./vendor/three.module.min.js";

/* ------------------------------------------------------------------ layout */
export const ROOMS = {
  bedroom:  { id: "bedroom",  label: "Bedroom",     x0: -14, x1: -6 },
  living:   { id: "living",   label: "Living Room", x0: -6,  x1: 4 },
  kitchen:  { id: "kitchen",  label: "Kitchen",     x0: 4,   x1: 10 },
  bathroom: { id: "bathroom", label: "Bathroom",    x0: 10,  x1: 15 }
};
const ROOM_ORDER = ["bedroom", "living", "kitchen", "bathroom"];
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
  kitchen_table:  { room: "kitchen",  x: 6.0,   z: 0.35 },
  tub:            { room: "bathroom", x: 12.0,  z: -3.2, pose: "bath" },
  sink:           { room: "bathroom", x: 14.1,  z: -2.65 },
  bath_center:    { room: "bathroom", x: 12.5,  z: 0.7 }
};
export const ROOM_SPOTS = {
  bedroom: ["bedside", "vanity", "nightstand", "bedroom_center", "bed"],
  living: ["couch", "pc", "stereo", "rug", "living_center", "tv"],
  kitchen: ["coffee", "fridge", "counter", "kitchen_table"],
  bathroom: ["sink", "bath_center", "tub"]
};
export function roomAt(x) {
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
    this.height = 1.78;
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

/* ================================================================= WORLD */
export function createWorld(opts) {
  const canvas = opts.canvas;
  const onTap = opts.onTap || (() => {});
  const onArrive = opts.onArrive || (() => {});
  const onRoomChange = opts.onRoomChange || (() => {});

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1100);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance", alpha: false });
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
    bathroom: { pos: [12.6, 2.5, -1.5], base: 13, def: 2 }
  };
  for (const id of ROOM_ORDER) {
    const d = lampDefs[id];
    const L = new THREE.PointLight(0xffffff, d.base, 11, 1.25);
    L.position.set(d.pos[0], d.pos[1], d.pos[2]);
    scene.add(L);
    roomLights[id] = { light: L, mode: d.def, base: d.base, shades: [], glows: [] };
  }

  /* ------------ shell: floors, walls, partitions */
  const floorTex = {
    bedroom: carpet(), living: planks("#2b1a14", "#24150f"),
    kitchen: checker("#1b1418", "#4a1420", 8), bathroom: checker("#d6d0da", "#26222c", 10)
  };
  const wallTex = {
    bedroom: damask("#1e0f26", "rgba(150,80,190,0.18)"), living: damask("#1a0f15", "rgba(212,175,55,0.12)"),
    kitchen: damask("#17121c", "rgba(192,57,43,0.12)"), bathroom: damask("#131620", "rgba(160,140,220,0.16)")
  };
  // dollhouse base slab with a gold lip along the front edge
  box(29.4, 0.3, 7.8, mat.trim, 0.5, -0.15, (Z_BACK + Z_FRONT) / 2);
  box(29.4, 0.04, 0.05, mat.gold, 0.5, 0.0, Z_FRONT + 0.0);
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
  const sideR = new THREE.Mesh(new THREE.PlaneGeometry(Z_FRONT - Z_BACK, WALL_H), new THREE.MeshLambertMaterial({ map: wallTex.bathroom }));
  sideR.rotation.y = -Math.PI / 2; sideR.position.set(15, WALL_H / 2, (Z_BACK + Z_FRONT) / 2); scene.add(sideR);
  box(0.06, 0.9, Z_FRONT - Z_BACK, mat.trim, -13.97, 0.45, (Z_BACK + Z_FRONT) / 2);
  box(0.06, 0.9, Z_FRONT - Z_BACK, mat.trim, 14.97, 0.45, (Z_BACK + Z_FRONT) / 2);
  // partition stubs with gothic arch tops (pointed cap)
  for (const x of [-6, 4, 10]) {
    const len = 3.4;
    box(0.16, WALL_H, len, mat.black, x, WALL_H / 2, Z_BACK + len / 2);
    box(0.2, 0.08, len, mat.gold, x, WALL_H - 0.04, Z_BACK + len / 2);
    const post = box(0.26, WALL_H, 0.26, mat.blackGloss, x, WALL_H / 2, Z_BACK + len);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 4), mat.gold);
    cap.position.set(x, WALL_H + 0.2, Z_BACK + len); scene.add(cap);
  }

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
    r.light.color.set(mode.i ? mode.color : 0xffffff);
    r.light.intensity = mode.i ? r.base : 0;
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
  const avatar = (opts.avatarFactory ? opts.avatarFactory(THREE, { shadowTexture: SHADOW }) : new BillboardAvatar(SHADOW));
  scene.add(avatar.object3d);
  avatar.pickMesh.userData.tap = "her"; tappables.push(avatar.pickMesh);
  const her = {
    pos: new THREE.Vector3(SPOTS.living_center.x, 0, SPOTS.living_center.z),
    path: [], speed: 1.55, spot: "living_center", pose: null, activity: "vibe",
    talking: false, room: "living", moveDir: 0, arriveCb: null
  };
  avatar.object3d.position.copy(her.pos);

  function planPath(tx, tz) {
    const pts = [];
    const sameRoom = roomAt(her.pos.x) === roomAt(tx) && Math.abs(her.pos.x - tx) < 4.5;
    if (!sameRoom) {
      if (her.pos.z < HALL_Z - 0.2) pts.push(new THREE.Vector3(her.pos.x, 0, HALL_Z));
      pts.push(new THREE.Vector3(tx, 0, HALL_Z));
    } else if (her.pose === "sit" || her.pose === "lie" || her.pose === "bath") {
      // step out of the couch/bed/tub first
      pts.push(new THREE.Vector3(her.pos.x + (her.pose === "lie" ? 2.2 : 0), 0, Math.max(her.pos.z, -1.0) + 0.9));
    }
    pts.push(new THREE.Vector3(tx, 0, tz));
    return pts;
  }
  function goToSpot(name) {
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
    x = Math.max(-13.5, Math.min(14.5, x)); z = Math.max(-2.9, Math.min(3.0, z));
    if (her.arriveCb) her.arriveCb(false);
    her.path = planPath(x, z); her.pendingSpot = null; her.pose = null;
    return new Promise((resolve) => { her.arriveCb = resolve; });
  }
  function goToRoom(room) {
    const list = ROOM_SPOTS[room]; if (!list) return Promise.resolve(false);
    const main = { bedroom: "bedroom_center", living: "living_center", kitchen: "counter", bathroom: "bath_center" }[room];
    return goToSpot(main);
  }
  function placeAt(name) {
    const s = SPOTS[name]; if (!s) return;
    her.pos.set(s.x, 0, s.z); her.path = []; her.spot = name; her.pose = s.pose || null; her.room = s.room;
    avatar.object3d.position.copy(her.pos);
  }

  /* ------------ camera rig */
  const cam = {
    mode: "follow", room: null,
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
      const head = avatar.object3d.position;
      const lift = her.pose === "lie" ? 0.6 : her.pose === "bath" ? 0.5 : her.pose === "sit" ? 0.7 : 1.0;
      cam.wantLook.set(head.x, lift, head.z - 0.4);
      // tall phone screens: closer and looking a bit more down, so the floor fills
      // the bottom of the screen instead of empty space in front of the dollhouse
      const dist = (portrait ? 5.0 : 5.8) * cam.zoom;
      const el = (portrait ? 0.5 : 0.34) + cam.pitch;
      const yaw = cam.yaw + (cam.page - 0.5) * 0.6; // live wallpaper: home-screen pages pan the view
      cam.wantPos.set(head.x + Math.sin(yaw) * dist * Math.cos(el), lift + Math.sin(el) * dist + 0.4, head.z + Math.cos(yaw) * dist * Math.cos(el));
    } else {
      const r = ROOMS[cam.room]; const cx = (r.x0 + r.x1) / 2; const W = r.x1 - r.x0;
      const vfov = THREE.MathUtils.degToRad(camera.fov);
      const hfovHalf = Math.atan(Math.tan(vfov / 2) * aspect);
      const fitW = W * (portrait ? 0.7 : 0.98);
      let dist = Math.max((fitW / 2) / Math.tan(hfovHalf), 2.4 / Math.tan(vfov / 2));
      dist = Math.min(dist, portrait ? 15 : 13) * cam.zoom;
      cam.wantLook.set(cx, 1.05, -1.6);
      const el = (portrait ? 0.48 : 0.3) + cam.pitch;
      cam.wantPos.set(cx + Math.sin(cam.yaw) * dist * Math.cos(el), 1.05 + Math.sin(el) * dist, -1.6 + Math.cos(cam.yaw) * dist * Math.cos(el));
    }
  }
  function setFollow() { cam.mode = "follow"; cam.room = null; cam.yaw = 0; cam.pitch = 0; cam.zoom = 1; }
  function setRoomView(room) { if (!ROOMS[room]) return; cam.mode = "room"; cam.room = room; cam.yaw = 0; cam.pitch = 0; cam.zoom = 1; }

  /* gyro parallax */
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    let b = e.beta, g = e.gamma;
    const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    if (ang === 90) { const t = b; b = -g; g = t; } else if (ang === -90 || ang === 270) { const t = b; b = g; g = -t; }
    if (!cam.gyro.base) cam.gyro.base = { b, g };
    // baseline slowly drifts toward how you're holding the phone
    cam.gyro.base.b += (b - cam.gyro.base.b) * 0.004;
    cam.gyro.base.g += (g - cam.gyro.base.g) * 0.004;
    const clamp = (v) => Math.max(-25, Math.min(25, v));
    cam.gyro.tx = clamp(g - cam.gyro.base.g) / 25;
    cam.gyro.ty = clamp(b - cam.gyro.base.b) / 25;
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

  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(tappables, false);
    for (const h of hits) {
      const tap = h.object.userData.tap;
      if (!tap) continue;
      if (tap === "her") {
        // only count her if the hit pixel is actually opaque-ish (crude: middle 70% of the card)
        const u = h.uv; if (u && (u.x < 0.18 || u.x > 0.82)) continue;
      }
      onTap(tap, { point: h.point, x: cx, y: cy });
      return;
    }
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
    if (her.path.length) {
      const target = her.path[0];
      tmp.subVectors(target, her.pos); tmp.y = 0;
      const d = tmp.length();
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
    avatar.object3d.position.copy(her.pos);
    const nowRoom = roomAt(her.pos.x);
    if (nowRoom !== lastRoom) { lastRoom = nowRoom; her.room = nowRoom; onRoomChange(nowRoom); }

    // pose resolution
    let mode;
    if (her.path.length) mode = "walk";
    else if (her.pose === "lie" || her.pose === "bath" || her.pose === "sit") mode = her.pose;
    else if (stereoState.on) mode = "dance";
    else if (her.talking) mode = "talk";
    else mode = her.activity || "idle";
    const lamp = roomLights[nowRoom];
    const lit = LAMP_MODES[lamp.mode].i ? 1 : 0.72;
    avatar.update(dt, t, camera, { mode, moveDir: her.moveDir, brightness: lit });

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
  tick();

  /* ------------ public API */
  return {
    THREE, scene, camera, renderer,
    setLook: (cv) => avatar.setLook(cv),
    goToSpot, goToPoint, goToRoom, placeAt,
    getHer: () => ({ room: roomAt(her.pos.x), spot: her.spot, walking: her.path.length > 0, pose: her.pose }),
    setActivity: (a) => { her.activity = a; },
    setTalking: (on) => { her.talking = !!on; },
    setFollow, setRoomView,
    getCameraMode: () => (cam.mode === "follow" ? "follow" : cam.room),
    requestGyro, gyroOn: () => cam.gyro.on,
    gyroOff() { window.removeEventListener("deviceorientation", onOrient); cam.gyro.on = false; cam.gyro.tx = 0; cam.gyro.ty = 0; },
    setPageOffset(x) { cam.page = Math.max(0, Math.min(1, Number(x) || 0.5)); },
    setLowPower(on) { lowPower = !!on; pixelRatio = on ? 1 : Math.min(window.devicePixelRatio || 1, 2); renderer.setPixelRatio(pixelRatio); resize(); },
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
    resize
  };
}
