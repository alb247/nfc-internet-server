const express = require("express");
const crypto = require("crypto");

const app = express();
app.use(express.json({ limit: "8kb" }));

const PORT = process.env.PORT || 3000;
const ROOM_SECRET = process.env.ROOM_SECRET;
if (!ROOM_SECRET || ROOM_SECRET.length < 24) {
  console.error("Set ROOM_SECRET to a random secret of at least 24 characters.");
  process.exit(1);
}

// Demo only: messages live in RAM and disappear when the server restarts.
const rooms = new Map();
const MAX_MESSAGES_PER_ROOM = 100;
const MAX_TEXT_LENGTH = 2000;

function auth(req, res, next) {
  const supplied = req.header("x-room-secret") || "";
  const a = Buffer.from(supplied);
  const b = Buffer.from(ROOM_SECRET);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/", (_req, res) => res.json({
  service: "NFC Internet Demo",
  status: "ok",
  note: "Demo messaging only; not a payment or card-emulation service."
}));

app.post("/api/messages", auth, (req, res) => {
  const room = String(req.body?.room || "").trim();
  const sender = String(req.body?.sender || "").trim();
  const text = String(req.body?.text || "");
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(room)) {
    return res.status(400).json({ error: "room must be 3-40 letters, numbers, _ or -" });
  }
  if (!/^[A-Za-z0-9_-]{1,30}$/.test(sender)) {
    return res.status(400).json({ error: "sender must be 1-30 letters, numbers, _ or -" });
  }
  if (!text.trim() || text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: "text must be 1-2000 characters" });
  }
  const item = { id: crypto.randomUUID(), sender, text, createdAt: new Date().toISOString() };
  const list = rooms.get(room) || [];
  list.push(item);
  rooms.set(room, list.slice(-MAX_MESSAGES_PER_ROOM));
  res.status(201).json({ ok: true, message: item });
});

app.get("/api/messages", auth, (req, res) => {
  const room = String(req.query.room || "").trim();
  const after = String(req.query.after || "");
  if (!/^[A-Za-z0-9_-]{3,40}$/.test(room)) {
    return res.status(400).json({ error: "room must be 3-40 letters, numbers, _ or -" });
  }
  const list = rooms.get(room) || [];
  const start = after ? Math.max(0, list.findIndex(m => m.id === after) + 1) : 0;
  res.json({ messages: list.slice(start) });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`NFC Internet Demo server listening on ${PORT}`);
});