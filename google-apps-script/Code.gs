/**
 * خادم المزامنة - أجندة المدير العام (جمعية البلاغ المبين)
 * يُلصق هذا الكود داخل: Google Sheets ← الإضافات ← Apps Script
 * البيانات تُحفظ داخل نفس جدول Google الخاص بك فقط.
 * @OnlyCurrentDoc
 */

// ⚠️ غيّر الرمز السري التالي إلى رمز خاص بك (حروف وأرقام، 8 خانات أو أكثر)
const SECRET = 'ضع-رمزك-السري-هنا';

const DATA_SHEET = '_data';
const VIEW_SHEET = 'المهام';
const CHUNK = 45000;

function doGet() {
  return out({ ok: true, app: 'albalagh-agenda', msg: 'خادم المزامنة يعمل ✔' });
}

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad_request' }); }
  if (!SECRET || SECRET === 'ضع-رمزك-السري-هنا') return out({ ok: false, error: 'secret_not_set' });
  if (req.key !== SECRET) return out({ ok: false, error: 'unauthorized' });

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return out({ ok: false, error: 'busy' });
  try {
    let stored = readData();
    if (req.action === 'sync' && req.data) {
      const merged = mergeData(stored, req.data);
      if (sig(merged) !== sig(stored)) {
        merged.rev = (stored.rev || 0) + 1;
        merged.serverTime = new Date().toISOString();
        writeData(merged);
        try { mirror(merged); } catch (err) { /* عرض الجدول اختياري */ }
        stored = merged;
      }
    }
    return out({ ok: true, data: stored });
  } finally {
    lock.releaseLock();
  }
}

/* دمج بيانات جهازين: الأحدث تعديلًا يفوز، والمحذوف يبقى محذوفًا */
function mergeData(a, b) {
  a = a || {}; b = b || {};
  const del = Object.assign({}, a.deleted || {});
  Object.keys(b.deleted || {}).forEach(function (id) { if (!del[id] || b.deleted[id] > del[id]) del[id] = b.deleted[id]; });
  const map = {}; const order = [];
  (a.tasks || []).forEach(function (t) { map[t.id] = t; order.push(t.id); });
  (b.tasks || []).forEach(function (t) {
    const x = map[t.id];
    if (!x) { map[t.id] = t; order.push(t.id); }
    else if ((t.updatedAt || '') > (x.updatedAt || '')) map[t.id] = t;
  });
  const tasks = order.map(function (id) { return map[id]; })
    .filter(function (t) { return !(del[t.id] && del[t.id] >= (t.updatedAt || '')); });
  const cutoff = new Date(Date.now() - 90 * 864e5).toISOString();
  Object.keys(del).forEach(function (id) { if (del[id] < cutoff) delete del[id]; });
  const sa = a.settings || null, sb = b.settings || null;
  const settings = (!sa || (sb && (sb.updatedAt || '') > (sa.updatedAt || ''))) ? sb : sa;
  return { tasks: tasks, deleted: del, settings: settings, rev: a.rev || 0, serverTime: a.serverTime || '' };
}

function sig(d) { return JSON.stringify([d.tasks || [], d.deleted || {}, d.settings || null]); }

function readData() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DATA_SHEET);
  if (!sh || sh.getLastRow() < 1) return { tasks: [], deleted: {}, settings: null, rev: 0 };
  const txt = sh.getRange(1, 1, sh.getLastRow(), 1).getValues().map(function (r) { return r[0]; }).join('');
  try { return JSON.parse(txt); } catch (e) { return { tasks: [], deleted: {}, settings: null, rev: 0 }; }
}

function writeData(d) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(DATA_SHEET);
  if (!sh) { sh = ss.insertSheet(DATA_SHEET); sh.hideSheet(); }
  const txt = JSON.stringify(d);
  const rows = [];
  for (let i = 0; i < txt.length; i += CHUNK) rows.push([txt.slice(i, i + CHUNK)]);
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 1).setNumberFormat('@').setValues(rows);
}

/* نسخة مقروءة من المهام داخل ورقة «المهام» للاطلاع فقط */
function mirror(d) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(VIEW_SHEET);
  if (!sh) sh = ss.insertSheet(VIEW_SHEET, 0);
  sh.setRightToLeft(true);
  const head = ['العنوان', 'التصنيف', 'الأولوية', 'الحالة', 'التاريخ', 'الوقت', 'بانتظار إجراء من', 'تفاصيل الانتظار', 'الملاحظات', 'تاريخ الإنجاز', 'آخر تحديث'];
  const rows = (d.tasks || []).slice().sort(function (x, y) { return String(x.date).localeCompare(String(y.date)); }).map(function (t) {
    return [t.title || '', t.category || '', t.priority || '', t.status || '', t.date || '', t.time || '', t.awaiting || '', t.awaitingNote || '', t.notes || '',
      t.completedAt ? String(t.completedAt).slice(0, 10) : '', t.updatedAt ? String(t.updatedAt).replace('T', ' ').slice(0, 16) : ''];
  });
  sh.clearContents();
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#4a4058').setFontColor('#ffffff');
  if (rows.length) sh.getRange(2, 1, rows.length, head.length).setNumberFormat('@').setValues(rows);
  sh.setFrozenRows(1);
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
