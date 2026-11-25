// קישור וואטסאפ עם הודעה מוכנה + QR + שלט להדפסה (כלים לעסק קטן). הכול בדפדפן, שום דבר לא נשמר בשרת.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('hz-form'); if (!form) return;
  var color = '#1f7d4f', last = null;
  function used(a, x) { if (window.toolUsed) window.toolUsed('esek_hazmana', Object.assign({ action: a }, x || {})); }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function intl(p) { p = String(p || '').replace(/[^\d+]/g, ''); if (p.indexOf('+') === 0) return p.slice(1); if (p.indexOf('00') === 0) return p.slice(2); if (p.indexOf('0') === 0) return '972' + p.slice(1); return p; }
  function lum(hex) { var n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function qr(el, url, size) {
    el.innerHTML = '';
    if (!window.QRCode) { el.innerHTML = '<p style="color:#900;padding:.5rem">הקוד לא נטען. אפשר לשלוח את הקישור.</p>'; return; }
    try { new window.QRCode(el, { text: url, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.M }); } catch (e) { el.innerHTML = '<p style="color:#900;padding:.5rem">ההודעה ארוכה מדי ל-QR. קצרו אותה.</p>'; }
  }
  function setColor(v) { color = v; $('hz-pick').value = v; [].forEach.call($('hz-colors').querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-c') === v)); }); }
  $('hz-colors').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setColor(b.getAttribute('data-c')); });
  $('hz-pick').addEventListener('input', function () { setColor(this.value); });
  $('hz-ideas').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) { $('hz-msg').value = b.getAttribute('data-m'); used('idea'); } });

  var q = new URLSearchParams(location.search);
  if (q.get('n')) $('hz-name').value = q.get('n').slice(0, 60);
  if (q.get('p')) $('hz-phone').value = q.get('p').slice(0, 20);
  if (q.get('c') && /^[0-9a-f]{6}$/i.test(q.get('c'))) setColor('#' + q.get('c').toLowerCase());
  if (!$('hz-msg').value) $('hz-msg').value = 'שלום, אשמח להזמין:';

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var num = intl($('hz-phone').value);
    if (!/^\d{9,15}$/.test(num)) { $('hz-phone').setCustomValidity('כתבו מספר טלפון תקין'); $('hz-phone').reportValidity(); $('hz-phone').setCustomValidity(''); return; }
    var msg = $('hz-msg').value.trim();
    var url = 'https://wa.me/' + num + (msg ? '?text=' + encodeURIComponent(msg) : '');
    last = { url: url, name: $('hz-name').value.trim(), phone: $('hz-phone').value.trim() };
    $('hz-link').value = url; $('hz-test').href = url;
    qr($('hz-qr'), url, 220);
    $('hz-ready').hidden = false;
    $('hz-ready').scrollIntoView({ behavior: 'smooth', block: 'start' });
    used('create', { len: msg.length });
  });
  $('hz-copy').addEventListener('click', function () {
    var b = this; (navigator.clipboard ? navigator.clipboard.writeText($('hz-link').value) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; used('copy'); }).catch(function () { $('hz-link').select(); });
  });
  $('hz-test').addEventListener('click', function () { used('test'); });
  $('hz-print').addEventListener('click', function () {
    if (!last) return;
    var on = lum(color) > 0.42 ? '#111' : '#fff';
    var s = $('hz-sign'); if (s.parentNode !== document.body) document.body.appendChild(s);
    var one = '<div class="half" style="border:3mm solid ' + color + '"><h2 style="background:' + color + ';color:' + on + '">' + (last.name ? esc(last.name) : 'דברו איתנו') + '</h2><p><b>הזמנות ושאלות בוואטסאפ</b></p><div class="qrbig"></div><p>סורקים במצלמה ופותחים צ\'אט</p>' + (last.phone ? '<p dir="ltr">' + esc(last.phone) + '</p>' : '') + '<p class="small">נבנה בחינם בכלים לעסק קטן · hakelim.com/esek</p></div>';
    s.innerHTML = one + one;
    [].forEach.call(s.querySelectorAll('.qrbig'), function (el) { qr(el, last.url, 600); });
    document.body.classList.add('print-hz'); used('print_sign');
    setTimeout(function () { window.print(); }, 300);
  });
  window.addEventListener('afterprint', function () { document.body.classList.remove('print-hz'); });
})();
