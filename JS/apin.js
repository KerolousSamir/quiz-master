"use strict";

/* ===========================================================================
   api.js  —  الطبقة الوحيدة اللي بتتعامل مع البيانات والـ Realtime

   كل صفحات المشروع (admin / lobby / host-game / player / login / index)
   بتكلّم `Api.*` بس، وممنوع أي ملف تاني يلمس localStorage أو BroadcastChannel.

   للربط بالباك اند (ASP.NET Core):
     1) غيّر CONFIG.USE_MOCK إلى false
     2) ظبط API_BASE و HUB_URL
     3) أضف سكريبت SignalR قبل api.js في الصفحات اللي فيها لعبة حية:
        <script src="https://cdn.jsdelivr.net/npm/@microsoft/signalr@8/dist/browser/signalr.min.js"></script>
   الـ endpoints والـ DTOs متوثقة في BACKEND.md.

   كل الدوال async عشان شكلها ما يتغيرش لما تبقى حقيقية.
   الأخطاء بترمي ApiError فيها .code (مثلاً DUPLICATE_EMAIL).
   =========================================================================== */
(function () {
  const CONFIG = {
    USE_MOCK: true,
    API_BASE: "/api",
    HUB_URL: "/hubs/game",
    TOKEN_KEY: "churchQuizToken"
  };

  // مفاتيح localStorage (للـ Mock فقط) — نفس المفاتيح القديمة عشان بياناتك الحالية تفضل شغالة
  const KEYS = {
    users: "churchQuizUsers",
    session: "churchQuizSession",
    quizzes: "churchAdminQuizzes",
    legacyBank: "churchAdminQuestions", // قديم: بنك الأسئلة المنفصل (بيتنقل جوه الكويزات تلقائياً)
    settings: "churchAdminSettings",
    results: "churchQuizResults",
    game: "churchQuizGameSession",
    players: "churchQuizPlayers"
  };

  class ApiError extends Error {
    constructor(code, message) {
      super(message || code);
      this.name = "ApiError";
      this.code = code;
    }
  }

  const uuid = () =>
    (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      throw new ApiError("STORAGE_FULL", "Browser storage is full.");
    }
  }

  /* ---------------------------------------------------------------- REST */
  async function http(method, path, body, isForm = false) {
    const headers = {};
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    if (token) headers.Authorization = "Bearer " + token;
    if (body && !isForm) headers["Content-Type"] = "application/json";

    const res = await fetch(CONFIG.API_BASE + path, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined
    });

    if (res.status === 401) {
      Api.auth.logout();
      location.href = "login.html";
      throw new ApiError("UNAUTHORIZED");
    }
    if (!res.ok) {
      let err = {};
      try { err = await res.json(); } catch { /* no body */ }
      throw new ApiError(err.code || `HTTP_${res.status}`, err.message);
    }
    return res.status === 204 ? null : res.json();
  }

  /* --------------------------------------------------------------- helpers */
  async function sha256(text) {
    if (!(window.crypto && crypto.subtle)) throw new ApiError("SECURE_CONTEXT_REQUIRED");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function normalizeQuestion(q) {
    const answers = Array.isArray(q.answers) ? q.answers.map(String) : [];
    return {
      id: q.id || uuid(),
      type: q.type || (answers.length === 2 ? "tf" : "mcq"),
      text: String(q.text || ""),
      image: q.image || null,
      timeLimit: Number(q.timeLimit) || 20,
      points: q.points === "zero" ? "none" : q.points || "standard",
      answers,
      correct: Number(q.correct) || 0
    };
  }

  /* تحميل الكويزات + ترحيل البيانات القديمة (الأسئلة كانت متخزنة في بنك منفصل) */
  function loadQuizzes() {
    const list = readJSON(KEYS.quizzes, []);
    const bank = readJSON(KEYS.legacyBank, []);
    let changed = false;

    list.forEach((quiz) => {
      if (!Array.isArray(quiz.questions)) {
        const ids = Array.isArray(quiz.questionIds) ? quiz.questionIds : [];
        quiz.questions = bank.filter((q) => ids.includes(q.id)).map(normalizeQuestion);
        changed = true;
      }
      if ("questionIds" in quiz) { delete quiz.questionIds; changed = true; }
      quiz.questionCount = quiz.questions.length;
    });

    if (changed) writeJSON(KEYS.quizzes, list);
    return list;
  }

  const summary = ({ questions, ...rest }) => ({ ...rest, questionCount: (questions || []).length });

  /* =========================================================================
     MOCK  (localStorage + BroadcastChannel)
     ========================================================================= */
  const mock = {
    auth: {
      async register({ fullName, email, password, requestedRole }) {
        email = String(email).trim().toLowerCase();
        const users = readJSON(KEYS.users, []);
        if (users.some((u) => String(u.email || "").trim().toLowerCase() === email)) {
          throw new ApiError("DUPLICATE_EMAIL");
        }
        const user = {
          id: uuid(),
          fullName: String(fullName).trim(),
          email,
          passwordHash: await sha256(password),
          role: "Player",
          requestedRole,
          creatorApproved: false,
          createdAt: new Date().toISOString()
        };
        users.push(user);
        writeJSON(KEYS.users, users);
        return { id: user.id, email, requestedRole };
      },

      async login(email, password) {
        email = String(email).trim().toLowerCase();
        const users = readJSON(KEYS.users, []);
        const user = Array.isArray(users)
          ? users.find((u) => typeof u.email === "string" && u.email.trim().toLowerCase() === email)
          : null;
        if (!user) throw new ApiError("INVALID_CREDENTIALS");
        const hash = await sha256(password);
        if (typeof user.passwordHash !== "string" || hash !== user.passwordHash) {
          throw new ApiError("INVALID_CREDENTIALS");
        }
        // ملاحظة: في الـ Mock كل مستخدم بيدخل كـ Creator. الباك اند الحقيقي لازم يطبّق موافقة الأدمن.
        const session = { id: user.id, name: user.fullName || user.name || "", email: user.email, role: "Creator", loggedIn: true };
        writeJSON(KEYS.session, session);
        return session;
      }
    },

    categories: {
      async list() {
        return ["Bible Knowledge", "Old Testament", "New Testament", "Church History", "General"].map((name, i) => ({ id: i + 1, name }));
      }
    },

    quizzes: {
      async list() { return loadQuizzes().map(summary); },
      async get(id) { return loadQuizzes().find((q) => q.id === id) || null; },
      async save(quiz) {
        const list = loadQuizzes();
        const saved = {
          ...quiz,
          id: quiz.id || uuid(),
          createdAt: quiz.createdAt || new Date().toLocaleDateString(),
          questions: (quiz.questions || []).map(normalizeQuestion)
        };
        saved.questionCount = saved.questions.length;
        const idx = list.findIndex((q) => q.id === saved.id);
        if (idx > -1) list[idx] = saved; else list.push(saved);
        writeJSON(KEYS.quizzes, list);
        return saved;
      },
      async remove(id) {
        writeJSON(KEYS.quizzes, loadQuizzes().filter((q) => q.id !== id));
      }
    },

    // الأسئلة بتتحفظ جوه الكويز. الدوال دي مجرد "عرض" لكل الأسئلة.
    questions: {
      async list() {
        return loadQuizzes().flatMap((quiz) =>
          quiz.questions.map((q) => ({ ...q, quizId: quiz.id, quizTitle: quiz.title, category: quiz.category }))
        );
      },
      async remove(questionId) {
        const list = loadQuizzes();
        const quiz = list.find((q) => q.questions.some((x) => x.id === questionId));
        if (!quiz) return;
        if (quiz.questions.length <= 1) throw new ApiError("LAST_QUESTION");
        quiz.questions = quiz.questions.filter((x) => x.id !== questionId);
        quiz.questionCount = quiz.questions.length;
        writeJSON(KEYS.quizzes, list);
      }
    },

    media: {
      // في الـ Mock الصورة بتتصغّر وتتخزن Base64 (عشان حد الـ localStorage). الباك اند الحقيقي بيرجع URL.
      async upload(file) {
        if (!file || !String(file.type).startsWith("image/")) throw new ApiError("NOT_AN_IMAGE");
        if (file.size > 10 * 1024 * 1024) throw new ApiError("FILE_TOO_LARGE");
        const bmp = await createImageBitmap(file);
        const scale = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", 0.82);
      }
    },

    results: {
      async list() { return readJSON(KEYS.results, []); },
      // players: [{ id, nickname, points, correct, timeSeconds }]
      async saveGame({ quizId, quizTitle, roomCode, totalQuestions, players }) {
        const all = readJSON(KEYS.results, []);
        const date = new Date().toISOString();
        players.forEach((p) => {
          all.push({
            id: uuid(),
            name: p.nickname,
            score: p.correct,
            total: totalQuestions,
            percentage: totalQuestions ? Math.round((p.correct / totalQuestions) * 1000) / 10 : 0,
            points: p.points,
            time: p.timeSeconds || 0,
            date,
            quizId,
            quizTitle,
            roomCode
          });
        });
        writeJSON(KEYS.results, all);
      }
    },

    settings: {
      async get() { return readJSON(KEYS.settings, {}); },
      async save(settings) { writeJSON(KEYS.settings, settings); return settings; }
    },

    game: {
      async create(quizId) {
        const quiz = loadQuizzes().find((q) => q.id === quizId);
        if (!quiz) throw new ApiError("QUIZ_NOT_FOUND");
        if (!quiz.questions.length) throw new ApiError("QUIZ_EMPTY");
        const session = {
          roomCode: String(Math.floor(100000 + Math.random() * 900000)),
          status: "waiting",
          quizId: quiz.id,
          quizTitle: quiz.title,
          questions: quiz.questions,
          createdAt: new Date().toISOString()
        };
        writeJSON(KEYS.players, []);
        writeJSON(KEYS.game, session);
        return session;
      },
      async start(pin) {
        const s = readJSON(KEYS.game, null);
        if (!s || s.roomCode !== String(pin)) throw new ApiError("GAME_NOT_FOUND");
        s.status = "playing";
        writeJSON(KEYS.game, s);
        return s;
      },
      async join(pin, nickname) {
        const s = readJSON(KEYS.game, null);
        if (!s || s.roomCode !== String(pin).trim()) throw new ApiError("GAME_NOT_FOUND");
        const players = readJSON(KEYS.players, []);
        const nick = String(nickname).trim();
        if (players.some((p) => p.nickname.toLowerCase() === nick.toLowerCase())) throw new ApiError("NICKNAME_TAKEN");
        const player = { id: uuid(), nickname: nick, joinedAt: new Date().toISOString() };
        players.push(player);
        writeJSON(KEYS.players, players);
        return player;
      },
      async players() { return readJSON(KEYS.players, []); }
    }
  };

  /* =========================================================================
     REMOTE  (ASP.NET Core REST) — شوف BACKEND.md
     ========================================================================= */
  const remote = {
    auth: {
      async register(dto) { return http("POST", "/auth/register", dto); },
      async login(email, password) {
        const res = await http("POST", "/auth/login", { email, password }); // { token, user:{id,name,email,role} }
        localStorage.setItem(CONFIG.TOKEN_KEY, res.token);
        const session = { ...res.user, loggedIn: true };
        writeJSON(KEYS.session, session);
        return session;
      }
    },
    categories: { list: () => http("GET", "/categories") },
    quizzes: {
      list: () => http("GET", "/quizzes"),
      get: (id) => http("GET", `/quizzes/${id}`),
      save: (quiz) => (quiz.id ? http("PUT", `/quizzes/${quiz.id}`, quiz) : http("POST", "/quizzes", quiz)),
      remove: (id) => http("DELETE", `/quizzes/${id}`)
    },
    questions: {
      list: () => http("GET", "/questions"),
      remove: (id) => http("DELETE", `/questions/${id}`)
    },
    media: {
      async upload(file) {
        const fd = new FormData();
        fd.append("file", file);
        return (await http("POST", "/media", fd, true)).url;
      }
    },
    results: {
      list: () => http("GET", "/results"),
      saveGame: (dto) => http("POST", "/results/games", dto)
    },
    settings: {
      get: () => http("GET", "/settings"),
      save: (s) => http("PUT", "/settings", s)
    },
    game: {
      async create(quizId) {
        const session = await http("POST", "/games", { quizId });
        writeJSON(KEYS.game, session); // الصفحات التانية (lobby/host) بتقراه من هنا
        return session;
      },
      async start(pin) {
        const s = await http("POST", `/games/${pin}/start`);
        const cur = readJSON(KEYS.game, {});
        writeJSON(KEYS.game, { ...cur, ...s, status: "playing" });
        return s;
      },
      join: (pin, nickname) => http("POST", `/games/${encodeURIComponent(pin)}/players`, { nickname }),
      players: (pin) => http("GET", `/games/${pin}/players`)
    }
  };

  /* =========================================================================
     REALTIME
     الأحداث (type) المستخدمة:
       host → players : STATE_GET_READY | STATE_SHOW_PAD {isTF,qIndex}
                        STATE_SHOW_RESULT {results:{[playerId]:{correct,gained,score}}}
                        STATE_GAME_OVER
       player → host  : PLAYER_ANSWERED {playerId, answerIndex}
     ========================================================================= */
  const realtime = {
    _handlers: {},
    _channel: null,
    _conn: null,
    _pin: null,

    async connect({ pin, role }) {
      this._pin = pin;
      if (CONFIG.USE_MOCK) {
        if (!this._channel) {
          this._channel = new BroadcastChannel("kahoot_game_bus");
          this._channel.onmessage = (e) => e.data && this._dispatch(e.data.type, e.data);
        }
        return;
      }
      if (!window.signalR) throw new ApiError("SIGNALR_NOT_LOADED");
      this._conn = new signalR.HubConnectionBuilder()
        .withUrl(`${CONFIG.HUB_URL}?pin=${encodeURIComponent(pin)}&role=${role}`, {
          accessTokenFactory: () => localStorage.getItem(CONFIG.TOKEN_KEY) || ""
        })
        .withAutomaticReconnect()
        .build();
      this._conn.on("message", (type, data) => this._dispatch(type, data || {}));
      await this._conn.start();
    },

    on(type, handler) {
      (this._handlers[type] ||= []).push(handler);
    },

    send(type, data = {}) {
      if (CONFIG.USE_MOCK) {
        this._channel?.postMessage({ type, ...data });
      } else {
        this._conn?.invoke("Publish", this._pin, type, data);
      }
    },

    _dispatch(type, data) {
      (this._handlers[type] || []).forEach((fn) => fn(data));
    }
  };

  const impl = CONFIG.USE_MOCK ? mock : remote;

  const Api = {
    config: CONFIG,
    ApiError,
    ...impl,
    realtime,
    auth: {
      ...impl.auth,
      getSession() {
        const s = readJSON(KEYS.session, null);
        return s && s.loggedIn ? s : null;
      },
      logout() {
        localStorage.removeItem(KEYS.session);
        localStorage.removeItem(CONFIG.TOKEN_KEY);
      },
      requireLogin(redirect = "login.html") {
        if (Api.auth.getSession()) return true;
        location.replace(redirect);
        return false;
      }
    },
    game: {
      ...impl.game,
      // الجلسة الحالية المتخزنة في المتصفح (lobby ↔ host-game بيتبادلوها)
      current() { return readJSON(KEYS.game, null); },
      saveCurrent(session) { writeJSON(KEYS.game, session); }
    }
  };

  window.Api = Api;
})();
