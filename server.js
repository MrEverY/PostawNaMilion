const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const pytania = require("./pytania.json");

app.use(express.static("public"));

let rooms = {};

io.on("connection", (socket) => {
  socket.on("createRoom", (room) => {
    socket.join(room);
    rooms[room] = {
      host: socket.id,
      players: [socket.id],
      currentQuestionIndex: 0,
      remainingCash: 1000000
    };
    socket.emit("roomCreated", room);
    io.to(room).emit("updatePlayers", rooms[room].players);
  });

  socket.on("joinRoom", (room) => {
    if (rooms[room]) {
      socket.join(room);
      rooms[room].players.push(socket.id);
      socket.emit("roomJoined", room);
      io.to(room).emit("updatePlayers", rooms[room].players);
    }
  });

  socket.on("startGame", (room) => {
    sendQuestion(room);
  });

  socket.on("submitAnswer", ({ room, answers }) => {
    const correct = pytania[rooms[room].currentQuestionIndex].poprawna;
    let total = 0;

    for (const [key, value] of Object.entries(answers)) {
      if (key !== correct) {
        rooms[room].remainingCash -= value;
      } else {
        total += value;
      }
    }

    io.to(room).emit("answerResult", {
      correct,
      remainingCash: rooms[room].remainingCash
    });
  });

  socket.on("nextQuestion", (room) => {
    rooms[room].currentQuestionIndex++;
    sendQuestion(room);
  });

  function sendQuestion(room) {
    const qIndex = rooms[room].currentQuestionIndex;
    const q = pytania[qIndex];
    io.to(room).emit("newQuestion", {
      pytanie: q.pytanie,
      odpowiedzi: q.odpowiedzi,
      cash: rooms[room].remainingCash
    });
  }
});

server.listen(3000, () => {
  console.log("Serwer działa na porcie 3000");
});
