/* =========================================================
   أجندة المدير العام - جمعية البلاغ المبين الكويتية
   نظام متابعة المهام والأعمال (يعمل بالكامل على الجهاز)
   ========================================================= */
(function () {
'use strict';

/* ---------- ثوابت ---------- */
const STORE_KEY = 'albalagh_agenda_v1';
const DONE = 'مكتملة';
const PAL = ['#4a4058','#e8ae78','#8b7aa8','#c98a4f','#6fa3a0','#d0546a','#5b8fd1','#a8c686','#f2d16b','#9e6b8f','#7fb7c9','#b5838d'];
const STATUS_COLORS = {'جديدة':'#5b8fd1','قيد التنفيذ':'#e0a03a','مؤجلة':'#9e6b8f','مكتملة':'#3f9b7c'};
const PRIORITY_COLORS = ['#d0546a','#e0a03a','#3f9b7c','#5b8fd1','#9e6b8f'];
const VIEW_TITLES = {
  dashboard:'لوحة التحكم', today:'مهامي اليومية', upcoming:'المهام القادمة', overdue:'المهام المتأخرة',
  awaiting:'بانتظار إجراء من', completed:'المهام المكتملة', all:'نتائج البحث', reports:'التقارير',
  analysis:'تحليل الشيتات', settings:'الإعدادات والبنود', guide:'دليل الاستخدام'
};

const defaultSettings = () => ({
  name: '', org: 'جمعية البلاغ المبين الكويتية',
  categories: [
    {id:'c1', name:'متابعة المشاريع',  desc:'متابعة المشاريع الخيرية والدعوية', color:'#4a4058'},
    {id:'c2', name:'اعتمادات وقرارات', desc:'اعتماد الصرف والتعيينات والموافقات', color:'#e8ae78'},
    {id:'c3', name:'اجتماعات',         desc:'اجتماعات مجلس الإدارة ورؤساء الأقسام', color:'#5b8fd1'},
    {id:'c4', name:'مراسلات وكتب',     desc:'الكتب الرسمية والردود', color:'#6fa3a0'},
    {id:'c5', name:'متابعة إدارية',    desc:'شؤون الموظفين والفروع', color:'#9e6b8f'},
    {id:'c6', name:'تقارير',           desc:'مراجعة التقارير واعتمادها', color:'#c98a4f'}
  ],
  awaiting: ['رئيس مجلس الإدارة','مجلس الإدارة','الشؤون المالية','الشؤون الإدارية','قسم المشاريع','قسم الدعوة','الموارد البشرية','جهة خارجية'],
  priorities: ['عالية','متوسطة','منخفضة'],
  statuses: ['جديدة','قيد التنفيذ','مؤجلة', DONE],
  customFields: [],
  notify: false, sound: true, dailyTime: '08:00', lead: 15,
  lastDaily: '', alertHidden: '', lastBackup: '', backupNag: ''
});

/* ---------- الحالة والتخزين ---------- */
let state = load();
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { s = null; }
  if (!s || typeof s !== 'object') s = { tasks: [], settings: defaultSettings(), seeded: false };
  s.tasks = Array.isArray(s.tasks) ? s.tasks : [];
  s.settings = Object.assign(defaultSettings(), s.settings || {});
  if (!s.settings.statuses.includes(DONE)) s.settings.statuses.push(DONE);
  return s;
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
  catch (e) { toast('تعذر الحفظ على الجهاز — قد تكون مساحة التخزين ممتلئة', 'err'); }
  updateBadges();
}

/* ---------- أدوات ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const today = () => ymd(new Date());
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const parseYmd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const LOC = 'ar-u-nu-latn';
const fmtDate = s => { if (!s) return ''; try { return parseYmd(s).toLocaleDateString(LOC, {weekday:'long', day:'numeric', month:'long', year:'numeric'}); } catch (e) { return s; } };
const fmtShort = s => { if (!s) return ''; try { return parseYmd(s).toLocaleDateString(LOC, {day:'numeric', month:'short'}); } catch (e) { return s; } };
const fmtTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); const ap = h >= 12 ? 'م' : 'ص'; return ((h % 12) || 12) + ':' + pad(m) + ' ' + ap; };
const isDone = t => t.status === DONE;
const isOverdue = t => !isDone(t) && t.date < today();
const isToday = t => !isDone(t) && t.date === today();
const isUpcoming = t => !isDone(t) && t.date > today();
const isAwaiting = t => !isDone(t) && !!t.awaiting;
const catColor = name => (state.settings.categories.find(c => c.name === name) || {}).color || '#8b7aa8';
const prIndex = p => { const i = state.settings.priorities.indexOf(p); return i < 0 ? 99 : i; };
const prClass = p => ['p-high', 'p-mid', 'p-low'][prIndex(p)] || '';
const stColor = (s, i) => STATUS_COLORS[s] || PAL[(i + 4) % PAL.length];
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type; el.textContent = msg;
  $('#toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 3600);
}
function animateCount(el, to, suffix = '') {
  const dur = 1100, start = performance.now();
  const step = now => {
    const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(to * e).toLocaleString('en') + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function confirmBox(title, msg, buttons) {
  $('#cfTitle').textContent = title; $('#cfMsg').textContent = msg;
  const wrap = $('#cfBtns'); wrap.innerHTML = '';
  buttons.forEach(b => {
    const bt = document.createElement('button');
    bt.className = 'btn ' + (b.cls || ''); bt.textContent = b.text;
    bt.onclick = () => { closeModal('confirmModal'); b.fn && b.fn(); };
    wrap.appendChild(bt);
  });
  openModal('confirmModal');
}
function openModal(id) { $('#' + id).classList.add('open'); }
function closeModal(id) { $('#' + id).classList.remove('open'); }
function download(name, content, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], {type: mime});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- الرسوم البيانية ---------- */
const charts = {};
function chartSetup() {
  if (!window.Chart) return;
  Chart.defaults.font.family = "'Tajawal','Segoe UI',Tahoma,sans-serif";
  Chart.defaults.font.size = 14;
  Chart.defaults.color = '#5a5266';
  Chart.defaults.plugins.legend.rtl = true;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.tooltip.rtl = true;
  Chart.defaults.plugins.tooltip.backgroundColor = '#2f2839';
  Chart.defaults.plugins.tooltip.padding = 12;
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.animation.duration = 1400;
  Chart.defaults.animation.easing = 'easeOutQuart';
  Chart.defaults.maintainAspectRatio = false;
}
function makeChart(id, cfg) {
  if (!window.Chart) return;
  const cv = document.getElementById(id); if (!cv) return;
  if (charts[id]) charts[id].destroy();
  const hasData = cfg.data.datasets.some(d => (d.data || []).some(v => (typeof v === 'object' ? v && (v.y || v.r) : v)));
  const wrap = cv.parentElement;
  let em = wrap.querySelector('.chart-empty');
  if (!hasData) {
    cv.style.display = 'none';
    if (!em) { em = document.createElement('div'); em.className = 'chart-empty'; em.textContent = 'لا توجد بيانات كافية'; wrap.appendChild(em); }
    return;
  }
  cv.style.display = ''; if (em) em.remove();
  charts[id] = new Chart(cv, cfg);
}
const alpha = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function gradient(ctxId, c1, c2) {
  const cv = document.getElementById(ctxId); if (!cv) return c1;
  const g = cv.getContext('2d').createLinearGradient(0, 0, 0, 300);
  g.addColorStop(0, c1); g.addColorStop(1, c2); return g;
}
const doughnutCfg = (labels, data, colors, type = 'doughnut') => ({
  type, data: {labels, datasets: [{data, backgroundColor: colors, borderColor: '#fff', borderWidth: 3, hoverOffset: 18}]},
  options: {cutout: type === 'doughnut' ? '62%' : undefined, plugins: {legend: {position: 'bottom'}},
    animation: {animateRotate: true, animateScale: true}}
});
const barCfg = (labels, datasets, opt = {}) => ({
  type: 'bar', data: {labels, datasets},
  options: Object.assign({indexAxis: opt.horizontal ? 'y' : 'x',
    plugins: {legend: {display: datasets.length > 1, position: 'bottom'}},
    scales: {x: {stacked: !!opt.stacked, grid: {display: false}, ticks: {autoSkip: false, maxRotation: 45}},
             y: {stacked: !!opt.stacked, beginAtZero: true, grid: {color: '#eee'}, ticks: {precision: 0}}},
    animation: {delay: ctx => ctx.type === 'data' ? ctx.dataIndex * 90 + ctx.datasetIndex * 200 : 0}}, opt.extra || {})
});

/* ---------- التنقل ---------- */
let currentView = 'dashboard';
function go(view) {
  currentView = view;
  const section = ['today','upcoming','overdue','awaiting','completed','all'].includes(view) ? 'tasks' : view;
  $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + section));
  $$('[data-view]').forEach(a => a.classList.toggle('active', a.dataset.view === view));
  $('#viewTitle').textContent = VIEW_TITLES[view] || '';
  closeSidebar();
  window.scrollTo({top: 0, behavior: 'smooth'});
  render();
}
function render() {
  const v = currentView;
  if (v === 'dashboard') renderDashboard();
  else if (['today','upcoming','overdue','awaiting','completed','all'].includes(v)) renderList();
  else if (v === 'reports') renderReports();
  else if (v === 'settings') renderSettings();
  updateBadges();
}
function closeSidebar() { $('#sidebar').classList.remove('open'); $('#overlay').classList.remove('show'); }

function updateBadges() {
  const T = state.tasks;
  $('#bToday').textContent = T.filter(isToday).length;
  $('#bUpcoming').textContent = T.filter(isUpcoming).length;
  $('#bOverdue').textContent = T.filter(isOverdue).length;
  $('#bAwaiting').textContent = T.filter(isAwaiting).length;
  $('#bCompleted').textContent = T.filter(isDone).length;
  const od = T.filter(isOverdue).length, td = T.filter(isToday).length;
  $('#bellDot').classList.toggle('on', od > 0);
  $('#aaCounts').textContent = `لديك اليوم ${td} مهمة، و ${od} مهمة متأخرة، و ${T.filter(isAwaiting).length} متابعة بانتظار إجراء.`;
  $('#adminAlert').classList.toggle('hide', state.settings.alertHidden === today());
}

/* ---------- لوحة التحكم ---------- */
function kpiHtml(items) {
  return items.map((k, i) => `<div class="kpi" style="--c:${k.c};animation-delay:${i * 0.08}s" ${k.go ? `data-go="${k.go}"` : ''}>
    <div class="k-ico">${k.i}</div><div class="k-val" data-count="${k.v}" data-suffix="${k.s || ''}">0</div>
    <div class="k-lbl">${k.l}</div>${k.sub ? `<div class="k-sub">${k.sub}</div>` : ''}</div>`).join('');
}
function runCounters(root) { $$('[data-count]', root).forEach(el => animateCount(el, +el.dataset.count, el.dataset.suffix)); }

