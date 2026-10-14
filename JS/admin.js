"use strict";

const STORE = {
  quizzes: "churchAdminQuizzes",
  questions: "churchAdminQuestions",
  settings: "churchAdminSettings",
  results: "churchQuizResults"
};

const $ = (id) => document.getElementById(id);

function readStore(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

let quizzes = readStore(STORE.quizzes);
let questions = readStore(STORE.questions);
let results = readStore(STORE.results);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function toast(message) {
  const element = $("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);

  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 2600);
}

function showPage(name) {
  const page = $(`page-${name}`);
  if (!page) return;

  document.querySelectorAll(".page").forEach((item) => {
    item.classList.toggle("active", item === page);
  });

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === name);
  });

  const activeButton = document.querySelector(
    `.nav-link[data-page="${name}"]`
  );

  if ($("page-heading")) {
    $("page-heading").textContent = activeButton
      ? activeButton.textContent.trim()
      : name === "create"
        ? "Create Quiz"
        : "Dashboard";
  }

  if ($("sidebar")) {
    $("sidebar").classList.remove("open");
  }

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (name === "dashboard") renderDashboard();
  if (name === "quizzes") renderQuizzes();
  if (name === "questions") renderQuestions();
  if (name === "participants") renderParticipants();
  if (name === "results") renderResults();

  if (name === "create") {
    const editingId = $("quiz-form")?.dataset.editing;
    const existingQuiz = quizzes.find((quiz) => quiz.id === editingId);

    renderQuestionPicker(existingQuiz?.questionIds || []);
  }
}

function badge(status) {
  const className = status === "Ready" ? "badge-ready" : "badge-draft";

  return `<span class="badge ${className}">${escapeHTML(status)}</span>`;
}

function renderDashboard() {
  quizzes = readStore(STORE.quizzes);
  questions = readStore(STORE.questions);
  results = readStore(STORE.results);

  $("stat-quizzes").textContent = quizzes.length;
  $("stat-questions").textContent = questions.length;
  $("stat-participants").textContent = results.length;

  const average = results.length
    ? Math.round(
        results.reduce((sum, item) => {
          const percentage = Number(
            item.percentage ??
            (item.total ? item.score / item.total * 100 : 0)
          );

          return sum + percentage;
        }, 0) / results.length
      )
    : null;

  $("stat-average").textContent =
    average === null ? "—" : `${average}%`;

  const recent = quizzes.slice().reverse().slice(0, 5);

  $("recent-quizzes").innerHTML = recent.map((quiz) => `
    <tr>
      <td><span class="table-title">${escapeHTML(quiz.title)}</span></td>
      <td>${Number(quiz.questionCount) || 0}</td>
      <td>${badge(quiz.status)}</td>
      <td>${escapeHTML(quiz.createdAt)}</td>
      <td>
        <button class="table-action" data-edit="${escapeHTML(quiz.id)}">
          View
        </button>
      </td>
    </tr>
  `).join("");

  $("recent-empty").hidden = recent.length > 0;
}

