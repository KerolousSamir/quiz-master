
const USERS_KEY = "churchQuizUsers";
const SESSION_KEY = "churchQuizSession";

const registerForm = document.getElementById("registerForm");
const passwordField = document.getElementById("password");
const passwordToggle = document.getElementById("togglePassword");
const authMessage = document.getElementById("authMessage");

function showMessage(message, type = "error") {
  if (!authMessage) return;

  authMessage.textContent = message;
  authMessage.className = `auth-message show ${type}`;
}

// Show / hide password
if (passwordField && passwordToggle) {
  passwordToggle.addEventListener("click", () => {
    const show = passwordField.type === "password";
    passwordField.type = show ? "text" : "password";

    passwordToggle.setAttribute(
      "aria-label",
      show ? "Hide password" : "Show password"
    );

    passwordToggle.setAttribute("aria-pressed", String(show));
  });
}

function readUsers() {
  try {
    const value = JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function hashPassword(password) {
  if (!crypto?.subtle) {
    throw new Error("افتح المشروع باستخدام Live Server أو localhost.");
  }

  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

if (registerForm) {
  registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = passwordField.value;

    const requestedRole = registerForm.querySelector(
      'input[name="requestedRole"]:checked'
    )?.value;

    if (!fullName || !email || !password) {
      showMessage("من فضلك املأ كل البيانات.");
      return;
    }

    if (!requestedRole) {
      showMessage("من فضلك اختار Creator أو Player.");
      return;
    }

    if (!["Creator", "Player"].includes(requestedRole)) {
      showMessage("اختيار نوع الحساب غير صحيح.");
      return;
    }

    const users = readUsers();

    if (users.some(user => user.email.toLowerCase() === email)) {
      showMessage("الإيميل ده مسجل بالفعل. جرّب تسجيل الدخول.");
      return;
    }

    try {
      const passwordHash = await hashPassword(password);

      const user = {
        id: crypto.randomUUID(),
        fullName,
        email,
        passwordHash,

        // صلاحية الحساب الفعلية
        role: "Player",

        // الدور الذي طلبه المستخدم
        requestedRole,

        // يحتاج موافقة Admin إذا طلب Creator
        creatorApproved: false,

        createdAt: new Date().toISOString()
      };

      users.push(user);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      localStorage.setItem(SESSION_KEY, JSON.stringify({
        userId: user.id
      }));

      showMessage(
        requestedRole === "Creator"
          ? "تم إنشاء الحساب. طلب Creator محتاج موافقة Admin."
          : "تم إنشاء حسابك بنجاح!",
        "success"
      );

      // نترك المستخدم في الصفحة حتى يتم ربط التسجيل
      // بتوجيه الصفحات الحالية للمشروع.
    } catch (error) {
      showMessage(error.message || "حصل خطأ أثناء إنشاء الحساب.");
    }
  });
}