function renderDashboard() {
  const T = state.tasks, total = T.length, done = T.filter(isDone).length;
  const rate = total ? Math.round(done / total * 100) : 0;
  const h = new Date().getHours();
  const name = state.settings.name ? ' ' + state.settings.name : '';
  $('#greeting').textContent = (h < 12 ? 'صباح الخير' : 'مساء الخير') + name + ' 👋';
  $('#heroSub').textContent = `لديك ${T.filter(isToday).length} مهمة اليوم — ${fmtDate(today())}`;
  $('#ringFg').style.strokeDashoffset = 327;
  requestAnimationFrame(() => setTimeout(() => { $('#ringFg').style.strokeDashoffset = 327 - 327 * rate / 100; }, 80));
  animateCount($('#ringVal'), rate, '%');

  const highOpen = T.filter(t => !isDone(t) && prIndex(t.priority) === 0).length;
  const weekDone = T.filter(t => isDone(t) && t.completedAt && t.completedAt.slice(0, 10) >= addDays(today(), -6)).length;
  $('#kpis').innerHTML = kpiHtml([
    {i:'📋', v: total, l:'إجمالي المهام', c:'#4a4058', go:'all'},
    {i:'📅', v: T.filter(isToday).length, l:'مهام اليوم', c:'#5b8fd1', go:'today'},
    {i:'⏭️', v: T.filter(isUpcoming).length, l:'المهام القادمة', c:'#8b7aa8', go:'upcoming'},
    {i:'⚠️', v: T.filter(isOverdue).length, l:'المهام المتأخرة', c:'#d0546a', go:'overdue'},
    {i:'⏳', v: T.filter(isAwaiting).length, l:'بانتظار إجراء', c:'#e0a03a', go:'awaiting'},
    {i:'✅', v: done, l:'المهام المكتملة', c:'#3f9b7c', go:'completed', sub: `منها ${weekDone} هذا الأسبوع`},
    {i:'🔥', v: highOpen, l:'أولوية عالية مفتوحة', c:'#c98a4f'},
    {i:'🎯', v: rate, s:'%', l:'نسبة الإنجاز الكلية', c:'#6fa3a0'}
  ]);
  runCounters($('#kpis'));

  // 1 الحالة
  const sts = state.settings.statuses.map(s => {
    if (s === DONE) return {s, n: done};
    return {s, n: T.filter(t => t.status === s && !isDone(t)).length};
  });
  makeChart('cStatus', doughnutCfg(sts.map(x => x.s), sts.map(x => x.n), sts.map((x, i) => stColor(x.s, i))));
  // 2 التصنيف
  const cats = state.settings.categories;
  makeChart('cCategory', barCfg(cats.map(c => c.name), [
    {label:'مفتوحة', data: cats.map(c => T.filter(t => t.category === c.name && !isDone(t)).length), backgroundColor: cats.map(c => c.color), borderRadius: 10},
    {label:'مكتملة', data: cats.map(c => T.filter(t => t.category === c.name && isDone(t)).length), backgroundColor: cats.map(c => alpha(c.color, .35)), borderRadius: 10}
  ], {stacked: true}));
  // 3 الأولوية
  const prs = state.settings.priorities;
  makeChart('cPriority', doughnutCfg(prs, prs.map(p => T.filter(t => t.priority === p && !isDone(t)).length), prs.map((p, i) => PRIORITY_COLORS[i % 5]), 'pie'));
  // 4 بانتظار إجراء من
  const aw = {}; T.filter(isAwaiting).forEach(t => aw[t.awaiting] = (aw[t.awaiting] || 0) + 1);
  const awE = Object.entries(aw).sort((a, b) => b[1] - a[1]);
  makeChart('cAwaiting', barCfg(awE.map(e => e[0]), [{label:'معاملات معلقة', data: awE.map(e => e[1]), backgroundColor: awE.map((e, i) => PAL[(i + 1) % PAL.length]), borderRadius: 10}], {horizontal: true}));
  // 5 الاتجاه
  const days = []; for (let i = 13; i >= 0; i--) days.push(addDays(today(), -i));
  makeChart('cTrend', {type: 'line', data: {labels: days.map(fmtShort), datasets: [
    {label:'المنجز', data: days.map(d => T.filter(t => t.completedAt && t.completedAt.slice(0, 10) === d).length), borderColor:'#4a4058', backgroundColor: gradient('cTrend', 'rgba(74,64,88,.45)', 'rgba(74,64,88,0)'), fill: true, tension: .4, pointRadius: 5, pointHoverRadius: 9, borderWidth: 3},
    {label:'المجدول', data: days.map(d => T.filter(t => t.date === d).length), borderColor:'#e8ae78', backgroundColor: gradient('cTrend', 'rgba(232,174,120,.4)', 'rgba(232,174,120,0)'), fill: true, tension: .4, pointRadius: 5, pointHoverRadius: 9, borderWidth: 3, borderDash: [6, 4]}
  ]}, options: {plugins: {legend: {position: 'bottom'}}, scales: {y: {beginAtZero: true, ticks: {precision: 0}}, x: {grid: {display: false}}}, interaction: {mode: 'index', intersect: false}}});
  // 6 نسبة الإنجاز لكل تصنيف
  makeChart('cCatRate', {type: 'radar', data: {labels: cats.map(c => c.name), datasets: [{label:'نسبة الإنجاز %', data: cats.map(c => { const a = T.filter(t => t.category === c.name); return a.length ? Math.round(a.filter(isDone).length / a.length * 100) : 0; }), backgroundColor: 'rgba(232,174,120,.35)', borderColor: '#c98a4f', pointBackgroundColor: '#4a4058', borderWidth: 3}]}, options: {plugins: {legend: {display: false}}, scales: {r: {beginAtZero: true, max: 100, ticks: {stepSize: 25, backdropColor: 'transparent'}, pointLabels: {font: {size: 13, weight: 'bold'}}}}}});

  const mini = (arr, sub) => arr.length ? arr.map(t => `<div class="mini" style="--c:${catColor(t.category)}" data-edit="${t.id}"><b>${esc(t.title)}</b><small>${sub(t)}</small></div>`).join('') : '<div class="empty"><span class="e-ico">🎉</span>لا يوجد شيء هنا</div>';
  $('#dashOverdue').innerHTML = mini(T.filter(isOverdue).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6), t => `متأخرة ${daysBetween(t.date, today())} يوم`);
  $('#dashAwaiting').innerHTML = mini(T.filter(isAwaiting).slice(0, 6), t => esc(t.awaiting));
}

/* ---------- قوائم المهام ---------- */
function fillSelect(sel, items, first) {
  const cur = sel.value;
  sel.innerHTML = (first != null ? `<option value="">${first}</option>` : '') + items.map(i => `<option value="${esc(i)}">${esc(i)}</option>`).join('');
  if (items.includes(cur)) sel.value = cur;
}
function fillFilterSelects() {
  const S = state.settings;
  fillSelect($('#fCategory'), S.categories.map(c => c.name), 'كل التصنيفات');
  fillSelect($('#fPriority'), S.priorities, 'كل الأولويات');
  fillSelect($('#fStatus'), S.statuses, 'كل الحالات');
  fillSelect($('#fAwaiting'), S.awaiting, 'بانتظار إجراء من (الكل)');
}
function renderList() {
  const v = currentView, q = $('#globalSearch').value.trim();
  const base = {today: isToday, upcoming: isUpcoming, overdue: isOverdue, awaiting: isAwaiting, completed: isDone, all: () => true}[v];
  let list = state.tasks.filter(base);
  const fc = $('#fCategory').value, fp = $('#fPriority').value, fs = $('#fStatus').value, fa = $('#fAwaiting').value;
  if (fc) list = list.filter(t => t.category === fc);
  if (fp) list = list.filter(t => t.priority === fp);
  if (fs) list = list.filter(t => t.status === fs);
  if (fa) list = list.filter(t => t.awaiting === fa);
  if (q) { const qq = norm(q); list = list.filter(t => norm([t.title, t.notes, t.awaiting, t.awaitingNote, t.category, Object.values(t.custom || {}).join(' ')].join(' ')).includes(qq)); }
  const sort = $('#fSort').value;
  list.sort((a, b) => sort === 'priority' ? prIndex(a.priority) - prIndex(b.priority) || a.date.localeCompare(b.date)
    : sort === 'created' ? (b.createdAt || '').localeCompare(a.createdAt || '')
    : v === 'completed' ? (b.completedAt || '').localeCompare(a.completedAt || '')
    : (a.date + (a.time || '99')).localeCompare(b.date + (b.time || '99')));

  const intros = {
    today: `📅 ${fmtDate(today())} — ${list.length} مهمة مطلوب إنجازها اليوم`,
    upcoming: `⏭️ ${list.length} مهمة مجدولة للأيام القادمة`,
    overdue: list.length ? `⚠️ ${list.length} مهمة تجاوزت موعدها — راجعها وحدّث حالتها` : '🎉 لا توجد مهام متأخرة، أحسنت!',
    awaiting: `⏳ ${list.length} معاملة / قرار بانتظار رد — حتى لا تضيع المتابعات`,
    completed: `✅ أرشيف الأعمال المنجزة (${list.length})`,
    all: `🔍 ${list.length} نتيجة${q ? ' لـ «' + q + '»' : ''}`
  };
  $('#listIntro').textContent = intros[v];
  const box = $('#taskList');
  if (!list.length) { box.innerHTML = `<div class="empty" style="grid-column:1/-1"><span class="e-ico">${v === 'overdue' ? '🎉' : '🗒️'}</span>لا توجد مهام في هذه القائمة</div>`; return; }
  box.innerHTML = list.map((t, i) => taskCard(t, i)).join('');
}
function taskCard(t, i) {
  const late = isOverdue(t), done = isDone(t);
  const cf = state.settings.customFields.filter(f => t.custom && t.custom[f.id]).map(f => `<b>${esc(f.label)}:</b> ${esc(t.custom[f.id])}`).join(' • ');
  let when = `📆 ${fmtShort(t.date)}${t.time ? ' • 🕐 ' + fmtTime(t.time) : ''}`;
  if (late) when += ` • متأخرة ${daysBetween(t.date, today())} يوم`;
  return `<div class="task ${done ? 'done' : ''} ${late ? 'late' : ''}" style="--c:${catColor(t.category)};animation-delay:${Math.min(i, 12) * 0.05}s" data-id="${t.id}">
    <button class="t-check" data-act="toggle" title="${done ? 'إلغاء الإنجاز' : 'تم الإنجاز'}">✔</button>
    <div class="t-title">${esc(t.title)}</div>
    <div class="t-meta">
      <span class="chip cat" style="--c:${catColor(t.category)}">${esc(t.category || 'بدون تصنيف')}</span>
      <span class="chip ${prClass(t.priority)}">${esc(t.priority)}</span>
      <span class="chip st">${esc(t.status)}</span>
      <span class="chip">${when}</span>
      ${t.postponeCount ? `<span class="chip">⏩ أُجلت ${t.postponeCount}</span>` : ''}
    </div>
    ${t.awaiting ? `<div class="t-await">⏳ بانتظار إجراء من: ${esc(t.awaiting)}${t.awaitingNote ? `<small>${esc(t.awaitingNote)}</small>` : ''}</div>` : ''}
    ${t.notes ? `<div class="t-notes">📝 ${esc(t.notes)}</div>` : ''}
    ${cf ? `<div class="t-custom">${cf}</div>` : ''}
    ${done && t.completedAt ? `<div class="t-custom">✅ أُنجزت في ${fmtDate(t.completedAt.slice(0, 10))}</div>` : ''}
    <div class="t-actions">
      ${!done ? `<button class="btn small accent" data-act="toggle">✔ إنجاز</button><button class="btn small" data-act="postpone">⏩ تأجيل</button>` : ''}
      ${t.awaiting && !done ? `<button class="btn small" data-act="replied">📨 تم الرد</button>` : ''}
      <button class="btn small" data-act="edit">✏️ تعديل</button>
      <button class="btn small" data-act="delete">🗑️</button>
    </div></div>`;
}

