// תוסף "הכלים של גילעד רחמים" (גרסה 3): מחובר לכל הכלים באתר.
// רשימת הכלים מגיעה מ-hakelim.com/kelim/tools.json (נבנית ב-build.py מכל הדפים) ומתעדכנת לבד,
// כך שכלי חדש באתר מופיע בתוסף – בחיפוש, ואם הוא מקבל קבצים גם בלחיצה הימנית – בלי גרסה חדשה בחנות.
// קבצים: התוסף מביא את הקובץ שהמשתמש בחר, שומר אותו רגע ב-storage ופותח את הכלי. bridge.js מכניס
// אותו לכלי. שום דבר לא נשלח לשרת: הכלים עצמם עובדים בתוך הדפדפן.
importScripts('page-tools.js');   // תיקון שפה, צילום עמוד, הקראה, כיוון עברית, מצב כהה, תרגום
var SITE = 'https://hakelim.com';
var LIST_URL = SITE + '/kelim/tools.json';
var MAX_BYTES = 300 * 1024 * 1024;
var NEW_DAYS = 14;

// ---------- רשימת הכלים ----------
function validList(j) {
  return j && Array.isArray(j.tools) && j.tools.length > 20 && j.tools.every(function (t) { return t && typeof t.n === 'string' && /^\/[a-z0-9\-\/]*$/.test(t.u); });
}
function getTools() {
  return chrome.storage.local.get('tools').then(function (o) {
    if (o.tools && validList(o.tools)) return o.tools.tools;
    return fetch(chrome.runtime.getURL('tools.json')).then(function (r) { return r.json(); }).then(function (j) { return j.tools; });
  });
}
// מביאים את הרשימה מהאתר. כלי שלא הכרנו מקבל תאריך "נראה לראשונה", כדי לסמן אותו "חדש" בחלון.
function refresh(firstRun) {
  return fetch(LIST_URL, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
    .then(function (j) {
      if (!validList(j)) throw new Error('bad list');
      return chrome.storage.local.get('seen').then(function (o) {
        var seen = o.seen || {}, now = Date.now(), first = firstRun || !o.seen;
        j.tools.forEach(function (t) { if (!(t.u in seen)) seen[t.u] = first ? 0 : now; });
        return chrome.storage.local.set({ tools: j, seen: seen, toolsAt: now });
      });
    })
    .catch(function () {})
    .then(buildMenus);
}

// ---------- תפריט לחיצה ימנית, לפי סוג הקובץ ----------
var PDF_PAGES = ['*://*/*.pdf', '*://*/*.pdf?*', '*://*/*.PDF', 'file:///*.pdf', 'file:///*.PDF'];
var CTX = {   // הקשר בכרום ← אילו סוגי קבצים
  image: { types: ['image'] },
  video: { types: ['video'] },
  link: { types: ['pdf'] },
  page: { types: ['pdf'], patterns: PDF_PAGES },
  selection: { types: ['text'] }
};
var menuBusy = Promise.resolve();
function buildMenus() {
  menuBusy = menuBusy.then(function () {
    return getTools().then(function (tools) {
      return new Promise(function (done) {
        chrome.contextMenus.removeAll(function () {
          var C = chrome.contextMenus.create;
          C({ id: 'hk', title: 'הכלים של גילעד רחמים', contexts: ['image', 'video', 'link', 'page', 'editable', 'selection'] });
          C({ parentId: 'hk', id: 'fix', title: 'לתקן: כתבתי בשפה הלא נכונה (Alt+Shift+H)', contexts: ['selection', 'editable'] });
          C({ parentId: 'hk', id: 'tr-sel', title: '🌐 לתרגם את המסומן', contexts: ['selection'] });
          C({ parentId: 'hk', id: 'translate', title: '🌐 לתרגם את הדף (Alt+Shift+T)', contexts: ['page'] });
          C({ parentId: 'hk', id: 'speak', title: '🔊 להקריא בקול', contexts: ['selection'] });
          C({ parentId: 'hk', id: 'speak-stop', title: '⏹ לעצור את ההקראה', contexts: ['all'], visible: false });
          C({ parentId: 'hk', id: 'shot', title: '📸 צילום של כל העמוד', contexts: ['page'] });
          C({ parentId: 'hk', id: 'rtl', title: '↔ לסדר עברית בדף (ימין לשמאל)', contexts: ['page', 'editable'] });
          C({ parentId: 'hk', id: 'dark', title: '🌙 מצב כהה לדף', contexts: ['page'] });
          C({ parentId: 'hk', id: 'sep1', type: 'separator', contexts: ['all'] });
          Object.keys(CTX).forEach(function (ctx) {
            var spec = CTX[ctx];
            tools.filter(function (t) { return t.x && t.x.accept.some(function (a) { return spec.types.indexOf(a) >= 0; }); })
              .forEach(function (t) {
                var o = { parentId: 'hk', id: 'f|' + ctx + '|' + t.u, title: t.x.menu, contexts: [ctx] };
                if (spec.patterns) o.documentUrlPatterns = spec.patterns;
                C(o);
              });
          });
          C({ parentId: 'hk', id: 'pw', title: 'להכניס סיסמה חזקה', contexts: ['editable'] });
          C({ parentId: 'hk', id: 'all', title: 'כל הכלים באתר…', contexts: ['page', 'link', 'image', 'video'] });
          void chrome.runtime.lastError;
          done();
        });
      });
    });
  }).catch(function () {});
  return menuBusy;
}

chrome.runtime.onInstalled.addListener(function (d) {
  chrome.alarms.create('refresh', { periodInMinutes: 12 * 60 });
  buildMenus().then(function () { return refresh(d.reason === 'install'); });
});
chrome.runtime.onStartup.addListener(function () { refresh(false); });
chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'refresh') refresh(false); });

