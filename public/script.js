const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get('room');

document.getElementById("room-title").textContent = `Pokój: ${room}`;
socket.emit("joinRoom", room);

const questionElement = document.getElementById("question");
const answerBoxes = {
  A: document.getElementById("A").querySelector(".text"),
  B: document.getElementById("B").querySelector(".text"),
  C: document.getElementById("C").querySelector(".text"),
  D: document.getElementById("D").querySelector(".text"),
};

// Obsługa przycisku „Zatwierdź”
document.getElementById("confirm").addEventListener("click", () => {
  alert("Wersja MVP: Zatwierdzanie jeszcze nie działa :)");
});

// Gdy serwer wyśle pytanie
socket.on("newQuestion", (data) => {
  questionElement.textContent = data.pytanie;
  answerBoxes.A.textContent = data.odpowiedzi[0];
  answerBoxes.B.textContent = data.odpowiedzi[1];
  answerBoxes.C.textContent = data.odpowiedzi[2];
  answerBoxes.D.textContent = data.odpowiedzi[3];
});
