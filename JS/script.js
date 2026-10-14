
console.log("script.js loaded");

const $ = (id) => document.getElementById(id);

const ROOM_CODE = "482731";
const QUESTION_TIME = 10;
const STORAGE_KEY = "churchQuizResults";
const USERS_KEY = "churchQuizUsers";
const SESSION_KEY = "churchQuizSession";
const GAME_SESSION_KEY = "churchQuizGameSession";

const questions = [
  {
    question: "What is the first book of the Bible?",
    answers: ["Genesis", "Exodus", "Psalms", "Matthew"],
    correct: 0
  },
  {
    question: "Who built the ark?",
    answers: ["Moses", "Noah", "David", "Peter"],
    correct: 1
  },
  {
    question: "Where was Jesus born?",
    answers: ["Jerusalem", "Nazareth", "Bethlehem", "Capernaum"],
    correct: 2
  },
  {
    question: "How many disciples did Jesus choose?",
    answers: ["10", "11", "12", "7"],
    correct: 2
  }
];

const translations = {
  en: {
    eyebrow: "LEARN • PLAY • GROW",
    welcome: "Create Your Account",
    intro: "Create your account and grow together in faith.",
    nameLabel: "Your name",
    emailLabel: "Email address",
    passwordLabel: "Password",
    roleLabel: "Choose Your Role",
    creator: "Creator",
    creatorDesc: "Create quizzes",
    player: "Player",
    playerDesc: "Play quizzes",
    createAccount: "Create Account",
    loginPrompt: "Already have an account?",
    login: "Log in",
    showPassword: "Show password",
    hidePassword: "Hide password",
    nameRequired: "Please enter your name.",
    emailRequired: "Please enter a valid email address.",
    passwordRequired: "Please enter a password.",
    roleRequired: "Please select Creator or Player.",
    duplicateEmail: "You already have an account. Please log in.",
    accountCreated: "Your account has been created successfully!",
    creatorPending: "Account created. Your Creator request is waiting for Admin approval.",
    registrationError: "Could not create your account. Please try again.",
    back: "Back to Home",
    joinTitle: "You're invited!",
    joinIntro: "Enter your name and the room code.",
    roomLabel: "Room code",
    joinButton: "Join Game",
    waiting: "Waiting for the host to start the game...",
    leaderboard: "View Leaderboard",
    next: "Next Question",
    finish: "See Results",
    playAgain: "Back to Home",
    roomInvalid: "Please enter the correct room code.",
    chooseAnswer: "Please select an answer first.",
    noResults: "No results yet. Play a quiz to get started.",
    hostDemo: "Game session created. Waiting for players!",
    welcomePlayer: "Welcome"
  },

  ar: {
    eyebrow: "اتعلّم • العب • انمُ",
    welcome: "إنشاء حساب جديد",
    intro: "أنشئ حسابك وابدأ رحلتك في Church Quiz.",
    nameLabel: "الاسم",
    emailLabel: "البريد الإلكتروني",
    passwordLabel: "كلمة المرور",
    roleLabel: "اختار نوع الحساب",
    creator: "Creator",
    creatorDesc: "إنشاء الاختبارات",
    player: "Player",
    playerDesc: "حل الاختبارات",
    createAccount: "إنشاء الحساب",
    loginPrompt: "لديك حساب بالفعل؟",
    login: "تسجيل الدخول",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    nameRequired: "من فضلك اكتب اسمك.",
    emailRequired: "من فضلك اكتب بريدًا إلكترونيًا صحيحًا.",
    passwordRequired: "من فضلك اكتب كلمة المرور.",
    roleRequired: "من فضلك اختار Creator أو Player.",
    duplicateEmail: "لديك حساب بالفعل، برجاء تسجيل الدخول.",
    accountCreated: "تم إنشاء الحساب بنجاح!",
    creatorPending: "تم إنشاء الحساب. طلب Creator في انتظار موافقة Admin.",
    registrationError: "تعذر إنشاء الحساب. حاول مرة أخرى.",
    back: "العودة للرئيسية",
    joinTitle: "أنت مدعو!",
    joinIntro: "اكتب اسمك ورمز الغرفة.",
    roomLabel: "رمز الغرفة",
    joinButton: "انضم للعبة",
    waiting: "في انتظار المضيف لبدء اللعبة...",
    leaderboard: "لوحة المتصدرين",
    next: "السؤال التالي",
    finish: "عرض النتيجة",
    playAgain: "العودة للرئيسية",
    roomInvalid: "رمز الغرفة غير صحيح.",
    chooseAnswer: "من فضلك اختر إجابة أولًا.",
    noResults: "لا توجد نتائج بعد. العب لتظهر النتائج هنا.",
    hostDemo: "تم إنشاء جلسة اللعبة. في انتظار اللاعبين!",
    welcomePlayer: "أهلًا"
  }
};

