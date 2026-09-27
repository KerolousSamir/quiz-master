/* =====================================================
   QUIZ MASTER
   STEP 30
   Clean & Organized JavaScript
===================================================== */

/* =====================================================
   1. QUIZ DATA
===================================================== */

const questions = [
  {
    question: "What is 5 * 5?",
    answers: ["10", "15", "20", "25"],
    correctAnswer: "25",
  },

  {
    question: "What is 10 / 2?",
    answers: ["2", "5", "10", "20"],
    correctAnswer: "5",
  },

  {
    question: "What is 7 + 3?",
    answers: ["8", "9", "10", "11"],
    correctAnswer: "10",
  },

  {
    question: "What is 12 - 4?",
    answers: ["6", "7", "8", "9"],
    correctAnswer: "8",
  },
];

/* =====================================================
   2. GAME SETTINGS
===================================================== */

const GAME_CONFIG = {
  roomCode: "482731",

  questionTime: 10,

  storageKey: "quizResults",
};

/* =====================================================
   3. GAME STATE
===================================================== */

const game = {
  currentQuestion: 0,

  score: 0,

  playerName: "",

  timeLeft: GAME_CONFIG.questionTime,

  timer: null,

  quizStartTime: 0,

  gameStarted: false,
};

/* =====================================================
   4. DOM ELEMENTS
===================================================== */

const elements = {
  /* Screens */

  screens: document.querySelectorAll(".screen"),

  /* Home */

  playerNameInput: document.getElementById("player_name"),

  startBtn: document.getElementById("start_btn"),

  teacherBtn: document.getElementById("teacher_btn"),

  joinGameBtn: document.getElementById("join_game_btn"),

  /* Host */

  hostStartBtn: document.getElementById("host_start_btn"),

  hostBackBtn: document.getElementById("host_back_btn"),

  hostRoomCode: document.getElementById("host_room_code"),

  /* Join */

  gameCodeInput: document.getElementById("game_code"),

  joinPlayerNameInput: document.getElementById("join_player_name"),

  joinBtn: document.getElementById("join_btn"),

  joinBackBtn: document.getElementById("join_back_btn"),

  /* Waiting */

  waitingPlayerName: document.getElementById("waiting_player_name"),

  waitingRoomCode: document.getElementById("waiting_room_code"),

  waitingBackBtn: document.getElementById("waiting_back_btn"),

  /* Quiz */

  playerNameDisplay: document.getElementById("player-name-display"),

  questionNumber: document.getElementById("question-number"),

  progressBar: document.getElementById("progress-bar"),

  timer: document.getElementById("timer"),

  questionText: document.getElementById("question-text"),

  answersContainer: document.getElementById("answers-container"),

  nextBtn: document.getElementById("next_btn"),

  /* Result */

  resultPlayerName: document.getElementById("result_player_name"),

  scoreText: document.getElementById("score_text"),

  scorePercentage: document.getElementById("score_percentage"),

  correctAnswers: document.getElementById("correct_answers"),

  wrongAnswers: document.getElementById("wrong_answers"),

  resultTime: document.getElementById("result_time"),

  playerRank: document.getElementById("player_rank"),

  leaderboardBtn: document.getElementById("leaderboard_btn"),

  restartBtn: document.getElementById("restart_btn"),

  /* Leaderboard */

  leaderboardBody: document.getElementById("leaderboard_body"),

  leaderboardBackBtn: document.getElementById("leaderboard_back_btn"),

  firstName: document.getElementById("first_name"),

  firstScore: document.getElementById("first_score"),

  firstTime: document.getElementById("first_time"),

  secondName: document.getElementById("second_name"),

  secondScore: document.getElementById("second_score"),

  secondTime: document.getElementById("second_time"),

  thirdName: document.getElementById("third_name"),

  thirdScore: document.getElementById("third_score"),

  thirdTime: document.getElementById("third_time"),

  playersCount: document.getElementById("players_count"),

  averageScore: document.getElementById("average_score"),

  totalCorrect: document.getElementById("total_correct"),

  totalWrong: document.getElementById("total_wrong"),

  fastestTime: document.getElementById("fastest_time"),
};

/* =====================================================
   5. SCREEN FUNCTIONS
===================================================== */

function hideAllScreens() {
  elements.screens.forEach((screen) => {
    screen.classList.remove("active");
  });
}

function showScreen(screenId) {
  hideAllScreens();

  const screen = document.getElementById(screenId);

  if (!screen) {
    return;
  }

  screen.classList.add("active");
}

