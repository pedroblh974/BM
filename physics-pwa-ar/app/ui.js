import { db } from './storage.js';
import { formatCurrency, getCurrentMonthKey, downloadCSV, phoneIsValid } from './utils.js';

const appRoot = () => document.getElementById('app');

export function showToast(message) {
  const t = document.getElementById('toast');
  t.textContent = message;
  t.hidden = false;
  setTimeout(() => { t.hidden = true; }, 2200);
}

function stats() {
  const groups = db.getGroups();
  const counts = db.getGroupCounts();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const month = getCurrentMonthKey();
  const unpaid = db.getUnpaidStudents(month).length;
  const totalIncome = groups.reduce((sum, g) => sum + (counts[g.id] * g.price), 0);
  return { groups, counts, total, unpaid, totalIncome };
}

export function renderDashboard() {
  const { groups, counts, total, unpaid, totalIncome } = stats();
  const notifications = db.getNotifications();
  appRoot().innerHTML = `
    <section class="grid cols-3">
      <div class="card"><h3>إجمالي الطلاب</h3><div class="big">${total}</div></div>
      <div class="card"><h3>غير مدفوع هذا الشهر</h3><div class="big">${unpaid}</div></div>
      <div class="card"><h3>دخل تقديري</h3><div class="big">${formatCurrency(totalIncome)}</div></div>
    </section>
    <section class="grid" style="margin-top:12px;">
      <div class="card">
        <h3>المجموعات</h3>
        <div class="list">
          ${groups.map(g => `
            <div class="list-item">
              <div>
                <div class="title">${g.name}</div>
                <div class="muted">السعة: ${typeof g.capacity === 'number' ? `${counts[g.id]} / ${g.capacity}` : `${counts[g.id]} · بدون حد`} · السعر: <span class="price">${formatCurrency(g.price)}</span></div>
              </div>
              <button class="btn secondary" data-goto="#/register">تسجيل</button>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <h3>التنبيهات</h3>
        ${notifications.length ? `<ul>${notifications.map(n => `<li>${n}</li>`).join('')}</ul>` : '<div class="muted">لا توجد تنبيهات</div>'}
      </div>
    </section>
  `;
  appRoot().querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', (e) => location.hash = e.currentTarget.dataset.goto));
}

export function renderRegister() {
  const groups = db.getGroups();
  appRoot().innerHTML = `
    <section class="card">
      <h3>تسجيل طالب جديد</h3>
      <form id="regForm" class="row cols-2">
        <div>
          <label>الاسم الكامل</label>
          <input class="input" name="name" required placeholder="الاسم واللقب">
        </div>
        <div>
          <label>الهاتف</label>
          <input class="input" name="phone" required placeholder="مثال: 0550 00 00 00">
        </div>
        <div>
          <label>المجموعة</label>
          <select class="select" name="groupId" required>
            ${groups.map(g => `<option value="${g.id}" data-price="${g.price}">${g.name} — ${formatCurrency(g.price)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label>السعر الشهري</label>
          <input class="input" name="price" readonly value="${formatCurrency(groups[0].price)}">
        </div>
        <div style="grid-column: 1/-1; display:flex; gap:8px;">
          <button class="btn primary" type="submit">حفظ</button>
          <button class="btn secondary" type="reset">مسح</button>
        </div>
      </form>
    </section>
  `;

  const form = document.getElementById('regForm');
  const select = form.groupId;
  const priceInput = form.price;
  select.addEventListener('change', () => {
    const price = Number(select.selectedOptions[0].dataset.price);
    priceInput.value = formatCurrency(price);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (!phoneIsValid(data.phone)) { showToast('رقم الهاتف غير صالح'); return; }

    const groups = db.getGroups();
    const counts = db.getGroupCounts();
    const g = groups.find(x => x.id === data.groupId);
    if (typeof g.capacity === 'number' && counts[g.id] >= g.capacity) { showToast('هذه المجموعة ممتلئة'); return; }

    const id = db.addStudent({ name: data.name.trim(), phone: data.phone.trim(), groupId: data.groupId });
    const month = getCurrentMonthKey();
    db.setPayment(id, false, month);
    showToast('تم الحفظ بنجاح');
    form.reset();
    window.dispatchEvent(new CustomEvent('recalc-notifications'));
  });
}

export function renderStudents() {
  const groups = Object.fromEntries(db.getGroups().map(g => [g.id, g]));
  const students = db.getStudents();
  const month = getCurrentMonthKey();
  const payments = db.getPayments(month);
  appRoot().innerHTML = `
    <section class="card">
      <h3>الطلاب</h3>
      <div class="row" style="margin-bottom: 8px;">
        <input class="input" id="search" placeholder="بحث بالاسم أو الهاتف">
      </div>
      <div id="list" class="list"></div>
    </section>
  `;

  const list = document.getElementById('list');

  function render(items) {
    list.innerHTML = items.map(s => `
      <div class="list-item" data-id="${s.id}">
        <div>
          <div class="title">${s.name}</div>
          <div class="muted">${s.phone} · ${groups[s.groupId]?.name || ''}</div>
        </div>
        <div class="inline">
          <span class="status ${payments[s.id] ? 'paid' : 'unpaid'}">${payments[s.id] ? '✔ مدفوع' : '✖ غير مدفوع'}</span>
          <button class="btn secondary" data-pay>${payments[s.id] ? 'تعيين كغير مدفوع' : 'تعيين كمدفوع'}</button>
          <button class="btn danger" data-del>حذف</button>
        </div>
      </div>
    `).join('');
  }
  render(students);

  document.getElementById('search').addEventListener('input', (e) => {
    const q = e.target.value.trim();
    const filtered = students.filter(s => s.name.includes(q) || s.phone.includes(q));
    render(filtered);
  });

  list.addEventListener('click', (e) => {
    const row = e.target.closest('.list-item');
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.matches('[data-pay]')) {
      const current = !!payments[id];
      db.setPayment(id, !current, month);
      renderStudents();
      showToast('تم تحديث الدفع');
      window.dispatchEvent(new CustomEvent('recalc-notifications'));
    } else if (e.target.matches('[data-del]')) {
      if (confirm('تأكيد حذف الطالب؟')) {
        db.removeStudent(id);
        renderStudents();
        showToast('تم الحذف');
        window.dispatchEvent(new CustomEvent('recalc-notifications'));
      }
    }
  });
}

export function renderAttendance() {
  const students = db.getStudents();
  const today = new Date().toISOString().slice(0, 10);
  const attendance = db.getAttendance(today);
  appRoot().innerHTML = `
    <section class="card">
      <h3>الحضور اليومي (${today})</h3>
      <div class="row cols-3" id="list">
        ${students.map(s => `
          <label class="list-item" style="grid-template-columns: auto 1fr auto;">
            <input type="checkbox" data-id="${s.id}" ${attendance[s.id] ? 'checked' : ''}>
            <div class="title">${s.name}</div>
            <span class="muted">${s.phone}</span>
          </label>
        `).join('')}
      </div>
      <div style="margin-top:10px; display:flex; gap:8px;">
        <button class="btn primary" id="save">حفظ الحضور</button>
        <button class="btn secondary" id="export">تصدير CSV</button>
      </div>
    </section>
  `;

  document.getElementById('save').addEventListener('click', () => {
    document.querySelectorAll('[data-id]').forEach((el) => {
      db.setAttendance(today, el.dataset.id, el.checked);
    });
    showToast('تم حفظ الحضور');
    window.dispatchEvent(new CustomEvent('recalc-notifications'));
  });

  document.getElementById('export').addEventListener('click', () => {
    const rows = [[ 'الاسم', 'الهاتف', 'حاضر' ]];
    db.getStudents().forEach((s) => rows.push([ s.name, s.phone, db.getAttendance(today)[s.id] ? 'نعم' : 'لا' ]));
    downloadCSV(`attendance-${today}.csv`, rows);
  });
}

export function renderReports() {
  const groups = db.getGroups();
  const counts = db.getGroupCounts();
  const month = getCurrentMonthKey();
  const unpaid = db.getUnpaidStudents(month);
  const income = groups.reduce((sum, g) => sum + (counts[g.id] * g.price), 0);
  appRoot().innerHTML = `
    <section class="grid cols-2">
      <div class="card">
        <h3>الدخل الشهري</h3>
        <div class="big" style="font-size:22px;">${formatCurrency(income)}</div>
        <ul>
          ${groups.map(g => `<li>${g.name}: ${counts[g.id]} × ${formatCurrency(g.price)} = ${formatCurrency(counts[g.id]*g.price)}</li>`).join('')}
        </ul>
      </div>
      <div class="card">
        <h3>الطلاب غير المدفوعين</h3>
        ${unpaid.length ? `<ul>${unpaid.map(s => `<li>${s.name} — ${s.phone}</li>`).join('')}</ul>` : '<div class="muted">لا يوجد</div>'}
      </div>
    </section>
  `;
}

