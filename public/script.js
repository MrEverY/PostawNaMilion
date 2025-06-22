const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room");
const isHost = urlParams.get("host") === "true";

socket.emit("joinRoom", { room, isHost });

let isApproved = {};
let betValues = { A: 0, B: 0, C: 0, D: 0 };
let currentCash = 1000000;
let correctAnswer = "";

const confirmBtn = document.getElementById("confirm");
const inputs = {
  A: document.getElementById("input-A"),
  B: document.getElementById("input-B"),
  C: document.getElementById("input-C"),
  D: document.getElementById("input-D"),
};

const approveBtns = {
  A: document.getElementById("approve-A"),
  B: document.getElementById("approve-B"),
  C: document.getElementById("approve-C"),
  D: document.getElementById("approve-D"),
};

for (let key of ["A", "B", "C", "D"]) {
  inputs[key].addEventListener("input", () => {
    betValues[key] = parseInt(inputs[key].value) || 0;
    socket.emit("updateBet", { room, bet: betValues });
    approveBtns[key].style.display = "inline-block";
  });

  approveBtns[key].addEventListener("click", () => {
    isApproved[key] = true;
    approveBtns[key].disabled = true;
    if (Object.values(isApproved).every((v) => v)) {
      socket.emit("approveBet", { room });
    }
  });
}

confirmBtn.addEventListener("click", () => {
  if (
    Object.values(betValues).reduce((a, b) => a + b, 0) !== currentCash
  ) {
    alert("Rozdziel dokładnie całą kwotę!");
    return;
  }
});

socket.on("startGame", () => {
  document.getElementById("question-box").style.display = "block";
});

socket.on("newQuestion", (data) => {
  document.getElementById("question").textContent = data.pytanie;
  ["A", "B", "C", "D"].forEach((l, i) => {
    document.getElementById(l).querySelector(".text").textContent =
      data.odpowiedzi[i];
    inputs[l].value = 0;
    inputs[l].disabled = false;
    approveBtns[l].style.display = "none";
    approveBtns[l].disabled = false;
    isApproved[l] = false;
  });
  currentCash = data.cash;
});

socket.on("betConfirmed", (finalBet) => {
  ["A", "B", "C", "D"].forEach((l) => {
    inputs[l].value = finalBet[l];
    inputs[l].disabled = true;
  });
});

socket.on("showCheckButtons", ({ correct }) => {
  correctAnswer = correct;
  if (isHost) {
    ["A", "B", "C", "D"].forEach((l) => {
      const btn = document.createElement("button");
      btn.textContent = `Sprawdź ${l}`;
      btn.onclick = () => {
        socket.emit("checkAnswer", { room, litera: l });
        btn.disabled = true;
      };
      document.getElementById(l).appendChild(btn);
    });
  }
});

socket.on("answerChecked", ({ litera, poprawna, pozostalo }) => {
  document.getElementById(litera).style.opacity = "0.5";
  document.getElementById("remaining").textContent = `${pozostalo.toLocaleString()} zł`;
});

socket.on("showNextButton", () => {
  if (isHost) {
    const next = document.createElement("button");
    next.textContent = "➡️ Dalej";
    next.onclick = () => {
      socket.emit("nextQuestion", room);
      next.remove();
    };
    document.body.appendChild(next);
  }
});

socket.on("updatePlayers", ({ players }) => {
  const el = document.getElementById("lista-graczy");
  el.innerHTML =
    "<strong>Gracze w pokoju:</strong><br>" + players.join("<br>");
});

socket.on("koniecGry", ({ wynik }) => {
  alert(`Koniec gry! Twój wynik: ${wynik.toLocaleString()} zł`);
  window.location.href = "/";
});