/* ---------- نموذج المهمة ---------- */
function fillTaskFormSelects() {
  const S = state.settings;
  fillSelect($('#tCategory'), S.categories.map(c => c.name));
  fillSelect($('#tPriority'), S.priorities);
  fillSelect($('#tStatus'), S.statuses);
  fillSelect($('#tAwaiting'), S.awaiting, '— لا يوجد —');
  $('#tCustom').innerHTML = S.customFields.map(f => {
    const id = 'cf_' + f.id;
    if (f.type === 'select') return `<label>${esc(f.label)}<select id="${id}"><option value=""></option>${(f.options || []).map(o => `<option>${esc(o)}</option>`).join('')}</select></label>`;
    return `<label>${esc(f.label)}<input type="${f.type}" id="${id}"></label>`;
  }).join('');
}
function openTaskForm(t) {
  fillTaskFormSelects();
  const S = state.settings;
  $('#taskModalTitle').textContent = t ? '✏️ تعديل المهمة' : '＋ مهمة جديدة';
  $('#tId').value = t ? t.id : '';
  $('#tTitle').value = t ? t.title : '';
  $('#tCategory').value = t ? t.category : (S.categories[0] || {}).name || '';
  $('#tPriority').value = t ? t.priority : S.priorities[1] || S.priorities[0];
  $('#tStatus').value = t ? t.status : S.statuses[0];
  $('#tDate').value = t ? t.date : (currentView === 'upcoming' ? addDays(today(), 1) : today());
  $('#tTime').value = t ? t.time || '' : '';
  $('#tAwaiting').value = t ? t.awaiting || '' : '';
  $('#tAwaitingNote').value = t ? t.awaitingNote || '' : '';
  $('#tNotes').value = t ? t.notes || '' : '';
  $('#tReminder').checked = t ? t.reminder !== false : true;
  S.customFields.forEach(f => { const el = $('#cf_' + f.id); if (el) el.value = t && t.custom ? t.custom[f.id] || '' : ''; });
  openModal('taskModal');
  setTimeout(() => $('#tTitle').focus(), 300);
}
function submitTask(e) {
  e.preventDefault();
  const id = $('#tId').value;
  const old = id ? state.tasks.find(t => t.id === id) : null;
  const data = {
    title: $('#tTitle').value.trim(), category: $('#tCategory').value, priority: $('#tPriority').value,
    status: $('#tStatus').value, date: $('#tDate').value, time: $('#tTime').value,
    awaiting: $('#tAwaiting').value, awaitingNote: $('#tAwaitingNote').value.trim(),
    notes: $('#tNotes').value.trim(), reminder: $('#tReminder').checked, custom: {}
  };
  if (!data.title || !data.date) { toast('يرجى إدخال العنوان والتاريخ', 'err'); return; }
  state.settings.customFields.forEach(f => { const el = $('#cf_' + f.id); if (el && el.value) data.custom[f.id] = el.value; });
  if (old) {
    if (old.date !== data.date || old.time !== data.time) data.notified = '';
    if (data.status === DONE && !isDone(old)) data.completedAt = new Date().toISOString();
    if (data.status !== DONE) data.completedAt = null;
    Object.assign(old, data);
    toast('تم تحديث المهمة ✔', 'ok');
  } else {
    state.tasks.push(Object.assign({id: uid(), createdAt: new Date().toISOString(), completedAt: data.status === DONE ? new Date().toISOString() : null, postponeCount: 0, postponeLog: []}, data));
    toast('تمت إضافة المهمة بنجاح ✔', 'ok');
  }
  save(); closeModal('taskModal'); render();
}
let postponeId = null;
function taskAction(id, act, cardEl) {
  const t = state.tasks.find(x => x.id === id); if (!t) return;
  if (act === 'edit') return openTaskForm(t);
  if (act === 'postpone') {
    postponeId = id; $('#ppDate').value = addDays(t.date > today() ? t.date : today(), 1); $('#ppReason').value = '';
    return openModal('postponeModal');
  }
  if (act === 'delete') return confirmBox('حذف المهمة', `هل تريد حذف «${t.title}» نهائيًا؟`, [
    {text: 'إلغاء'}, {text: '🗑️ حذف', cls: 'danger', fn: () => { removeAnim(cardEl, () => { state.tasks = state.tasks.filter(x => x.id !== id); save(); render(); toast('تم حذف المهمة'); }); }}]);
  if (act === 'replied') { t.awaitingNote = (t.awaitingNote ? t.awaitingNote + ' — ' : '') + 'تم الرد من ' + t.awaiting + ' بتاريخ ' + today(); t.awaiting = ''; save(); render(); return toast('تم تسجيل الرد ✔', 'ok'); }
  if (act === 'toggle') {
    const wasDone = isDone(t);
    t.status = wasDone ? (state.settings.statuses.find(s => s !== DONE) || 'جديدة') : DONE;
    t.completedAt = wasDone ? null : new Date().toISOString();
    if (!wasDone) { chime('done'); confetti(cardEl); }
    save();
    const leaving = currentView !== 'all';
    if (leaving && cardEl) removeAnim(cardEl, render); else render();
    toast(wasDone ? 'تم إرجاع المهمة إلى قيد التنفيذ' : 'أحسنت! تم إنجاز المهمة 🎉', 'ok');
  }
}
function removeAnim(el, cb) { if (!el) return cb(); el.classList.add('removing'); setTimeout(cb, 430); }
function doPostpone(days) {
  const t = state.tasks.find(x => x.id === postponeId); if (!t) return;
  const nd = days ? addDays(t.date > today() ? t.date : today(), days) : $('#ppDate').value;
  if (!nd) return toast('اختر تاريخًا', 'err');
  t.postponeLog = t.postponeLog || [];
  t.postponeLog.push({from: t.date, to: nd, at: new Date().toISOString(), reason: $('#ppReason').value.trim()});
  t.postponeCount = (t.postponeCount || 0) + 1;
  t.date = nd; t.notified = '';
  if (state.settings.statuses.includes('مؤجلة')) t.status = 'مؤجلة';
  const r = $('#ppReason').value.trim(); if (r) t.notes = (t.notes ? t.notes + '\n' : '') + `سبب التأجيل: ${r}`;
  save(); closeModal('postponeModal'); render(); toast('تم تأجيل المهمة إلى ' + fmtDate(nd), 'ok');
}

/* تأثير احتفالي بسيط */
function confetti(el) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  for (let i = 0; i < 26; i++) {
    const p = document.createElement('i');
    p.style.cssText = `position:fixed;z-index:500;width:9px;height:9px;border-radius:${i % 2 ? '50%' : '2px'};background:${PAL[i % PAL.length]};left:${r.left + r.width / 2}px;top:${r.top + 30}px;pointer-events:none;transition:transform 1s cubic-bezier(.2,.8,.3,1),opacity 1s`;
    document.body.appendChild(p);
    requestAnimationFrame(() => { p.style.transform = `translate(${(Math.random() - .5) * 320}px,${Math.random() * 260 - 60}px) rotate(${Math.random() * 720}deg)`; p.style.opacity = 0; });
    setTimeout(() => p.remove(), 1100);
  }
}

/* ---------- التقارير ---------- */
let reportMode = 'day';
function periodRange(mode) {
  const t = today(), d = new Date();
  if (mode === 'day') return {from: t, to: t, label: 'تقرير يوم ' + fmtDate(t)};
  if (mode === 'week') { const from = addDays(t, -d.getDay()); const to = addDays(from, 6); return {from, to, label: `تقرير الأسبوع من ${fmtDate(from)} إلى ${fmtDate(to)}`}; }
  const from = ymd(new Date(d.getFullYear(), d.getMonth(), 1)), to = ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  return {from, to, label: 'تقرير شهر ' + new Date().toLocaleDateString(LOC, {month: 'long', year: 'numeric'})};
}
function reportData(mode) {
  const {from, to, label} = periodRange(mode);
  const inP = s => s && s >= from && s <= to;
  const T = state.tasks;
  const scheduled = T.filter(t => inP(t.date));
  const completed = T.filter(t => isDone(t) && t.completedAt && inP(t.completedAt.slice(0, 10)));
  const added = T.filter(t => t.createdAt && inP(t.createdAt.slice(0, 10)));
  const postponed = T.filter(t => (t.postponeLog || []).some(p => inP(p.at.slice(0, 10))));
  const overdue = scheduled.filter(isOverdue);
  const schedDone = scheduled.filter(isDone).length;
  const ids = new Set(); const rows = [...scheduled, ...completed].filter(t => !ids.has(t.id) && ids.add(t.id));
  return {from, to, label, scheduled, completed, added, postponed, overdue, rate: scheduled.length ? Math.round(schedDone / scheduled.length * 100) : 0, rows};
}
function renderReports() {
  const R = reportData(reportMode);
  $('#reportPeriod').textContent = R.label;
  $('#reportKpis').innerHTML = kpiHtml([
    {i:'📋', v: R.scheduled.length, l:'المهام المجدولة', c:'#4a4058'},
    {i:'✅', v: R.completed.length, l:'المهام المنجزة', c:'#3f9b7c'},
    {i:'⚠️', v: R.overdue.length, l:'متأخرة من الفترة', c:'#d0546a'},
    {i:'⏩', v: R.postponed.length, l:'المهام المؤجلة', c:'#9e6b8f'},
    {i:'➕', v: R.added.length, l:'مهام مضافة', c:'#5b8fd1'},
    {i:'🎯', v: R.rate, s:'%', l:'نسبة إنجاز الفترة', c:'#c98a4f'}
  ]);
  runCounters($('#reportKpis'));
  let days = [];
  if (reportMode === 'day') for (let i = 6; i >= 0; i--) days.push(addDays(today(), -i));
  else for (let d = R.from; d <= R.to; d = addDays(d, 1)) days.push(d);
  const T = state.tasks;
  makeChart('rTrend', barCfg(days.map(fmtShort), [
    {label:'المنجز', data: days.map(d => T.filter(t => t.completedAt && t.completedAt.slice(0, 10) === d).length), backgroundColor: '#4a4058', borderRadius: 8},
    {label:'المضاف', data: days.map(d => T.filter(t => t.createdAt && t.createdAt.slice(0, 10) === d).length), backgroundColor: '#e8ae78', borderRadius: 8}
  ]));
  const cats = state.settings.categories;
  makeChart('rCat', doughnutCfg(cats.map(c => c.name), cats.map(c => R.completed.filter(t => t.category === c.name).length), cats.map(c => c.color), 'polarArea'));
  const sts = state.settings.statuses;
  makeChart('rStatus', doughnutCfg(sts, sts.map(s => R.scheduled.filter(t => t.status === s).length), sts.map((s, i) => stColor(s, i))));
  const rows = R.rows.sort((a, b) => a.date.localeCompare(b.date));
  $('#reportTable').innerHTML = `<thead><tr><th>#</th><th>المهمة</th><th>التصنيف</th><th>الأولوية</th><th>الموعد</th><th>الحالة</th><th>بانتظار إجراء من</th><th>تاريخ الإنجاز</th></tr></thead><tbody>` +
    (rows.length ? rows.map((t, i) => `<tr><td>${i + 1}</td><td>${esc(t.title)}</td><td>${esc(t.category)}</td><td>${esc(t.priority)}</td><td>${t.date}</td><td>${isOverdue(t) ? '⚠️ متأخرة' : esc(t.status)}</td><td>${esc(t.awaiting || '—')}</td><td>${t.completedAt ? t.completedAt.slice(0, 10) : '—'}</td></tr>`).join('')
      : '<tr><td colspan="8">لا توجد مهام في هذه الفترة</td></tr>') + '</tbody>';
}

