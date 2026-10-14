
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginMessage = document.getElementById("loginMessage");

function showMessage(message, type) {
  loginMessage.textContent = message;
  loginMessage.className = `message ${type}`;
}

async function hashPassword(password) {
  if (!window.crypto?.subtle) {
    throw new Error("SECURE_CONTEXT_REQUIRED");
  }

  const encodedPassword = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encodedPassword
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

togglePassword.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";

  passwordInput.type = isHidden ? "text" : "password";
  togglePassword.setAttribute(
    "aria-label",
    isHidden ? "Hide password" : "Show password"
  );
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showMessage("", "");

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;

  let users;

  try {
    users = JSON.parse(
      localStorage.getItem("churchQuizUsers") || "[]"
    );
  } catch {
    showMessage("تعذر قراءة بيانات الحسابات المحفوظة.", "error");
    return;
  }

  if (!Array.isArray(users)) {
    showMessage("بيانات الحسابات غير صالحة.", "error");
    return;
  }

  const user = users.find(item =>
    typeof item.email === "string" &&
    item.email.trim().toLowerCase() === email
  );

  if (!user) {
    showMessage("الإيميل أو الباسورد غير صحيح.", "error");
    return;
  }

  try {
    const enteredPasswordHash = await hashPassword(password);

    if (
      typeof user.passwordHash !== "string" ||
      enteredPasswordHash !== user.passwordHash
    ) {
      showMessage("الإيميل أو الباسورد غير صحيح.", "error");
      return;
    }

    const session = {
      id: user.id || user.userId || "",
      name: user.name || user.fullName || "",
      email: user.email,
      role: user.role || "Player",
      loggedIn: true
    };

    localStorage.setItem(
      "churchQuizSession",
      JSON.stringify(session)
    );


showMessage("تم تسجيل الدخول بنجاح!", "success");

setTimeout(() => {
  const gameSession = JSON.parse(
    localStorage.getItem("churchQuizGameSession") || "null"
  );

  if (gameSession && gameSession.status === "waiting") {
    window.location.href =
      "index.html?room=" + encodeURIComponent(gameSession.roomCode);
  } else {
    window.location.href = "index.html";
  }
}, 700);


  } catch (error) {
    if (error.message === "SECURE_CONTEXT_REQUIRED") {
      showMessage(
        "شغّل الموقع باستخدام Live Server ثم جرّب مرة أخرى.",
        "error"
      );
    } else {
      showMessage("حصلت مشكلة أثناء تسجيل الدخول. حاول مرة أخرى.", "error");
      console.error(error);
    }
  }
});
