"use strict";

/* host-game.js — شاشة العرض الرئيسية (Host). كل البيانات والـ Realtime عن طريق Api. */

const POINTS_MULTIPLIER = { standard: 1, double: 2, none: 0, zero: 0 };
const AVATARS = ["🥇", "🥈", "🥉"];
const $ = (id) => document.getElementById(id);

let session = null;
let questions = [];
let currentQIndex = 0;
let countdownTimer = null;
let questionTimer = null;
let questionStartTime = 0;
let acceptingAnswers = false;
let currentAnswers = []; // { playerId, answerIndex, correct, gained, timeMs }
let playersData = [];    // { id, nickname, score, correctCount, totalTimeMs, lastGained, isCorrect }

const formatTime = (secs) => (secs >= 60 ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : String(secs));

function leaveToAdmin(message) {
  if (message) alert(message);
  window.location.href = "admin.html";
}

/* ---------------- اللاعبين ---------------- */

async function syncPlayers() {
  try {
    const latest = await Api.game.players(session.roomCode);
    latest.forEach((lp) => {
      if (!playersData.some((p) => p.id === lp.id)) {
        playersData.push({ id: lp.id, nickname: lp.nickname, score: 0, correctCount: 0, totalTimeMs: 0, lastGained: 0, isCorrect: false });
      }
    });
    $("header-players").textContent = playersData.length;
  } catch (e) { console.warn("players sync failed", e); }
}

/* ---------------- استقبال الإجابات ---------------- */

function onPlayerAnswered(data) {
  if (!acceptingAnswers) return;                                   // متأخرة أو بين الأسئلة
  const q = questions[currentQIndex];
  const answerIndex = parseInt(data.answerIndex, 10);
  if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= q.answers.length) return;
  if (!playersData.some((p) => p.id === data.playerId)) return;    // لاعب مش معروف
  if (currentAnswers.some((a) => a.playerId === data.playerId)) return; // نفس اللاعب جاوب قبل كده

  const timeMs = Date.now() - questionStartTime;
  const maxMs = (q.timeLimit || 20) * 1000;
  const correct = answerIndex === parseInt(q.correct, 10);

  let gained = 0;
  if (correct) {
    gained = Math.max(500, Math.round((1 - timeMs / maxMs / 2) * 1000));
    gained = Math.round(gained * (POINTS_MULTIPLIER[q.points] ?? 1));
  }

  currentAnswers.push({ playerId: data.playerId, answerIndex, correct, gained, timeMs });
  $("q-answers-count").textContent = currentAnswers.length;
}

/* ---------------- الشاشات ---------------- */

function showScreen(id) {
  document.querySelectorAll(".game-container > section").forEach((s) => {
    s.classList.remove("active", "hidden");
    s.classList.add(s.id === id ? "active" : "hidden");
  });
}

function runGameFlow() {
  if (currentQIndex >= questions.length) return showFinalPodium();

  currentAnswers = [];
  acceptingAnswers = false;
  const q = questions[currentQIndex];

  showScreen("screen-get-ready");
  Api.realtime.send("STATE_GET_READY");

  setTimeout(() => {
    showScreen("screen-countdown");
    let count = 3;
    $("countdown-text").textContent = count;
    countdownTimer = setInterval(() => {
      count--;
      if (count > 0) $("countdown-text").textContent = count;
      else { clearInterval(countdownTimer); showQuestionInfo(q); }
    }, 1000);
  }, 2000);
}

function showQuestionInfo(q) {
  showScreen("screen-question-info");
  $("info-q-text").textContent = q.text;
  $("info-shapes").textContent = q.type === "tf" ? "▲ ◆" : "▲ ◆ ● ■";
  setTimeout(() => showActiveQuestion(q), 2500);
}

function showActiveQuestion(q) {
  showScreen("screen-active-question");
  $("active-q-text").textContent = q.text;
  $("q-answers-count").textContent = "0";

  const img = $("q-image");
  if (q.image) {
    img.src = q.image;
    img.style.display = "block";
    $("q-placeholder").style.display = "none";
  } else {
    img.style.display = "none";
    $("q-placeholder").style.display = "block";
  }

  const isTF = q.type === "tf";
  $("host-answers-grid").className = `q-answers-grid ${isTF ? "mode-tf" : "mode-mcq"}`;
  for (let i = 0; i < 4; i++) {
    const box = $(`ans-${i}`).parentElement;
    box.classList.remove("opacity-50");
    box.classList.add("opacity-100");
    $(`stat-${i}`).textContent = "";
    $(`ans-${i}`).textContent = i < q.answers.length && q.answers[i] ? q.answers[i] : "";
  }

  questionStartTime = Date.now();
  acceptingAnswers = true;
  Api.realtime.send("STATE_SHOW_PAD", { isTF, qIndex: currentQIndex });

  let timeLeft = q.timeLimit || 20;
  $("q-timer").textContent = formatTime(timeLeft);
  questionTimer = setInterval(() => {
    timeLeft--;
    $("q-timer").textContent = formatTime(Math.max(timeLeft, 0));
    if (timeLeft <= 0) { clearInterval(questionTimer); showResultsChart(q); }
  }, 1000);
}