/* ---------- تصدير / استيراد المهام ---------- */
function taskRows(list) {
  const cf = state.settings.customFields;
  return list.map(t => {
    const r = {'العنوان': t.title, 'التصنيف': t.category, 'الأولوية': t.priority, 'الحالة': isOverdue(t) ? 'متأخرة' : t.status,
      'التاريخ': t.date, 'الوقت': t.time || '', 'بانتظار إجراء من': t.awaiting || '', 'تفاصيل الانتظار': t.awaitingNote || '',
      'الملاحظات': t.notes || '', 'تاريخ الإنجاز': t.completedAt ? t.completedAt.slice(0, 10) : '', 'مرات التأجيل': t.postponeCount || 0};
    cf.forEach(f => r[f.label] = (t.custom || {})[f.id] || '');
    return r;
  });
}
function exportXlsx(rows, name) {
  if (!window.XLSX) return toast('مكتبة Excel غير محملة', 'err');
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]);
  ws['!cols'] = Object.keys(rows[0] || {}).map(k => ({wch: Math.max(12, k.length + 4)}));
  const wb = XLSX.utils.book_new(); wb.Workbook = {Views: [{RTL: true}]};
  XLSX.utils.book_append_sheet(wb, ws, 'المهام');
  XLSX.writeFile(wb, name);
}

/* ---------- محرك تحليل الشيتات ---------- */
const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[ً-ٰٟـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
const toLatinDigits = s => String(s).replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0).replace(/٫/g, '.').replace(/٬/g, ',');
const ROLES = [
  {role:'title',    kw:['عنوان','المهمه','مهمه','الموضوع','البيان','الوصف','title','task','subject']},
  {role:'status',   kw:['حاله','الوضع','status','state']},
  {role:'category', kw:['تصنيف','فئه','النوع','نوع','category','type']},
  {role:'priority', kw:['اولويه','الاهميه','priority']},
  {role:'awaiting', kw:['بانتظار','انتظار','الجهه','جهه','awaiting']},
  {role:'awaitingNote', kw:['تفاصيل الانتظار']},
  {role:'person',   kw:['مسؤول','المكلف','الموظف','المنفذ','owner','assignee']},
  {role:'dept',     kw:['قسم','اداره','الفرع','department','branch']},
  {role:'date',     kw:['تاريخ','موعد','اليوم','date','due']},
  {role:'time',     kw:['الوقت','وقت','الساعه','time']},
  {role:'amount',   kw:['مبلغ','قيمه','تكلفه','ميزانيه','المصروف','amount','cost','budget','total']},
  {role:'notes',    kw:['ملاحظ','notes','remark']}
];
function detectRole(h) {
  const n = norm(h);
  if (n.includes('تفاصيل الانتظار')) return 'awaitingNote';
  if (n.includes('تاريخ الانجاز')) return 'doneDate';
  for (const r of ROLES) if (r.kw.some(k => n.includes(norm(k)))) return r.role;
  return '';
}
function toNum(v) {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  if (v instanceof Date) return NaN;
  const s = toLatinDigits(v).replace(/[,\s]/g, '').replace(/(د\.?ك|kwd|kd|\$|%)/gi, '');
  return /^-?\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
}
function toDateVal(v, allowSerial) {
  if (v instanceof Date && !isNaN(v)) return v;
  if (typeof v === 'number') return allowSerial && v > 20000 && v < 80000 ? new Date(Math.round((v - 25569) * 864e5)) : null;
  const s = toLatinDigits(v).trim(); let m;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/))) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}
function profileColumns(rows) {
  const keys = []; rows.slice(0, 300).forEach(r => Object.keys(r).forEach(k => { if (!keys.includes(k)) keys.push(k); }));
  return keys.filter(k => !/^__EMPTY/.test(k) || rows.some(r => r[k] !== '')).map(k => {
    const vals = rows.map(r => r[k]).filter(v => v !== '' && v != null && String(v).trim() !== '');
    const role = detectRole(k);
    const n = vals.length || 1;
    const distinct = new Set(vals.map(v => v instanceof Date ? ymd(v) : String(v).trim())).size;
    const dateLike = vals.filter(v => toDateVal(v, role === 'date' || role === 'doneDate')).length / n;
    const numLike = vals.filter(v => !isNaN(toNum(v))).length / n;
    let type = 'text';
    if (!vals.length) type = 'empty';
    else if (dateLike >= .7 && (role === 'date' || role === 'doneDate' || vals.some(v => v instanceof Date || typeof v === 'string'))) type = 'date';
    else if (numLike >= .85 && !['status','category','priority'].includes(role)) type = distinct <= 6 && vals.length > 20 ? 'category' : 'number';
    else if (role === 'title' || role === 'notes' || role === 'awaitingNote') type = 'text';
    else if (distinct <= 30 || distinct / n <= .4) type = 'category';
    return {key: k, role, type, distinct, filled: vals.length};
  }).filter(c => c.type !== 'empty');
}
const ROLE_ORDER = ['category','status','priority','awaiting','dept','person'];
const TYPE_AR = {category:'تصنيفي', number:'رقمي', date:'تاريخ', text:'نصي'};
const ROLE_AR = {title:'العنوان', status:'الحالة', category:'التصنيف', priority:'الأولوية', awaiting:'بانتظار إجراء', person:'المسؤول', dept:'القسم', date:'التاريخ', time:'الوقت', amount:'المبلغ', notes:'ملاحظات', awaitingNote:'تفاصيل الانتظار', doneDate:'تاريخ الإنجاز'};

