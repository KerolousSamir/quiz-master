"use strict";

/* ============================================================
   admin.js — لوحة التحكم
   كل التعامل مع البيانات بيتم عن طريق Api (api.js). ممنوع localStorage هنا.
   ============================================================ */

const AUTH_OK = Api.auth.requireLogin();

const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[c]);
}

function toast(message) {
  const el = $("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2600);
}

const ERROR_MESSAGES = {
  STORAGE_FULL: "Storage is full. Remove some images or quizzes and try again.",
  LAST_QUESTION: "A quiz must keep at least one question. Delete the quiz instead.",
  FILE_TOO_LARGE: "Image is too large (max 10 MB).",
  NOT_AN_IMAGE: "Please choose an image file.",
  QUIZ_EMPTY: "This quiz has no questions. Add questions first.",
  QUIZ_NOT_FOUND: "Quiz not found."
};
const showError = (err) => toast(ERROR_MESSAGES[err?.code] || err?.message || "Something went wrong.");

/* ---------------- الصفحات ---------------- */

function showPage(name) {
  const page = $(`page-${name}`);
  if (!page) return;

  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));
  page.classList.add("active");

  document.querySelectorAll(".nav-link").forEach((b) => b.classList.toggle("active", b.dataset.page === name));

  const activeButton = document.querySelector(`.nav-link[data-page="${name}"]`);
  if ($("page-heading") && activeButton) $("page-heading").textContent = activeButton.textContent.trim();

  $("sidebar")?.classList.remove("open");
  window.scrollTo({ top: 0, behavior: "smooth" });

  const renderers = {
    dashboard: renderDashboard,
    quizzes: renderQuizzes,
    questions: renderQuestions,
    participants: renderParticipants,
    results: renderResults,
    leaderboard: renderLeaderboard
  };
  renderers[name]?.().catch(showError);
}

/* ---------------- Dashboard ---------------- */

async function renderDashboard() {
  const [quizzes, questions, results] = await Promise.all([
    Api.quizzes.list(), Api.questions.list(), Api.results.list()
  ]);

  $("stat-quizzes").textContent = quizzes.length;
  $("stat-questions").textContent = questions.length;
  $("stat-participants").textContent = results.length;

  const normalized = normalizeResults(results);
  $("stat-average").textContent = normalized.length
    ? `${Math.round(normalized.reduce((s, r) => s + r.percentage, 0) / normalized.length)}%`
    : "—";

  const recent = quizzes.slice().reverse().slice(0, 5);
  $("recent-quizzes").innerHTML = recent.map((quiz) => `
    <tr>
      <td><span class="table-title">${escapeHTML(quiz.title)}</span></td>
      <td>${Number(quiz.questionCount) || 0}</td>
      <td>${escapeHTML(quiz.createdAt)}</td>
      <td><button class="table-action" data-action="edit" data-id="${escapeHTML(quiz.id)}">Edit</button></td>
    </tr>
  `).join("");
  $("recent-empty").hidden = recent.length > 0;
}

/* ---------------- My quizzes ---------------- */

async function renderQuizzes() {
  const search = $("quiz-search").value.trim().toLowerCase();
  const list = (await Api.quizzes.list()).filter((q) => String(q.title || "").toLowerCase().includes(search));

  $("quizzes-table").innerHTML = list.map((quiz) => {
    const id = escapeHTML(quiz.id);
    return `
    <tr>
      <td><span class="table-title">${escapeHTML(quiz.title)}</span></td>
      <td>${escapeHTML(quiz.category)}</td>
      <td>${Number(quiz.questionCount) || 0}</td>
      <td>
        <div class="dropdown-container">
          <button class="btn-more-options" data-action="toggle-menu" aria-label="Quiz actions">⋮</button>
          <div class="dropdown-menu">
            <button class="dropdown-item" data-action="host" data-id="${id}"><span>▶</span> Host live</button>
            <button class="dropdown-item" data-action="edit" data-id="${id}"><span>✏️</span> Edit</button>
            <button class="dropdown-item text-danger" data-action="delete-quiz" data-id="${id}"><span>🗑️</span> Delete</button>
          </div>
        </div>
      </td>
    </tr>`;
  }).join("");

  $("quizzes-empty").hidden = list.length > 0;
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown-container.active").forEach((m) => m.classList.remove("active"));
}