let language = "en";
let currentQuestion = 0;
let score = 0;
let correctCount = 0;
let wrongCount = 0;
let secondsLeft = QUESTION_TIME;
let totalSeconds = 0;
let timerInterval = null;
let selectedAnswer = null;
let answerLocked = false;
let playerName = "";
let toastTimeout = null;

/* -------------------------
   General screen functions
------------------------- */

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const target = $(screenId);

  if (target) {
    target.classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
  const toast = $("toast");

  if (!toast) {
    alert(message);
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimeout);

  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function showAuthMessage(message, type = "error") {
  const box = $("authMessage");

  if (!box) {
    showToast(message);
    return;
  }

  box.textContent = message;
  box.className = `auth-message show ${type}`;
  box.style.color = type === "success" ? "#7CDAA0" : "#ff6b6b";
}

/* -------------------------
   Local storage
------------------------- */

function getResults() {
  try {
    const results = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(results) ? results : [];
  } catch (error) {
    console.error("Could not read quiz results:", error);
    return [];
  }
}

function saveResult(result) {
  const results = getResults();

  results.push(result);
  results.sort((a, b) => b.score - a.score || a.time - b.time);

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(results.slice(0, 100))
    );
  } catch (error) {
    console.error("Could not save results:", error);
    showToast("Could not save your result.");
  }
}

function getUsers() {
  try {
    const users = JSON.parse(
      localStorage.getItem(USERS_KEY) || "[]"
    );

    return Array.isArray(users) ? users : [];
  } catch (error) {
    console.error("Could not read users:", error);
    return [];
  }
}

function getCurrentUser() {
  try {
    const session = JSON.parse(
      localStorage.getItem(SESSION_KEY) || "null"
    );

    if (!session || !session.userId) return null;

    return getUsers().find(
      (user) => user.id === session.userId
    ) || null;
  } catch (error) {
    console.error("Could not read session:", error);
    return null;
  }
}

/* -------------------------
   Game Session - Local Demo
------------------------- */

function getGameSession() {
  try {
    return JSON.parse(
      localStorage.getItem(GAME_SESSION_KEY) || "null"
    );
  } catch (error) {
    console.error("Could not read game session:", error);
    return null;
  }
}

function saveGameSession(session) {
  try {
    localStorage.setItem(
      GAME_SESSION_KEY,
      JSON.stringify(session)
    );
    return true;
  } catch (error) {
    console.error("Could not save game session:", error);
    showToast("Could not save the game session.");
    return false;
  }
}

function renderHostPlayers() {
  const hostScreen = $("host_screen");
  if (!hostScreen) return;

  let playersList = $("host_players_list");

  if (!playersList) {
    playersList = document.createElement("div");
    playersList.id = "host_players_list";
    playersList.className = "host-players-list";

    const startButton = $("host_start_btn");

    if (startButton && startButton.parentElement) {
      startButton.parentElement.insertBefore(
        playersList,
        startButton
      );
    } else {
      hostScreen.appendChild(playersList);
    }
  }

  const session = getGameSession();
  playersList.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent =
    `Players (${session?.players?.length || 0})`;
  playersList.appendChild(heading);

  const players = session?.players || [];

  if (players.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.textContent = "Waiting for players to join...";
    playersList.appendChild(emptyMessage);
    return;
  }

  players.forEach((player) => {
    const item = document.createElement("div");
    item.className = "host-player-item";
    item.textContent = player.name;
    playersList.appendChild(item);
  });
}

function startHostGame() {
  const session = {
    roomCode: ROOM_CODE,
    status: "waiting",
    players: [],
    createdAt: new Date().toISOString()
  };

  if (!saveGameSession(session)) return;

  if ($("host_room_code")) {
    $("host_room_code").textContent = ROOM_CODE;
  }

  renderHostPlayers();
  showScreen("host_screen");
}