/* =====================================================
   6. VALIDATION HELPERS
===================================================== */

function getPlayerName(input) {
  return input.value.trim();
}

function isValidName(name) {
  return name.length > 0;
}

/* =====================================================
   7. START SOLO QUIZ
===================================================== */

function startQuiz(name) {
  game.playerName = name;

  game.currentQuestion = 0;

  game.score = 0;

  game.timeLeft = GAME_CONFIG.questionTime;

  game.quizStartTime = Date.now();

  game.gameStarted = true;

  elements.playerNameDisplay.textContent = game.playerName;

  showScreen("quiz_screen");

  showQuestion();
}

/* =====================================================
   8. HOME → START
===================================================== */

elements.startBtn.addEventListener("click", () => {
  const name = getPlayerName(elements.playerNameInput);

  if (!isValidName(name)) {
    alert("Please enter your name.");

    elements.playerNameInput.focus();

    return;
  }

  startQuiz(name);
});

/* =====================================================
   9. HOST SCREEN
===================================================== */

elements.teacherBtn.addEventListener("click", () => {
  elements.hostRoomCode.textContent = GAME_CONFIG.roomCode;

  showScreen("host_screen");
});

elements.hostBackBtn.addEventListener("click", () => {
  showScreen("home_screen");
});

/* =====================================================
   10. HOST START
===================================================== */

elements.hostStartBtn.addEventListener("click", () => {
  game.gameStarted = true;

  alert(
    "The game has started!\n\n" +
      "Real-time control will be connected " +
      "when we build the Backend.",
  );
});

/* =====================================================
   11. JOIN SCREEN
===================================================== */

elements.joinGameBtn.addEventListener("click", () => {
  showScreen("join_screen");
});

elements.joinBackBtn.addEventListener("click", () => {
  showScreen("home_screen");
});

/* =====================================================
   12. JOIN GAME
===================================================== */

elements.joinBtn.addEventListener("click", () => {
  const roomCode = elements.gameCodeInput.value.trim();

  const name = getPlayerName(elements.joinPlayerNameInput);

  if (!roomCode) {
    alert("Please enter the room code.");

    return;
  }

  if (!name) {
    alert("Please enter your name.");

    return;
  }

  if (roomCode !== GAME_CONFIG.roomCode) {
    alert("Invalid room code.");

    return;
  }

  game.playerName = name;

  game.gameStarted = false;

  elements.waitingPlayerName.textContent = game.playerName;

  elements.waitingRoomCode.textContent = GAME_CONFIG.roomCode;

  showScreen("waiting_screen");
});

/* =====================================================
   13. LEAVE WAITING ROOM
===================================================== */

elements.waitingBackBtn.addEventListener("click", () => {
  game.gameStarted = false;

  showScreen("join_screen");
});

/* =====================================================
   14. SHOW QUESTION
===================================================== */

function showQuestion() {
  stopTimer();

  elements.nextBtn.classList.remove("show");

  elements.answersContainer.innerHTML = "";

  const current = questions[game.currentQuestion];

  if (!current) {
    finishQuiz();
    return;
  }

  /* Question */

  elements.questionText.textContent = current.question;

  /* Question Number */

  elements.questionNumber.textContent = `Question ${
    game.currentQuestion + 1
  } / ${questions.length}`;

  /* Progress */

  const progress = ((game.currentQuestion + 1) / questions.length) * 100;

  elements.progressBar.style.width = `${progress}%`;

  /* Timer */

  game.timeLeft = GAME_CONFIG.questionTime;

  updateTimer();

  /* Answers */

  current.answers.forEach((answer, index) => {
    createAnswerButton(answer, index);
  });

  startTimer();
}

/* =====================================================
   15. CREATE ANSWER BUTTON
===================================================== */

function createAnswerButton(answer, index) {
  const button = document.createElement("button");

  button.type = "button";

  button.className = "answer-btn";

  button.textContent = answer;

  button.style.animationDelay = `${index * 0.08}s`;

  button.addEventListener("click", () => {
    checkAnswer(button, answer);
  });

  elements.answersContainer.appendChild(button);
}

/* =====================================================
   16. TIMER
===================================================== */

function startTimer() {
  stopTimer();

  game.timer = setInterval(() => {
    game.timeLeft--;

    updateTimer();

    if (game.timeLeft <= 0) {
      stopTimer();

      disableAnswers();

      revealCorrectAnswer();

      elements.nextBtn.classList.add("show");
    }
  }, 1000);
}