function renderQuizzes() {
  quizzes = readStore(STORE.quizzes);

  const search = $("quiz-search").value.trim().toLowerCase();
  const filter = $("quiz-filter").value;

  const list = quizzes.filter((quiz) =>
    String(quiz.title || "").toLowerCase().includes(search) &&
    (!filter || quiz.status === filter)
  );

  $("quizzes-table").innerHTML = list.map((quiz) => `
    <tr>
      <td><span class="table-title">${escapeHTML(quiz.title)}</span></td>
      <td>${escapeHTML(quiz.category)}</td>
      <td>${Number(quiz.questionCount) || 0}</td>
      <td>${Number(quiz.timePerQuestion) || 0}s</td>
      <td>${badge(quiz.status)}</td>
      <td>
        <div class="action-group">
          <button class="table-action" data-edit="${escapeHTML(quiz.id)}">
            Edit
          </button>
          <button
            class="table-action danger-action"
            data-delete-quiz="${escapeHTML(quiz.id)}"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  $("quizzes-empty").hidden = list.length > 0;
}

/* Show the question bank inside the quiz form. */
function renderQuestionPicker(selectedIds = []) {
  const picker = $("quiz-question-picker");
  if (!picker) return;

  questions = readStore(STORE.questions);

  const selected = new Set(
    Array.isArray(selectedIds) ? selectedIds : []
  );

  if (!questions.length) {
    picker.innerHTML = `
      <p class="form-hint">
        No questions yet. Add questions in the Question Bank first.
      </p>
    `;

    const hint = $("quiz-question-hint");
    if (hint) hint.textContent = "No questions available.";

    return;
  }

  picker.innerHTML = questions.map((question) => {
    const checked = selected.has(question.id) ? "checked" : "";

    return `
      <label class="quiz-question-option">
        <input
          type="checkbox"
          class="quiz-question-checkbox"
          value="${escapeHTML(question.id)}"
          ${checked}
        >

        <span class="quiz-question-option-text">
          <strong>${escapeHTML(question.text || "Untitled question")}</strong>
          <small>${escapeHTML(question.category || "General")}</small>
        </span>
      </label>
    `;
  }).join("");

  const updateHint = () => {
    const count = picker.querySelectorAll(
      ".quiz-question-checkbox:checked"
    ).length;

    const hint = $("quiz-question-hint");

    if (hint) {
      hint.textContent = `${count} question(s) selected for this quiz.`;
    }
  };

  picker.querySelectorAll(".quiz-question-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("change", updateHint);
  });

  updateHint();
}

function saveQuizForm(event) {
  event.preventDefault();

  const title = $("quiz-title").value.trim();

  if (!title) {
    toast("Please enter a quiz title.");
    return;
  }

  quizzes = readStore(STORE.quizzes);
  questions = readStore(STORE.questions);

  const form = $("quiz-form");
  const oldId = form.dataset.editing;

  const previous = oldId
    ? quizzes.find((quiz) => quiz.id === oldId)
    : null;

  const picker = $("quiz-question-picker");

  const questionIds = picker
    ? Array.from(
        picker.querySelectorAll(".quiz-question-checkbox:checked")
      ).map((checkbox) => checkbox.value)
    : [];

  const status = $("quiz-status").value;

  if (status === "Ready" && questionIds.length === 0) {
    toast("Select at least one question before publishing.");
    return;
  }

  const quiz = {
    id: oldId || (
      crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`
    ),
    title,
    description: $("quiz-description").value.trim(),
    category: $("quiz-category").value,
    timePerQuestion: Number($("quiz-time").value),
    status,
    questionIds,
    questionCount: questionIds.length,
    createdAt: previous?.createdAt || new Date().toLocaleDateString()
  };

  if (previous) {
    quizzes = quizzes.map((item) =>
      item.id === oldId ? quiz : item
    );
  } else {
    quizzes.push(quiz);
  }

  writeStore(STORE.quizzes, quizzes);

  form.reset();
  delete form.dataset.editing;

  renderDashboard();
  renderQuizzes();
  showPage("quizzes");

  toast(oldId ? "Quiz updated." : "Quiz created.");
}

function editQuiz(id) {
  quizzes = readStore(STORE.quizzes);

  const quiz = quizzes.find((item) => item.id === id);
  if (!quiz) return;

  $("quiz-title").value = quiz.title || "";
  $("quiz-description").value = quiz.description || "";
  $("quiz-category").value = quiz.category || "";
  $("quiz-time").value = String(quiz.timePerQuestion || 30);
  $("quiz-status").value = quiz.status || "Draft";

  $("quiz-form").dataset.editing = id;

  showPage("create");

  $("page-heading").textContent = "Edit Quiz";
  toast("Update the details and save your changes.");
}

function deleteQuiz(id) {
  quizzes = readStore(STORE.quizzes);

  const quiz = quizzes.find((item) => item.id === id);

  if (!quiz || !confirm(`Delete "${quiz.title}"?`)) return;

  quizzes = quizzes.filter((item) => item.id !== id);
  writeStore(STORE.quizzes, quizzes);

  renderQuizzes();
  renderDashboard();

  toast("Quiz deleted.");
}