function joinGame() {
  const name = $("join_player_name")?.value.trim() || "";
  const code = $("game_code")?.value.trim() || "";

  if (!name) {
    showToast(translations[language].nameRequired);
    $("join_player_name")?.focus();
    return;
  }

  if (code !== ROOM_CODE) {
    showToast(translations[language].roomInvalid);
    $("game_code")?.focus();
    return;
  }

  const session = getGameSession();

  if (!session || session.status !== "waiting") {
    showToast(
      language === "ar"
        ? "مفيش جلسة مفتوحة للانضمام حاليًا."
        : "There is no open game session right now."
    );
    return;
  }

  const alreadyJoined = session.players.some(
    (player) =>
      player.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (!alreadyJoined) {
    session.players.push({
      id: crypto.randomUUID(),
      name,
      joinedAt: new Date().toISOString()
    });

    if (!saveGameSession(session)) return;
  }

  playerName = name;

  if ($("waiting_player_name")) {
    $("waiting_player_name").textContent = playerName;
  }

  if ($("waiting_room_code")) {
    $("waiting_room_code").textContent = code;
  }

  renderHostPlayers();
  showScreen("waiting_screen");
}

/* -------------------------
   Password visibility
------------------------- */

function initializePasswordToggle() {
  const passwordField = $("password");
  const toggleButton = $("togglePassword");

  if (!passwordField || !toggleButton) return;
  if (toggleButton.dataset.initialized === "true") return;

  toggleButton.dataset.initialized = "true";

  toggleButton.addEventListener("click", () => {
    const show = passwordField.type === "password";
    passwordField.type = show ? "text" : "password";

    const text = translations[language];

    toggleButton.setAttribute(
      "aria-label",
      show ? text.hidePassword : text.showPassword
    );

    toggleButton.setAttribute("aria-pressed", String(show));
  });
}

/* -------------------------
   Password hashing
------------------------- */

async function hashPassword(password) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error(
      "Open this project using VS Code Live Server."
    );
  }

  const data = new TextEncoder().encode(password);
  const digest = await window.crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/* -------------------------
   Account registration
------------------------- */

function initializeRegistration() {
  const registerForm = $("registerForm");
  const fullNameInput = $("fullName");
  const emailInput = $("email");
  const passwordInput = $("password");
  const authMessage = $("authMessage");

  if (
    !registerForm ||
    !fullNameInput ||
    !emailInput ||
    !passwordInput ||
    !authMessage
  ) {
    return;
  }

  if (registerForm.dataset.registrationInitialized === "true") {
    return;
  }

  registerForm.dataset.registrationInitialized = "true";

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showAuthMessage("", "success");

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const selectedRole = registerForm.querySelector(
      'input[name="requestedRole"]:checked'
    );

    const t = translations[language];

    if (!fullName) {
      showAuthMessage(t.nameRequired);
      fullNameInput.focus();
      return;
    }

    if (!emailInput.validity.valid || !email) {
      showAuthMessage(t.emailRequired);
      emailInput.focus();
      return;
    }

    if (!password) {
      showAuthMessage(t.passwordRequired);
      passwordInput.focus();
      return;
    }

    if (password.length < 6) {
      showAuthMessage(
        language === "ar"
          ? "كلمة المرور لازم تكون 6 أحرف على الأقل."
          : "Password must be at least 6 characters."
      );
      passwordInput.focus();
      return;
    }

    if (!selectedRole) {
      showAuthMessage(t.roleRequired);
      return;
    }

    let users = getUsers();

    const emailExists = users.some(
      (user) =>
        typeof user.email === "string" &&
        user.email.trim().toLowerCase() === email
    );

    if (emailExists) {
      showAuthMessage(t.duplicateEmail);
      emailInput.focus();
      return;
    }

    const submitButton = $("register_btn");

    if (submitButton) submitButton.disabled = true;

    try {
      const passwordHash = await hashPassword(password);

      users = getUsers();

      const duplicateNow = users.some(
        (user) =>
          typeof user.email === "string" &&
          user.email.trim().toLowerCase() === email
      );

      if (duplicateNow) {
        showAuthMessage(t.duplicateEmail);
        emailInput.focus();
        return;
      }

      const newUser = {
        id: crypto.randomUUID(),
        fullName,
        email,
        passwordHash,
        role: "Player",
        requestedRole: selectedRole.value,
        creatorApproved: false,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          userId: newUser.id,
          email: newUser.email,
          role: newUser.role
        })
      );

      showAuthMessage(
        selectedRole.value === "Creator"
          ? t.creatorPending
          : t.accountCreated,
        "success"
      );
    } catch (error) {
      console.error("Registration failed:", error);

      showAuthMessage(
        language === "ar"
          ? "تعذر إنشاء الحساب. تأكد من تشغيل الموقع باستخدام Live Server."
          : t.registrationError
      );
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

/* -------------------------
   Quiz
------------------------- */

function startQuiz() {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    showToast(
      language === "ar"
        ? "من فضلك أنشئ حسابًا أولًا."
        : "Please create an account first."
    );
    return;
  }

  if (currentUser.role !== "Player") {
    showToast(
      language === "ar"
        ? "الاختبارات متاحة لحساب Player."
        : "Quizzes are available to Player accounts."
    );
    return;
  }

  playerName = currentUser.fullName;
  currentQuestion = 0;
  score = 0;
  correctCount = 0;
  wrongCount = 0;
  totalSeconds = 0;

  if ($("player-name-display")) {
    $("player-name-display").textContent = playerName;
  }

  showScreen("quiz_screen");
  renderQuestion();
}

