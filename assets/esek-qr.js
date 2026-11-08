// Y9 – QR מעוצב (כלים לעסק קטן): קישור, ווטסאפ, טלפון, וויפיי או טקסט → קוד עם כותרת, לתמונה ולהדפסה.
// הקוד עצמו: אותה ספרייה של דף בית הכנסת (qrcodejs). המסגרת, השמירה וההדפסה: kcard.js.
(function () {
  'use strict';
  if (!window.KCard) return;
  var $ = function (id) { return document.getElementById(id); };
  var form = $('qr-form'), typeEl = $('qr-type'), err = $('qr-err');
  var T = window.KCard.THEMES;
  // אם דף המבצע לא נטען, מוסיפים כאן את העיצובים שחסרים (אותם צבעים)
  if (!T.tomato) T.tomato = { bg1: '#8e1b16', bg2: '#c4361f', frame: '#ffd66b', title: '#fff3c4', text: '#ffffff', sub: '#ffd66b', foot: '#ffd2c6' };
  if (!T.fresh) T.fresh = { bg1: '#0f4d31', bg2: '#1f7d4f', frame: '#f6dc74', title: '#fff6c9', text: '#f3fbf4', sub: '#f6dc74', foot: '#bfe3cb' };
  if (!T.coffee) T.coffee = { bg1: '#2a1a12', bg2: '#4d3021', frame: '#d9a066', title: '#f3d2a2', text: '#f7ece0', sub: '#d9a066', foot: '#c2a78a' };
  if (!T.sunny) T.sunny = { bg1: '#fff3c2', bg2: '#ffd45e', frame: '#b23a1c', title: '#9e2a12', text: '#2b1a0e', sub: '#b23a1c', foot: '#6b4a2e' };
  var TITLES = { link: 'סורקים ונכנסים', wa: 'כתבו לנו בווטסאפ', tel: 'התקשרו אלינו', wifi: 'וויפיי לאורחים', text: '' };
  var SUBS = { link: 'סורקים במצלמה של הטלפון', wa: 'סורקים במצלמה, וההודעה נפתחת', tel: 'סורקים במצלמה, והשיחה מוכנה', wifi: 'סורקים במצלמה ומתחברים', text: 'סורקים במצלמה של הטלפון' };

  function intl(p) { p = String(p || '').replace(/[^\d+]/g, ''); if (p.indexOf('+') === 0) return p.slice(1); if (p.indexOf('0') === 0) return '972' + p.slice(1); return p; }
  function wesc(s) { return String(s).replace(/([\\;,:"])/g, '\\$1'); }
  function data(v) {
    var t = v('type');
    if (t === 'link') { var u = v('url'); if (!u) return ''; return /^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u; }
    if (t === 'wa') { var p = intl(v('phone')); if (p.length < 9) return ''; return 'https://wa.me/' + p + (v('msg') ? '?text=' + encodeURIComponent(v('msg')) : ''); }
    if (t === 'tel') { var q = intl(v('phone')); return q.length < 9 ? '' : 'tel:+' + q; }
    if (t === 'wifi') { if (!v('ssid')) return ''; var sec = v('sec') || 'WPA'; return 'WIFI:T:' + sec + ';S:' + wesc(v('ssid')) + ';' + (sec === 'nopass' ? '' : 'P:' + wesc(v('pass')) + ';') + ';'; }
    return v('text');
  }

  // הקוד נוצר בקנבס נסתר, ונשמר עד שהתוכן משתנה
  var hold = document.createElement('div'), cache = { key: null, cv: null };
  hold.style.display = 'none'; hold.setAttribute('aria-hidden', 'true');
  document.body.appendChild(hold);
  function make(text) {
    if (cache.key === text) return cache.cv;
    hold.innerHTML = ''; cache.key = text; cache.cv = null;
    if (!window.QRCode || !text) return null;
    try {
      new window.QRCode(hold, { text: text, width: 1024, height: 1024, colorDark: '#000000', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
      cache.cv = hold.querySelector('canvas');
      err.hidden = true;
    } catch (e) { err.textContent = 'הטקסט ארוך מדי בשביל קוד אחד. כדאי לקצר.'; err.hidden = false; }
    return cache.cv;
  }
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  // סוג הקוד: כפתורים למעלה מחליפים את השדות
  function setType(t) {
    typeEl.value = t;
    [].forEach.call(form.querySelectorAll('[data-qt]'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-qt') === t ? 'true' : 'false'); });
    [].forEach.call(form.querySelectorAll('[data-qf]'), function (f) { f.hidden = f.getAttribute('data-qf').split(' ').indexOf(t) < 0; });
    var ti = $('qr-title'), su = $('qr-sub');
    ti.placeholder = TITLES[t] || 'כותרת'; su.placeholder = SUBS[t];
  }
  form.addEventListener('click', function (e) {
    var b = e.target.closest('[data-qt]'); if (!b) return;
    setType(b.getAttribute('data-qt'));
    form.dispatchEvent(new Event('change'));
  });
  $('qr-showpass').addEventListener('change', function () { form.dispatchEvent(new Event('change')); });

  // הגיעו מהתפריט הדיגיטלי: #u=<קישור>&t=<שם העסק>
  var hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get('u')) {
    try { localStorage.setItem('esek-qr', JSON.stringify({ type: 'link', url: hp.get('u'), title: 'התפריט שלנו', sub: (hp.get('t') ? hp.get('t') + ' · ' : '') + 'סורקים במצלמה של הטלפון', theme: 'white', size: 'a5' })); } catch (e) {}
    history.replaceState(null, '', location.pathname);
  }

  var k = window.KCard.init({
    form: 'qr-form', canvas: 'qr-canvas', key: 'esek-qr', tool: 'esek_qr', theme: 'white', bsd: false, printSize: 'a5',
    keep: ['type', 'url', 'phone', 'msg', 'ssid', 'sec', 'text', 'title', 'sub', 'theme', 'size'],
    ids: { dl: 'qr-dl', share: 'qr-share', print: 'qr-print', tip: 'qr-tip' },
    valid: function (k) { return !!data(k.val); },
    fname: function (k) { return 'QR-' + (k.val('title') || TITLES[k.val('type')] || 'קוד'); },
    text: function (k) { return data(k.val); },
    onChange: function () { form.querySelector('[name=foot]').value = 'נוצר בחינם · כלים לעסק קטן'; },
    draw: function (k, th, W, H, M) {
      var ctx = k.ctx, v = k.val, t = v('type'), d = data(v), tall = H > W * 1.3;
      var title = v('title') || TITLES[t] || '', sub = v('sub') || SUBS[t];
      var S = Math.round(Math.min(W, H) * (tall ? 0.62 : 0.5)), pad = Math.round(S * 0.07);
      var cy = tall ? H * 0.5 : H * 0.54, x = (W - S) / 2, y = cy - S / 2;
      k.stack([[title || null, '700', tall ? 112 : 80, 'serif', th.title, 0]], W, M + (tall ? 70 : 30), y - pad - (tall ? 40 : 24), W - 2 * M - 80);
      // כרטיס לבן מתחת לקוד: הקוד תמיד שחור על לבן, כדי שכל טלפון יסרוק
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 8;
      rrect(ctx, x - pad, y - pad, S + 2 * pad, S + 2 * pad, pad * 0.9); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.restore();
      ctx.strokeStyle = th.frame; ctx.lineWidth = 4; rrect(ctx, x - pad, y - pad, S + 2 * pad, S + 2 * pad, pad * 0.9); ctx.stroke();
      var q = make(d);
      if (q) { ctx.imageSmoothingEnabled = false; ctx.drawImage(q, x, y, S, S); ctx.imageSmoothingEnabled = true; }
      else { ctx.fillStyle = '#9a968c'; ctx.font = '600 40px ' + k.SANS; ctx.textAlign = 'center'; ctx.fillText(d ? 'הקוד ארוך מדי' : 'כאן יופיע הקוד', W / 2, cy); }
      var extra = [];
      if (t === 'wifi' && v('ssid')) { extra.push(['רשת: ' + v('ssid'), '700', tall ? 60 : 34, 'sans', th.text, 8]); if ($('qr-showpass').checked && v('pass') && v('sec') !== 'nopass') extra.push(['סיסמה: ' + v('pass'), '700', tall ? 60 : 34, 'sans', th.text, 8]); }
      if ((t === 'wa' || t === 'tel') && v('phone')) extra.push([v('phone'), '700', tall ? 64 : 38, 'sans', th.text, 8]);
      k.stack([[sub || null, '600', tall ? 58 : 36, 'sans', th.sub, 14]].concat(extra), W, y + S + pad + (tall ? 36 : 20), H - M - (H < 800 ? 50 : 80), W - 2 * M - 80);
    }
  });
  try { var st = JSON.parse(localStorage.getItem('esek-qr') || '{}'); setType(st.type || 'link'); } catch (e) { setType('link'); }
  if (k) form.dispatchEvent(new Event('change'));
  // הספרייה של הקוד נטענת מהרשת: כשהיא מוכנה, מציירים שוב
  if (!window.QRCode) { var tries = 0, iv = setInterval(function () { if (window.QRCode || ++tries > 40) { clearInterval(iv); cache.key = null; form.dispatchEvent(new Event('change')); } }, 150); }
})();
