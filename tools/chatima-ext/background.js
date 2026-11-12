// תוסף "הכלים של גילעד רחמים" (גרסה 2): מחבר כלים מ-hakelim.com לדפדפן.
// מביא את הקובץ שהמשתמש בחר (מג׳ימייל, מלחיצה ימנית או מהכרטיסייה הפתוחה), שומר אותו רגע
// ב-storage של התוסף ופותח את הכלי. bridge.js מכניס אותו לדף. שום דבר לא נשלח לשרת:
// הכלים עצמם עובדים בתוך הדפדפן.
var SITE = 'https://hakelim.com/kelim/machshev/';
var TOOLS = {
  chatima: { url: SITE + 'chatima/?ext=1', pdf: true, img: false },
  pdf: { url: SITE + 'pdf/?ext=1', pdf: true, img: false },
  tmuna: { url: SITE + 'tmuna/?ext=1', pdf: false, img: true },
  fax: { url: SITE + 'fax/?ext=1', pdf: true, img: true }
};

function b64(buf) {
  var bytes = new Uint8Array(buf), out = '', step = 0x8000;
  for (var i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  return btoa(out);
}
function sniff(buf) {
  var h = new Uint8Array(buf.slice(0, 12)), s = String.fromCharCode.apply(null, h);
  if (s.slice(0, 5) === '%PDF-') return 'application/pdf';
  if (h[0] === 0xFF && h[1] === 0xD8) return 'image/jpeg';
  if (s.slice(1, 4) === 'PNG') return 'image/png';
  if (s.slice(0, 4) === 'RIFF' && s.slice(8, 12) === 'WEBP') return 'image/webp';
  if (s.slice(0, 3) === 'GIF') return 'image/gif';
  if (s.slice(0, 2) === 'BM') return 'image/bmp';
  if (s.slice(4, 8) === 'ftyp') return 'image/heic';
  return '';
}
var EXT = { 'application/pdf': '.pdf', 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/bmp': '.bmp', 'image/heic': '.heic' };
function nameFrom(url, type) {
  var ext = EXT[type] || '';
  try {
    if (/^https?:|^file:/.test(url)) {
      var p = decodeURIComponent(new URL(url).pathname.split('/').pop() || '');
      if (p && /\.[a-z0-9]{2,5}$/i.test(p) && p.length < 120) return p;
    }
  } catch (e) {}
  return (type === 'application/pdf' ? 'מסמך' : 'תמונה') + ext;
}

// שומרים את הקובץ ופותחים את הכלי. לכלי החתימה נשאר הפורמט הישן (pending), לשאר: pendingFiles.
function openTool(tool, file) {
  var t = TOOLS[tool], save = Promise.resolve();
  if (file) {
    var id = Date.now() + '-' + Math.random().toString(36).slice(2);
    save = tool === 'chatima'
      ? chrome.storage.local.set({ pending: { id: id, name: file.name, b64: file.b64, at: Date.now() } })
      : chrome.storage.local.set({ pendingFiles: { id: id, tool: tool, at: Date.now(), files: [file] } });
  }
  return save.then(function () { return chrome.tabs.create({ url: file ? t.url : t.url.replace('?ext=1', '') }); });
}
function fetchFile(url, tool, name) {
  var t = TOOLS[tool];
  return fetch(url, { credentials: 'include' }).then(function (r) {
    if (!r.ok) throw new Error('http ' + r.status);
    return r.arrayBuffer();
  }).then(function (buf) {
    var type = sniff(buf);
    var ok = (type === 'application/pdf' && t.pdf) || (/^image\//.test(type) && t.img);
    if (!ok) throw new Error('wrong type ' + type);
    return { name: name || nameFrom(url, type), type: type, b64: b64(buf) };
  });
}
function openUrl(tool, url, name) {
  return fetchFile(url, tool, name).then(function (f) { return openTool(tool, f); }).then(function () { return true; })
    .catch(function () { return openTool(tool, null).then(function () { return false; }); });
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

// ---------- תפריט לחיצה ימנית ----------
var PDF_PAGES = ['*://*/*.pdf', '*://*/*.pdf?*', '*://*/*.PDF', 'file:///*.pdf', 'file:///*.PDF'];
chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.removeAll(function () {
    var C = chrome.contextMenus.create;
    C({ id: 'hk', title: 'הכלים של גילעד רחמים', contexts: ['link', 'image', 'page', 'editable'] });
    C({ parentId: 'hk', id: 'img-tmuna', title: 'להקטין את התמונה לפני שליחה', contexts: ['image'] });
    C({ parentId: 'hk', id: 'img-fax', title: 'לשלוח את התמונה כפקס', contexts: ['image'] });
    C({ parentId: 'hk', id: 'link-chatima', title: 'למלא ולחתום על ה-PDF הזה', contexts: ['link'] });
    C({ parentId: 'hk', id: 'link-pdf', title: 'לכווץ את ה-PDF הזה', contexts: ['link'] });
    C({ parentId: 'hk', id: 'link-fax', title: 'לשלוח כפקס', contexts: ['link'] });
    C({ parentId: 'hk', id: 'page-chatima', title: 'למלא ולחתום על ה-PDF הזה', contexts: ['page'], documentUrlPatterns: PDF_PAGES });
    C({ parentId: 'hk', id: 'page-pdf', title: 'לכווץ את ה-PDF הזה', contexts: ['page'], documentUrlPatterns: PDF_PAGES });
    C({ parentId: 'hk', id: 'page-fax', title: 'לשלוח את ה-PDF הזה כפקס', contexts: ['page'], documentUrlPatterns: PDF_PAGES });
    C({ parentId: 'hk', id: 'pw', title: 'להכניס סיסמה חזקה', contexts: ['editable'] });
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  var id = String(info.menuItemId);
  if (id === 'pw') {
    if (!tab || tab.id == null) return;
    var target = { tabId: tab.id };
    if (info.frameId) target.frameIds = [info.frameId];
    chrome.scripting.executeScript({ target: target, func: putPassword, args: [makePassword(16)] }).catch(function () {});
    return;
  }
  var parts = id.split('-'), tool = parts[1];
  if (!TOOLS[tool]) return;
  var url = parts[0] === 'img' ? info.srcUrl : parts[0] === 'link' ? info.linkUrl : info.pageUrl;
  if (!url) return;
  if (!/^https?:/.test(url)) { openUrl(tool, url); return; }
  var origin;
  try { origin = new URL(url).origin + '/*'; } catch (e) { return; }
  // אתר שאין לתוסף גישה אליו: מבקשים רשות פעם אחת, לאתר הזה בלבד
  chrome.permissions.request({ origins: [origin] }, function () { void chrome.runtime.lastError; openUrl(tool, url); });
});

// הודעות מג׳ימייל ומהחלון הקטן
chrome.runtime.onMessage.addListener(function (m, sender, reply) {
  if (!m) return;
  var tool = TOOLS[m.tool] ? m.tool : 'chatima';
  if (m.data) {
    openTool(tool, { name: m.name || 'מסמך.pdf', type: m.type || 'application/pdf', b64: m.data }).then(function () { reply({ ok: true }); });
    return true;
  }
  if (m.open) { openUrl(tool, m.open, m.name).then(function (ok) { reply({ ok: ok }); }); return true; }
});
