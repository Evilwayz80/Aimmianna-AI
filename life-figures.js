import { OUTFITS, MARKET_COLORS, TONY_HOODIES } from "./life-rules.js";

// Tony's own Tripo avatar — his character in the Life Lab. It loads in the
// background; the built-in figure shows until it arrives (and if it fails).
const PLAYER_MODEL_URL = new URL("./assets/models/Tony_0_vvq4.glb", import.meta.url).href;
const PLAYER_HEIGHT = 1.7; // the built-in figure stands ~1.7 units tall

export const SKIN = [0xf5d4bd, 0xe4b496, 0xc48b68, 0xae704d, 0x80533f, 0x503328];
export const HAIR = [0x282225, 0x573a2b, 0x27242a, 0xb48955, 0x6c292b];

export function makeLifeFigures(T) {
  const root = new T.Group();
  root.name = "PrivateLifeSim";
  root.visible = false;
  const player = new T.Group();
  player.name = "LifeSimPlayer";
  root.add(player);
  const figure = new T.Group(); player.add(figure);
  figure.rotation.y = 0;
  const mat = (color) => new T.MeshLambertMaterial({ color });
  const skin = mat(SKIN[2]), hair = mat(HAIR[0]), jacket = mat(0x54546d), pants = mat(0x222336);
  const trim = mat(0xcb9f9c), sole = mat(0x171619), eye = mat(0x201821), eyeLight = mat(0xf6e9d9);
  const ellipsoid = new T.SphereGeometry(1, 16, 12);
  const cube = new T.BoxGeometry(1, 1, 1);
  const tube = new T.CylinderGeometry(1, 0.82, 1, 12);
  function mesh(g, m, x, y, z, a, b, c, parent) {
    const p = new T.Mesh(g, m);
    p.position.set(x, y, z); p.scale.set(a, b, c);
    parent.add(p);
    return p;
  }
  const orb = (m, x, y, z, a, b, c, parent = figure) => mesh(ellipsoid, m, x, y, z, a, b, c, parent);
  const box = (m, x, y, z, a, b, c, parent = figure) => mesh(cube, m, x, y, z, a, b, c, parent);
  const limb = (m, x, y, z, a, b, c, parent = figure) => mesh(tube, m, x, y, z, a, b, c, parent);
  orb(jacket, 0, 1.02, 0, .207, .32, .113);
  orb(pants, 0, .78, -.004, .175, .105, .10);
  limb(skin, 0, 1.30, .004, .066, .13, .067);
  orb(skin, 0, 1.491, 0, .149, .199, .134);
  orb(skin, 0, 1.47, .125, .023, .035, .033);
  orb(eye, 0, 1.411, .123, .038, .008, .009);
  const hairstyles = [new T.Group(), new T.Group(), new T.Group()];
  hairstyles.forEach((g) => figure.add(g));
  orb(hair, 0, 1.596, -.029, .152, .105, .134, hairstyles[0]);
  orb(hair, -.045, 1.601, .065, .104, .075, .087, hairstyles[0]).rotation.z = .30;
  orb(hair, 0, 1.572, -.023, .153, .105, .129, hairstyles[1]);
  orb(hair, 0, 1.594, -.029, .156, .115, .14, hairstyles[2]);
  orb(hair, 0, 1.486, -.080, .157, .182, .090, hairstyles[2]);
  const seam = box(trim, 0, 1.02, .115, .012, .42, .008);
  const panel = box(trim, 0, 1.13, .105, .292, .037, .014);
  const arms = [], legs = [];
  for (const sign of [-1, 1]) {
    orb(skin, sign * .145, 1.48, -.004, .025, .047, .028);
    orb(eyeLight, sign * .057, 1.507, .119, .029, .017, .012);
    orb(eye, sign * .055, 1.507, .128, .010, .012, .005);
    box(hair, sign * .054, 1.538, .122, .058, .011, .012).rotation.z = sign * .08;
    const arm = new T.Group();
    arm.position.set(sign * .183, 1.232, 0); arm.rotation.z = sign * .12;
    orb(jacket, sign * .01, -.105, 0, .063, .15, .069, arm);
    limb(skin, 0, -.269, 0, .046, .21, .05, arm);
    orb(skin, 0, -.389, .004, .047, .058, .037, arm);
    arms.push(arm); figure.add(arm);
    const leg = new T.Group(); leg.position.set(sign * .087, .773, 0);
    limb(pants, 0, -.355, 0, .076, .7, .083, leg);
    orb(sole, 0, -.715, .047, .083, .053, .132, leg);
    legs.push(leg); figure.add(leg);
  }
  const shadow = new T.Mesh(new T.CircleGeometry(.307, 24), new T.MeshBasicMaterial({ color: 0x07050b, opacity: .32, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = .014; shadow.scale.y = .74; player.add(shadow);

  // ---- Tony's wardrobe accessories (2.4.8): a silver chain and a gothic
  // cross necklace, hung on his figure at chest height. They live in one
  // group that rides with whichever figure is showing (the Tripo model
  // once it loads, the built-in figure before that).
  const tonyProps = new T.Group(); tonyProps.name = "TonyAccessories";
  figure.add(tonyProps);
  const chainProp = new T.Group(); chainProp.name = "TonyChain";
  const crossProp = new T.Group(); crossProp.name = "TonyCross";
  tonyProps.add(chainProp, crossProp);
  {
    const silver = mat(0xc8c8d0);
    const linkGeo = new T.TorusGeometry(0.02, 0.005, 6, 12);
    for (let i = 0; i < 9; i++) {
      const t = i / 8, link = new T.Mesh(linkGeo, silver);
      link.position.set((t - 0.5) * 0.24, 1.36 - Math.sin(t * Math.PI) * 0.06, 0.13);
      link.rotation.z = (i % 2) * Math.PI / 2;
      chainProp.add(link);
    }
    const darkMetal = mat(0x30303a);
    const cord = mat(0x141014);
    for (let i = 0; i < 7; i++) {
      const t = i / 6, bead = new T.Mesh(new T.SphereGeometry(0.008, 8, 6), cord);
      bead.position.set((t - 0.5) * 0.12, 1.40 - t * 0.20, 0.135);
      crossProp.add(bead);
    }
    const crossV = new T.Mesh(new T.BoxGeometry(0.022, 0.055, 0.01), darkMetal);
    crossV.position.set(0, 1.16, 0.145); crossProp.add(crossV);
    const crossH = new T.Mesh(new T.BoxGeometry(0.038, 0.012, 0.01), darkMetal);
    crossH.position.set(0, 1.172, 0.145); crossProp.add(crossH);
    const gem = new T.Mesh(new T.OctahedronGeometry(0.008), new T.MeshBasicMaterial({ color: 0x9a6bff }));
    gem.position.set(0, 1.16, 0.152); crossProp.add(gem);
  }
  // Tony's Tripo model is one mesh with one texture: a hoodie colour is a
  // tint over the whole figure, and the chain/cross are the real swaps.
  let playerMats = [];
  let currentTonyStyle = { hoodie: "black", chain: "none" };
  function applyTonyStyle(style) {
    const s = style || currentTonyStyle;
    currentTonyStyle = { hoodie: s.hoodie || "black", chain: s.chain || "none" };
    const h = TONY_HOODIES.find((x) => x.id === currentTonyStyle.hoodie) || TONY_HOODIES[0];
    playerMats.forEach((m) => { m.color.setHex(h.tint); if (m.emissive) m.emissiveIntensity = h.id === "black" ? 0.52 : 0.38; });
    jacket.color.setHex(h.solid);
    chainProp.visible = currentTonyStyle.chain === "chain" || currentTonyStyle.chain === "both";
    crossProp.visible = currentTonyStyle.chain === "cross" || currentTonyStyle.chain === "both";
  }

  const decorations = new Map();
  const metal = mat(0x272334), gold = mat(0xa97a45), purple = mat(0x7560ba), amber = new T.MeshBasicMaterial({ color: 0xffbd72 });
  const cyan = new T.MeshBasicMaterial({ color: 0x6db7ad });
  function prop(id, x, y, z, draw) {
    const g = new T.Group(); g.position.set(x, y, z); g.visible = false;
    root.add(g); decorations.set(id, g);
    draw(g, (m, x, y, z, a, b, c) => box(m, x, y, z, a, b, c, g),
      (m, x, y, z, a, b, c) => limb(m, x, y, z, a, b, c, g));
  }
  prop("lamp", -1.78, 0, -2.25, (g, b, cy) => {
    cy(metal, 0, .04, 0, .23, .08, .23); cy(gold, 0, .69, 0, .025, 1.36, .025);
    cy(amber, 0, 1.39, 0, .24, .29, .24);
    const light = new T.PointLight(0xffa050, 8, 3.5, 2); light.position.y = 1.24; g.add(light);
  });
  prop("rug", .47, .026, .20, (g, b) => {
    b(mat(0x762b4b), 0, 0, 0, 1.45, .023, 1.34);
    b(mat(0xa46b70), 0, .013, 0, 1.29, .009, 1.18);
    b(mat(0x4d233e), 0, .019, 0, 1.14, .008, 1.03);
  });
  prop("computer", 2.14, 1.32, -3.44, (g, b) => {
    b(metal, 0, .05, 0, .65, .39, .055); b(cyan, 0, .05, .031, .56, .30, .009);
    for (let i = 0; i < 3; i++) b(metal, 0, .12 - i * .067, .039, .36 - i * .040, .012, .005);
  });
  prop("herComputer", -7.36, .91, -2.51, (g, b) => {
    b(metal, 0, 0, .04, .42, .032, .28);
    b(purple, 0, .13, -.08, .41, .25, .023).rotation.x = -.20;
  });
  prop("tv", -3.6, 1.55, -3.79, (g, b) => {
    for (const side of [-1, 1]) b(amber, side * 1.30, 0, 0, .047, 1.48, .022);
    b(amber, 0, .761, 0, 2.55, .027, .022);
  });
  prop("kitchen", 7.05, 1.01, -3.31, (g, b, cy) => {
    b(gold, 0, 0, 0, .56, .07, .32);
    cy(mat(0x693b34), -.12, .14, 0, .11, .21, .11);
    cy(amber, .14, .10, .02, .10, .14, .10);
  });
  prop("studio", -3.6, .71, -3.50, (g, b) => {
    b(purple, 0, 0, 0, .57, .135, .24); b(cyan, .15, 0, .122, .054, .027, .01);
  });
  prop("archive", -.25, 1.32, -3.79, (g, b) => {
    b(metal, 0, 0, 0, .72, .057, .29);
    for (let i = 0; i < 4; i++) b(i % 2 ? gold : purple, -.24 + i * .15, .14, 0, .102, .24, .18);
  });

  const yard = new T.Group(); root.add(yard);
  const lawn = mat(0x435c48), fence = mat(0x604754), stone = mat(0x797477), dirt = mat(0x4b302f);
  const leaf = mat(0x5b855e), flower = mat(0xa973a4);
  const ybox = (m, x, y, z, w, h, d) => box(m, x, y, z, w, h, d, yard);
  const grass = ybox(lawn, 7, -.11, 5.76, 5.4, .22, 4.74);
  grass.userData.tap = "floor";
  const yardTaps = [grass];
  for (let i = 0; i < 7; i++) {
    const flag = ybox(stone, 7 + Math.sin(i) * .12, .016, 3.46 + i * .64, .93, .032, .53);
    flag.userData.tap = "floor"; yardTaps.push(flag);
  }
  for (const x of [4.34, 9.66]) {
    ybox(fence, x, .36, 5.75, .10, .12, 4.68);
    for (let i = 0; i < 7; i++) ybox(fence, x, .38, 3.55 + i * .72, .15, .76, .15);
  }
  const planter = ybox(dirt, 5.37, .20, 6.75, 1.3, .40, 1.1);
  planter.userData.tap = "yard_work"; yardTaps.push(planter);
  const seedlings = [];
  for (let i = 0; i < 4; i++) {
    const plant = new T.Group(); yard.add(plant); seedlings.push(plant);
    const x = 4.92 + .30 * i, z = 6.69;
    orb(leaf, x, .49, z, .145, .145, .22, plant);
    orb(flower, x, .65, z, .08, .08, .09, plant);
  }
  const bench = ybox(fence, 8.66, .45, 6.91, 1.26, .12, .48);
  bench.userData.tap = "yard_work"; yardTaps.push(bench);
  ybox(fence, 8.66, .78, 6.69, 1.26, .30, .10);
  for (const x of [8.18, 9.14]) ybox(fence, x, .23, 6.91, .13, .46, .37);
  const dusk = new T.PointLight(0xc5dcfe, 9, 10, 1.3); dusk.position.set(7.0, 3, 6.2); yard.add(dusk);

  const market = {};
  function marketPiece(id, x, y, z) {
    const item = new T.Group(), finish = mat(0x322832);
    item.position.set(x, y, z); item.visible = false; root.add(item);
    market[id] = { item, finish };
    return {
      b: (m, px, py, pz, w, h, d) => box(m, px, py, pz, w, h, d, item),
      o: (m, px, py, pz, w, h, d) => orb(m, px, py, pz, w, h, d, item),
      finish, item,
    };
  }
  {
    const { b, o, finish, item } = marketPiece("board", .15, 2.41, -3.73);
    item.rotation.z = -.35;
    o(finish, 0, 0, 0, .125, .47, .024);
    b(gold, 0, 0, .023, .034, .54, .009);
    for (const y of [-.25, .25]) {
      b(metal, 0, y, .050, .21, .025, .058);
      for (const x of [-.105, .105]) o(stone, x, y, .083, .023, .045, .045);
    }
  }
  {
    const { b, o, finish } = marketPiece("planter", 8.46, .01, 5.00);
    b(finish, 0, .18, 0, .93, .36, .60);
    b(dirt, 0, .357, 0, .78, .02, .48);
    for (let i = -2; i <= 2; i++) {
      o(leaf, .15 * i, .44, 0, .10, .16, .14);
      o(flower, .15 * i, .57 + (i % 2) * .068, 0, .067, .058, .065);
    }
  }
  {
    const { b, finish } = marketPiece("records", -4.85, .02, -3.08);
    b(finish, 0, .09, 0, .55, .18, .50);
    for (let i = 0; i < 7; i++) {
      const cover = b(i % 3 === 0 ? purple : i % 3 === 1 ? gold : metal, 0, .20, -.18 + i * .058, .40, .36, .028);
      cover.rotation.x = -.12 - .018 * i;
    }
    b(finish, 0, .12, .25, .55, .20, .055);
  }

  // ---- Tony's Tripo model (replaces the built-in figure when loaded) ----
  let modelGroup = null;
  let mixer = null;
  let actions = {};
  let currentMotion = null;
  let lastT = null;
  let hugLeft = 0;
  let modelReady = false;

  function playMotion(name, fade = 0.3) {
    const next = actions[name];
    if (!next) return false;
    if (currentMotion === name) return true;
    const prev = actions[currentMotion];
    if (prev) prev.fadeOut(fade);
    next.reset().fadeIn(fade).play();
    currentMotion = name;
    return true;
  }

  function playEmote(name) {
    if (!modelReady || !actions[name]) return false;
    if (!playMotion(name, 0.2)) return false;
    hugLeft = actions[name].getClip().duration;
    return true;
  }

  async function loadPlayerModel() {
    try {
      const { GLTFLoader } = await import("./vendor/loaders/GLTFLoader.js");
      const gltf = await new GLTFLoader().loadAsync(PLAYER_MODEL_URL);
      const scene = gltf.scene;
      mixer = new T.AnimationMixer(scene);
      actions = Object.fromEntries(gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]));
      const bounds = new T.Box3().setFromObject(scene);
      const center = bounds.getCenter(new T.Vector3());
      const height = bounds.max.y - bounds.min.y;
      const scale = PLAYER_HEIGHT / height;
      if (!bounds.isEmpty() && Number.isFinite(scale) && scale > 0) {
        scene.scale.setScalar(scale);
        scene.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      }
      scene.traverse((mesh) => {
        if (!mesh.isMesh) return;
        const material = mesh.material;
        if (material) {
          if (playerMats.indexOf(material) === -1) playerMats.push(material);
          // Same treatment as Aimmianna's model: keeps the textured figure
          // legible in the gothic room.
          material.metalness = 0;
          material.roughness = 0.88;
          if (material.map) {
            material.emissiveMap = material.map;
            material.emissive.set(0xffffff);
            material.emissiveIntensity = 0.52;
          }
        }
        if (mesh.isSkinnedMesh) {
          mesh.computeBoundingSphere();
          mesh.boundingSphere.radius *= 1.35;
        }
      });
      modelGroup = new T.Group();
      modelGroup.name = "Tony3D";
      modelGroup.add(scene);
      player.add(modelGroup);
      modelGroup.add(tonyProps); // his chain + cross ride with the real model
      figure.visible = false;
      modelReady = true;
      applyTonyStyle(currentTonyStyle);
      playMotion("idle", 0.5);
      mixer.update(0);
    } catch (error) {
      console.warn("Tony's 3D model unavailable; using the built-in figure.", error);
    }
  }
  loadPlayerModel();

  return {
    root, player, yardTaps,
    playEmote, applyTonyStyle,
    modelReady: () => modelReady,
    look(state) {
      const outfit = OUTFITS[state.outfit];
      skin.color.setHex(SKIN[state.player.skin]);
      hair.color.setHex(HAIR[state.player.hair]);
      jacket.color.setHex(outfit.color); pants.color.setHex(outfit.pants);
      applyTonyStyle(state.tonyStyle); // his hoodie colour wins over the game jacket
      seam.visible = outfit.cut === 1; panel.visible = outfit.cut === 2;
      hairstyles.forEach((g, i) => { g.visible = i === state.player.style; });
      decorations.forEach((g, id) => { g.visible = state.upgrades.includes(id); });
      seedlings.forEach((plant, i) => { plant.visible = i <= state.yardShifts; });
      for (const [id, model] of Object.entries(market)) {
        const saved = state.marketItems[id];
        model.item.visible = !!saved;
        if (saved) model.finish.color.setHex(MARKET_COLORS[saved.color].hex);
      }
    },
    animate(walking, heading, t) {
      if (modelReady && mixer) {
        const dt = lastT === null ? 0 : Math.min(Math.max(t - lastT, 0), 0.1);
        lastT = t;
        if (hugLeft > 0) {
          hugLeft -= dt;
          if (hugLeft <= 0) playMotion(walking ? "walk" : "idle", 0.3);
        } else {
          playMotion(walking ? "walk" : "idle", 0.25);
        }
        mixer.update(dt);
        if (walking) modelGroup.rotation.y = heading;
        return;
      }
      lastT = t;
      const stride = walking ? Math.sin(t * 9) * .45 : 0;
      legs.forEach((l, i) => { l.rotation.x = i ? -stride : stride; });
      arms.forEach((a, i) => { a.rotation.x = i ? stride : -stride; });
      figure.position.y = walking ? Math.abs(Math.sin(t * 9)) * .037 : Math.sin(t * 2) * .01;
      // Face the apartment camera while idle so the customized avatar is visible.
      if (walking) figure.rotation.y = heading;
    },
  };
}
