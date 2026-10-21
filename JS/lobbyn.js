"use strict";

/* lobby.js — شاشة الانتظار (الـ Host). البيانات من Api فقط. */

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);

function drawQr(elementId, text, size) {
  const el = document.getElementById(elementId);
  if (!el) return;
  // مكتبة الـ QR جاية من CDN. لو مش متاحة (مفيش نت) نكمّل من غيرها ونعرض الرابط نصاً.
  if (typeof QRCode === "function") {
    try {
      new QRCode(el, { text, width: size, height: size, colorDark: "#0B1E36", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.H });
      return;
    } catch (e) { console.warn("QR failed:", e); }
  }
  el.innerHTML = `<div style="font:600 12px/1.4 sans-serif;word-break:break-all;color:#0B1E36;max-width:${size}px">${escapeHTML(text)}</div>`;
}

let displayedPlayersCount = -1;

function updatePlayersUI(players) {
  const container = document.getElementById("players-list");
  const countDisplay = document.getElementById("player-count-num");

  if (!players || players.length === 0) {
    if (displayedPlayersCount !== 0) {
      container.innerHTML = `<div class="waiting-badge">Waiting for participants...</div>`;
      countDisplay.textContent = "0";
      displayedPlayersCount = 0;
    }
    return;
  }

  // مفيش إعادة رسم لو العدد ما اتغيرش (لمنع الوميض)
  if (players.length === displayedPlayersCount) return;
  displayedPlayersCount = players.length;

  countDisplay.textContent = players.length;
  container.innerHTML = players.map((p) => `<div class="player-tag">${escapeHTML(p.nickname)}</div>`).join("");
}

function hideLoadingOverlay() {
  const overlay = document.getElementById("loading-overlay");
  overlay.style.opacity = "0";
  setTimeout(() => { overlay.style.display = "none"; }, 500);
}

document.addEventListener("DOMContentLoaded", () => {
  if (!Api.auth.requireLogin()) return;

  const session = Api.game.current();
  if (!session) {
    alert("No active session found. Returning to Dashboard.");
    window.location.href = "admin.html";
    return;
  }

  const pin = session.roomCode;
  document.getElementById("display-pin").textContent = pin;
  document.getElementById("modal-display-pin").textContent = pin;
  document.getElementById("quiz-title-display").textContent = session.quizTitle || "";
  document.querySelectorAll(".join-host").forEach((el) => { el.textContent = window.location.host || "localhost"; });

  const joinUrl = `${window.location.origin}${window.location.pathname.replace("lobby.html", "player.html")}?pin=${pin}`;
  drawQr("qrcode-small", joinUrl, 70);
  drawQr("qrcode-large", joinUrl, 400);

  setTimeout(hideLoadingOverlay, 1200);

  const qrModal = document.getElementById("qr-modal");
  document.getElementById("qr-trigger").addEventListener("click", () => { qrModal.style.display = "flex"; });
  document.getElementById("qr-close-btn").addEventListener("click", () => { qrModal.style.display = "none"; });
  qrModal.addEventListener("click", (e) => { if (e.target === qrModal) qrModal.style.display = "none"; });

  document.getElementById("btn-start-game").addEventListener("click", async () => {
    try {
      await Api.game.start(pin);
      window.location.href = "host-game.html";
    } catch (err) {
      alert("Could not start the game: " + (err.message || err.code));
    }
  });

  const refreshPlayers = async () => {
    try { updatePlayersUI(await Api.game.players(pin)); } catch (e) { console.warn("players refresh failed", e); }
  };
  refreshPlayers();
  setInterval(refreshPlayers, 1000);
});
