// Aimmianna private memory relay.
// GET  -> { revision, iv, cipher } (or { revision: 0 } when empty)
// PUT  { revision, iv, cipher } -> saves only if revision still matches (else 409)
// Authorization: Bearer <64-hex token from the pairing code>. Data is AES-GCM
// encrypted on the phone; the decryption half of the code never leaves the phone.
const { redis, sha, cors, body, b64ok, hasStorage } = require("./_store.js");
const CAS = "local cur = redis.call('GET', KEYS[1]) local rev = 0 if cur then rev = tonumber(cjson.decode(cur).revision) end " +
  "if rev ~= tonumber(ARGV[1]) then return -1 end redis.call('SET', KEYS[1], ARGV[2]) return rev + 1";
module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (!hasStorage()) return res.status(503).json({ error: "Storage is not connected yet." });
  const m = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || "");
  if (!m) return res.status(403).json({ error: "Pairing code rejected." });
  const key = "aim:mem:" + sha("aimmianna-memory:" + m[1]);
  try {
    if (req.method === "GET") {
      const v = await redis(["GET", key]);
      return res.status(200).json(v ? JSON.parse(v) : { revision: 0 });
    }
    if (req.method === "PUT") {
      const b = await body(req);
      if (!b || !Number.isSafeInteger(b.revision) || b.revision < 0 || !b64ok(b.iv, 32) || !b64ok(b.cipher, 220000)) return res.status(400).json({ error: "Bad data." });
      const next = JSON.stringify({ revision: b.revision + 1, iv: b.iv, cipher: b.cipher, at: Date.now() });
      const r = await redis(["EVAL", CAS, "1", key, String(b.revision), next]);
      if (r === -1) return res.status(409).json({ error: "Another device saved first." });
      return res.status(200).json({ revision: r });
    }
    return res.status(405).json({ error: "Method not allowed." });
  } catch (e) { return res.status(500).json({ error: "Relay error." }); }
};
