// Only these two fields cross the device boundary. The relay never receives a decryption key.
const fields = Object.freeze({ memories: 100, behaviorRules: 50 });
const boxContext = new TextEncoder().encode("Aimmianna companion memory v1");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const empty = () => ({ memories: [], behaviorRules: [] });
const validCode = /^[a-f0-9]{64}\.[a-f0-9]{64}$/;
const bytes = (hex) => Uint8Array.from(hex.match(/../g), (x) => parseInt(x, 16));
const b64 = (input) => {
  let text = "";
  for (let i = 0; i < input.length; i += 4096) text += String.fromCharCode(...input.subarray(i, i + 4096));
  return btoa(text);
};
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function memorySnapshot(state) {
  const result = empty();
  for (const [field, limit] of Object.entries(fields)) {
    if (!Array.isArray(state[field]) || state[field].some((value) => typeof value !== "string" || !value.trim() || value.length > 240)) {
      throw Error("A saved entry is not in a supported format. Your data was not changed.");
    }
    result[field] = [...new Set(state[field])];
    if (result[field].length > limit) throw Error("The combined memory is full. Remove an entry before syncing. Nothing was overwritten.");
  }
  return result;
}

export function mergeMemory(base, local, remote) {
  const result = empty();
  for (const field of Object.keys(fields)) {
    const l = new Set(local[field]), r = new Set(remote[field]), b = new Set(base[field]);
    // Preserve additions on either device. A removal of a previously shared entry wins.
    result[field] = [...new Set([...remote[field], ...local[field]])]
      .filter((value) => !b.has(value) || (l.has(value) && r.has(value)));
  }
  return memorySnapshot(result);
}

export function memoryRelayUrl(value) {
  const u = new URL(value.trim());
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(u.hostname);
  if ((u.protocol !== "https:" && !(loopback && u.protocol === "http:")) ||
      u.username || u.password || u.search || u.hash) throw Error("Enter the private relay’s HTTPS address.");
  return u.href.replace(/\/+$/, "") + "/api/companion-memory";
}

export function openMemoryLink({ storage, id, read, apply, status }) {
  const uid = id + "_companionMemory_v1";
  let config = null, running = null, abort = null;
  try {
    const loaded = JSON.parse(storage.getItem(uid) || "null");
    if (loaded && validCode.test(loaded.code)) {
      memoryRelayUrl(loaded.url);
      config = { ...loaded, base: memorySnapshot(loaded.base) };
    }
  } catch { /* No previously usable pairing. */ }

  function persist(next) { storage.setItem(uid, JSON.stringify(next)); }
  function link(url, code) {
    memoryRelayUrl(url);
    if (!validCode.test(code)) throw Error("Paste the full pairing code from your private relay.");
    if (!globalThis.crypto?.subtle) throw Error("Open Aimmianna over HTTPS to link memory.");
    if (config) throw Error("Disconnect this device before changing its relay.");
    const next = { url, code, base: empty(), revision: 0 };
    persist(next);
    config = next;
  }

  function disconnect() {
    storage.removeItem(uid);
    config = null;
    abort?.abort();
    status("Not linked. Your saved memories are still on this device.");
  }

  async function roundTrip(pairing, signal) {
    const [token, secret] = pairing.code.split(".");
    const endpoint = memoryRelayUrl(pairing.url);
    const key = await crypto.subtle.importKey("raw", bytes(secret), "AES-GCM", false, ["encrypt", "decrypt"]);
    const options = { headers: { Authorization: "Bearer " + token }, signal, credentials: "omit", redirect: "error", cache: "no-store" };
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(endpoint, options);
      if (!response.ok) throw Error(response.status === 403 ? "Pairing code rejected." : "The private relay could not be reached.");
      const stored = await response.json();
      if (!Number.isSafeInteger(stored.revision) || stored.revision < 0) throw Error("The relay returned an invalid revision.");
      if (stored.revision < (pairing.revision || 0)) throw Error("The relay has an older copy. Nothing was overwritten.");
      let remote = empty();
      if (stored.revision > 0) {
        try {
          const iv = unb64(stored.iv), cipher = unb64(stored.cipher);
          if (iv.length !== 12 || cipher.length > 160000) throw Error();
          const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: boxContext }, key, cipher);
          remote = memorySnapshot(JSON.parse(new TextDecoder().decode(clear)));
        } catch { throw Error("The saved memory could not be unlocked. Existing data stayed in place."); }
      }
      const local = memorySnapshot(read());
      const merged = mergeMemory(pairing.base, local, remote);
      const changed = !same(remote, merged) || !stored.revision;
      if (changed) {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: boxContext }, key, new TextEncoder().encode(JSON.stringify(merged)));
        const written = await fetch(endpoint, {
          ...options, method: "PUT", headers: { ...options.headers, "Content-Type": "application/json" },
          body: JSON.stringify({ revision: stored.revision, iv: b64(iv), cipher: b64(new Uint8Array(cipher)) })
        });
        if (written.status === 409) continue;
        if (!written.ok) throw Error("The private relay could not save the encrypted memory.");
      }
      if (signal.aborted || config !== pairing) return;
      // Bring in edits made while the request was in flight, then leave them
      // pending for the next sync instead of replacing the user's current list.
      const current = memorySnapshot(read());
      const nextLocal = mergeMemory(local, current, merged);
      if (!same(current, nextLocal)) apply(nextLocal);
      const next = { ...pairing, base: merged, revision: stored.revision + Number(changed) };
      persist(next);
      config = next;
      status(`Synced ${merged.memories.length} memories and ${merged.behaviorRules.length} rules.${same(nextLocal, merged) ? "" : " New edits will sync next."}`);
      return;
    }
    throw Error("Another device is saving. Try again in a moment.");
  }

  function sync() {
    if (!config || running) return running;
    const pairing = config;
    const control = abort = new AbortController();
    const timer = setTimeout(() => control.abort(), 12000);
    status("Connecting to your private relay…");
    running = roundTrip(pairing, control.signal)
      .catch((error) => {
        if (config === pairing) status(error.name === "AbortError" || error instanceof TypeError
          ? "Relay unavailable. Your memory stays on this device; try again online."
          : error.message);
      })
      .finally(() => { clearTimeout(timer); running = null; abort = null; });
    return running;
  }
  return { link, disconnect, sync, linked: () => !!config, code: () => config && config.code, url: () => config && config.url };
}

