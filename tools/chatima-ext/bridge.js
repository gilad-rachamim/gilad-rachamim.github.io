// רץ רק בדפי hakelim.com: לוקח את הקובץ שהתוסף שמר ומכניס אותו לכלי, בתוך הדפדפן.
// כלי החתימה: postMessage באותו חלון (כמו בגרסה 1). שאר הכלים: הקובץ נכנס לשדה בחירת הקבצים של הדף
// (המזהה שלו מגיע מ-tools.json), בדיוק כאילו המשתמש בחר אותו בעצמו.
(function () {
  var MAX_AGE = 5 * 60 * 1000;
  var path = location.pathname;
  function bytes(b) { var bin = atob(b), buf = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); return buf; }

  if (path === '/kelim/machshev/chatima/') {
    var sent = false;
    var send = function () {
      chrome.storage.local.get('pending', function (o) {
        var p = o && o.pending;
        if (!p || Date.now() - p.at > MAX_AGE) { if (p) chrome.storage.local.remove('pending'); return; }
        sent = true;
        window.postMessage({ type: 'hakelim-chatima-pdf', id: p.id, name: p.name, data: bytes(p.b64).buffer }, location.origin);
      });
    };
    window.addEventListener('message', function (e) {
      if (e.source !== window || !e.data) return;
      if (e.data.type === 'hakelim-chatima-ready' && !sent) send();
      if (e.data.type === 'hakelim-chatima-got') chrome.storage.local.remove('pending');
    });
    send();
    return;
  }

  chrome.storage.local.get('pendingFiles', function (o) {
    var p = o && o.pendingFiles;
    if (!p) return;
    if (Date.now() - p.at > MAX_AGE) { chrome.storage.local.remove('pendingFiles'); return; }
    if (p.u !== path || !/^[a-z][a-z0-9-]*$/.test(p.input || '')) return;
    var tries = 0;
    (function put() {
      var inp = document.getElementById(p.input);
      if (!inp) { if (++tries < 40) setTimeout(put, 150); return; }
      if (p.text != null) {   // טקסט מסומן ← שדה הטקסט של הכלי
        if (!/^(TEXTAREA|INPUT)$/.test(inp.tagName)) return;
        var proto = inp.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        setTimeout(function () {
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(inp, p.text);
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          chrome.storage.local.remove('pendingFiles');
          inp.focus(); if (inp.scrollIntoView) inp.scrollIntoView({ block: 'center' });
        }, 300);
        return;
      }
      if (inp.type !== 'file') return;
      var dt = new DataTransfer();
      p.files.forEach(function (f) { dt.items.add(new File([bytes(f.b64)], f.name, { type: f.type })); });
      inp.files = dt.files;
      // הסקריפט של הדף נטען ב-defer: נותנים לו רגע לחבר את המאזין ואז מודיעים על הבחירה
      setTimeout(function () {
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        chrome.storage.local.remove('pendingFiles');
        // גוללים אל השדה, שיראו מיד שהקובץ נכנס
        setTimeout(function () {
          var box = inp.closest('label') || inp.parentElement || inp;
          if (box.scrollIntoView) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }, 700);
      }, 300);
    })();
  });
})();