function addQuestion(event) {
  event.preventDefault();

  const text = $("question-text").value.trim();

  const answers = [
    ...document.querySelectorAll(".answer-option")
  ].map((input) => input.value.trim());

  if (!text || answers.some((answer) => !answer)) {
    toast("Fill in the question and all four answers.");
    return;
  }

  questions = readStore(STORE.questions);

  questions.push({
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`,
    text,
    category: $("question-category").value,
    answers,
    correct: Number($("correct-answer").value),
    createdAt: new Date().toLocaleDateString()
  });

  writeStore(STORE.questions, questions);

  $("question-form").reset();

  renderQuestions();
  renderDashboard();
  renderQuestionPicker();

  toast("Question added to your bank.");
}

function renderQuestions() {
  questions = readStore(STORE.questions);

  $("question-count").textContent = `${questions.length} questions`;

  $("questions-table").innerHTML = questions.map((question) => `
    <tr>
      <td style="white-space:normal;min-width:220px">
        ${escapeHTML(question.text)}
      </td>
      <td>${escapeHTML(question.category)}</td>
      <td>${Array.isArray(question.answers) ? question.answers.length : 0} options</td>
      <td>
        <button
          class="table-action danger-action"
          data-delete-question="${escapeHTML(question.id)}"
        >
          Delete
        </button>
      </td>
    </tr>
  `).join("");

  $("questions-empty").hidden = questions.length > 0;

  if ($("stat-questions")) {
    $("stat-questions").textContent = questions.length;
  }
}

function deleteQuestion(id) {
  if (!confirm("Delete this question?")) return;

  questions = readStore(STORE.questions).filter(
    (question) => question.id !== id
  );

  writeStore(STORE.questions, questions);

  /* Remove this question from every quiz that used it. */
  quizzes = readStore(STORE.quizzes).map((quiz) => {
    if (!Array.isArray(quiz.questionIds)) return quiz;

    const questionIds = quiz.questionIds.filter(
      (questionId) => questionId !== id
    );

    return {
      ...quiz,
      questionIds,
      questionCount: questionIds.length
    };
  });

  writeStore(STORE.quizzes, quizzes);

  renderQuestions();
  renderDashboard();
  renderQuizzes();
  renderQuestionPicker();

  toast("Question deleted.");
}

function getNormalizedResults() {
  results = readStore(STORE.results);

  return results.map((item) => ({
    name: item.name || "Participant",
    score: Number(item.score) || 0,
    total: Number(item.total) || 0,
    percentage: Number(
      item.percentage ??
      (item.total ? item.score / item.total * 100 : 0)
    ),
    time: Number(item.time) || 0,
    date: item.date
      ? new Date(item.date).toLocaleDateString()
      : "—"
  }));
}

function renderParticipants() {
  const normalized = getNormalizedResults();

  $("participants-table").innerHTML = normalized.map((item) => `
    <tr>
      <td><span class="table-title">${escapeHTML(item.name)}</span></td>
      <td>Church Quiz</td>
      <td>${item.score}/${item.total}</td>
      <td>${item.time}s</td>
      <td>${escapeHTML(item.date)}</td>
    </tr>
  `).join("");

  $("participants-empty").hidden = normalized.length > 0;
}

function renderResults() {
  const normalized = getNormalizedResults();

  $("results-attempts").textContent = normalized.length;

  $("results-players").textContent = new Set(
    normalized.map((item) => item.name.toLowerCase())
  ).size;

  $("results-average").textContent = normalized.length
    ? `${Math.round(
        normalized.reduce((sum, item) => sum + item.percentage, 0) /
        normalized.length
      )}%`
    : "—";

  $("results-best").textContent = normalized.length
    ? `${Math.round(
        Math.max(...normalized.map((item) => item.percentage))
      )}%`
    : "—";

  $("results-table").innerHTML = normalized
    .slice()
    .sort((a, b) => b.percentage - a.percentage)
    .map((item) => `
      <tr>
        <td><span class="table-title">${escapeHTML(item.name)}</span></td>
        <td>${item.score}/${item.total}</td>
        <td>${Math.round(item.percentage)}%</td>
        <td>${item.time}s</td>
        <td>${escapeHTML(item.date)}</td>
      </tr>
    `).join("");

  $("results-empty").hidden = normalized.length > 0;
}

function exportResults() {
  const normalized = getNormalizedResults();

  if (!normalized.length) {
    toast("There are no results to export.");
    return;
  }

  const rows = [
    ["Participant", "Score", "Total", "Percentage", "Time (seconds)", "Date"],
    ...normalized.map((item) => [
      item.name,
      item.score,
      item.total,
      Math.round(item.percentage),
      item.time,
      item.date
    ])
  ];

  const csv = rows.map((row) =>
    row.map((value) =>
      `"${String(value).replace(/"/g, '""')}"`
    ).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "church-quiz-results.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function loadSettings() {
  const settings = readStore(STORE.settings, {});

  $("church-name").value = settings.churchName || "";
  $("admin-email").value = settings.email || "";
  $("dashboard-language").value = settings.language || "en";
}

