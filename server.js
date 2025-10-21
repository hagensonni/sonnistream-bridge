// server.js — WS en /ws + endpoint /status para eventos de Twilio
import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const PORT = process.env.PORT || 10000;

// Para leer texto sin rechazar content-type de Twilio (application/x-www-form-urlencoded o text/plain)
app.use(express.text({ type: "*/*" }));

app.get("/", (_req, res) => res.send("✅ Sonnistream Bridge: WS at /ws, status at /status"));

// --- Endpoint para statusCallback del <Stream> ---
app.post("/status", (req, res) => {
  const body = req.body || "";
  // Intenta parsear si parece JSON; si no, solo loguea el texto
  try {
    const data = JSON.parse(body);
    console.log("📡 Stream status event:", data);
  } catch {
    console.log("📡 Stream status raw:", body);
  }
  res.status(200).send("ok");
});

const server = app.listen(PORT, () => {
  console.log(`✅ HTTP server listening on port ${PORT}`);
});

// --- WebSocket /ws para Twilio Media Streams ---
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  console.log("🔗 Twilio connected to /ws");

  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      switch (msg.event) {
        case "start":
          console.log("▶️ Stream started:", msg.streamSid);
          break;
        case "media":
          ws._packets = (ws._packets || 0) + 1;
          if (ws._packets % 50 === 0) {
            console.log(`🎧 received media packets: ${ws._packets}`);
          }
          break;
        case "mark":
          console.log("🔖 mark:", msg.mark?.name);
          break;
        case "stop":
          console.log("⏹ Stream stopped:", msg.streamSid);
          break;
        default:
          console.log("📨 Other event:", msg.event);
      }
    } catch (e) {
      console.error("JSON parse error:", e);
    }
  });

  ws.on("close", () => console.log("❌ Twilio disconnected from /ws"));
});

// Mantener viva la conexión
setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) return socket.terminate();
    socket.isAlive = false;
    socket.ping();
  });
}, 30000);
