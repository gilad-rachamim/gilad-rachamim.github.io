// "מצב אישי" – הסקריפט שרץ בחשבון הגוגל של גילעד (Apps Script, Web App).
// התוסף הפרטי (tools/ishi-ext) קורא לו עם מפתח סודי. אין כאן שום שרת חיצוני: הכול רץ אצל גוגל, בחשבון שלו.
// TOKEN מוחלף במפתח אמיתי רק בעותק שבעורך של Apps Script – לא בריפו.
// פריסה: Web App, Execute as: Me, Who has access: Anyone (המפתח הוא ההגנה; בלעדיו כל בקשה נדחית).
var TOKEN = '__TOKEN__';
var VERSION = 'ishi-1';

// ניקוי ג'ימייל: רק מהרשימה הזאת (גם מי שמשיג את המפתח לא יכול למחוק חיפוש אחר). הכול לאשפה – 30 יום לשחזור.
var CLEAN = {
  promo1m: 'category:promotions older_than:1m',
  social1m: 'category:social older_than:1m',
  updates3m: 'category:updates older_than:3m',
  forums3m: 'category:forums older_than:3m',
  big1y: 'larger:10M older_than:1y'
};

function doGet(e) { return out(handle((e && e.parameter) || {})); }
function doPost(e) { var p = {}; try { p = JSON.parse(e.postData.contents); } catch (x) {} return out(handle(p)); }
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function handle(p) {
  if (!TOKEN || TOKEN.indexOf('__') === 0 || p.t !== TOKEN) return { ok: false, err: 'auth' };
  var d = {};
  try { d = typeof p.d === 'string' ? JSON.parse(p.d || '{}') : (p.d || {}); } catch (x) {}
  var f = API[p.a];
  if (!f) return { ok: false, err: 'no action' };
  try { return { ok: true, v: VERSION, r: f(d) }; } catch (err) { return { ok: false, v: VERSION, err: String(err && err.message || err) }; }
}