async function deleteQuiz(id) {
  const quiz = await Api.quizzes.get(id);
  if (!quiz || !confirm(`Delete "${quiz.title}"?`)) return;
  try {
    await Api.quizzes.remove(id);
    toast("Quiz deleted.");
    await Promise.all([renderQuizzes(), renderDashboard()]);
  } catch (err) { showError(err); }
}

/* ---------------- Host live ---------------- */

let hostingQuizId = null;

async function openHostModal(quizId) {
  const quiz = await Api.quizzes.get(quizId);
  if (!quiz) return toast("Quiz not found.");
  hostingQuizId = quizId;
  $("host-selected-quiz-title").textContent = quiz.title;
  $("host-options-modal").style.display = "flex";
}

function closeHostModal() {
  $("host-options-modal").style.display = "none";
  hostingQuizId = null;
}

async function startHosting() {
  if (!hostingQuizId) return;
  const quizId = hostingQuizId;

  // نفتح التاب فوراً (جوه الضغطة) عشان المتصفح ما يمنعوش، وبعدين نوجّهه للوبي
  const tab = window.open("about:blank", "_blank");
  try {
    await Api.game.create(quizId);
    closeHostModal();
    toast("Session created! Opening Lobby...");
    if (tab) tab.location.href = "lobby.html";
    else window.location.href = "lobby.html";
  } catch (err) {
    tab?.close();
    closeHostModal();
    showError(err);
  }
}

/* ============================================================
   STUDIO
   ============================================================ */

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `q_${Date.now()}_${Math.random()}`);

function createBlankQuestion(type = "mcq") {
  return {
    id: newId(),
    type,
    text: "",
    image: null,
    timeLimit: 20,
    points: "standard",
    answers: type === "tf" ? ["True", "False"] : ["", "", "", ""],
    correct: 0
  };
}

function createBlankQuiz() {
  return {
    id: null,                       // الباك اند هو اللي بيدّي الـ id للكويز الجديد
    title: "New Church Quiz",
    description: "",
    category: "Bible Knowledge",
    status: "Ready",
    questions: [createBlankQuestion("mcq")]
  };
}

let studioQuiz = createBlankQuiz();
let activeQuestionIndex = 0;
let studioDirty = false;
const markDirty = () => { studioDirty = true; };

async function openStudio(quizId = null) {
  try {
    if (quizId) {
      const existing = await Api.quizzes.get(quizId);
      if (!existing) return toast("Quiz not found.");
      studioQuiz = JSON.parse(JSON.stringify(existing));
      if (!studioQuiz.questions.length) studioQuiz.questions.push(createBlankQuestion("mcq"));
    } else {
      studioQuiz = createBlankQuiz();
    }
  } catch (err) { return showError(err); }

  activeQuestionIndex = 0;
  studioDirty = false;
  $("studio-quiz-title").value = studioQuiz.title;
  loadQuestionToCanvas(0);
  showPage("create");
}

function renderSlidesList() {
  const container = $("slides-list");
  if (!container) return;
  container.innerHTML = studioQuiz.questions.map((q, idx) => `
    <div class="slide-card ${idx === activeQuestionIndex ? "active" : ""}" data-slide-index="${idx}">
      <div class="slide-header">
        <span>${idx + 1} ${q.type === "tf" ? "True/False" : "Quiz"}</span>
        <span>⏱ ${q.timeLimit}s</span>
      </div>
      <div class="slide-title">${escapeHTML(q.text || "Question...")}</div>
    </div>
  `).join("");
}

