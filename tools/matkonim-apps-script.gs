/**
 * מתכונים שמשתפים (חנוכה למשפחה) – Google Apps Script Web App.
 * הדף: /kodesh/chanuka/matkonim/  ·  ה-JS: assets/chanuka-matkonim.js (API = ה-URL של ה-Web App).
 *
 * מה הוא עושה:
 *  doGet  ?ping=1  – בדיקת חיים (המחרוזת VERSION).
 *  doGet  ?list=1  – כל המתכונים הגלויים + הפרגונים שלהם (JSON). בלי שום פרט קשר.
 *  doPost {op:'add'}     – מתכון חדש (עד 3 תמונות JPEG, נשמרות בתיקייה בדרייב עם קישור צפייה).
 *  doPost {op:'comment'} – פרגון למתכון.
 *  doPost {op:'heart'}   – לב למתכון.
 *  doPost {op:'hide'}    – הסתרה (רק עם מפתח הניהול ADMIN_KEY ממאפייני הסקריפט).
 *
 * מדיניות: עולה מיד לאתר, ולגילעד נשלח מייל עם קישור הסתרה. שמירה מספאם: שדה מלכודת (hp),
 * מגבלות אורך, בלי קישורים ובלי מספרי טלפון בטקסט, ומגבלה לפי מכשיר וליום כולו
 * (ל-Apps Script אין כתובת IP של הגולש, לכן המגבלה היא לפי טוקן המכשיר + תקרה יומית כללית).
 *
 * הגיליון והתיקייה נוצרים לבד בהפעלה הראשונה (המזהים נשמרים במאפייני הסקריפט).
 * פריסה: פריסה → פריסה חדשה → אפליקציית אינטרנט → הפעלה בתור: אני, גישה: כל אחד.
 */

var VERSION = 'matkonim-2';
var CFG = {
  OWNER_EMAIL: 'gilad4049@gmail.com',
  PAGE: 'https://hakelim.com/kodesh/chanuka/matkonim/',
  SHEET_NAME: 'מתכונים שמשתפים – חנוכה',
  FOLDER_NAME: 'מתכונים שמשתפים – תמונות',
  MAX_PHOTOS: 3,
  MAX_PHOTO_BYTES: 1600000,
  DAY_RECIPES: 60,      // תקרה כללית ליום
  DAY_COMMENTS: 400,
  DEV_RECIPES: 4,       // לכל מכשיר ביום
  DEV_COMMENTS: 30,
  MAIL_PER_DAY: 40
};
var KINDS = { sufganiyot: 1, levivot: 1, other: 1 };
var KOSHER = { chalavi: 'חלבי', parve: 'פרווה', basari: 'בשרי' };
var DIET = { gf: 'ללא גלוטן', keto: 'קטוגני', vegan: 'טבעוני', veg: 'צמחוני' };
var R_COLS = ['מזהה', 'תאריך', 'שם', 'כותרת', 'סוג', 'מצרכים', 'אופן הכנה', 'מילה אישית', 'תמונות', 'קבצים', 'לבבות', 'מצב', 'מכשיר', 'כשרות', 'תזונה'];  // עמודות חדשות רק בסוף
var C_COLS = ['מזהה', 'מתכון', 'תאריך', 'שם', 'פרגון', 'מצב', 'מכשיר'];
var PROPS = PropertiesService.getScriptProperties();

// ---------- כניסות ----------
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.ping) return json({ ok: true, v: VERSION });
  if (p.list) return json({ ok: true, recipes: listVisible() });
  return json({ ok: false, error: 'לא נמצא' });
}

