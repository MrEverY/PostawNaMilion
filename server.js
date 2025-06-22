const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 3000;

// Wczytanie pytań z pliku JSON
const questions = JSON.parse(fs.readFileSync("pytania.json", "utf8"));

// Serwowanie plików z folderu public
app.use(express.static(path.join(__dirname, "public")));

// Mapa pokoi i ich stanu
const rooms = {};

// Obsługa Socket.IO
io.on("connection", (socket) => {
  socket.on("joinRoom", (room) => {
    socket.join(room);

    // Inicjalizacja stanu pokoju, jeśli nie istnieje
    if (!rooms[room]) {
      rooms[room] = {
        questionIndex: 0,
        bets: [],
      };
    }

    const currentQuestion = questions[rooms[room].questionIndex];
    if (currentQuestion) {
      io.to(room).emit("newQuestion", currentQuestion);
    }
  });

  socket.on("submitBet", ({ room, bet }) => {
    console.log(`Obstawienie od gracza w pokoju ${room}:`, bet);

    if (!rooms[room]) return;

    rooms[room].bets.push(bet);

    // W przyszłości: czekamy na drugiego gracza albo czas, potem eliminacja itd.
  });
});

// Uruchomienie serwera
http.listen(PORT, () => {
  console.log(`Serwer działa na http://localhost:${PORT}`);
});