let AN = null; // {name, rows, cols, filters, fromFile, wb}
function startAnalysis(rows, name, fromFile, wb) {
  rows = rows.filter(r => Object.values(r).some(v => v !== '' && v != null));
  if (!rows.length) return toast('الملف لا يحتوي على بيانات', 'err');
  const cols = profileColumns(rows);
  cols.forEach(c => {
    if (c.type === 'date') rows.forEach(r => { const d = toDateVal(r[c.key], true); r['__d_' + c.key] = d ? ymd(d) : ''; });
    if (c.type === 'number') rows.forEach(r => { r['__n_' + c.key] = toNum(r[c.key]); });
  });
  AN = {name, rows, cols, filters: {}, q: '', from: '', to: '', fromFile, wb};
  $('#analysisOut').classList.remove('hidden');
  $('#importAsTasks').classList.toggle('hidden', !fromFile);
  $('#anTitle').textContent = '📊 نتائج تحليل: ' + name;
  $('#colChips').innerHTML = cols.map(c => `<span class="chip ${c.type === 'category' ? 'cat' : ''}" style="--c:${c.type === 'category' ? '#4a4058' : c.type === 'number' ? '#3f9b7c' : c.type === 'date' ? '#5b8fd1' : '#7a7186'}">${esc(c.key)} <i>(${TYPE_AR[c.type]}${c.role ? ' • ' + ROLE_AR[c.role] : ''})</i></span>`).join('');
  buildAnFilters();
  renderAnalysis();
  setTimeout(() => $('#analysisOut').scrollIntoView({behavior: 'smooth'}), 200);
  toast(`تم تحليل ${rows.length} صفًا و ${cols.length} عمودًا تلقائيًا ✔`, 'ok');
}
function catCols() {
  return AN.cols.filter(c => c.type === 'category').sort((a, b) => {
    const ra = ROLE_ORDER.indexOf(a.role), rb = ROLE_ORDER.indexOf(b.role);
    return (ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb) || a.distinct - b.distinct;
  });
}
function buildAnFilters() {
  const cc = catCols().slice(0, 6), dc = AN.cols.find(c => c.type === 'date');
  let h = `<label>بحث نصي<input type="search" data-anq placeholder="ابحث في كل الأعمدة"></label>`;
  h += cc.map(c => {
    const cnt = countBy(AN.rows, c.key, 999);
    return `<label>${esc(c.key)}<select data-anf="${esc(c.key)}"><option value="">الكل</option>${cnt.map(([v, n]) => `<option value="${esc(v)}">${esc(v)} (${n})</option>`).join('')}</select></label>`;
  }).join('');
  if (dc) h += `<label>من تاريخ<input type="date" data-anfrom></label><label>إلى تاريخ<input type="date" data-anto></label>`;
  $('#anFilters').innerHTML = h;
}
function anFiltered() {
  const dc = AN.cols.find(c => c.type === 'date'); const q = norm(AN.q);
  return AN.rows.filter(r => {
    for (const k in AN.filters) if (AN.filters[k] && String(r[k]).trim() !== AN.filters[k]) return false;
    if (dc && AN.from && (!r['__d_' + dc.key] || r['__d_' + dc.key] < AN.from)) return false;
    if (dc && AN.to && (!r['__d_' + dc.key] || r['__d_' + dc.key] > AN.to)) return false;
    if (q && !norm(AN.cols.map(c => r[c.key] instanceof Date ? ymd(r[c.key]) : r[c.key]).join(' ')).includes(q)) return false;
    return true;
  });
}
function countBy(rows, key, top = 10) {
  const m = new Map();
  rows.forEach(r => { let v = r[key]; v = v instanceof Date ? ymd(v) : String(v == null ? '' : v).trim(); if (!v) v = 'غير محدد'; m.set(v, (m.get(v) || 0) + 1); });
  let e = [...m.entries()].sort((a, b) => b[1] - a[1]);
  if (e.length > top) { const rest = e.slice(top - 1).reduce((s, x) => s + x[1], 0); e = e.slice(0, top - 1).concat([['أخرى', rest]]); }
  return e;
}
const isDoneVal = v => /مكتمل|منجز|منتهي|تم|انجز|done|complete/i.test(norm(v));
function renderAnalysis() {
  const rows = anFiltered(), cc = catCols(), nc = AN.cols.filter(c => c.type === 'number'), dc = AN.cols.find(c => c.type === 'date');
  const stc = AN.cols.find(c => c.role === 'status');
  // مؤشرات
  const k = [{i:'🧾', v: rows.length, l:'عدد السجلات', c:'#4a4058', sub: `من أصل ${AN.rows.length}`}, {i:'🧱', v: AN.cols.length, l:'عدد الأعمدة', c:'#8b7aa8'}];
  if (stc) { const d = rows.filter(r => isDoneVal(r[stc.key])).length; k.push({i:'✅', v: d, l:'سجلات مكتملة', c:'#3f9b7c'}); k.push({i:'🎯', v: rows.length ? Math.round(d / rows.length * 100) : 0, s:'%', l:'نسبة الإنجاز', c:'#c98a4f'}); }
  if (nc[0]) { const sum = rows.reduce((s, r) => s + (r['__n_' + nc[0].key] || 0), 0); k.push({i:'💰', v: Math.round(sum), l:'مجموع ' + nc[0].key, c:'#6fa3a0'}); }
  if (cc[0]) k.push({i:'🗂️', v: new Set(rows.map(r => String(r[cc[0].key]).trim())).size, l:'قيم ' + cc[0].key, c:'#5b8fd1'});
  if (dc) { const ds = rows.map(r => r['__d_' + dc.key]).filter(Boolean).sort(); if (ds.length) k.push({i:'📆', v: daysBetween(ds[0], ds[ds.length - 1]) + 1, l:'مدى التواريخ (يوم)', c:'#e0a03a', sub: `${ds[0]} ← ${ds[ds.length - 1]}`}); }
  $('#anKpis').innerHTML = kpiHtml(k); runCounters($('#anKpis'));

  // 10 رسومات
  const specs = buildSpecs(rows, cc, nc, dc);
  $('#anCharts').innerHTML = specs.map((s, i) => `<div class="chart-card ${s.wide ? 'wide' : ''}" style="animation-delay:${i * .07}s"><h3>${i + 1}. ${esc(s.title)}<small>${esc(s.sub || '')}</small></h3><div class="cw"><canvas id="an${i}"></canvas></div></div>`).join('');
  Object.keys(charts).filter(id => /^an\d/.test(id)).forEach(id => { charts[id].destroy(); delete charts[id]; });
  specs.forEach((s, i) => makeChart('an' + i, s.cfg('an' + i)));

  // جدول
  const show = AN.cols.map(c => c.key);
  $('#anRowsInfo').textContent = `(${rows.length} سجل${rows.length > 300 ? ' — يعرض أول 300' : ''})`;
  $('#anTable').innerHTML = `<thead><tr><th>#</th>${show.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>` +
    rows.slice(0, 300).map((r, i) => `<tr><td>${i + 1}</td>${show.map(h => `<td>${esc(r[h] instanceof Date ? ymd(r[h]) : r[h])}</td>`).join('')}</tr>`).join('') + '</tbody>';
}
function buildSpecs(rows, cc, nc, dc) {
  const specs = [];
  const C = i => cc.length ? cc[i % cc.length] : null;
  const colorsFor = n => Array.from({length: n}, (_, i) => PAL[i % PAL.length]);
  const cnt = (c, top) => countBy(rows, c.key, top);
  const timeline = () => {
    const keys = rows.map(r => r['__d_' + dc.key]).filter(Boolean).sort();
    if (!keys.length) return {labels: [], keys: []};
    const monthly = daysBetween(keys[0], keys[keys.length - 1]) > 62;
    const g = new Map(); keys.forEach(k => { const kk = monthly ? k.slice(0, 7) : k; g.set(kk, (g.get(kk) || 0) + 1); });
    const ks = [...g.keys()].sort();
    return {monthly, ks, labels: ks.map(k => monthly ? parseYmd(k + '-01').toLocaleDateString(LOC, {month: 'short', year: 'numeric'}) : fmtShort(k)), vals: ks.map(k => g.get(k))};
  };
  if (!cc.length && !nc.length && !dc) return [];
  // 1 أعمدة
  if (C(0)) { const e = cnt(C(0), 12); specs.push({title: 'توزيع السجلات حسب ' + C(0).key, sub: 'رسم أعمدة', cfg: () => barCfg(e.map(x => x[0]), [{label: 'العدد', data: e.map(x => x[1]), backgroundColor: colorsFor(e.length), borderRadius: 10}])}); }
  // 2 دائري مجوف
  if (C(1)) { const e = cnt(C(1), 8); specs.push({title: 'نسب ' + C(1).key, sub: 'رسم دائري مجوف', cfg: () => doughnutCfg(e.map(x => x[0]), e.map(x => x[1]), colorsFor(e.length))}); }
  // 3 فطيرة
  if (C(2)) { const e = cnt(C(2), 8); specs.push({title: 'حصة كل قيمة في ' + C(2).key, sub: 'رسم فطيرة', cfg: () => doughnutCfg(e.map(x => x[0]), e.map(x => x[1]), colorsFor(e.length).reverse(), 'pie')}); }
  // 4 أعمدة أفقية - أعلى 10
  if (C(3)) { const e = cnt(C(3), 10); specs.push({title: 'الأعلى تكرارًا في ' + C(3).key, sub: 'أعمدة أفقية', cfg: () => barCfg(e.map(x => x[0]), [{label: 'العدد', data: e.map(x => x[1]), backgroundColor: '#e8ae78', hoverBackgroundColor: '#c98a4f', borderRadius: 10}], {horizontal: true})}); }
  // 5 خط زمني
  if (dc) { const tl = timeline(); specs.push({title: 'الاتجاه الزمني حسب ' + dc.key, sub: tl.monthly ? 'شهري' : 'يومي', wide: true, cfg: id => ({type: 'line', data: {labels: tl.labels, datasets: [{label: 'عدد السجلات', data: tl.vals, borderColor: '#4a4058', backgroundColor: gradient(id, 'rgba(74,64,88,.45)', 'rgba(74,64,88,0)'), fill: true, tension: .4, borderWidth: 3, pointRadius: 5, pointBackgroundColor: '#e8ae78'}]}, options: {plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true, ticks: {precision: 0}}, x: {grid: {display: false}}}}})}); }
  // 6 مكدس
  if (cc.length >= 2) { const a = C(0), b = C(1) === a ? C(2) : C(1); const ea = cnt(a, 8).map(x => x[0]), eb = cnt(b, 5).map(x => x[0]);
    const val = (r, c) => { const v = String(r[c.key] == null ? '' : r[c.key]).trim() || 'غير محدد'; return v; };
    specs.push({title: `${a.key} موزعًا حسب ${b.key}`, sub: 'أعمدة مكدسة', wide: true, cfg: () => barCfg(ea, eb.map((bv, j) => ({label: bv, data: ea.map(av => rows.filter(r => val(r, a) === av && (bv === 'أخرى' ? !eb.includes(val(r, b)) : val(r, b) === bv)).length), backgroundColor: PAL[j % PAL.length], borderRadius: 6})), {stacked: true})}); }
  // 7 قطبي
  if (C(4) || C(0)) { const c = C(4) || C(0); const e = cnt(c, 8); specs.push({title: 'مقارنة قيم ' + c.key, sub: 'رسم قطبي', cfg: () => doughnutCfg(e.map(x => x[0]), e.map(x => x[1]), colorsFor(e.length).map(x => alpha(x, .75)), 'polarArea')}); }
  // 8 رادار
  if (C(1) || C(0)) { const c = C(1) || C(0); const e = cnt(c, 8);
    specs.push({title: 'البصمة النسبية لـ ' + c.key, sub: 'رسم راداري', cfg: () => ({type: 'radar', data: {labels: e.map(x => x[0]), datasets: [{label: 'العدد', data: e.map(x => x[1]), backgroundColor: 'rgba(232,174,120,.35)', borderColor: '#c98a4f', pointBackgroundColor: '#4a4058', borderWidth: 3}]}, options: {plugins: {legend: {display: false}}, scales: {r: {beginAtZero: true, ticks: {backdropColor: 'transparent', precision: 0}}}}})}); }
  // 9 مجموع رقمي حسب تصنيف أو نسبة الإنجاز
  const stc = AN.cols.find(c => c.role === 'status' && c.type === 'category');
  if (nc[0] && C(0)) { const e = cnt(C(0), 10).map(x => x[0]).filter(x => x !== 'أخرى'); const n = nc[0];
    specs.push({title: `مجموع ${n.key} حسب ${C(0).key}`, sub: 'أعمدة بقيم رقمية', cfg: id => barCfg(e, [{label: 'المجموع', data: e.map(v => Math.round(rows.filter(r => String(r[C(0).key]).trim() === v).reduce((s, r) => s + (r['__n_' + n.key] || 0), 0))), backgroundColor: gradient(id, '#6b5d80', '#e8ae78'), borderRadius: 12}])}); }
  else if (stc && C(0) && C(0) !== stc) { const e = cnt(C(0), 10).map(x => x[0]).filter(x => x !== 'أخرى');
    specs.push({title: `نسبة الإنجاز حسب ${C(0).key}`, sub: '% من السجلات المكتملة', cfg: () => barCfg(e, [{label: 'نسبة الإنجاز %', data: e.map(v => { const a = rows.filter(r => String(r[C(0).key]).trim() === v); return a.length ? Math.round(a.filter(r => isDoneVal(r[stc.key])).length / a.length * 100) : 0; }), backgroundColor: e.map((_, i) => PAL[(i + 4) % PAL.length]), borderRadius: 12}], {extra: {scales: {y: {max: 100, beginAtZero: true}, x: {grid: {display: false}}}}})}); }
  // 10 تراكمي / تشتت
  if (dc) { const tl = timeline(); let acc = 0;
    specs.push({title: 'النمو التراكمي للسجلات', sub: 'مساحة تراكمية', wide: true, cfg: id => ({type: 'line', data: {labels: tl.labels, datasets: [{label: 'الإجمالي التراكمي', data: tl.vals.map(v => acc += v), borderColor: '#c98a4f', backgroundColor: gradient(id, 'rgba(232,174,120,.6)', 'rgba(232,174,120,.03)'), fill: true, stepped: false, tension: .3, borderWidth: 3, pointRadius: 3}]}, options: {plugins: {legend: {display: false}}, scales: {y: {beginAtZero: true}, x: {grid: {display: false}}}}})}); }
  else if (nc.length >= 2) { specs.push({title: `العلاقة بين ${nc[0].key} و ${nc[1].key}`, sub: 'رسم تشتت', cfg: () => ({type: 'scatter', data: {datasets: [{label: 'السجلات', data: rows.map(r => ({x: r['__n_' + nc[0].key], y: r['__n_' + nc[1].key]})).filter(p => !isNaN(p.x) && !isNaN(p.y)), backgroundColor: 'rgba(74,64,88,.6)', pointRadius: 6}]}, options: {plugins: {legend: {display: false}}}})}); }
  // استكمال حتى 10 رسومات
  let extra = 0;
  const fillers = [
    () => C(0) && {title: 'أعلى 5 قيم في ' + C(0).key, sub: 'دائري مجوف', cfg: () => { const e = cnt(C(0), 5); return doughnutCfg(e.map(x => x[0]), e.map(x => x[1]), ['#4a4058', '#e8ae78', '#8b7aa8', '#c98a4f', '#6fa3a0']); }},
    () => C(5) && {title: 'توزيع ' + C(5).key, sub: 'رسم أعمدة', cfg: () => { const e = cnt(C(5), 10); return barCfg(e.map(x => x[0]), [{label: 'العدد', data: e.map(x => x[1]), backgroundColor: '#8b7aa8', borderRadius: 10}]); }},
    () => nc[0] && C(0) && {title: `متوسط ${nc[0].key} حسب ${C(0).key}`, sub: 'خط متوسطات', cfg: () => { const e = cnt(C(0), 10).map(x => x[0]).filter(x => x !== 'أخرى'); return {type: 'line', data: {labels: e, datasets: [{label: 'المتوسط', data: e.map(v => { const a = rows.filter(r => String(r[C(0).key]).trim() === v).map(r => r['__n_' + nc[0].key]).filter(x => !isNaN(x)); return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : 0; }), borderColor: '#6fa3a0', backgroundColor: '#6fa3a0', tension: .35, borderWidth: 3, pointRadius: 6}]}, options: {plugins: {legend: {display: false}}}}; }},
    () => dc && {title: 'السجلات حسب أيام الأسبوع', sub: 'من عمود ' + dc.key, cfg: () => { const names = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']; const v = [0, 0, 0, 0, 0, 0, 0]; rows.forEach(r => { const d = r['__d_' + dc.key]; if (d) v[parseYmd(d).getDay()]++; }); return barCfg(names, [{label: 'العدد', data: v, backgroundColor: names.map((_, i) => PAL[i]), borderRadius: 10}]); }},
    () => C(1) && {title: 'الأقل تكرارًا في ' + C(1).key, sub: 'أعمدة أفقية', cfg: () => { const e = countBy(rows, C(1).key, 999).slice(-8).reverse(); return barCfg(e.map(x => x[0]), [{label: 'العدد', data: e.map(x => x[1]), backgroundColor: '#9e6b8f', borderRadius: 10}], {horizontal: true}); }},
    () => ({title: 'اكتمال البيانات في الأعمدة', sub: 'نسبة الخلايا المعبأة %', wide: true, cfg: () => barCfg(AN.cols.map(c => c.key), [{label: 'نسبة التعبئة %', data: AN.cols.map(c => rows.length ? Math.round(rows.filter(r => r[c.key] !== '' && r[c.key] != null).length / rows.length * 100) : 0), backgroundColor: AN.cols.map((_, i) => alpha(PAL[i % PAL.length], .85)), borderRadius: 8}], {extra: {scales: {y: {max: 100, beginAtZero: true}, x: {grid: {display: false}}}}})}),
    () => C(2) && {title: 'تكرارات ' + C(2).key, sub: 'أعمدة', cfg: () => { const e = cnt(C(2), 10); return barCfg(e.map(x => x[0]), [{label: 'العدد', data: e.map(x => x[1]), backgroundColor: '#5b8fd1', borderRadius: 10}]); }},
    () => C(0) && {title: 'التوزيع النسبي % لـ ' + C(0).key, sub: 'نسبة مئوية', cfg: () => { const e = cnt(C(0), 10); const tot = rows.length || 1; return barCfg(e.map(x => x[0]), [{label: '%', data: e.map(x => Math.round(x[1] / tot * 100)), backgroundColor: '#c98a4f', borderRadius: 10}], {horizontal: true}); }}
  ];
  while (specs.length < 10 && extra < fillers.length) { const s = fillers[extra++](); if (s) specs.push(s); }
  return specs.slice(0, 10);
}
function readFile(file, cb) {
  if (!window.XLSX) return toast('مكتبة Excel غير محملة، تحقق من الاتصال', 'err');
  const isCsv = /\.csv$/i.test(file.name);
  const fr = new FileReader();
  fr.onerror = () => toast('تعذرت قراءة الملف', 'err');
  if (isCsv) {
    fr.onload = () => {
      let text = fr.result;
      if (text.includes('�')) { const fr2 = new FileReader(); fr2.onload = () => cb(XLSX.read(fr2.result.replace(/^﻿/, ''), {type: 'string', cellDates: true, raw: false})); fr2.readAsText(file, 'windows-1256'); return; }
      cb(XLSX.read(text.replace(/^﻿/, ''), {type: 'string', cellDates: true}));
    };
    fr.readAsText(file, 'UTF-8');
  } else {
    fr.onload = () => { try { cb(XLSX.read(new Uint8Array(fr.result), {type: 'array', cellDates: true})); } catch (e) { toast('صيغة الملف غير مدعومة', 'err'); } };
    fr.readAsArrayBuffer(file);
  }
}
function sheetRows(wb, name) {
  const ws = wb.Sheets[name];
  let rows = XLSX.utils.sheet_to_json(ws, {defval: '', raw: true});
  // إذا كان الصف الأول عنوانًا وليس رؤوس أعمدة
  const keys = rows.length ? Object.keys(rows[0]) : [];
  if (keys.filter(k => /^__EMPTY/.test(k)).length > keys.length / 2) {
    const aoa = XLSX.utils.sheet_to_json(ws, {header: 1, defval: '', raw: true});
    const hi = aoa.findIndex(r => r.filter(c => String(c).trim()).length >= Math.max(2, (aoa[0] || []).length / 2 | 0));
    if (hi >= 0) { const head = aoa[hi].map((h, i) => String(h).trim() || 'عمود ' + (i + 1)); rows = aoa.slice(hi + 1).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] == null ? '' : r[i]]))); }
  }
  return rows;
}
function handleAnalysisFile(file) {
  readFile(file, wb => {
    const sel = $('#anSheet');
    sel.innerHTML = wb.SheetNames.map(n => `<option>${esc(n)}</option>`).join('');
    sel.classList.toggle('hidden', wb.SheetNames.length < 2);
    startAnalysis(sheetRows(wb, wb.SheetNames[0]), file.name, true, wb);
  });
}
function rowsToTasks(rows, cols) {
  const S = state.settings;
  const by = role => (cols.find(c => c.role === role) || {}).key;
  const kTitle = by('title') || (cols.find(c => c.type === 'text') || cols[0]).key;
  const map = {category: by('category'), status: by('status'), priority: by('priority'), date: by('date'), time: by('time'), awaiting: by('awaiting'), awaitingNote: by('awaitingNote'), notes: by('notes'), doneDate: by('doneDate')};
  const used = new Set([kTitle, ...Object.values(map)].filter(Boolean));
  const out = [];
  rows.forEach(r => {
    const title = String(r[kTitle] || '').trim(); if (!title) return;
    const g = k => k ? (r[k] instanceof Date ? ymd(r[k]) : String(r[k] == null ? '' : r[k]).trim()) : '';
    let date = map.date ? (r['__d_' + map.date] || (toDateVal(r[map.date], true) ? ymd(toDateVal(r[map.date], true)) : '')) : '';
    let status = g(map.status); if (status === 'متأخرة' || !status) status = S.statuses[0]; if (isDoneVal(status)) status = DONE;
    [['category', g(map.category)], ['priority', g(map.priority)], ['awaiting', g(map.awaiting)]].forEach(([k, v]) => {
      if (!v) return;
      if (k === 'category' && !S.categories.some(c => c.name === v)) S.categories.push({id: uid(), name: v, desc: 'مضاف من الاستيراد', color: PAL[S.categories.length % PAL.length]});
      if (k === 'priority' && !S.priorities.includes(v)) S.priorities.push(v);
      if (k === 'awaiting' && !S.awaiting.includes(v)) S.awaiting.push(v);
    });
    if (!S.statuses.includes(status)) S.statuses.splice(S.statuses.length - 1, 0, status);
    let time = g(map.time); if (r[map.time] instanceof Date) time = pad(r[map.time].getHours()) + ':' + pad(r[map.time].getMinutes()); if (!/^\d{1,2}:\d{2}$/.test(time)) time = ''; else time = time.padStart(5, '0');
    const custom = {};
    cols.forEach(c => { if (used.has(c.key)) return; const f = S.customFields.find(x => x.label === c.key) || (S.customFields.push({id: uid(), label: c.key, type: c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}), S.customFields[S.customFields.length - 1]); const v = c.type === 'date' ? r['__d_' + c.key] : g(c.key); if (v) custom[f.id] = v; });
    out.push({id: uid(), title, category: g(map.category) || (S.categories[0] || {}).name, priority: g(map.priority) || S.priorities[1] || S.priorities[0], status, date: date || today(), time, awaiting: g(map.awaiting), awaitingNote: g(map.awaitingNote), notes: g(map.notes), reminder: true, custom, createdAt: new Date().toISOString(), completedAt: status === DONE ? (g(map.doneDate) ? new Date(g(map.doneDate)).toISOString() : new Date().toISOString()) : null, postponeCount: 0, postponeLog: []});
  });
  return out;
}
function importTasksFromRows(rows, cols) {
  const list = rowsToTasks(rows, cols);
  if (!list.length) return toast('لم يتم العثور على مهام صالحة (يلزم عمود عنوان)', 'err');
  confirmBox('استيراد المهام', `سيتم إضافة ${list.length} مهمة إلى النظام. هل تريد المتابعة؟`, [
    {text: 'إلغاء'}, {text: '📥 استيراد', cls: 'primary', fn: () => { state.tasks.push(...list); save(); fillFilterSelects(); toast(`تم استيراد ${list.length} مهمة ✔`, 'ok'); go('dashboard'); }}]);
}

