(() => {
  'use strict';

  const BUILD_TIME = new Date().toLocaleString('ar-DZ');
  const STORAGE_KEY = 'oyc_pwa_v1';

  const GROUPS = {
    main: { id: 'main', name: 'المجموعة الرئيسية', price: 2500, capacity: null, softAt: 25 },
    mini1: { id: 'mini1', name: 'مجموعة مصغرة 1', price: 8000, capacity: 11 },
    mini2: { id: 'mini2', name: 'مجموعة مصغرة 2', price: 8000, capacity: 11 },
    mini3: { id: 'mini3', name: 'مجموعة مصغرة 3', price: 8000, capacity: 11 },
    mini4: { id: 'mini4', name: 'مجموعة مصغرة 4', price: 8000, capacity: 11 },
  };

  const state = {
    students: [], // {id, name, phone, guardianPhone, groupId, joinMonth, payments: {'2025-08':true}, attendance: {'2025-08-27': true}}
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch (e) { console.error(e); }
  }
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function toast(msg, timeout = 2200){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), timeout);
  }

  function monthKey(date = new Date()){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
  }
  function dateKey(date = new Date()){
    return date.toISOString().slice(0,10);
  }

  function validatePhone(phone){
    const p = (phone||'').replace(/\s|-/g,'');
    return /^(\+213|0)(5|6|7)\d{8}$/.test(p);
  }

  function groupCounts(){
    const counts = { main:0, mini1:0, mini2:0, mini3:0, mini4:0 };
    for (const s of state.students) counts[s.groupId]++;
    return counts;
  }

  function currentMonthIncome(){
    const m = document.getElementById('paymentsMonth').value || monthKey();
    let total = 0; let expected = 0; const counts = groupCounts();
    for (const id of Object.keys(GROUPS)) expected += counts[id] * GROUPS[id].price;
    for (const s of state.students) if (s.payments && s.payments[m]) total += GROUPS[s.groupId].price;
    return { total, expected };
  }

  function unpaidStudents(month){
    const m = month || (document.getElementById('paymentsMonth').value || monthKey());
    return state.students.filter(s => !(s.payments && s.payments[m] === true));
  }

  function upsertStudent(stu){
    const i = state.students.findIndex(x => x.id === stu.id);
    if (i >= 0) state.students[i] = stu; else state.students.push(stu);
    save();
  }

  function removeStudent(id){
    const i = state.students.findIndex(x => x.id === id);
    if (i >= 0) { state.students.splice(i,1); save(); }
  }

  function exportAttendanceCsv(){
    const d = document.getElementById('attendanceDate').value || dateKey();
    const g = document.getElementById('attendanceGroup').value;
    let rows = [['التاريخ','المجموعة','الاسم','الهاتف','حضور']];
    const list = filteredByGroup(g);
    for (const s of list){
      const present = s.attendance && s.attendance[d] ? '✔' : '✖';
      rows.push([d, GROUPS[s.groupId].name, s.name, s.phone, present]);
    }
    const csv = rows.map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(["\ufeff" + csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `الحضور-${d}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function filteredByGroup(groupId){
    return groupId && groupId!=='all' ? state.students.filter(s => s.groupId === groupId) : [...state.students];
  }

  function renderStats(){
    const wrap = document.getElementById('stats');
    const counts = groupCounts();
    const m = document.getElementById('paymentsMonth').value || monthKey();
    const { total, expected } = currentMonthIncome();
    wrap.innerHTML = '';
    const items = [
      { x:'إجمالي التلاميذ', y: state.students.length },
      { x:'الرئيسية', y: counts.main + (GROUPS.main.softAt ? ` / ${GROUPS.main.softAt}+` : '') },
      { x:'مصغرة 1', y: `${counts.mini1} / 11` },
      { x:'مصغرة 2', y: `${counts.mini2} / 11` },
      { x:'مصغرة 3', y: `${counts.mini3} / 11` },
      { x:'مصغرة 4', y: `${counts.mini4} / 11` },
      { x:`دخل شهر ${m}`, y: `${total.toLocaleString('ar-DZ')} دج` },
      { x:'المتوقع', y: `${expected.toLocaleString('ar-DZ')} دج` },
    ];
    for (const it of items){
      const d = document.createElement('div'); d.className='stat';
      d.innerHTML = `<div class="x">${it.x}</div><div class="y">${it.y}</div>`;
      wrap.appendChild(d);
    }
    const unpaid = unpaidStudents(m);
    document.getElementById('unpaidNotice').hidden = unpaid.length === 0;
  }

  function renderStudents(){
    const list = document.getElementById('studentsList');
    list.innerHTML = '';
    const tmpl = document.getElementById('studentItemTmpl');
    for (const s of state.students){
      const node = tmpl.content.firstElementChild.cloneNode(true);
      node.querySelector('.title').textContent = s.name;
      node.querySelector('.subtitle').textContent = `${GROUPS[s.groupId].name} · ${s.phone}`;
      const actions = node.querySelector('.item-actions');
      const del = document.createElement('button'); del.className='btn'; del.textContent='حذف';
      del.onclick = () => { if(confirm('تأكيد حذف التلميذ؟')){ removeStudent(s.id); renderAll(); toast('تم الحذف'); } };
      const edit = document.createElement('button'); edit.className='btn'; edit.textContent='تعديل';
      edit.onclick = () => editStudent(s);
      actions.append(edit, del);
      list.appendChild(node);
    }
  }

  function editStudent(s){
    // Pre-fill the register form to edit
    switchTab('register');
    document.getElementById('studentName').value = s.name;
    document.getElementById('studentPhone').value = s.phone;
    document.getElementById('guardianPhone').value = s.guardianPhone || '';
    document.getElementById('groupSelect').value = s.groupId;
    document.getElementById('startMonth').value = s.joinMonth || '';
    document.getElementById('markPaidOnRegister').checked = false;
    document.getElementById('registerForm').dataset.editId = s.id;
  }

  function renderAttendance(){
    const d = document.getElementById('attendanceDate');
    if (!d.value) d.value = dateKey();
    const g = document.getElementById('attendanceGroup').value;
    const list = document.getElementById('attendanceList'); list.innerHTML = '';
    const students = filteredByGroup(g);
    for (const s of students){
      const row = document.createElement('div'); row.className='item';
      const present = s.attendance && s.attendance[d.value] === true;
      row.innerHTML = `<div class="item-main"><div class="title">${s.name}</div><div class="subtitle">${GROUPS[s.groupId].name}</div></div>`;
      const actions = document.createElement('div'); actions.className='item-actions';
      const btn = document.createElement('button'); btn.className='btn'; btn.textContent = present ? '✔ حاضر' : '✖ غائب';
      btn.onclick = () => { s.attendance = s.attendance||{}; s.attendance[d.value] = !present; upsertStudent(s); renderAttendance(); };
      actions.appendChild(btn); row.appendChild(actions); list.appendChild(row);
    }
  }

  function renderPayments(){
    const m = document.getElementById('paymentsMonth'); if(!m.value) m.value = monthKey();
    const g = document.getElementById('paymentsGroup').value;
    const list = document.getElementById('paymentsList'); list.innerHTML='';
    const students = filteredByGroup(g);
    for (const s of students){
      const paid = s.payments && s.payments[m.value] === true;
      const row = document.createElement('div'); row.className='item';
      row.innerHTML = `<div class="item-main"><div class="title">${s.name}</div><div class="subtitle">${GROUPS[s.groupId].name} · ${GROUPS[s.groupId].price.toLocaleString('ar-DZ')} دج</div></div>`;
      const actions = document.createElement('div'); actions.className='item-actions';
      const pill = document.createElement('span'); pill.className = `pill ${paid?'ok':'no'}`; pill.textContent = paid ? '✔ مسدد' : '✖ غير مسدد';
      const toggle = document.createElement('button'); toggle.className='btn'; toggle.textContent = paid ? 'إلغاء' : 'تسديد';
      toggle.onclick = () => { s.payments = s.payments||{}; s.payments[m.value] = !paid; upsertStudent(s); renderPayments(); renderStats(); };
      actions.append(pill, toggle); row.appendChild(actions); list.appendChild(row);
    }
  }

  function renderReports(){
    const m = document.getElementById('reportMonth'); if(!m.value) m.value = monthKey();
    const wrap = document.getElementById('reportsContent'); wrap.innerHTML = '';
    const counts = groupCounts();
    const unpaid = unpaidStudents(m.value);
    const { total, expected } = currentMonthIncome();
    const sum = document.createElement('div'); sum.className='item';
    sum.innerHTML = `<div class="item-main"><div class="title">دخل شهر ${m.value}</div><div class="subtitle">${total.toLocaleString('ar-DZ')} / ${expected.toLocaleString('ar-DZ')} دج</div></div>`;
    wrap.appendChild(sum);
    for (const id of Object.keys(GROUPS)){
      const row = document.createElement('div'); row.className='item';
      const gUnpaid = unpaid.filter(s => s.groupId === id).length;
      row.innerHTML = `<div class="item-main"><div class="title">${GROUPS[id].name}</div><div class="subtitle">عدد: ${counts[id]} · غير مسددين: ${gUnpaid}</div></div>`;
      wrap.appendChild(row);
    }
    if (unpaid.length){
      const box = document.createElement('div'); box.className='card warn';
      box.innerHTML = `<div class="card-title">غير المسددين</div>`;
      for (const s of unpaid){
        const li = document.createElement('div'); li.className='item';
        li.innerHTML = `<div class="item-main"><div class="title">${s.name}</div><div class="subtitle">${s.phone} · ${GROUPS[s.groupId].name}</div></div>`;
        box.appendChild(li);
      }
      wrap.appendChild(box);
    }
  }

  function updateCapacityNote(){
    const sel = document.getElementById('groupSelect');
    const note = document.getElementById('groupCapacityNote');
    const id = sel.value; const counts = groupCounts();
    const g = GROUPS[id];
    if (id === 'main'){
      note.textContent = counts.main >= (g.softAt||0) ? `تنبيه: تجاوزت ${g.softAt}+ تلميذا في الرئيسية.` : `سعر هذه المجموعة: 2500 دج/شهر.`;
      note.style.color = counts.main >= (g.softAt||0) ? '#f59e0b' : 'var(--muted)';
      return;
    }
    const left = (g.capacity||0) - counts[id];
    note.textContent = left > 0 ? `متبقي ${left} مقاعد · السعر: ${g.price} دج/شهر` : 'ممتلئة (11/11)';
    note.style.color = left>0 ? 'var(--muted)' : '#ef4444';
  }

  function search(){
    const q = (document.getElementById('searchInput').value||'').trim();
    const res = document.getElementById('searchResults'); res.innerHTML='';
    if (!q) return;
    const lower = q.toLowerCase();
    const found = state.students.filter(s => s.name.toLowerCase().includes(lower) || (s.phone||'').includes(q));
    for (const s of found){
      const row = document.createElement('div'); row.className='item';
      row.innerHTML = `<div class="item-main"><div class="title">${s.name}</div><div class="subtitle">${s.phone} · ${GROUPS[s.groupId].name}</div></div>`;
      const actions = document.createElement('div'); actions.className='item-actions';
      const open = document.createElement('button'); open.className='btn'; open.textContent='فتح'; open.onclick = () => editStudent(s);
      actions.appendChild(open); row.appendChild(actions); res.appendChild(row);
    }
  }

  function switchTab(id){
    for (const b of document.querySelectorAll('.tab')) b.classList.toggle('active', b.dataset.tab === id);
    for (const v of document.querySelectorAll('.view')) v.classList.remove('active');
    document.getElementById(`view-${id}`).classList.add('active');
    // lazy renders
    if (id==='attendance') renderAttendance();
    if (id==='payments') renderPayments();
    if (id==='reports') renderReports();
    if (id==='students') renderStudents();
    if (id==='dashboard') renderStats();
  }

  function bind(){
    document.getElementById('buildTime').textContent = BUILD_TIME;
    // tabs
    document.querySelector('.tabs').addEventListener('click', (e)=>{
      const b = e.target.closest('button.tab'); if(!b) return; switchTab(b.dataset.tab);
    });
    // register
    document.getElementById('groupSelect').addEventListener('change', updateCapacityNote);
    document.getElementById('registerForm').addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('studentName').value.trim();
      const phone = document.getElementById('studentPhone').value.trim();
      const guardianPhone = document.getElementById('guardianPhone').value.trim();
      const groupId = document.getElementById('groupSelect').value;
      const joinMonth = document.getElementById('startMonth').value || monthKey();
      const payNow = document.getElementById('markPaidOnRegister').checked;

      if (!name){ toast('الاسم مطلوب'); return; }
      if (!validatePhone(phone)){ toast('رقم الهاتف غير صالح'); return; }
      if (guardianPhone && !validatePhone(guardianPhone)){ toast('هاتف الولي غير صالح'); return; }

      // capacity check for mini groups
      const counts = groupCounts();
      if (groupId !== 'main'){
        const cap = GROUPS[groupId].capacity || 0;
        if (counts[groupId] >= cap){ toast('المجموعة ممتلئة'); return; }
      }

      const editId = e.target.dataset.editId;
      const student = {
        id: editId || `s_${Date.now()}`,
        name, phone, guardianPhone, groupId,
        joinMonth,
        payments: {},
        attendance: {}
      };
      if (payNow) student.payments[monthKey()] = true;

      upsertStudent(student);
      e.target.reset(); delete e.target.dataset.editId;
      updateCapacityNote();
      renderAll();
      toast(editId ? 'تم تحديث المعلومات' : 'تم التسجيل');
    });

    document.getElementById('attendanceDate').addEventListener('change', renderAttendance);
    document.getElementById('attendanceGroup').addEventListener('change', renderAttendance);
    document.getElementById('exportCsv').addEventListener('click', exportAttendanceCsv);

    document.getElementById('paymentsMonth').addEventListener('change', ()=>{ renderPayments(); renderStats(); });
    document.getElementById('paymentsGroup').addEventListener('change', renderPayments);

    document.getElementById('reportMonth').addEventListener('change', renderReports);
    document.getElementById('refreshReports').addEventListener('click', renderReports);

    document.getElementById('goToUnpaid').addEventListener('click', ()=> switchTab('reports'));

    document.getElementById('searchInput').addEventListener('input', search);

    // backup & restore
    document.getElementById('backupBtn').addEventListener('click', ()=>{
      const blob = new Blob([JSON.stringify(state,null,2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `oyc-backup-${Date.now()}.json`; a.click();
    });
    document.getElementById('restoreBtn').addEventListener('click', ()=> document.getElementById('restoreInput').click());
    document.getElementById('restoreInput').addEventListener('change', (e)=>{
      const f = e.target.files?.[0]; if(!f) return;
      const r = new FileReader(); r.onload = () => { try { const data = JSON.parse(r.result); state.students = data.students||[]; save(); renderAll(); toast('تم الاسترجاع'); } catch{ toast('ملف غير صالح'); } };
      r.readAsText(f);
    });

    // theme toggle
    const themeBtn = document.getElementById('themeToggle');
    const theme = localStorage.getItem('oyc_theme') || 'dark';
    if (theme === 'light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.removeAttribute('data-theme');
    themeBtn.textContent = theme==='dark' ? '🌙' : '☀️';
    themeBtn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme')==='light' ? 'light' : 'dark';
      const next = cur==='dark' ? 'light' : 'dark';
      if (next==='light') document.documentElement.setAttribute('data-theme','light'); else document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('oyc_theme', next);
      themeBtn.textContent = next==='dark' ? '🌙' : '☀️';
    });

    // notifications
    const notifyToggle = document.getElementById('notifyToggle');
    notifyToggle.addEventListener('change', async (e)=>{
      if (e.target.checked){
        try{
          const perm = await Notification.requestPermission();
          if (perm !== 'granted'){ e.target.checked = false; toast('تم رفض الإذن'); return; }
          toast('الإشعارات مفعلة');
        }catch{ e.target.checked = false; toast('خطأ في الإذن'); }
      }
    });

    // install prompt
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      const btn = document.getElementById('installBtn');
      btn.hidden = false;
      btn.onclick = async () => { if(!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; btn.hidden = true; };
    });
  }

  function renderAll(){
    renderStats();
    renderStudents();
    if (document.getElementById('attendanceDate') && document.getElementById('attendanceDate').value) renderAttendance();
    if (document.getElementById('paymentsMonth') && document.getElementById('paymentsMonth').value) renderPayments();
    if (document.getElementById('reportMonth') && document.getElementById('reportMonth').value) renderReports();
  }

  // Service worker registration
  function registerSW(){
    if ('serviceWorker' in navigator){
      navigator.serviceWorker.register('/workspace/pwa-oyc/sw.js');
    }
  }

  // Initialize
  load();
  window.addEventListener('DOMContentLoaded', () => {
    bind();
    updateCapacityNote();
    renderAll();
    registerSW();
    // unpaid notification suggestion
    const unpaid = unpaidStudents(monthKey());
    if (unpaid.length){
      try{ if (Notification.permission==='granted') new Notification('تذكير المدفوعات', { body: `غير مسددين: ${unpaid.length}` }); }catch{}
    }
  });
})();

