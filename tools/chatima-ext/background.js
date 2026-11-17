// תוסף "הכלים של גילעד רחמים" (גרסה 3): מחובר לכל הכלים באתר.
// רשימת הכלים מגיעה מ-hakelim.com/kelim/tools.json (נבנית ב-build.py מכל הדפים) ומתעדכנת לבד,
// כך שכלי חדש באתר מופיע בתוסף – בחיפוש, ואם הוא מקבל קבצים גם בלחיצה הימנית – בלי גרסה חדשה בחנות.
// קבצים: התוסף מביא את הקובץ שהמשתמש בחר, שומר אותו רגע ב-storage ופותח את הכלי. bridge.js מכניס
// אותו לכלי. שום דבר לא נשלח לשרת: הכלים עצמם עובדים בתוך הדפדפן.
importScripts('page-tools.js', 'when.js', 'gesher/crypto.js', 'gesher/store.js', 'gesher/link.js');   // תיקון שפה, צילום עמוד, הקראה, כיוון עברית, מצב כהה, תרגום
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
    return Promise.all([getTools(), getSnips()]).then(function (r) {
      var tools = r[0], snips = r[1];
      return new Promise(function (done) {
        chrome.contextMenus.removeAll(function () {
          var C = chrome.contextMenus.create;
          C({ id: 'hk', title: 'הכלים של גילעד רחמים', contexts: ['image', 'video', 'link', 'page', 'editable', 'selection'] });
          C({ parentId: 'hk', id: 'fix', title: 'לתקן: כתבתי בשפה הלא נכונה (Alt+Shift+H)', contexts: ['selection', 'editable'] });
          C({ parentId: 'hk', id: 'tr-sel', title: '🌐 לתרגם את המסומן', contexts: ['selection'] });
          C({ parentId: 'hk', id: 'translate', title: '🌐 לתרגם את הדף (Alt+Shift+T)', contexts: ['page'] });
          C({ parentId: 'hk', id: 'cal', title: '📅 להוסיף ליומן', contexts: ['selection'] });
          C({ parentId: 'hk', id: 'side', title: '◧ כלים בצד, ליד הדף (Alt+Shift+S)', contexts: ['page'] });
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
          C({ parentId: 'hk', id: 'lens', title: '🔎 לחפש את התמונה בגוגל (מאיפה היא?)', contexts: ['image'] });
          C({ parentId: 'hk', id: 'pw', title: 'להכניס סיסמה חזקה', contexts: ['editable'] });
          if (snips.length) {
            C({ parentId: 'hk', id: 'sn', title: '📋 טקסט מוכן', contexts: ['editable'] });
            snips.slice(0, 15).forEach(function (t, i) { C({ parentId: 'sn', id: 'sn|' + i, title: (t.length > 45 ? t.slice(0, 44) + '…' : t).replace(/\n/g, ' ⏎ ').replace(/&/g, '&&'), contexts: ['editable'] }); });
            C({ parentId: 'sn', id: 'sn-edit', title: '✎ לערוך את הטקסטים…', contexts: ['editable'] });
          }
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
chrome.runtime.onStartup.addListener(function () { refresh(false); syncAutoTr(); });
chrome.runtime.onInstalled.addListener(function () { syncAutoTr(); });

// ---------- התקנה, עזיבה ושימוש (בשביל דף הברוכים הבאים ובקשת הדירוג; נשמר רק במחשב) ----------
var STORE_URL = 'https://chromewebstore.google.com/detail/ckjmijllmaoooihonpedfajaofhbegfg';
chrome.runtime.onInstalled.addListener(function (d) {
  chrome.storage.local.get('installedAt').then(function (o) { if (!o.installedAt) chrome.storage.local.set({ installedAt: Date.now() }); });
  if (d.reason === 'install') chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
});
try { chrome.runtime.setUninstallURL('https://hakelim.com/kelim/machshev/chatima/tosaf/lehitraot/?v=' + chrome.runtime.getManifest().version); } catch (e) {}
function bumpUse() { chrome.storage.local.get('uses').then(function (o) { chrome.storage.local.set({ uses: (+o.uses || 0) + 1 }); }).catch(function () {}); }
chrome.contextMenus.onClicked.addListener(bumpUse);
chrome.commands.onCommand.addListener(bumpUse);
chrome.permissions.onRemoved.addListener(function () { syncAutoTr(); });
chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'refresh') refresh(false); });

// ---------- ניסוח מייל וווטסאפ: נוסחים מהכלי באתר (/kelim/tochen/mail/), עם עותק בתוך התוסף ----------
var MAIL_URL = SITE + '/assets/tochen-mail.json';
function validMail(j) { return j && Array.isArray(j.types) && j.types.length > 5 && Array.isArray(j.cats) && j.types.every(function (t) { return t && t.he && t.en && Array.isArray(t.he.s); }); }
function getMailTpl() {
  return chrome.storage.local.get('mailTpl').then(function (o) {
    if (o.mailTpl && validMail(o.mailTpl)) return o.mailTpl;
    return fetch(chrome.runtime.getURL('mail-nusach.json')).then(function (r) { return r.json(); });
  });
}
function refreshMail() {
  return fetch(MAIL_URL, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(function (j) { if (validMail(j)) return chrome.storage.local.set({ mailTpl: j }); }).catch(function () {});
}
chrome.runtime.onInstalled.addListener(function () { refreshMail(); });
chrome.runtime.onStartup.addListener(function () { refreshMail(); });
chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'refresh') refreshMail(); });
chrome.runtime.onMessage.addListener(function (m, sender, reply) {
  if (!m || !m.mailTpl) return;
  getMailTpl().then(function (j) { reply({ ok: true, data: j }); }, function () { reply({ ok: false }); });
  return true;
});

// ---------- טקסטים מוכנים (נשמרים ב-notes.html, משותפים לווטסאפ ולתפריט) ----------
var SNIPS_DEF = ['תודה רבה! 🙏', 'קיבלתי, אחזור אליך בהקדם.', 'אפשר לתאם שיחה? מתי נוח לך?', 'מצורף הקובץ. אשמח לאישור שהתקבל.', 'אני בדרך, אגיע בעוד כמה דקות', 'שבת שלום ומבורך! 🕯🕯', 'מזל טוב! 🎉 שתזכו לרוב נחת'];
function getSnips() {
  return chrome.storage.sync.get('snips').catch(function () { return {}; }).then(function (o) {
    if (Array.isArray(o.snips)) return o.snips;
    return chrome.storage.local.get('snips').then(function (l) { return Array.isArray(l.snips) ? l.snips : SNIPS_DEF; });
  });
}
// רץ בתוך הדף, רק אחרי הלחיצה: מכניס את הטקסט לשדה שלחצו בו (גם בעורכים כמו ג׳ימייל וווטסאפ)
function insertSnip(text) {
  var el = document.activeElement;
  while (el && el.shadowRoot && el.shadowRoot.activeElement) el = el.shadowRoot.activeElement;
  if (el && (el.isContentEditable || el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement)) {
    el.focus();
    if (document.execCommand('insertText', false, text)) return true;
    if ('value' in el) { var s = el.selectionStart || 0, e = el.selectionEnd || 0; el.value = el.value.slice(0, s) + text + el.value.slice(e); el.dispatchEvent(new Event('input', { bubbles: true })); return true; }
  }
  return false;
}
chrome.storage.onChanged.addListener(function (ch) { if (ch.snips) buildMenus(); });

// ---------- פתיחת שירותים במקש (המשתמש קובע מקשים ב-chrome://extensions/shortcuts) ----------
// אם השירות כבר פתוח בכרטיסייה – עוברים אליה (רק כשיש רשות "tabs"), אחרת פותחים חדשה.
var SERVICES = {
  'open-whatsapp': ['https://web.whatsapp.com/', 'https://web.whatsapp.com/*'],
  'open-gmail': ['https://mail.google.com/mail/u/0/', 'https://mail.google.com/*'],
  'open-calendar': ['https://calendar.google.com/', 'https://calendar.google.com/*'],
  'open-drive': ['https://drive.google.com/', 'https://drive.google.com/*'],
  'open-photos': ['https://photos.google.com/', 'https://photos.google.com/*'],
  'open-home': ['home.html', '']
};
function openService(s) {
  if (!s[1]) return chrome.tabs.create({ url: chrome.runtime.getURL(s[0]) });
  return chrome.permissions.contains({ permissions: ['tabs'] }).then(function (ok) {
    return ok ? chrome.tabs.query({ url: s[1] }) : [];
  }).then(function (found) {
    if (found && found[0]) return chrome.tabs.update(found[0].id, { active: true }).then(function () { return chrome.windows.update(found[0].windowId, { focused: true }); });
    return chrome.tabs.create({ url: s[0] });
  }).catch(function () { return chrome.tabs.create({ url: s[0] }); });
}

// ---------- חלון צד: כלים מהאתר ליד הדף ----------
// חייב לקרות מיד בתוך הלחיצה, לכן קודם פותחים ואחר כך שומרים לאיזה דף (הצד מתעדכן לבד).
function openSide(tab, tool) {
  try { chrome.sidePanel.open({ windowId: tab.windowId }).catch(function () {}); } catch (e) {}
  return chrome.storage.session.set({ spCtx: { url: tab.url || '', title: tab.title || '', tool: tool || '', at: Date.now() } });
}

// ---------- ניהול כרטיסיות (tabs.html) ----------
// Alt+Shift+K או הכפתור בחלון הקטן: פותח חלון קטן עם כל הכרטיסיות. אם כבר פתוח – מביאים אותו קדימה.
function openTabsManager() {
  var url = chrome.runtime.getURL('tabs.html');
  // runtime.getContexts מוצא את הדף של התוסף בלי צורך ברשות "tabs"
  var find = chrome.runtime.getContexts ? chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] }) : Promise.resolve([]);
  return find.catch(function () { return []; }).then(function (found) {
    if (found && found[0] && found[0].tabId > -1) return chrome.windows.update(found[0].windowId, { focused: true }).then(function () { return chrome.tabs.update(found[0].tabId, { active: true }); });
    return chrome.windows.getLastFocused().catch(function () { return null; }).then(function (w) {
      var o = { url: url, type: 'popup', width: 520, height: 760, focused: true };
      if (w && w.left != null && w.width) { o.left = Math.max(0, w.left + w.width - 540); o.top = Math.max(0, (w.top || 0) + 70); }
      return chrome.windows.create(o);
    });
  });
}
// השהיה אוטומטית: כל 5 דקות, אם המשתמש הדליק את זה, משהים כרטיסיות שלא נגעו בהן מזמן.
// לא נוגעים בכרטיסייה פתוחה, נעוצה, משמיעה קול, או כזו שכרום סימן שאסור להשהות.
function autoNap() {
  return chrome.storage.local.get('autoNap').then(function (o) {
    var min = +o.autoNap || 0; if (!min) return;
    var limit = Date.now() - min * 60000;
    return chrome.tabs.query({ discarded: false, active: false, pinned: false, audible: false }).then(function (tabs) {
      tabs.forEach(function (t) {
        if (t.autoDiscardable === false || !t.lastAccessed || t.lastAccessed > limit) return;
        if (t.url && /^chrome-extension:/.test(t.url)) return;
        chrome.tabs.discard(t.id).catch(function () {});
      });
    });
  }).catch(function () {});
}
chrome.alarms.get('nap', function (a) { if (!a) chrome.alarms.create('nap', { periodInMinutes: 5 }); });
chrome.alarms.onAlarm.addListener(function (a) { if (a.name === 'nap') autoNap(); });

