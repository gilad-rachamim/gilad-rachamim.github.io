// מחשבון ריבית דריבית (/kesef/ribit-dribit/) – הכול בטלפון, בלי שרת. נשמר רק ב-localStorage במפתח kesef-ribit.
// החשבון חודש אחרי חודש: ריבית על היתרה (חודשית, או מצטברת ומתווספת פעם בשנה), דמי ניהול מהצבירה (1/12 מהשיעור השנתי כל חודש),
// ואז ההפקדה החודשית בסוף החודש. ערך ריאלי = הסכום מחולק ב-(1+אינפלציה)^שנים.
// מדידה: window.toolUsed(tool, {action}) מ-kelim.js – calc / compare / wa / print / reset, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var root = document.getElementById('ribit');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var KEY = 'kesef-ribit';
  var TOOL = document.body.getAttribute('data-tool') || 'ribit_dribit';
  var LINK = 'https://hakelim.com/kesef/ribit-dribit/';
  var DEF = { p: '10,000', m: '500', r: '5', y: '20', f: 'm', fee: '', inf: '', cmp: 'fee', b: '1' };

  function load() { try { var v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function store() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; }
  function ils(n) { var neg = n < 0; n = Math.round(Math.abs(n)); return (neg ? '-' : '') + '₪' + n.toLocaleString('he-IL'); }
  function pct(n) { return String(Math.round(n * 100) / 100) + '%'; }
  function short(n) {
    try { return new Intl.NumberFormat('he-IL', { notation: 'compact', maximumFractionDigits: 1 }).format(n); }
    catch (e) { return n >= 1e6 ? (Math.round(n / 1e5) / 10) + ' מיליון' : n >= 1e3 ? Math.round(n / 1e3) + ' אלף' : String(Math.round(n)); }
  }
  function yrs(n) { return n === 1 ? 'שנה אחת' : (Math.round(n * 10) / 10) + ' שנים'; }
  var sent = {};
  function used(a) { if (sent[a]) return; sent[a] = 1; if (window.toolUsed) window.toolUsed(TOOL, { action: a }); }

  var saved = load();
  var st = Object.assign({}, DEF, saved || {});

  // P סכום התחלתי, M הפקדה חודשית, rate ריבית שנתית %, years שנים, f 'm' חודשית / 'y' שנתית, fee דמי ניהול שנתיים %
  function sim(P, M, rate, years, f, fee) {
    var months = Math.max(1, Math.round(years * 12)), r = rate / 100 / 12, fm = fee / 100 / 12;
    var bal = P, dep = P, feeTot = 0, pend = 0, rows = [];
    for (var i = 1; i <= months; i++) {
      if (f === 'y') { pend += bal * r; if (i % 12 === 0 || i === months) { bal += pend; pend = 0; } }
      else bal += bal * r;
      var fe = bal > 0 ? bal * fm : 0; bal -= fe; feeTot += fe;
      bal += M; dep += M;
      if (i % 12 === 0 || i === months) rows.push({ y: i / 12, dep: dep, bal: bal, fee: feeTot });
    }
    return { bal: bal, dep: dep, fee: feeTot, gain: bal - dep + feeTot, rows: rows, years: months / 12 };
  }

  var ids = { p: 'rd-p', m: 'rd-m', r: 'rd-r', y: 'rd-y', fee: 'rd-fee', inf: 'rd-inf', b: 'rd-b' };
  Object.keys(ids).forEach(function (k) {
    var el = $(ids[k]); el.value = st[k];
    el.addEventListener('input', function () { st[k] = el.value; store(); used(k === 'b' ? 'compare' : 'calc'); calc(); });
  });
  function seg(id, k) {
    var bs = root.querySelectorAll('#' + id + ' button');
    function mark() { Array.prototype.forEach.call(bs, function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === st[k] ? 'true' : 'false'); }); }
    Array.prototype.forEach.call(bs, function (b) {
      b.addEventListener('click', function () { st[k] = b.getAttribute('data-v'); mark(); store(); used(k === 'cmp' ? 'compare' : 'calc'); calc(); });
    });
    mark();
    return mark;
  }
  var marks = [seg('rd-f', 'f'), seg('rd-cmp', 'cmp')];
  if (num(st.fee) || num(st.inf)) $('rd-more').open = true;

  function isDef() { return Object.keys(DEF).every(function (k) { return String(st[k]) === String(DEF[k]); }); }

  function chart(res, inf) {
    var rows = res.rows, n = rows.length, W = 640, H = 290, L = 70, R = 10, T = 14, B = 34;
    var max = 0; rows.forEach(function (x) { max = Math.max(max, x.bal, x.dep); });
    if (max <= 0) return '';
    var step = Math.pow(10, Math.floor(Math.log10(max / 4))), nice = [1, 2, 2.5, 5, 10];
    var tick = step; for (var j = 0; j < nice.length; j++) { if (max / (step * nice[j]) <= 5) { tick = step * nice[j]; break; } }
    var top = Math.ceil(max / tick) * tick, ph = H - T - B, pw = W - L - R, bw = pw / n, gap = Math.min(bw * 0.28, 8);
    var Y = function (v) { return T + ph - Math.max(0, v) / top * ph; };
    var s = '';
    for (var t = 0; t <= top + 1e-9; t += tick) {
      s += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '"/>' +
        '<text class="yl" direction="rtl" text-anchor="start" x="' + (L - 8) + '" y="' + (Y(t) + 4).toFixed(1) + '">' + (t ? short(t) : '0') + '</text>';
    }
    var every = Math.ceil(n / 10), pts = [];
    rows.forEach(function (x, i) {
      var x0 = L + i * bw + gap / 2, w = Math.max(1, bw - gap), d = Math.min(x.dep, x.bal), g = Math.max(0, x.bal - x.dep);
      s += '<rect class="dep" x="' + x0.toFixed(1) + '" y="' + Y(d).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (Y(0) - Y(d)).toFixed(1) + '"/>';
      if (g > 0) s += '<rect class="int" x="' + x0.toFixed(1) + '" y="' + Y(d + g).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (Y(d) - Y(d + g)).toFixed(1) + '"/>';
      if ((i + 1) % every === 0 || i === n - 1 || i === 0) s += '<text class="xl" text-anchor="middle" x="' + (x0 + w / 2).toFixed(1) + '" y="' + (H - B + 18) + '">' + (Math.round(x.y * 10) / 10) + '</text>';
      if (inf > 0) pts.push((x0 + w / 2).toFixed(1) + ',' + Y(x.bal / Math.pow(1 + inf / 100, x.y)).toFixed(1));
    });
    if (pts.length > 1) s += '<polyline class="real" points="' + pts.join(' ') + '"/>';
    s += '<text class="xl" direction="rtl" text-anchor="start" x="' + (W - R) + '" y="' + (H - 2) + '">שנים</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="גרף לפי שנים: ההפקדות והריבית. בסוף ' + ils(res.bal) + '">' + s + '</svg>';
  }

  function calc() {
    var P = Math.max(0, num(st.p)), M = Math.max(0, num(st.m)), rate = Math.max(-20, Math.min(100, num(st.r)));
    var years = Math.min(80, num(st.y)), fee = Math.max(0, Math.min(10, num(st.fee))), inf = Math.max(-5, Math.min(30, num(st.inf)));
    $('rd-example').hidden = !isDef();
    var ok = years > 0 && (P > 0 || M > 0);
    $('rd-out').hidden = !ok; $('rd-empty').hidden = ok;
    if (!ok) return;
    var res = sim(P, M, rate, years, st.f, fee), Y = res.years;
    $('rd-total').textContent = ils(res.bal);
    $('rd-total-sub').textContent = 'אחרי ' + yrs(Y) + ', בריבית ' + pct(rate) + ' בשנה' + (fee ? ' ודמי ניהול ' + pct(fee) : '');
    $('rd-dep').textContent = ils(res.dep);
    $('rd-gain').textContent = ils(res.gain);
    $('rd-fee-v').textContent = ils(res.fee); $('rd-fee-box').hidden = !fee;
    var real = res.bal / Math.pow(1 + inf / 100, Y);
    $('rd-real').textContent = ils(real); $('rd-real-box').hidden = !inf;
    var share = res.bal > 0 ? Math.max(0, Math.min(1, (res.bal - res.dep) / res.bal)) : 0;
    $('rd-bar').innerHTML = '<i style="width:' + ((1 - share) * 100).toFixed(1) + '%;background:#4f8f6b"></i><i style="width:' + (share * 100).toFixed(1) + '%;background:var(--gold)"></i>';
    $('rd-share').textContent = res.bal > res.dep ? 'הריבית היא ' + Math.round(share * 100) + '% מהסכום בסוף' : '';
    $('rd-72').textContent = rate > 0 ? 'כלל 72: בריבית ' + pct(rate) + ' בשנה, כסף מוכפל בערך כל ' + (Math.round(72 / rate * 10) / 10) + ' שנים.' : '';
    $('rd-chart').innerHTML = chart(res, inf);
    $('rd-leg-int').textContent = fee ? 'ריבית (אחרי דמי ניהול)' : 'ריבית';
    $('rd-leg-real').hidden = !inf;
    // טבלה לפי שנה
    $('rd-th-real').hidden = !inf;
    $('rd-rows').innerHTML = res.rows.map(function (x) {
      return '<tr><td>' + (Math.round(x.y * 10) / 10) + '</td><td class="n">' + ils(x.dep) + '</td><td class="n">' + ils(x.bal - x.dep) + '</td><td class="n"><b>' + ils(x.bal) + '</b></td>' +
        (inf ? '<td class="n">' + ils(x.bal / Math.pow(1 + inf / 100, x.y)) + '</td>' : '') + '</tr>';
    }).join('');
    // השוואה
    var b = num(st.b), isFee = st.cmp !== 'rate';
    $('rd-b-lbl').textContent = isFee ? 'דמי ניהול בחישוב השני (%)' : 'ריבית בחישוב השני (%)';
    var resB = isFee ? sim(P, M, rate, years, st.f, Math.max(0, Math.min(10, b))) : sim(P, M, Math.max(-20, Math.min(100, b)), years, st.f, fee);
    var la = isFee ? 'דמי ניהול ' + pct(fee) : 'ריבית ' + pct(rate), lb = isFee ? 'דמי ניהול ' + pct(Math.max(0, b)) : 'ריבית ' + pct(b);
    var mx = Math.max(res.bal, resB.bal, 1);
    $('rd-cmp-out').innerHTML = [[la, res.bal, 'a'], [lb, resB.bal, 'b']].map(function (c) {
      return '<div class="rd-c ' + c[2] + '"><span>' + c[0] + '</span><b>' + ils(c[1]) + '</b><i style="width:' + Math.max(2, c[1] / mx * 100).toFixed(1) + '%"></i></div>';
    }).join('');
    var diff = resB.bal - res.bal;
    $('rd-diff').innerHTML = Math.abs(diff) < 1 ? 'אין הבדל בסכום בסוף.' :
      'עם <b>' + lb + '</b> יהיו בסוף <b class="' + (diff < 0 ? 'down' : 'up') + '">' + ils(Math.abs(diff)) + ' ' + (diff < 0 ? 'פחות' : 'יותר') + '</b> מאשר עם ' + la + ', אחרי ' + yrs(Y) + '.';
    // ווטסאפ
    var txt = 'חישוב ריבית דריבית:\n' + (P ? ils(P) + ' בהתחלה' : '') + (P && M ? ' + ' : '') + (M ? ils(M) + ' בכל חודש' : '') +
      ', ריבית ' + pct(rate) + ' בשנה' + (fee ? ', דמי ניהול ' + pct(fee) : '') + ', ' + yrs(Y) + '\n' +
      'בסוף: ' + ils(res.bal) + ' (הופקדו ' + ils(res.dep) + ', ריבית ' + ils(res.gain) + ')' + (inf ? '\nבכסף של היום: ' + ils(real) : '') +
      '\n\nמחשבון ריבית דריבית בחינם, בלי הרשמה:\n' + LINK;
    $('rd-wa').href = 'https://wa.me/?text=' + encodeURIComponent(txt);
  }

  $('rd-wa').addEventListener('click', function () { used('wa'); });
  $('rd-print').addEventListener('click', function () { used('print'); $('rd-years').open = true; window.print(); });
  window.addEventListener('beforeprint', function () { $('rd-years').open = true; });
  $('rd-reset').addEventListener('click', function () {
    st = Object.assign({}, DEF); store(); used('reset');
    Object.keys(ids).forEach(function (k) { $(ids[k]).value = st[k]; });
    marks.forEach(function (f) { f(); }); $('rd-more').open = false; calc();
  });
  calc();
})();
