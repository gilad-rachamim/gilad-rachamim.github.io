// דף הגימטריה באנגלית (/kodesh/gimatria/en/): מקלדת עברית על המסך, לחיצה על מילה בטבלאות, וערך אותיות אנגליות (A=1 … Z=26).
// רץ לפני assets/kodesh-gimatria.js (המנוע המשותף); מדבר איתו רק דרך שדה gm-t ואירוע input.
(function () {
  'use strict';
  var L = window.GM_L || (window.GM_L = {});
  function box() { return document.getElementById('gm-t'); }
  function push(t) {
    var ta = box(); if (!ta) return;
    ta.value = t; ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  // ערך באותיות אנגליות – שורה נפרדת, רק כשהוקלדו אותיות לטיניות
  L.onText = function (t) {
    var el = document.getElementById('gx-enl'); if (!el) return;
    var s = 0, n = 0, m = String(t || '').toUpperCase().match(/[A-Z]/g) || [];
    m.forEach(function (c) { s += c.charCodeAt(0) - 64; n++; });
    if (!n) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.textContent = 'English letters (A = 1 … Z = 26): ' + s + '. Gematria is a Hebrew system – for the traditional value, write the word in Hebrew with the keyboard above.';
  };
  document.addEventListener('click', function (e) {
    var k = e.target.closest('#gx-kb button[data-k]');
    if (k) {
      var ta = box(); if (!ta) return;
      var c = k.getAttribute('data-k'), v = ta.value;
      var a = typeof ta.selectionStart === 'number' && document.activeElement === ta ? ta.selectionStart : v.length;
      var b = typeof ta.selectionEnd === 'number' && document.activeElement === ta ? ta.selectionEnd : v.length;
      if (c === 'bk') { if (a === b && a > 0) a--; ta.value = v.slice(0, a) + v.slice(b); }
      else { ta.value = v.slice(0, a) + c + v.slice(b); a += c.length; }
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }
    var w = e.target.closest('.gx-try[data-w]');
    if (w) {
      push(w.getAttribute('data-w'));
      var ta2 = box(); if (ta2) ta2.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
})();