function saveSettings(event) {
  event.preventDefault();

  writeStore(STORE.settings, {
    churchName: $("church-name").value.trim(),
    email: $("admin-email").value.trim(),
    language: $("dashboard-language").value
  });

  toast("Settings saved in this browser.");
}

function init() {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.page));
  });

  document.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => showPage(button.dataset.go));
  });

  $("menu-toggle").addEventListener("click", () => {
    $("sidebar").classList.toggle("open");
  });

  $("quiz-form").addEventListener("submit", saveQuizForm);
  $("question-form").addEventListener("submit", addQuestion);
  $("settings-form").addEventListener("submit", saveSettings);

  $("quiz-search").addEventListener("input", renderQuizzes);
  $("quiz-filter").addEventListener("change", renderQuizzes);
  $("export-results").addEventListener("click", exportResults);

  document.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit]");
    const deleteQuizButton = event.target.closest("[data-delete-quiz]");
    const deleteQuestionButton = event.target.closest("[data-delete-question]");

    if (editButton) editQuiz(editButton.dataset.edit);

    if (deleteQuizButton) {
      deleteQuiz(deleteQuizButton.dataset.deleteQuiz);
    }

    if (deleteQuestionButton) {
      deleteQuestion(deleteQuestionButton.dataset.deleteQuestion);
    }
  });

  loadSettings();
  renderDashboard();
  renderQuizzes();
  renderQuestions();
  renderParticipants();
  renderResults();
}

document.addEventListener("DOMContentLoaded", init);

/* LOCAL DEMO GAME SESSION */

function renderSessionQuizOptions() {
  const select = $("session-quiz-select");
  if (!select) return;

  quizzes = readStore(STORE.quizzes);

  const readyQuizzes = quizzes.filter(
    (quiz) =>
      quiz.status === "Ready" &&
      Array.isArray(quiz.questionIds) &&
      quiz.questionIds.length > 0
  );

  select.innerHTML =
    '<option value="">Select a quiz...</option>' +
    readyQuizzes.map((quiz) => `
      <option value="${escapeHTML(quiz.id)}">
        ${escapeHTML(quiz.title)}
      </option>
    `).join("");

  if (!readyQuizzes.length) {
    $("game-session-status").textContent =
      "No ready quizzes found. Create a quiz with questions and save it as Ready.";
  }
}

function createLocalGameSession() {
  quizzes = readStore(STORE.quizzes);
  questions = readStore(STORE.questions);

  const quizId = $("session-quiz-select").value;
  const quiz = quizzes.find((item) => item.id === quizId);

  if (!quiz || quiz.status !== "Ready") {
    toast("Please select a ready quiz.");
    return;
  }

  const selectedQuestions = questions.filter((question) =>
    quiz.questionIds.includes(question.id)
  );

  if (!selectedQuestions.length) {
    toast("This quiz has no available questions.");
    return;
  }

  // Keep the room code compatible with the current game script.
  const roomCode = "482731";

  const gameSession = {
    roomCode,
    status: "waiting",
    quizId: quiz.id,
    quizTitle: quiz.title,
    questions: selectedQuestions,
    players: [],
    createdAt: new Date().toISOString()
  };

  writeStore("churchQuizGameSession", gameSession);

  $("game-session-code").textContent = roomCode;
  $("game-session-quiz-title").textContent =
    "Selected quiz: " + quiz.title;
  $("game-session-details").hidden = false;
  $("game-session-status").textContent =
    "Session created. Players can join using the room code.";

  toast("Game session created.");
}

function copyLocalSessionCode() {
  const code = $("game-session-code")?.textContent;
  if (!code) return;

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code)
      .then(() => toast("Room code copied."))
      .catch(() => toast("Room code: " + code));
  } else {
    toast("Room code: " + code);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderSessionQuizOptions();

  $("create-game-session")?.addEventListener(
    "click",
    createLocalGameSession
  );

  $("copy-session-code")?.addEventListener(
    "click",
    copyLocalSessionCode
  );

  $("session-quiz-select")?.addEventListener("change", () => {
    const details = $("game-session-details");
    if (details) details.hidden = true;
  });
});

