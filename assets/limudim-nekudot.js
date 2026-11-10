// הנקודות שלי – פרופיל נקודות משותף לדו-קרב מתמטיקה, דו-קרב אנגלית וחידון הטריוויה.
// הכול נשמר רק בטלפון (localStorage 'limudim-nekudot'). בלי שם מלא ובלי טלפון: כינוי בלבד.
// הסכמה מתועדת ב-points-schema.md (לשיחת הכיתות והמורים, שתצבור את אותן נקודות ללוח כיתתי).
//
// { v:1, pid:'k7f2', nick:'', total:0,
//   by:{ 'krav-math':0, 'krav-eng':0, 'chidon':0 },   // לפי מקור
//   days:{ '2026-11-10':0 },                           // לפי יום (120 ימים אחרונים)
//   log:[ { t:<שניות מאז 1970>, s:'krav-math', n:<נקודות>, c:<נכונות>, q:<שאלות>, u:<רמה> } ] }  // 300 אחרונות
(function () {
  'use strict';
  var KEY = 'limudim-nekudot';
  var PTS = window.PTS = {};
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dk(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function rid() { var s = '', a = 'abcdefghjkmnpqrstuvwxyz23456789'; for (var i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  function read() {
    var o; try { o = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { o = null; }
    if (!o || typeof o !== 'object') o = {};
    o.v = 1; o.total = o.total | 0; o.by = o.by || {}; o.days = o.days || {}; o.log = o.log || [];
    if (!o.pid) { o.pid = rid(); write(o); }
    if (typeof o.nick !== 'string') o.nick = '';
    return o;
  }
  function write(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  // כינוי: עד 20 תווים, בלי רצף ספרות ארוך (כדי שלא ייכנס מספר טלפון בטעות)
  PTS.clean = function (s) { return String(s || '').replace(/[<>"]/g, '').replace(/\d[\d\s-]{5,}/g, '').trim().slice(0, 20); };
  PTS.state = function () { return read(); };
  PTS.pid = function () { return read().pid; };
  PTS.nick = function () { var o = read(); if (o.nick) return o.nick; try { return PTS.clean(localStorage.getItem('chashiva-name') || ''); } catch (e) { return ''; } };
  PTS.setNick = function (s) { var o = read(); o.nick = PTS.clean(s); write(o); try { localStorage.setItem('chashiva-name', o.nick); } catch (e) {} return o.nick; };
  function sunday() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d; }
  PTS.week = function (o) {
    o = o || read(); var s = dk(sunday()), n = 0;
    Object.keys(o.days).forEach(function (k) { if (k >= s) n += o.days[k] | 0; });
    return n;
  };
  PTS.today = function (o) { o = o || read(); return o.days[dk()] | 0; };
  // מוסיף נקודות. src: 'krav-math' | 'krav-eng' | 'chidon'. info: {c: נכונות, q: שאלות, u: רמה}
  PTS.add = function (src, n, info) {
    n = Math.max(0, Math.round(n || 0)); if (!n) return read().total;
    var o = read(); info = info || {};
    o.total += n; o.by[src] = (o.by[src] | 0) + n;
    var k = dk(); o.days[k] = (o.days[k] | 0) + n;
    var keys = Object.keys(o.days).sort(); while (keys.length > 120) delete o.days[keys.shift()];
    o.log.push({ t: Math.floor(Date.now() / 1000), s: src, n: n, c: info.c | 0, q: info.q | 0, u: info.u | 0 });
    while (o.log.length > 300) o.log.shift();
    write(o);
    PTS.render();
    return o.total;
  };
  var NAMES = { 'krav-math': 'דו-קרב מתמטיקה', 'krav-eng': 'דו-קרב אנגלית', 'chidon': 'חידון וטריוויה' };
  PTS.label = function (src) { return NAMES[src] || src; };
  // תיבה קטנה "הנקודות שלי" בכל אלמנט עם data-pts
  PTS.render = function () {
    var els = document.querySelectorAll('[data-pts]'); if (!els.length) return;
    var o = read(), w = PTS.week(o);
    var by = Object.keys(NAMES).filter(function (k) { return o.by[k]; }).map(function (k) { return '<span>' + NAMES[k] + ': <b>' + o.by[k] + '</b></span>'; }).join('');
    var html = '<div class="pts-box"><div class="pts-top"><span class="pts-star" aria-hidden="true">⭐</span><div><b>' + o.total + ' נקודות</b><small>השבוע: ' + w + ' · היום: ' + PTS.today(o) + '</small></div></div>' +
      (by ? '<div class="pts-by">' + by + '</div>' : '<p class="pts-hint">עוד אין נקודות. כל תשובה נכונה בדו-קרב או בחידון מוסיפה נקודות, והן נשמרות בטלפון הזה.</p>') + '</div>';
    els.forEach(function (el) { el.innerHTML = html; });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', PTS.render); else PTS.render();
})();
