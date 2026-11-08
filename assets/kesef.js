// כלים לכסף – ארבעה מחשבונים בטלפון, בלי שרת. הנתונים נשמרים רק ב-localStorage (מפתחות kesef-*).
// מדידה: window.toolUsed(tool, {action}) מ-kelim.js → אירוע GA4 tool_use{site:'kesef', tool, action}, פעם אחת לכל פעולה בביקור.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var TOOL = document.body.getAttribute('data-tool') || '';

  function load(k, def) { try { var v = localStorage.getItem('kesef-' + k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(k, v) { try { localStorage.setItem('kesef-' + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function drop(k) { try { localStorage.removeItem('kesef-' + k); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  // "1,250.5 ₪" → 1250.5 ; ריק או לא מספר → 0
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^\d.\-]/g, '')); return isFinite(n) ? n : 0; }
  function ils(n, dec) {
    var neg = n < 0; n = Math.abs(n);
    var s = n.toLocaleString('he-IL', { maximumFractionDigits: dec == null ? 0 : dec, minimumFractionDigits: 0 });
    return (neg ? '-' : '') + '₪' + s;
  }
  function today(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function flash(el, t) { if (!el) return; el.textContent = t; clearTimeout(el._t); el._t = setTimeout(function () { el.textContent = ''; }, 2600); }
  var sent = {};
  function used(action, extra) {
    if (sent[action]) return; sent[action] = 1;
    if (window.toolUsed) window.toolUsed(TOOL, Object.assign({ action: action }, extra || {}));
  }
  function csvDownload(name, rows) {
    var body = rows.map(function (r) { return r.map(function (c) { c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
    a.download = name + ' – ' + today() + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }
  function rowHtml(name, amt, ph1, ph2) {
    return '<div class="lrow"><input type="text" data-k="n" maxlength="40" aria-label="שם" placeholder="' + esc(ph1) + '" value="' + esc(name) + '">' +
      '<input type="text" class="num-in" data-k="a" inputmode="decimal" aria-label="סכום בשקלים" placeholder="' + esc(ph2 || '₪') + '" value="' + esc(amt) + '">' +
      '<button class="del" type="button" data-del aria-label="למחוק את השורה">×</button></div>';
  }

  // מחיקה מהטלפון (בכל כלי)
  document.addEventListener('click', function (e) {
    var wipe = e.target.closest('[data-wipe]');
    if (!wipe) return;
    if (!confirm('למחוק מהטלפון את כל מה ששמרת בכלי הזה? אי אפשר להחזיר.')) return;
    wipe.getAttribute('data-wipe').split(',').forEach(drop);
    location.reload();
  });

  // =====================================================================
  // K1 תקציב משפחתי
  // =====================================================================
  (function () {
    if (!$('taktziv')) return;
    var st = load('taktziv', null) || { in: [{ n: 'משכורת', a: '' }], fix: [{ n: 'שכירות / משכנתא', a: '' }], spent: '', save: '' };
    var lists = { in: $('t-in'), fix: $('t-fix') };
    var ph = { in: ['משכורת, קצבה...', '₪'], fix: ['חשמל, ביטוח...', '₪'] };

    function draw(key) {
      lists[key].innerHTML = st[key].map(function (r) { return rowHtml(r.n, r.a, ph[key][0], ph[key][1]); }).join('');
    }
    function store() { save('taktziv', st); }
    function sum(list) { return list.reduce(function (s, r) { return s + num(r.a); }, 0); }

    function calc() {
      var I = sum(st.in), F = sum(st.fix), S = num(st.spent), V = num(st.save);
      var now = new Date(), dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      var daysLeft = dim - now.getDate() + 1;
      var free = I - F - V, left = free - S, perWeek, perDay, sub;
      $('t-in-sum').textContent = ils(I);
      $('t-fix-sum').textContent = ils(F);
      if (S > 0) {
        perWeek = left / (daysLeft / 7); perDay = left / daysLeft;
        $('t-week-lbl').textContent = 'נשאר לנו לשבוע, עד סוף החודש';
        sub = 'נשארו ' + ils(left) + ' ל-' + daysLeft + ' הימים שנשארו בחודש';
      } else {
        perWeek = free / (dim / 7); perDay = free / dim;
        $('t-week-lbl').textContent = 'נשאר לנו לשבוע';
        sub = 'מתוך ' + ils(free) + ' פנויים בחודש, אחרי הקבועות' + (V ? ' והחיסכון' : '');
      }
      if (!I) sub = 'ממלאים למעלה כמה נכנס בחודש, והחשבון יופיע כאן';
      else if (left < 0) sub = 'ההוצאות גבוהות מההכנסות ב-' + ils(-left) + ' בחודש. אולי יש הוצאה קבועה שאפשר להקטין?';
      $('t-week').textContent = ils(perWeek);
      $('t-week').classList.toggle('neg', perWeek < 0);
      $('t-week-sub').textContent = sub;
      $('t-left').textContent = ils(left);
      $('t-day').textContent = ils(perDay);
      $('t-fixpct').textContent = I ? Math.round(F / I * 100) + '%' : '0%';
      var parts = I ? [[F, 'var(--gold)'], [V, 'var(--good)'], [S, '#9aa69e']] : [];
      $('t-bar').innerHTML = parts.map(function (p) { var w = Math.max(0, Math.min(100, p[0] / I * 100)); return w ? '<i style="width:' + w.toFixed(1) + '%;background:' + p[1] + '"></i>' : ''; }).join('');
      if (I) used('calc');
    }

    ['in', 'fix'].forEach(function (key) {
      draw(key);
      lists[key].addEventListener('input', function (e) {
        var row = e.target.closest('.lrow'); if (!row) return;
        var i = $$('.lrow', lists[key]).indexOf(row);
        st[key][i][e.target.getAttribute('data-k')] = e.target.value;
        store(); calc();
      });
      lists[key].addEventListener('click', function (e) {
        if (!e.target.closest('[data-del]')) return;
        var i = $$('.lrow', lists[key]).indexOf(e.target.closest('.lrow'));
        st[key].splice(i, 1); draw(key); store(); calc();
      });
    });
    function addRow(key, name) {
      st[key].push({ n: name || '', a: '' }); draw(key); store();
      var rows = $$('.lrow', lists[key]), last = rows[rows.length - 1];
      last.querySelector(name ? '[data-k=a]' : '[data-k=n]').focus();
    }
    $$('[data-add]').forEach(function (b) { b.addEventListener('click', function () { addRow(b.getAttribute('data-add')); }); });
    $$('#t-fix-chips button').forEach(function (b) { b.addEventListener('click', function () { addRow('fix', b.textContent); }); });
    $('t-spent').value = st.spent || ''; $('t-save').value = st.save || '';
    $('t-spent').addEventListener('input', function () { st.spent = this.value; store(); calc(); });
    $('t-save').addEventListener('input', function () { st.save = this.value; store(); calc(); });
    $('t-csv').addEventListener('click', function () {
      var rows = [['סוג', 'שם', 'סכום בחודש (₪)']];
      st.in.forEach(function (r) { if (r.n || r.a) rows.push(['הכנסה', r.n, num(r.a)]); });
      st.fix.forEach(function (r) { if (r.n || r.a) rows.push(['הוצאה קבועה', r.n, num(r.a)]); });
      if (num(st.save)) rows.push(['חיסכון', 'שמים בצד', num(st.save)]);
      if (num(st.spent)) rows.push(['הוצאות משתנות', 'הוצאנו עד היום', num(st.spent)]);
      var I = sum(st.in), F = sum(st.fix);
      rows.push([], ['סיכום', 'סך הכנסות', I], ['סיכום', 'סך הוצאות קבועות', F], ['סיכום', 'נשאר לחודש', I - F - num(st.save) - num(st.spent)], ['סיכום', 'לשבוע', $('t-week').textContent.replace(/[^\d.\-]/g, '')]);
      csvDownload('תקציב משפחתי', rows);
      flash($('t-saved'), 'נשמר קובץ. אפשר לפתוח אותו באקסל או בגוגל שיטס.');
      used('csv');
    });
    $('t-print').addEventListener('click', function () { used('print'); window.print(); });
    calc();
  })();

  // =====================================================================
  // K5 מחשבון הלוואה ומשכנתא
  // =====================================================================
  (function () {
    if (!$('halvaa')) return;
    var st = load('halvaa', null) || { amt: '500,000', rate: '4.5', years: '25', m: 'spitzer' };
    // לוח סילוקין: P קרן, rate ריבית שנתית באחוזים, n חודשים, m שיטה, extra תוספת קבועה לקרן כל חודש
    function sched(P, rate, n, m, extra) {
      var i = rate / 100 / 12, bal = P, pmt = i ? P * i / (1 - Math.pow(1 + i, -n)) : P / n;
      var base = P / n, totInt = 0, months = 0, first = 0, last = 0, years = [], y = null;
      while (bal > 0.005 && months < 1200) {
        var it = bal * i, pr = m === "keren" ? base + extra : pmt - it + extra;
        if (pr > bal) pr = bal;
        var pay = pr + it;
        bal -= pr; totInt += it; months++;
        if (months === 1) first = pay;
        last = pay;
        if ((months - 1) % 12 === 0) { y = { paid: 0, int: 0, bal: 0 }; years.push(y); }
        y.paid += pay; y.int += it; y.bal = Math.max(0, bal);
      }
      return { first: first, last: last, totInt: totInt, total: P + totInt, months: months, years: years };
    }
    function dur(m) {
      var y = Math.floor(m / 12), r = m % 12, s = [];
      if (y) s.push(y === 1 ? 'שנה' : y === 2 ? 'שנתיים' : y + ' שנים');
      if (r) s.push(r === 1 ? 'חודש' : r + ' חודשים');
      return s.join(' ו-') || '0';
    }
    var amt = $('h-amt'), rate = $('h-rate'), years = $('h-years');
    amt.value = st.amt; rate.value = st.rate; years.value = st.years;
    function setMethod(m) {
      st.m = m;
      $$('#h-method button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-m') === m ? 'true' : 'false'); });
      $('h-method-note').textContent = m === 'keren' ? 'קרן שווה: מחזירים אותו חלק מהקרן כל חודש, אז ההחזר גבוה בהתחלה ויורד עם הזמן. סך הריבית נמוך יותר.' : 'שפיצר: אותו סכום כל חודש. זו השיטה הנפוצה.';
    }
    function calc() {
      st.amt = amt.value; st.rate = rate.value; st.years = years.value; save('halvaa', st);
      var P = num(amt.value), r = Math.max(0, num(rate.value)), Y = num(years.value);
      var dr = num($('h-wrate').value), dy = num($('h-wyears').value), ex = num($('h-wextra').value);
      var r2 = Math.max(0, r + dr), Y2 = Math.max(1, Y + dy);
      $('h-wrate-v').textContent = (dr > 0 ? '+' : '') + dr + '% → ' + r2.toFixed(2).replace(/\.?0+$/, '') + '%';
      $('h-wyears-v').textContent = Y2 + ' שנים';
      $('h-wextra-v').textContent = ils(ex);
      if (!P || !Y) {
        $('h-pay').textContent = '₪0'; $('h-pay-sub').textContent = 'ממלאים סכום ושנים, והחשבון יופיע כאן';
        $('h-int').textContent = $('h-total').textContent = '₪0'; $('h-ratio').textContent = '0';
        $('h-table').innerHTML = ''; $('h-years-t').innerHTML = ''; $('h-bar').innerHTML = '';
        return;
      }
      var base = sched(P, r, Math.round(Y * 12), st.m, 0);
      $('h-pay-lbl').textContent = st.m === 'keren' ? 'החזר בחודש הראשון' : 'החזר חודשי';
      $('h-pay').textContent = ils(base.first);
      $('h-pay-sub').textContent = st.m === 'keren' ? 'ויורד עד ' + ils(base.last) + ' בחודש האחרון, אחרי ' + dur(base.months) : 'כל חודש, במשך ' + dur(base.months);
      $('h-int').textContent = ils(base.totInt);
      $('h-total').textContent = ils(base.total);
      $('h-ratio').textContent = ils(base.total / P, 2);
      var ip = base.totInt / base.total * 100;
      $('h-bar').innerHTML = '<i style="width:' + (100 - ip).toFixed(1) + '%;background:var(--good)"></i><i style="width:' + ip.toFixed(1) + '%;background:var(--bad)"></i>';
      $('h-pay-sub').title = 'ירוק: קרן. אדום: ריבית.';
      var rows = [
        ['מה שהכנסתם', base],
        ['ריבית ' + r2.toFixed(2).replace(/\.?0+$/, '') + '%', sched(P, r2, Math.round(Y * 12), st.m, 0)],
        [Y2 + ' שנים', sched(P, r, Math.round(Y2 * 12), st.m, 0)],
        ['תוספת ' + ils(ex) + ' בחודש', sched(P, r, Math.round(Y * 12), st.m, ex)],
        ['הכול ביחד', sched(P, r2, Math.round(Y2 * 12), st.m, ex)]
      ];
      $('h-table').innerHTML = rows.map(function (row, k) {
        var s = row[1], d = s.totInt - base.totInt;
        var diff = k && Math.abs(d) >= 1 ? '<br><small class="' + (d > 0 ? 'up' : 'down') + '">' + (d > 0 ? '+' : '-') + ils(Math.abs(d)) + '</small>' : '';
        return '<tr><td>' + esc(row[0]) + '</td><td class="n">' + ils(s.first) + '</td><td class="n">' + ils(s.totInt) + diff + '</td><td>' + dur(s.months) + '</td></tr>';
      }).join('');
      $('h-years-t').innerHTML = base.years.map(function (y, k) {
        return '<tr><td>' + (k + 1) + '</td><td class="n">' + ils(y.paid) + '</td><td class="n">' + ils(y.int) + '</td><td class="n">' + ils(y.bal) + '</td></tr>';
      }).join('');
      used('calc');
    }
    $$('#h-method button').forEach(function (b) { b.addEventListener('click', function () { setMethod(b.getAttribute('data-m')); calc(); used('method'); }); });
    [amt, rate, years].forEach(function (el) { el.addEventListener('input', calc); });
    ['h-wrate', 'h-wyears', 'h-wextra'].forEach(function (id) { $(id).addEventListener('input', function () { calc(); used('whatif'); }); });
    setMethod(st.m); calc();
  })();

  // =====================================================================
  // K6 כמה זה עולה לי באמת (מנויים)
  // =====================================================================
  (function () {
    if (!$('minuyim')) return;
    var st = load('minuyim', null) || { list: [] };
    var box = $('m-list');
    var USE = [['a', 'משתמש הרבה'], ['s', 'לפעמים'], ['n', 'כמעט לא']];
    function monthly(r) { var p = num(r.p); return r.per === 'y' ? p / 12 : r.per === 'w' ? p * 52 / 12 : p; }
    function draw() {
      box.innerHTML = st.list.map(function (r) {
        return '<div class="sub-item' + (r.cut ? ' cut' : '') + '"><div class="lrow sub">' +
          '<input type="text" data-k="n" maxlength="40" aria-label="שם המנוי" placeholder="שם המנוי" value="' + esc(r.n) + '">' +
          '<input type="text" class="num-in" data-k="p" inputmode="decimal" aria-label="מחיר בשקלים" placeholder="₪" value="' + esc(r.p) + '">' +
          '<select data-k="per" aria-label="כל כמה זמן"><option value="m"' + (r.per === 'm' ? ' selected' : '') + '>בחודש</option><option value="y"' + (r.per === 'y' ? ' selected' : '') + '>בשנה</option><option value="w"' + (r.per === 'w' ? ' selected' : '') + '>בשבוע</option></select>' +
          '<button class="del" type="button" data-del aria-label="למחוק">×</button>' +
          '<div class="use">' + USE.map(function (u) { return '<button type="button" data-use="' + u[0] + '" aria-pressed="' + (r.use === u[0]) + '">' + u[1] + '</button>'; }).join('') +
          '<button type="button" data-cut aria-pressed="' + !!r.cut + '">' + (r.cut ? 'לבטל ✓' : 'לבטל?') + '</button></div>' +
          '</div></div>';
      }).join('') || '<p class="note" style="text-align:center">עוד אין מנויים ברשימה. לוחצים על שם למעלה, או על "מנוי אחר".</p>';
    }
    function calc() {
      var m = st.list.reduce(function (s, r) { return s + monthly(r); }, 0);
      $('m-year').textContent = ils(m * 12);
      $('m-month').textContent = ils(m) + ' בחודש';
      $('m-count').textContent = st.list.filter(function (r) { return num(r.p); }).length;
      $('m-day').textContent = ils(m * 12 / 365, 1);
      $('m-10').textContent = ils(m * 120);
      var cut = st.list.filter(function (r) { return r.cut && num(r.p); });
      var rare = st.list.filter(function (r) { return !r.cut && r.use === 'n' && num(r.p); });
      var html = '';
      if (cut.length) {
        var cm = cut.reduce(function (s, r) { return s + monthly(r); }, 0);
        html += '<p><b>אם מבטלים את מה שסימנתם</b> (' + cut.map(function (r) { return esc(r.n || 'מנוי'); }).join(', ') + '):<br>חוסכים <b>' + ils(cm) + '</b> בחודש, <b>' + ils(cm * 12) + '</b> בשנה.</p>';
      }
      if (rare.length) {
        var rm = rare.reduce(function (s, r) { return s + monthly(r); }, 0);
        html += '<p' + (cut.length ? ' style="margin-top:.6rem"' : '') + '>במה כמעט לא משתמשים (' + rare.map(function (r) { return esc(r.n || 'מנוי'); }).join(', ') + '): זה ' + ils(rm * 12) + ' בשנה. שווה לבדוק אם צריך.</p>';
      }
      if (!html && st.list.length > 1) html = '<p>מסמנים ליד כל מנוי כמה משתמשים בו, או "לבטל?", ורואים כאן כמה חוסכים.</p>';
      $('m-cancel').innerHTML = html; $('m-cancel').hidden = !html;
      if (m) used('calc');
    }
    function store() { save('minuyim', st); }
    function idx(el) { return $$('.sub-item', box).indexOf(el.closest('.sub-item')); }
    box.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k'); if (!k) return;
      st.list[idx(e.target)][k] = e.target.value; store(); calc();
    });
    box.addEventListener('change', function (e) {
      if (e.target.getAttribute('data-k') === 'per') { st.list[idx(e.target)].per = e.target.value; store(); calc(); }
    });
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var i = idx(b), r = st.list[i];
      if (b.hasAttribute('data-del')) st.list.splice(i, 1);
      else if (b.hasAttribute('data-use')) r.use = r.use === b.getAttribute('data-use') ? '' : b.getAttribute('data-use');
      else if (b.hasAttribute('data-cut')) { r.cut = !r.cut; used('cut'); }
      else return;
      store(); draw(); calc();
    });
    function add(name) {
      st.list.push({ n: name || '', p: '', per: 'm', use: '', cut: false }); store(); draw(); calc();
      var items = $$('.sub-item', box), last = items[items.length - 1];
      last.querySelector(name ? '[data-k=p]' : '[data-k=n]').focus();
      used('add');
    }
    $$('#m-chips button').forEach(function (b) { b.addEventListener('click', function () { add(b.textContent); }); });
    $('m-add').addEventListener('click', function () { add(''); });
    $('m-csv').addEventListener('click', function () {
      var names = { m: 'בחודש', y: 'בשנה', w: 'בשבוע' }, u = { a: 'הרבה', s: 'לפעמים', n: 'כמעט לא' };
      var rows = [['מנוי', 'מחיר (₪)', 'כל כמה', 'בחודש (₪)', 'בשנה (₪)', 'כמה משתמשים', 'לבטל']];
      st.list.forEach(function (r) { var m = monthly(r); rows.push([r.n, num(r.p), names[r.per] || '', Math.round(m), Math.round(m * 12), u[r.use] || '', r.cut ? 'כן' : '']); });
      var tm = st.list.reduce(function (s, r) { return s + monthly(r); }, 0);
      rows.push([], ['סך הכול', '', '', Math.round(tm), Math.round(tm * 12)]);
      csvDownload('המנויים שלי', rows);
      flash($('m-saved'), 'נשמר קובץ. אפשר לפתוח אותו באקסל או בגוגל שיטס.');
      used('csv');
    });
    draw(); calc();
  })();

  // =====================================================================
  // B7 המבצע המשפחתי
  // =====================================================================
  (function () {
    if (!$('mivtza')) return;
    var COLORS = ['#ecc97f', '#7fcf9f', '#8fb8f0', '#f0a08f', '#c9a7f0', '#f5d36b', '#7fd6d6', '#f0b8d8'];
    var st = load('mivtza', null) || { goal: '', target: '', start: '', members: [{ id: 1, n: 'אבא', w: '50' }, { id: 2, n: 'אמא', w: '50' }, { id: 3, n: '', w: '10' }], log: [], next: 4 };
    var mem = $('v-members');
    function store() { save('mivtza', st); }
    function color(i) { return COLORS[i % COLORS.length]; }
    function weekStart(t) { var d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); }
    function drawSetup() {
      mem.innerHTML = st.members.map(function (m) { return rowHtml(m.n, m.w, 'שם (יוסי, נועה...)', '₪ בשבוע'); }).join('');
    }
    function pop(t) {
      var p = document.createElement('div'); p.className = 'pop'; p.textContent = t; document.body.appendChild(p);
      setTimeout(function () { p.remove(); }, 1300);
    }
    function render() {
      var target = num(st.target), start = num(st.start);
      var per = st.members.map(function (m) { return st.log.filter(function (l) { return l.id === m.id; }).reduce(function (s, l) { return s + l.a; }, 0); });
      var have = start + per.reduce(function (s, v) { return s + v; }, 0);
      var pct = target ? Math.min(100, have / target * 100) : 0;
      $('v-what').textContent = st.goal || 'המטרה שלנו';
      $('v-have').textContent = ils(have); $('v-need').textContent = ils(target);
      $('v-pct').textContent = Math.floor(pct) + '%';
      var fill = $('v-fill'); fill.style.height = pct + '%';
      var segs = [[start, 'rgba(220,183,99,.45)']].concat(st.members.map(function (m, i) { return [per[i], color(i)]; }));
      fill.innerHTML = have ? segs.map(function (s) { return s[0] > 0 ? '<i style="flex:' + s[0] + ' 0 0;background:' + s[1] + '"></i>' : ''; }).join('') : '';
      var weekly = st.members.reduce(function (s, m) { return s + num(m.w); }, 0), eta;
      if (!target) eta = 'כותבים למעלה למה חוסכים וכמה צריך';
      else if (have >= target) eta = '🎉 הגענו למטרה! זמן לחגוג יחד';
      else if (!weekly) eta = 'חסרים ' + ils(target - have);
      else {
        var w = Math.ceil((target - have) / weekly), d = new Date(Date.now() + w * 7 * 864e5);
        eta = 'חסרים ' + ils(target - have) + ' · עוד כ-' + (w === 1 ? 'שבוע אחד' : w + ' שבועות') + ' (בערך ' + d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' }) + ')';
      }
      $('v-eta').textContent = eta;
      // כרטיס לכל אחד: כמה שם, כפתור "שמתי", ו-8 השבועות האחרונים
      var nowW = weekStart(Date.now());
      $('v-kids').innerHTML = st.members.map(function (m, i) {
        var name = m.n || 'בלי שם', wks = '';
        for (var k = 7; k >= 0; k--) {
          var ws = nowW - k * 7 * 864e5, we = ws + 7 * 864e5;
          var on = st.log.some(function (l) { return l.id === m.id && l.t >= ws && l.t < we; });
          wks += '<span' + (on ? ' class="on" style="background:' + color(i) + '"' : '') + ' title="' + (k ? 'לפני ' + k + ' שבועות' : 'השבוע') + '">' + (on ? '✓' : (k ? '' : '•')) + '</span>';
        }
        return '<div class="kid"><span class="dot" style="background:' + color(i) + '22;border:2px solid ' + color(i) + ';color:' + color(i) + '">' + esc(name.charAt(0)) + '</span>' +
          '<div><div class="nm">' + esc(name) + '</div><div class="tt">שם עד עכשיו ' + ils(per[i]) + '<br><button class="linkish" type="button" data-other="' + m.id + '">סכום אחר</button></div></div>' +
          '<button class="coin" type="button" data-coin="' + m.id + '">שמתי<br>' + ils(num(m.w)) + '</button>' +
          '<div class="weeks" aria-label="8 השבועות האחרונים">' + wks + '</div></div>';
      }).join('');
      var names = {}; st.members.forEach(function (m) { names[m.id] = m.n || 'בלי שם'; });
      $('v-log').innerHTML = st.log.slice().reverse().map(function (l, k) {
        return '<div><span>' + esc(names[l.id] || 'מישהו') + ' · ' + new Date(l.t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + '</span><span><b>' + ils(l.a) + '</b>' + (k === 0 ? ' · <button class="linkish" type="button" id="v-undo">ביטול</button>' : '') + '</span></div>';
      }).join('') || '<p class="note">עוד לא שמנו כלום. הלחיצה הראשונה היא הכי חשובה.</p>';
      return have;
    }
    function deposit(id, a) {
      if (!(a > 0)) return;
      var before = render();
      st.log.push({ id: id, a: a, t: Date.now() }); store();
      var after = render(), target = num(st.target);
      if (target && before < target && after >= target) { pop('🎉'); used('goal'); } else pop('🪙');
      flash($('v-saved'), 'נכנס לצנצנת: ' + ils(a));
      used('deposit');
    }
    $('v-goal').value = st.goal; $('v-target').value = st.target; $('v-start').value = st.start;
    ['goal', 'target', 'start'].forEach(function (k) { $('v-' + k).addEventListener('input', function () { st[k] = this.value; store(); render(); used('setup'); }); });
    mem.addEventListener('input', function (e) {
      var i = $$('.lrow', mem).indexOf(e.target.closest('.lrow')); if (i < 0) return;
      st.members[i][e.target.getAttribute('data-k') === 'n' ? 'n' : 'w'] = e.target.value; store(); render();
    });
    mem.addEventListener('click', function (e) {
      if (!e.target.closest('[data-del]')) return;
      var i = $$('.lrow', mem).indexOf(e.target.closest('.lrow')), m = st.members[i];
      var has = st.log.some(function (l) { return l.id === m.id; });
      if (has && !confirm('להסיר את ' + (m.n || 'השורה') + '? מה שהוא כבר שם יימחק מהצנצנת.')) return;
      st.members.splice(i, 1); st.log = st.log.filter(function (l) { return l.id !== m.id; });
      store(); drawSetup(); render();
    });
    $('v-add').addEventListener('click', function () {
      st.members.push({ id: st.next++, n: '', w: '' }); store(); drawSetup(); render();
      var rows = $$('.lrow', mem); rows[rows.length - 1].querySelector('[data-k=n]').focus();
    });
    $('v-kids').addEventListener('click', function (e) {
      var c = e.target.closest('[data-coin]'), o = e.target.closest('[data-other]');
      if (c) { var id = +c.getAttribute('data-coin'), m = st.members.filter(function (x) { return x.id === id; })[0]; deposit(id, num(m && m.w)); }
      if (o) { var v = prompt('כמה שמת? (₪)'); if (v != null) deposit(+o.getAttribute('data-other'), num(v)); }
    });
    $('v-log').addEventListener('click', function (e) {
      if (e.target.id !== 'v-undo') return;
      st.log.pop(); store(); render();
    });
    $('v-new').addEventListener('click', function () {
      if (!confirm('להתחיל מבצע חדש? המטרה ומה ששמתם יתאפסו. האנשים והסכומים השבועיים נשארים.')) return;
      st.goal = ''; st.target = ''; st.start = ''; st.log = []; store();
      $('v-goal').value = ''; $('v-target').value = ''; $('v-start').value = ''; render();
    });
    $('v-print').addEventListener('click', function () { used('print'); window.print(); });
    drawSetup(); render();
  })();

  // =====================================================================
  // K2 חיסכון לילדים
  // =====================================================================
  (function () {
    if (!$('yeladim')) return;
    var st = load('yeladim', null) || { mode: 'each', total: '', rate: '4', age: '18', kids: [{ n: '', a: '', h: '', m: '' }] };
    var box = $('y-kids');
    function store() { save('yeladim', st); }
    function rowK(k) {
      var split = st.mode === 'split';
      return '<div class="lrow kid4"><input type="text" data-k="n" maxlength="30" aria-label="שם הילד" placeholder="שם" value="' + esc(k.n) + '">' +
        '<button class="del" type="button" data-del aria-label="למחוק">×</button>' +
        '<input type="text" class="num-in" data-k="a" inputmode="decimal" aria-label="גיל היום" placeholder="גיל היום" value="' + esc(k.a) + '">' +
        '<input type="text" class="num-in" data-k="h" inputmode="decimal" aria-label="כבר נחסך בשקלים" placeholder="כבר יש ₪" value="' + esc(k.h) + '">' +
        '<input type="text" class="num-in" data-k="m" inputmode="decimal" aria-label="בחודש בשקלים" placeholder="בחודש ₪" value="' + esc(split ? '' : k.m) + '"' + (split ? ' disabled' : '') + '></div>';
    }
    function draw() { box.innerHTML = st.kids.map(rowK).join(''); }
    function fv(have, m, rate, n) {
      var i = rate / 100 / 12;
      if (!i) return have + m * n;
      var g = Math.pow(1 + i, n);
      return have * g + m * (g - 1) / i;
    }
    function calc() {
      var rate = Math.max(0, num(st.rate)), age = num(st.age) || 18, split = st.mode === 'split';
      var per = split && st.kids.length ? num(st.total) / st.kids.length : 0;
      var tot = 0, dep = 0, monthSum = 0, html = '';
      st.kids.forEach(function (k, i) {
        var m = split ? per : num(k.m), have = num(k.h), years = Math.max(0, age - num(k.a)), n = Math.round(years * 12);
        var v = fv(have, m, rate, n), d = have + m * n;
        tot += v; dep += d; monthSum += m;
        var name = k.n || 'ילד ' + (i + 1), gp = v ? Math.max(0, (v - d) / v * 100) : 0;
        html += '<div class="yk"><div class="yk-top"><b>' + esc(name) + '</b><span class="n">' + ils(v) + '</span></div>' +
          '<div class="note">' + (n ? 'בגיל ' + age + ', בעוד ' + (years % 1 ? years.toFixed(1) : years) + ' שנים · ' + ils(m) + ' בחודש' : 'כבר בגיל ' + age + ' או יותר') + '</div>' +
          '<div class="bar2" aria-hidden="true"><i style="width:' + (100 - gp).toFixed(1) + '%;background:var(--gold)"></i><i style="width:' + gp.toFixed(1) + '%;background:var(--good)"></i></div>' +
          '<div class="note">הפקדות ' + ils(d) + ' · תשואה ' + ils(v - d) + '</div></div>';
      });
      $('y-lbl').textContent = 'כולם ביחד, כשיגיעו לגיל ' + age;
      $('y-big').textContent = ils(tot);
      $('y-sub').textContent = tot ? 'מזה ' + ils(dep) + ' הפקדות, ו-' + ils(tot - dep) + ' מהתשואה (לפי ' + rate + '% בשנה)' : 'ממלאים את הילדים, והחשבון יופיע כאן';
      $('y-res').innerHTML = tot ? html + '<p class="note" style="margin-top:.5rem">זהב: מה שהפקדתם. ירוק: מה שהתשואה הוסיפה.</p>' : '';
      $('y-month-sum').textContent = monthSum ? ils(monthSum) + ' בחודש' : '';
      if (tot) used('calc');
    }
    function setMode(m) {
      st.mode = m; $('y-total-wrap').hidden = m !== 'split';
      $$('#y-mode button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-m') === m ? 'true' : 'false'); });
    }
    box.addEventListener('input', function (e) {
      var i = $$('.lrow', box).indexOf(e.target.closest('.lrow')); if (i < 0) return;
      st.kids[i][e.target.getAttribute('data-k')] = e.target.value; store(); calc();
    });
    box.addEventListener('click', function (e) {
      if (!e.target.closest('[data-del]')) return;
      st.kids.splice($$('.lrow', box).indexOf(e.target.closest('.lrow')), 1); store(); draw(); calc();
    });
    $('y-add').addEventListener('click', function () {
      st.kids.push({ n: '', a: '', h: '', m: '' }); store(); draw(); calc();
      var r = $$('.lrow', box); r[r.length - 1].querySelector('[data-k=n]').focus();
    });
    $$('#y-mode button').forEach(function (b) { b.addEventListener('click', function () { setMode(b.getAttribute('data-m')); store(); draw(); calc(); used('mode'); }); });
    $('y-total').value = st.total; $('y-rate').value = st.rate; $('y-age').value = st.age;
    $('y-total').addEventListener('input', function () { st.total = this.value; store(); calc(); });
    $('y-rate').addEventListener('input', function () { st.rate = this.value; store(); calc(); });
    $('y-age').addEventListener('change', function () { st.age = this.value; store(); calc(); });
    setMode(st.mode); draw(); calc();
  })();

  // =====================================================================
  // K6+ הוצאות קבועות לאורך השנה
  // =====================================================================
  (function () {
    if (!$('shana')) return;
    var MON = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    var SH = ['ינו', 'פבר', 'מרץ', 'אפר', 'מאי', 'יוני', 'יולי', 'אוג', 'ספט', 'אוק', 'נוב', 'דצמ'];
    var FREQ = [['m', 'כל חודש'], ['2', 'כל חודשיים'], ['q', 'כל 3 חודשים'], ['y', 'פעם בשנה'], ['o', 'פעם אחת']];
    var now = new Date(), cur = now.getMonth() + 1;
    var st = load('shana', null) || { list: [] };
    var box = $('s-list');
    function store() { save('shana', st); }
    function rowS(r) {
      return '<div class="sub-item"><div class="lrow yr"><input type="text" data-k="n" maxlength="40" aria-label="שם ההוצאה" placeholder="שם ההוצאה" value="' + esc(r.n) + '">' +
        '<button class="del" type="button" data-del aria-label="למחוק">×</button>' +
        '<input type="text" class="num-in" data-k="a" inputmode="decimal" aria-label="סכום בשקלים" placeholder="₪" value="' + esc(r.a) + '">' +
        '<select data-k="f" aria-label="כל כמה זמן">' + FREQ.map(function (f) { return '<option value="' + f[0] + '"' + (r.f === f[0] ? ' selected' : '') + '>' + f[1] + '</option>'; }).join('') + '</select>' +
        '<select data-k="mo" aria-label="באיזה חודש"' + (r.f === 'm' ? ' hidden' : '') + '>' + MON.map(function (m, i) { return '<option value="' + (i + 1) + '"' + (+r.mo === i + 1 ? ' selected' : '') + '>' + (r.f === 'm' ? 'כל חודש' : (r.f === 'y' || r.f === 'o' ? 'ב' : 'החל מ') + m) + '</option>'; }).join('') + '</select>' +
        '</div></div>';
    }
    function draw() {
      box.innerHTML = st.list.map(rowS).join('') || '<p class="note" style="text-align:center">עוד אין הוצאות. לוחצים על שם למעלה, או על "הוצאה אחרת".</p>';
      var mi = load('minuyim', null);
      $('s-import').hidden = !(mi && mi.list && mi.list.some(function (x) { return num(x.p); }));
    }
    // כמה יורד מהוצאה r בחודש k מהיום (0 = החודש)
    function charge(r, k) {
      var a = num(r.a), cm = (cur - 1 + k) % 12 + 1, d = ((cm - (+r.mo || 1)) % 12 + 12) % 12;
      if (r.f === 'm') return a;
      if (r.f === '2') return d % 2 === 0 ? a : 0;
      if (r.f === 'q') return d % 3 === 0 ? a : 0;
      if (r.f === 'y') return d === 0 ? a : 0;
      if (r.f === 'o') return d === 0 && k === (((+r.mo || 1) - cur) % 12 + 12) % 12 ? a : 0;
      return 0;
    }
    function months() {
      var out = [];
      for (var k = 0; k < 12; k++) out.push(st.list.reduce(function (s, r) { return s + charge(r, k); }, 0));
      return out;
    }
    function calc() {
      var ms = months(), year = ms.reduce(function (s, v) { return s + v; }, 0), avg = year / 12;
      var mx = Math.max.apply(null, ms), mk = ms.indexOf(mx);
      $('s-now').textContent = ils(ms[0]);
      $('s-lbl').textContent = 'ב' + MON[cur - 1] + ' יורד לך';
      $('s-sub').textContent = year ? 'ובחודש הבא, ' + MON[cur % 12] + ': ' + ils(ms[1]) : 'מוסיפים הוצאות למטה, והלוח יתמלא';
      $('s-year').textContent = ils(year); $('s-avg').textContent = ils(avg);
      $('s-max').textContent = year ? MON[(cur - 1 + mk) % 12] : '-';
      $('s-chart').innerHTML = ms.map(function (v, k) {
        var h = mx ? Math.max(3, v / mx * 100) : 3, hi = year && v > avg * 1.25;
        return '<div class="mcol' + (k === 0 ? ' now' : '') + '" title="' + MON[(cur - 1 + k) % 12] + ': ' + ils(v) + '"><span class="v">' + (v ? Math.round(v / 100) / 10 + 'K' : '') + '</span><i style="height:' + h.toFixed(0) + '%"' + (hi ? ' class="hi"' : '') + '></i><span class="d">' + SH[(cur - 1 + k) % 12] + '</span></div>';
      }).join('');
      // חיובים לא חודשיים בחודשיים הקרובים
      var soon = [];
      [0, 1].forEach(function (k) {
        st.list.forEach(function (r) { if (r.f !== 'm' && charge(r, k) && num(r.a) >= 200) soon.push((k ? 'בחודש הבא' : 'החודש') + ' (' + MON[(cur - 1 + k) % 12] + '): <b>' + esc(r.n || 'הוצאה') + '</b> ' + ils(num(r.a))); });
      });
      var heavy = year && mx > avg * 1.25 ? '<p style="margin-top:.5rem">החודש הכי כבד: <b>' + MON[(cur - 1 + mk) % 12] + '</b>, ' + ils(mx) + '. זה ' + ils(mx - avg) + ' מעל הממוצע. אם שמים בצד ' + ils(avg) + ' כל חודש, הוא לא יפתיע.</p>' : '';
      $('s-soon').innerHTML = (soon.length ? '<p><b>⏰ חיובים גדולים שמגיעים:</b></p><ul>' + soon.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' : '') + heavy;
      $('s-soon').hidden = !(soon.length || heavy);
      if (year) used('calc');
    }
    function add(n, f, a) { st.list.push({ n: n || '', a: a || '', f: f || 'm', mo: String(cur) }); }
    box.addEventListener('input', function (e) {
      var k = e.target.getAttribute('data-k'); if (!k || e.target.tagName === 'SELECT') return;
      st.list[$$('.sub-item', box).indexOf(e.target.closest('.sub-item'))][k] = e.target.value; store(); calc();
    });
    box.addEventListener('change', function (e) {
      if (e.target.tagName !== 'SELECT') return;
      st.list[$$('.sub-item', box).indexOf(e.target.closest('.sub-item'))][e.target.getAttribute('data-k')] = e.target.value; store(); draw(); calc();
    });
    box.addEventListener('click', function (e) {
      if (!e.target.closest('[data-del]')) return;
      st.list.splice($$('.sub-item', box).indexOf(e.target.closest('.sub-item')), 1); store(); draw(); calc();
    });
    function focusLast(sel) { var it = $$('.sub-item', box); it[it.length - 1].querySelector(sel).focus(); }
    $$('#s-chips button').forEach(function (b) {
      b.addEventListener('click', function () { add(b.textContent, b.getAttribute('data-f')); store(); draw(); calc(); focusLast('[data-k=a]'); used('add'); });
    });
    $('s-add').addEventListener('click', function () { add(''); store(); draw(); calc(); focusLast('[data-k=n]'); used('add'); });
    $('s-import').addEventListener('click', function () {
      var mi = load('minuyim', { list: [] }), have = st.list.map(function (r) { return r.n; }), c = 0;
      mi.list.forEach(function (x) {
        if (!num(x.p) || have.indexOf(x.n) > -1) return;
        if (x.per === 'y') add(x.n, 'y', x.p); else if (x.per === 'w') add(x.n, 'm', String(Math.round(num(x.p) * 52 / 12))); else add(x.n, 'm', x.p);
        c++;
      });
      store(); draw(); calc(); flash($('s-saved'), c ? 'נוספו ' + c + ' מנויים' : 'כל המנויים כבר כאן'); used('import');
    });
    $('s-csv').addEventListener('click', function () {
      var hdr = ['הוצאה', 'סכום (₪)', 'כל כמה'], fq = {};
      FREQ.forEach(function (f) { fq[f[0]] = f[1]; });
      for (var k = 0; k < 12; k++) hdr.push(MON[(cur - 1 + k) % 12]);
      var rows = [hdr];
      st.list.forEach(function (r) { var row = [r.n, num(r.a), fq[r.f] || '']; for (var k = 0; k < 12; k++) row.push(Math.round(charge(r, k))); rows.push(row); });
      var tot = ['סך הכול', '', '']; months().forEach(function (v) { tot.push(Math.round(v)); }); rows.push([], tot);
      csvDownload('הוצאות לאורך השנה', rows);
      flash($('s-saved'), 'נשמר קובץ. אפשר לפתוח אותו באקסל או בגוגל שיטס.'); used('csv');
    });
    draw(); calc();
  })();

  // =====================================================================
  // K4 מסדר מסמכי הכסף
  // =====================================================================
  (function () {
    if (!$('mismachim')) return;
    var CATS = [
      ['הכנסות ומס', '💼', [
        ['tlush', 'תלושי שכר', 'לפחות 7 שנים, ועדיף עד הפנסיה', 'אם יש טעות בפנסיה או בזכויות, התלוש הוא ההוכחה'],
        ['106', 'טופס 106 (מכל מעסיק, כל שנה)', '7 שנים', 'צריך אותו להחזר מס, ואפשר לבקש עד 6 שנים אחורה'],
        ['867', 'טופס 867 מהבנק (ריבית ורווחים)', '7 שנים', ''],
        ['truma', 'קבלות על תרומות (סעיף 46)', '7 שנים', 'מזכות בזיכוי ממס'],
        ['shuma', 'מכתבים מרשות המסים ושומות', '7 שנים', '']
      ]],
      ['בנק ואשראי', '🏦', [
        ['bank', 'דפי חשבון בנק', '7 שנים', 'רוב הבנקים שומרים גם אצלם, אבל עדיף עותק'],
        ['ashrai', 'פירוט כרטיסי אשראי', 'שנתיים, או יותר אם יש בו הוצאה מוכרת', ''],
        ['halvaa', 'הסכמי הלוואות', 'עד סוף ההחזר', ''],
        ['silluk', 'אישור סילוק הלוואה או משכנתא', 'לתמיד', 'מוכיח שהחוב נסגר']
      ]],
      ['ביטוחים', '🛡️', [
        ['polisa', 'פוליסות ביטוח (בריאות, חיים, דירה, רכב)', 'כל זמן שהן בתוקף, ועוד 3 שנים', 'אפשר לתבוע גם אחרי שהפוליסה נגמרה'],
        ['tvia', 'תביעות ותשובות מחברות ביטוח', 'עד שהעניין נסגר, ועוד 3 שנים', '']
      ]],
      ['בית', '🏠', [
        ['schirut', 'חוזה שכירות', 'כל תקופת השכירות, ועוד 7 שנים', ''],
        ['taboo', 'מסמכי קנייה של דירה (חוזה, נסח טאבו)', 'לתמיד', ''],
        ['arnona', 'ארנונה, חשמל, מים, גז', 'שנה עד שנתיים', 'הנחה בארנונה? לשמור את האישור עד שמתחדש']
      ]],
      ['רכב', '🚗', [
        ['rishayon', 'רישיון רכב וביטוח חובה', 'כל זמן שהרכב אצלך', ''],
        ['mechira', 'הסכם קנייה או מכירה של רכב', '7 שנים אחרי המכירה', 'מוכיח ממתי הרכב לא שלך (דוחות, תאונות)']
      ]],
      ['פנסיה וחיסכון', '🌱', [
        ['pensia', 'דוחות שנתיים מהפנסיה, הגמל וההשתלמות', 'עד הפרישה', 'כדי לבדוק שכל ההפקדות נכנסו'],
        ['yeladim', 'חיסכון לכל ילד ופיקדונות', 'עד שהכסף נמשך', '']
      ]],
      ['זכויות', '📜', [
        ['nechut', 'אישורי נכות (ועדות רפואיות, ביטוח לאומי, משרד הביטחון)', 'לתמיד', 'משמשים להטבות במס, בארנונה ועוד'],
        ['bituach', 'מכתבים מביטוח לאומי (קצבאות, החלטות)', 'לתמיד', ''],
        ['shichrur', 'תעודת שחרור משירות', 'לתמיד', 'נקודות זיכוי והטבות לחיילים משוחררים']
      ]],
      ['קבלות ואחריות', '🧾', [
        ['achrayut', 'תעודות אחריות וחשבוניות על מוצרים', 'כל זמן האחריות', ''],
        ['yakar', 'קבלות על דברים יקרים (מחשב, תכשיטים, ריהוט)', 'כל זמן שהם אצלך', 'לביטוח דירה, אם קורה משהו'],
        ['refui', 'קבלות רפואיות (תרופות, טיפולים, משקפיים)', '3 שנים', 'להחזרים מהביטוח המשלים או הפרטי']
      ]]
    ];
    var st = load('mismachim', null) || { done: {} };
    var total = 0;
    CATS.forEach(function (c) { total += c[2].length; });
    $('d-list').innerHTML = CATS.map(function (c) {
      return '<section class="box"><h2>' + c[1] + ' ' + esc(c[0]) + '</h2><div class="checks">' + c[2].map(function (d) {
        return '<label class="doc"><input type="checkbox" data-id="' + d[0] + '"' + (st.done[d[0]] ? ' checked' : '') + '><span><b>' + esc(d[1]) + '</b><small>לשמור: ' + esc(d[2]) + (d[3] ? ' · ' + esc(d[3]) : '') + '</small></span></label>';
      }).join('') + '</div></section>';
    }).join('');
    var TREE = 'כסף\n' + CATS.map(function (c, i) { return (i === CATS.length - 1 ? '└── ' : '├── ') + c[0]; }).join('\n') + '\n\nבתוך כל תיקייה: תיקייה לכל שנה (2025, 2026...)';
    $('d-tree').textContent = TREE;
    function calc() {
      var n = Object.keys(st.done).filter(function (k) { return st.done[k]; }).length, p = Math.round(n / total * 100);
      $('d-pct').textContent = p + '%';
      $('d-bar').style.width = p + '%';
      $('d-sub').textContent = n === total ? 'הכול מסודר. כל הכבוד!' : n + ' מתוך ' + total + ' סוגי מסמכים. מסמנים מה כבר שמור במקום שלו.';
    }
    $('d-list').addEventListener('change', function (e) {
      var id = e.target.getAttribute('data-id'); if (!id) return;
      st.done[id] = e.target.checked; save('mismachim', st); calc(); used('check');
    });
    $('d-dl').addEventListener('click', function () {
      var txt = 'מסמכי הכסף שלי – ' + today() + '\n\n' + CATS.map(function (c) {
        return c[0] + '\n' + c[2].map(function (d) { return (st.done[d[0]] ? '[✓] ' : '[ ] ') + d[1] + ' – לשמור: ' + d[2]; }).join('\n');
      }).join('\n\n') + '\n\nתבנית תיקיות:\n' + TREE + '\n\nמתוך כלים לכסף: https://gilad-rachamim.github.io/kesef/mismachim/\n';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + txt], { type: 'text/plain;charset=utf-8' }));
      a.download = 'מסמכי הכסף שלי – ' + today() + '.txt';
      document.body.appendChild(a); a.click(); a.remove();
      flash($('d-saved'), 'נשמר קובץ עם הרשימה והתבנית.'); used('download');
    });
    calc();
  })();

  // =====================================================================
  // K3 האם כדאי לבדוק החזר מס
  // =====================================================================
  (function () {
    if (!$('hechzer')) return;
    var BASE_DOCS = [['106', 'טופס 106 מכל מעסיק, לכל שנה'], ['tz', 'צילום תעודת זהות עם הספח'], ['bank', 'אישור ניהול חשבון בנק (להעברת ההחזר)']];
    var QS = [
      ['part', 'עבדתם רק חלק מהשנה? (התחלתם או הפסקתם לעבוד באמצע שנה, חל"ת, לימודים)', 'כשעובדים רק חלק מהשנה, המס מחושב לפעמים כאילו עבדתם כל השנה, ונוצר עודף.', []],
      ['two', 'עבדתם אצל יותר ממעסיק אחד באותה שנה, בלי תיאום מס?', 'בלי תיאום מס, מעסיק שני מנכה לפעמים מס גבוה מדי.', []],
      ['donate', 'קיבלתם קבלה לפי סעיף 46 על תרומה לעמותה?', 'על תרומות לעמותות מוכרות יש זיכוי ממס.', [['46', 'קבלות על תרומות (סעיף 46)']]],
      ['degree', 'סיימתם תואר אקדמי או לימודי מקצוע בשנים האחרונות?', 'אחרי סיום תואר או לימודי מקצוע יש נקודות זיכוי לתקופה מוגבלת.', [['toar', 'אישור זכאות לתואר או תעודת סיום לימודים']]],
      ['army', 'השתחררתם משירות צבאי או לאומי בשנים האחרונות?', 'חיילים משוחררים מקבלים נקודות זיכוי לתקופה אחרי השחרור.', [['shichrur', 'תעודת שחרור']]],
      ['nechut', 'יש לכם (או לבן או בת הזוג) נכות רפואית גבוהה, או עיוורון?', 'נכות גבוהה (לרוב 90% ומעלה) יכולה לתת פטור ממס על הכנסה מעבודה, עד תקרה. גם נכי צה"ל כדאי שיבדקו.', [['nechut', 'אישור נכות (ועדה רפואית, ביטוח לאומי או משרד הביטחון)']]],
      ['family', 'יש לכם ילד עם מוגבלות, או בן משפחה במוסד שאתם משלמים עליו?', 'יש נקודות זיכוי וזיכויים על הוצאות כאלה.', [['family', 'אישורים מביטוח לאומי או קבלות על תשלום למוסד']]],
      ['withdraw', 'משכתם כסף מקופת גמל, פיצויים או פנסיה, ונוכה לכם מס?', 'לפעמים המס שנוכה במשיכה גבוה מהנדרש.', [['161', 'אישור על המשיכה ועל המס שנוכה (למשל טופס 161)']]],
      ['private', 'אתם מפקידים לבד (לא דרך המעסיק) לביטוח חיים או לחיסכון פנסיוני?', 'על הפקדות כאלה יש זיכוי ממס, והמעסיק לא יודע עליהן.', [['45', 'אישור שנתי מחברת הביטוח או מקופת הגמל']]],
      ['yishuv', 'גרתם ביישוב שמקבל הטבות מס?', 'לתושבי יישובים מזכים יש הנחה במס. לפעמים היא לא הוחלה כל השנה.', [['toshav', 'אישור תושבות מהרשות המקומית']]],
      ['oleh', 'עליתם לארץ, או חזרתם אחרי שנים בחו"ל, בשנים האחרונות?', 'לעולים חדשים ולתושבים חוזרים יש נקודות זיכוי.', [['oleh', 'תעודת עולה או אישור תושב חוזר']]],
      ['stocks', 'היה לכם הפסד בבורסה, או ריבית בבנק שנוכה ממנה מס?', 'אפשר לקזז הפסדים, ולפעמים לקבל בחזרה מס שנוכה.', [['867', 'טופס 867 מכל בנק ובית השקעות']]]
    ];
    var st = load('hechzer', null) || { a: {}, docs: {} };
    var ANS = [['y', 'כן'], ['n', 'לא'], ['u', 'לא בטוח']];
    function drawQs() {
      $('r-qs').innerHTML = QS.map(function (q, i) {
        return '<div class="q' + (st.a[q[0]] ? ' done' : '') + '"><p><span class="qn">' + (i + 1) + '</span>' + esc(q[1]) + '</p><div class="seg">' +
          ANS.map(function (a) { return '<button type="button" data-q="' + q[0] + '" data-a="' + a[0] + '" aria-pressed="' + (st.a[q[0]] === a[0]) + '">' + a[1] + '</button>'; }).join('') + '</div></div>';
      }).join('');
    }
    function calc() {
      var yes = QS.filter(function (q) { return st.a[q[0]] === 'y'; }), maybe = QS.filter(function (q) { return st.a[q[0]] === 'u'; });
      var answered = QS.filter(function (q) { return st.a[q[0]]; }).length, show = yes.length || maybe.length;
      var big = $('r-big'), lbl = $('r-lbl'), sub = $('r-sub');
      if (!answered) { lbl.textContent = 'עונים על השאלות למעלה'; big.textContent = 'עוד לא ענית'; sub.textContent = ''; }
      else if (yes.length) { lbl.textContent = 'התשובה'; big.textContent = '✅ שווה לבדוק'; sub.textContent = 'מצאנו ' + (yes.length === 1 ? 'סיבה אחת' : yes.length + ' סיבות') + '. אפשר לבקש עד 6 שנים אחורה.'; }
      else if (maybe.length) { lbl.textContent = 'התשובה'; big.textContent = '🤔 אולי כדאי לבדוק'; sub.textContent = 'יש דברים שלא בטוח. שווה לבדוק אותם, ולענות שוב.'; }
      else { lbl.textContent = 'התשובה'; big.textContent = 'לא מצאנו סיבה בולטת'; sub.textContent = answered < QS.length ? 'ענית על ' + answered + ' מתוך ' + QS.length + '.' : 'לפי התשובות, אין סיבה בולטת. עדיין אפשר לבדוק באתר רשות המסים.'; }
      $('r-why').hidden = !show; $('r-docs').hidden = !show; $('r-how').hidden = !answered;
      $('r-why-list').innerHTML = yes.concat(maybe).map(function (q) { return '<li><b>' + (st.a[q[0]] === 'u' ? 'אולי: ' : '') + esc(q[1].replace(/\?.*$/, '?')) + '</b><br>' + esc(q[2]) + '</li>'; }).join('');
      var docs = BASE_DOCS.slice(), seen = {};
      docs.forEach(function (d) { seen[d[0]] = 1; });
      yes.concat(maybe).forEach(function (q) { q[3].forEach(function (d) { if (!seen[d[0]]) { seen[d[0]] = 1; docs.push(d); } }); });
      $('r-docs-list').innerHTML = docs.map(function (d) { return '<label class="doc"><input type="checkbox" data-doc="' + d[0] + '"' + (st.docs[d[0]] ? ' checked' : '') + '><span><b>' + esc(d[1]) + '</b></span></label>'; }).join('');
      if (answered === QS.length) used('done', { yes: yes.length });
    }
    $('r-qs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-q]'); if (!b) return;
      st.a[b.getAttribute('data-q')] = b.getAttribute('data-a'); save('hechzer', st); drawQs(); calc(); used('answer');
    });
    $('r-docs-list').addEventListener('change', function (e) {
      var id = e.target.getAttribute('data-doc'); if (!id) return;
      st.docs[id] = e.target.checked; save('hechzer', st);
    });
    $('r-go').addEventListener('click', function () { used('gov'); });
    drawQs(); calc();
  })();
})();