/* ---------- الإعدادات ---------- */
function renderSettings() {
  const S = state.settings;
  $('#sNotify').checked = S.notify && 'Notification' in window && Notification.permission === 'granted';
  $('#sSound').checked = S.sound; $('#sDailyTime').value = S.dailyTime; $('#sLead').value = S.lead;
  $('#sName').value = S.name; $('#sOrg').value = S.org;
  $('#notifyState').textContent = !('Notification' in window) ? 'هذا المتصفح لا يدعم الإشعارات — سيعمل التنبيه الصوتي والرسائل داخل التطبيق.'
    : Notification.permission === 'granted' ? '✔ الإشعارات مسموحة على هذا الجهاز' : Notification.permission === 'denied' ? '✖ الإشعارات محظورة من إعدادات المتصفح — يمكنك السماح بها من أيقونة القفل بجانب العنوان' : 'فعّل الخيار ووافق على طلب المتصفح';
  $('#catList').innerHTML = S.categories.map((c, i) => `<div class="item" style="animation-delay:${i * .04}s"><span class="dot" style="background:${c.color}"></span><div class="i-txt"><b>${esc(c.name)}</b><small>${esc(c.desc || '')} — ${state.tasks.filter(t => t.category === c.name).length} مهمة</small></div>
    <input type="color" value="${c.color}" data-catcolor="${c.id}" title="تغيير اللون"><button class="icon-btn small" data-catedit="${c.id}" title="تعديل">✏️</button><button class="icon-btn small" data-catdel="${c.id}" title="حذف">🗑️</button></div>`).join('');
  const simple = (arr, key, lock) => arr.map((a, i) => `<div class="item"><div class="i-txt"><b>${esc(a)}</b></div>${lock && lock(a) ? '<small>أساسية</small>' : `<button class="icon-btn small" data-${key}edit="${i}">✏️</button><button class="icon-btn small" data-${key}del="${i}">🗑️</button>`}</div>`).join('');
  $('#awList').innerHTML = simple(S.awaiting, 'aw');
  $('#prList').innerHTML = simple(S.priorities, 'pr');
  $('#stList').innerHTML = simple(S.statuses, 'st', s => s === DONE);
  $('#cfList').innerHTML = S.customFields.length ? S.customFields.map(f => `<div class="item"><div class="i-txt"><b>${esc(f.label)}</b><small>${{text: 'نص', number: 'رقم', date: 'تاريخ', select: 'قائمة: ' + (f.options || []).join('، ')}[f.type]}</small></div><button class="icon-btn small" data-cfdel="${f.id}">🗑️</button></div>`).join('') : '<p class="hint">لا توجد بنود إضافية بعد</p>';
  let bytes = 0; try { bytes = (localStorage.getItem(STORE_KEY) || '').length * 2; } catch (e) {}
  $('#storageInfo').textContent = `📦 ${state.tasks.length} مهمة محفوظة — الحجم ${(bytes / 1024).toFixed(1)} كيلوبايت`;
  $('#lastBackup').textContent = S.lastBackup ? 'آخر نسخة احتياطية: ' + fmtDate(S.lastBackup) : 'لم يتم أخذ نسخة احتياطية بعد';
}
function settingsClick(e) {
  const S = state.settings, d = e.target.closest('button')?.dataset; if (!d) return;
  const edit = (arr, i, label) => { const v = prompt(label, arr[i]); if (v && v.trim()) { const old = arr[i]; arr[i] = v.trim(); return old; } };
  if (d.catedit) { const c = S.categories.find(x => x.id === d.catedit); const n = prompt('اسم التصنيف', c.name); if (n && n.trim()) { const old = c.name; c.name = n.trim(); state.tasks.forEach(t => { if (t.category === old) t.category = c.name; }); const ds = prompt('الوصف', c.desc || ''); if (ds != null) c.desc = ds; } }
  else if (d.catdel) { const c = S.categories.find(x => x.id === d.catdel); return confirmBox('حذف تصنيف', `حذف «${c.name}»؟ المهام المرتبطة به تبقى محفوظة.`, [{text: 'إلغاء'}, {text: 'حذف', cls: 'danger', fn: () => { S.categories = S.categories.filter(x => x.id !== d.catdel); save(); renderSettings(); fillFilterSelects(); }}]); }
  else if (d.awedit) { const old = edit(S.awaiting, +d.awedit, 'اسم الجهة'); if (old) state.tasks.forEach(t => { if (t.awaiting === old) t.awaiting = S.awaiting[+d.awedit]; }); }
  else if (d.awdel) S.awaiting.splice(+d.awdel, 1);
  else if (d.predit) { const old = edit(S.priorities, +d.predit, 'الأولوية'); if (old) state.tasks.forEach(t => { if (t.priority === old) t.priority = S.priorities[+d.predit]; }); }
  else if (d.prdel) { if (S.priorities.length < 2) return toast('يجب إبقاء أولوية واحدة على الأقل', 'err'); S.priorities.splice(+d.prdel, 1); }
  else if (d.stedit) { const old = edit(S.statuses, +d.stedit, 'الحالة'); if (old) state.tasks.forEach(t => { if (t.status === old) t.status = S.statuses[+d.stedit]; }); }
  else if (d.stdel) S.statuses.splice(+d.stdel, 1);
  else if (d.cfdel) { S.customFields = S.customFields.filter(f => f.id !== d.cfdel); }
  else return;
  save(); renderSettings(); fillFilterSelects();
}

