/* מחולל קישור לוואטסאפ: הכול נעשה בדפדפן, שום מספר לא נשלח לשום מקום */
(function () {
  var tel = document.getElementById('kw-tel'), msg = document.getElementById('kw-msg'), cc = document.getElementById('kw-cc');
  if (!tel) return;
  var out = document.getElementById('kw-out'), link = document.getElementById('kw-link'), err = document.getElementById('kw-err');
  var bCopy = document.getElementById('kw-copy'), bOpen = document.getElementById('kw-open'), bHtml = document.getElementById('kw-html');
  function norm() {
    var d = tel.value.replace(/[^\d+]/g, ''), c = cc.value.replace(/\D/g, '') || '972';
    if (d.charAt(0) === '+') d = d.slice(1);
    else if (d.slice(0, 2) === '00') d = d.slice(2);
    else if (d.charAt(0) === '0') d = c + d.slice(1);
    else if (d.length && d.length <= 9) d = c + d;
    return d.replace(/\D/g, '');
  }
  function build() {
    var n = norm(), t = msg.value.trim();
    if (!tel.value.trim()) { out.hidden = true; err.textContent = ''; return ''; }
    if (n.length < 9 || n.length > 15) { out.hidden = true; err.textContent = 'המספר נראה קצר או ארוך מדי. בודקים שכתבתם את כל הספרות.'; return ''; }
    err.textContent = '';
    var u = 'https://wa.me/' + n + (t ? '?text=' + encodeURIComponent(t) : '');
    link.textContent = u; link.href = u; out.hidden = false; bOpen.href = u;
    return u;
  }
  function flash(b, txt) { var o = b.textContent; b.textContent = txt; setTimeout(function () { b.textContent = o; }, 1500); }
  [tel, msg, cc].forEach(function (e) { e.addEventListener('input', build); });
  bCopy.addEventListener('click', function () { var u = build(); if (u && navigator.clipboard) navigator.clipboard.writeText(u).then(function () { flash(bCopy, '✓ הקישור הועתק'); }); });
  bHtml.addEventListener('click', function () {
    var u = build(); if (!u || !navigator.clipboard) return;
    navigator.clipboard.writeText('<a href="' + u.replace(/&/g, '&amp;') + '" target="_blank" rel="noopener">שלחו לנו הודעה בוואטסאפ</a>').then(function () { flash(bHtml, '✓ הקוד הועתק'); });
  });
  [].forEach.call(document.querySelectorAll('#kw-quick button'), function (q) {
    q.addEventListener('click', function () { msg.value = q.dataset.t; build(); msg.focus(); });
  });
})();