// ---- Short-code pairing (8 letters instead of the 129-character code) ----
const SHORT = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
export function newPairingCode() {
  return hex(crypto.getRandomValues(new Uint8Array(32))) + "." + hex(crypto.getRandomValues(new Uint8Array(32)));
}
export function cleanShortCode(value) {
  const c = String(value || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (c.length !== 8 || [...c].some((x) => !SHORT.includes(x))) throw Error("Type the 8-letter code shown on your other phone.");
  return c;
}
const pairUrl = (url) => memoryRelayUrl(url).replace(/companion-memory$/, "pair");
async function shortKey(code) {
  const id = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("aimmianna-pair-id:" + code)));
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: new TextEncoder().encode("aimmianna-pair-key v1"), iterations: 150000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { id, key };
}
const pairContext = new TextEncoder().encode("Aimmianna pairing v1");
const relayDown = (r) => Error(r.status === 503 ? "Your site’s storage isn’t connected yet (Upstash in Vercel)." : "Your Aimmianna site couldn’t be reached. Check the address.");
// Locks the full pairing code with the short code and leaves it on the relay for 10 minutes.
export async function offerPairing(url, fullCode) {
  if (!validCode.test(fullCode)) throw Error("This device isn’t linked yet.");
  const n = crypto.getRandomValues(new Uint8Array(8));
  const code = [...n].map((b) => SHORT[b % 32]).join("");
  const { id, key } = await shortKey(code);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: pairContext }, key, new TextEncoder().encode(fullCode));
  const r = await fetch(pairUrl(url), { method: "POST", credentials: "omit", redirect: "error", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, iv: b64(iv), cipher: b64(new Uint8Array(cipher)) }) });
  if (!r.ok) throw relayDown(r);
  return code.slice(0, 4) + "-" + code.slice(4);
}
// Fetches (and uses up) the locked code, then unlocks it with the short code.
export async function claimPairing(url, typed) {
  const code = cleanShortCode(typed);
  const { id, key } = await shortKey(code);
  const r = await fetch(pairUrl(url) + "?id=" + id, { credentials: "omit", redirect: "error", cache: "no-store" });
  if (r.status === 404) throw Error("That code expired or was already used. Make a new one on your other phone.");
  if (!r.ok) throw relayDown(r);
  const box = await r.json();
  try {
    const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(box.iv), additionalData: pairContext }, key, unb64(box.cipher));
    const full = new TextDecoder().decode(clear);
    if (!validCode.test(full)) throw Error();
    return full;
  } catch { throw Error("That code didn’t match. Make a new one on your other phone."); }
}
export async function checkRelay(url) {
  const r = await fetch(pairUrl(url), { credentials: "omit", redirect: "error", cache: "no-store" }).catch(() => null);
  if (!r || !r.ok) return "unreachable";
  const j = await r.json().catch(() => ({}));
  return j.relay !== "aimmianna" ? "unreachable" : j.storage ? "ok" : "nostorage";
}
