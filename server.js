const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 3000;
const questions = JSON.parse(fs.readFileSync("pytania.json", "utf8"));
app.use(express.static(path.join(__dirname, "public")));

const rooms = {};

io.on("connection", (socket) => {
  socket.on("joinRoom", ({ room, isHost }) => {
    socket.join(room);
    socket.room = room;
    socket.isHost = isHost;

    if (!rooms[room]) {
      rooms[room] = {
        questionIndex: 0,
        cash: 1000000,
        players: [],
        hostId: null,
      };
    }

    if (isHost) {
      rooms[room].hostId = socket.id;
    } else {
      rooms[room].players.push(socket.id);
    }
  });

  socket.on("startGame", (room) => {
    const q = questions[rooms[room].questionIndex];
    io.to(room).emit("startGame");
    io.to(room).emit("newQuestion", q);
  });

  socket.on("submitBet", ({ room, bet }) => {
    const r = rooms[room];
    if (!r) return;

    const question = questions[r.questionIndex];
    const poprawna = question.poprawna;

    const zleOdpowiedzi = ["A", "B", "C", "D"].filter(
      (lit) =>
        question.odpowiedzi[["A", "B", "C", "D"].indexOf(lit)] !== poprawna
    );

    const odpada = zleOdpowiedzi[Math.floor(Math.random() * zleOdpowiedzi.length)];
    const utrata = bet[odpada] || 0;
    r.cash -= utrata;
    if (r.cash < 0) r.cash = 0;

    io.to(room).emit("odrzuconaOdpowiedz", {
      litera: odpada,
      poprawna,
      pozostalo: r.cash,
    });

    setTimeout(() => {
      r.questionIndex++;
      if (r.questionIndex >= questions.length || r.cash <= 0) {
        io.to(room).emit("koniecGry", { wynik: r.cash });
        delete rooms[room];
      } else {
        const nextQ = questions[r.questionIndex];
        io.to(room).emit("newQuestion", nextQ);
      }
    }, 4000);
  });
});

http.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
