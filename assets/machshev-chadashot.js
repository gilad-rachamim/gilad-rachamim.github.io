/* החדשות ב-3 דקות – מציג את הסיכום האחרון מהשרת kelim-news (tools/news-worker). */
(function () {
  'use strict';
  var API = 'https://kelim-news.gilad4049.workers.dev';
  var TOOL = 'chadashot';
  var KEY = 'kelim_chadashot_topics';
  var NAMES = { main: 'העיקר', haredi: 'ציבור חרדי', economy: 'כלכלה וכיס' };
  var $ = function (id) { return document.getElementById(id); };
  var ed = null;
  var PAGE = 'https://hakelim.com/kelim/machshev/chadashot/';
  var PHONE = 'בטלפון כשר: 077-2253345 שלוחה 8';
  // מאיפה הגיעו (utm_source בקישור) – נספר בשרת וב-Google Analytics
  var FROM = (function () {
    var s = '';
    try { s = (new URLSearchParams(location.search).get('utm_source') || '').toLowerCase(); } catch (e) {}
    if (s === 'facebook') s = 'fb';
    return ['fb', 'wa', 'qr', 'share', 'home'].indexOf(s) > -1 ? s : 'web';
  })();
  function friendText() {
    return 'מצאתי משהו טוב: סיכום חדשות רגוע 3 פעמים ביום. 5 נקודות קצרות, בלי לרפרש כל רבע שעה. קו כשר, בחינם ובלי פרסומות.\n' +
      PAGE + '?utm_source=share\n' + PHONE;
  }

  function used(how) { if (window.toolUsed) window.toolUsed(TOOL, { how: how }); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function shown() { var t = load(); return ['main'].concat(['haredi', 'economy'].filter(function (k) { return t[k] !== false; })); }

  function nextRun() {
    var h = new Date().getHours();
    return h < 7 ? '07:00' : h < 13 ? '13:00' : h < 20 ? '20:00' : 'מחר ב-07:00';
  }

  function render() {
    if (!ed) return;
    $('nw-ed').textContent = 'סיכום ' + ed.name + ' – יום ' + ed.date.day + ', ' + ed.date.he;
    $('nw-when').textContent = 'יצא ב-' + ed.time + ' · הבא: ' + nextRun();
    var note = $('nw-note');
    if (ed.mode === 'titles') { note.hidden = false; note.textContent = 'הפעם רק הכותרות החשובות מכל אתר, עם קישור. הסיכום המלא במילים שלנו – בקרוב.'; }
    else note.hidden = true;
    var html = '';
    shown().forEach(function (sec) {
      var pts = (ed.sections && ed.sections[sec]) || [];
      if (!pts.length) return;
      html += '<section class="nw-sec"><h2>' + NAMES[sec] + '</h2><ol class="nw-list">';
      pts.forEach(function (p, i) {
        html += '<li>' + esc(p.text) + '<div class="nw-src">' + p.sources.map(function (s) {
          return '<a href="' + esc(s.link) + '" target="_blank" rel="noopener nofollow">' + esc(s.name) + '</a>';
        }).join('') + '<button type="button" class="no-print" data-sec="' + sec + '" data-i="' + i + '">מצאתי טעות</button></div></li>';
      });
      html += '</ol></section>';
    });
    $('nw-body').innerHTML = html || '<p class="nw-wait">אין נקודות בסיכום הזה.</p>';
    $('nw-wa').href = 'https://wa.me/?text=' + encodeURIComponent(asText());
    var wa = ed.links && ed.links.wa;
    if (wa && /^https:\/\/(www\.)?whatsapp\.com\/channel\//.test(wa)) { $('nw-chan-a').href = wa; $('nw-chan').hidden = false; }
  }

  function asText() {
    if (!ed) return '';
    var out = ['📰 החדשות ב-3 דקות – ' + ed.name + ', יום ' + ed.date.day + ' ' + ed.date.he, ''];
    shown().forEach(function (sec) {
      var pts = (ed.sections && ed.sections[sec]) || [];
      if (!pts.length) return;
      if (sec !== 'main') out.push('', '*' + NAMES[sec] + '*');
      pts.forEach(function (p, i) { out.push((i + 1) + '. ' + p.text); });
    });
    out.push('', 'כל הנקודות עם קישור למקור:', PAGE + '?utm_source=wa', PHONE);
    return out.join('\n');
  }

  function renderOld(list) {
    var box = $('nw-old-list'), html = '';
    (list || []).slice(1, 7).forEach(function (e) {
      html += '<h3>' + esc(e.name) + ' – יום ' + esc(e.date.day) + ', ' + esc(e.date.he) + ' (' + esc(e.time) + ')</h3>';
      ((e.sections && e.sections.main) || []).forEach(function (p, i) { html += '<p>' + (i + 1) + '. ' + esc(p.text) + '</p>'; });
    });
    box.innerHTML = html || '<p>עוד אין.</p>';
  }

  function report(sec, i) {
    var p = ed.sections[sec][+i];
    var note = window.prompt('מה לא מדויק? (אפשר גם להשאיר ריק)\n\n' + p.text, '');
    if (note === null) return;
    fetch(API + '/report', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: p.text, note: note }) })
      .then(function () { alert('תודה! נבדוק ונתקן.'); }).catch(function () { alert('לא נשלח. נסו שוב מאוחר יותר.'); });
    used('report');
  }

  // ---------- התראות (Web Push) – ה-sw.js של הכלים מציג אותן ----------
  var VAPID = 'BPxymKHPzzngtKfi76udfvM1hE6-kUOHtVsS0pZbjd1d9TBLs-o0b4oiIoAPQ8-jHWU99FjEHLL60iC49mrGPyc';
  function b64ToBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); var r = atob(s + '==='.slice((s.length + 3) % 4)); var a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  function pushMsg(t) { $('nw-push-msg').textContent = t; }
  function bellState(on) { $('nw-bell').textContent = on ? '🔕 לבטל את ההתראות' : '🔔 לקבל התראה 3 פעמים ביום'; $('nw-bell').dataset.on = on ? '1' : ''; }
  function initPush() {
    if (!('serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window)) {
      $('nw-bell').disabled = true;
      pushMsg(/iPhone|iPad/.test(navigator.userAgent)
        ? 'באייפון: קודם מוסיפים את הדף למסך הבית (שיתוף ← "הוספה למסך הבית"), פותחים משם ולוחצים כאן.'
        : 'הדפדפן הזה לא תומך בהתראות. אפשר לשמור את הדף במסך הבית ולהיכנס 3 פעמים ביום.');
      return;
    }
    navigator.serviceWorker.ready.then(function (reg) { return reg.pushManager.getSubscription(); }).then(function (sub) { bellState(!!sub); }).catch(function () {});
    $('nw-bell').addEventListener('click', function () {
      var btn = this, done = function () { btn.disabled = false; };
      btn.disabled = true;
      navigator.serviceWorker.ready.then(function (reg) {
        return reg.pushManager.getSubscription().then(function (sub) {
          if (btn.dataset.on && sub) {
            return fetch(API + '/unsubscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
              .catch(function () {}).then(function () { return sub.unsubscribe(); })
              .then(function () { bellState(false); pushMsg('ההתראות בוטלו. אפשר להפעיל שוב בכל רגע.'); used('push_off'); });
          }
          return Notification.requestPermission().then(function (perm) {
            if (perm !== 'granted') { pushMsg('ההתראות חסומות בדפדפן. אפשר לאשר אותן בהגדרות האתר (המנעול ליד הכתובת) ולנסות שוב.'); return; }
            return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) }).then(function (s) {
              return fetch(API + '/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) });
            }).then(function (r) {
              if (!r.ok) throw new Error('subscribe');
              bellState(true); pushMsg('מעולה! תקבלו התראה כשהסיכום יוצא: 07:00, 13:00, 20:00.'); used('push_on');
            });
          });
        });
      }).catch(function () { pushMsg('ההרשמה לא הצליחה. נסו שוב בעוד רגע.'); }).then(done, done);
    });
  }

  function init() {
    initPush();
    var t = load();
    document.querySelectorAll('#nw-topics input').forEach(function (cb) {
      cb.checked = t[cb.dataset.topic] !== false;
      cb.addEventListener('change', function () { var o = load(); o[cb.dataset.topic] = cb.checked; save(o); render(); used('topic'); });
    });
    $('nw-body').addEventListener('click', function (e) { var b = e.target.closest('button[data-sec]'); if (b) report(b.dataset.sec, b.dataset.i); });
    $('nw-copy').addEventListener('click', function () {
      var txt = asText(), btn = this;
      (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () {
        btn.textContent = 'הועתק ✓'; setTimeout(function () { btn.textContent = 'להעתיק את הסיכום'; }, 2000);
      }).catch(function () { window.prompt('העתיקו מכאן:', txt); });
      used('copy');
    });
    $('nw-wa').addEventListener('click', function () { used('wa'); });
    $('nw-friend').href = 'https://wa.me/?text=' + encodeURIComponent(friendText());
    $('nw-friend').addEventListener('click', function () { used('friend'); });
    $('nw-chan-a').addEventListener('click', function () { used('channel'); });
    $('nw-fb').addEventListener('click', function () { used('facebook'); });

    fetch(API + '/latest?from=' + FROM, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || j.empty) {
        $('nw-ed').textContent = 'הסיכום הראשון יוצא בקרוב';
        $('nw-body').innerHTML = '<p class="nw-wait">הסיכום הבא: ' + nextRun() + '.</p>';
        return;
      }
      ed = j; render(); used('view');
      return fetch(API + '/history').then(function (r) { return r.json(); }).then(renderOld);
    }).catch(function () {
      $('nw-ed').textContent = 'הסיכום לא נטען';
      $('nw-body').innerHTML = '<p class="nw-wait">ייתכן שהסינון בטלפון חוסם את שרת הסיכום. אפשר לשמוע אותו בקו הכלים: 077-2253345, שלוחה 8.</p>';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
