import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { networkInterfaces } from "node:os";
import express from "express";
import { Server } from "socket.io";
import { QUESTIONS } from "./questions.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

// Password che l'arbitro deve inserire per accedere ai comandi di gioco.
// Personalizzabile via variabile d'ambiente: REF_PASSWORD=miapwd npm start
const REF_PASSWORD = process.env.REF_PASSWORD || "arbitro";

// Palette: il colore del pulsante/opzioni cambia ad ogni domanda.
const COLORS = [
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
function freshGame() {
  return {
    phase: "lobby",            // "lobby" | "question" | "revealed"
    questionNo: 0,             // numero progressivo di domande poste
    colorIndex: 0,
    current: null,             // { idx, q, o, c }
    answers: new Map(),        // socketId -> indice opzione scelta (prima risposta)
    firstAnswer: null,         // { id, nickname, optionIndex, correct }
    used: new Set(),           // indici domande gia' usate (no ripetizioni)
    // i partecipanti e i punteggi sopravvivono finche' non si fa reset completo
    participants: new Map(),   // socketId -> { nickname, joinedAt }
    scores: new Map(),         // socketId -> punti
  };
}
let game = freshGame();

function colorAt(i) { return COLORS[i % COLORS.length]; }

function pickRandomQuestion() {
  if (game.used.size >= QUESTIONS.length) game.used.clear(); // esaurite: rimescola
  let idx;
  do { idx = Math.floor(Math.random() * QUESTIONS.length); } while (game.used.has(idx));
  game.used.add(idx);
  return idx;
}

// Stato pubblico. La risposta corretta (c) viene inclusa SOLO in fase "revealed".
function publicState() {
  const color = colorAt(game.colorIndex);
  let question = null;
  if (game.current) {
    question = { no: game.questionNo, q: game.current.q, o: game.current.o };
    if (game.phase === "revealed") question.correct = game.current.c;
  }
  const participants = [...game.participants.entries()].map(([id, p]) => ({
    id,
    nickname: p.nickname,
    score: game.scores.get(id) || 0,
    answered: game.answers.has(id),
  }));
  return {
    phase: game.phase,
    color,
    question,
    firstAnswer: game.firstAnswer,
    answeredCount: game.answers.size,
    participantCount: participants.length,
    totalQuestions: QUESTIONS.length,
    usedCount: game.used.size,
    participants,
  };
}

const app = express();
app.use(express.static(join(__dirname, "public")));

const httpServer = createServer(app);
const io = new Server(httpServer);

const broadcast = () => io.emit("state", publicState());

io.on("connection", (socket) => {
  socket.emit("state", publicState());
  socket.data.isReferee = false;

  // ---- Partecipante ----
  socket.on("participant:join", (rawName, ack) => {
    const nickname = String(rawName || "").trim().slice(0, 24);
    if (!nickname) return ack?.({ ok: false, error: "Nickname non valido." });
    const taken = [...game.participants.values()].some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    );
    if (taken) return ack?.({ ok: false, error: "Nickname già in uso, scegline un altro." });
    game.participants.set(socket.id, { nickname, joinedAt: Date.now() });
    if (!game.scores.has(socket.id)) game.scores.set(socket.id, 0);
    ack?.({ ok: true, id: socket.id });
    broadcast();
  });

  socket.on("participant:answer", (optionIndex, ack) => {
    const p = game.participants.get(socket.id);
    if (!p) return ack?.({ ok: false, error: "Non sei registrato." });
    if (game.phase !== "question") return ack?.({ ok: false, error: "Non puoi rispondere ora." });
    if (game.firstAnswer !== null) return ack?.({ ok: false, error: "Troppo tardi, qualcun altro ha già risposto." });
    const i = Number(optionIndex);
    if (!Number.isInteger(i) || i < 0 || i > 3) return ack?.({ ok: false, error: "Opzione non valida." });
    game.answers.set(socket.id, i);
    const correct = i === game.current.c;
    game.scores.set(socket.id, (game.scores.get(socket.id) || 0) + (correct ? 1 : -1));
    game.firstAnswer = { id: socket.id, nickname: p.nickname, optionIndex: i, correct };
    game.phase = "revealed";
    ack?.({ ok: true, selected: i });
    broadcast();
  });

  // ---- Arbitro ----
  socket.on("referee:auth", (pw, ack) => {
    const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();
    if (norm(pw) === norm(REF_PASSWORD)) {
      socket.data.isReferee = true;
      ack?.({ ok: true });
      socket.emit("state", publicState());
    } else {
      ack?.({ ok: false, error: "Password errata." });
    }
  });

  // Prossima domanda: estrae una domanda random non ancora usata, cambia colore.
  socket.on("referee:next", () => {
    if (!socket.data.isReferee) return;
    const idx = pickRandomQuestion();
    const base = QUESTIONS[idx];
    game.current = { idx, q: base.q, o: base.o, c: base.c };
    game.answers = new Map();
    game.firstAnswer = null;
    game.questionNo += 1;
    game.colorIndex += 1;
    game.phase = "question";
    broadcast();
  });

  socket.on("referee:kick", (targetId) => {
    if (!socket.data.isReferee) return;
    const target = io.sockets.sockets.get(targetId);
    if (target) {
      target.disconnect(true);
    } else if (game.participants.delete(targetId)) {
      game.scores.delete(targetId);
      game.answers.delete(targetId);
      if (game.firstAnswer?.id === targetId) game.firstAnswer = null;
      broadcast();
    }
  });

  // Reset completo: azzera punteggi, domande usate e stato. I partecipanti restano collegati.
  socket.on("referee:resetGame", () => {
    if (!socket.data.isReferee) return;
    const participants = game.participants;
    game = freshGame();
    game.participants = participants;
    for (const [id] of participants) game.scores.set(id, 0);
    broadcast();
  });

  socket.on("disconnect", () => {
    if (game.participants.delete(socket.id)) {
      game.scores.delete(socket.id);
      game.answers.delete(socket.id);
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
  console.log("\n  🧠 Quiz Italia — banco di " + QUESTIONS.length + " domande\n");
  console.log(`  Su questo computer:  http://localhost:${PORT}`);
  for (const a of addrs) console.log(`  Dai telefoni (WiFi): http://${a}:${PORT}`);
  console.log(`\n  🔐 Password arbitro: \"${REF_PASSWORD}\"  (cambiala con REF_PASSWORD=... npm start)\n`);
});
