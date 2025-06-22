const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room");
const isHost = urlParams.get("host") === "true";

document.getElementById("room-title").textContent = `Pokój: ${room}`;
socket.emit("joinRoom", { room, isHost });

const questionBox = document.getElementById("question-box");
const moneyInfo = document.getElementById("money-info");
const buttons = document.getElementById("buttons");
const hostPanel = document.getElementById("host-panel");
const timerDisplay = document.getElementById("timer");
const confirmBtn = document.getElementById("confirm");

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
  timerDisplay.style.display = "block";
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

  clearInterval(timerInterval);
  socket.emit("submitBet", { room, bet });
  confirmBtn.disabled = true;
  Object.values(inputs).forEach((i) => (i.disabled = true));
}

document.getElementById("confirm").addEventListener("click", () => confirmBet());

Object.values(inputs).forEach((input) =>
  input.addEventListener("input", updateRemaining)
);

if (isHost) {
  hostPanel.style.display = "block";
  document.getElementById("startGame").addEventListener("click", () => {
    socket.emit("startGame", room);
    hostPanel.style.display = "none";
  });
}

socket.on("startGame", () => {
  questionBox.style.display = "block";
  moneyInfo.style.display = "block";
  buttons.style.display = "block";
});

socket.on("newQuestion", (data) => {
  questionElement.textContent = data.pytanie;
  answerBoxes.A.textContent = data.odpowiedzi[0];
  answerBoxes.B.textContent = data.odpowiedzi[1];
  answerBoxes.C.textContent = data.odpowiedzi[2];
  answerBoxes.D.textContent = data.odpowiedzi[3];

  Object.values(inputs).forEach((i) => {
    i.value = 0;
    i.disabled = false;
  });

  confirmBtn.disabled = false;
  updateRemaining();
  startTimer(30);

  // zaktualizuj stan gotówki
  remainingDisplay.textContent = `${data.cash.toLocaleString()} zł`;

  document.querySelectorAll(".answer").forEach((el) => {
    el.style.opacity = "1";
  });
});

socket.on("odrzuconaOdpowiedz", ({ litera, poprawna, pozostalo }) => {
  document.getElementById(litera).style.opacity = "0.3";
  remainingDisplay.textContent = `Pozostało: ${pozostalo.toLocaleString()} zł`;

  setTimeout(() => {
    alert(
      `Odpowiedź ${litera} została odrzucona.\nPoprawna odpowiedź: ${poprawna}`
    );
  }, 500);
});

socket.on("koniecGry", ({ wynik }) => {
  alert(`Koniec gry! Twój wynik: ${wynik.toLocaleString()} zł`);
  window.location.href = "/";
});
