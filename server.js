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
  socket.on("joinRoom", ({ room, isHost }) => {
    socket.join(room);
    if (!rooms[room]) {
      rooms[room] = {
        players: [],
        host: null,
        cash: 1000000,
        questions: loadQuestions(),
        currentQuestion: 0,
        bets: {},
        approvals: {},
      };
    }

    if (isHost) {
      rooms[room].host = socket.id;
    } else {
      rooms[room].players.push(socket.id);
    }

    const playerList = rooms[room].players.map((_, i) => `Gracz ${i + 1}`);
    io.to(room).emit("updatePlayers", { players: playerList });
  });

  socket.on("startGame", (room) => {
    io.to(room).emit("startGame");
    sendQuestion(room);
  });

  socket.on("updateBet", ({ room, bet }) => {
    rooms[room].bets[socket.id] = bet;
    io.to(room).emit("betUpdated", { player: socket.id, bet });
  });

  socket.on("approveBet", ({ room }) => {
    rooms[room].approvals[socket.id] = true;
    const allApproved = rooms[room].players.every(
      (id) => rooms[room].approvals[id]
    );

    if (allApproved) {
      const finalBet = mergeBets(
        rooms[room].bets[rooms[room].players[0]],
        rooms[room].bets[rooms[room].players[1]]
      );

      rooms[room].finalBet = finalBet;
      io.to(room).emit("betConfirmed", finalBet);
      io.to(rooms[room].host).emit("showCheckButtons", {
        correct: rooms[room].questions[rooms[room].currentQuestion].poprawna,
      });
    }
  });

  socket.on("checkAnswer", ({ room, litera }) => {
    const q = rooms[room].questions[rooms[room].currentQuestion];
    const litery = ["A", "B", "C", "D"];
    const correctLetter = litery[q.odpowiedzi.indexOf(q.poprawna)];
    const bet = rooms[room].finalBet[litera];

    if (litera !== correctLetter) {
      rooms[room].cash -= bet;
    }

    io.to(room).emit("answerChecked", {
      litera,
      poprawna: q.poprawna,
      pozostalo: rooms[room].cash,
      poprawnaLitera: correctLetter,
    });
  });

  socket.on("nextQuestion", (room) => {
    rooms[room].currentQuestion++;
    rooms[room].bets = {};
    rooms[room].approvals = {};

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

function mergeBets(bet1, bet2) {
  return {
    A: Math.floor((bet1.A + bet2.A) / 2),
    B: Math.floor((bet1.B + bet2.B) / 2),
    C: Math.floor((bet1.C + bet2.C) / 2),
    D: Math.floor((bet1.D + bet2.D) / 2),
  };
}

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
