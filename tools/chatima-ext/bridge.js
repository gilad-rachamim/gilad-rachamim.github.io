// רץ רק בדף הכלי ב-hakelim.com: לוקח את הקובץ שהתוסף שמר ומעביר אותו לדף (postMessage באותו חלון).
(function () {
  var sent = false;
  function send() {
    chrome.storage.local.get('pending', function (o) {
      var p = o && o.pending;
      if (!p || Date.now() - p.at > 5 * 60 * 1000) { if (p) chrome.storage.local.remove('pending'); return; }
      var bin = atob(p.b64), buf = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      sent = true;
      window.postMessage({ type: 'hakelim-chatima-pdf', id: p.id, name: p.name, data: buf.buffer }, location.origin);
    });
  }
  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data) return;
    if (e.data.type === 'hakelim-chatima-ready' && !sent) send();
    if (e.data.type === 'hakelim-chatima-got') chrome.storage.local.remove('pending');
  });
  send();
})();