function ensureTimeOption(seconds) {
  const select = $("prop-time-limit");
  if (![...select.options].some((o) => Number(o.value) === seconds)) {
    const opt = new Option(`${seconds} seconds`, String(seconds));
    select.add(opt);
  }
}

function loadQuestionToCanvas(index) {
  if (index < 0 || index >= studioQuiz.questions.length) return;
  activeQuestionIndex = index;
  const q = studioQuiz.questions[index];

  $("canvas-question-text").value = q.text || "";
  $("prop-question-type").value = q.type || "mcq";
  ensureTimeOption(Number(q.timeLimit) || 20);
  $("prop-time-limit").value = String(q.timeLimit || 20);
  $("prop-points-multiplier").value = q.points === "zero" ? "none" : q.points || "standard";

  $("media-placeholder").style.display = q.image ? "none" : "flex";
  $("media-preview-container").style.display = q.image ? "flex" : "none";
  $("question-image-preview").src = q.image || "";

  const isTF = q.type === "tf";
  const grid = $("canvas-answers-grid");
  grid.classList.toggle("mode-tf", isTF);
  grid.classList.toggle("mode-mcq", !isTF);

  for (let i = 0; i < 4; i++) {
    const input = $(`ans-text-${i}`);
    input.readOnly = isTF && i < 2;
    input.value = isTF ? (i < 2 ? q.answers[i] || (i ? "False" : "True") : "") : q.answers[i] || "";
    $(`toggle-${i}`)?.classList.toggle("is-correct", Number(q.correct) === i);
  }

  renderSlidesList();
}

function syncCurrentQuestionFromInputs() {
  const q = studioQuiz.questions[activeQuestionIndex];
  if (!q) return;

  q.text = $("canvas-question-text").value.trim();
  q.type = $("prop-question-type").value;
  q.timeLimit = Number($("prop-time-limit").value) || 20;
  q.points = $("prop-points-multiplier").value;

  if (q.type === "tf") {
    q.answers = ["True", "False"];
    if (q.correct > 1) q.correct = 0;
  } else {
    q.answers = [0, 1, 2, 3].map((i) => $(`ans-text-${i}`).value.trim());
  }

  const title = document.querySelector(`.slide-card[data-slide-index="${activeQuestionIndex}"] .slide-title`);
  if (title) title.textContent = q.text || "Question...";
  markDirty();
}

/* بيرجع أول مشكلة في الكويز (أو null لو سليم) */
function findQuizProblem(quiz) {
  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    const n = i + 1;
    if (!q.text) return { index: i, message: `Question ${n}: write the question text.` };
    if (q.type !== "tf" && q.answers.some((a) => !a)) {
      return { index: i, message: `Question ${n}: fill all 4 answers (or switch to True/False).` };
    }
    if (q.correct < 0 || q.correct >= q.answers.length) {
      return { index: i, message: `Question ${n}: mark the correct answer.` };
    }
  }
  return null;
}