function renderQuestion() {
  stopTimer();

  if (currentQuestion >= questions.length) {
    finishQuiz();
    return;
  }

  const question = questions[currentQuestion];

  selectedAnswer = null;
  answerLocked = false;
  secondsLeft = QUESTION_TIME;

  if ($("question-number")) {
    $("question-number").textContent =
      `${currentQuestion + 1} / ${questions.length}`;
  }

  if ($("question-text")) {
    $("question-text").textContent = question.question;
  }

  if ($("timer")) {
    $("timer").textContent = secondsLeft;
  }

  if ($("progress-bar")) {
    $("progress-bar").style.width =
      `${(currentQuestion / questions.length) * 100}%`;
  }

  const nextButton = $("next_btn");

  if (nextButton) {
    nextButton.disabled = true;
    nextButton.textContent =
      (currentQuestion === questions.length - 1
        ? translations[language].finish
        : translations[language].next) + " →";
  }

  const container = $("answers-container");
  if (!container) return;

  container.innerHTML = "";

  question.answers.forEach((answer, index) => {
    const button = document.createElement("button");
    button.className = "answer-btn";
    button.textContent = answer;
    button.type = "button";

    button.addEventListener("click", () => {
      selectAnswer(index, button);
    });

    container.appendChild(button);
  });

  startTimer();
}

