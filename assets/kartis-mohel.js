// כרטיס ביקור דיגיטלי למוהל (כלי קודש, למוהלים).
// הפרטים יושבים בקישור עצמו (אחרי #d=), והכרטיס נבנה מהם בדפדפן – כמו כרטיס הרב (kartis-rav.js).
// קישור קצר: /k/#a7Xq2bZ (7 תווים) – הכרטיס נשמר בשרת kartis (tools/kartis-worker), ו-/k/ מפנה ל-#k= כאן.
// אם השרת לא עונה – נשארים עם הקישור הארוך, שתמיד עובד.
// תמונת הכרטיס עם QR: kcard.js. הקוד מוביל לכרטיס בלי התמונה, כדי שיהיה קטן וקל לסריקה.
// מדידה: tool_use{tool:kartis_mohel} כשנוצר כרטיס או תמונה; kartis_mohel_open כשמישהו פותח כרטיס – בלי הפרטים עצמם.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('km-form'), view = $('km-card'), builder = $('km-build');
  if (!form) return;
  var CREDIT = 'נבנה באהבה על ידי גילעד רחמים המוהל';
  var CREDIT_URL = '/kodesh/mohalim/?utm_source=kartis_mohel&utm_medium=credit';
  var photo = '';

  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function intl(p) { p = String(p || '').replace(/[^\d+]/g, ''); if (p.indexOf('+') === 0) return p.slice(1); if (p.indexOf('0') === 0) return '972' + p.slice(1); return p; }
  function ev(name, p) { if (window.kelimEv) window.kelimEv(name, p); }

  // מפתחות קצרים כדי שהקישור יישאר קצר: n שם, s הסמכה, p טלפון, a אזור, u נוסחים, t שורה אישית, i תמונה
  function read() {
    var o = {}, v = function (n) { var el = form.querySelector('[name=' + n + ']'); return el ? el.value.trim() : ''; };
    if (v('name')) o.n = v('name');
    if (v('smicha')) o.s = v('smicha');
    if (v('phone')) o.p = v('phone');
    if (v('area')) o.a = v('area');
    var u = [].slice.call(form.querySelectorAll('[name=nusach]:checked')).map(function (c) { return c.value; });
    if (u.length) o.u = u;
    if (v('note')) o.t = v('note');
    if (photo) o.i = photo;
    return o;
  }
  function link(o, noPhoto) {
    var c = {}; for (var k in o) if (!(noPhoto && k === 'i')) c[k] = o[k];
    return location.origin + location.pathname + '#d=' + enc(c);
  }
  // ---------- קישור קצר ----------
  var API = 'https://kartis.gilad4049.workers.dev';
  try { API = localStorage.getItem('kartis-api') || API; } catch (e) {}
  var short = { key: '', url: '' }, useLong = false;
  function shortFor(o) { return !useLong && short.url && short.key === enc(o) ? short.url : ''; }
  // הקישור ששולחים: הקצר אם כבר יש לכרטיס הזה, אחרת הארוך (ל-QR ולאנשי קשר – הארוך בלי התמונה)
  function best(o, noPhoto) { return shortFor(o) || link(o, noPhoto); }
  function getShort(o, ms) {
    var key = enc(o);
    if (short.key === key && short.url) return Promise.resolve(short.url);
    if (!window.fetch) return Promise.resolve('');
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms || 6000);
    return fetch(API + '/s', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ d: key, t: 'm' }), signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        clearTimeout(t);
        if (!j || !/^[0-9A-Za-z]{7}$/.test(j.k)) return '';
        short = { key: key, url: location.origin + '/k/#' + j.k };
        return short.url;
      })
      .catch(function () { clearTimeout(t); return ''; });
  }
  function waText(o) { return 'שלום' + (o.n ? ' ' + o.n : '') + ', הגעתי מהכרטיס שלך ואשמח לשאול על ברית מילה.'; }

  function vcard(o) {
    var v = ['BEGIN:VCARD', 'VERSION:3.0', 'FN;CHARSET=UTF-8:' + o.n + ' – מוהל', 'N;CHARSET=UTF-8:;' + o.n + ' – מוהל;;;'];
    if (o.s) v.push('TITLE;CHARSET=UTF-8:' + o.s);
    if (o.p) v.push('TEL;TYPE=CELL,VOICE:+' + intl(o.p));
    if (o.a) v.push('ADR;CHARSET=UTF-8;TYPE=WORK:;;;' + o.a + ';;;ישראל');
    v.push('URL:' + best(o, true));
    var note = [o.s, o.u ? o.u.join(', ') : '', o.t].filter(Boolean).join(' · ');
    if (note) v.push('NOTE;CHARSET=UTF-8:' + note);
    if (o.i && o.i.indexOf('data:image/jpeg;base64,') === 0) v.push('PHOTO;ENCODING=b;TYPE=JPEG:' + o.i.slice(23));
    v.push('END:VCARD');
    return v.join('\r\n');
  }

  function render(o) {
    var h = '<div class="km"><span class="bsd">בס"ד</span>';
    if (o.i) h += '<img class="km-ph" alt="" src="' + esc(o.i) + '">';
    h += '<h2>' + esc(o.n) + '</h2>';
    if (o.s) h += '<p class="km-sm">' + esc(o.s) + '</p>';
    if (o.a) h += '<p class="km-area">📍 ' + esc(o.a) + '</p>';
    if (o.u && o.u.length) h += '<div class="km-nus">' + o.u.map(function (x) { return '<span>' + esc(x) + '</span>'; }).join('') + '</div>';
    if (o.t) h += '<p class="km-note">' + esc(o.t) + '</p>';
    h += '<div class="km-btns">';
    if (o.p) h += '<a class="btn btn-gold" data-km="call" href="tel:+' + intl(o.p) + '">📞 להתקשר</a><a class="btn btn-gold" data-km="wa" href="https://wa.me/' + intl(o.p) + '?text=' + encodeURIComponent(waText(o)) + '">💬 ווטסאפ</a>';
    h += '<button class="btn btn-line km-wide" type="button" data-km="vcf">👤 לשמור באנשי הקשר</button></div>';
    h += '<button class="km-share" type="button" data-km="share">↗️ לשתף את הכרטיס</button>';
    h += '<p class="km-credit"><a href="' + CREDIT_URL + '">' + CREDIT + '</a></p></div>';
    view.innerHTML = h;
    view.hidden = false;
    view._o = o;
    view._url = '';
  }

  view.addEventListener('click', function (e) {
    var b = e.target.closest('[data-km]');
    if (!b) return;
    var o = view._o, k = b.getAttribute('data-km');
    ev('kartis_mohel_click', { btn: k });
    if (k === 'vcf') {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([vcard(o)], { type: 'text/vcard;charset=utf-8' }));
      a.download = (o.n || 'mohel').replace(/[\\/:*?"<>|]/g, '') + ' - מוהל.vcf';
      document.body.appendChild(a); a.click(); a.remove();
    } else if (k === 'share') {
      var url = view._url || best(o), text = o.n + (o.s ? ' · ' + o.s : '') + (o.a ? ' · ' + o.a : '');
      if (navigator.share) navigator.share({ title: o.n, text: text, url: url }).catch(function () {});
      else (window.kelimShort ? window.kelimShort.go('https://api.whatsapp.com/send?text=' + encodeURIComponent(text + '\n' + url)) : (location.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(text + '\n' + url)));
    }
  });

  // ---------- תמונת הכרטיס עם QR ----------
  var qrCache = { text: null, img: null }, phImg = null;
  function qrImage(text) {
    if (!window.QRCode || !text) return null;
    if (qrCache.text === text) return qrCache.img;
    var div = document.createElement('div');
    new window.QRCode(div, { text: text, width: 600, height: 600, correctLevel: window.QRCode.CorrectLevel.M });
    qrCache = { text: text, img: div.querySelector('canvas') || div.querySelector('img') };
    return qrCache.img;
  }
  function loadPh(src, cb) { if (!src) { phImg = null; cb(); return; } var im = new Image(); im.onload = function () { phImg = im; cb(); }; im.src = src; }
  var current = {};
  var card = window.KCard && $('km-canvas') ? window.KCard.init({
    form: 'km-imgform', canvas: 'km-canvas', key: 'kodesh-kartis-mohel-img', tool: 'kartis_mohel', theme: 'night', printSize: 'a5',
    keep: ['theme', 'size'], foot: false,
    ids: { share: 'km-share', dl: 'km-dl', tip: 'km-tip', print: 'km-print' },
    valid: function () { if (current.n && current.p) return true; form.reportValidity(); form.scrollIntoView({ behavior: 'smooth' }); return false; },
    fname: function () { return 'כרטיס-' + (current.n || 'מוהל'); },
    text: function () { return current.n ? current.n + ' · ' + (current.s || 'מוהל') + '\n' + best(current, true) : ''; },
    draw: function (api, th, W, H, M) {
      var ctx = api.ctx, o = current, tall = H > W * 1.2, pad = 18;
      function photoAt(cx, cy, r) {
        if (!phImg) return;
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(phImg, cx - r, cy - r, r * 2, r * 2); ctx.restore();
        ctx.strokeStyle = th.frame; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      }
      function qrAt(qx, qy, qs, cap) {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(qx - pad, qy - pad, qs + 2 * pad, qs + 2 * pad);
        ctx.strokeStyle = th.frame; ctx.lineWidth = 3; ctx.strokeRect(qx - pad, qy - pad, qs + 2 * pad, qs + 2 * pad);
        var img = o.n ? qrImage(best(o, true)) : null;
        if (img) { ctx.imageSmoothingEnabled = false; ctx.drawImage(img, qx, qy, qs, qs); }
        else { ctx.fillStyle = '#888'; ctx.font = '400 26px ' + api.SANS; ctx.textAlign = 'center'; ctx.fillText('כאן יופיע הקוד', qx + qs / 2, qy + qs / 2); }
        ctx.textAlign = 'center'; ctx.fillStyle = th.sub; ctx.font = '600 ' + cap + 'px ' + api.SANS;
        ctx.fillText('סורקים ושומרים איש קשר', qx + qs / 2, qy + qs + pad + cap * 1.4);
      }
      function lines(sc) {
        return [
          [o.n || 'משה כהן', '700', 92 * sc, 'serif', th.title, 14 * sc],
          [o.s || 'מוהל מוסמך', '600', 46 * sc, 'sans', th.sub, 14 * sc],
          o.a ? [o.a, '400', 40 * sc, 'sans', th.text, 10 * sc] : null,
          o.u && o.u.length ? [o.u.join(' · '), '400', 34 * sc, 'sans', th.text, 14 * sc] : null,
          o.t ? [o.t, '400', 40 * sc, 'serif', th.text, 18 * sc] : null,
          [o.p || '050-0000000', '700', 66 * sc, 'sans', th.title, 0]
        ];
      }
      if (tall) {
        var qs = Math.round(W * 0.42), qy = H - M - 100 - qs - pad, qx = (W - qs) / 2, top = M + 70;
        if (phImg) { photoAt(W / 2, top + 120, 120); top += 260; }
        api.stack(lines(1.25), W, top, qy - pad - 40, W - 2 * M - 100);
        qrAt(qx, qy, qs, 36);
      } else {
        // ריבוע: הפרטים מימין, הקוד משמאל
        var qs2 = 340, qx2 = M + 50, colL = qx2 + qs2 + pad + 50, colR = W - M - 40, cx = (colL + colR) / 2;
        var t2 = M + 50, b2 = H - M - 70;
        if (phImg) { photoAt(cx, t2 + 85, 85); t2 += 190; }
        api.stack(lines(0.78), cx * 2, t2, b2, colR - colL);
        qrAt(qx2, (H - qs2) / 2 - 20, qs2, 30);
      }
      ctx.textAlign = 'center'; ctx.fillStyle = th.foot; ctx.font = '400 ' + (tall ? 26 : 21) + 'px ' + api.SANS;
      ctx.fillText(CREDIT + ' · hakelim.com', W / 2, H - M - 24);
    }
  }) : null;
  function redraw() { var f = $('km-imgform'); if (f) f.dispatchEvent(new Event('input')); }

  // ---------- מצב כרטיס: הגיעו מקישור ----------
  function showCard(o, url, how) {
    if (!o || !o.n) throw new Error('empty');
    render(o);
    if (url) view._url = url;
    builder.hidden = true;
    $('km-img').hidden = true;
    $('km-mine').hidden = false;
    document.body.classList.add('km-view');
    document.title = o.n + ' · ' + (o.s || 'מוהל') + ' – כרטיס ביקור';
    ev('kartis_mohel_open', { has_photo: !!o.i, link: how });
  }
  var m = location.hash.match(/#d=([\w-]+)/);
  if (m) {
    try { showCard(dec(m[1]), '', 'long'); return; } catch (e) { /* קישור פגום – ממשיכים לבנייה */ }
  }
  var mk = location.hash.match(/#k=([0-9A-Za-z]{7})/);
  if (mk) {
    builder.hidden = true;
    $('km-img').hidden = true;
    document.body.classList.add('km-view');
    view.hidden = false;
    view.innerHTML = '<p class="km-note" style="text-align:center;padding:2rem 0">פותחים את הכרטיס…</p>';
    fetch(API + '/s/' + mk[1]).then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (j) { showCard(dec(j.d), location.origin + '/k/#' + mk[1], 'short'); })
      .catch(function () {
        view.innerHTML = '<p class="km-note" style="text-align:center;padding:2rem 0">לא הצלחנו לפתוח את הכרטיס. בדקו שיש אינטרנט ונסו שוב, או בקשו מהמוהל קישור חדש.</p>';
        $('km-mine').hidden = false;
      });
    return;
  }

  // ---------- מצב בנייה: מה שמקלידים נשמר בטלפון, והתצוגה מתעדכנת ----------
  var KEY = 'kodesh-kartis-mohel';
  try {
    var s = JSON.parse(localStorage.getItem(KEY) || '{}');
    ['name', 'smicha', 'phone', 'area', 'note'].forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && s[k] !== undefined) el.value = s[k]; });
    if (s.u) [].forEach.call(form.querySelectorAll('[name=nusach]'), function (c) { c.checked = s.u.indexOf(c.value) > -1; });
    if (s.i) photo = s.i;
  } catch (e) {}
  function upd() {
    var o = read(), st = { u: o.u || [], i: photo };
    ['name', 'smicha', 'phone', 'area', 'note'].forEach(function (k) { st[k] = form.querySelector('[name=' + k + ']').value; });
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {}
    $('km-photo-clear').hidden = !photo;
    current = o;
    if (o.n) render(o); else view.hidden = true;
    loadPh(photo, redraw);
  }
  form.addEventListener('input', upd);
  form.addEventListener('change', upd);
  upd();
  window.addEventListener('load', redraw); // הספרייה של ה-QR נטענת אחרי הקוד הזה

  // תמונה או לוגו: חותכים לריבוע קטן (160 פיקסלים), כדי שהקישור לא יתנפח
  $('km-photo').addEventListener('change', function () {
    var f = this.files && this.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var im = new Image();
      im.onload = function () {
        var S = 160, c = document.createElement('canvas'), x = c.getContext('2d'), side = Math.min(im.width, im.height);
        c.width = c.height = S; x.fillStyle = '#fff'; x.fillRect(0, 0, S, S);
        x.drawImage(im, (im.width - side) / 2, (im.height - side) / 2, side, side, 0, 0, S, S);
        photo = c.toDataURL('image/jpeg', 0.7);
        upd();
      };
      im.src = r.result;
    };
    r.readAsDataURL(f);
  });
  $('km-photo-clear').addEventListener('click', function () { photo = ''; $('km-photo').value = ''; upd(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var o = read(), btn = form.querySelector('[type=submit]');
    btn.disabled = true;
    (useLong ? Promise.resolve('') : getShort(o)).then(function (s) {
      btn.disabled = false;
      showLink(o, s);
      $('km-ready').scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (window.toolUsed) window.toolUsed('kartis_mohel', { how: 'link', has_photo: !!o.i, nusach: (o.u || []).length, short: !!s });
    });
  });
  function showLink(o, s) {
    var url = s || link(o);
    $('km-link').value = url;
    $('km-ready').hidden = false;
    $('km-open').href = url;
    $('km-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent('הכרטיס שלי: ' + o.n + ' · ' + (o.s || 'מוהל') + '\n' + url);
    $('km-kind').textContent = s ? 'זה הקישור הקצר. הכרטיס נשמר אצלי רק כדי שהקישור יפתח אותו, ואפשר לבקש ממני למחוק בכל עת.' : (useLong ? 'זה הקישור הארוך: הפרטים יושבים בתוך הקישור, ולא נשמרים אצלי.' : 'הפעם יצא קישור ארוך (לא הייתה תשובה מהשרת). הוא עובד בדיוק אותו דבר.');
    $('km-long').textContent = useLong ? 'לחזור לקישור הקצר' : 'מעדיפים קישור ארוך, בלי שמירה אצלי?';
    redraw();
  }
  $('km-long').addEventListener('click', function () {
    useLong = !useLong;
    form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event('submit', { cancelable: true }));
  });
  // לפני הורדה, שיתוף או הדפסה של התמונה: דואגים שה-QR יוביל לקישור הקצר (עד 3.5 שניות, אחרת הארוך)
  ['km-share', 'km-dl', 'km-print'].forEach(function (id) {
    var b = $(id);
    if (!b) return;
    b.addEventListener('click', function (e) {
      if (useLong || !current.n || !current.p || shortFor(current) || b._again) { b._again = false; return; }
      e.preventDefault(); e.stopImmediatePropagation();
      b.disabled = true;
      getShort(current, 3500).then(function () { b.disabled = false; redraw(); b._again = true; b.click(); });
    }, true);
  });
  $('km-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText($('km-link').value) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }).catch(function () { $('km-link').select(); });
  });
})();
