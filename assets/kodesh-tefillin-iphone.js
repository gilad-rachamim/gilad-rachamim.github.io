// נעילת אפליקציות באייפון עד שמניחים תפילין (כלי קודש) – /kodesh/tefillin/iphone/
// שני חלקים: TefillinCore (הלוגיקה והשרת, בלי DOM – אפשר לעטוף אותה בעתיד באפליקציה אמיתית)
// והחיבור לדף למטה. כל הטקסטים שהמשתמש רואה מרוכזים ב-STR (מוכן לתרגום).
(function () {
  'use strict';

  // ---------- הלוגיקה ----------
  var API = 'https://kodesh-tefillin.gilad4049.workers.dev';
  var PAGE = 'https://hakelim.com/kodesh/tefillin/iphone/';
  var KEY = 'tf-ios-code';
  var CODE_RE = /^[A-Za-z0-9-]{8,64}$/;

  function newCode() {
    var abc = 'abcdefghijkmnpqrstuvwxyz23456789', r = new Uint8Array(12), s = 'ip-';
    crypto.getRandomValues(r);
    for (var i = 0; i < r.length; i++) s += abc[r[i] % abc.length];
    return s;
  }
  function fromHash() {
    var m = /[#&]c=([A-Za-z0-9-]{8,64})/.exec(location.hash || '');
    return m ? m[1] : '';
  }
  function load() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function save(c) { try { localStorage.setItem(KEY, c); } catch (e) {} }

  var Core = {
    API: API,
    // הקוד מהכתובת (הקיצור פותח את הדף איתו) גובר על השמור, כדי שהאישור ייספר לקוד שבקיצור.
    code: function () {
      var h = fromHash(), s = load();
      if (h && CODE_RE.test(h)) { if (h !== s) save(h); return h; }
      if (s && CODE_RE.test(s)) return s;
      var c = newCode(); save(c); return c;
    },
    reset: function () { var c = newCode(); save(c); return c; },
    statusUrl: function (code, from) { return API + '/status?device=' + encodeURIComponent(code) + (from ? '&from=' + from : ''); },
    pageUrl: function (code) { return PAGE + '#c=' + code; },
    status: function (code) {
      return fetch(API + '/status?device=' + encodeURIComponent(code), { cache: 'no-store' })
        .then(function (r) { return r.text(); }).then(function (t) { return String(t).trim(); });
    },
    challenge: function (code) {
      return fetch(API + '/challenge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ device: code }) })
        .then(function (r) { return r.json(); });
    },
    check: function (code, id, b64) {
      return fetch(API + '/check', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id, device: code, image: { mime: 'image/jpeg', data: b64 } }) })
        .then(function (r) { return r.json(); });
    },
    // תמונה מהמצלמה -> JPEG ברוחב עד 1024px, בלי EXIF (התמונה לא נשמרת בשום מקום).
    shrink: function (file) {
      return new Promise(function (ok, bad) {
        var url = URL.createObjectURL(file), img = new Image();
        img.onload = function () {
          var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, 1024 / Math.max(w, h));
          var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          ok(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
        };
        img.onerror = function () { URL.revokeObjectURL(url); bad(new Error('img')); };
        img.src = url;
      });
    }
  };
  window.TefillinCore = Core;

  // ---------- הטקסטים ----------
  var STR = {
    copied: 'הועתק ✓',
    stOk: '✓ פתוח. היום כבר אישרת, או שעכשיו לא זמן תפילין (לילה, שבת, חג).',
    stNo: '🔒 עוד לא אישרת היום. האפליקציות שבחרת יפתחו את הדף הזה עד שתצלם.',
    stErr: 'אין חיבור לשרת כרגע. בדקו את האינטרנט.',
    asking: 'מבקש סימן מהשרת…',
    sign: 'עכשיו, עם התפילין עליך: ',
    camera: '📸 לפתוח מצלמה ולצלם',
    sending: '⏳ הבינה המלאכותית בודקת את התמונה… זה לוקח עד דקה, לא לסגור את הדף.',
    pass: 'יישר כוח! הטלפון פתוח להיום.',
    left: function (n) { return n > 0 ? 'נשארו היום עוד ' + n + ' ניסיונות.' : 'זה היה הניסיון האחרון להיום.'; },
    expired: 'הסימן פג (3 דקות). לוחצים שוב על "מצלמים".',
    fail: 'לא הצלחנו לבדוק. נסו שוב בעוד דקה.',
    resetQ: 'קוד חדש? הקיצור באייפון יפסיק לעבוד עד שתעדכנו בו את הכתובת החדשה.'
  };

  // ---------- הדף ----------
  var $ = function (id) { return document.getElementById(id); };
  if (!$('ti')) return;
  var ev = function (n, p) { if (window.kelimEv) window.kelimEv(n, p); };
  var code = Core.code(), ch = null, timer = 0;

  function fill() {
    var from = $('ti-from').value;
    $('ti-code').textContent = code;
    $('ti-url1').textContent = Core.statusUrl(code, from);
    $('ti-url3').textContent = Core.pageUrl(code);
    if (location.hash.indexOf('c=') < 0 && history.replaceState) history.replaceState(null, '', '#c=' + code);
  }
  function refresh() {
    var s = $('ti-status');
    s.className = 'tf-status'; s.innerHTML = '<b>בודק…</b>';
    Core.status(code).then(function (t) {
      var ok = t === 'ok';
      s.className = 'tf-status ' + (ok ? 'ok' : 'urgent');
      s.innerHTML = '<b>' + (ok ? STR.stOk : STR.stNo) + '</b>';
    }).catch(function () { s.className = 'tf-status'; s.innerHTML = '<b>' + STR.stErr + '</b>'; });
  }
  function msg(t, cls) { var m = $('ti-msg'); m.textContent = t; m.className = 'ti-msg ' + (cls || ''); }

  function copy(text, btn) {
    var done = function () { var o = btn.textContent; btn.textContent = STR.copied; setTimeout(function () { btn.textContent = o; }, 1800); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { prompt('', text); });
    else prompt('', text);
    ev('tf_ios_copy', { what: btn.getAttribute('data-copy') });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]');
    if (b) { var el = $(b.getAttribute('data-copy')); if (el) copy(el.textContent, b); }
  });

  $('ti-from').addEventListener('change', fill);
  $('ti-new').addEventListener('click', function () {
    if (!confirm(STR.resetQ)) return;
    code = Core.reset(); history.replaceState(null, '', '#c=' + code); fill(); refresh();
  });

  $('ti-start').addEventListener('click', function () {
    msg(STR.asking); $('ti-sign').hidden = true; $('ti-cam-wrap').hidden = true;
    Core.challenge(code).then(function (r) {
      if (!r || !r.id) { msg(STR.fail, 'bad'); return; }
      ch = r; ev('tf_ios_challenge');
      $('ti-sign').hidden = false;
      $('ti-sign-txt').textContent = STR.sign + r.he;
      $('ti-cam-wrap').hidden = false; msg('');
      clearInterval(timer);
      var end = r.exp || (Date.now() + 180000);
      timer = setInterval(function () {
        var s = Math.max(0, Math.round((end - Date.now()) / 1000));
        $('ti-left').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2);
        if (!s) { clearInterval(timer); ch = null; $('ti-cam-wrap').hidden = true; msg(STR.expired, 'bad'); }
      }, 500);
    }).catch(function () { msg(STR.fail, 'bad'); });
  });

  $('ti-cam').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = '';
    if (!f || !ch) return;
    var id = ch.id; ch = null; clearInterval(timer);
    $('ti-cam-wrap').hidden = true; msg(STR.sending);
    Core.shrink(f).then(function (b64) { return Core.check(code, id, b64); }).then(function (r) {
      $('ti-sign').hidden = true;
      if (r.pass) {
        msg('✓ ' + STR.pass, 'ok'); ev('tf_ios_pass');
        if (window.toolUsed) window.toolUsed('tefillin-iphone');
      } else {
        msg('✗ ' + (r.reason || STR.fail) + (typeof r.left === 'number' ? ' ' + STR.left(r.left) : ''), 'bad');
        ev('tf_ios_fail', { why: r.error || 'ai' });
      }
      refresh();
    }).catch(function () { msg(STR.fail, 'bad'); });
  });

  fill(); refresh();
})();
