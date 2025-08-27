import { getCurrentMonthKey, uid } from './utils.js';

const DEFAULT_GROUPS = [
  { id: 'main', name: 'المجموعة الرئيسية', capacity: null, price: 2500 },
  { id: 'mini1', name: 'مجموعة مصغرة 1', capacity: 11, price: 8000 },
  { id: 'mini2', name: 'مجموعة مصغرة 2', capacity: 11, price: 8000 },
  { id: 'mini3', name: 'مجموعة مصغرة 3', capacity: 11, price: 8000 },
  { id: 'mini4', name: 'مجموعة مصغرة 4', capacity: 11, price: 8000 }
];

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const db = {
  init() {
    if (!localStorage.getItem('groups')) write('groups', DEFAULT_GROUPS);
    if (!localStorage.getItem('students')) write('students', []);
    if (!localStorage.getItem('payments')) write('payments', {}); // { monthKey: { studentId: true/false } }
    if (!localStorage.getItem('attendance')) write('attendance', {}); // { yyyy-mm-dd: { studentId: true/false } }
    if (!localStorage.getItem('notifications')) write('notifications', []);
  },

  // Groups
  getGroups() { return read('groups', DEFAULT_GROUPS); },
  getGroupById(id) { return this.getGroups().find(g => g.id === id); },
  getGroupCounts() {
    const counts = Object.fromEntries(this.getGroups().map(g => [g.id, 0]));
    this.getStudents().forEach(s => { counts[s.groupId] = (counts[s.groupId] || 0) + 1; });
    return counts;
  },
  getGroupCapacityAlerts() {
    const groups = this.getGroups();
    const counts = this.getGroupCounts();
    return groups
      .filter(g => typeof g.capacity === 'number' && counts[g.id] >= g.capacity)
      .map(g => `السعة ممتلئة في: ${g.name}`);
  },

  // Students
  getStudents() { return read('students', []); },
  addStudent(student) {
    const list = this.getStudents();
    const id = uid('stu');
    list.push({ id, ...student });
    write('students', list);
    return id;
  },
  updateStudent(id, changes) {
    const list = this.getStudents().map(s => s.id === id ? { ...s, ...changes } : s);
    write('students', list);
  },
  removeStudent(id) {
    const list = this.getStudents().filter(s => s.id !== id);
    write('students', list);
  },

  // Payments
  getPayments(month = getCurrentMonthKey()) { const p = read('payments', {}); return p[month] || {}; },
  setPayment(studentId, paid, month = getCurrentMonthKey()) {
    const all = read('payments', {});
    all[month] = all[month] || {};
    all[month][studentId] = !!paid;
    write('payments', all);
  },
  getUnpaidStudents(month = getCurrentMonthKey()) {
    const payments = this.getPayments(month);
    return this.getStudents().filter(s => !payments[s.id]);
  },

  // Attendance
  getAttendance(dateKey) { const a = read('attendance', {}); return a[dateKey] || {}; },
  setAttendance(dateKey, studentId, present) {
    const all = read('attendance', {});
    all[dateKey] = all[dateKey] || {};
    all[dateKey][studentId] = !!present;
    write('attendance', all);
  },
  isAttendanceTaken(dateKey) { return Object.keys(this.getAttendance(dateKey)).length > 0; },

  // Notifications (in-app)
  getNotifications() { return read('notifications', []); },
  setNotifications(arr) { write('notifications', arr); },
};

