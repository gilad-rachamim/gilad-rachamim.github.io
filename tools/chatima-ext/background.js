// תוסף "למלא ולחתום על PDF": מביא את קובץ ה-PDF (מג׳ימייל, מקישור או מהכרטיסייה הפתוחה),
// שומר אותו רגע ב-storage של התוסף ופותח את הכלי ב-hakelim.com. bridge.js מעביר אותו לדף.
// שום דבר לא נשלח לשרת: הכלי עצמו עובד בתוך הדפדפן.
var TOOL = 'https://hakelim.com/kelim/machshev/chatima/?ext=1';

function b64(buf) {
  var bytes = new Uint8Array(buf), out = '', step = 0x8000;
  for (var i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  return btoa(out);
}
function nameFrom(url, fallback) {
  try { var p = decodeURIComponent(new URL(url).pathname.split('/').pop() || ''); if (/\.pdf$/i.test(p)) return p; } catch (e) {}
  return fallback || 'מסמך.pdf';
}
function openTool(data, name) {
  var id = Date.now() + '-' + Math.random().toString(36).slice(2);
  var save = data ? chrome.storage.local.set({ pending: { id: id, name: name, b64: data, at: Date.now() } }) : Promise.resolve();
  return save.then(function () { return chrome.tabs.create({ url: TOOL }); });
}
function fetchPdf(url) {
  return fetch(url, { credentials: 'include' }).then(function (r) {
    if (!r.ok) throw new Error('http ' + r.status);
    return r.arrayBuffer();
  }).then(function (buf) {
    var head = new Uint8Array(buf.slice(0, 5)), sig = String.fromCharCode.apply(null, head);
    if (sig !== '%PDF-') throw new Error('not pdf');
    return b64(buf);
  });
}
function openUrl(url, name) {
  return fetchPdf(url).then(function (d) { return openTool(d, name || nameFrom(url)); }).then(function () { return true; })
    .catch(function () { return openTool(null).then(function () { return false; }); });
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({ id: 'hk-sign-link', title: 'למלא ולחתום על ה-PDF הזה', contexts: ['link'] });
  chrome.contextMenus.create({ id: 'hk-sign-page', title: 'למלא ולחתום על ה-PDF הזה', contexts: ['page'], documentUrlPatterns: ['*://*/*.pdf', '*://*/*.pdf?*', 'file:///*.pdf', 'file:///*.PDF'] });
});

chrome.contextMenus.onClicked.addListener(function (info) {
  var url = info.linkUrl || info.pageUrl;
  if (!url) return;
  var origin;
  try { origin = new URL(url).origin + '/*'; } catch (e) { return; }
  // אתר שאין לתוסף גישה אליו: מבקשים רשות פעם אחת, לאתר הזה בלבד
  if (/^https?:/.test(url)) chrome.permissions.request({ origins: [origin] }, function () { openUrl(url); });
  else openUrl(url);
});

chrome.action.onClicked.addListener(function (tab) {
  var u = tab && tab.url || '';
  if (/\.pdf($|[?#])/i.test(u) || /^file:/i.test(u)) openUrl(u);
  else chrome.tabs.create({ url: TOOL.replace('?ext=1', '') });
});

chrome.runtime.onMessage.addListener(function (m, sender, reply) {
  if (!m) return;
  if (m.data) { openTool(m.data, m.name || 'מסמך.pdf').then(function () { reply({ ok: true }); }); return true; }
  if (m.open) { openUrl(m.open, m.name).then(function (ok) { reply({ ok: ok }); }); return true; }
});
