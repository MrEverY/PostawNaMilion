const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
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
      remainingCash: 1000000,
      approved: {},
    };
    socket.emit("roomCreated", room);
    io.to(room).emit("updatePlayers", rooms[room].players);
  });

  socket.on("joinRoom", (room) => {
    if (rooms[room]) {
      socket.join(room);
      rooms[room].players.push(socket.id);
      io.to(socket.id).emit("roomJoined", room);
      io.to(room).emit("updatePlayers", rooms[room].players);
    }
  });

  socket.on("startGame", (room) => {
    sendQuestion(room);
  });

  socket.on("submitAnswer", ({ room, answers }) => {
    rooms[room].lastAnswers = answers;
    io.to(room).emit("stopTimer");
    io.to(room).emit("showCheckButtons");
    const correct = pytania[rooms[room].currentQuestionIndex].poprawna;
    io.to(rooms[room].host).emit("setCorrectAnswer", correct);
  });

  socket.on("checkAnswer", ({ room, answer }) => {
    const correct = pytania[rooms[room].currentQuestionIndex].poprawna;
    const kwota = rooms[room].lastAnswers[answer] || 0;
    if (answer !== correct) {
      rooms[room].remainingCash -= kwota;
      io.to(room).emit("answerChecked", {
        answer,
        correct: false,
        remainingCash: rooms[room].remainingCash,
      });
    } else {
      io.to(room).emit("answerChecked", {
        answer,
        correct: true,
        remainingCash: rooms[room].remainingCash,
      });
    }
  });

  socket.on("nextQuestion", (room) => {
    rooms[room].currentQuestionIndex++;
    sendQuestion(room);
  });

  socket.on("disconnect", () => {
    for (let room in rooms) {
      rooms[room].players = rooms[room].players.filter((id) => id !== socket.id);
      if (rooms[room].players.length === 0) {
        delete rooms[room];
      } else {
        io.to(room).emit("updatePlayers", rooms[room].players);
      }
    }
  });
});

function sendQuestion(room) {
  const index = rooms[room].currentQuestionIndex;
  if (index < pytania.length) {
    const q = pytania[index];
    io.to(room).emit("newQuestion", {
      pytanie: q.pytanie,
      odpowiedzi: q.odpowiedzi,
      cash: rooms[room].remainingCash
    });
  } else {
    io.to(room).emit("gameOver", rooms[room].remainingCash);
  }
}

server.listen(3000, () => console.log("Serwer działa na porcie 3000"));
