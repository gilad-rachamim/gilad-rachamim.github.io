// קישור קצר בכל שיתוף מהאתר (בכל הדפים, נטען מ-build.py).
// כל כתובת של האתר שיוצאת בווטסאפ, SMS, מייל, "שיתוף" בטלפון או העתקה ללוח:
//  1. עוברת ל-hakelim.com ומאבדת את utm_ / fbclid / gclid (קישור נקי).
//  2. אם עדיין ארוכה (מצב של כלי בתוך הקישור) – מקבלת קוד קצר: hakelim.com/s/#a7Xq2b
//     (שרת kartis, tools/kartis-worker, POST /s {t:'u'}). אותו קישור = אותו קוד. נכשל? נשאר הקישור הנקי.
// מתחבר לבד ל: <a href="https://wa.me/...">, api.whatsapp.com, sms:, mailto:, t.me, facebook sharer,
// window.open, navigator.share ו-navigator.clipboard.writeText. כלי לא צריך לעשות כלום.
// מעבר ישיר (location.href = 'https://wa.me/...') אי אפשר לתפוס – שם כותבים window.kelimShort.go(קישור).
// לכלים: window.kelimShort.url(u) / .text(t) -> Promise, .now(u) -> מחרוזת או null (אם צריך שרת ועוד אין קוד).
(function () {
  'use strict';
  if (window.kelimShort) return;
  var HOST = 'https://hakelim.com', API = 'https://kartis.gilad4049.workers.dev', MAX = 48, MEMK = 'kishur-mem';
  try { var o = localStorage.getItem('kishur-api'); if (o) API = o; } catch (e) {}
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? location.origin.replace(/[.]/g, '\\.') + '|' : '';
  var URL_RE = new RegExp('(?:' + local + 'https?://(?:www\\.)?(?:hakelim\\.com|gilad-rachamim\\.github\\.io))(?=[/?#]|$)[^\\s<>"\'`]*', 'g');
  var SHARE_RE = /^(?:https?:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com|t\.me\/share|telegram\.me\/share|www\.facebook\.com\/sharer|m\.facebook\.com\/sharer|twitter\.com\/intent|x\.com\/intent)|whatsapp:|sms:|mailto:)/i;
  var mem = {}, wait = {};
  try { mem = JSON.parse(localStorage.getItem(MEMK) || '{}') || {}; } catch (e) {}

  function trimEnd(u) { var m = u.match(/[.,;:!?)\]}״'"]+$/); return m ? [u.slice(0, -m[0].length), m[0]] : [u, '']; }
  function clean(u) {
    try {
      var x = new URL(u, location.href), p = [];
      x.searchParams.forEach(function (v, k) { if (!/^(utm_|fbclid$|gclid$|_ga$)/.test(k)) p.push(encodeURIComponent(k) + (v === '' ? '' : '=' + encodeURIComponent(v))); });
      return HOST + x.pathname + (p.length ? '?' + p.join('&') : '') + (x.hash.length > 1 ? x.hash : '');
    } catch (e) { return u; }
  }
  function tail(c) { return c.slice(HOST.length); }
  function needs(c) { return tail(c).length > MAX && !/^\/(s|k)\/#/.test(tail(c)); }
  function now(u) { var c = clean(u); return !needs(c) ? c : mem[c] ? HOST + '/s/#' + mem[c] : null; }
  function ask(c) {
    if (wait[c]) return wait[c];
    wait[c] = fetch(API + '/s', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: 'u', d: tail(c) }) })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) {
        if (!j || !/^[0-9A-Za-z]{6}$/.test(j.k)) throw new Error('k');
        mem[c] = j.k;
        try { var ks = Object.keys(mem); while (ks.length > 150) delete mem[ks.shift()]; localStorage.setItem(MEMK, JSON.stringify(mem)); } catch (e) {}
        if (window.kelimEv) window.kelimEv('short_link', { page: location.pathname });
        return HOST + '/s/#' + j.k;
      })
      .catch(function () { setTimeout(function () { delete wait[c]; }, 30000); return c; });
    return wait[c];
  }
  function url(u, ms) {
    var c = clean(u); if (!needs(c)) return Promise.resolve(c);
    if (mem[c]) return Promise.resolve(HOST + '/s/#' + mem[c]);
    var p = ask(c);
    return ms ? Promise.race([p, new Promise(function (r) { setTimeout(function () { r(c); }, ms); })]) : p;
  }
  function found(t) { return typeof t === 'string' ? (t.match(URL_RE) || []) : []; }
  function textNow(t) {
    var miss = false;
    var out = String(t).replace(URL_RE, function (m) { var s = trimEnd(m), v = now(s[0]); if (v == null) { miss = true; v = clean(s[0]); } return v + s[1]; });
    return miss ? null : out;
  }
  function text(t, ms) {
    var us = found(t); if (!us.length) return Promise.resolve(t);
    return Promise.all(us.map(function (m) { return url(trimEnd(m)[0], ms); })).then(function (vs) {
      var i = 0; return String(t).replace(URL_RE, function (m) { return vs[i++] + trimEnd(m)[1]; });
    });
  }
  function warm(t) { found(t).forEach(function (m) { var c = clean(trimEnd(m)[0]); if (needs(c) && !mem[c]) ask(c); }); }

  // ---------- קישורי שיתוף: wa.me?text=... , sms:?body=... ----------
  function mapHref(h, f) { // f: מחרוזת -> מחרוזת. מחזיר את הקישור עם הטקסטים אחרי f
    var i = h.indexOf('?'); if (i < 0) return h;
    var hash = '', q = h.slice(i + 1), j = q.indexOf('#'); if (j >= 0) { hash = q.slice(j); q = q.slice(0, j); }
    return h.slice(0, i + 1) + q.split('&').map(function (kv) {
      if (!kv) return kv; var e = kv.indexOf('='); if (e < 0) return kv;
      var v; try { v = decodeURIComponent(kv.slice(e + 1).replace(/\+/g, ' ')); } catch (x) { return kv; }
      return found(v).length ? kv.slice(0, e + 1) + encodeURIComponent(f(v)) : kv;
    }).join('&') + hash;
  }
  function hrefDecoded(h) { try { return decodeURIComponent(h.replace(/\+/g, ' ')); } catch (e) { return h; } }
  function isShare(h) { return typeof h === 'string' && SHARE_RE.test(h) && found(hrefDecoded(h)).length > 0; }
  function hrefNow(h) { var miss = false, r = mapHref(h, function (v) { var x = textNow(v); if (x == null) { miss = true; return v; } return x; }); return miss ? null : r; }
  function hrefP(h, ms) {
    var vals = [];
    mapHref(h, function (v) { vals.push(v); return v; });
    return Promise.all(vals.map(function (v) { return text(v, ms); })).then(function (outs) { var i = 0; return mapHref(h, function () { return outs[i++]; }); });
  }

  // מחממים מראש: כל קישור שיתוף שמופיע או משתנה בדף, ולחיצה שמתחילה (לפני ה-click)
  function warmEl(a) { var h = a && a.getAttribute && a.getAttribute('href'); if (isShare(h)) warm(hrefDecoded(h)); }
  function scan(root) { try { (root || document).querySelectorAll('a[href]').forEach(warmEl); } catch (e) {} }
  ['pointerdown', 'touchstart', 'focusin', 'mouseover'].forEach(function (n) {
    document.addEventListener(n, function (e) { var a = e.target && e.target.closest && e.target.closest('a[href]'); if (a) warmEl(a); }, { passive: true, capture: true });
  });
  if (window.MutationObserver) {
    var mo = new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'attributes') { if (m.target.tagName === 'A') warmEl(m.target); }
        else for (var j = 0; j < m.addedNodes.length; j++) { var n = m.addedNodes[j]; if (n.nodeType === 1) { if (n.tagName === 'A') warmEl(n); else if (n.querySelector && n.querySelector('a[href]')) scan(n); } }
      }
    });
    var go = function () { mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['href'] }); scan(); };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
  }

  // הלחיצה עצמה: אחרי שהכלי כבר בנה את הקישור (window, בועה – אחרון בתור)
  window.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button) return;
    var a = e.target && e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href'); if (!isShare(h)) return;
    var n = hrefNow(h);
    if (n != null) { if (n !== h) a.setAttribute('href', n); return; }
    e.preventDefault();
    var blank = a.target === '_blank' && /^https?:/i.test(h), w = null;
    if (blank) { try { w = origOpen.call(window, '', '_blank'); } catch (x) {} }
    hrefP(h, 2500).then(function (v) {
      a.setAttribute('href', v);
      if (w) { try { w.opener = null; w.location.href = v; return; } catch (x) {} }
      if (blank) { var ww = origOpen.call(window, v, '_blank'); if (ww) return; }
      location.href = v;
    });
  }, false);

  // window.open('https://wa.me/?text=...')
  var origOpen = window.open;
  window.open = function (u, name, feat) {
    if (isShare(u)) {
      var n = hrefNow(u); if (n != null) return origOpen.call(window, n, name, feat);
      var w = origOpen.call(window, '', name || '_blank');
      hrefP(u, 2500).then(function (v) { if (w) { try { w.location.href = v; return; } catch (x) {} } location.href = v; });
      return w;
    }
    return origOpen.apply(window, arguments);
  };

  // navigator.share({text, url}) – הדפדפן דורש לחיצה טרייה, לכן מחכים לכל היותר רגע קצר
  function patch(obj, name, wrap) {
    if (!obj || typeof obj[name] !== 'function') return;
    var orig = obj[name].bind(obj), f = wrap(orig);
    try { Object.defineProperty(obj, name, { value: f, configurable: true, writable: true }); } catch (e) { try { obj[name] = f; } catch (x) {} }
  }
  patch(navigator, 'share', function (orig) {
    return function (d) {
      if (!d || typeof d !== 'object' || !(found(d.text).length || found(d.url).length)) return orig(d);
      var o = {}; for (var k in d) o[k] = d[k];
      var tn = d.text ? textNow(d.text) : d.text, un = d.url ? now(d.url) : d.url;
      if (tn != null && un != null) { o.text = tn; o.url = un; return orig(o); }
      return Promise.all([d.text ? text(d.text, 900) : d.text, d.url ? url(d.url, 900) : d.url]).then(function (r) { o.text = r[0]; o.url = r[1]; return orig(o); });
    };
  });
  // העתקה ללוח
  patch(navigator.clipboard, 'writeText', function (orig) {
    return function (t) {
      if (!found(t).length) return orig(t);
      var n = textNow(t); if (n != null) return orig(n);
      return text(t, 900).then(orig);
    };
  });

  // מעבר ישיר לקישור שיתוף (location.href = 'https://wa.me/?text=...') – כלים קוראים לזה במקום להשמה
  function go(h) {
    if (!isShare(h)) { location.href = h; return; }
    var n = hrefNow(h); if (n != null) { location.href = n; return; }
    hrefP(h, 2500).then(function (v) { location.href = v; });
  }
  window.kelimShort = { url: url, text: text, now: now, textNow: textNow, clean: clean, warm: warm, go: go };
})();

// נגישות לקוד QR (ספריית qrcodejs): תמונת הקוד מקבלת טקסט חלופי.
// לא נוגעים בקובץ הספרייה עצמו – יש עליו חתימת integrity, ושינוי בו חוסם אותו בדפדפן.
(function () {
  if (!window.MutationObserver) return;
  var ALT = 'קוד QR לסריקה';
  function fix(root) {
    var imgs = root.querySelectorAll ? root.querySelectorAll('img:not([alt])') : [];
    for (var i = 0; i < imgs.length; i++) {
      var p = imgs[i].previousElementSibling;
      if (p && p.tagName === 'CANVAS') imgs[i].alt = ALT;
    }
  }
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) for (var j = 0; j < ms[i].addedNodes.length; j++) {
      var n = ms[i].addedNodes[j];
      if (n.nodeType === 1) fix(n.tagName === 'IMG' ? n.parentNode || n : n);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  fix(document);
})();
