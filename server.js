// server.js — Scaffold mínimo del puente (verificación de arranque)
import express from "express";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (_req, res) => {
  res.send("✅ Sonnistream Bridge is running.");
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
