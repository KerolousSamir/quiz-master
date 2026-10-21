"use strict";

/* player.js — شاشة اللاعب (الموبايل). كل شيء عن طريق Api. */

document.addEventListener("DOMContentLoaded", () => {
  const urlPin = new URLSearchParams(window.location.search).get("pin") || "";

  const pinInput = document.getElementById("pin-input");
  const nicknameInput = document.getElementById("nickname-input");
  const btnJoin = document.getElementById("btn-join");
  const errorMsg = document.getElementById("error-msg");
  const mainLogo = document.getElementById("main-logo");

  const joinCard = document.getElementById("join-card");
  const waitingCard = document.getElementById("waiting-card");
  const getReadyCard = document.getElementById("get-ready-card");
  const answerPad = document.getElementById("answer-pad");
  const resultCard = document.getElementById("result-card");
  const playerFooter = document.getElementById("player-footer");
  const waitingText = document.querySelector(".waiting-text");

  let currentPlayer = null;
  let gamePin = urlPin;

  // لو اللينك مفيهوش PIN (دخل على player.html مباشرة) نطلب منه يكتبه
  if (!urlPin) pinInput.classList.remove("hidden");

  const JOIN_ERRORS = {
    GAME_NOT_FOUND: "Game not found. Check the PIN.",
    NICKNAME_TAKEN: "That nickname is already taken."
  };

  function showError(text) {
    errorMsg.textContent = text;
    errorMsg.style.display = "block";
  }

  function hideMainCards() {
    [joinCard, waitingCard, getReadyCard, answerPad, resultCard].forEach((c) => c.classList.add("hidden"));
  }

  async function join() {
    const nickname = nicknameInput.value.trim();
    gamePin = urlPin || pinInput.value.trim();

    if (!gamePin) return showError("Please enter the Game PIN");
    if (!nickname) return showError("Please enter a nickname");

    btnJoin.disabled = true;
    try {
      currentPlayer = await Api.game.join(gamePin, nickname);
      await Api.realtime.connect({ pin: gamePin, role: "player" });
      bindGameEvents();
    } catch (err) {
      btnJoin.disabled = false;
      return showError(JOIN_ERRORS[err.code] || "Could not join. Try again.");
    }

    errorMsg.style.display = "none";
    hideMainCards();
    if (mainLogo) mainLogo.style.display = "none";

    document.getElementById("player-name-display").textContent = currentPlayer.nickname;
    document.getElementById("footer-player-name").textContent = currentPlayer.nickname;
    waitingText.innerHTML = "You're in! See your nickname<br>on screen?";
    waitingCard.classList.remove("hidden");
    playerFooter.classList.remove("hidden");
  }

  btnJoin.addEventListener("click", join);
  [nicknameInput, pinInput].forEach((el) => el.addEventListener("keypress", (e) => { if (e.key === "Enter") join(); }));

  function bindGameEvents() {
    Api.realtime.on("STATE_GET_READY", () => {
      hideMainCards();
      getReadyCard.classList.remove("hidden");
      document.querySelectorAll(".pad-btn").forEach((btn) => { btn.disabled = false; btn.style.opacity = "1"; });
    });

    Api.realtime.on("STATE_SHOW_PAD", (data) => {
      hideMainCards();
      answerPad.classList.remove("hidden");
      document.getElementById("pad-q-num").textContent = data.qIndex !== undefined ? data.qIndex + 1 : "1";
      const grid = document.getElementById("pad-grid");
      grid.classList.toggle("mode-tf", !!data.isTF);
      document.getElementById("pad-q-type").textContent = data.isTF ? "True/False" : "Quiz";
      document.getElementById("pad-q-icon").textContent = data.isTF ? "◩" : "▦";
    });

    Api.realtime.on("STATE_WAITING", () => {
      hideMainCards();
      waitingCard.classList.remove("hidden");
      waitingText.textContent = "Waiting for results...";
    });

    Api.realtime.on("STATE_SHOW_RESULT", (data) => {
      const me = data.results && data.results[currentPlayer.id];
      if (!me) return;
      hideMainCards();
      resultCard.classList.remove("hidden", "correct-bg", "incorrect-bg");

      if (me.correct) {
        resultCard.classList.add("correct-bg");
        document.getElementById("result-banner").textContent = "Correct";
        document.getElementById("score-gained-text").textContent = "+ " + (me.gained || 0);
        document.getElementById("podium-text").textContent = "Awesome!";
      } else {
        resultCard.classList.add("incorrect-bg");
        document.getElementById("result-banner").textContent = "Incorrect";
        document.getElementById("score-gained-text").textContent = "+ 0";
        document.getElementById("podium-text").textContent = "Dust yourself off!";
      }
      document.getElementById("footer-player-score").textContent = me.score;
    });

    Api.realtime.on("STATE_GAME_OVER", () => {
      hideMainCards();
      waitingCard.classList.remove("hidden");
      waitingText.innerHTML = "Game Over!<br>Look at the Podium 🏆";
    });
  }

  document.querySelectorAll(".pad-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      if (this.disabled || !currentPlayer) return;
      Api.realtime.send("PLAYER_ANSWERED", {
        answerIndex: Number(this.getAttribute("data-index")),
        playerId: currentPlayer.id
      });
      hideMainCards();
      waitingCard.classList.remove("hidden");
      waitingText.textContent = "Answer submitted! Waiting...";
    });
  });
});