function bindStudio() {
  $("toggle-properties-btn")?.addEventListener("click", () => $("studio-right-panel")?.classList.toggle("collapsed"));

  $("studio-exit-btn")?.addEventListener("click", () => {
    if (studioDirty && !confirm("You have unsaved changes. Leave anyway?")) return;
    studioDirty = false;
    showPage("dashboard");
  });

  $("btn-add-slide")?.addEventListener("click", () => {
    syncCurrentQuestionFromInputs();
    studioQuiz.questions.push(createBlankQuestion("mcq"));
    loadQuestionToCanvas(studioQuiz.questions.length - 1);
  });

  $("slides-list")?.addEventListener("click", (e) => {
    const card = e.target.closest(".slide-card");
    if (!card) return;
    syncCurrentQuestionFromInputs();
    loadQuestionToCanvas(Number(card.dataset.slideIndex));
  });

  $("canvas-question-text")?.addEventListener("input", syncCurrentQuestionFromInputs);
  $("studio-quiz-title")?.addEventListener("input", markDirty);

  $("media-placeholder")?.addEventListener("click", () => $("question-image-upload").click());

  $("question-image-upload")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      studioQuiz.questions[activeQuestionIndex].image = await Api.media.upload(file);
      markDirty();
      loadQuestionToCanvas(activeQuestionIndex);
    } catch (err) { showError(err); }
  });

  $("btn-remove-media")?.addEventListener("click", (e) => {
    e.stopPropagation();
    studioQuiz.questions[activeQuestionIndex].image = null;
    markDirty();
    loadQuestionToCanvas(activeQuestionIndex);
  });

  for (let i = 0; i < 4; i++) {
    $(`ans-text-${i}`)?.addEventListener("input", syncCurrentQuestionFromInputs);
    $(`toggle-${i}`)?.addEventListener("click", () => {
      studioQuiz.questions[activeQuestionIndex].correct = i;
      markDirty();
      loadQuestionToCanvas(activeQuestionIndex);
    });
  }

  $("prop-question-type")?.addEventListener("change", (e) => {
    const q = studioQuiz.questions[activeQuestionIndex];
    const newType = e.target.value;
    if (q.type === newType) return;
    q.type = newType;
    // نصفّر الإجابات عشان "True/False" ما تفضلش مكتوبة جوه سؤال اختيار من متعدد (والعكس)
    q.answers = newType === "tf" ? ["True", "False"] : ["", "", "", ""];
    q.correct = 0;
    markDirty();
    loadQuestionToCanvas(activeQuestionIndex);
  });

  $("prop-time-limit")?.addEventListener("change", () => { syncCurrentQuestionFromInputs(); renderSlidesList(); });
  $("prop-points-multiplier")?.addEventListener("change", syncCurrentQuestionFromInputs);

  $("btn-duplicate-question")?.addEventListener("click", () => {
    syncCurrentQuestionFromInputs();
    const cloned = JSON.parse(JSON.stringify(studioQuiz.questions[activeQuestionIndex]));
    cloned.id = newId();
    studioQuiz.questions.splice(activeQuestionIndex + 1, 0, cloned);
    loadQuestionToCanvas(activeQuestionIndex + 1);
  });

  $("btn-delete-question")?.addEventListener("click", () => {
    if (studioQuiz.questions.length <= 1) return toast("The quiz must have at least one question.");
    studioQuiz.questions.splice(activeQuestionIndex, 1);
    markDirty();
    loadQuestionToCanvas(Math.max(0, activeQuestionIndex - 1));
  });

  $("studio-save-btn")?.addEventListener("click", () => {
    syncCurrentQuestionFromInputs();
    const problem = findQuizProblem(studioQuiz);
    if (problem) {
      loadQuestionToCanvas(problem.index);
      return toast(problem.message);
    }
    $("modal-quiz-category").value = studioQuiz.category || "";
    $("studio-save-modal").style.display = "flex";
  });

  $("modal-cancel-btn")?.addEventListener("click", () => { $("studio-save-modal").style.display = "none"; });

  $("modal-confirm-save-btn")?.addEventListener("click", async () => {
    studioQuiz.title = $("studio-quiz-title").value.trim() || "Untitled Quiz";
    studioQuiz.category = $("modal-quiz-category").value || "General";
    studioQuiz.status = "Ready";

    try {
      const saved = await Api.quizzes.save(studioQuiz);
      studioQuiz.id = saved.id;
      studioDirty = false;
      $("studio-save-modal").style.display = "none";
      toast("Quiz saved successfully! 🚀");
      showPage("quizzes");
    } catch (err) { showError(err); }
  });

  window.addEventListener("beforeunload", (e) => {
    if (studioDirty && $("page-create").classList.contains("active")) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

/* ---------------- Question bank (عرض لكل أسئلة الكويزات) ---------------- */

async function renderQuestions() {
  const questions = await Api.questions.list();
  $("question-count").textContent = `${questions.length} questions`;

  $("questions-table").innerHTML = questions.map((q) => `
    <tr>
      <td style="white-space:normal;min-width:220px">${escapeHTML(q.text)}</td>
      <td>${escapeHTML(q.quizTitle)}</td>
      <td>${Array.isArray(q.answers) ? q.answers.length : 0} options</td>
      <td><button class="table-action danger-action" data-action="delete-question" data-id="${escapeHTML(q.id)}">Delete</button></td>
    </tr>
  `).join("");

  $("questions-empty").hidden = questions.length > 0;
  if ($("stat-questions")) $("stat-questions").textContent = questions.length;
}

async function deleteQuestion(id) {
  if (!confirm("Delete this question from its quiz?")) return;
  try {
    await Api.questions.remove(id);
    toast("Question deleted.");
    await Promise.all([renderQuestions(), renderDashboard()]);
  } catch (err) { showError(err); }
}

/* ---------------- Results / Participants / Leaderboard ---------------- */

function normalizeResults(results) {
  return results.map((item) => ({
    name: String(item.name || item.fullName || "Participant").trim() || "Participant",
    quizTitle: item.quizTitle || "Church Quiz",
    score: Number(item.score) || 0,
    total: Number(item.total) || 0,
    percentage: Math.max(0, Math.min(100, Number(item.percentage ?? (item.total ? (item.score / item.total) * 100 : 0)) || 0)),
    time: Number(item.time) || 0,
    date: item.date ? new Date(item.date).toLocaleDateString() : "—",
    timestamp: Date.parse(item.date) || 0
  }));
}

async function renderParticipants() {
  const list = normalizeResults(await Api.results.list());
  $("participants-table").innerHTML = list.map((r) => `
    <tr>
      <td><span class="table-title">${escapeHTML(r.name)}</span></td>
      <td>${escapeHTML(r.quizTitle)}</td>
      <td>${r.score}/${r.total}</td>
      <td>${r.time}s</td>
      <td>${escapeHTML(r.date)}</td>
    </tr>
  `).join("");
  $("participants-empty").hidden = list.length > 0;
}

async function renderResults() {
  const list = normalizeResults(await Api.results.list());

  $("results-attempts").textContent = list.length;
  $("results-players").textContent = new Set(list.map((r) => r.name.toLowerCase())).size;
  $("results-average").textContent = list.length
    ? `${Math.round(list.reduce((s, r) => s + r.percentage, 0) / list.length)}%` : "—";
  $("results-best").textContent = list.length
    ? `${Math.round(Math.max(...list.map((r) => r.percentage)))}%` : "—";

  $("results-table").innerHTML = list
    .slice()
    .sort((a, b) => b.percentage - a.percentage)
    .map((r) => `
      <tr>
        <td><span class="table-title">${escapeHTML(r.name)}</span></td>
        <td>${r.score}/${r.total}</td>
        <td>${Math.round(r.percentage)}%</td>
        <td>${r.time}s</td>
        <td>${escapeHTML(r.date)}</td>
      </tr>
    `).join("");
  $("results-empty").hidden = list.length > 0;
}

async function renderLeaderboard() {
  const container = $("admin-leaderboard-content");
  if (!container) return;

  // أفضل نتيجة لكل مشارك
  const best = new Map();
  normalizeResults(await Api.results.list()).filter((r) => r.total > 0).forEach((r) => {
    const key = r.name.toLowerCase();
    const prev = best.get(key);
    if (!prev || r.percentage > prev.percentage || (r.percentage === prev.percentage && r.score > prev.score)) best.set(key, r);
  });
  const top = [...best.values()]
    .sort((a, b) => b.percentage - a.percentage || b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, 3);

  if (!top.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏆</div>
        <b>No results yet</b>
        <p>Finished live games will appear here.</p>
      </div>`;
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  const ranks = ["1ST PLACE", "2ND PLACE", "3RD PLACE"];
  container.innerHTML = `
    <div class="admin-top-three">
      ${top.map((p, i) => `
        <article class="admin-top-card">
          <div class="admin-top-medal">${medals[i]}</div>
          <div class="admin-top-rank">${ranks[i]}</div>
          <h3>${escapeHTML(p.name)}</h3>
          <strong>${p.percentage.toFixed(1)}%</strong>
        </article>`).join("")}
    </div>
    <p class="admin-leaderboard-note">Showing each participant's best saved result. All attempts remain in Results.</p>`;
}

async function exportResults() {
  const list = normalizeResults(await Api.results.list());
  if (!list.length) return toast("There are no results to export.");

  const rows = [
    ["Participant", "Quiz", "Score", "Total", "Percentage", "Time (seconds)", "Date"],
    ...list.map((r) => [r.name, r.quizTitle, r.score, r.total, Math.round(r.percentage), r.time, r.date])
  ];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "church-quiz-results.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/* ---------------- Settings ---------------- */

async function loadSettings() {
  const s = await Api.settings.get();
  $("church-name").value = s.churchName || "";
  $("admin-email").value = s.email || "";
  $("dashboard-language").value = s.language || "en";
}

async function saveSettings(event) {
  event.preventDefault();
  try {
    await Api.settings.save({
      churchName: $("church-name").value.trim(),
      email: $("admin-email").value.trim(),
      language: $("dashboard-language").value
    });
    toast("Settings saved.");
  } catch (err) { showError(err); }
}

async function loadCategories() {
  const select = $("modal-quiz-category");
  if (!select) return;
  try {
    const categories = await Api.categories.list();
    select.innerHTML = categories.map((c) => `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`).join("");
  } catch {
    select.innerHTML = '<option value="General">General</option>';
  }
}

/* ---------------- Init ---------------- */

const ACTIONS = {
  "toggle-menu": (el) => {
    const container = el.closest(".dropdown-container");
    const wasActive = container.classList.contains("active");
    closeAllDropdowns();
    if (!wasActive) container.classList.add("active");
  },
  host: (el) => openHostModal(el.dataset.id),
  edit: (el) => openStudio(el.dataset.id),
  "delete-quiz": (el) => deleteQuiz(el.dataset.id),
  "delete-question": (el) => deleteQuestion(el.dataset.id)
};

function init() {
  if (!AUTH_OK) return;

  bindStudio();

  document.addEventListener("click", (event) => {
    const el = event.target.closest("[data-action]");
    if (!el || el.dataset.action !== "toggle-menu") closeAllDropdowns();
    if (el && ACTIONS[el.dataset.action]) ACTIONS[el.dataset.action](el);
  });

  $("btn-start-host-final")?.addEventListener("click", startHosting);
  $("close-host-modal")?.addEventListener("click", closeHostModal);

  const goTo = (page) => (page === "create" ? openStudio(null) : showPage(page));
  document.querySelectorAll(".nav-link").forEach((b) => b.addEventListener("click", () => goTo(b.dataset.page)));
  document.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => goTo(b.dataset.go)));

  $("menu-toggle")?.addEventListener("click", () => $("sidebar").classList.toggle("open"));
  $("settings-form")?.addEventListener("submit", saveSettings);
  $("quiz-search")?.addEventListener("input", () => renderQuizzes().catch(showError));
  $("export-results")?.addEventListener("click", () => exportResults().catch(showError));
  $("admin-leaderboard-refresh")?.addEventListener("click", () => renderLeaderboard().catch(showError));

  loadCategories();
  loadSettings().catch(showError);
  renderDashboard().catch(showError);
  renderQuizzes().catch(showError);
  renderQuestions().catch(showError);
  renderParticipants().catch(showError);
  renderResults().catch(showError);
  renderLeaderboard().catch(showError);
}

document.addEventListener("DOMContentLoaded", init);
