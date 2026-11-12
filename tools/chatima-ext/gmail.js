// ג׳ימייל: מוסיף כפתור "✍ למלא ולחתום" ליד כל קובץ PDF מצורף.
// ג׳ימייל שומר על כל קובץ מצורף מאפיין download_url בצורה "סוג:שם הקובץ:כתובת".
(function () {
  function b64(buf) {
    var bytes = new Uint8Array(buf), out = '', step = 0x8000;
    for (var i = 0; i < bytes.length; i += step) out += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
    return btoa(out);
  }
  function go(btn, url, name) {
    btn.disabled = true; btn.textContent = 'פותח…';
    function done(ok) { btn.disabled = false; btn.textContent = ok ? '✍ למלא ולחתום' : 'לא נפתח – להוריד ולבחור בכלי'; }
    // קודם מנסים מכאן (עם החיבור של ג׳ימייל), ואם לא – התוסף מביא את הקובץ בעצמו
    fetch(url, { credentials: 'include' }).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (buf) {
      if (String.fromCharCode.apply(null, new Uint8Array(buf.slice(0, 5))) !== '%PDF-') throw 0;
      chrome.runtime.sendMessage({ data: b64(buf), name: name }, function (r) { done(r && r.ok); });
    }).catch(function () {
      chrome.runtime.sendMessage({ open: url, name: name }, function (r) { done(r && r.ok); });
    });
  }
  function scan() {
    var els = document.querySelectorAll('[download_url]:not([data-hk-chatima])');
    for (var n = 0; n < els.length; n++) {
      var el = els[n]; el.setAttribute('data-hk-chatima', '1');
      var v = el.getAttribute('download_url') || '', i = v.indexOf(':https://');
      if (i < 0) continue;
      var head = v.slice(0, i), url = v.slice(i + 1), c = head.indexOf(':'), mime = head.slice(0, c), name = head.slice(c + 1);
      if (!/pdf/i.test(mime) && !/\.pdf$/i.test(name)) continue;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'hk-chatima'; b.textContent = '✍ למלא ולחתום';
      b.title = 'לפתוח את ' + name + ' בכלי החינמי למילוי וחתימה (hakelim.com)';
      b.addEventListener('click', (function (b, url, name) { return function (e) { e.preventDefault(); e.stopPropagation(); go(b, url, name); }; })(b, url, name));
      el.insertAdjacentElement('afterend', b);
    }
  }
  var t;
  new MutationObserver(function () { clearTimeout(t); t = setTimeout(scan, 400); }).observe(document.documentElement, { childList: true, subtree: true });
  scan();
})();