// ---------- קבצים ----------
function b64(buf) {
  var bytes = new Uint8Array(buf), out = '', step = 0x8000;
  for (var i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  return btoa(out);
}
function sniff(buf) {
  var h = new Uint8Array(buf.slice(0, 16)), s = String.fromCharCode.apply(null, h);
  if (s.slice(0, 5) === '%PDF-') return 'application/pdf';
  if (h[0] === 0xFF && h[1] === 0xD8) return 'image/jpeg';
  if (s.slice(1, 4) === 'PNG') return 'image/png';
  if (s.slice(0, 4) === 'RIFF' && s.slice(8, 12) === 'WEBP') return 'image/webp';
  if (s.slice(0, 3) === 'GIF') return 'image/gif';
  if (s.slice(0, 2) === 'BM') return 'image/bmp';
  if (h[0] === 0x1A && h[1] === 0x45 && h[2] === 0xDF && h[3] === 0xA3) return 'video/webm';
  if (s.slice(4, 8) === 'ftyp') {
    var brand = s.slice(8, 12);
    if (/^(heic|heix|mif1|msf1|hevc)/.test(brand)) return 'image/heic';
    return brand === 'qt  ' ? 'video/quicktime' : 'video/mp4';
  }
  return '';
}
function kind(type) { return type === 'application/pdf' ? 'pdf' : type.split('/')[0]; }
var EXT = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/bmp': '.bmp', 'image/heic': '.heic', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
var WORD = { pdf: 'מסמך', image: 'תמונה', video: 'סרטון' };
function nameFrom(url, type) {
  try {
    if (/^https?:|^file:/.test(url)) {
      var p = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
      if (p && /\.[a-z0-9]{2,5}$/i.test(p) && p.length < 120) return p;
    }
  } catch (e) {}
  return (WORD[kind(type)] || 'קובץ') + (EXT[type] || '');
}
function toolUrl(t, withFile) { return SITE + t.u + (withFile ? '?ext=1' : '?utm_source=tosaf'); }

// שומרים את הקובץ ופותחים את הכלי. כלי החתימה מקבל בפורמט הישן (pending), השאר: pendingFiles.
function openTool(t, file, text) {
  var save = Promise.resolve();
  if (text) {
    save = chrome.storage.local.set({ pendingFiles: { id: Date.now() + '', u: t.u, input: t.x.input, at: Date.now(), text: String(text).slice(0, 20000) } });
    return save.then(function () { return chrome.tabs.create({ url: toolUrl(t, true) }); });
  }
  if (file) {
    var id = Date.now() + '-' + Math.random().toString(36).slice(2);
    save = t.u === '/kelim/machshev/chatima/'
      ? chrome.storage.local.set({ pending: { id: id, name: file.name, b64: file.b64, at: Date.now() } })
      : chrome.storage.local.set({ pendingFiles: { id: id, u: t.u, input: t.x.input, at: Date.now(), files: [file] } });
  }
  return save.then(function () { return chrome.tabs.create({ url: toolUrl(t, !!file) }); });
}
function fetchFile(url, t, name) {
  return fetch(url, { credentials: 'include' }).then(function (r) {
    if (!r.ok) throw new Error('http ' + r.status);
    var len = +r.headers.get('content-length') || 0;
    if (len > MAX_BYTES) throw new Error('too big');
    return r.arrayBuffer();
  }).then(function (buf) {
    if (buf.byteLength > MAX_BYTES) throw new Error('too big');
    var type = sniff(buf);
    if (!type || t.x.accept.indexOf(kind(type)) < 0) throw new Error('wrong type ' + type);
    return { name: name || nameFrom(url, type), type: type, b64: b64(buf) };
  });
}
function openUrl(t, url, name) {
  return fetchFile(url, t, name).then(function (f) { return openTool(t, f); }).then(function () { return true; })
    .catch(function () { return openTool(t, null).then(function () { return false; }); });
}
function findTool(u) {
  return getTools().then(function (tools) {
    for (var i = 0; i < tools.length; i++) if (tools[i].u === u && tools[i].x) return tools[i];
    return null;
  });
}

// ---------- סיסמה חזקה (נוצרת כאן, במחשב) ----------
function makePassword(n) {
  var sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*-_=+?'];
  var all = sets.join(''), out = [], r = new Uint32Array(n + n);
  crypto.getRandomValues(r);
  for (var i = 0; i < sets.length; i++) out.push(sets[i][r[i] % sets[i].length]);
  for (var j = sets.length; j < n; j++) out.push(all[r[j] % all.length]);
  for (var k = out.length - 1; k > 0; k--) { var m = r[n + k] % (k + 1), tmp = out[k]; out[k] = out[m]; out[m] = tmp; }
  return out.join('');
}
// רץ בתוך הדף, רק אחרי לחיצה של המשתמש (activeTab)
function putPassword(pw) {
  function toast(msg, good) {
    var d = document.createElement('div');
    d.setAttribute('dir', 'rtl'); d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;z-index:2147483647;bottom:18px;left:50%;transform:translateX(-50%);max-width:92vw;background:#141210;color:#f3ead7;border:2px solid ' + (good ? '#d9b25f' : '#c0504d') + ';border-radius:12px;padding:12px 16px;font:15px/1.5 Arial,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.35)';
    d.textContent = msg;
    document.documentElement.appendChild(d);
    setTimeout(function () { d.remove(); }, 6500);
  }
  function setVal(el, v) {
    var setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    el.focus(); setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  var el = document.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
  if (!el || !(el instanceof HTMLInputElement) || !/^(password|text)$/i.test(el.type || 'text')) {
    toast('כדי להכניס סיסמה: לחיצה ימנית בתוך שדה הסיסמה עצמו.', false);
    return false;
  }
  setVal(el, pw);
  // שדה "אימות סיסמה" ריק שבא אחרי השדה הזה באותו טופס – ממלאים גם אותו
  if (el.type === 'password') {
    var scope = el.form || document, list = [].slice.call(scope.querySelectorAll('input[type=password]')), next = list[list.indexOf(el) + 1];
    if (next && !next.value) setVal(next, pw);
    el.focus();
  }
  var copied = false;
  try { var ta = document.createElement('textarea'); ta.value = pw; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); copied = document.execCommand('copy'); ta.remove(); el.focus(); } catch (e) {}
  toast('נכנסה סיסמה חזקה' + (copied ? ', והיא גם הועתקה' : '') + '. כרום יציע לשמור אותה, או שמרו אותה במקום בטוח.', true);
  return true;
}

// ---------- לחיצה על פריט בתפריט ----------
chrome.contextMenus.onClicked.addListener(function (info, tab) {
  var id = String(info.menuItemId);
  if (id === 'pw') {
    if (!tab || tab.id == null) return;
    var target = { tabId: tab.id };
    if (info.frameId) target.frameIds = [info.frameId];
    chrome.scripting.executeScript({ target: target, func: putPassword, args: [makePassword(16)] }).catch(function () {});
    return;
  }
  if (id === 'all') { chrome.tabs.create({ url: SITE + '/kelim/?utm_source=tosaf' }); return; }
  if (PAGE_ACTS[id]) { if (tab && tab.id != null) PAGE_ACTS[id](tab, info); return; }
  var parts = id.split('|');
  if (parts[0] !== 'f') return;
  var ctx = parts[1];
  if (ctx === 'selection') { findTool(parts.slice(2).join('|')).then(function (t) { if (t) openTool(t, null, info.selectionText); }); return; }
  var url = ctx === 'link' ? info.linkUrl : ctx === 'page' ? info.pageUrl : info.srcUrl;
  if (!url) return;
  var origin = null;
  try { if (/^https?:/.test(url)) origin = new URL(url).origin + '/*'; } catch (e) { return; }
  // אתר שאין לתוסף גישה אליו: מבקשים רשות פעם אחת, לאתר הזה בלבד (חייב לקרות מיד, בתוך הלחיצה)
  var ask = origin ? new Promise(function (res) { chrome.permissions.request({ origins: [origin] }, function () { void chrome.runtime.lastError; res(); }); }) : Promise.resolve();
  Promise.all([ask, findTool(parts.slice(2).join('|'))]).then(function (r) { if (r[1]) openUrl(r[1], url); });
});

// הודעות מג׳ימייל ומהחלון הקטן
chrome.runtime.onMessage.addListener(function (m, sender, reply) {
  if (!m) return;
  if (m.refresh) { refresh(false).then(function () { reply({ ok: true }); }); return true; }
  if (m.act && PAGE_ACTS[m.act]) {
    chrome.tabs.get(m.tabId).then(function (tab) { return PAGE_ACTS[m.act](tab, {}); })
      .then(function (r) { reply(r || { ok: true }); }, function (e) { reply({ ok: false, err: String(e && e.message || e) }); });
    return true;
  }
  var u = m.tool || '/kelim/machshev/chatima/';
  if (u.charAt(0) !== '/') u = '/kelim/machshev/' + u + '/';   // תאימות לגרסה 2 (chatima/pdf/fax)
  findTool(u).then(function (t) {
    if (!t) { reply({ ok: false }); return; }
    if (m.data) openTool(t, { name: m.name || 'מסמך.pdf', type: m.type || 'application/pdf', b64: m.data }).then(function () { reply({ ok: true }); });
    else if (m.text) openTool(t, null, m.text).then(function () { reply({ ok: true }); });
    else if (m.open) openUrl(t, m.open, m.name).then(function (ok) { reply({ ok: ok }); });
    else reply({ ok: false });
  });
  return true;
});

// קיצור מקשים: Alt+Shift+H מתקן טקסט שנכתב בשפה הלא נכונה
// Alt+Shift+T מתרגם את הדף (ולחיצה נוספת מחזירה אותו כמו שהיה)
chrome.commands.onCommand.addListener(function (cmd, tab) {
  if (!tab) return;
  if (cmd === 'fix-layout') PAGE_ACTS.fix(tab, {});
  if (cmd === 'translate-page') PAGE_ACTS.translate(tab).catch(function () {});
});
