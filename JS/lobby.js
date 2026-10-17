"use strict";

const channel = new BroadcastChannel("kahoot_game_bus");

const session = JSON.parse(localStorage.getItem("churchQuizGameSession") || "null");

if (!session) {
  alert("لم يتم العثور على جلسة نشطة. يرجى إنشاء جلسة أولاً.");
  window.location.href = "admin.html";
}

const pinCode = session.roomCode || "482731";
const quizTitle = session.quizTitle || "Church Quiz Live";

document.getElementById("lobbyPinCode").textContent = pinCode;
document.getElementById("lobbyQuizTitle").textContent = quizTitle;

let host = window.location.host;
const participantUrl = `${window.location.protocol}//${host}${window.location.pathname.replace("lobby.html", "participant.html")}?pin=${pinCode}`;

document.getElementById("joinUrlText").textContent = participantUrl;

const qrContainer = document.getElementById("qrcode");
qrContainer.innerHTML = "";

new QRCode(qrContainer, {
  text: participantUrl,
  width: 100,
  height: 100,
  colorDark: "#0B1E36",
  colorLight: "#ffffff",
  correctLevel: QRCode.CorrectLevel.H
});

let joinedPlayers = [];

const storedPlayers = JSON.parse(localStorage.getItem("churchQuizPlayers") || "[]");
if (storedPlayers.length > 0) {
  storedPlayers.forEach(p => addPlayerToArena(p));
}

channel.onmessage = (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "PLAYER_JOINED" && data.player) {
    addPlayerToArena(data.player);
  }
};

function addPlayerToArena(player) {
  if (joinedPlayers.some(p => p.fullName === player.fullName)) return;

  joinedPlayers.push(player);
  localStorage.setItem("churchQuizPlayers", JSON.stringify(joinedPlayers));

  const arena = document.getElementById("playersArena");
  const emptyMsg = document.getElementById("emptyMsg");
  if (emptyMsg) emptyMsg.style.display = "none";

  const tag = document.createElement("div");
  tag.className = "player-tag";
  tag.innerHTML = `
    <span class="player-tag-avatar">${player.avatar || "👤"}</span>
    <span>${player.fullName}</span>
  `;

  arena.appendChild(tag);

  document.getElementById("playerCount").textContent = joinedPlayers.length;
  document.getElementById("startGameBtn").disabled = false;
}

// التوجيه المباشر دون إرسال حدث مبكر للسؤال
document.getElementById("startGameBtn").addEventListener("click", () => {
  window.location.href = `quiz.html?quiz=${session.quizId}`;
});