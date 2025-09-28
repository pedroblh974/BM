import { db } from './storage.js';
import { initRouter, navigateTo } from './router.js';
import { renderDashboard, renderRegister, renderStudents, renderAttendance, renderReports, showToast } from './ui.js';
import { getCurrentMonthKey } from './utils.js';

// Seed and settings
db.init();

// Theme
const html = document.documentElement;
const storedTheme = localStorage.getItem('theme');
if (storedTheme) html.setAttribute('data-theme', storedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  const isLight = html.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
});

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Install prompt
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn.addEventListener('click', async () => {
  installBtn.hidden = true;
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  }
});

// Navigation tabs
document.querySelectorAll('.tab').forEach((el) => {
  el.addEventListener('click', () => navigateTo(el.dataset.route));
});

// Router and views
initRouter({
  '#/dashboard': renderDashboard,
  '#/register': renderRegister,
  '#/students': renderStudents,
  '#/attendance': renderAttendance,
  '#/reports': renderReports
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // ignore
  });
}

// First-run hints
if (db.getStudents().length === 0) {
  showToast('ابدأ بإضافة طالب من تبويب "تسجيل"');
}

// Notifications panel (in-app)
function refreshNotifications() {
  const month = getCurrentMonthKey();
  const unpaid = db.getUnpaidStudents(month);
  const capacityAlerts = db.getGroupCapacityAlerts();
  const messages = [];
  if (unpaid.length > 0) messages.push(`عدد الطلاب غير المدفوعين هذا الشهر: ${unpaid.length}`);
  if (capacityAlerts.length > 0) messages.push(...capacityAlerts);
  const todayKey = new Date().toISOString().slice(0, 10);
  if (!db.isAttendanceTaken(todayKey)) messages.push('لم يتم تسجيل الحضور اليوم');
  db.setNotifications(messages);
}

refreshNotifications();
window.addEventListener('storage', refreshNotifications);
window.addEventListener('recalc-notifications', refreshNotifications);

