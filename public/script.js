const socket = io();
const room = new URLSearchParams(window.location.search).get("room");

document.getElementById("room-title").textContent = `Pokój: ${room}`;
socket.emit("joinRoom", room);

const questionElement = document.getElementById("question");
const answerBoxes = {
  A: document.getElementById("A").querySelector(".text"),
  B: document.getElementById("B").querySelector(".text"),
  C: document.getElementById("C").querySelector(".text"),
  D: document.getElementById("D").querySelector(".text"),
};

const inputs = {
  A: document.getElementById("input-A"),
  B: document.getElementById("input-B"),
  C: document.getElementById("input-C"),
  D: document.getElementById("input-D"),
};

const remainingDisplay = document.getElementById("remaining");
const timerDisplay = document.getElementById("timer");
let timerInterval;

function updateRemaining() {
  const total =
    parseInt(inputs.A.value) +
    parseInt(inputs.B.value) +
    parseInt(inputs.C.value) +
    parseInt(inputs.D.value);
  const remaining = 1000000 - total;
  remainingDisplay.textContent = `${remaining.toLocaleString()} zł`;
}

function autoSubmit() {
  alert("Czas minął! Wysyłamy obstawienie.");
  confirmBet(true);
}

function startTimer(seconds) {
  clearInterval(timerInterval);
  let timeLeft = seconds;
  timerDisplay.textContent = `Pozostało: ${timeLeft} sek.`;
  timerInterval = setInterval(() => {
    timeLeft--;
    timerDisplay.textContent = `Pozostało: ${timeLeft} sek.`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      autoSubmit();
    }
  }, 1000);
}

function confirmBet(force = false) {
  const bet = {
    A: parseInt(inputs.A.value),
    B: parseInt(inputs.B.value),
    C: parseInt(inputs.C.value),
    D: parseInt(inputs.D.value),
  };

  const total = bet.A + bet.B + bet.C + bet.D;

  if (!force && total !== 1000000) {
    alert("Musisz rozdzielić dokładnie 1 000 000 zł!");
    return;
  }

  socket.emit("submitBet", { room, bet });
  alert("Obstawienie wysłane! (kolejny krok: eliminacja)");
}

document.getElementById("confirm").addEventListener("click", () => {
  clearInterval(timerInterval);
  confirmBet();
});

inputs.A.addEventListener("input", updateRemaining);
inputs.B.addEventListener("input", updateRemaining);
inputs.C.addEventListener("input", updateRemaining);
inputs.D.addEventListener("input", updateRemaining);

socket.on("newQuestion", (data) => {
  questionElement.textContent = data.pytanie;
  answerBoxes.A.textContent = data.odpowiedzi[0];
  answerBoxes.B.textContent = data.odpowiedzi[1];
  answerBoxes.C.textContent = data.odpowiedzi[2];
  answerBoxes.D.textContent = data.odpowiedzi[3];
  updateRemaining();
  startTimer(30);
});
