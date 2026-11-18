// גשר – דף רקע שקוף ללוח (service worker לא יכול לגעת בלוח בעצמו).
// 1. gesher-copy: כותב טקסט ללוח (קוד אימות / טקסט שהגיע מהטלפון).
// 2. gesher-clip-watch: כשהמתג "העתקות מהמחשב לטלפון" דלוק – בודק את הלוח כל שנייה,
//    ורק כשהוא השתנה שולח את הטקסט החדש ל-service worker. שום דבר לא נשמר ולא נכתב ללוג.
var watching = false, last = null, timer = null, closeT = null;
var t = document.getElementById('t');

function readClip() {
  t.value = '';
  t.focus();
  document.execCommand('paste');
  var v = t.value;
  t.value = '';
  return v;
}

function tick() {
  var v;
  try { v = readClip(); } catch (e) { return; }
  if (last === null) { last = v; return; }        // מה שהיה בלוח לפני שהדלקנו – לא שולחים
  if (v === last || !v) return;
  last = v;
  chrome.runtime.sendMessage({ t: 'gesher-clip-local', text: v }).catch(function () {});
}

chrome.runtime.onMessage.addListener(function (m, sender, reply) {
  if (!m || typeof m.t !== 'string') return;
  if (m.t === 'gesher-copy') {
    var s = String(m.text || '');
    t.value = s;
    t.select();
    document.execCommand('copy');
    t.value = '';
    last = s;                                     // מה שכתבנו בעצמנו לא חוזר לטלפון
    clearTimeout(closeT);
    closeSoon();
    return;
  }
  if (m.t === 'gesher-clip-watch') {
    clearTimeout(closeT);
    var was = watching;
    watching = !!m.on;
    if (watching && was) return;
    clearInterval(timer);
    if (watching) { last = null; tick(); timer = setInterval(tick, 1000); }
    else closeSoon();
    return;
  }
  if (m.t.indexOf('gesher-blob-') === 0) { blob(m, reply); return true; }
});

// נסגר רק כשאין בדיקת לוח ואין קבצים בזיכרון
function closeSoon() {
  clearTimeout(closeT);
  closeT = setTimeout(function () { if (!watching && !Object.keys(blobs).length) window.close(); }, 500);
}

// ---------- קבצים מהטלפון (שלב 4) ----------
// החלקים נשמרים רק בזיכרון של הדף הזה. רק כשכל החלקים הגיעו וה-SHA-256 תואם – נוצר Blob שה-SW מוריד לתיקייה.
// קובץ שלא הושלם לא נכתב לדיסק בכלל, לכן ניתוק באמצע לא משאיר קובץ שבור.
var blobs = {};
function b64bytes(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
function blob(m, reply) {
  var x = blobs[m.fid];
  try {
    if (m.t === 'gesher-blob-part') {
      if (m.part === 0) { if (x && x.url) URL.revokeObjectURL(x.url); x = blobs[m.fid] = { parts: [] }; }
      if (!x || x.parts.length !== m.part) return reply({ ok: false, why: 'order' });
      x.parts.push(b64bytes(String(m.data || '')));
      return reply({ ok: true });
    }
    if (m.t === 'gesher-blob-make') {
      if (!x) return reply({ ok: false, why: 'gone' });
      var b = new Blob(x.parts, { type: m.mime || 'application/octet-stream' });
      x.parts = [];
      b.arrayBuffer().then(function (ab) { return crypto.subtle.digest('SHA-256', ab); }).then(function (d) {
        if (m.sha && hex(d) !== String(m.sha).toLowerCase()) { delete blobs[m.fid]; closeSoon(); return reply({ ok: false, why: 'hash' }); }
        x.url = URL.createObjectURL(b);
        var c = m.clip ? clipImage(b) : Promise.resolve(false);
        return c.then(function (clip) { reply({ ok: true, url: x.url, size: b.size, clip: clip }); });
      }).catch(function () { delete blobs[m.fid]; reply({ ok: false, why: 'make' }); });
      return;
    }
    if (m.t === 'gesher-blob-free' || m.t === 'gesher-blob-drop') {
      if (x && x.url) URL.revokeObjectURL(x.url);
      delete blobs[m.fid];
      closeSoon();
      return reply({ ok: true });
    }
  } catch (e) { delete blobs[m.fid]; reply({ ok: false, why: 'err' }); return; }
  reply({ ok: false });
}

// תמונה ללוח: קודם הדרך הרגילה (PNG); אם הדף לא בפוקוס – העתקה של <img> מסומן (מדביקים בוורד, ג'ימייל, ווטסאפ ווב)
function clipImage(b) {
  return createImageBitmap(b).then(function (bm) {
    var cv = document.createElement('canvas');
    cv.width = bm.width; cv.height = bm.height;
    cv.getContext('2d').drawImage(bm, 0, 0);
    return new Promise(function (res) { cv.toBlob(res, 'image/png'); }).then(function (png) {
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]).then(function () { return true; }, function () {
        return new Promise(function (res) {
          var fr = new FileReader();
          fr.onload = function () {
            var d = document.createElement('div');
            d.contentEditable = 'true';
            var im = document.createElement('img');
            im.src = fr.result;
            d.appendChild(im);
            document.body.appendChild(d);
            var r = document.createRange(); r.selectNode(im);
            var s = getSelection(); s.removeAllRanges(); s.addRange(r);
            var ok = document.execCommand('copy');
            s.removeAllRanges(); d.remove();
            res(ok);
          };
          fr.onerror = function () { res(false); };
          fr.readAsDataURL(png);
        });
      });
    });
  }).catch(function () { return false; });
}
