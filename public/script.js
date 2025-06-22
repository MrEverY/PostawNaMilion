const socket = io();
let isHost = false;
let room = "";
let correctAnswer = "";
let answers = { A: 0, B: 0, C: 0, D: 0 };

document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("start-game");
  const nextBtn = document.getElementById("next-question");
  const inputs = ["A", "B", "C", "D"];

  startBtn?.addEventListener("click", () => {
    socket.emit("startGame", room);
    startBtn.style.display = "none";
  });

  nextBtn?.addEventListener("click", () => {
    socket.emit("nextQuestion", room);
    nextBtn.style.display = "none";
  });

  document.querySelectorAll(".approve").forEach((btn) =>
    btn.addEventListener("click", () => {
      const answer = btn.dataset.answer;
      const value = parseInt(document.getElementById(`input-${answer}`).value) || 0;
      answers[answer] = value;
      btn.disabled = true;
    })
  );

  document.querySelectorAll(".check").forEach((btn) =>
    btn.addEventListener("click", () => {
      const answer = btn.dataset.answer;
      socket.emit("checkAnswer", { room, answer });
      btn.disabled = true;
    })
  );
});

socket.on("roomCreated", (r) => {
  isHost = true;
  room = r;
  document.getElementById("start-game").style.display = "inline-block";
});

socket.on("roomJoined", (r) => {
  room = r;
});

socket.on("updatePlayers", (players) => {
  document.getElementById("lista-graczy").innerText = `Gracze: ${players.length}`;
});

socket.on("newQuestion", ({ pytanie, odpowiedzi, cash }) => {
  document.getElementById("question-box").style.display = "block";
  document.getElementById("question").innerText = pytanie;
  document.getElementById("remaining").innerText = cash.toLocaleString("pl-PL") + " zł";
  ["A", "B", "C", "D"].forEach((id, i) => {
    document.querySelector(`#${id} .text`).innerText = `${id}: ${odpowiedzi[i]}`;
    document.getElementById(`input-${id}`).value = "";
    document.querySelector(`#${id} .approve`).disabled = false;
    document.querySelector(`#${id} .check`).style.display = "none";
    document.querySelector(`#${id} .check`).disabled = false;
  });
  document.getElementById("next-question").style.display = "none";
  startTimer();
});

let timerInterval;

function startTimer() {
  let timeLeft = 30;
  document.getElementById("time").innerText = timeLeft;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById("time").innerText = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      socket.emit("submitAnswer", { room, answers });
    }
  }, 1000);
}

socket.on("stopTimer", () => clearInterval(timerInterval));

socket.on("showCheckButtons", () => {
  if (isHost) {
    document.querySelectorAll(".check").forEach((btn) => {
      btn.style.display = "inline-block";
    });
  }
});

socket.on("setCorrectAnswer", (correct) => {
  correctAnswer = correct;
});

socket.on("answerChecked", ({ answer, correct, remainingCash }) => {
  const block = document.getElementById(answer);
  if (correct) {
    block.style.borderColor = "green";
  } else {
    block.style.borderColor = "red";
  }
  document.getElementById("remaining").innerText =
    remainingCash.toLocaleString("pl-PL") + " zł";

  // Jeśli wszystkie przyciski check są wyłączone, pokaż next
  const allChecked = Array.from(document.querySelectorAll(".check")).every(
    (btn) => btn.disabled
  );
  if (isHost && allChecked) {
    document.getElementById("next-question").style.display = "inline-block";
  }
});

socket.on("gameOver", (cash) => {
  alert("Koniec gry! Pozostało: "
