// R9 – דף לבית הכנסת (כלי קודש). כמו כרטיס הביקור: הפרטים יושבים בקישור (אחרי #), לא בשרת.
// בנוסף: QR לקישור, ושלט A4 להדפסה לכניסה לבית הכנסת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('bk-form'), view = $('bk-card'), builder = $('bk-build');
  if (!form) return;
  var F = ['name', 'nusach', 'addr', 'times', 'shiur', 'gname', 'gphone', 'rav', 'note'];

  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(decodeURIComponent(escape(atob(s)))); }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function intl(p) { p = String(p || '').replace(/[^\d+]/g, ''); if (p.indexOf('+') === 0) return p.slice(1); if (p.indexOf('0') === 0) return '972' + p.slice(1); return p; }
  function read() { var o = {}; F.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && el.value.trim()) o[k] = el.value.trim(); }); return o; }
  function link(o) { return location.origin + location.pathname + '#d=' + enc(o); }
  function list(t) { return '<ul>' + t.split('\n').filter(function (l) { return l.trim(); }).map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul>'; }

  function qr(el, url, size) {
    el.innerHTML = '';
    if (!window.QRCode) { el.textContent = ''; return false; }
    new window.QRCode(el, { text: url, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.L });
    return true;
  }

  function render(o) {
    var h = '<div class="bk"><span class="bsd">בס"ד</span><h2>' + esc(o.name) + '</h2>' +
      (o.nusach ? '<p class="bk-sub">' + esc(o.nusach) + '</p>' : '') +
      (o.rav ? '<p class="bk-addr">רב בית הכנסת: ' + esc(o.rav) + '</p>' : '') + '<div class="bk-btns">';
    if (o.addr) h += '<a class="btn btn-gold" href="https://waze.com/ul?q=' + encodeURIComponent(o.addr) + '&navigate=yes">🧭 ניווט בוויז</a><a class="btn btn-line" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.addr) + '">🗺️ גוגל מפות</a>';
    if (o.gphone) h += '<a class="btn btn-gold" href="https://wa.me/' + intl(o.gphone) + '">💬 ווטסאפ לגבאי</a><a class="btn btn-line" href="tel:+' + intl(o.gphone) + '">📞 להתקשר לגבאי</a>';
    h += '<button class="btn btn-line" type="button" data-bk="share">↗️ לשתף את הדף</button><button class="btn btn-line" type="button" data-bk="print">🖨️ שלט עם QR</button></div>';
    if (o.addr) h += '<p class="bk-addr">📍 ' + esc(o.addr) + '</p>';
    if (o.times) h += '<div class="bk-box"><h3>זמני תפילות</h3>' + list(o.times) + '</div>';
    if (o.shiur) h += '<div class="bk-box"><h3>שיעורים</h3>' + list(o.shiur) + '</div>';
    if (o.gname || o.gphone) h += '<p class="bk-note">הגבאי: ' + esc(o.gname || '') + (o.gphone ? ' · <span dir="ltr">' + esc(o.gphone) + '</span>' : '') + '</p>';
    if (o.note) h += '<p class="bk-note">' + esc(o.note) + '</p>';
    h += '<p class="bk-credit">דף חינמי מ<a href="/kodesh/beit-knesset/">כלי קודש</a> · רוצים כזה לבית הכנסת שלכם? בונים תוך שתי דקות</p></div>';
    view.innerHTML = h;
    view.hidden = false;
    view._o = o;
  }

  function sign(o) {
    var s = $('bk-sign'), url = link(o);
    s.innerHTML = '<p class="small">בס"ד</p><h2>' + esc(o.name) + '</h2>' + (o.nusach ? '<p>' + esc(o.nusach) + '</p>' : '') +
      '<p>זמני תפילות, שיעורים וקשר עם הגבאי</p><div class="qrbig" id="bk-qr-big"></div><p><b>סורקים במצלמה של הטלפון</b></p>' +
      (o.gphone ? '<p>גבאי' + (o.gname ? ': ' + esc(o.gname) : '') + ' · <span dir="ltr">' + esc(o.gphone) + '</span></p>' : '') +
      '<p class="small">נבנה בחינם בכלי קודש · gilad-rachamim.github.io/kodesh</p>';
    qr($('bk-qr-big'), url, 300);
  }
  function printSign(o) {
    sign(o);
    if (window.toolUsed) window.toolUsed('beit_knesset', { action: 'print_sign' });
    setTimeout(function () { window.print(); }, 300);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-bk]');
    if (!b) return;
    var o = view._o || read(), k = b.getAttribute('data-bk');
    if (!o.name) return;
    if (k === 'print') printSign(o);
    else if (k === 'share') {
      var url = link(o);
      if (navigator.share) navigator.share({ title: o.name, text: o.name, url: url }).catch(function () {});
      else location.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(o.name + ' – זמני תפילות ושיעורים\n' + url);
    }
  });

  // מצב דף: הגיעו מקישור
  var m = location.hash.match(/#d=([\w-]+)/);
  if (m) {
    try {
      var o = dec(m[1]);
      render(o);
      builder.hidden = true;
      document.title = o.name + ' – זמני תפילות ושיעורים';
      $('bk-mine').hidden = false;
      return;
    } catch (e) { /* קישור פגום – ממשיכים לבנייה */ }
  }

  try { var saved = JSON.parse(localStorage.getItem('kodesh-bk') || '{}'); F.forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el && saved[k]) el.value = saved[k]; }); } catch (e) {}
  function upd() {
    var o = read();
    try { localStorage.setItem('kodesh-bk', JSON.stringify(o)); } catch (e) {}
    if (o.name) render(o); else view.hidden = true;
  }
  form.addEventListener('input', upd);
  upd();
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var o = read(), url = link(o);
    $('bk-link').value = url;
    $('bk-ready').hidden = false;
    $('bk-open').href = url;
    $('bk-wa').href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(o.name + ' – זמני תפילות ושיעורים\n' + url);
    qr($('bk-qr-small'), url, 160);
    $('bk-ready').scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (window.toolUsed) window.toolUsed('beit_knesset', { has_times: !!o.times, has_shiur: !!o.shiur, has_gabai: !!o.gphone });
  });
  $('bk-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText($('bk-link').value) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }).catch(function () { $('bk-link').select(); });
  });
})();