/* ---------- التنبيهات والصوت ---------- */
let audioCtx = null;
function chime(kind) {
  if (!state.settings.sound && kind !== 'test') return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const notes = kind === 'done' ? [523.25, 659.25, 783.99, 1046.5] : [880, 659.25, 880, 1174.66];
    notes.forEach((f, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime + i * 0.16;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);
      o.connect(g).connect(audioCtx.destination); o.start(t0); o.stop(t0 + 0.55);
    });
  } catch (e) { /* لا يدعم الصوت */ }
}
async function notify(title, body, tag) {
  toast(title + ' — ' + body);
  chime('alert');
  $('#bellBtn').classList.remove('ring'); void $('#bellBtn').offsetWidth; $('#bellBtn').classList.add('ring');
  if (!state.settings.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  const opt = {body, icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', tag: tag || uid(), dir: 'rtl', lang: 'ar', requireInteraction: false};
  try {
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) reg.showNotification(title, opt); else new Notification(title, opt);
  } catch (e) { try { new Notification(title, opt); } catch (e2) {} }
}
function checkReminders() {
  const S = state.settings, now = new Date(), t = today();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let changed = false;
  state.tasks.forEach(task => {
    if (isDone(task) || task.reminder === false || task.date !== t || !task.time) return;
    const key = task.date + ' ' + task.time; if (task.notified === key) return;
    const [h, m] = task.time.split(':').map(Number), tm = h * 60 + m;
    if (nowMin >= tm - (+S.lead || 0) && nowMin <= tm + 60) {
      task.notified = key; changed = true;
      notify('⏰ تذكير بمهمة', `${task.title} — الساعة ${fmtTime(task.time)}${task.awaiting ? ' (بانتظار: ' + task.awaiting + ')' : ''}`, task.id);
    }
  });
  const [dh, dm] = (S.dailyTime || '08:00').split(':').map(Number);
  if (S.lastDaily !== t && nowMin >= dh * 60 + dm) {
    S.lastDaily = t; changed = true;
    const td = state.tasks.filter(isToday).length, od = state.tasks.filter(isOverdue).length, aw = state.tasks.filter(isAwaiting).length;
    notify('📋 ملخص مهام اليوم', `لديك ${td} مهمة اليوم، ${od} متأخرة، ${aw} بانتظار إجراء. راجع المتأخرة وحدّث حالة الأعمال.`, 'daily');
  }
  if (state.tasks.length && S.backupNag !== t && (!S.lastBackup || daysBetween(S.lastBackup, t) > 7)) {
    S.backupNag = t; changed = true;
    setTimeout(() => toast('💾 تذكير: لم تأخذ نسخة احتياطية منذ أكثر من 7 أيام — من الإعدادات'), 4000);
  }
  if (changed) save();
}

/* ---------- النسخ الاحتياطي ---------- */
function backup() {
  state.settings.lastBackup = today(); save();
  download(`نسخة-احتياطية-أجندة-المدير-${today()}.json`, JSON.stringify({app: 'albalagh-agenda', version: 1, exportedAt: new Date().toISOString(), data: state}, null, 2), 'application/json');
  toast('تم تنزيل النسخة الاحتياطية ✔ انقلها للجهاز الآخر', 'ok'); renderSettings();
}
function restore(file) {
  const fr = new FileReader();
  fr.onload = () => {
    let obj; try { obj = JSON.parse(fr.result); } catch (e) { return toast('الملف غير صالح', 'err'); }
    const data = obj && obj.data ? obj.data : obj;
    if (!data || !Array.isArray(data.tasks)) return toast('هذا ليس ملف نسخة احتياطية للتطبيق', 'err');
    confirmBox('استعادة النسخة الاحتياطية', `الملف يحتوي على ${data.tasks.length} مهمة. اختر طريقة الاستعادة:`, [
      {text: 'إلغاء'},
      {text: '🔀 دمج مع الموجود', cls: 'accent', fn: () => { const ids = new Set(state.tasks.map(t => t.id)); data.tasks.forEach(t => { if (!ids.has(t.id)) state.tasks.push(t); }); const s = data.settings || {}; (s.categories || []).forEach(c => { if (!state.settings.categories.some(x => x.name === c.name)) state.settings.categories.push(c); }); ['awaiting', 'priorities', 'statuses'].forEach(k => (s[k] || []).forEach(v => { if (!state.settings[k].includes(v)) state.settings[k].push(v); })); (s.customFields || []).forEach(f => { if (!state.settings.customFields.some(x => x.id === f.id)) state.settings.customFields.push(f); }); done(); }},
      {text: '♻️ استبدال كامل', cls: 'primary', fn: () => { state = {tasks: data.tasks, settings: Object.assign(defaultSettings(), data.settings || {}), seeded: true}; done(); }}
    ]);
    function done() { save(); fillFilterSelects(); render(); toast('تمت استعادة البيانات بنجاح ✔', 'ok'); }
  };
  fr.readAsText(file);
}

/* ---------- بيانات تجريبية ---------- */
function demoTasks() {
  const items = [
    ['متابعة سير مشروع حفر الآبار في أفريقيا', 'متابعة المشاريع', 'عالية', 0, '10:00', 'قسم المشاريع', 'بانتظار تقرير المرحلة الثانية'],
    ['اعتماد صرف دفعة كفالة الأيتام', 'اعتمادات وقرارات', 'عالية', 0, '11:30', 'رئيس مجلس الإدارة', 'كتاب رقم 214 بانتظار التوقيع'],
    ['اجتماع رؤساء الأقسام الأسبوعي', 'اجتماعات', 'متوسطة', 0, '13:00', '', ''],
    ['الرد على كتاب وزارة الشؤون', 'مراسلات وكتب', 'عالية', -2, '09:00', 'جهة خارجية', 'وزارة الشؤون الاجتماعية'],
    ['مراجعة التقرير المالي الربعي', 'تقارير', 'متوسطة', -1, '', 'الشؤون المالية', ''],
    ['مقابلات تعيين داعية جديد', 'متابعة إدارية', 'متوسطة', 1, '10:00', 'الموارد البشرية', ''],
    ['اجتماع مجلس الإدارة الشهري', 'اجتماعات', 'عالية', 3, '18:00', 'مجلس الإدارة', 'تجهيز جدول الأعمال'],
    ['متابعة مشروع إفطار صائم', 'متابعة المشاريع', 'متوسطة', 5, '', '', ''],
    ['اعتماد خطة الدورات الدعوية', 'اعتمادات وقرارات', 'متوسطة', 2, '', 'قسم الدعوة', ''],
    ['زيارة فرع الجهراء', 'متابعة إدارية', 'منخفضة', 6, '09:30', '', ''],
    ['اعتماد تقرير الإنجاز السنوي', 'تقارير', 'عالية', 8, '', '', ''],
    ['إرسال خطاب شكر للمتبرعين', 'مراسلات وكتب', 'منخفضة', 4, '', '', ''],
    ['متابعة بناء مسجد في آسيا', 'متابعة المشاريع', 'عالية', -4, '', 'جهة خارجية', 'المقاول المنفذ'],
    ['اعتماد ترقيات الموظفين', 'اعتمادات وقرارات', 'متوسطة', -3, '', 'رئيس مجلس الإدارة', ''],
    ['مراجعة تقرير قسم الدعوة', 'تقارير', 'منخفضة', 10, '', '', '']
  ];
  const doneItems = [
    ['اجتماع لجنة المشاريع', 'اجتماعات', -1], ['اعتماد صرف الرواتب', 'اعتمادات وقرارات', -2], ['الرد على كتاب البنك', 'مراسلات وكتب', -3],
    ['مراجعة تقرير الحملات', 'تقارير', -4], ['متابعة مشروع السقيا', 'متابعة المشاريع', -5], ['تعميم الدوام الرسمي', 'متابعة إدارية', -6],
    ['اعتماد عقد الصيانة', 'اعتمادات وقرارات', -7], ['اجتماع مع جهة مانحة', 'اجتماعات', -8], ['مراجعة تقرير الفروع', 'تقارير', -9],
    ['متابعة مشروع الأضاحي', 'متابعة المشاريع', -10], ['كتاب إلى وزارة الأوقاف', 'مراسلات وكتب', -11], ['تقييم أداء الموظفين', 'متابعة إدارية', -12],
    ['اعتماد ميزانية الحملة', 'اعتمادات وقرارات', 0], ['متابعة توزيع السلال الغذائية', 'متابعة المشاريع', 0]
  ];
  const t0 = today(), mk = (o) => Object.assign({id: uid(), status: 'جديدة', time: '', awaiting: '', awaitingNote: '', notes: '', reminder: true, custom: {}, postponeCount: 0, postponeLog: [], completedAt: null}, o);
  const out = items.map(([title, category, priority, d, time, awaiting, awaitingNote], i) => mk({title, category, priority, date: addDays(t0, d), time, awaiting, awaitingNote, status: i % 3 === 1 ? 'قيد التنفيذ' : 'جديدة', createdAt: new Date(parseYmd(addDays(t0, Math.min(d, 0) - 2))).toISOString(), notes: i === 0 ? 'التواصل مع المنسق الميداني' : ''}));
  doneItems.forEach(([title, category, d], i) => { const dt = addDays(t0, d); out.push(mk({title, category, priority: ['عالية', 'متوسطة', 'منخفضة'][i % 3], date: dt, status: DONE, createdAt: new Date(parseYmd(addDays(dt, -2))).toISOString(), completedAt: new Date(parseYmd(dt).getTime() + 11 * 36e5).toISOString()})); });
  out[4].postponeCount = 1; out[4].status = 'مؤجلة';
  return out;
}

/* ---------- ربط الأحداث ---------- */
function bind() {
  $$('[data-view]').forEach(a => a.addEventListener('click', () => go(a.dataset.view)));
  $('#menuBtn').onclick = () => { $('#sidebar').classList.add('open'); $('#overlay').classList.add('show'); };
  $('#overlay').onclick = closeSidebar;
  $('#addTaskBtn').onclick = () => openTaskForm();
  $('#fabAdd').onclick = () => openTaskForm();
  $('#taskForm').addEventListener('submit', submitTask);
  $$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('.modal').classList.remove('open')));
  $$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); }));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.modal.open').forEach(m => m.classList.remove('open'));
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#globalSearch').focus(); }
  });
  ['#fCategory', '#fPriority', '#fStatus', '#fAwaiting', '#fSort'].forEach(s => $(s).addEventListener('change', renderList));
  let st; $('#globalSearch').addEventListener('input', () => { clearTimeout(st); st = setTimeout(() => { if (!['today','upcoming','overdue','awaiting','completed','all'].includes(currentView)) go('all'); else renderList(); }, 250); });

  $('#taskList').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const card = b.closest('.task'); taskAction(card.dataset.id, b.dataset.act, card);
  });
  document.addEventListener('click', e => {
    const m = e.target.closest('[data-edit]'); if (m) { const t = state.tasks.find(x => x.id === m.dataset.edit); if (t) openTaskForm(t); }
    const k = e.target.closest('.kpi[data-go]'); if (k) go(k.dataset.go);
    const btn = e.target.closest('.btn');
    if (btn) { const r = document.createElement('span'), rc = btn.getBoundingClientRect(), s = Math.max(rc.width, rc.height); r.className = 'ripple'; r.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - rc.left - s / 2}px;top:${e.clientY - rc.top - s / 2}px`; btn.appendChild(r); setTimeout(() => r.remove(), 600); }
    if (audioCtx == null && (window.AudioContext || window.webkitAudioContext)) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (er) {} }
  });

  // تأجيل
  $$('#postponeModal [data-days]').forEach(b => b.onclick = () => doPostpone(+b.dataset.days));
  $('#ppSave').onclick = () => doPostpone(0);

  // التنبيه الإداري
  $('#aaClose').onclick = () => { state.settings.alertHidden = today(); save(); };
  $('#aaReview').onclick = () => go('overdue');
  $('#bellBtn').onclick = () => {
    const od = state.tasks.filter(isOverdue).length, td = state.tasks.filter(isToday).length, aw = state.tasks.filter(isAwaiting).length;
    confirmBox('🔔 التنبيهات', `اليوم: ${td} مهمة • متأخرة: ${od} • بانتظار إجراء: ${aw}`, [
      {text: '⚠️ المتأخرة', cls: 'danger', fn: () => go('overdue')}, {text: '📅 مهام اليوم', cls: 'primary', fn: () => go('today')}, {text: '⏳ بانتظار إجراء', cls: 'accent', fn: () => go('awaiting')}]);
  };

  // التقارير
  $$('#reportSeg button').forEach(b => b.onclick = () => { $$('#reportSeg button').forEach(x => x.classList.toggle('active', x === b)); reportMode = b.dataset.r; renderReports(); });
  $('#printReport').onclick = () => window.print();
  $('#exportReport').onclick = () => exportXlsx(taskRows(reportData(reportMode).rows), `تقرير-${reportMode === 'day' ? 'يومي' : reportMode === 'week' ? 'أسبوعي' : 'شهري'}-${today()}.xlsx`);

  // التحليل
  const dz = $('#dropZone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) handleAnalysisFile(f); });
  $('#fileInput').onchange = e => { const f = e.target.files[0]; if (f) handleAnalysisFile(f); e.target.value = ''; };
  $('#analyzeTasksBtn').onclick = () => { if (!state.tasks.length) return toast('لا توجد مهام لتحليلها', 'err'); $('#anSheet').classList.add('hidden'); startAnalysis(taskRows(state.tasks), 'مهام النظام الحالية', false); };
  $('#templateBtn').onclick = () => exportXlsx(taskRows(state.tasks.length ? state.tasks.slice(0, 20) : demoTasks()), 'قالب-المهام.xlsx');
  $('#anSheet').onchange = e => startAnalysis(sheetRows(AN.wb, e.target.value), AN.name.split(' ›')[0] + ' › ' + e.target.value, true, AN.wb);
  $('#anFilters').addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.anf != null) AN.filters[el.dataset.anf] = el.value;
    else if (el.hasAttribute('data-anq')) AN.q = el.value;
    else if (el.hasAttribute('data-anfrom')) AN.from = el.value;
    else if (el.hasAttribute('data-anto')) AN.to = el.value;
    clearTimeout(st); st = setTimeout(renderAnalysis, 200);
  });
  $('#anReset').onclick = () => { if (!AN) return; AN.filters = {}; AN.q = AN.from = AN.to = ''; buildAnFilters(); renderAnalysis(); };
  $('#anExport').onclick = () => { if (!AN) return; exportXlsx(anFiltered().map(r => Object.fromEntries(AN.cols.map(c => [c.key, r[c.key] instanceof Date ? ymd(r[c.key]) : r[c.key]]))), 'بيانات-مصفاة.xlsx'); };
  $('#importAsTasks').onclick = () => AN && importTasksFromRows(anFiltered(), AN.cols);

  // الإعدادات
  $('#view-settings').addEventListener('click', settingsClick);
  $('#catList').addEventListener('change', e => { const id = e.target.dataset.catcolor; if (!id) return; state.settings.categories.find(c => c.id === id).color = e.target.value; save(); renderSettings(); });
  $('#sNotify').onchange = async e => {
    if (e.target.checked) {
      if (!('Notification' in window)) { e.target.checked = false; return toast('المتصفح لا يدعم الإشعارات', 'err'); }
      const p = await Notification.requestPermission();
      state.settings.notify = p === 'granted'; e.target.checked = state.settings.notify;
      toast(p === 'granted' ? 'تم تفعيل الإشعارات ✔' : 'لم يتم السماح بالإشعارات', p === 'granted' ? 'ok' : 'err');
    } else state.settings.notify = false;
    save(); renderSettings();
  };
  $('#sSound').onchange = e => { state.settings.sound = e.target.checked; save(); if (e.target.checked) chime('test'); };
  $('#sDailyTime').onchange = e => { state.settings.dailyTime = e.target.value || '08:00'; state.settings.lastDaily = ''; save(); toast('تم حفظ وقت التذكير اليومي', 'ok'); };
  $('#sLead').onchange = e => { state.settings.lead = Math.max(0, +e.target.value || 0); save(); };
  $('#testNotify').onclick = () => { chime('test'); notify('🔔 تجربة التنبيه', 'هكذا سيظهر تذكير المهام اليومية', 'test'); };
  $('#saveGeneral').onclick = () => { state.settings.name = $('#sName').value.trim(); state.settings.org = $('#sOrg').value.trim(); save(); toast('تم الحفظ ✔', 'ok'); };
  $('#addCat').onclick = () => { const n = $('#newCatName').value.trim(); if (!n) return toast('اكتب اسم التصنيف', 'err'); if (state.settings.categories.some(c => c.name === n)) return toast('التصنيف موجود مسبقًا', 'err'); state.settings.categories.push({id: uid(), name: n, desc: $('#newCatDesc').value.trim(), color: $('#newCatColor').value}); $('#newCatName').value = $('#newCatDesc').value = ''; save(); renderSettings(); fillFilterSelects(); toast('تمت إضافة التصنيف ✔', 'ok'); };
  const addSimple = (inp, key, msg) => () => { const v = $(inp).value.trim(); if (!v) return; if (state.settings[key].includes(v)) return toast('موجود مسبقًا', 'err'); if (key === 'statuses') state.settings[key].splice(state.settings[key].length - 1, 0, v); else state.settings[key].push(v); $(inp).value = ''; save(); renderSettings(); fillFilterSelects(); toast(msg, 'ok'); };
  $('#addAw').onclick = addSimple('#newAw', 'awaiting', 'تمت إضافة الجهة ✔');
  $('#addPr').onclick = addSimple('#newPr', 'priorities', 'تمت إضافة الأولوية ✔');
  $('#addSt').onclick = addSimple('#newSt', 'statuses', 'تمت إضافة الحالة ✔');
  $('#addCf').onclick = () => { const l = $('#newCfLabel').value.trim(); if (!l) return toast('اكتب اسم البند', 'err'); const type = $('#newCfType').value; const options = $('#newCfOpts').value.split(/[,،]/).map(s => s.trim()).filter(Boolean); if (type === 'select' && !options.length) return toast('أدخل خيارات القائمة', 'err'); state.settings.customFields.push({id: uid(), label: l, type, options}); $('#newCfLabel').value = $('#newCfOpts').value = ''; save(); renderSettings(); toast('تمت إضافة البند — سيظهر في نموذج المهمة ✔', 'ok'); };
  $('#backupBtn').onclick = backup;
  $('#restoreInput').onchange = e => { const f = e.target.files[0]; if (f) restore(f); e.target.value = ''; };
  $('#exportXlsx').onclick = () => exportXlsx(taskRows(state.tasks), `جميع-المهام-${today()}.xlsx`);
  $('#importXlsx').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; readFile(f, wb => { const rows = sheetRows(wb, wb.SheetNames[0]).filter(r => Object.values(r).some(v => v !== '')); const cols = profileColumns(rows); cols.forEach(c => { if (c.type === 'date') rows.forEach(r => { const d = toDateVal(r[c.key], true); r['__d_' + c.key] = d ? ymd(d) : ''; }); }); importTasksFromRows(rows, cols); }); };
  $('#loadDemo').onclick = () => confirmBox('بيانات تجريبية', 'سيتم إضافة مهام تجريبية لاستعراض النظام.', [{text: 'إلغاء'}, {text: 'إضافة', cls: 'primary', fn: () => { state.tasks.push(...demoTasks()); save(); go('dashboard'); toast('تمت إضافة البيانات التجريبية', 'ok'); }}]);
  $('#clearAll').onclick = () => confirmBox('⚠️ مسح جميع البيانات', 'سيتم حذف جميع المهام نهائيًا من هذا الجهاز. ننصح بتنزيل نسخة احتياطية أولًا.', [
    {text: 'إلغاء'}, {text: '💾 نسخة ثم مسح', cls: 'accent', fn: () => { backup(); state.tasks = []; save(); render(); toast('تم المسح'); }},
    {text: '🗑️ مسح نهائي', cls: 'danger', fn: () => { state.tasks = []; save(); render(); toast('تم مسح جميع المهام'); }}]);
}

/* ---------- الساعة ---------- */
function tick() {
  const d = new Date();
  $('#clock').textContent = d.toLocaleTimeString(LOC, {hour: '2-digit', minute: '2-digit'});
  $('#dateNow').textContent = d.toLocaleDateString(LOC, {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'});
}

/* ---------- التشغيل ---------- */
function init() {
  chartSetup();
  if (!state.seeded) { state.tasks = state.tasks.length ? state.tasks : demoTasks(); state.seeded = true; save(); setTimeout(() => toast('👋 تم تحميل بيانات تجريبية للاستعراض — يمكنك مسحها من الإعدادات'), 2200); }
  bind(); fillFilterSelects(); tick(); setInterval(tick, 15000);
  let lastDay = today();
  setInterval(() => { checkReminders(); if (today() !== lastDay) { lastDay = today(); render(); } }, 30000);
  go('dashboard');
  setTimeout(() => { document.body.classList.add('loaded'); checkReminders(); }, 1500);
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

// للاختبار من وحدة التحكم
window.__agenda = {get state() { return state; }, go, startAnalysis};
})();
