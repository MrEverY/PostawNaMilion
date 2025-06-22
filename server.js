const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.static("public"));

const rooms = {}; // { roomCode: { players: [], host: socketId, cash, questions, currentQuestion } }

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
      rooms[room].players.push(socket.id);
    }
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

    // policz suma błędnych obstawień
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

    // kolejna runda lub koniec gry
    setTimeout(() => {
      rooms[room].currentQuestion++;
      if (
        rooms[room].currentQuestion < rooms[room].questions.length &&
        rooms[room].cash > 0
      ) {
        sendQuestion(room);
      } else {
        io.to(room).emit("koniecGry", { wynik: rooms[room].cash });
      }
    }, 3000);
  });
});

function sendQuestion(room) {
  const q = rooms[room].questions[rooms[room].currentQuestion];
  io.to(room).emit("newQuestion", {
    pytanie: q.pytanie,
    odpowiedzi: q.odpowiedzi,
    cash: rooms[room].cash, // ✅ aktualna pula pieniędzy
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
