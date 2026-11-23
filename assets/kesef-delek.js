// מחשבון דלק (/kesef/delek/) – עלות נסיעה, הוצאה חודשית/שנתית, השוואת שני רכבים (דלק/חשמלי). הכול בטלפון, בלי שרת.
// נשמר רק ב-localStorage במפתח kesef-delek. מחיר הליטר ברירת מחדל מ-kesef-delek-price.js (אפשר לשנות ידנית).
// אין מחיר קוט"ש ברירת מחדל: התעריף משתנה לפי חשבון החשמל ולא ממציאים אותו.
// מדידה: window.toolUsed(tool, {action}) – trip / month / compare / copy / wa, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var root = document.getElementById('delek');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'kesef-delek';
  var TOOL = document.body.getAttribute('data-tool') || 'delek';
  var LINK = 'https://hakelim.com/kesef/delek/';
  var P = window.DELEK_PRICE || { b95: 7.35, label: '' };
  var IDS = ['km', 'pax', 'cons', 'price', 'mkm', 'ykm', 'ac', 'ap', 'bc', 'bp'];
  var st = { unit: 'kpl', rt: false, at: 'f', bt: 'e' };

  function load() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  var sent = {};
  function used(a) { if (sent[a]) return; sent[a] = 1; if (window.toolUsed) window.toolUsed(TOOL, { action: a }); }

  function num(v) {
    var s = String(v == null ? '' : v).trim().replace(/[,\s ₪‎‏]/g, '');
    if (s === '') return null;
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
    return Number(s);
  }
  function fmt(n, d) {
    if (!isFinite(n)) return '-';
    var x = Number(n.toFixed(d == null ? 2 : d));
    return x.toLocaleString('en-US', { maximumFractionDigits: d == null ? 2 : d });
  }
  function shek(n) { return isFinite(n) ? fmt(n, n < 100 ? 2 : 0) + ' ₪' : '-'; }
  function pos(v) { return typeof v === 'number' && isFinite(v) && v > 0; }
  function set(id, t) { var e = $(id); if (e) e.textContent = t; }

  // ק"מ לליטר ← מה שהוקלד (לפי היחידה שנבחרה)
  function kmPerLiter(v) { if (!pos(v)) return null; return st.unit === 'kpl' ? v : 100 / v; }

  var trip = { text: '' };
  function calcTrip() {
    var km = num($('dk-km').value), pax = num($('dk-pax').value), c = kmPerLiter(num($('dk-cons').value)), pr = num($('dk-price').value);
    if (!pos(pax)) pax = 1;
    pax = Math.max(1, Math.round(pax));
    var ok = pos(km) && pos(c) && pos(pr);
    if (!ok) {
      ['cost', 'liters', 'per', 'perkm', 'dist'].forEach(function (k) { set('dk-' + k, '-'); });
      set('dk-way', ''); trip.text = ''; wa();
      return;
    }
    var dist = st.rt ? km * 2 : km;
    var liters = dist / c;
    var cost = liters * pr;
    set('dk-cost', shek(cost));
    set('dk-liters', fmt(liters, 1));
    set('dk-per', shek(cost / pax));
    set('dk-perkm', shek(cost / dist));
    set('dk-dist', fmt(dist, 1) + ' ק״מ');
    set('dk-way', (st.rt ? 'הלוך וחזור. ' : '') + (pax > 1 ? 'מחולק שווה בין ' + pax + ' נוסעים.' : ''));
    trip.text = 'עלות דלק לנסיעה של ' + fmt(dist, 1) + ' ק״מ: ' + shek(cost) + (pax > 1 ? ' (' + shek(cost / pax) + ' לכל אחד מ-' + pax + ' נוסעים)' : '') +
      ' (' + fmt(liters, 1) + ' ליטר במחיר ' + fmt(pr, 2) + ' ₪). חישוב: ' + LINK;
    wa();
    used('trip');
  }
  function wa() {
    var a = $('dk-wa');
    if (a) a.href = trip.text ? 'https://wa.me/?text=' + encodeURIComponent(trip.text) : '#';
  }

  function calcMonth() {
    var mk = num($('dk-mkm').value), c = kmPerLiter(num($('dk-cons').value)), pr = num($('dk-price').value);
    if (!(pos(mk) && pos(c) && pos(pr))) { set('dk-month', '-'); set('dk-year', '-'); return; }
    var m = mk / c * pr;
    set('dk-month', shek(m));
    set('dk-year', shek(m * 12));
    used('month');
  }

  // עלות שנתית של רכב: דלק (ק"מ/ליטר × מחיר הליטר) או חשמלי (קוט"ש/100 ק"מ × מחיר קוט"ש)
  function carYear(side, ykm) {
    var t = st[side + 't'], c = num($('dk-' + side + 'c').value);
    if (!pos(c) || !pos(ykm)) return null;
    if (t === 'f') { var pr = num($('dk-price').value); return pos(pr) ? ykm / c * pr : null; }
    var kp = num($('dk-' + side + 'p').value);
    return pos(kp) ? ykm / 100 * c * kp : null;
  }
  function calcCmp() {
    var ykm = num($('dk-ykm').value), a = carYear('a', ykm), b = carYear('b', ykm);
    set('dk-ca', a == null ? '-' : shek(a));
    set('dk-cb', b == null ? '-' : shek(b));
    if (a == null || b == null) { set('dk-diff', ''); return; }
    var d = Math.abs(a - b);
    set('dk-diff', d < 1 ? 'העלות זהה.' : (a < b ? 'רכב א׳' : 'רכב ב׳') + ' זול יותר ב-' + shek(d) + ' בשנה.');
    used('compare');
  }
  function sideUi(side) {
    var e = st[side + 't'] === 'e';
    set('dk-' + side + 'l', e ? 'קוט״ש ל-100 ק״מ' : 'ק״מ לליטר');
    var w = $('dk-' + side + 'p-w'); if (w) w.hidden = !e;
    var c = $('dk-' + side + 'c'); if (c) c.placeholder = e ? '16' : '12';
    var s = $('dk-' + side + 't'); if (s) s.value = st[side + 't'];
  }
  function unitUi() {
    var k = st.unit === 'kpl';
    $('dk-u1').setAttribute('aria-pressed', k ? 'true' : 'false');
    $('dk-u2').setAttribute('aria-pressed', k ? 'false' : 'true');
    set('dk-clbl', k ? 'צריכת דלק (ק״מ לליטר)' : 'צריכת דלק (ליטר ל-100 ק״מ)');
    $('dk-cons').placeholder = k ? '15' : '6.7';
  }
  function all() { calcTrip(); calcMonth(); calcCmp(); save(); }
  function save() {
    var o = { unit: st.unit, rt: st.rt, at: st.at, bt: st.bt };
    IDS.forEach(function (k) { o[k] = $('dk-' + k).value; });
    st = o; store();
  }

  // טעינה: מצב שמור, ואם אין – מחיר ברירת המחדל
  var s0 = load();
  if (s0) { st = s0; IDS.forEach(function (k) { if (s0[k] != null) $('dk-' + k).value = s0[k]; }); }
  if (!$('dk-price').value) $('dk-price').value = String(P.b95);
  $('dk-rt').checked = !!st.rt;
  set('dk-pnote', 'מחיר ברירת המחדל: בנזין 95 בתדלוק עצמי, ' + (P.label || '') + ', ' + fmt(P.b95, 2) + ' ₪ לליטר. אפשר לשנות.');
  unitUi(); sideUi('a'); sideUi('b');

  IDS.forEach(function (k) { $('dk-' + k).addEventListener('input', all); });
  $('dk-rt').addEventListener('change', function () { st.rt = this.checked; all(); });
  $('dk-u1').addEventListener('click', function () { st.unit = 'kpl'; unitUi(); all(); });
  $('dk-u2').addEventListener('click', function () { st.unit = 'l100'; unitUi(); all(); });
  ['a', 'b'].forEach(function (side) {
    $('dk-' + side + 't').addEventListener('change', function () { st[side + 't'] = this.value; sideUi(side); all(); });
  });
  $('dk-copy').addEventListener('click', function () {
    if (!trip.text) return;
    var b = this;
    function ok() { b.textContent = '✓ הועתק'; setTimeout(function () { b.textContent = '📋 להעתיק'; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(trip.text).then(ok, function () {});
    used('copy');
  });
  $('dk-wa').addEventListener('click', function () { used('wa'); });
  all();
})();