function startTimer() {
  stopTimer();

  timerInterval = setInterval(() => {
    secondsLeft--;
    totalSeconds++;

    if ($("timer")) {
      $("timer").textContent = secondsLeft;
    }

    if (secondsLeft <= 0) {
      stopTimer();

      if (!answerLocked) {
        answerLocked = true;
        wrongCount++;
        revealCorrectAnswer();

        if ($("next_btn")) {
          $("next_btn").disabled = false;
        }
      }
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function selectAnswer(index, button) {
  if (answerLocked) return;

  selectedAnswer = index;
  answerLocked = true;
  stopTimer();

  const question = questions[currentQuestion];

  const buttons = $("answers-container").querySelectorAll(
    ".answer-btn"
  );

  buttons.forEach((item) => {
    item.disabled = true;
  });

  if (index === question.correct) {
    score++;
    correctCount++;
    button.classList.add("correct");
  } else {
    wrongCount++;
    button.classList.add("incorrect");

    if (buttons[question.correct]) {
      buttons[question.correct].classList.add("correct");
    }
  }

  if ($("next_btn")) {
    $("next_btn").disabled = false;
  }
}

function revealCorrectAnswer() {
  const question = questions[currentQuestion];

  const buttons = $("answers-container").querySelectorAll(
    ".answer-btn"
  );

  buttons.forEach((button, index) => {
    button.disabled = true;

    if (index === question.correct) {
      button.classList.add("correct");
    }
  });
}

function nextQuestion() {
  if (!answerLocked) {
    showToast(translations[language].chooseAnswer);
    return;
  }

  currentQuestion++;
  renderQuestion();
}

function finishQuiz() {
  stopTimer();

  const percentage = Math.round(
    (score / questions.length) * 100
  );

  const currentUser = getCurrentUser();

  const result = {
    name: playerName,
    studentCode: currentUser?.id || "",
    score,
    total: questions.length,
    percentage,
    time: totalSeconds,
    date: new Date().toISOString()
  };

  saveResult(result);

  const sorted = getResults();

  const rank = sorted.findIndex(
    (item) =>
      item.date === result.date &&
      item.name === result.name
  ) + 1;

  if ($("result_player_name")) {
    $("result_player_name").textContent = playerName;
  }

  if ($("score_text")) {
    $("score_text").textContent =
      `${score} / ${questions.length}`;
  }

  if ($("score_percentage")) {
    $("score_percentage").textContent = `${percentage}%`;
  }

  if ($("correct_answers")) {
    $("correct_answers").textContent = correctCount;
  }

  if ($("wrong_answers")) {
    $("wrong_answers").textContent = wrongCount;
  }

  if ($("result_time")) {
    $("result_time").textContent = `${totalSeconds}s`;
  }

  if ($("player_rank")) {
    $("player_rank").textContent = rank > 0 ? `#${rank}` : "—";
  }

  if ($("progress-bar")) {
    $("progress-bar").style.width = "100%";
  }

  showScreen("result_screen");
}

/* -------------------------
   Leaderboard
------------------------- */

function renderLeaderboard() {
  const results = getResults().sort(
    (a, b) => b.score - a.score || a.time - b.time
  );

  const tbody = $("leaderboard_body");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!results.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 4;
    cell.textContent = translations[language].noResults;

    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    results.forEach((result, index) => {
      const row = document.createElement("tr");

      [
        index + 1,
        result.name,
        `${result.score}/${result.total}`,
        `${result.time}s`
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });
  }

  const top = results.slice(0, 3);

  const nameIds = ["first_name", "second_name", "third_name"];
  const scoreIds = ["first_score", "second_score", "third_score"];
  const timeIds = ["first_time", "second_time", "third_time"];

  for (let i = 0; i < 3; i++) {
    if ($(nameIds[i])) {
      $(nameIds[i]).textContent = top[i]?.name || "—";
    }

    if ($(scoreIds[i])) {
      $(scoreIds[i]).textContent = top[i]
        ? `${top[i].score}/${top[i].total}`
        : "—";
    }

    if ($(timeIds[i])) {
      $(timeIds[i]).textContent = top[i]
        ? `${top[i].time}s`
        : "—";
    }
  }

  if ($("players_count")) {
    $("players_count").textContent = results.length;
  }

  const average = results.length
    ? Math.round(
        results.reduce((sum, item) => sum + item.percentage, 0) /
        results.length
      )
    : 0;

  if ($("average_score")) {
    $("average_score").textContent = `${average}%`;
  }

  if ($("total_correct")) {
    $("total_correct").textContent = results.reduce(
      (sum, item) => sum + item.score,
      0
    );
  }

  if ($("total_wrong")) {
    $("total_wrong").textContent = results.reduce(
      (sum, item) => sum + item.total - item.score,
      0
    );
  }

  if ($("fastest_time")) {
    $("fastest_time").textContent = results.length
      ? `${Math.min(...results.map((item) => item.time))}s`
      : "—";
  }
}

/* -------------------------
   Language
------------------------- */

function applyLanguage() {
  const t = translations[language];

  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";

  if ($("eyebrow")) $("eyebrow").textContent = t.eyebrow;
  if ($("welcome_title")) $("welcome_title").textContent = t.welcome;
  if ($("welcome_text")) $("welcome_text").textContent = t.intro;

  if ($("register_btn")) {
    $("register_btn").innerHTML = `${t.createAccount} <span>→</span>`;
  }

  if ($("language_btn")) {
    $("language_btn").textContent =
      language === "en" ? "عربي / EN" : "EN / عربي";
  }

  const formLabels = document.querySelectorAll("#registerForm > label");

  if (formLabels.length >= 3) {
    formLabels[0].textContent = `${t.nameLabel} *`;
    formLabels[1].textContent = `${t.emailLabel} *`;
    formLabels[2].textContent = `${t.passwordLabel} *`;
  }

  const roleHeading = document.querySelector(".role-heading");

  if (roleHeading) {
    roleHeading.textContent = `${t.roleLabel} *`;
  }

  const roleOptions = document.querySelectorAll(".role-option");

  if (roleOptions.length >= 2) {
    const creatorStrong = roleOptions[0].querySelector("strong");
    const creatorSmall = roleOptions[0].querySelector("small");
    const playerStrong = roleOptions[1].querySelector("strong");
    const playerSmall = roleOptions[1].querySelector("small");

    if (creatorStrong) creatorStrong.textContent = t.creator;
    if (creatorSmall) creatorSmall.textContent = t.creatorDesc;
    if (playerStrong) playerStrong.textContent = t.player;
    if (playerSmall) playerSmall.textContent = t.playerDesc;
  }

  const loginLink = document.querySelector(".login-link");

  if (loginLink) {
    loginLink.innerHTML =
      `${t.loginPrompt} <a href="login.html">${t.login}</a>`;
  }

  if ($("join_btn")) {
    $("join_btn").textContent = `${t.joinButton} →`;
  }

  [
    "join_back_btn",
    "host_back_btn",
    "waiting_back_btn",
    "leaderboard_back_btn"
  ].forEach((id) => {
    if ($(id)) $(id).textContent = t.back;
  });

  if ($("restart_btn")) {
    $("restart_btn").textContent = t.playAgain;
  }

  if ($("leaderboard_btn")) {
    $("leaderboard_btn").textContent = `${t.leaderboard} →`;
  }

  const joinTitle = $("join_screen")?.querySelector("h2");

  if (joinTitle) {
    joinTitle.textContent = t.joinTitle;
  }

  const joinIntro = $("join_screen")?.querySelector("p:not(.eyebrow)");

  if (joinIntro) {
    joinIntro.textContent = t.joinIntro;
  }

  if ($("game_code")?.previousElementSibling) {
    $("game_code").previousElementSibling.textContent = t.roomLabel;
  }

  if ($("togglePassword")) {
    $("togglePassword").setAttribute(
      "aria-label",
      $("password")?.type === "password"
        ? t.showPassword
        : t.hidePassword
    );
  }
}

function toggleLanguage() {
  language = language === "en" ? "ar" : "en";
  applyLanguage();
}

/* -------------------------
   Initialize
------------------------- */

function initializeApp() {
  initializePasswordToggle();
  initializeRegistration();

  if ($("teacher_btn")) {
    $("teacher_btn").addEventListener("click", startHostGame);
  }

  if ($("join_game_btn")) {
    $("join_game_btn").addEventListener("click", () => {
      showScreen("join_screen");
    });
  }

  if ($("host_back_btn")) {
    $("host_back_btn").addEventListener("click", () => {
      showScreen("home_screen");
    });
  }

  if ($("join_back_btn")) {
    $("join_back_btn").addEventListener("click", () => {
      showScreen("home_screen");
    });
  }

  if ($("waiting_back_btn")) {
    $("waiting_back_btn").addEventListener("click", () => {
      showScreen("home_screen");
    });
  }

  if ($("join_btn")) {
    $("join_btn").addEventListener("click", joinGame);
  }

  if ($("host_start_btn")) {
    $("host_start_btn").addEventListener("click", () => {
      const session = getGameSession();

      if (!session) {
        showToast(
          language === "ar"
            ? "ابدأ جلسة جديدة أولًا."
            : "Create a game session first."
        );
        return;
      }

      session.status = "started";
      saveGameSession(session);

      showToast(translations[language].hostDemo);

      // الخطوة التالية هنربطها ببدء الأسئلة.
    });
  }

  if ($("next_btn")) {
    $("next_btn").addEventListener("click", nextQuestion);
  }

  if ($("restart_btn")) {
    $("restart_btn").addEventListener("click", () => {
      showScreen("home_screen");
    });
  }

  if ($("leaderboard_btn")) {
    $("leaderboard_btn").addEventListener("click", () => {
      renderLeaderboard();
      showScreen("leaderboard_screen");
    });
  }

  if ($("leaderboard_back_btn")) {
    $("leaderboard_back_btn").addEventListener("click", () => {
      showScreen("home_screen");
    });
  }

  if ($("language_btn")) {
    $("language_btn").addEventListener("click", toggleLanguage);
  }

  const params = new URLSearchParams(window.location.search);
  const room = params.get("room");

  if (room && $("game_code")) {
    $("game_code").value = room;
    showScreen("join_screen");
  }

  applyLanguage();
}

document.addEventListener("DOMContentLoaded", initializeApp);
