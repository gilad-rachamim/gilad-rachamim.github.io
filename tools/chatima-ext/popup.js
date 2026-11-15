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
      box.appendChild(findIn(q));
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
  // ---------- לחפש את מה שהוקלד גם בשירותים של גוגל, ומספר טלפון ← ווטסאפ ----------
  function goTo(url) { chrome.tabs.create({ url: url }); window.close(); }
  function phone(q) {
    var d = q.replace(/[\s\-().]/g, '');
    if (!/^\+?\d{9,15}$/.test(d)) return '';
    d = d.replace(/^\+/, '');
    if (/^0\d{8,9}$/.test(d)) d = '972' + d.slice(1);   // מספר ישראלי
    return d;
  }
  function findIn(q) {
    var e = encodeURIComponent(q), wrap = document.createElement('div');
    var h = document.createElement('h3'); h.textContent = 'לחפש את "' + q.slice(0, 30) + '" ב:'; wrap.appendChild(h);
    var row = document.createElement('div'); row.className = 'go-chips find';
    var list = [];
    var ph = phone(q);
    if (ph) list.push(['💬 ווטסאפ למספר (בלי לשמור)', 'https://web.whatsapp.com/send?phone=' + ph]);
    list.push(['📁 דרייב', 'https://drive.google.com/drive/search?q=' + e],
      ['✉ ג׳ימייל', 'https://mail.google.com/mail/u/0/#search/' + e.replace(/%20/g, '+')],
      ['🖼 תמונות', 'https://photos.google.com/search/' + e],
      ['👥 אנשי קשר', 'https://contacts.google.com/search/' + e],
      ['📅 יומן', 'https://calendar.google.com/calendar/r/search?q=' + e]);
    if (!ph) list.push(['📅 אירוע חדש: "' + q.slice(0, 18) + '"', 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + e]);
    list.forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = x[0];
      b.addEventListener('click', function () { goTo(x[1]); }); row.appendChild(b);
    });
    wrap.appendChild(row);
    return wrap;
  }
  [].forEach.call(document.querySelectorAll('#quick [data-go]'), function (b) {
    b.addEventListener('click', function () { goTo(b.getAttribute('data-go')); });
  });
  try { $('quick').open = localStorage.getItem('hkQuick') === '1'; } catch (e) {}
  $('quick').addEventListener('toggle', function () { try { localStorage.setItem('hkQuick', $('quick').open ? '1' : '0'); } catch (e) {} });

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
  // ---------- ניהול כרטיסיות ----------
  chrome.tabs.query({}).then(function (all) {
    $('tabs-btn').textContent = '🗂 הכרטיסיות (' + all.length + ')';
  }).catch(function () {});
  $('tabs-btn').addEventListener('click', function () {
    chrome.runtime.sendMessage({ tabsManager: true }, function () { void chrome.runtime.lastError; window.close(); });
  });

  // ---------- דירוג ושיתוף ----------
  // מוצג פעם אחת, רק אחרי שימוש אמיתי (8 פעולות ו-3 ימים), לכולם (לא רק למרוצים – זה הכלל של גוגל). "אחר כך" = שבועיים.
  var STORE = 'https://chromewebstore.google.com/detail/ckjmijllmaoooihonpedfajaofhbegfg';
  chrome.storage.local.get(['uses', 'installedAt', 'rateDone', 'rateLater']).then(function (o) {
    var uses = (+o.uses || 0) + 1, inst = o.installedAt || Date.now();
    chrome.storage.local.set({ uses: uses, installedAt: inst });
    if (!o.rateDone && uses >= 8 && Date.now() - inst > 3 * 864e5 && !(o.rateLater > Date.now())) $('rate').hidden = false;
  });
  $('rate-go').addEventListener('click', function () { chrome.storage.local.set({ rateDone: true }); chrome.tabs.create({ url: STORE + '/reviews?utm_source=tosaf_rate' }); window.close(); });
  $('rate-note').addEventListener('click', function () { chrome.storage.local.set({ rateLater: Date.now() + 30 * 864e5 }); chrome.tabs.create({ url: 'https://hakelim.com/kelim/bakasha/?utm_source=tosaf_rate' }); window.close(); });
  $('rate-later').addEventListener('click', function () { chrome.storage.local.set({ rateLater: Date.now() + 14 * 864e5 }); $('rate').hidden = true; });
  $('share-btn').addEventListener('click', function (e) {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://wa.me/?text=' + encodeURIComponent('מצאתי תוסף חינמי לכרום בעברית (מיזם חסד, בלי פרסומות): מתרגם אתרים בלי לשבור אותם, מסדר כרטיסיות, מפנה מקום בגוגל, פתקים ועוד, ובלי לאסוף מידע 👇\n' + STORE + '?utm_source=share_popup') });
    window.close();
  });

  $('panui-btn').addEventListener('click', function () { chrome.tabs.create({ url: chrome.runtime.getURL('panui.html') }); window.close(); });
  // ניקוי היסטוריית גלישה (browsingData, רק היסטוריה): שעה / היום / שבוע / הכול – לחיצה שנייה לאישור
  $('hist-btn').addEventListener('click', function () { $('hist').hidden = !$('hist').hidden; $('hist-msg').textContent = $('hist').hidden ? '' : 'בוחרים כמה למחוק (רק היסטוריית הגלישה; סיסמאות וחיבורים נשארים).'; });
  [].forEach.call(document.querySelectorAll('#hist [data-since]'), function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'ללחוץ שוב'; return; }
      var h = +b.dataset.since, since = h ? Date.now() - h * 3600000 : 0;
      chrome.browsingData.remove({ since: since }, { history: true }).then(function () { $('hist-msg').textContent = '🕘 ההיסטוריה ' + (h ? 'של ' + b.parentNode.querySelector('[data-since="' + h + '"]').dataset.label : 'כולה') + ' נמחקה.'; $('hist').hidden = true; }, function () { $('hist-msg').textContent = 'לא הצלחתי למחוק.'; });
    });
    b.dataset.label = b.textContent;
  });
  // כרטיסייה שנסגרה: הרשאה אופציונלית sessions, מבקשים בלחיצה הראשונה
  $('reopen-btn').addEventListener('click', function () {
    chrome.permissions.request({ permissions: ['sessions'] }, function (ok) {
      void chrome.runtime.lastError;
      if (!ok) { $('hist-msg').textContent = 'בלי הרשות: Ctrl+Shift+T פותח את מה שנסגר.'; return; }
      chrome.sessions.restore().then(function () { window.close(); }, function () { $('hist-msg').textContent = 'אין כרטיסייה סגורה לפתוח.'; });
    });
  });

  $('notes-btn').addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = tabs && tabs[0] || {};
      try { chrome.sidePanel.open({ windowId: tab.windowId }); } catch (e) {}
      chrome.storage.session.set({ spCtx: { url: tab.url || '', title: tab.title || '', view: 'notes', at: Date.now() } }).then(function () { window.close(); });
    });
  });
  $('files-btn').addEventListener('click', function () { chrome.tabs.create({ url: chrome.runtime.getURL('files.html') }); window.close(); });
  $('home-btn').addEventListener('click', function () { chrome.tabs.create({ url: chrome.runtime.getURL('home.html') }); window.close(); });

  // ---------- ג׳ימייל: חיפושים מוכנים לסידור ולניקוי, והסרה מרשימת דיוור ----------
  // החיפושים רק משנים את הכתובת של ג׳ימייל (#search/...) – כאילו הקלדתם בחיפוש. שום מייל לא נקרא.
  function gmailTab(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var t = tabs && tabs[0];
      if (t && /^https:\/\/mail\.google\.com\/mail\//.test(t.url || '')) cb(t);
    });
  }
  gmailTab(function (t) {
    $('gm').hidden = false;
    var m = (t.url || '').match(/^(https:\/\/mail\.google\.com\/mail\/u\/\d+\/)/), base = m ? m[1] : 'https://mail.google.com/mail/u/0/';
    [].forEach.call(document.querySelectorAll('#gm-q [data-q]'), function (b) {
      b.title = 'חיפוש בג׳ימייל: ' + b.getAttribute('data-q');
      b.addEventListener('click', function () {
        var q = encodeURIComponent(b.getAttribute('data-q')).replace(/%20/g, '+');
        chrome.tabs.update(t.id, { url: base + '#search/' + q }).then(function () { window.close(); });
      });
    });
    [].forEach.call(document.querySelectorAll('#gm-set button'), function (b) {
      b.addEventListener('click', function () {
        if (b.dataset.url) { chrome.tabs.create({ url: b.dataset.url }); window.close(); return; }
        chrome.tabs.update(t.id, { url: base + b.dataset.hash }).then(function () { window.close(); });
      });
    });
    // חתימה למייל: יוצרים בכלי שבאתר; הכלי שומר את החתימה בתוסף (bridge.js), וכאן מכניסים אותה לחלון כתיבה פתוח.
    // נוגעים רק בתיבת הכתיבה של המייל שכותבים עכשיו – לא קוראים שום מייל.
    $('gm-sig-new').addEventListener('click', function () { chrome.tabs.create({ url: 'https://hakelim.com/kelim/tochen/chatimat-mail/' }); window.close(); });
    $('gm-sig-put').addEventListener('click', function () {
      chrome.storage.local.get('mailSig', function (o) {
        var s = o && o.mailSig;
        if (!s || !s.html) {
          $('gm-msg').textContent = 'עוד אין חתימה שמורה. לוחצים "✍ ליצור חתימה", ממלאים, וחוזרים לכאן.';
          return;
        }
        chrome.scripting.executeScript({ target: { tabId: t.id }, func: hkPutSignature, args: [s.html] }).then(function (res) {
          var r = res && res[0] && res[0].result;
          $('gm-msg').textContent = r === 'ok' ? '✓ החתימה נכנסה בסוף המייל שאתם כותבים.' : r === 'replaced' ? '✓ החתימה עודכנה במייל שאתם כותבים.' : 'קודם פותחים "כתיבה" או "השב" בג׳ימייל, ואז לוחצים כאן.';
        }, function () { $('gm-msg').textContent = 'לא הצלחתי להגיע לחלון הכתיבה. מרעננים את ג׳ימייל ומנסים שוב.'; });
      });
    });
    $('gm-unsub').addEventListener('click', function () {
      $('gm-msg').textContent = 'מחפש במייל הפתוח…';
      var old = $('gm-unsub-go'); if (old) old.remove();
      chrome.runtime.sendMessage({ gmailUnsub: t.id }, function (r) {
        void chrome.runtime.lastError;
        if (!r || !r.ok) { $('gm-msg').textContent = 'לא הצלחתי לבדוק את המייל הזה.'; return; }
        if (r.gmail) { $('gm-msg').textContent = 'פתחתי את "ביטול הרשמה" של ג׳ימייל. מאשרים בחלון שנפתח בג׳ימייל.'; return; }
        if (r.href) {
          $('gm-msg').textContent = 'נמצא קישור הסרה של ' + (r.host || 'השולח') + '. לוחצים רק אם מכירים את השולח:';
          var go = document.createElement('button'); go.type = 'button'; go.id = 'gm-unsub-go'; go.textContent = '✂ לפתוח את דף ההסרה';
          go.addEventListener('click', function () { chrome.tabs.create({ url: r.href }); window.close(); });
          $('gm-msg').insertAdjacentElement('afterend', go);
          return;
        }
        $('gm-msg').textContent = r.open ? 'לא מצאתי קישור הסרה במייל הזה. אפשר לסמן אותו כספאם (!) – ג׳ימייל ילמד.' : 'קודם פותחים את המייל של הדיוור, ואז לוחצים כאן.';
      });
    });
  });

  // ---------- אירוע מהיר ליומן ----------
  function evPreview() {
    var v = $('ev-q').value.trim();
    if (!v) { $('ev-pre').textContent = 'כותבים מה ומתי, והיומן של גוגל נפתח עם הכול מוכן.'; return null; }
    var w = HKWhen.parse(v); $('ev-pre').textContent = '📅 ' + (w.title || 'אירוע') + ' · ' + HKWhen.describe(w); return w;
  }
  $('ev-q').addEventListener('input', evPreview);
  $('ev').addEventListener('submit', function (e) { e.preventDefault(); var w = evPreview(); if (w) goTo(HKWhen.calendarUrl(w)); });

  // ---------- האתר הזה + כלים מתאימים + חלון צד ----------
  function sidePanel(tab, tool) {
    try { chrome.sidePanel.open({ windowId: tab.windowId }); } catch (e) {}
    chrome.storage.session.set({ spCtx: { url: tab.url || '', title: tab.title || '', tool: tool || '', at: Date.now() } }).then(function () { window.close(); });
  }
  function siteSection(tab) {
    var url = tab.url || '';
    if (!/^https?:/.test(url)) return;
    var host = new URL(url).hostname.replace(/^www\./, '');
    $('site').hidden = false; $('site-host').textContent = '· ' + host;
    HKSuggest(url, tools, 4).tools.forEach(function (t) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = t.n; b.title = 'לפתוח בצד, ליד הדף: ' + t.n;
      b.addEventListener('click', function () { sidePanel(tab, t.u); }); $('sug').appendChild(b);
    });
    $('side-btn').addEventListener('click', function () { sidePanel(tab, ''); });
    $('site-home').addEventListener('click', function () {
      Promise.all([chrome.storage.sync.get('homeLinks').catch(function () { return {}; })]).then(function (r) {
        var list = Array.isArray(r[0].homeLinks) ? r[0].homeLinks : [], u = new URL(url).origin + '/';
        if (!list.some(function (x) { return x.u === u || x.u === url; })) list.push({ n: (tab.title || host).split(/\s[|\-–—]\s/)[0].slice(0, 30), u: u });
        return chrome.storage.sync.set({ homeLinks: list.slice(0, 40) });
      }).then(function () { $('site-msg').textContent = '⭐ נוסף ל"הדף שלי".'; });
    });
    var muted = tab.mutedInfo && tab.mutedInfo.muted;
    $('site-mute').textContent = muted ? '🔊 להחזיר קול' : '🔇 להשתיק';
    $('site-mute').addEventListener('click', function () { chrome.tabs.update(tab.id, { muted: !muted }).then(function () { window.close(); }); });
    $('site-clean').addEventListener('click', function () {
      var b = this;
      if (b.dataset.sure !== '1') { b.dataset.sure = '1'; b.textContent = 'ללחוץ שוב לאישור'; $('site-msg').textContent = 'זה מוחק את העוגיות והזיכרון של ' + host + ' במחשב – תצטרכו להתחבר אליו שוב. עוזר כשאתר "נתקע" או מתנהג מוזר.'; return; }
      chrome.browsingData.remove({ origins: [new URL(url).origin] }, { cookies: true, localStorage: true, indexedDB: true, cacheStorage: true, serviceWorkers: true, cache: true, fileSystems: true })
        .then(function () { $('site-msg').textContent = '🧹 ' + host + ' נוקה. טוען את הדף מחדש…'; return chrome.tabs.reload(tab.id); })
        .catch(function () { $('site-msg').textContent = 'לא הצלחתי לנקות את האתר הזה.'; });
    });
  }

  // ---------- ווטסאפ ווב: נוסחים מוכנים, מצב פרטיות, שמירת הצ'אט ----------
  var WA_DEF = ['תודה רבה! 🙏', 'קיבלתי, אחזור אליך בהקדם.', 'אפשר לתאם שיחה? מתי נוח לך?', 'מצורף הקובץ. אשמח לאישור שהתקבל.', 'אני בדרך, אגיע בעוד כמה דקות', 'שבת שלום ומבורך! 🕯🕯', 'מזל טוב! 🎉 שתזכו לרוב נחת'];
  var BLUR = '#pane-side [role=gridcell] span[title], #pane-side img, #main .message-in, #main .message-out, #main header span[title], #main header img { filter: blur(6px) !important; } #pane-side [role=listitem]:hover span[title], #pane-side [role=listitem]:hover img, #main .message-in:hover, #main .message-out:hover, #main header:hover span[title], #main header:hover img { filter: none !important; }';
  function waInsert(text) {
    var box = document.querySelector('footer div[contenteditable="true"]') || document.querySelector('#main div[contenteditable="true"][role="textbox"]');
    if (!box) return false;
    box.focus(); document.execCommand('insertText', false, text); return true;
  }
  function waRead() {
    var out = [], title = '';
    var h = document.querySelector('#main header span[title]'); if (h) title = h.getAttribute('title');
    document.querySelectorAll('#main [data-pre-plain-text]').forEach(function (el) {
      var pre = el.getAttribute('data-pre-plain-text') || '', t = el.querySelector('.selectable-text');
      out.push(pre.trim() + ' ' + (t ? t.innerText : el.innerText).trim());
    });
    return { title: title, lines: out };
  }
  function waSection(tab) {
    $('wa').hidden = false;
    var run = function (func, args) { return chrome.scripting.executeScript({ target: { tabId: tab.id }, func: func, args: args || [] }).then(function (r) { return r && r[0] && r[0].result; }); };
    // קטגוריות מוכנות (להורים, ללקוחות, תזכורת לתור, ברכות, מחוץ למשרד) מהכלי באתר, ו"⭐ שלי" – הנוסחים של המשתמש
    var waCats = [], waCat = 'mine';
    var gotCats = new Promise(function (res) {
      try { chrome.runtime.sendMessage({ mailTpl: 1 }, function (r) { void chrome.runtime.lastError; if (r && r.ok && Array.isArray(r.data.wa)) waCats = r.data.wa; res(); }); } catch (e) { res(); }
    });
    chrome.storage.local.get('waCat').then(function (o) { if (o.waCat) waCat = o.waCat; }).catch(function () {});
    Promise.all([chrome.storage.sync.get('snips').catch(function () { return {}; }), gotCats]).then(function (rr) {
      var o = rr[0];
      var list = Array.isArray(o.snips) ? o.snips : WA_DEF.slice();
      function put(t) { run(waInsert, [t]).then(function (ok) { if (ok) window.close(); else $('wa-msg').textContent = 'קודם פותחים צ׳אט, ואז בוחרים נוסח.'; }, function () { $('wa-msg').textContent = 'לא הצלחתי להכניס את הנוסח.'; }); }
      function chip(t) { var b = document.createElement('button'); b.type = 'button'; b.textContent = t.length > 26 ? t.slice(0, 25) + '…' : t; b.title = t; b.addEventListener('click', function () { put(t); }); return b; }
      function draw() {
        var cats = $('wa-cats'); cats.textContent = '';
        if (!waCats.some(function (c) { return c.n === waCat; })) waCat = 'mine';
        [{ n: 'mine', l: '⭐ שלי' }].concat(waCats.map(function (c) { return { n: c.n, l: c.n }; })).forEach(function (c) {
          var b = document.createElement('button'); b.type = 'button'; b.textContent = c.l; b.setAttribute('aria-pressed', String(c.n === waCat));
          b.addEventListener('click', function () { waCat = c.n; chrome.storage.local.set({ waCat: waCat }); draw(); });
          cats.appendChild(b);
        });
        var box = $('wa-tpl'); box.textContent = '';
        if (waCat !== 'mine') {
          var cat = waCats.filter(function (c) { return c.n === waCat; })[0];
          (cat ? cat.items : []).forEach(function (t) {
            var b = chip(t); b.title = t + '\n(לחיצה ימנית: להוסיף ל"שלי")';
            b.addEventListener('contextmenu', function (e) { e.preventDefault(); if (list.indexOf(t) < 0) { list.push(t); chrome.storage.sync.set({ snips: list }); } $('wa-msg').textContent = '⭐ נוסף ל"שלי"'; });
            box.appendChild(b);
          });
          $('wa-msg').textContent = /\[[^\]]+\]/.test((cat ? cat.items : []).join('')) ? 'מה שבסוגריים [ ] משלימים בתיבה לפני השליחה.' : '';
          return;
        }
        list.forEach(function (t, i) {
          var b = chip(t);
          b.addEventListener('contextmenu', function (e) { e.preventDefault(); list.splice(i, 1); chrome.storage.sync.set({ snips: list }); draw(); });
          box.appendChild(b);
        });
        var ed = document.createElement('button'); ed.type = 'button'; ed.textContent = '✎'; ed.title = 'להוסיף נוסח (לחיצה ימנית על נוסח מוחקת אותו)';
        ed.addEventListener('click', function () { $('wa-add').hidden = false; $('wa-new').focus(); }); box.appendChild(ed);
      }
      $('wa-save').addEventListener('click', function () { var v = $('wa-new').value.trim(); if (!v) return; list.push(v); chrome.storage.sync.set({ snips: list }); $('wa-new').value = ''; $('wa-add').hidden = true; draw(); });
      draw();
    });
    chrome.storage.session.get('waBlur').then(function (o) {
      var on = !!(o.waBlur && o.waBlur[tab.id]); $('wa-blur').setAttribute('aria-pressed', on ? 'true' : 'false'); $('wa-blur').textContent = on ? '👁 לבטל מצב פרטיות' : '🙈 מצב פרטיות';
      $('wa-blur').addEventListener('click', function () {
        var p = on ? chrome.scripting.removeCSS({ target: { tabId: tab.id }, css: BLUR }) : chrome.scripting.insertCSS({ target: { tabId: tab.id }, css: BLUR });
        p.then(function () { var m = o.waBlur || {}; m[tab.id] = !on; return chrome.storage.session.set({ waBlur: m }); }).then(function () { window.close(); });
      });
    });
    $('wa-export').addEventListener('click', function () {
      run(waRead).then(function (r) {
        if (!r || !r.lines.length) { $('wa-msg').textContent = 'לא מצאתי הודעות. פותחים צ׳אט, גוללים למעלה עד איפה שרוצים, ולוחצים שוב.'; return; }
        var txt = '\ufeff' + (r.title ? 'צ׳אט: ' + r.title + '\r\n\r\n' : '') + r.lines.join('\r\n');
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
        a.download = 'ווטסאפ - ' + (r.title || 'צאט').replace(/[\\/:*?"<>|]/g, '') + '.txt'; document.body.appendChild(a); a.click(); a.remove();
        $('wa-msg').textContent = 'נשמרו ' + r.lines.length + ' הודעות (רק מה שנטען במסך – לגלול למעלה כדי לשמור עוד).';
      }, function () { $('wa-msg').textContent = 'לא הצלחתי לקרוא את הצ׳אט.'; });
    });
  }
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    var tab = tabs && tabs[0]; if (!tab) return;
    var ready = new Promise(function (r) { var k = 0, iv = setInterval(function () { if (tools.length || ++k > 40) { clearInterval(iv); r(); } }, 50); });
    ready.then(function () {
      if (/^https:\/\/web\.whatsapp\.com\//.test(tab.url || '')) waSection(tab);
      siteSection(tab);
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

// רץ בתוך דף ג׳ימייל (chrome.scripting): מכניס את החתימה לתיבת הכתיבה הפתוחה.
// מנקה את ה-HTML (בלי סקריפטים, בלי on*, רק קישורים בטוחים), ומחליף חתימה קודמת שלנו אם יש.
function hkPutSignature(html) {
  var boxes = [].slice.call(document.querySelectorAll('div[contenteditable="true"][role="textbox"]')).filter(function (b) { return b.offsetParent !== null; });
  if (!boxes.length) return 'none';
  var a = document.activeElement, box = boxes.filter(function (b) { return b === a || b.contains(a); })[0] || boxes[boxes.length - 1];
  var doc = new DOMParser().parseFromString('<div>' + String(html).slice(0, 20000) + '</div>', 'text/html');
  [].forEach.call(doc.querySelectorAll('script,style,iframe,object,embed,form,input,button,link,meta,svg'), function (n) { n.remove(); });
  [].forEach.call(doc.querySelectorAll('*'), function (n) {
    [].slice.call(n.attributes).forEach(function (at) {
      var k = at.name.toLowerCase(), v = at.value.trim();
      if (k.indexOf('on') === 0) n.removeAttribute(at.name);
      else if (k === 'href' && !/^(https?:|mailto:|tel:)/i.test(v)) n.removeAttribute(at.name);
      else if (k === 'src' && !/^(https?:|data:image\/(png|jpe?g|gif|webp);)/i.test(v)) n.removeAttribute(at.name);
      else if (k === 'style' && /url\s*\(|expression/i.test(v)) n.removeAttribute(at.name);
    });
  });
  var old = box.querySelector('[data-hk-sig]'), wrap = document.createElement('div');
  wrap.setAttribute('data-hk-sig', '1');
  wrap.innerHTML = '<br>' + doc.body.firstChild.innerHTML;
  if (old) { old.replaceWith(wrap); } else { box.appendChild(wrap); }
  box.dispatchEvent(new Event('input', { bubbles: true }));
  return old ? 'replaced' : 'ok';
}
