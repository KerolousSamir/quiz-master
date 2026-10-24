"use strict";

/* homen.js — الصفحة الرئيسية
   - كرة اللغة (ضغطة = عربي، ضغطة تانية = English)
   - زرار الداشبورد بيظهر بس لو المستخدم مسجّل دخول
   - Contact info من contacts.js (واتساب) */

const HOME_TEXT = {
  en: {
    eyebrow: "LEARN • PLAY • GROW",
    text: "Test your knowledge and grow together in faith.",
    dashboard: "Dashboard",
    contact: "Contact info",
    notSet: "Number not added yet",
    switchTo: "العربية"          // اللي هيحصل لو داس
  },
  ar: {
    eyebrow: "اتعلّم • العب • انمُ",
    text: "اختبر معلوماتك وانمُ مع أصدقائك في الإيمان.",
    dashboard: "لوحة المعلومات",
    contact: "معلومات التواصل",
    notSet: "لم يتم إضافة الرقم بعد",
    switchTo: "English"
  }
};

let homeLang = "en";
const $ = (id) => document.getElementById(id);

const escapeHTML = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]);

// أيقونة الواتساب
const WHATSAPP_ICON = `
  <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M16.02 3C8.84 3 3.02 8.8 3.02 15.96c0 2.29.6 4.52 1.74 6.49L3 29l6.72-1.73a13 13 0 0 0 6.3 1.6h.01c7.17 0 13-5.82 13-12.98C29.03 8.8 23.2 3 16.02 3zm0 23.7h-.01a10.8 10.8 0 0 1-5.5-1.5l-.4-.23-3.99 1.03 1.06-3.88-.26-.4a10.7 10.7 0 0 1-1.65-5.75c0-5.95 4.86-10.8 10.84-10.8 2.9 0 5.62 1.12 7.67 3.17a10.7 10.7 0 0 1 3.17 7.64c0 5.96-4.86 10.72-10.93 10.72z"/>
    <path fill="currentColor" d="M22.1 18.9c-.33-.17-1.95-.96-2.25-1.07-.3-.11-.52-.17-.74.17-.22.33-.85 1.07-1.04 1.29-.19.22-.38.25-.71.08-.33-.17-1.39-.51-2.65-1.63-.98-.87-1.64-1.95-1.83-2.28-.19-.33-.02-.5.14-.67.15-.15.33-.38.5-.57.17-.19.22-.33.33-.55.11-.22.06-.41-.03-.58-.08-.17-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.58.08-.88.41-.3.33-1.15 1.12-1.15 2.74s1.18 3.18 1.34 3.4c.17.22 2.32 3.55 5.63 4.97.79.34 1.4.54 1.88.7.79.25 1.51.22 2.08.13.63-.09 1.95-.8 2.22-1.57.28-.77.28-1.43.19-1.57-.08-.14-.3-.22-.63-.38z"/>
  </svg>`;

function renderContacts() {
  const grid = $("contact_grid");
  if (!grid || typeof SUPPORT_CONTACTS === "undefined") return;

  grid.innerHTML = SUPPORT_CONTACTS.map((p) => {
    const digits = String(p.phone || "").replace(/\D/g, "");
    const label = `WhatsApp — ${p.name}`;
    return `
      <div class="contact-card">
        <div class="contact-info">
          <b class="contact-name">${escapeHTML(p.name)}</b>
          <span class="contact-number">${digits ? escapeHTML(p.phone) : HOME_TEXT[homeLang].notSet}</span>
        </div>
        ${digits
          ? `<a class="whatsapp-btn" href="https://wa.me/${digits}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHTML(label)}" title="WhatsApp">${WHATSAPP_ICON}</a>`
          : `<a class="whatsapp-btn" href="#" aria-disabled="true" tabindex="-1" aria-label="${escapeHTML(label)}">${WHATSAPP_ICON}</a>`}
      </div>`;
  }).join("");
}

function applyHomeLanguage() {
  const t = HOME_TEXT[homeLang];

  document.documentElement.lang = homeLang;
  document.documentElement.dir = homeLang === "ar" ? "rtl" : "ltr";

  $("eyebrow").textContent = t.eyebrow;
  $("home_text").textContent = t.text;
  $("dashboard_btn").textContent = t.dashboard;
  $("contact_title").textContent = t.contact;
  $("language_btn").title = t.switchTo;
  $("language_btn").setAttribute("aria-label", t.switchTo);
  renderContacts();
}

$("language_btn").addEventListener("click", () => {
  homeLang = homeLang === "en" ? "ar" : "en";
  applyHomeLanguage();
});

// المستخدم المسجّل بس هو اللي يشوف زرار الداشبورد
const isLoggedIn = !!(window.Api && Api.auth && Api.auth.getSession && Api.auth.getSession());
$("dashboard_btn").hidden = !isLoggedIn;

$("contact_grid").addEventListener("click", (e) => {
  const link = e.target.closest('.whatsapp-btn[aria-disabled="true"]');
  if (link) e.preventDefault();
});

renderContacts();