// ---------- ג׳ימייל: הסרה מרשימת דיוור ----------
// רץ רק אחרי לחיצה בחלון הקטן, רק בכרטיסיית ג׳ימייל, ורק בתוך המחשב: מחפש במייל הפתוח
// את כפתור "ביטול הרשמה" של ג׳ימייל עצמו (ולוחץ עליו – ג׳ימייל שואל לפני שהוא שולח),
// ואם אין – קישור שכתוב עליו "הסרה" / unsubscribe בגוף המייל. שום דבר לא נשמר ולא נשלח.
function findUnsub() {
  var RX = /unsubscribe|opt[\s-]?out|(^|[\s(\[|])(ל)?הס(ר|רה|רת|ירו|יר)(?=$|[\s.!:)\]|])|ביטול\s*(ה)?(הרשמה|מינוי|מנוי)|הפסקת\s*(קבלת|דיוור)|לא\s*לקבל|manage\s*(email\s*)?(preferences|subscription)/i;
  function vis(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
  // 1. הכפתור של ג׳ימייל ליד שם השולח
  var own = [].filter.call(document.querySelectorAll('span[role=link], span[role=button], button, a'), function (el) {
    if (el.closest('.a3s') || !vis(el)) return false;
    var t = (el.textContent || '').trim();
    return t.length < 30 && /^(unsubscribe|ביטול (ה)?הרשמה|הסרת (ה)?הרשמה|ביטול המינוי)$/i.test(t);
  });
  if (own.length) { own[own.length - 1].click(); return { gmail: true }; }
  // 2. קישור בגוף המייל הפתוח (האחרון שמוצג)
  var bodies = [].filter.call(document.querySelectorAll('.a3s'), vis);
  for (var i = bodies.length - 1; i >= 0; i--) {
    var links = bodies[i].querySelectorAll('a[href]');
    var best = null;
    for (var j = 0; j < links.length; j++) {
      var a = links[j], href = a.href || '', txt = (a.textContent || '') + ' ' + (a.getAttribute('aria-label') || '');
      if (!/^https?:/i.test(href)) continue;
      // ג׳ימייל עוטף קישורים ב-google.com/url?q=...
      try { var u = new URL(href); if (/(^|\.)google\.com$/.test(u.hostname) && u.pathname === '/url' && u.searchParams.get('q')) href = u.searchParams.get('q'); } catch (e) {}
      if (!/^https?:/i.test(href)) continue;
      if (RX.test(txt)) { best = href; break; }
      if (!best && /unsubscribe|optout|opt-out/i.test(href)) best = href;
    }
    if (best) { var host = ''; try { host = new URL(best).hostname; } catch (e) {} return { href: best, host: host }; }
    if (bodies.length) break;   // רק המייל האחרון שפתוח
  }
  return { none: true, open: bodies.length > 0 };
}
function gmailUnsub(tabId) {
  return chrome.tabs.get(tabId).then(function (tab) {
    if (!/^https:\/\/mail\.google\.com\//.test(tab.url || '')) return { ok: false, err: 'not gmail' };
    return chrome.scripting.executeScript({ target: { tabId: tabId }, func: findUnsub }).then(function (r) {
      var v = r && r[0] && r[0].result || {};
      v.ok = true; return v;
    });
  });
}

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
  if (id === 'cal') {
    // הטקסט המסומן ← אירוע ביומן גוגל עם התאריך והשעה שזוהו בו, והקישור לדף בפרטים
    var sel = String(info.selectionText || '').slice(0, 300), w = HKWhen.parse(sel);
    if (w.title.length > 80) w.title = w.title.slice(0, 80) + '…';
    chrome.tabs.create({ url: HKWhen.calendarUrl(w, sel + (info.pageUrl ? '\n\n' + info.pageUrl : '')), index: tab ? tab.index + 1 : undefined });
    return;
  }
  if (id === 'side') { if (tab) openSide(tab); return; }
  if (id === 'lens') {
    var src = info.srcUrl || '';
    if (/^https?:/.test(src)) chrome.tabs.create({ url: 'https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(src), index: tab ? tab.index + 1 : undefined });
    else chrome.tabs.create({ url: 'https://lens.google.com/', index: tab ? tab.index + 1 : undefined });
    return;
  }
  if (id === 'sn-edit') { if (tab) { try { chrome.sidePanel.open({ windowId: tab.windowId }).catch(function () {}); } catch (e) {} chrome.storage.session.set({ spCtx: { url: tab.url || '', title: tab.title || '', view: 'notes', at: Date.now() } }); } return; }
  if (id.indexOf('sn|') === 0) {
    if (!tab || tab.id == null) return;
    getSnips().then(function (list) {
      var text = list[+id.slice(3)]; if (!text) return;
      var target = { tabId: tab.id }; if (info.frameId) target.frameIds = [info.frameId];
      chrome.scripting.executeScript({ target: target, func: insertSnip, args: [text] }).catch(function () {});
    });
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
  if (!m || m.mailTpl) return;   // mailTpl: מטופל במאזין של ניסוח המייל
  if (m.waAlarm || 'waAlways' in m) return;   // סידור צ'אטים בוואטסאפ: מטופל במאזין שבסוף הקובץ
  if (m.act || m.tabsManager || m.gmailUnsub) bumpUse();
  if (m.tabsManager) { openTabsManager().then(function () { reply({ ok: true }); }, function () { reply({ ok: false }); }); return true; }
  if (m.gmailUnsub) { gmailUnsub(m.gmailUnsub).then(reply, function () { reply({ ok: false }); }); return true; }
  if (m.refresh) { refresh(false).then(function () { reply({ ok: true }); }); return true; }
  // תרגום: PDF מתוך הכרטיסייה שלו, ו"לתרגם תמיד את האתר הזה"
  if (m.pdfFromTab) { pdfFromTab(m.pdfFromTab).then(reply, function (e) { reply({ err: String(e && e.message || e) }); }); return true; }
  if (m.trAsk) { askAutoTr(m.trAsk).then(function () { reply({ ok: true }); }, function () { reply({ ok: false }); }); return true; }
  if (m.trAlways) {
    // הוספה רק אחרי שהרשות כבר ניתנה (מתוך always.html); הסרה – מכל מקום
    (m.on ? chrome.permissions.contains({ origins: [m.trAlways + '/*'] }) : Promise.resolve(true)).then(function (ok) {
      return ok ? setAutoTr(m.trAlways, !!m.on) : false;
    }).then(function (ok) { reply({ ok: ok }); }, function () { reply({ ok: false }); });
    return true;
  }
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
  if (cmd === 'tabs-manager') { openTabsManager(); return; }
  if (SERVICES[cmd]) { openService(SERVICES[cmd]); return; }
  if (cmd === 'side-panel') { if (tab) openSide(tab); return; }
  if (cmd === 'notes') { if (tab) { try { chrome.sidePanel.open({ windowId: tab.windowId }).catch(function () {}); } catch (e) {} chrome.storage.session.set({ spCtx: { url: tab.url || '', title: tab.title || '', view: 'notes', at: Date.now() } }); } return; }
  if (!tab) return;
  if (cmd === 'fix-layout') PAGE_ACTS.fix(tab, {});
  if (cmd === 'translate-page') PAGE_ACTS.translate(tab).catch(function () {});
});

// ---------- סידור צ'אטים בוואטסאפ ווב (wa.js): תזכורות, תזמון והפעלה קבועה ----------
// התזכורות נשמרות רק במחשב (waRem). בזמן שנקבע: סימן ⏰ על כפתור התוסף, ופס בתוך וואטסאפ ווב.
// שום הודעה לא נשלחת מכאן – גם "תזמון" רק מכין את הטקסט בתיבה, והמשתמש לוחץ שלח.
var WA_ORIGIN = 'https://web.whatsapp.com/*';
function waBadge() {
  return chrome.storage.local.get('waRem').then(function (o) {
    var due = (o.waRem || []).filter(function (r) { return r.at <= Date.now(); }).length;
    chrome.action.setBadgeBackgroundColor({ color: '#e53935' });
    return chrome.action.setBadgeText({ text: due ? '⏰' + (due > 1 ? due : '') : '' });
  }).catch(function () {});
}
function waSyncAlarms() {
  return chrome.storage.local.get('waRem').then(function (o) {
    (o.waRem || []).forEach(function (r) { if (r.at > Date.now()) chrome.alarms.create('wa:' + r.id, { when: r.at }); });
    return waBadge();
  }).catch(function () {});
}
function waSyncScript() {
  return Promise.all([chrome.storage.local.get('waAlways'), chrome.permissions.contains({ origins: [WA_ORIGIN] })]).then(function (r) {
    var on = !!r[0].waAlways && r[1];
    return chrome.scripting.getRegisteredContentScripts({ ids: ['hk-wa'] }).then(function (have) {
      if (!on) return have.length ? chrome.scripting.unregisterContentScripts({ ids: ['hk-wa'] }) : null;
      var spec = { id: 'hk-wa', matches: [WA_ORIGIN], js: ['dibur.js', 'wa.js'], css: ['wa.css'], runAt: 'document_idle', persistAcrossSessions: true };
      return have.length ? chrome.scripting.updateContentScripts([spec]) : chrome.scripting.registerContentScripts([spec]);
    });
  }).catch(function () {});
}
chrome.runtime.onStartup.addListener(function () { waSyncAlarms(); waSyncScript(); });
chrome.runtime.onInstalled.addListener(function () { waSyncAlarms(); waSyncScript(); });
chrome.permissions.onRemoved.addListener(function () { waSyncScript(); });
chrome.alarms.onAlarm.addListener(function (a) { if (a.name.indexOf('wa:') === 0) waBadge(); });
chrome.storage.onChanged.addListener(function (ch, area) { if (area === 'local' && ch.waRem) waBadge(); });
chrome.runtime.onMessage.addListener(function (m, sender, reply) {
  if (!m || !(m.waAlarm || 'waAlways' in m)) return;
  if (m.waAlarm) {
    var id = 'wa:' + String(m.waAlarm.id).replace(/[^a-z0-9]/gi, '');
    if (m.waAlarm.cancel) chrome.alarms.clear(id); else if (m.waAlarm.at > Date.now()) chrome.alarms.create(id, { when: m.waAlarm.at });
    waBadge(); reply({ ok: true }); return;
  }
  chrome.storage.local.set({ waAlways: !!m.waAlways }).then(waSyncScript).then(function () { reply({ ok: true }); }, function () { reply({ ok: false }); });
  return true;
});

// ---------- "🧹 מה לעשות?" – ביצוע בג׳ימייל ותזכורות במחשב ----------
// ג׳ימייל: פותחים/מוצאים את הכרטיסייה של ג׳ימייל, מריצים את החיפוש, ו-gmail-do.js מראה על הדף כמה נמצאו.
// שום דבר לא קורה עד שהמשתמש לוחץ "✓ לבצע" שם.
function hkGmailTab(base) {
  return chrome.tabs.query({ active: true, currentWindow: true }).then(function (act) {
    var t = act && act[0];
    if (t && /^https:\/\/mail\.google\.com\/mail\//.test(t.url || '')) return t;
    return chrome.tabs.query({ url: 'https://mail.google.com/mail/*' }).then(function (L) {
      if (L && L.length) return chrome.tabs.update(L[0].id, { active: true }).then(function (x) { return chrome.windows.update(x.windowId, { focused: true }).then(function () { return x; }, function () { return x; }); });
      return chrome.tabs.create({ url: base || 'https://mail.google.com/mail/u/0/#inbox' }).then(function (x) {
        return new Promise(function (res) {
          var done = false;
          function fin() { if (done) return; done = true; chrome.tabs.onUpdated.removeListener(on); setTimeout(function () { res(x); }, 2500); }
          function on(id, ch) { if (id === x.id && ch.status === 'complete') fin(); }
          chrome.tabs.onUpdated.addListener(on); setTimeout(fin, 15000);
        });
      });
    });
  });
}
function hkRemAlarms() {
  return chrome.storage.local.get('hkRem').then(function (o) {
    var L = (o.hkRem || []).filter(function (r) { return r.at > Date.now() - 864e5; });
    L.forEach(function (r) { if (r.at > Date.now()) chrome.alarms.create('hk:' + r.id, { when: r.at }); });
    return chrome.storage.local.set({ hkRem: L });
  }).catch(function () {});
}
chrome.runtime.onStartup.addListener(hkRemAlarms);
chrome.runtime.onInstalled.addListener(hkRemAlarms);
chrome.alarms.onAlarm.addListener(function (a) {
  if (a.name.indexOf('hk:') !== 0) return;
  var id = a.name.slice(3);
  chrome.storage.local.get('hkRem').then(function (o) {
    var r = (o.hkRem || []).filter(function (x) { return x.id === id; })[0]; if (!r) return;
    try {
      chrome.notifications.create('hk:' + id, { type: 'basic', iconUrl: 'icon128.png', title: '🔔 תזכורת', message: r.text || 'תזכורת', priority: 2, requireInteraction: true });
    } catch (e) {}
    chrome.storage.local.set({ hkRem: (o.hkRem || []).filter(function (x) { return x.id !== id; }) });
  });
});
chrome.runtime.onMessage.addListener(function (m, sender, reply) {
  if (!m || !(m.gmailDo || m.gmailMap || m.hkRem || m.needMic)) return;
  if (m.needMic) { chrome.tabs.create({ url: chrome.runtime.getURL('mic.html') }); reply({ ok: true }); return; }
  if (m.hkRem) {
    var R = m.hkRem, id = String(R.id || '').replace(/[^a-z0-9]/gi, '');
    chrome.storage.local.get('hkRem').then(function (o) {
      var L = (o.hkRem || []).filter(function (x) { return x.id !== id; });
      if (R.cancel) chrome.alarms.clear('hk:' + id);
      else if (R.at > Date.now()) { L.push({ id: id, at: +R.at, text: String(R.text || '').slice(0, 200) }); chrome.alarms.create('hk:' + id, { when: +R.at }); }
      return chrome.storage.local.set({ hkRem: L.slice(-100) });
    }).then(function () { reply({ ok: true }); }, function () { reply({ ok: false }); });
    return true;
  }
  var d = m.gmailDo;
  hkGmailTab(m.base).then(function (t) {
    if (m.gmailMap) return chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['gmail-map.js'] });
    return chrome.scripting.executeScript({ target: { tabId: t.id }, files: ['gmail-do.js'] }).then(function () {
      return chrome.scripting.executeScript({ target: { tabId: t.id }, func: function (o) { return window.hkGmailDo(o); }, args: [{ q: String(d.q), act: String(d.act), label: String(d.label || ''), head: String(d.head || '') }] });
    });
  }).then(function () { reply({ ok: true }); }, function (e) { reply({ ok: false, err: String(e && e.message || e) }); });
  return true;
});