function showResultsChart(q) {
  acceptingAnswers = false;
  showScreen("screen-results");
  $("result-q-text").textContent = q.text;
  const correctIdx = parseInt(q.correct, 10);

  // تطبيق النقاط
  playersData.forEach((p) => {
    const ans = currentAnswers.find((a) => a.playerId === p.id);
    p.lastGained = ans ? ans.gained : 0;
    p.isCorrect = !!ans && ans.correct;
    if (ans) {
      p.score += ans.gained;
      p.totalTimeMs += ans.timeMs;
      if (ans.correct) p.correctCount++;
    } else {
      p.totalTimeMs += (q.timeLimit || 20) * 1000;
    }
  });

  // كل لاعب بياخد نتيجته من الرسالة دي (من غير ما يقرا أي تخزين محلي)
  const results = {};
  playersData.forEach((p) => { results[p.id] = { correct: p.isCorrect, gained: p.lastGained, score: p.score }; });
  Api.realtime.send("STATE_SHOW_RESULT", { results });

  for (let i = 0; i < 4; i++) {
    const box = $(`ans-${i}`).parentElement;
    const stat = $(`stat-${i}`);
    if (i === correctIdx) {
      stat.textContent = "✔";
      stat.style.color = "#fff";
    } else {
      box.classList.remove("opacity-100");
      box.classList.add("opacity-50");
      stat.textContent = "✖";
    }
  }

  const counts = [0, 0, 0, 0];
  currentAnswers.forEach((a) => { counts[a.answerIndex]++; });
  const maxCount = Math.max(...counts, 1);
  const isTF = q.type === "tf";
  $("wrap-2").style.display = isTF ? "none" : "flex";
  $("wrap-3").style.display = isTF ? "none" : "flex";

  const colors = ["#e21b3c", "#1368ce", "#d89e00", "#26890c"];
  for (let i = 0; i < 4; i++) {
    const bar = $(`bar-${i}`);
    bar.style.height = "0%";
    setTimeout(() => { bar.style.height = `${(counts[i] / maxCount) * 100}%`; }, 100);
    $(`count-${i}`).textContent = counts[i];
    bar.style.opacity = i !== correctIdx ? "0.4" : "1";
    bar.nextElementSibling.style.backgroundColor = colors[i];
  }

  setTimeout(showLeaderboard, 4000);
}

function showLeaderboard() {
  showScreen("screen-leaderboard");
  playersData.sort((a, b) => b.score - a.score);
  const list = $("leaderboard-list");
  list.replaceChildren();

  // بنبني العناصر بـ textContent (مش innerHTML) عشان اسم اللاعب ما يقدرش يحقن كود
  playersData.slice(0, 5).forEach((p, index) => {
    const row = document.createElement("div");
    row.className = "lb-row";

    const left = document.createElement("div");
    left.className = "lb-left";
    const medal = document.createElement("span");
    medal.textContent = AVATARS[index] || "🦊";
    const name = document.createElement("span");
    name.className = "lb-name";
    name.textContent = p.nickname;
    left.append(medal, name);

    const right = document.createElement("div");
    right.className = "lb-right";
    const score = document.createElement("span");
    score.className = "lb-score";
    score.textContent = p.score;
    const trend = document.createElement("span");
    trend.className = "lb-trend";
    trend.textContent = p.lastGained > 0 ? "⬆" : "";
    right.append(score, trend);

    row.append(left, right);
    list.appendChild(row);
  });

  setTimeout(() => { currentQIndex++; runGameFlow(); }, 5000);
}

async function saveResultsOnce() {
  if (!playersData.length) return;
  try {
    await Api.results.saveGame({
      quizId: session.quizId,
      quizTitle: session.quizTitle,
      roomCode: session.roomCode,
      totalQuestions: questions.length,
      players: playersData.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        points: p.score,
        correct: p.correctCount,
        timeSeconds: Math.round(p.totalTimeMs / 1000)
      }))
    });
  } catch (e) { console.warn("Could not save results:", e); }
  // نقفل الجلسة عشان إعادة تحميل الصفحة ما تعيدش اللعبة وتكرر النتايج
  Api.game.saveCurrent({ ...session, status: "finished" });
}

function showFinalPodium() {
  showScreen("screen-final-podium");
  playersData.sort((a, b) => b.score - a.score);
  Api.realtime.send("STATE_GAME_OVER");
  saveResultsOnce();

  const reveal = (rank, delay) => setTimeout(() => {
    $(`podium-${rank}`).classList.remove("hidden");
    const p = playersData[rank - 1];
    if (p) {
      $(`w-name-${rank}`).textContent = p.nickname;
      $(`w-score-${rank}`).textContent = p.score;
      $(`w-name-${rank}`).parentElement.classList.add("show-info");
    }
    if (rank === 1) setTimeout(() => $("btn-return-admin").classList.remove("hidden"), 2000);
  }, delay);

  reveal(3, 1000);
  reveal(2, 3000);
  reveal(1, 5000);
}

/* ---------------- Start ---------------- */

async function main() {
  if (!Api.auth.requireLogin()) return;

  session = Api.game.current();
  if (!session || session.status !== "playing") return leaveToAdmin("No active game session.");

  questions = session.questions || [];
  if (!questions.length) return leaveToAdmin("This quiz has no questions.");

  await Api.realtime.connect({ pin: session.roomCode, role: "host" });
  Api.realtime.on("PLAYER_ANSWERED", onPlayerAnswered);

  await syncPlayers();
  setInterval(syncPlayers, 1000);

  $("btn-return-admin").addEventListener("click", () => { window.location.href = "admin.html"; });
  setTimeout(runGameFlow, 1000);
}

main().catch((e) => { console.error(e); leaveToAdmin("Could not start the game: " + (e.message || e.code)); });
