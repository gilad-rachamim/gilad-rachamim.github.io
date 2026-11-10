// כיתות: שולח נקודות מהמשחקים ומהתרגול ללוח הכיתה. נטען לבד מ-kelim.js רק אצל מי שהצטרף לכיתה (localStorage kita-me).
// משחקי chashiva.js: עוטף את CH.record (פתרון 10, אתגר יומי +10, בלי רמז +5).
// כל משחק אחר: window.KITA.add({game:'bagrut-math', pts:10, ref:'<ייחודי>'}), או לפני הטעינה: (window.KITA_Q = window.KITA_Q || []).push({...}).
(function () {
  'use strict';
  var me = null;
  try { me = JSON.parse(localStorage.getItem('kita-me') || 'null'); } catch (e) {}
  if (!me || !me.code || window.KITA) return;
  var API = (function () { try { var o = localStorage.getItem('kita-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8796' : 'https://kelim-kita.gilad4049.workers.dev'; })();
  var PEND = 'kita-pending';

  function pend(list) { try { if (list) localStorage.setItem(PEND, JSON.stringify(list.slice(-40))); else return JSON.parse(localStorage.getItem(PEND) || '[]'); } catch (e) { return []; } }
  function send(o, quiet) {
    var body = { sid: me.sid, token: me.token, game: o.game, pts: o.pts, ref: o.ref || (o.game + '-' + Date.now()) };
    return fetch(API + '/c/' + me.code + '/add', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.gone) { try { localStorage.removeItem('kita-me'); } catch (e) {} toast('לא מצאנו אתכם בכיתה ' + (me.name || '') + '. אפשר להצטרף שוב עם הקוד מהמורה.'); return; }
        if (quiet) return;
        if (d.pts) toast('⭐ +' + d.pts + ' נקודות לכיתה ' + (me.name || '') + ' · היום ' + d.today);
        else if (d.capped) toast('הגעתם היום לתקרה של 400 נקודות. כל הכבוד! מחר ממשיכים לצבור.');
      })
      .catch(function () { var L = pend(); body.game = o.game; L.push({ game: o.game, pts: o.pts, ref: body.ref }); pend(L); });
  }
  // תרגול לבגרות (limudim-nekudot.js, window.PTS): כל תרגיל שנגמר נשלח מ-PTS.add.
  // דו-קרב שולח גם ל-KITA_Q את אותן נקודות באותו רגע – מדלגים עליו כדי לא לספור פעמיים.
  var lastPts = null, seq = 0;
  function add(o) {
    if (!o || !o.game || !(o.pts > 0)) return;
    if (!o._pts && lastPts && lastPts.game === o.game && lastPts.pts === Math.round(o.pts) && Date.now() - lastPts.t < 3000) { lastPts = null; return; }
    send(o);
  }
  window.KITA = { me: me, api: API, add: add };
  var Q = window.KITA_Q; window.KITA_Q = { push: add };
  if (Q && Q.forEach) Q.forEach(add);
  // נקודות שלא נשלחו (בלי אינטרנט) – נשלחות בכניסה הבאה. ref זהה נספר רק פעם אחת
  var L = pend(); if (L.length) { pend([]); L.forEach(function (o) { send(o, true); }); }

  var tEl = null, tTimer = 0;
  function toast(msg) {
    if (!tEl) {
      tEl = document.createElement('a'); tEl.className = 'kita-toast'; tEl.href = '/kelim/chashiva/kita/';
      tEl.setAttribute('role', 'status');
      tEl.style.cssText = 'position:fixed;inset-inline:12px;bottom:14px;z-index:9999;max-width:30rem;margin:0 auto;padding:.7rem 1rem;border-radius:14px;background:#1b3a33;color:#fbfaf2;border:1px solid #d8b35f;box-shadow:0 8px 30px rgba(0,0,0,.4);font:inherit;font-size:.98rem;text-align:center;text-decoration:none;transition:opacity .3s';
      document.body.appendChild(tEl);
    }
    tEl.textContent = msg + ' ← ללוח'; tEl.style.opacity = '1'; tEl.hidden = false;
    clearTimeout(tTimer); tTimer = setTimeout(function () { tEl.style.opacity = '0'; setTimeout(function () { tEl.hidden = true; }, 350); }, 5000);
  }

  function hook() {
    var CH = window.CH;
    if (!CH || !CH.record) return false;
    if (CH.record._kita) return true;
    var orig = CH.record;
    CH.record = function (game, daily, sec, hints) {
      var r = orig.apply(this, arguments);
      try {
        var pts = 10 + (daily ? 10 : 0) + (hints ? 0 : 5);
        add({ game: String(game).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'game', pts: pts, ref: game + (daily ? '-d-' + CH.today() : '-p-' + Date.now()) });
      } catch (e) {}
      return r;
    };
    CH.record._kita = 1;
    return true;
  }
  function hookPts() {
    var P = window.PTS;
    if (!P || !P.add) return false;
    if (P.add._kita) return true;
    var orig = P.add;
    P.add = function (src, n) {
      var r = orig.apply(this, arguments);
      try {
        n = Math.round(n || 0);
        if (n > 0) { var g = String(src).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24) || 'limud'; lastPts = { game: g, pts: n, t: Date.now() }; add({ game: g, pts: n, ref: g + '-' + Date.now() + '-' + (++seq), _pts: 1 }); }
      } catch (e) {}
      return r;
    };
    P.add._kita = 1;
    return true;
  }
  if (!(hook() & hookPts())) { var n = 0, t = setInterval(function () { var a = hook(), b = hookPts(); if ((a && b) || ++n > 60) clearInterval(t); }, 250); }
})();
