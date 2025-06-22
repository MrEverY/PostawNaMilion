const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));

const rooms = {};

function loadQuestions() {
  const data = fs.readFileSync("pytania.json", "utf8");
  return JSON.parse(data);
}

io.on("connection", (socket) => {
  console.log("Użytkownik połączony:", socket.id);

  socket.on("joinRoom", ({ room, isHost }) => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        host: null,
        cash: 1000000,
        questions: loadQuestions(),
        currentQuestion: 0,
      };
    }

    if (isHost) {
      rooms[room].host = socket.id;
    } else {
      rooms[room].players.push({ id: socket.id });
    }

    const playerList = rooms[room].players.map((_, i) => `Gracz ${i + 1}`);
    io.to(room).emit("updatePlayers", { players: playerList });
  });

  socket.on("startGame", (room) => {
    io.to(room).emit("startGame");
    sendQuestion(room);
  });

  socket.on("submitBet", ({ room, bet }) => {
    const q = rooms[room].questions[rooms[room].currentQuestion];
    const correctIndex = q.odpowiedzi.indexOf(q.poprawna);
    const litery = ["A", "B", "C", "D"];
    const correctLetter = litery[correctIndex];

    let lostCash = 0;
    for (let litera of litery) {
      if (litera !== correctLetter) {
        lostCash += bet[litera];
        io.to(room).emit("odrzuconaOdpowiedz", {
          litera,
          poprawna: q.poprawna,
          pozostalo: rooms[room].cash - lostCash,
        });
      }
    }

    rooms[room].cash -= lostCash;

    // zamiast automatu — tylko host może przejść dalej
    io.to(rooms[room].host).emit("showNextButton");
  });

  socket.on("nextQuestion", (room) => {
    rooms[room].currentQuestion++;
    if (
      rooms[room].currentQuestion < rooms[room].questions.length &&
      rooms[room].cash > 0
    ) {
      sendQuestion(room);
    } else {
      io.to(room).emit("koniecGry", { wynik: rooms[room].cash });
    }
  });
});

function sendQuestion(room) {
  const q = rooms[room].questions[rooms[room].currentQuestion];
  io.to(room).emit("newQuestion", {
    pytanie: q.pytanie,
    odpowiedzi: q.odpowiedzi,
    cash: rooms[room].cash,
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
