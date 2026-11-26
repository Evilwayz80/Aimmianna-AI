// One-time handoff so the second phone can join with a short 8-letter code.
// POST { id, iv, cipher } stores the locked pairing code for 10 minutes.
// GET ?id=... returns it once and deletes it. GET with no id = health check.
const { redis, cors, body, b64ok, hasStorage } = require("./_store.js");
module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  const id = String((req.query && req.query.id) || "");
  if (req.method === "GET" && !id) return res.status(200).json({ relay: "aimmianna", storage: hasStorage() });
  if (!hasStorage()) return res.status(503).json({ error: "Storage is not connected yet." });
  try {
    if (req.method === "POST") {
      const b = await body(req);
      if (!b || !/^[a-f0-9]{64}$/.test(b.id || "") || !b64ok(b.iv, 32) || !b64ok(b.cipher, 2000)) return res.status(400).json({ error: "Bad data." });
      const ok = await redis(["SET", "aim:pair:" + b.id, JSON.stringify({ iv: b.iv, cipher: b.cipher }), "EX", "600", "NX"]);
      return ok ? res.status(200).json({ ok: true, expiresIn: 600 }) : res.status(409).json({ error: "Try again." });
    }
    if (req.method === "GET") {
      if (!/^[a-f0-9]{64}$/.test(id)) return res.status(400).json({ error: "Bad code." });
      const v = await redis(["GETDEL", "aim:pair:" + id]);
      return v ? res.status(200).json(JSON.parse(v)) : res.status(404).json({ error: "That code expired or was already used." });
    }
    return res.status(405).json({ error: "Method not allowed." });
  } catch (e) { return res.status(500).json({ error: "Relay error." }); }
};
