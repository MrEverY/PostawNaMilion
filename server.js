const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const path = require("path");
const fs = require("fs");

const PORT = process.env.PORT || 3000;

// Ładowanie pytań z pliku JSON
const questions = JSON.parse(fs.readFileSync("pytania.json", "utf8"));

// Serwujemy pliki statyczne z folderu public
app.use(express.static(path.join(__dirname, "public")));

// Gdy gracz dołącza do pokoju
io.on("connection", (socket) => {
  socket.on("joinRoom", (room) => {
    socket.join(room);

    // Jeśli to pierwszy gracz – zapisz pokój
    if (!io.sockets.adapter.rooms.get(room)?.hasSentQuestion) {
      io.sockets.adapter.rooms.get(room).hasSentQuestion = true;

      // Wysyłamy pierwsze pytanie
      const question = questions[0];
      io.to(room).emit("newQuestion", question);
    }
  });
});

// Start serwera
http.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
