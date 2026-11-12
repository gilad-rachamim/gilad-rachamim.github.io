// החלון הקטן של התוסף: PDF פתוח ← כלי, קוד QR לדף הנוכחי, סיסמה חזקה. הכול במחשב, בלי שרת.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var tabUrl = '', tabTitle = '';

  function makePassword(n) {
    var sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*-_=+?'];
    var all = sets.join(''), out = [], r = new Uint32Array(n + n);
    crypto.getRandomValues(r);
    for (var i = 0; i < sets.length; i++) out.push(sets[i][r[i] % sets[i].length]);
    for (var j = sets.length; j < n; j++) out.push(all[r[j] % all.length]);
    for (var k = out.length - 1; k > 0; k--) { var m = r[n + k] % (k + 1), t = out[k]; out[k] = out[m]; out[m] = t; }
    return out.join('');
  }
  function copy(text, btn, label) {
    navigator.clipboard.writeText(text).then(function () {
      btn.textContent = '✓ הועתק'; setTimeout(function () { btn.textContent = label; }, 1500);
    });
  }

  // ---------- סיסמה ----------
  $('pw-new').addEventListener('click', function () {
    $('pw-out').textContent = makePassword(16);
    $('pw-copy').disabled = false;
  });
  $('pw-copy').addEventListener('click', function () { copy($('pw-out').textContent, this, 'להעתיק'); });

  // ---------- הכרטיסייה הפתוחה ----------
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0];
    tabUrl = tab && tab.url || ''; tabTitle = tab && tab.title || '';
    var isPdf = /\.pdf($|[?#])/i.test(tabUrl) || /^file:.*\.pdf$/i.test(tabUrl);
    if (isPdf) $('pdf').hidden = false;
    if (/^https?:/.test(tabUrl)) showQr();
  });

  [].forEach.call(document.querySelectorAll('#pdf [data-tool]'), function (b) {
    b.addEventListener('click', function () {
      $('pdf-msg').textContent = 'פותח…';
      chrome.runtime.sendMessage({ open: tabUrl, tool: b.getAttribute('data-tool') }, function (r) {
        if (r && r.ok) window.close();
        else $('pdf-msg').textContent = 'לא הצלחתי לקרוא את הקובץ. הכלי נפתח: אפשר להוריד את הקובץ ולבחור אותו שם.';
      });
    });
  });

  // ---------- QR ----------
  function showQr() {
    $('qr').hidden = false;
    var box = $('qr-box');
    try {
      new QRCode(box, { text: tabUrl, width: 480, height: 480, colorDark: '#000000', colorLight: '#ffffff', correctLevel: tabUrl.length > 300 ? QRCode.CorrectLevel.L : QRCode.CorrectLevel.M });
      $('qr-title').textContent = tabTitle || tabUrl;
    } catch (e) {
      box.textContent = 'הכתובת ארוכה מדי לקוד QR';
      $('qr-dl').disabled = true;
    }
  }
  $('qr-dl').addEventListener('click', function () {
    var c = $('qr-box').querySelector('canvas');
    if (!c) return;
    // שוליים לבנים סביב הקוד, שיהיה קל לסרוק מהדפסה
    var pad = 40, out = document.createElement('canvas');
    out.width = c.width + pad * 2; out.height = c.height + pad * 2;
    var g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height); g.drawImage(c, pad, pad);
    var host = ''; try { host = new URL(tabUrl).hostname.replace(/^www\./, ''); } catch (e) {}
    var a = document.createElement('a');
    a.href = out.toDataURL('image/png'); a.download = 'qr-' + (host || 'page') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('qr-copy').addEventListener('click', function () { copy(tabUrl, this, '🔗 להעתיק קישור'); });
})();
