// E8 – תפריט דיגיטלי בקישור ו-QR (כלים לעסק קטן). כמו דף בית הכנסת: התפריט יושב בקישור (אחרי #), לא בשרת.
// הנתונים נדחסים (deflate) כדי שהקישור וה-QR יהיו קצרים. דפדפן ישן בלי דחיסה מקבל קישור רגיל (#d=).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('tf-form'), view = $('tf-view'), builder = $('tf-build');
  if (!form) return;
  var KEY = 'esek-tafrit', F = { name: 'n', sub: 's', items: 'i', phone: 'p', addr: 'a', hours: 'h', note: 't' };
  var SAMPLE = 'פיצות:\nפיצה משפחתית - 55 | רוטב עגבניות ומוצרלה\nפיצה אישית - 32\nפיצה ללא גלוטן - 45\nתוספות (למשפחתית):\nזיתים - 6\nפטריות - 6\nבצל - 5\nטונה - 9\nמנות נוספות:\nלחם שום - 18\nסלט יווני - 34 | עגבנייה, מלפפון, זיתים ובולגרית\nצ\'יפס - 16\nשתייה:\nפחית - 8\nבקבוק 1.5 ליטר - 14\nמבצעים:\nמשפחתית + תוספת + בקבוק - 69';

  // ---------- קידוד: JSON → UTF-8 → deflate → base64url ----------
  function b64(bytes) { var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function unb64(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); var bin = atob(s), out = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; }
  function pipe(bytes, stream) { return new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  function enc(o) {
    var bytes = new TextEncoder().encode(JSON.stringify(o));
    if (!window.CompressionStream) return Promise.resolve('d=' + b64(bytes));
    return pipe(bytes, new CompressionStream('deflate-raw')).then(function (z) { return 'z=' + b64(z); }).catch(function () { return 'd=' + b64(bytes); });
  }
  function dec(kind, s) {
    var bytes = unb64(s);
    var p = kind === 'z' ? pipe(bytes, new DecompressionStream('deflate-raw')) : Promise.resolve(bytes);
    return p.then(function (b) { return JSON.parse(new TextDecoder().decode(b)); });
  }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function intl(p) { p = String(p || '').replace(/[^\d+]/g, ''); if (p.indexOf('+') === 0) return p.slice(1); if (p.indexOf('0') === 0) return '972' + p.slice(1); return p; }
  function used(action, extra) { if (window.toolUsed) window.toolUsed('esek_tafrit', Object.assign({ action: action }, extra || {})); }

  // ---------- פענוח שורות התפריט ----------
  // "פיצות:" = כותרת. "פיצה משפחתית - 55 | הסבר" = מנה. מחיר: המספר בסוף השורה (עם או בלי ₪).
  var PRICE = /^(.*?)[\s\-–—.:…]*\s?(₪?\s*\d+(?:[.,]\d{1,2})?\s*(?:₪|ש"ח|ש״ח|שח)?)\s*$/;
  function parse(text) {
    var cats = [], cur = null;
    String(text || '').split('\n').forEach(function (raw) {
      var line = raw.trim(); if (!line) return;
      var parts = line.split('|'), main = parts[0].trim(), desc = parts.slice(1).join('|').trim();
      var head = /^#/.test(main) || /[:：]$/.test(main);
      if (head) { cur = { t: main.replace(/^#+\s*/, '').replace(/[:：]$/, '').trim(), it: [] }; cats.push(cur); return; }
      if (!cur) { cur = { t: '', it: [] }; cats.push(cur); }
      var m = main.match(PRICE), name = main, price = '';
      if (m && m[1].trim()) { name = m[1].trim(); price = m[2].replace(/₪|ש"ח|ש״ח|שח/g, '').trim(); }
      cur.it.push({ n: name, p: price, d: desc });
    });
    return cats.filter(function (c) { return c.it.length || c.t; });
  }

  function read() {
    var o = {};
    Object.keys(F).forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && el.value.trim()) o[F[k]] = el.value.trim(); });
    return o;
  }
  function base() { return location.origin + location.pathname; }

  function qr(el, url, size) {
    el.innerHTML = '';
    if (!window.QRCode) return false;
    try { new window.QRCode(el, { text: url, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.L }); return true; }
    catch (e) { el.innerHTML = '<p style="color:#900;padding:.5rem;max-width:14rem">התפריט ארוך מדי בשביל QR אחד. אפשר לקצר הסברים, או לשלוח את הקישור בווטסאפ.</p>'; return false; }
  }

  function render(o) {
    var cats = parse(o.i), h = '<div class="tf"><div class="tf-head"><h2>' + esc(o.n) + '</h2>' + (o.s ? '<p class="s">' + esc(o.s) + '</p>' : '') + '</div>';
    if (o.p || o.a) {
      h += '<div class="tf-btns">';
      if (o.p) h += '<a class="btn btn-gold" href="https://wa.me/' + intl(o.p) + '?text=' + encodeURIComponent('שלום, אשמח להזמין:\n') + '" data-tf-act="wa">💬 להזמין בווטסאפ</a><a class="btn btn-line" href="tel:+' + intl(o.p) + '" data-tf-act="call">📞 להתקשר</a>';
      if (o.a) h += '<a class="btn btn-line" href="https://waze.com/ul?q=' + encodeURIComponent(o.a) + '&navigate=yes" data-tf-act="waze">🧭 ניווט בוויז</a><a class="btn btn-line" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.a) + '" data-tf-act="maps">🗺️ גוגל מפות</a>';
      h += '</div>';
    }
    var named = cats.filter(function (c) { return c.t; });
    if (named.length > 2) h += '<nav class="tf-cats" aria-label="קטגוריות">' + cats.map(function (c, i) { return c.t ? '<a href="#tfc-' + i + '">' + esc(c.t) + '</a>' : ''; }).join('') + '</nav>';
    cats.forEach(function (c, i) {
      h += '<section class="tf-cat" id="tfc-' + i + '">' + (c.t ? '<h3>' + esc(c.t) + '</h3>' : '');
      c.it.forEach(function (it) { h += '<div class="tf-it"><b>' + esc(it.n) + '</b><span class="p">' + (it.p ? esc(it.p) + ' ₪' : '') + '</span>' + (it.d ? '<small>' + esc(it.d) + '</small>' : '') + '</div>'; });
      h += '</section>';
    });
    if (o.h || o.a || o.p || o.t) {
      h += '<div class="tf-info">';
      if (o.h) h += '<p>🕒 ' + esc(o.h) + '</p>';
      if (o.a) h += '<p>📍 ' + esc(o.a) + '</p>';
      if (o.p) h += '<p>📞 <span dir="ltr">' + esc(o.p) + '</span></p>';
      if (o.t) h += '<p>' + esc(o.t) + '</p>';
      h += '</div>';
    }
    h += '<p class="tf-credit">המחירים באחריות בית העסק · תפריט חינמי מ<a href="/esek/tafrit/">כלים לעסק קטן</a></p></div>';
    view.innerHTML = h;
    view.hidden = false;
  }

  function sign(o, url) {
    var one = '<div class="half"><p class="small">סורקים במצלמה של הטלפון</p><h2>' + esc(o.n) + '</h2>' + (o.s ? '<p>' + esc(o.s) + '</p>' : '') +
      '<p><b>התפריט שלנו בטלפון</b></p><div class="qrbig"></div>' + (o.p ? '<p>להזמנות: <span dir="ltr">' + esc(o.p) + '</span></p>' : '') +
      '<p class="small">נבנה בחינם בכלים לעסק קטן · hakelim.com/esek</p></div>';
    var s = $('tf-sign'); if (s.parentNode !== document.body) document.body.appendChild(s); s.innerHTML = one + one;
    [].forEach.call(s.querySelectorAll('.qrbig'), function (el) { qr(el, url, 600); });
  }

  var last = null; // { o, url }
  function build(o) {
    return enc(o).then(function (h) { last = { o: o, url: base() + '#' + h }; return last; });
  }
  function show(r) {
    $('tf-link').value = r.url;
    $('tf-open').href = r.url;
    $('tf-wa').href = 'https://wa.me/?text=' + encodeURIComponent('התפריט של ' + r.o.n + ':\n' + r.url);
    $('tf-qrimg').href = '/esek/qr/#u=' + encodeURIComponent(r.url) + '&t=' + encodeURIComponent(r.o.n);
    var okq = qr($('tf-qr-small'), r.url, 220);
    $('tf-len').textContent = okq && r.url.length > 900 ? 'התפריט ארוך, ולכן ה-QR צפוף. בהדפסה הוא יוצא גדול ונסרק טוב. אפשר גם לקצר הסברים.' : '';
    $('tf-ready').hidden = false;
  }

  // קישור לתפריט שנפתח באותו דף (רק ה-# משתנה): טוענים מחדש כדי לעבור לתצוגה
  window.addEventListener('hashchange', function () { if (/#[zd]=/.test(location.hash)) location.reload(); });

  // ---------- מצב תצוגה: הגיעו מקישור ----------
  var m = location.hash.match(/#([zd])=([\w-]+)/);
  if (m) {
    builder.hidden = true;
    dec(m[1], m[2]).then(function (o) {
      render(o);
      document.title = o.n + ' – התפריט';
      $('tf-mine').hidden = false;
      used('view');
    }).catch(function () {
      view.innerHTML = '<p class="disclaimer">הקישור לא נפתח. אולי הוא נקטע בהעתקה, או שהדפדפן ישן. נסו לבקש מבית העסק את הקישור שוב.</p>';
      view.hidden = false;
    });
    view.addEventListener('click', function (e) { var a = e.target.closest('[data-tf-act]'); if (a) used('click_' + a.getAttribute('data-tf-act')); });
    return;
  }

  // ---------- מצב בנייה ----------
  try { var st = JSON.parse(localStorage.getItem(KEY) || '{}'); Object.keys(F).forEach(function (k) { if (st[k]) form.querySelector('[name=' + k + ']').value = st[k]; }); } catch (e) {}
  function save() { var s = {}; Object.keys(F).forEach(function (k) { s[k] = form.querySelector('[name=' + k + ']').value; }); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  var t = null;
  function preview() { var o = read(); if (o.n || o.i) render({ n: o.n || 'שם העסק', s: o.s, i: o.i, p: o.p, a: o.a, h: o.h, t: o.t }); }
  form.addEventListener('input', function () { save(); clearTimeout(t); t = setTimeout(preview, 250); if (!$('tf-ready').hidden) $('tf-ready').hidden = true; });
  $('tf-sample').addEventListener('click', function () {
    var el = $('tf-items');
    if (el.value.trim() && !confirm('להחליף את מה שכתבתם בדוגמה?')) return;
    el.value = SAMPLE; if (!$('tf-name').value.trim()) $('tf-name').value = 'פיצה של משה';
    save(); preview();
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var o = read();
    if (!o.n || !o.i) { form.reportValidity(); return; }
    render(o);
    build(o).then(function (r) { show(r); used('create', { items: parse(o.i).reduce(function (a, c) { return a + c.it.length; }, 0), len: r.url.length }); $('tf-ready').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  });
  $('tf-copy').addEventListener('click', function () {
    var b = this, v = $('tf-link').value;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; used('copy'); }).catch(function () { $('tf-link').select(); });
  });
  $('tf-wa').addEventListener('click', function () { used('wa'); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tf="print"]');
    if (!b || !last) return;
    sign(last.o, last.url);
    document.body.classList.add('print-tf');
    used('print_sign');
    setTimeout(function () { window.print(); }, 300);
  });
  window.addEventListener('afterprint', function () { document.body.classList.remove('print-tf'); });
  preview();
})();
