"use strict";

/* login.js — تسجيل الدخول عن طريق Api.auth */

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const loginMessage = document.getElementById("loginMessage");

function showMessage(message, type) {
  if (!loginMessage) return;
  loginMessage.textContent = message;
  loginMessage.className = `message ${type}`;
}

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const isHidden = passwordInput.type === "password";
    passwordInput.type = isHidden ? "text" : "password";
    togglePassword.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showMessage("", "");

    try {
      await Api.auth.login(emailInput.value, passwordInput.value);
      showMessage("تم تسجيل الدخول بنجاح! جاري التحويل...", "success");
      setTimeout(() => { window.location.href = "admin.html"; }, 500);
    } catch (error) {
      if (error.code === "INVALID_CREDENTIALS") {
        showMessage("الإيميل أو الباسورد غير صحيح.", "error");
      } else if (error.code === "SECURE_CONTEXT_REQUIRED") {
        showMessage("شغّل الموقع باستخدام Live Server ثم جرّب مرة أخرى.", "error");
      } else {
        showMessage("حصلت مشكلة أثناء تسجيل الدخول. حاول مرة أخرى.", "error");
        console.error(error);
      }
    }
  });
}
