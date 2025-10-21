// server.js — Paso 1: aceptar el WebSocket de Twilio Media Streams y registrar eventos
import express from "express";
import { WebSocketServer } from "ws";

const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (_req, res) => res.send("✅ Sonnistream Bridge: WS endpoint ready at /ws"));

const server = app.listen(PORT, () => {
  console.log(`✅ HTTP server listening on port ${PORT}`);
});

// Crea un servidor WS en la ruta /ws
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  console.log("🔗 Twilio connected to /ws");

  // Heartbeat para mantener viva la conexión
  ws.isAlive = true;
  ws.on("pong", () => (ws.isAlive = true));

  // Maneja mensajes entrantes de Twilio (JSON con start/media/stop)
  ws.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());

      switch (msg.event) {
        case "start":
          console.log("▶️ Stream started:", msg.streamSid);
          break;

        case "media":
          // msg.media.payload es audio base64 (PCM μ-law 8k)
          // No lo procesamos aún: solo contamos paquetes para verificar flujo
          if (!ws._packets) ws._packets = 0;
          ws._packets++;
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

  ws.on("close", () => {
    console.log("❌ Twilio disconnected from /ws");
  });
});

// Ping interval para mantener conexiones
setInterval(() => {
  wss.clients.forEach((socket) => {
    if (!socket.isAlive) return socket.terminate();
    socket.isAlive = false;
    socket.ping();
  });
}, 30000);