function doPost(e) {
  var b;
  try { b = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (er) { return json({ ok: false, error: 'בקשה לא תקינה' }); }
  if (b.hp) return json({ ok: true, id: 'x' });                 // בוט מילא את שדה המלכודת
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    if (b.op === 'add') return json(addRecipe(b));
    if (b.op === 'comment') return json(addComment(b));
    if (b.op === 'heart') return json(addHeart(b));
    if (b.op === 'hide') return json(hide(b));
    return json({ ok: false, error: 'פעולה לא מוכרת' });
  } catch (er) {
    return json({ ok: false, error: er && er.userMsg ? er.userMsg : 'משהו השתבש. נסו שוב בעוד רגע.' });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// ---------- פעולות ----------
function addRecipe(b) {
  var r = b.r || {};
  var tok = cleanTok(b.tok);
  var title = clean(r.t, 70), name = clean(r.n, 40), kind = KINDS[r.k] ? r.k : 'other';
  var kosher = KOSHER[r.ks] ? r.ks : '';
  var diet = (r.dt || []).filter(function (d) { return DIET[d]; }).slice(0, 4).join(',');
  var ing = clean(r.ing, 2500, true), steps = clean(r.st, 4000, true), story = clean(r.sto, 600, true);
  if (title.length < 2) fail('כתבו שם למתכון.');
  if (ing.length < 5) fail('כתבו את המצרכים.');
  if (steps.length < 10) fail('כתבו את אופן ההכנה.');
  [title, name, ing, steps, story].forEach(noContact);
  if (!countOk('r-day', CFG.DAY_RECIPES) || !countOk('r-' + tok, CFG.DEV_RECIPES)) fail('הגעתם למספר המתכונים להיום. אפשר להוסיף עוד מחר.');

  var photos = (b.photos || []).slice(0, CFG.MAX_PHOTOS), urls = [], ids = [];
  var id = newId();
  if (photos.length) {
    var folder = getFolder();
    photos.forEach(function (ph, i) {
      var m = /^data:image\/jpeg;base64,([A-Za-z0-9+\/=]+)$/.exec(String(ph || ''));
      if (!m) fail('תמונה לא תקינה.');
      var bytes = Utilities.base64Decode(m[1]);
      if (bytes.length > CFG.MAX_PHOTO_BYTES || bytes.length < 500) fail('התמונה גדולה מדי.');
      if ((bytes[0] & 255) !== 0xFF || (bytes[1] & 255) !== 0xD8) fail('תמונה לא תקינה.');
      var f = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', id + '-' + (i + 1) + '.jpg'));
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      ids.push(f.getId());
      urls.push('https://lh3.googleusercontent.com/d/' + f.getId() + '=w1200');
    });
  }
  var row = [id, new Date(), name, title, kind, ing, steps, story, urls.join(' '), ids.join(' '), 0, 'גלוי', tok, kosher, diet];
  sheetR().appendRow(row.map(safe));
  bustCache();
  notify('מתכון חדש: ' + title, 'מאת: ' + (name || 'אנונימי') + (kosher ? ' · ' + KOSHER[kosher] : '') + (diet ? ' · ' + diet.split(',').map(function (d) { return DIET[d]; }).join(', ') : '') + '\n\n' + title + '\n\nמצרכים:\n' + ing + '\n\nהכנה:\n' + steps +
    (story ? '\n\nמילה אישית:\n' + story : '') + (urls.length ? '\n\nתמונות:\n' + urls.join('\n') : '') +
    '\n\nלצפייה: ' + CFG.PAGE + '#r-' + id + '\nלהסתרה: ' + CFG.PAGE + '?admin=' + adminKey() + '#r-' + id);
  return { ok: true, id: id };
}

function addComment(b) {
  var tok = cleanTok(b.tok), rid = String(b.id || '');
  var name = clean(b.n, 40), text = clean(b.x, 400, true);
  if (text.length < 2) fail('כתבו כמה מילים.');
  [name, text].forEach(noContact);
  if (findRow(sheetR(), rid) < 0) fail('המתכון לא נמצא.');
  if (!countOk('c-day', CFG.DAY_COMMENTS) || !countOk('c-' + tok, CFG.DEV_COMMENTS)) fail('הרבה פרגונים היום ❤ אפשר להוסיף עוד מחר.');
  var cid = newId();
  sheetC().appendRow([cid, rid, new Date(), name, text, 'גלוי', tok].map(safe));
  bustCache();
  return { ok: true, id: cid };
}

function addHeart(b) {
  var tok = cleanTok(b.tok), rid = String(b.id || '');
  var key = 'h-' + rid + '-' + tok;
  var cache = CacheService.getScriptCache();
  if (cache.get(key)) return { ok: true, dup: true };
  if (!countOk('h-' + tok, 200)) return { ok: true, dup: true };
  var sh = sheetR(), r = findRow(sh, rid);
  if (r < 0) fail('המתכון לא נמצא.');
  var cell = sh.getRange(r, R_COLS.indexOf('לבבות') + 1);
  var n = (+cell.getValue() || 0) + 1;
  cell.setValue(n);
  cache.put(key, '1', 21600);
  bustCache();
  return { ok: true, h: n };
}

function hide(b) {
  if (!b.key || String(b.key) !== adminKey()) fail('אין הרשאה.');
  var isC = b.type === 'c', sh = isC ? sheetC() : sheetR(), cols = isC ? C_COLS : R_COLS;
  var r = findRow(sh, String(b.id || ''));
  if (r < 0) fail('לא נמצא.');
  sh.getRange(r, cols.indexOf('מצב') + 1).setValue(b.show ? 'גלוי' : 'מוסתר');
  bustCache();
  return { ok: true };
}

function listVisible() {
  var cache = CacheService.getScriptCache(), hit = cache.get('list');
  if (hit) return JSON.parse(hit);
  var rv = sheetR().getDataRange().getValues().slice(1), cv = sheetC().getDataRange().getValues().slice(1);
  var com = {};
  cv.forEach(function (c) {
    if (c[5] !== 'גלוי') return;
    (com[c[1]] = com[c[1]] || []).push({ id: String(c[0]), d: day(c[2]), n: unsafe(c[3]), x: unsafe(c[4]) });
  });
  var out = rv.filter(function (r) { return r[0] && r[11] === 'גלוי'; }).map(function (r) {
    return { id: String(r[0]), d: day(r[1]), n: unsafe(r[2]), t: unsafe(r[3]), k: r[4], ing: unsafe(r[5]), st: unsafe(r[6]),
      sto: unsafe(r[7]), ph: String(r[8] || '').split(' ').filter(String), h: +r[10] || 0, ks: KOSHER[r[13]] ? r[13] : '', dt: String(r[14] || '').split(',').filter(function (d) { return DIET[d]; }), c: com[r[0]] || [] };
  }).reverse();
  var s = JSON.stringify(out);
  if (s.length < 95000) cache.put('list', s, 120);
  return out;
}

// ---------- עזרים ----------
function sheetR() { return tab('מתכונים', R_COLS); }
function sheetC() { return tab('פרגונים', C_COLS); }
function tab(name, cols) {
  var ss = getSS(), sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(cols); sh.setFrozenRows(1); sh.setRightToLeft(true); }
  return sh;
}
function getSS() {
  var id = PROPS.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  var ss = SpreadsheetApp.create(CFG.SHEET_NAME);
  PROPS.setProperty('SHEET_ID', ss.getId());
  var first = ss.getSheets()[0]; first.setName('מתכונים'); first.appendRow(R_COLS); first.setFrozenRows(1); first.setRightToLeft(true);
  return ss;
}
function getFolder() {
  var id = PROPS.getProperty('FOLDER_ID');
  if (id) return DriveApp.getFolderById(id);
  var f = DriveApp.createFolder(CFG.FOLDER_NAME);
  PROPS.setProperty('FOLDER_ID', f.getId());
  return f;
}
function adminKey() {
  var k = PROPS.getProperty('ADMIN_KEY');
  if (!k) { k = Utilities.getUuid().replace(/-/g, '').slice(0, 16); PROPS.setProperty('ADMIN_KEY', k); }
  return k;
}
function findRow(sh, id) {
  if (!id) return -1;
  var v = sh.getRange(1, 1, sh.getLastRow(), 1).getValues();
  for (var i = v.length - 1; i > 0; i--) if (String(v[i][0]) === id) return i + 1;
  return -1;
}
function countOk(key, max) {
  var k = 'n-' + key + '-' + Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyyMMdd');
  var c = CacheService.getScriptCache(), n = +(c.get(k) || 0);
  if (n >= max) return false;
  c.put(k, String(n + 1), 90000);
  return true;
}
function notify(subj, body) {
  try {
    if (!countOk('mail', CFG.MAIL_PER_DAY)) return;
    MailApp.sendEmail(CFG.OWNER_EMAIL, '[מתכונים שמשתפים] ' + subj, body);
  } catch (e) {}
}
function bustCache() { CacheService.getScriptCache().remove('list'); }
function newId() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function cleanTok(t) { t = String(t || '').replace(/[^a-z0-9]/gi, '').slice(0, 40); return t || 'anon'; }
function clean(s, max, multi) {
  s = String(s == null ? '' : s).replace(/\r/g, '');
  s = multi ? s.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n') : s.replace(/\s+/g, ' ');
  s = s.trim();
  if (s.length > max) fail('הטקסט ארוך מדי (עד ' + max + ' תווים).');
  return s;
}
function noContact(s) {
  if (/https?:|www\.|\.com\b|\.co\.il\b|@[a-z0-9]/i.test(s)) fail('בלי קישורים ובלי כתובות מייל, כדי לשמור על פרטיות.');
  if (/\d[\d\s\-]{7,}\d/.test(s)) fail('בלי מספרי טלפון, כדי לשמור על פרטיות.');
}
// כל טקסט נשמר כטקסט (גרש בהתחלה): בלי נוסחאות, ו-"1/2" לא הופך לתאריך
function safe(v) { return typeof v === 'string' && v ? "'" + v : v; }
function unsafe(v) { return String(v == null ? '' : v); }
function day(d) { try { return Utilities.formatDate(new Date(d), 'Asia/Jerusalem', 'dd.MM.yyyy'); } catch (e) { return ''; } }
function fail(msg) { var e = new Error(msg); e.userMsg = msg; throw e; }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// להרצה ידנית פעם אחת מהעורך (לא חובה): יוצר גיליון ותיקייה, ומדפיס את קישור הניהול.
function setup() {
  getSS(); getFolder();
  Logger.log('גיליון: ' + getSS().getUrl());
  Logger.log('קישור ניהול: ' + CFG.PAGE + '?admin=' + adminKey());
}
