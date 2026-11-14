// החלון הקטן של התוסף: חיפוש בכל הכלים באתר (מהרשימה שמתעדכנת לבד), מועדפים, "חדש באתר",
// PDF פתוח ← כלי, קוד QR לדף הנוכחי וסיסמה חזקה. הכול במחשב, בלי שרת.
(function () {
  var SITE = 'https://hakelim.com';
  var NEW_DAYS = 14;
  var POPULAR = ['/kelim/machshev/chatima/', '/kelim/machshev/tmuna/', '/kelim/tamlul/', '/kelim/machshev/pdf/', '/kelim/machshev/fax/', '/kelim/eruim/hazmana/', '/kelim/briut/trufot/', '/kelim/machshev/sisma/'];
  var $ = function (id) { return document.getElementById(id); };
  var tools = [], seen = {}, favs = [], tabUrl = '', tabTitle = '';

  // ---------- טעינה ----------
  function load() {
    return Promise.all([
      chrome.storage.local.get(['tools', 'seen', 'toolsAt']),
      chrome.storage.sync.get('favs').catch(function () { return {}; })
    ]).then(function (r) {
      var o = r[0];
      favs = Array.isArray(r[1].favs) ? r[1].favs : [];
      seen = o.seen || {};
      if (!o.toolsAt || Date.now() - o.toolsAt > 12 * 3600 * 1000) chrome.runtime.sendMessage({ refresh: true }, function () { void chrome.runtime.lastError; });
      if (o.tools && o.tools.tools) return o.tools.tools;
      return fetch('tools.json').then(function (x) { return x.json(); }).then(function (j) { return j.tools; });
    }).then(function (t) { tools = t || []; });
  }
  function byU(u) { for (var i = 0; i < tools.length; i++) if (tools[i].u === u) return tools[i]; return null; }
  function isNew(t) { var s = seen[t.u]; return s && Date.now() - s < NEW_DAYS * 864e5; }

  // ---------- תצוגה ----------
  function row(t) {
    var d = document.createElement('div'); d.className = 'tool';
    var a = document.createElement('a'); a.href = SITE + t.u + '?utm_source=tosaf'; a.target = '_blank';
    var b = document.createElement('b'); b.textContent = t.n;
    if (isNew(t)) { var nw = document.createElement('span'); nw.className = 'new'; nw.textContent = 'חדש'; b.appendChild(nw); }
    var s = document.createElement('small'); s.textContent = t.c + ' · ' + t.d;
    a.appendChild(b); a.appendChild(s);
    var st = document.createElement('button'); st.type = 'button'; st.className = 'star';
    var on = favs.indexOf(t.u) >= 0;
    st.setAttribute('aria-pressed', on ? 'true' : 'false');
    st.setAttribute('aria-label', (on ? 'להוריד מהמועדפים: ' : 'להוסיף למועדפים: ') + t.n);
    st.textContent = on ? '★' : '☆';
    st.addEventListener('click', function () { toggleFav(t.u); });
    d.appendChild(a); d.appendChild(st);
    return d;
  }
  function group(title, list, emptyText) {
    var frag = document.createDocumentFragment();
    var h = document.createElement('h3'); h.textContent = title; frag.appendChild(h);
    if (!list.length && emptyText) { var p = document.createElement('p'); p.className = 'empty'; p.textContent = emptyText; frag.appendChild(p); }
    list.forEach(function (t) { frag.appendChild(row(t)); });
    return frag;
  }
  function norm(s) { return (s || '').replace(/[֑-ׇ]/g, '').replace(/["'״׳\-–]/g, ' ').toLowerCase(); }
  function search(q) {
    var words = norm(q).split(/\s+/).filter(Boolean);
    return tools.map(function (t) {
      var n = norm(t.n), c = norm(t.c), d = norm(t.d), sc = 0;
      for (var i = 0; i < words.length; i++) {
        var w = words[i], hit = 0;
        if (n.indexOf(w) >= 0) hit += 4;
        if (c.indexOf(w) >= 0) hit += 1;
        if (d.indexOf(w) >= 0) hit += 1;
        if (!hit) return null;
        sc += hit;
      }
      if (t.h) sc -= 3;
      return { t: t, sc: sc };
    }).filter(Boolean).sort(function (a, b) { return b.sc - a.sc; }).slice(0, 40).map(function (x) { return x.t; });
  }
  var shown = [];
  function render() {
    var q = $('q').value.trim(), box = $('list');
    box.textContent = '';
    if (q) {
      shown = search(q);
      box.appendChild(group(shown.length > 1 ? 'נמצאו ' + shown.length + ' כלים' : shown.length ? 'נמצא כלי אחד' : 'לא נמצא כלי', shown, 'אפשר לבקש כלי חדש באתר, בדף "בקשת כלי".'));
      return;
    }
    var fav = favs.map(byU).filter(Boolean);
    var news = tools.filter(function (t) { return !t.h && isNew(t); }).slice(0, 6);
    shown = fav.length ? fav : POPULAR.map(byU).filter(Boolean);
    box.appendChild(group(fav.length ? '⭐ המועדפים שלי' : 'הכי שימושיים', shown, ''));
    if (!fav.length) { var p = document.createElement('p'); p.className = 'empty'; p.textContent = 'לחצו ☆ ליד כלי כדי לשמור אותו כאן.'; box.appendChild(p); }
    else if (fav.length < 4) box.appendChild(group('הכי שימושיים', POPULAR.filter(function (u) { return favs.indexOf(u) < 0; }).slice(0, 4).map(byU).filter(Boolean), ''));
    if (news.length) box.appendChild(group('🆕 חדש באתר', news, ''));
    var n = tools.filter(function (t) { return !t.h; }).length;
    var p2 = document.createElement('p'); p2.className = 'empty'; p2.textContent = n + ' כלים באתר. מקלידים למעלה כדי לחפש.'; box.appendChild(p2);
  }
  function toggleFav(u) {
    var i = favs.indexOf(u);
    if (i >= 0) favs.splice(i, 1); else favs.unshift(u);
    favs = favs.slice(0, 30);
    chrome.storage.sync.set({ favs: favs }).catch(function () {});
    render();
  }
  $('q').addEventListener('input', render);
  $('q').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && shown[0]) chrome.tabs.create({ url: SITE + shown[0].u + '?utm_source=tosaf' });
  });

  // ---------- הכרטיסייה הפתוחה: PDF ו-QR ----------
  function pdfTools() {
    var box = $('pdf-tools');
    tools.filter(function (t) { return t.x && t.x.accept.indexOf('pdf') >= 0; }).forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = t.x.menu;
      b.addEventListener('click', function () {
        $('pdf-msg').textContent = 'פותח…';
        chrome.runtime.sendMessage({ open: tabUrl, tool: t.u }, function (r) {
          if (r && r.ok) window.close();
          else $('pdf-msg').textContent = 'לא הצלחתי לקרוא את הקובץ. הכלי נפתח: אפשר להוריד את הקובץ ולבחור אותו שם.';
        });
      });
      box.appendChild(b);
    });
  }
  var qrDone = false;
  function showQr() {
    if (qrDone) return; qrDone = true;
    var box = $('qr-box');
    if (!/^https?:/.test(tabUrl)) { box.textContent = 'אין קוד QR לדף הזה'; $('qr-dl').disabled = $('qr-copy').disabled = true; return; }
    try {
      new QRCode(box, { text: tabUrl, width: 480, height: 480, colorDark: '#000000', colorLight: '#ffffff', correctLevel: tabUrl.length > 300 ? QRCode.CorrectLevel.L : QRCode.CorrectLevel.M });
      $('qr-title').textContent = tabTitle || tabUrl;
    } catch (e) { box.textContent = 'הכתובת ארוכה מדי לקוד QR'; $('qr-dl').disabled = true; }
  }
  function toggle(btn, panel, onOpen) {
    btn.addEventListener('click', function () {
      var open = panel.hidden; panel.hidden = !open; btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && onOpen) onOpen();
    });
  }
  toggle($('qr-btn'), $('qr'), showQr);
  toggle($('pw-btn'), $('pw'), function () { if (!$('pw-out').textContent) newPw(); });
  $('qr-dl').addEventListener('click', function () {
    var c = $('qr-box').querySelector('canvas');
    if (!c) return;
    var pad = 40, out = document.createElement('canvas');
    out.width = c.width + pad * 2; out.height = c.height + pad * 2;
    var g = out.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, out.width, out.height); g.drawImage(c, pad, pad);
    var host = ''; try { host = new URL(tabUrl).hostname.replace(/^www\./, ''); } catch (e) {}
    var a = document.createElement('a'); a.href = out.toDataURL('image/png'); a.download = 'qr-' + (host || 'page') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('qr-copy').addEventListener('click', function () { copy(tabUrl, this, '🔗 להעתיק קישור'); });

  // ---------- סיסמה ----------
  function makePassword(n) {
    var sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*-_=+?'];
    var all = sets.join(''), out = [], r = new Uint32Array(n + n);
    crypto.getRandomValues(r);
    for (var i = 0; i < sets.length; i++) out.push(sets[i][r[i] % sets[i].length]);
    for (var j = sets.length; j < n; j++) out.push(all[r[j] % all.length]);
    for (var k = out.length - 1; k > 0; k--) { var m = r[n + k] % (k + 1), t = out[k]; out[k] = out[m]; out[m] = t; }
    return out.join('');
  }
  function newPw() { $('pw-out').textContent = makePassword(16); }
  function copy(text, btn, label) {
    navigator.clipboard.writeText(text).then(function () { btn.textContent = '✓ הועתק'; setTimeout(function () { btn.textContent = label; }, 1500); });
  }
  $('pw-new').addEventListener('click', newPw);
  $('pw-copy').addEventListener('click', function () { copy($('pw-out').textContent, this, 'להעתיק'); });

  // ---------- התחלה ----------
  load().then(function () {
    render();
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs && tabs[0];
      tabUrl = tab && tab.url || ''; tabTitle = tab && tab.title || '';
      if (/\.pdf($|[?#])/i.test(tabUrl)) { $('pdf').hidden = false; pdfTools(); }
    });
  });
  // ---------- כלים לדף הזה: צילום, הקראה, כיוון, מצב כהה ----------
  [].forEach.call(document.querySelectorAll('#acts [data-act]'), function (b) {
    b.addEventListener('click', function () {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        var tab = tabs && tabs[0], act = b.getAttribute('data-act');
        if (!tab || !/^(https?|file):/.test(tab.url || '')) { $('act-msg').textContent = 'בדף הזה כרום לא מאפשר לתוספים לעבוד. נסו באתר רגיל.'; return; }
        $('act-msg').textContent = act === 'shot' ? 'מצלם את העמוד, רגע…' : '';
        chrome.runtime.sendMessage({ act: act, tabId: tab.id }, function (r) {
          void chrome.runtime.lastError;
          if (r && r.ok) { if (act !== 'speak') window.close(); else $('act-msg').textContent = '🔊 מקריא. לעצור: לחיצה ימנית ← "לעצור את ההקראה".'; }
          else $('act-msg').textContent = r && r.err === 'no hebrew voice' ? 'אין במחשב קול עברי. ההסבר מופיע בדף.' : r && r.err === 'no text' ? 'קודם מסמנים טקסט בדף.' : 'לא הצלחתי בדף הזה.';
        });
      });
    });
  });

  // רשימה שהתעדכנה ברקע בזמן שהחלון פתוח
  chrome.storage.onChanged.addListener(function (ch, area) {
    if (area === 'local' && (ch.tools || ch.seen)) load().then(render);
  });
})();
