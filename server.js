import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { networkInterfaces } from "node:os";
import express from "express";
import { Server } from "socket.io";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Password che l'arbitro deve inserire per accedere ai comandi di gioco.
// Personalizzabile via variabile d'ambiente: REF_PASSWORD=miapwd npm start
const REF_PASSWORD = process.env.REF_PASSWORD || "arbitro";

// Palette dei round. Il round 1 e' rosso (come da requisito: "grande pulsante rosso").
// Ogni nuova sessione/reset avanza al colore successivo, in modo che il pulsante
// cambi colore ad ogni domanda.
const ROUND_COLORS = [
  { key: "red",     hex: "#ff2d55", glow: "#ff2d5566" },
  { key: "blue",    hex: "#0a84ff", glow: "#0a84ff66" },
  { key: "green",   hex: "#30d158", glow: "#30d15866" },
  { key: "amber",   hex: "#ff9f0a", glow: "#ff9f0a66" },
  { key: "violet",  hex: "#bf5af0", glow: "#bf5af066" },
  { key: "magenta", hex: "#ff375f", glow: "#ff375f66" },
  { key: "cyan",    hex: "#40c8e0", glow: "#40c8e066" },
  { key: "orange",  hex: "#ff6b35", glow: "#ff6b3566" },
];

// ---- Stato di gioco (in memoria) ----
const game = {
  round: 1,
  buzzOpen: false,
  // Map<socketId, { nickname, joinedAt }>
  participants: new Map(),
  // Array<{ socketId, nickname, at }> in ordine di prenotazione
  buzzes: [],
};

function colorForRound(round) {
  return ROUND_COLORS[(round - 1) % ROUND_COLORS.length];
}

function publicState() {
  const participants = [...game.participants.entries()].map(([id, p]) => ({
    id,
    nickname: p.nickname,
  }));
  return {
    round: game.round,
    buzzOpen: game.buzzOpen,
    color: colorForRound(game.round),
    participants,
    participantCount: participants.length,
    buzzes: game.buzzes.map((b, i) => ({
      position: i + 1,
      socketId: b.socketId,
      nickname: b.nickname,
      at: b.at,
    })),
  };
}

const app = express();
app.use(express.static(join(__dirname, "public")));

const httpServer = createServer(app);
const io = new Server(httpServer);

function broadcast() {
  io.emit("state", publicState());
}

io.on("connection", (socket) => {
  // Invia subito lo stato corrente al nuovo arrivato.
  socket.emit("state", publicState());

  // ---- Partecipante ----
  socket.on("participant:join", (rawName, ack) => {
    const nickname = String(rawName || "").trim().slice(0, 24);
    if (!nickname) {
      ack?.({ ok: false, error: "Nickname non valido." });
      return;
    }
    const taken = [...game.participants.values()].some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    );
    if (taken) {
      ack?.({ ok: false, error: "Nickname gia' in uso, scegline un altro." });
      return;
    }
    game.participants.set(socket.id, { nickname, joinedAt: Date.now() });
    ack?.({ ok: true, id: socket.id });
    broadcast();
  });

  socket.on("participant:buzz", (_, ack) => {
    const p = game.participants.get(socket.id);
    if (!p) {
      ack?.({ ok: false, error: "Non sei registrato." });
      return;
    }
    if (!game.buzzOpen) {
      ack?.({ ok: false, error: "Le prenotazioni sono chiuse." });
      return;
    }
    const already = game.buzzes.find((b) => b.socketId === socket.id);
    if (already) {
      ack?.({ ok: true, position: game.buzzes.indexOf(already) + 1 });
      return;
    }
    // Timestamp autorevole lato server: chi arriva prima vince.
    game.buzzes.push({ socketId: socket.id, nickname: p.nickname, at: Date.now() });
    ack?.({ ok: true, position: game.buzzes.length });
    broadcast();
  });

  // ---- Arbitro ----
  socket.data.isReferee = false;

  socket.on("referee:auth", (pw, ack) => {
    // Confronto tollerante: ignora spazi iniziali/finali e maiuscole/minuscole,
    // cosi' la maiuscola automatica dei telefoni non blocca l'accesso.
    const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();
    if (norm(pw) === norm(REF_PASSWORD)) {
      socket.data.isReferee = true;
      ack?.({ ok: true });
      socket.emit("state", publicState());
    } else {
      ack?.({ ok: false, error: "Password errata." });
    }
  });

  socket.on("referee:open", () => {
    if (!socket.data.isReferee) return;
    game.buzzOpen = true;
    game.buzzes = [];
    broadcast();
  });

  socket.on("referee:close", () => {
    if (!socket.data.isReferee) return;
    game.buzzOpen = false;
    broadcast();
  });

  // Reset: chiude, azzera le prenotazioni, avanza al round successivo
  // (cosi' il pulsante cambia colore per la nuova domanda).
  socket.on("referee:reset", () => {
    if (!socket.data.isReferee) return;
    game.buzzOpen = false;
    game.buzzes = [];
    game.round += 1;
    broadcast();
  });

  socket.on("disconnect", () => {
    if (game.participants.delete(socket.id)) {
      game.buzzes = game.buzzes.filter((b) => b.socketId !== socket.id);
      broadcast();
    }
  });
});

httpServer.listen(PORT, () => {
  const nets = networkInterfaces();
  const addrs = [];
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) addrs.push(net.address);
    }
  }
  console.log("\n  🎯 Trivia Buzzer in esecuzione\n");
  console.log(`  Su questo computer:  http://localhost:${PORT}`);
  for (const a of addrs) {
    console.log(`  Dai telefoni (WiFi): http://${a}:${PORT}`);
  }
  console.log("\n  L'arbitro apre il link e sceglie \"Arbitro\".");
  console.log("  I partecipanti aprono lo stesso link e scelgono \"Partecipante\".");
  console.log(`\n  🔐 Password arbitro: \"${REF_PASSWORD}\"  (cambiala con REF_PASSWORD=... npm start)\n`);
});