function stopTimer() {
  if (game.timer) {
    clearInterval(game.timer);

    game.timer = null;
  }
}

function updateTimer() {
  elements.timer.textContent = game.timeLeft;

  elements.timer.classList.remove("warning", "danger");

  if (game.timeLeft <= 5) {
    elements.timer.classList.add("warning");
  }

  if (game.timeLeft <= 3) {
    elements.timer.classList.remove("warning");

    elements.timer.classList.add("danger");
  }
}

/* =====================================================
   17. CHECK ANSWER
===================================================== */

function checkAnswer(selectedButton, selectedAnswer) {
  stopTimer();

  disableAnswers();

  const correctAnswer = questions[game.currentQuestion].correctAnswer;

  revealCorrectAnswer();

  if (selectedAnswer === correctAnswer) {
    game.score++;

    selectedButton.classList.add("correct");
  } else {
    selectedButton.classList.add("wrong");
  }

  elements.nextBtn.classList.add("show");
}

/* =====================================================
   18. REVEAL CORRECT ANSWER
===================================================== */

function revealCorrectAnswer() {
  const correctAnswer = questions[game.currentQuestion].correctAnswer;

  const buttons = elements.answersContainer.querySelectorAll(".answer-btn");

  buttons.forEach((button) => {
    if (button.textContent === correctAnswer) {
      button.classList.add("correct");
    }
  });
}

/* =====================================================
   19. DISABLE ANSWERS
===================================================== */

function disableAnswers() {
  const buttons = elements.answersContainer.querySelectorAll(".answer-btn");

  buttons.forEach((button) => {
    button.disabled = true;
  });
}

/* =====================================================
   20. NEXT QUESTION
===================================================== */

elements.nextBtn.addEventListener("click", () => {
  game.currentQuestion++;

  if (game.currentQuestion < questions.length) {
    showQuestion();
  } else {
    finishQuiz();
  }
});

/* =====================================================
   21. FINISH QUIZ
===================================================== */

function finishQuiz() {
  stopTimer();

  const totalTime = Math.round((Date.now() - game.quizStartTime) / 1000);

  const correct = game.score;

  const wrong = questions.length - game.score;

  const percentage = Math.round((game.score / questions.length) * 100);

  const result = {
    name: game.playerName,

    score: game.score,

    correct: correct,

    wrong: wrong,

    time: totalTime,

    date: new Date().toISOString(),
  };

  /* Update Result Screen */

  elements.resultPlayerName.textContent = game.playerName;

  elements.scoreText.textContent = `${game.score} / ${questions.length}`;

  elements.scorePercentage.textContent = `${percentage}%`;

  elements.correctAnswers.textContent = correct;

  elements.wrongAnswers.textContent = wrong;

  elements.resultTime.textContent = `${totalTime}s`;

  /* Save */

  saveResult(result);

  /* Calculate Rank */

  const rank = calculateRank(result);

  elements.playerRank.textContent = `#${rank}`;

  showScreen("result_screen");
}

/* =====================================================
   22. LOCAL STORAGE
===================================================== */

function getResults() {
  const saved = localStorage.getItem(GAME_CONFIG.storageKey);

  if (!saved) {
    return [];
  }

  try {
    const results = JSON.parse(saved);

    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error("Could not read quiz results:", error);

    return [];
  }
}

function saveResult(result) {
  const results = getResults();

  results.push(result);

  localStorage.setItem(GAME_CONFIG.storageKey, JSON.stringify(results));
}

/* =====================================================
   23. SORT RESULTS
===================================================== */

function sortResults(results) {
  return [...results].sort((a, b) => {
    /* Higher score first */

    if (b.score !== a.score) {
      return b.score - a.score;
    }

    /* Faster time first */

    return a.time - b.time;
  });
}

/* =====================================================
   24. CALCULATE RANK
===================================================== */

function calculateRank(currentResult) {
  const results = sortResults(getResults());

  const index = results.findIndex(
    (result) =>
      result.name === currentResult.name &&
      result.score === currentResult.score &&
      result.time === currentResult.time &&
      result.date === currentResult.date,
  );

  return index + 1;
}

/* =====================================================
   25. LEADERBOARD
===================================================== */

elements.leaderboardBtn.addEventListener("click", () => {
  loadLeaderboard();

  showScreen("leaderboard_screen");
});

/* =====================================================
   26. LOAD LEADERBOARD
===================================================== */

