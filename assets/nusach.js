// דפי הנוסחים והברכות: כפתור העתקה וכפתור ווטסאפ ליד כל נוסח.
// הטקסט נלקח מה-<pre> שבאותו בלוק. בלי JavaScript – מסמנים ומעתיקים ביד.
(function () {
  function ev(name, params) { if (window.gtag) window.gtag('event', name, params || {}); }
  function text(btn) {
    var box = btn.closest('.nusach');
    var pre = box && box.querySelector('pre');
    return pre ? pre.textContent.trim() : '';
  }
  function flash(btn, msg) {
    var old = btn.innerHTML;
    btn.textContent = msg;
    setTimeout(function () { btn.innerHTML = old; }, 1800);
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-copy],[data-wa]');
    if (!btn) return;
    var t = text(btn);
    if (!t) return;
    var box = btn.closest('.nusach');
    var id = box ? box.id : '';
    if (btn.hasAttribute('data-wa')) {
      ev('nusach_whatsapp', { id: id, page: location.pathname });
      window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank', 'noopener');
      return;
    }
    e.preventDefault();
    ev('nusach_copy', { id: id, page: location.pathname });
    var done = function () { flash(btn, 'הועתק ✓'); };
    var fallback = function () {
      var ta = document.createElement('textarea');
      ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (err) {}
      ta.remove(); done();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, fallback);
    else fallback();
  });
})();
