// Tiny helper for Upstash Redis (free plan, added from the Vercel Marketplace).
// The relay only ever stores locked (encrypted) boxes. It never gets the key.
const crypto = require("crypto");
const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
async function redis(cmd) {
  const url = URL_(), token = TOKEN();
  if (!url || !token) { const e = new Error("storage"); e.code = "NO_STORAGE"; throw e; }
  const r = await fetch(url, { method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error("redis " + (j.error || r.status));
  return j.result;
}
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");
function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Cache-Control", "no-store");
}
function body(req) {
  if (req.body && typeof req.body === "object") return Promise.resolve(req.body);
  if (typeof req.body === "string") { try { return Promise.resolve(JSON.parse(req.body)); } catch (e) { return Promise.resolve(null); } }
  return new Promise((ok) => { let d = ""; req.on("data", (c) => { d += c; if (d.length > 300000) req.destroy(); }); req.on("end", () => { try { ok(JSON.parse(d)); } catch (e) { ok(null); } }); req.on("error", () => ok(null)); });
}
const b64ok = (s, max) => typeof s === "string" && s.length > 0 && s.length <= max && /^[A-Za-z0-9+/]+=*$/.test(s);
module.exports = { redis, sha, cors, body, b64ok, hasStorage: () => !!(URL_() && TOKEN()) };