function loadLeaderboard() {
  const results = sortResults(getResults());

  resetPodium();

  displayTopPlayers(results);

  displayStatistics(results);

  displayTable(results);
}

/* =====================================================
   27. RESET PODIUM
===================================================== */

function resetPodium() {
  elements.firstName.textContent = "-";

  elements.firstScore.textContent = "0";

  elements.firstTime.textContent = "0s";

  elements.secondName.textContent = "-";

  elements.secondScore.textContent = "0";

  elements.secondTime.textContent = "0s";

  elements.thirdName.textContent = "-";

  elements.thirdScore.textContent = "0";

  elements.thirdTime.textContent = "0s";
}

/* =====================================================
   28. DISPLAY TOP PLAYERS
===================================================== */

function displayTopPlayers(results) {
  const topPlayers = results.slice(0, 3);

  if (topPlayers[0]) {
    elements.firstName.textContent = topPlayers[0].name;

    elements.firstScore.textContent = topPlayers[0].score;

    elements.firstTime.textContent = `${topPlayers[0].time}s`;
  }

  if (topPlayers[1]) {
    elements.secondName.textContent = topPlayers[1].name;

    elements.secondScore.textContent = topPlayers[1].score;

    elements.secondTime.textContent = `${topPlayers[1].time}s`;
  }

  if (topPlayers[2]) {
    elements.thirdName.textContent = topPlayers[2].name;

    elements.thirdScore.textContent = topPlayers[2].score;

    elements.thirdTime.textContent = `${topPlayers[2].time}s`;
  }
}

/* =====================================================
   29. DISPLAY STATISTICS
===================================================== */

function displayStatistics(results) {
  elements.playersCount.textContent = results.length;

  if (results.length === 0) {
    elements.averageScore.textContent = "0%";

    elements.totalCorrect.textContent = "0";

    elements.totalWrong.textContent = "0";

    elements.fastestTime.textContent = "-";

    return;
  }

  const totalScore = results.reduce((sum, result) => sum + result.score, 0);

  const average = Math.round(
    (totalScore / (results.length * questions.length)) * 100,
  );

  const totalCorrect = results.reduce((sum, result) => sum + result.correct, 0);

  const totalWrong = results.reduce((sum, result) => sum + result.wrong, 0);

  const fastest = Math.min(...results.map((result) => result.time));

  elements.averageScore.textContent = `${average}%`;

  elements.totalCorrect.textContent = totalCorrect;

  elements.totalWrong.textContent = totalWrong;

  elements.fastestTime.textContent = `${fastest}s`;
}

/* =====================================================
   30. DISPLAY TABLE
===================================================== */

function displayTable(results) {
  elements.leaderboardBody.innerHTML = "";

  if (results.length === 0) {
    elements.leaderboardBody.innerHTML = `

            <tr>

                <td colspan="4">
                    No players yet
                </td>

            </tr>

        `;

    return;
  }

  results.forEach((result, index) => {
    const row = document.createElement("tr");

    row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(result.name)}
                </td>

                <td>
                    ${result.score}/${questions.length}
                </td>

                <td>
                    ${result.time}s
                </td>

            `;

    elements.leaderboardBody.appendChild(row);
  });
}

/* =====================================================
   31. BASIC HTML ESCAPE
===================================================== */

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =====================================================
   32. LEADERBOARD BACK
===================================================== */

elements.leaderboardBackBtn.addEventListener("click", () => {
  showScreen("result_screen");
});

/* =====================================================
   33. PLAY AGAIN
===================================================== */

elements.restartBtn.addEventListener("click", () => {
  stopTimer();

  game.currentQuestion = 0;

  game.score = 0;

  game.timeLeft = GAME_CONFIG.questionTime;

  game.gameStarted = false;

  elements.playerNameInput.value = game.playerName;

  showScreen("home_screen");
});

/* =====================================================
   34. ENTER KEY SUPPORT
===================================================== */

elements.playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    elements.startBtn.click();
  }
});

elements.gameCodeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    elements.joinBtn.click();
  }
});

elements.joinPlayerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    elements.joinBtn.click();
  }
});

/* =====================================================
   35. INITIALIZE APP
===================================================== */

function initializeApp() {
  elements.hostRoomCode.textContent = GAME_CONFIG.roomCode;

  elements.waitingRoomCode.textContent = GAME_CONFIG.roomCode;

  showScreen("home_screen");
}

/* =====================================================
   START APPLICATION
===================================================== */

initializeApp();