var API = {
  ping: function () { return { me: Session.getEffectiveUser().getEmail(), tz: Session.getScriptTimeZone() }; },

  // ---------- יומן ----------
  cal: function (d) {
    var days = Math.min(+d.days || 7, 31), now = new Date(), end = new Date(now.getTime() + days * 864e5), out = [];
    var from = new Date(now); from.setHours(0, 0, 0, 0);
    CalendarApp.getAllCalendars().forEach(function (c) {
      if (c.isHidden() || !c.isSelected()) return;
      c.getEvents(from, end).forEach(function (ev) {
        out.push({ t: ev.getTitle(), s: ev.getStartTime().getTime(), e: ev.getEndTime().getTime(), ad: ev.isAllDayEvent(), loc: ev.getLocation() || '', cal: c.getName(), col: c.getColor(), mine: c.isOwnedByMe() });
      });
    });
    out.sort(function (a, b) { return a.s - b.s; });
    return out.slice(0, 150);
  },
  calAdd: function (d) {
    if (!d.title || !d.start) throw new Error('חסר שם או תאריך');
    var cal = CalendarApp.getDefaultCalendar(), ev;
    var opt = { description: String(d.desc || '').slice(0, 2000), location: String(d.loc || '').slice(0, 300) };
    if (d.allDay) ev = cal.createAllDayEvent(String(d.title).slice(0, 200), new Date(+d.start), opt);
    else ev = cal.createEvent(String(d.title).slice(0, 200), new Date(+d.start), new Date(+d.end || +d.start + 3600000), opt);
    return { id: ev.getId(), t: ev.getTitle() };
  },

  // ---------- ג'ימייל ----------
  gmail: function () {
    var counts = {};
    Object.keys(CLEAN).forEach(function (k) { counts[k] = GmailApp.search(CLEAN[k], 0, 500).length; });
    return { unread: GmailApp.getInboxUnreadCount(), counts: counts };
  },
  gmailClean: function (d) {
    var q = CLEAN[d.key];
    if (!q) throw new Error('ניקוי לא מוכר');
    var moved = 0, t0 = Date.now();
    for (var i = 0; i < 10 && Date.now() - t0 < 200000; i++) {
      var th = GmailApp.search(q, 0, 100);
      if (!th.length) break;
      GmailApp.moveThreadsToTrash(th); moved += th.length;
    }
    return { moved: moved, left: GmailApp.search(q, 0, 500).length };
  },

  // ---------- דרייב (קריאה בלבד) ----------
  drive: function () {
    var since = new Date(Date.now() - 45 * 864e5).toISOString(), it = DriveApp.searchFiles('trashed = false and modifiedDate > "' + since + '"'), list = [], n = 0;
    while (it.hasNext() && n++ < 400) { var f = it.next(); list.push(fileInfo(f)); }
    list.sort(function (a, b) { return b.d - a.d; });
    return { used: DriveApp.getStorageUsed(), limit: DriveApp.getStorageLimit(), recent: list.slice(0, 15) };
  },
  driveSearch: function (d) {
    var q = String(d.q || '').replace(/["\\]/g, ' ').trim().slice(0, 80);
    if (!q) return [];
    var it = DriveApp.searchFiles('trashed = false and (title contains "' + q + '" or fullText contains "' + q + '")'), list = [], n = 0;
    while (it.hasNext() && n++ < 40) list.push(fileInfo(it.next()));
    return list;
  },
  driveBig: function () {
    var it = DriveApp.searchFiles('trashed = false and "me" in owners'), list = [], n = 0, t0 = Date.now();
    while (it.hasNext() && n++ < 4000 && Date.now() - t0 < 120000) { var f = it.next(), s = f.getSize(); if (s > 1048576) list.push(fileInfo(f, s)); }
    list.sort(function (a, b) { return b.s - a.s; });
    return { scanned: n, files: list.slice(0, 25) };
  },

  // ---------- אנשי קשר (People API) ----------
  contacts: function (d) {
    var q = String(d.q || '').trim();
    if (!q) return [];
    try { People.People.searchContacts({ query: '', readMask: 'names' }); } catch (x) {}   // "חימום" שה-API דורש
    var r = People.People.searchContacts({ query: q, readMask: 'names,phoneNumbers,emailAddresses', pageSize: 25 });
    return (r.results || []).map(function (x) {
      var p = x.person || {};
      return { n: p.names && p.names[0] ? p.names[0].displayName : '', ph: (p.phoneNumbers || []).map(function (y) { return y.value; }), em: (p.emailAddresses || []).map(function (y) { return y.value; }), id: p.resourceName };
    });
  },
  contactAdd: function (d) {
    var name = String(d.name || '').trim();
    if (!name) throw new Error('חסר שם');
    var body = { names: [{ givenName: name.slice(0, 100) }] };
    if (d.phone) body.phoneNumbers = [{ value: String(d.phone).slice(0, 40) }];
    if (d.email) body.emailAddresses = [{ value: String(d.email).slice(0, 120) }];
    var p = People.People.createContact(body);
    return { id: p.resourceName };
  },

  // ---------- משימות (Google Tasks) ----------
  tasks: function () {
    var lists = Tasks.Tasklists.list({ maxResults: 10 }).items || [];
    if (!lists.length) return { list: '', items: [] };
    var l = lists[0], t = Tasks.Tasks.list(l.id, { showCompleted: false, maxResults: 100 }).items || [];
    return { list: l.title, id: l.id, items: t.map(function (x) { return { id: x.id, t: x.title, due: x.due || '', notes: x.notes || '' }; }) };
  },
  taskAdd: function (d) {
    var lists = Tasks.Tasklists.list({ maxResults: 1 }).items || [];
    if (!lists.length || !d.title) throw new Error('אין רשימת משימות');
    var task = { title: String(d.title).slice(0, 300) };
    if (d.due) task.due = new Date(+d.due).toISOString();
    return { id: Tasks.Tasks.insert(task, lists[0].id).id };
  },
  taskDone: function (d) {
    var lists = Tasks.Tasklists.list({ maxResults: 1 }).items || [];
    Tasks.Tasks.patch({ status: 'completed' }, lists[0].id, String(d.id));
    return { done: true };
  }
};

function fileInfo(f, size) {
  return { n: f.getName(), u: f.getUrl(), m: f.getMimeType(), s: size != null ? size : f.getSize(), d: f.getLastUpdated().getTime() };
}

// הרצה ידנית אחת בעורך (▶ authorize) כדי שגוגל יבקש את ההרשאות – לפני הפריסה
function authorize() { API.ping(); API.cal({ days: 1 }); GmailApp.getInboxUnreadCount(); DriveApp.getStorageUsed(); try { API.contacts({ q: 'a' }); } catch (e) {} try { API.tasks(); } catch (e) {} }
