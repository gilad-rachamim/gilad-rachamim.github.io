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

  // שם להשוואה: בלי רווחים כפולים, אותיות קטנות, בלי מספרים בסוף ("נטפליקס 123" = "נטפליקס")
  function key(n) { return String(n || '').toLowerCase().replace(/\s+[\d*#]+\s*$/, '').replace(/[\s"'׳״.\-]+/g, ' ').trim(); }
  // חיובים חוזרים מהאשראי [{n, a}] → kesef-minuyim (מחיר בחודש) ו-kesef-shana (כל חודש). מחזיר כמה נוספו בכל אחד.
  function recsTo(recs) {
    var mi = load('minuyim', null) || { list: [] }, sh = load('shana', null) || { list: [] };
    var hm = mi.list.map(function (x) { return key(x.n); }), hs = sh.list.map(function (x) { return key(x.n); }), m = 0, s = 0;
    var cur = String(new Date().getMonth() + 1);
    recs.forEach(function (r) {
      var k = key(r.n), a = String(Math.round(r.a * 100) / 100);
      if (!k || !(r.a > 0)) return;
      if (hm.indexOf(k) < 0) { mi.list.push({ n: r.n, p: a, per: 'm', use: '', cut: false }); hm.push(k); m++; }
      if (hs.indexOf(k) < 0) { sh.list.push({ n: r.n, a: a, f: 'm', mo: cur }); hs.push(k); s++; }
    });
    if (m) save('minuyim', mi);
    if (s) save('shana', sh);
    return { m: m, s: s };
  }

  // ---------------------------------------------------------------------
  // קריאת PDF טקסטואלי בטלפון (pdf.js נטען רק כשבוחרים קובץ). PDF סרוק או צילום – עוד לא (צריך שרת).
  // מחזיר שורות: כל שורה = מערך תאים מימין לשמאל, כל תא = { t: טקסט, x: מרכז }.
  // עברית ב-PDF נשמרת לפעמים הפוכה ("וטורב" במקום "ברוטו"): בודקים מילים מוכרות בשני הכיוונים, והופכים אם צריך.
  // ---------------------------------------------------------------------
  var PDF_URL = '/assets/vendor/pdfjs/pdf.min.js';
  var PDF_WORKER = '/assets/vendor/pdfjs/pdf.worker.min.js';
  var HEB = /[֐-׿]/;
  var KNOWN = ['סכום', 'תאריך', 'שכר', 'נטו', 'ברוטו', 'תשלומים', 'חיוב', 'עסק', 'פנסיה', 'מס', 'ביטוח', 'פיצויים', 'עובד', 'חופשה', 'מחלה', 'פירוט', 'עסקה', 'כרטיס'];
  function rev(s) { return s.split('').reverse().join('').replace(/[\d.,\/:\-]{2,}/g, function (m) { return m.split('').reverse().join(''); }); }
  function loadPdf(cb, fail) {
    if (window.pdfjsLib) return cb(window.pdfjsLib);
    var s = document.createElement('script'); s.src = PDF_URL;
    s.onload = function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER; cb(window.pdfjsLib); };
    s.onerror = fail; document.head.appendChild(s);
  }
  function pdfLines(file, done, fail) {
    var rd = new FileReader();
    rd.onerror = fail;
    rd.onload = function () {
      loadPdf(function (lib) {
        lib.getDocument({ data: new Uint8Array(rd.result) }).promise.then(function (doc) {
          var pages = [], n = Math.min(doc.numPages, 12);
          for (var i = 1; i <= n; i++) pages.push(doc.getPage(i).then(function (p) { return p.getTextContent(); }));
          return Promise.all(pages);
        }).then(function (contents) {
          var all = [];
          contents.forEach(function (c, pi) {
            c.items.forEach(function (it) {
              if (!it.str || !it.str.trim()) return;
              var h = Math.abs(it.transform[3]) || 10;
              all.push({ s: it.str, x0: it.transform[4], x1: it.transform[4] + (it.width || 0), y: pi * 1e4 - it.transform[5], h: h });
            });
          });
          var text = all.map(function (i) { return i.s; }).join(' ');
          var fwd = 0, back = 0;
          KNOWN.forEach(function (w) { if (text.indexOf(w) > -1) fwd++; if (text.indexOf(rev(w)) > -1) back++; });
          var flip = back > fwd;
          if (flip) all.forEach(function (i) { if (HEB.test(i.s)) i.s = rev(i.s); });
          // שורות: לפי גובה (y), בסבולת של חצי שורה
          all.sort(function (a, b) { return a.y - b.y || b.x1 - a.x1; });
          var lines = [];
          all.forEach(function (i) {
            var L = lines[lines.length - 1];
            if (L && Math.abs(L.y - i.y) <= Math.max(2, i.h * 0.45)) L.items.push(i); else lines.push({ y: i.y, items: [i] });
          });
          // תאים: פריטים צמודים (רווח קטן מגובה אות) הם תא אחד
          var out = lines.map(function (L) {
            var it = L.items.sort(function (a, b) { return b.x1 - a.x1; }), cells = [], cur = null;
            it.forEach(function (i) {
              if (cur && cur.x0 - i.x1 < i.h * 1.1) { cur.parts.push(i); cur.x0 = Math.min(cur.x0, i.x0); }
              else { cur = { x0: i.x0, x1: i.x1, parts: [i] }; cells.push(cur); }
            });
            return cells.map(function (c) {
              var heb = c.parts.some(function (p) { return HEB.test(p.s); });
              var ps = c.parts.slice().sort(function (a, b) { return heb ? b.x1 - a.x1 : a.x0 - b.x0; });
              var t = '', prev = null;
              ps.forEach(function (p) {
                var gap = prev ? (heb ? prev.x0 - p.x1 : p.x0 - prev.x1) : 0;
                t += (prev && gap > p.h * 0.18 && !/\s$/.test(t) && !/^\s/.test(p.s) ? ' ' : '') + p.s; prev = p;
              });
              return { t: t.replace(/\s+/g, ' ').trim(), x: (c.x0 + c.x1) / 2 };
            }).filter(function (c) { return c.t; });
          });
          done(out, { flip: flip, chars: text.replace(/\s/g, '').length });
        }).catch(fail);
      }, fail);
    };
    rd.readAsArrayBuffer(file);
  }
  // מספר כסף מתוך טקסט: "9,850.00" / "7952.3" / "-412.00"
  var NUM_RE = /-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?/g;

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
    // תכנון מול בפועל: הקטגוריות מהחודש האחרון שנטען בכלי האשראי (kesef-ashrai), מול תכנון לכל קטגוריה (st.plan)
    var MONS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    st.plan = st.plan || {};
    function actual() {
      var a = load('ashrai', null);
      if (!a || a.demo || !a.tx || !a.tx.length) return null;
      var ms = a.tx.map(function (t) { return t.d; }).filter(Boolean).sort(), m = ms[ms.length - 1] || '';
      var rec = {}; (a.recs || []).forEach(function (r) { rec[r.n] = 1; });
      var cur = a.tx.filter(function (t) { return t.d === m; }), cats = {}, tot = 0, vary = 0;
      cur.forEach(function (t) { cats[t.c] = (cats[t.c] || 0) + t.a; tot += t.a; if (!t.r && !rec[t.n]) vary += t.a; });
      return { m: m, cats: Object.keys(cats).map(function (k) { return [k, cats[k]]; }).sort(function (x, y) { return y[1] - x[1]; }), tot: tot, vary: vary };
    }
    function drawPlan() {
      var A = actual();
      $('t-plan-box').hidden = !A;
      if (!A) return;
      var p = A.m.split('-');
      $('t-plan-m').textContent = A.m ? 'לפי האשראי של ' + MONS[+p[1] - 1] + ' ' + p[0] : 'לפי האשראי';
      var pt = 0, over = 0;
      $('t-plan').innerHTML = A.cats.map(function (c) {
        var pl = num(st.plan[c[0]]), w = pl ? Math.min(100, c[1] / pl * 100) : 0, bad = pl && c[1] > pl;
        pt += pl; if (bad) over += c[1] - pl;
        return '<div class="yk"><div class="yk-top"><b>' + esc(c[0]) + '</b><span class="n' + (bad ? ' neg' : '') + '">' + ils(c[1]) + '</span></div>' +
          '<label class="field" style="margin:.3rem 0 0"><span class="note">תכנון לחודש</span><input class="num-in" inputmode="decimal" data-cat="' + esc(c[0]) + '" value="' + esc(st.plan[c[0]] || '') + '" placeholder="₪"></label>' +
          (pl ? '<div class="bar2"><i style="width:' + w.toFixed(1) + '%;background:' + (bad ? 'var(--bad)' : 'var(--good)') + '"></i></div><span class="note">' + (bad ? 'מעל התכנון ב-' + ils(c[1] - pl) : 'נשארו ' + ils(pl - c[1])) + '</span>' : '') + '</div>';
      }).join('');
      $('t-plan-sum').innerHTML = 'בפועל ' + ils(A.tot) + (pt ? ' · תכנון ' + ils(pt) + (over ? ' · <b>מעל התכנון ב-' + ils(over) + '</b>' : ' · בתוך התכנון ✓') : '') + '<br><small class="note">מזה ' + ils(A.vary) + ' הוצאות משתנות (בלי חיובים חוזרים, שכבר נמצאים בקבועות).</small>';
    }
    $('t-plan').addEventListener('change', function (e) {
      var c = e.target.getAttribute('data-cat'); if (!c) return;
      st.plan[c] = e.target.value; store(); drawPlan(); used('plan');
    });
    $('t-plan-fill').addEventListener('click', function () {
      var A = actual(); if (!A) return;
      A.cats.forEach(function (c) { if (!num(st.plan[c[0]])) st.plan[c[0]] = String(Math.ceil(c[1] / 50) * 50); });
      store(); drawPlan(); flash($('t-plan-msg'), 'מילאנו תכנון לפי החודש הזה, מעוגל ל-50 ₪. אפשר לשנות כל מספר.'); used('plan_fill');
    });
    $('t-plan-spent').addEventListener('click', function () {
      var A = actual(); if (!A) return;
      st.spent = String(Math.round(A.vary)); $('t-spent').value = st.spent; store(); calc();
      flash($('t-plan-msg'), 'הכנסנו ' + ils(A.vary) + ' ב"הוצאנו עד היום".'); used('plan_spent');
    });
    drawPlan();
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
    // ייבוא מהאשראי: החיובים החוזרים שזוהו בכלי "סריקת דף פירוט אשראי", בלי כפילויות לפי שם
    var asr = load('ashrai', null);
    $('m-import').hidden = !(asr && !asr.demo && asr.recs && asr.recs.length);
    $('m-import').addEventListener('click', function () {
      var have = st.list.map(function (r) { return key(r.n); }), c = 0;
      (load('ashrai', { recs: [] }).recs || []).forEach(function (x) {
        if (!(x.a > 0) || have.indexOf(key(x.n)) > -1) return;
        st.list.push({ n: x.n, p: String(Math.round(x.a * 100) / 100), per: 'm', use: '', cut: false }); have.push(key(x.n)); c++;
      });
      store(); draw(); calc();
      flash($('m-saved'), c ? 'נוספו ' + c + ' חיובים חוזרים מהאשראי. מסמנים ליד כל אחד כמה משתמשים בו.' : 'כל החיובים החוזרים כבר כאן ✓');
      used('import_ashrai');
    });
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
      var as = load('ashrai', null);
      $('s-import2').hidden = !(as && !as.demo && as.recs && as.recs.length);
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
      var mi = load('minuyim', { list: [] }), have = st.list.map(function (r) { return key(r.n); }), c = 0;
      mi.list.forEach(function (x) {
        if (!num(x.p) || have.indexOf(key(x.n)) > -1) return;
        have.push(key(x.n));
        if (x.per === 'y') add(x.n, 'y', x.p); else if (x.per === 'w') add(x.n, 'm', String(Math.round(num(x.p) * 52 / 12))); else add(x.n, 'm', x.p);
        c++;
      });
      store(); draw(); calc(); flash($('s-saved'), c ? 'נוספו ' + c + ' מנויים' : 'כל המנויים כבר כאן'); used('import');
    });
    $('s-import2').addEventListener('click', function () {
      var as = load('ashrai', { recs: [] }), have = st.list.map(function (r) { return key(r.n); }), c = 0;
      (as.recs || []).forEach(function (x) {
        if (!(x.a > 0) || have.indexOf(key(x.n)) > -1) return;
        add(x.n, 'm', String(Math.round(x.a * 100) / 100)); have.push(key(x.n)); c++;
      });
      store(); draw(); calc(); flash($('s-saved'), c ? 'נוספו ' + c + ' חיובים חוזרים מהאשראי' : 'כל החיובים החוזרים כבר כאן'); used('import_ashrai');
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
      }).join('\n\n') + '\n\nתבנית תיקיות:\n' + TREE + '\n\nמתוך כלים לכסף: https://hakelim.com/kesef/mismachim/\n';
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
  // =====================================================================
  // K9 בודק תלוש משכורת – הכול בטלפון, לפי חוק שכר מינימום וצו ההרחבה לפנסיה
  // =====================================================================
  (function () {
    if (!$('tlush')) return;
    var MIN_MONTH = 6443.85, MIN_HOUR = 35.40, FULL_HOURS = 182;   // מאפריל 2026
    // שכר המינימום מתעדכן כל שנה ב-1 באפריל. כשמעדכנים את המספרים למעלה, מעדכנים גם את MIN_FROM (השנה שממנה הם בתוקף).
    var MIN_FROM = 2026, NOW = new Date();
    var MIN_OLD = NOW.getFullYear() > MIN_FROM && NOW.getMonth() >= 3;   // מאפריל של השנה הבאה, המספר כאן אולי לא עדכני
    var IDS = ['pct', 'hours', 'months', 'g', 'n', 'x', 'ee', 'er', 'pz', 'he', 'hr', 'vac', 'sick'];
    var st = load('tlush', null) || { kind: 'full' };
    IDS.forEach(function (k) { if (st[k] != null) $('p-' + k).value = st[k]; });
    function v(k) { return num($('p-' + k).value); }
    function pct(a, b) { return b > 0 ? (a / b * 100) : 0; }
    function p1(n) { return n.toLocaleString('he-IL', { maximumFractionDigits: 1 }) + '%'; }
    function setKind(k) {
      st.kind = k;
      $$('#p-kind button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === k); });
      $('p-pct-w').hidden = k !== 'part'; $('p-hours-w').hidden = k !== 'hour';
    }
    function calc() {
      IDS.forEach(function (k) { st[k] = $('p-' + k).value; });
      save('tlush', st);
      var g = v('g'), n = v('n'), x = v('x'), base = Math.max(0, g - x), months = v('months');
      $('p-gross').textContent = ils(g); $('p-net').textContent = ils(n);
      $('p-cut').textContent = g > 0 && n > 0 ? p1(pct(g - n, g)) : '-';
      if (!g) { $('p-big').textContent = 'ממלאים למטה'; $('p-sub').textContent = 'מספיק ברוטו כדי להתחיל.'; $('p-res').hidden = $('p-ask').hidden = true; return; }
      if (st.tag) {
        // תלוש תגמולים של אגף השיקום: זה לא שכר, אז לא בודקים מינימום ופנסיה. רק מה שולם, מה נוכה ומה נכנס לבנק.
        $('p-big').textContent = n ? 'נכנס לבנק ' + ils(n) : 'תלוש תגמולים';
        $('p-sub').textContent = 'תלוש תגמולים של אגף השיקום. שומרים כל חודש ב"תלוש מול תלוש", ורואים מה השתנה.';
        $('p-list').innerHTML = '<li style="border-color:var(--gold-soft)"><b>ℹ️ זה תלוש תגמולים, לא תלוש משכורת</b><br>שולם ' + ils(g) + (n ? ', נוכה ' + ils(g - n) + ' (ארגון הנכים, ביטוחים, ניכויים), ונכנס לבנק ' + ils(n) : '') + '. הבדיקות של שכר מינימום ופנסיה שייכות לתלוש משכורת, ולכן לא מופיעות כאן. לשאלה על שורה בתלוש: המחוז או *8150.' +
          '<br><button class="linkish" type="button" id="p-untag">זה בעצם תלוש משכורת רגיל</button></li>';
        $('p-untag').addEventListener('click', function () { st.tag = 0; calc(); });
        $('p-res').hidden = false; $('p-ask').hidden = true;
        used('check', { tagmul: 1 });
        return;
      }
      var items = [], ask = [];
      function add(ok, title, text, q) { items.push([ok, title, text]); if (!ok && q) ask.push(q); }
      // 1. שכר מינימום (על השכר בלי שעות נוספות ונסיעות)
      var min = MIN_MONTH, minTxt = '6,443.85 ₪ למשרה מלאה';
      if (st.kind === 'part') { var pp = v('pct'); min = MIN_MONTH * (pp > 0 ? pp : 100) / 100; minTxt = ils(min) + ' ל-' + (pp || 100) + '% משרה'; }
      if (st.kind === 'hour') { var hh = v('hours'); min = MIN_HOUR * hh; minTxt = '35.40 ₪ לשעה' + (hh ? ' × ' + hh + ' שעות = ' + ils(min) : ''); }
      if (min > 0) {
        var okMin = base >= min - 0.5;
        add(okMin, okMin ? 'מעל שכר המינימום' : 'נראה שמתחת לשכר המינימום',
          'השכר בלי שעות נוספות ונסיעות: ' + ils(base) + '. המינימום: ' + minTxt + '. (לנוער ולחניכים יש מינימום אחר.)' +
            (MIN_OLD ? ' שימו לב: המספר הזה מאפריל ' + MIN_FROM + '. שכר המינימום מתעדכן כל אפריל, וייתכן שכבר יש מספר חדש (בכל-זכות).' : ''),
          'למה השכר הבסיסי ' + ils(base) + ', כשהמינימום הוא ' + ils(min) + '?');
      }
      // 2. פנסיה: 6% עובד, 6.5% תגמולי מעסיק, 6% פיצויים
      var ee = v('ee'), er = v('er'), pz = v('pz');
      if (!ee && !er && !pz) {
        if (months && months < 6) add(true, 'עוד אין הפרשה לפנסיה', 'אצל מעסיק חדש חובה להתחיל אחרי 6 חודשים (או מהיום הראשון, אם כבר הייתה לך קרן פנסיה). אחר כך המעסיק משלים גם אחורה.', null);
        else add(false, 'לא רואים הפרשה לפנסיה', 'אחרי 6 חודשי עבודה המעסיק חייב להפריש לפנסיה. אם השורה קיימת בתלוש ולא מילאת אותה, אפשר להוסיף.', 'האם מפרישים לי לפנסיה, לאיזו קרן, ומאיזה חודש?');
      } else {
        var exp = { ee: base * 0.06, er: base * 0.065, pz: base * 0.06 };
        var low = [];
        if (ee < exp.ee - 1) low.push('ממך ' + ils(ee) + ' (לפחות 6% = ' + ils(exp.ee) + ')');
        if (er < exp.er - 1) low.push('תגמולי מעסיק ' + ils(er) + ' (לפחות 6.5% = ' + ils(exp.er) + ')');
        if (pz < exp.pz - 1) low.push('פיצויים ' + ils(pz) + ' (לפחות 6% = ' + ils(exp.pz) + ')');
        add(!low.length, low.length ? 'הפנסיה נראית נמוכה מהחוק' : 'הפנסיה לפי החוק',
          low.length ? low.join(' · ') + '. החשבון מהשכר בלי שעות נוספות ונסיעות, ולפעמים הבסיס שונה.' :
            'ממך ' + p1(pct(ee, base)) + ', תגמולי מעסיק ' + p1(pct(er, base)) + ', פיצויים ' + p1(pct(pz, base)) + ' מהשכר.',
          'מאיזה סכום מחושבת הפנסיה, ולמה ההפרשה נמוכה מ-6% / 6.5% / 6%?');
      }
      // 3. קרן השתלמות (לא חובה בחוק לכולם)
      var he = v('he'), hr = v('hr');
      if (he || hr) items.push([true, 'יש קרן השתלמות', 'ממך ' + p1(pct(he, base)) + ', מהמעסיק ' + p1(pct(hr, base)) + '. מקובל: 2.5% ממך ו-7.5% מהמעסיק. אפשר לבדוק את המסלול שלה בכלי "מעקב קרנות".']);
      else { items.push([null, 'אין קרן השתלמות בתלוש', 'זה לא חובה לפי החוק לכל העובדים, אבל בענפים רבים יש הסכם או צו הרחבה שמחייבים. שווה לשאול.']); ask.push('האם מגיעה לי קרן השתלמות לפי ההסכם או הענף?'); }
      // 4. חופש ומחלה
      if ($('p-vac').value === '' && $('p-sick').value === '') { items.push([null, 'אין יתרת חופש ומחלה', 'בתלוש חייבת להופיע יתרת ימי חופש ומחלה. אם אין, שווה לבקש.']); ask.push('כמה ימי חופש ומחלה צברתי?'); }
      else items.push([true, 'יתרת חופש ' + (v('vac') || 0) + ' ימים, מחלה ' + (v('sick') || 0) + ' ימים', 'מחלה: נצברים 1.5 ימים כל חודש, עד 90. חופש: לפי הוותק, ובשנים הראשונות לפחות 12 ימי עבודה בשנה (בשבוע של 5 ימים).']);
      // 5. הבראה
      if (months >= 12) items.push([null, 'דמי הבראה', 'אחרי שנה בעבודה מגיעים דמי הבראה, פעם בשנה או כל חודש. לבדוק שמופיע בתלוש של החודש שבו משלמים.']);
      // 6. נטו
      if (n > 0) items.push([null, 'מהברוטו ירד ' + ils(g - n), 'זה ' + p1(pct(g - n, g)) + ': מס הכנסה, ביטוח לאומי ומס בריאות, פנסיה ושאר ניכויים. אם ירד הרבה יותר מבחודשים אחרים, שווה לבדוק את נקודות הזיכוי.']);

      var bad = items.filter(function (i) { return i[0] === false; }).length, good = items.filter(function (i) { return i[0] === true; }).length;
      $('p-big').textContent = bad ? '⚠️ ' + (bad === 1 ? 'דבר אחד' : bad + ' דברים') + ' לבדוק' : '✅ נראה תקין';
      $('p-sub').textContent = good + ' בדיקות עברו' + (bad ? ', ' + bad + ' לבדוק עם המעסיק.' : '. שווה לשמור את התלוש.');
      $('p-list').innerHTML = items.map(function (i) {
        var ic = i[0] === true ? '✅' : i[0] === false ? '⚠️' : 'ℹ️';
        return '<li style="border-color:' + (i[0] === false ? 'var(--bad)' : i[0] === true ? 'var(--good)' : 'var(--gold-soft)') + '"><b>' + ic + ' ' + esc(i[1]) + '</b><br>' + esc(i[2]) + '</li>';
      }).join('');
      $('p-ask-list').innerHTML = ask.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('');
      $('p-res').hidden = false; $('p-ask').hidden = !ask.length;
      used('check', { issues: bad });
    }
    // מילוי מ-PDF: מוצאים שורה לפי השם שלה בתלוש, ולוקחים את המספר האחרון בשורה (עמודת הסכום, הכי שמאלית).
    // לא ממלאים בשקט: מציגים מה נמצא, וממלאים רק מה שמסמנים.
    var PDF_F = [
      ['g', 'ברוטו', [/סה"?כ\s*(ה)?תשלומים/, /סך\s*הכו?ל\s*תשלומים/, /שכר\s*ברוטו/, /ברוטו(?!\s*ל)/, /ברוטו/]],
      ['n', 'נטו', [/נטו\s*לתשלום/, /שכר\s*נטו/, /לתשלום\s*נטו/, /נטו(?!\s*ל?מס)/]],
      ['er', 'פנסיה, מהמעסיק', [/תגמולי\s*מע[בס]ידי?/, /(פנסיה|גמל).*מע[בס]יד/, /מע[בס]יד.*(פנסיה|תגמול)/]],
      ['ee', 'פנסיה, ממך', [/תגמולי\s*עובד/, /(פנסיה|גמל).*עובד/, /ניכוי.*פנסיה/, /^(קרן\s*)?פנסיה(?!.*(מע[בס]יד|פיצו))/]],
      ['pz', 'פיצויים', [/פיצויים(?!.*עובד)/]],
      ['hr', 'השתלמות, מהמעסיק', [/השתלמות.*מע[בס]יד/]],
      ['he', 'השתלמות, ממך', [/השתלמות.*עובד/, /השתלמות(?!.*מע[בס]יד)/]],
      ['vac', 'יתרת חופש', [/יתרת?\s*(ימי\s*)?(חופש|חופשה)/, /חופשה.*יתרה/]],
      ['sick', 'יתרת מחלה', [/יתרת?\s*(ימי\s*)?מחלה/, /מחלה.*יתרה/]]
    ];
    // שורת שמות ("תשלומים | ניכויים | העברה לבנק") ומתחתיה שורת מספרים באותו מספר תאים – כמו בתלוש התגמולים של אגף השיקום
    var HV = [['g', 'ברוטו', /^(סה"?כ\s*)?(ה)?תשלומים$|ברוטו/], ['n', 'נטו', /העברה\s*לבנק|נטו/]];
    function slipFind(lines) {
      var texts = lines.map(function (L) { return L.map(function (c) { return c.t; }); }), taken = {}, found = [], have = {};
      var isNum = function (c) { return /^-?[\d,]+(\.\d+)?$/.test(c.replace(/[₪\s]/g, '')); };
      for (var i = 0; i + 1 < texts.length; i++) {
        var hd = texts[i], vl = texts[i + 1];
        if (hd.length < 2 || hd.length !== vl.length || !hd.every(function (c) { return !/\d/.test(c); }) || !vl.every(isNum)) continue;
        hd.forEach(function (c, k) {
          HV.forEach(function (h) {
            if (have[h[0]] || !h[2].test(c.trim())) return;
            var val = num(vl[k]); if (!val) return;
            have[h[0]] = 1; found.push({ k: h[0], lbl: h[1], v: val, line: c + ': ' + vl[k] });
          });
        });
        if (hd.some(function (c) { return HV.some(function (h) { return h[2].test(c.trim()); }); })) { taken[i] = taken[i + 1] = 1; }
      }
      PDF_F.forEach(function (f) {
        if (have[f[0]]) return;
        for (var r = 0; r < f[2].length; r++) {
          for (var i = 0; i < texts.length; i++) {
            if (taken[i]) continue;
            var cells = texts[i], li = cells.findIndex(function (c) { return f[2][r].test(c.replace(/[\d.,\-]/g, ' ').replace(/\s+/g, ' ').trim()); });
            if (li < 0) continue;
            var nums = [];
            cells.forEach(function (c, k) { if (k === li) return; var m = c.replace(/[^\d.,\-\s]/g, ' ').match(NUM_RE); if (m) nums = nums.concat(m); });
            if (!nums.length) { var m2 = cells[li].match(NUM_RE); if (m2) nums = m2; }
            var val = nums.length ? num(nums[nums.length - 1]) : 0;
            if (!val) continue;
            taken[i] = 1; found.push({ k: f[0], lbl: f[1], v: val, line: cells.join(' · ') }); return;
          }
        }
      });
      return found;
    }
    $('p-pdf').addEventListener('change', function () {
      var f = this.files && this.files[0]; this.value = '';
      if (!f) return;
      var box = $('p-pdf-out'); box.hidden = false; box.innerHTML = '<p class="note">קורא את ה-PDF…</p>';
      pdfLines(f, function (lines, info) {
        if (info.chars < 30) { box.innerHTML = '<p>⚠️ לא מצאנו טקסט בקובץ. נראה שזה PDF סרוק או צילום, ואת זה עוד אי אפשר לקרוא בטלפון. מקלידים את המספרים ידנית.</p>'; used('pdf', { ok: 0 }); return; }
        var found = slipFind(lines);
        if (!found.length) { box.innerHTML = '<p>⚠️ קראנו את הקובץ, אבל לא זיהינו את השורות של התלוש. מקלידים את המספרים ידנית.</p>'; used('pdf', { ok: 0 }); return; }
        var g = (found.filter(function (x) { return x.k === 'g'; })[0] || {}).v, n = (found.filter(function (x) { return x.k === 'n'; })[0] || {}).v;
        var odd = g && n && n >= g;
        var all = lines.map(function (L) { return L.map(function (c) { return c.t; }).join(' '); }).join('\n');
        var tag = /תלוש\s*תגמולים|אגף\s*ה?שיקום/.test(all);
        var mm = all.match(/(?:לחודש|חודש)\s*:?\s*(\d{1,2})\s*[\/.\-]\s*(\d{4})/);
        if (tag) { found = found.filter(function (x) { return x.k === 'g' || x.k === 'n'; }); found.forEach(function (x) { x.lbl = x.k === 'g' ? 'תשלומים (כל מה ששולם)' : 'נכנס לבנק'; }); }
        box.innerHTML = (tag ? '<p>📄 <b>זה תלוש תגמולים של אגף השיקום.</b> נמלא כמה שולם וכמה נכנס לבנק. בדיקות שכר המינימום והפנסיה לא שייכות לתלוש כזה.</p>' : '') +
          '<p><b>מצאנו בתלוש ' + found.length + ' מספרים' + (mm ? ', של ' + mm[1] + '/' + mm[2] : '') + '.</b> בודקים מול התלוש, מורידים את הסימון ממה שלא נכון, ולוחצים "למלא".' + (info.flip ? ' (העברית בקובץ הייתה שמורה הפוך, והפכנו אותה.)' : '') + (odd ? '<br>⚠️ הנטו יצא גדול מהברוטו. כנראה התבלבלנו בשורה, כדאי לבדוק.' : '') + '</p>' +
          '<div class="log">' + found.map(function (x, i) {
            return '<label style="display:flex;gap:.5rem;align-items:flex-start;padding:.35rem 0"><input type="checkbox" data-i="' + i + '"' + (odd && (x.k === 'g' || x.k === 'n') ? '' : ' checked') + '>' +
              '<span style="flex:1">' + esc(x.lbl) + ': <b>' + (x.k === 'vac' || x.k === 'sick' ? x.v + ' ימים' : ils(x.v, 2)) + '</b><br><small class="note">מהשורה: ' + esc(x.line.slice(0, 70)) + '</small></span></label>';
          }).join('') + '</div>' +
          '<button class="big-btn" type="button" id="p-pdf-fill" style="margin-top:.6rem">למלא את מה שסימנתי</button>' +
          (tag ? '' : '<p class="note">שעות נוספות ונסיעות לא ממלאים אוטומטית. אם יש, מקלידים את הסכום ביחד.</p>');
        $('p-pdf-fill').addEventListener('click', function () {
          var c = 0;
          $$('input[data-i]', box).forEach(function (cb) { if (!cb.checked) return; var x = found[+cb.getAttribute('data-i')]; $('p-' + x.k).value = String(x.v); c++; });
          st.tag = tag ? 1 : 0;
          if (mm) $('p-month').value = mm[2] + '-' + ('0' + mm[1]).slice(-2);
          box.innerHTML = '<p>✓ מילאנו ' + c + ' שדות' + (mm ? ', והחודש ' + mm[1] + '/' + mm[2] + ' כבר בחור ב"תלוש מול תלוש" למטה' : '') + '. אפשר לתקן כל שדה ידנית.</p>'; calc(); used('pdf_fill', { n: c, tagmul: tag ? 1 : 0 });
        });
        used('pdf', { ok: found.length });
      }, function () { box.innerHTML = '<p>⚠️ לא הצלחנו לפתוח את הקובץ. בודקים אינטרנט ומנסים שוב, או מקלידים ידנית.</p>'; });
    });
    $('p-kind').addEventListener('click', function (e) { var b = e.target.closest('[data-v]'); if (b) { setKind(b.getAttribute('data-v')); calc(); } });
    $('tlush').addEventListener('input', calc);
    // תלוש מול תלוש: שומרים כל חודש, ומשווים לחודש הקודם שנשמר
    var HF = [['g', 'ברוטו'], ['n', 'נטו'], ['x', 'שעות נוספות ונסיעות'], ['ee', 'פנסיה ממך'], ['er', 'פנסיה מהמעסיק'], ['pz', 'פיצויים'], ['he', 'השתלמות ממך'], ['hr', 'השתלמות מהמעסיק']];
    var MON = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    function mName(m) { var p = String(m).split('-'); return MON[+p[1] - 1] + ' ' + p[0]; }
    st.hist = st.hist || [];
    if (!$('p-month').value) { var dm = new Date(); dm.setDate(1); dm.setMonth(dm.getMonth() - 1); $('p-month').value = today(dm).slice(0, 7); }
    function drawHist() {
      var h = st.hist;
      $('p-hist-box').hidden = !h.length;
      if (!h.length) return;
      $('p-hist').innerHTML = h.slice().reverse().map(function (r, i) {
        return '<tr><td>' + mName(r.m) + '</td><td class="n">' + ils(num(r.g)) + '</td><td class="n">' + ils(num(r.n)) + '</td><td><button class="linkish" type="button" data-hdel="' + esc(r.m) + '">מחיקה</button></td></tr>';
      }).join('');
      if (h.length < 2) { $('p-diff').innerHTML = '<p class="note">כששומרים עוד חודש, רואים כאן מה השתנה.</p>'; return; }
      var a = h[h.length - 2], b = h[h.length - 1], lines = [];
      HF.forEach(function (f) {
        var d = num(b[f[0]]) - num(a[f[0]]);
        var nm = st.tag && f[0] === 'g' ? 'מה ששולם' : st.tag && f[0] === 'n' ? 'מה שנכנס לבנק' : f[1];
        if (Math.abs(d) >= 1) lines.push('<li>' + nm + ' ' + (d > 0 ? 'עלה' : 'ירד') + ' ב-<b>' + ils(Math.abs(d)) + '</b> (מ-' + ils(num(a[f[0]])) + ' ל-' + ils(num(b[f[0]])) + ')</li>');
      });
      var dg = num(b.g) - num(a.g), dn = num(b.n) - num(a.n), hint = '';
      if (dn <= -50 && Math.abs(dg) < 50) hint = '<p style="margin-top:.5rem">' + (st.tag ? 'התשלומים כמעט לא השתנו, אבל לבנק נכנס פחות. שווה לבדוק בתלוש אילו ניכויים נוספו או גדלו.' : 'הברוטו כמעט לא השתנה, אבל הנטו ירד. שווה לבדוק בתלוש את הניכויים: מס הכנסה (ונקודות הזיכוי), ביטוח לאומי, וניכויים אחרים.') + '</p>';
      else if (st.tag && Math.abs(dg) >= 50) hint = '<p style="margin-top:.5rem">בתלוש תגמולים, חודש גדול בדרך כלל אומר הפרשים או החזר חד-פעמי (תרופות, טיפולים, מענק). השורות עצמן מופיעות בתלוש.</p>';
      $('p-diff').innerHTML = '<p><b>' + mName(b.m) + ' מול ' + mName(a.m) + ':</b></p>' + (lines.length ? '<ul>' + lines.join('') + '</ul>' : '<p>אין שינוי במספרים העיקריים.</p>') + hint;
    }
    $('p-keep').addEventListener('click', function () {
      var m = $('p-month').value;
      if (!m) { flash($('p-kept'), 'בוחרים חודש'); return; }
      if (!v('g')) { flash($('p-kept'), 'קודם ממלאים ברוטו'); return; }
      var r = { m: m }; HF.forEach(function (f) { r[f[0]] = $('p-' + f[0]).value; });
      st.hist = st.hist.filter(function (x) { return x.m !== m; }).concat([r]).sort(function (x, y) { return x.m < y.m ? -1 : 1; });
      save('tlush', st); drawHist(); flash($('p-kept'), 'נשמר התלוש של ' + mName(m) + ' ✓'); used('keep');
    });
    $('p-hist').addEventListener('click', function (e) {
      var b = e.target.closest('[data-hdel]'); if (!b) return;
      st.hist = st.hist.filter(function (x) { return x.m !== b.getAttribute('data-hdel'); }); save('tlush', st); drawHist();
    });
    drawHist();
    $('p-print').addEventListener('click', function () { used('print'); window.print(); });
    setKind(st.kind || 'full'); calc();
  })();

  // =====================================================================
  // K8 סריקת דף פירוט אשראי – קורא אקסל/CSV בדפדפן (SheetJS נטען רק כשבוחרים קובץ)
  // =====================================================================
  (function () {
    if (!$('ashrai')) return;
    var XLSX_URL = '/assets/vendor/xlsx/xlsx-0.18.5.full.min.js';
    var CATS = [
      ['סופר ומכולת', /שופרסל|רמי לוי|ויקטורי|יוחננוף|אושר עד|מגה|טיב טעם|יינות ביתן|חצי חינם|קרפור|סופר|מכולת|מינימרקט|AM:PM|פרש מרקט|קשת טעמים|נתיב החסד|ירקות|פירות|מאפ|קצב/i],
      ['דלק ורכב', /פז|דלק|סונול|דור אלון|אלון|\bטן\b|ten|yellow|ילו|מוסך|חניון|פנגו|סלופארק|cellopark|pango|כביש 6|נתיבי איילון/i],
      ['תחבורה', /רב.?קו|רכבת|אגד|דן |מטרופולין|אפיקים|גט|gett|יאנגו|yango|מונית|קווים|אקסטרה/i],
      ['תקשורת ומנויים', /פרטנר|סלקום|הוט|hot|בזק|גולן|012|019|yes|נטפליקס|netflix|spotify|ספוטיפיי|apple|google|youtube|disney|amazon prime|icloud|סלקום tv|wix|microsoft|openai|claude|anthropic|chatgpt/i],
      ['ביטוח', /ביטוח|הראל|מגדל|הפניקס|מנורה|איילון|aig|ישיר|שלמה|ליברה|ווישור|wesure/i],
      ['בריאות ופארם', /מכבי|כללית|מאוחדת|לאומית|סופר.?פארם|ניו.?פארם|\bבי\b|be |בית מרקחת|אופטיק|רופא|מרפא|שיניים/i],
      ['חשבונות הבית', /חברת החשמל|חשמל|תאגיד|מי |מים|ארנונה|עיריי|מועצה|גז|אמישראגז|סופרגז|פזגז|ועד בית/i],
      ['אוכל בחוץ', /מסעד|קפה|ארומה|קפה קפה|גרג|פיצ|בורגר|מקדונלד|שווארמה|פלאפל|סושי|wolt|וולט|תן ביס|10bis|סיבוס|cibus|מאפה|גלידה/i],
      ['ביגוד והנעלה', /קסטרו|פוקס|fox|h&m|zara|זארה|טרמינל|terminal|גולף|רנואר|אמריקן איגל|נעלי|shoes|הודיס|גלי|מנגו|קרביץ|נקסט|next/i],
      ['קניות אונליין', /aliexpress|עלי אקספרס|amazon|אמזון|ebay|shein|temu|טמו|iherb|asos|paypal|פייפאל/i],
      ['בית וחשמל', /איקאה|ikea|ace|אייס|הום סנטר|ks?p|באג|מחסני חשמל|שקם|ביתילי|טמבור|ריהוט|כלי בית|מקס סטוק|מקס סטוק|max stock/i],
      ['חינוך וילדים', /גן |צהרון|בית ספר|ביה"ס|חוג|קייטנ|צעצוע|טויס|toys|ספרים|סטימצקי|צומת ספרים|מכללה|אוניברסיט/i]
    ];
    var SUBS = /netflix|נטפליקס|spotify|ספוטיפיי|apple\.com|icloud|google|youtube|disney|amazon prime|yes|hot|פרטנר|סלקום|בזק|גולן|012|019|ביטוח|הוראת קבע|מנוי|חדר כושר|הולמס פלייס|openai|claude|chatgpt|microsoft|wix|dropbox|canva/i;
    var st = load('ashrai', null) || { tx: [] };   // tx: [{d:'2026-10', n, a, c, r(קבע), p(תשלומים)}]

    function loadXlsx(cb) {
      if (window.XLSX) return cb();
      var s = document.createElement('script'); s.src = XLSX_URL; s.onload = cb;
      s.onerror = function () { flash($('a-msg'), 'לא הצלחנו לטעון את קורא האקסל. בודקים אינטרנט ומנסים שוב.'); };
      document.head.appendChild(s);
    }
    function catOf(name, given) {
      if (given) return String(given).trim();
      for (var i = 0; i < CATS.length; i++) if (CATS[i][1].test(name)) return CATS[i][0];
      return 'אחר';
    }
    function monthOf(v) {
      if (typeof v === 'number' && v > 30000 && v < 80000) { var d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2); }
      if (v instanceof Date) return v.getFullYear() + '-' + ('0' + (v.getMonth() + 1)).slice(-2);
      var m = String(v || '').match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
      if (m) { var y = +m[3]; if (y < 100) y += 2000; return y + '-' + ('0' + m[2]).slice(-2); }
      m = String(v || '').match(/(\d{4})-(\d{2})/);
      return m ? m[1] + '-' + m[2] : '';
    }
    // מוצאים שורת כותרת (שם עסק + סכום), ואז עמודות: תאריך, שם, סכום חיוב, קטגוריה, סוג עסקה
    function parseRows(rows) {
      var out = [], h = null;
      rows.forEach(function (r) {
        r = r || [];
        var cells = r.map(function (c) { return String(c == null ? '' : c).trim(); });
        var name = cells.findIndex(function (c) { return /בית.?ה?עסק|שם ה?עסק|תיאור|פירוט|merchant|description/i.test(c); });
        var amtI = cells.findIndex(function (c) { return /סכום/.test(c); });
        if (name > -1 && amtI > -1) {
          var charge = cells.findIndex(function (c) { return /סכום.*חיוב|סכום לחיוב|חיוב בש/.test(c); });
          h = { n: name, a: charge > -1 ? charge : amtI, d: cells.findIndex(function (c) { return /תאריך/.test(c); }),
            c: cells.findIndex(function (c) { return /^(ענף|קטגוריה)/.test(c); }), t: cells.findIndex(function (c) { return /סוג/.test(c); }),
            x: cells.findIndex(function (c) { return /הערות|פירוט נוסף/.test(c); }) };
          return;
        }
        if (!h) return;
        var n = cells[h.n], a = num(r[h.a]);
        if (!n || !a || /סה"?כ|סך הכל|total/i.test(n)) return;
        var extra = (h.t > -1 ? cells[h.t] : '') + ' ' + (h.x > -1 ? cells[h.x] : '');
        out.push({ d: h.d > -1 ? monthOf(r[h.d]) : '', n: n.replace(/\s+/g, ' ').slice(0, 60), a: Math.round(a * 100) / 100,
          c: catOf(n, h.c > -1 ? cells[h.c] : ''), r: /קבע/.test(extra) ? 1 : 0, p: /תשלום|תשלומים/.test(extra) ? 1 : 0 });
      });
      return out;
    }
    function addTx(list, label) {
      if (!list.length) { flash($('a-msg'), 'לא מצאנו חיובים בקובץ ' + label + '. צריך קובץ פירוט עם עמודות "שם בית העסק" ו"סכום".'); return 0; }
      var months = {}; list.forEach(function (t) { months[t.d] = 1; });
      st.tx = st.tx.filter(function (t) { return !months[t.d]; }).concat(list);   // חודש שנטען שוב מחליף את הקודם
      st.tx.sort(function (a, b) { return a.d < b.d ? -1 : 1; });
      save('ashrai', st); return list.length;
    }
    function readFile(f, done) {
      var rd = new FileReader();
      if (/\.csv$/i.test(f.name)) {
        rd.onload = function () {
          var rows = String(rd.result).split(/\r?\n/).map(function (line) {
            var res = [], cur = '', q = false;
            for (var i = 0; i < line.length; i++) { var ch = line[i]; if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === ',' && !q) { res.push(cur); cur = ''; } else cur += ch; }
            res.push(cur); return res;
          });
          done(parseRows(rows));
        };
        rd.readAsText(f, 'utf-8');
      } else {
        rd.onload = function () {
          loadXlsx(function () {
            try {
              var wb = window.XLSX.read(new Uint8Array(rd.result), { type: 'array', cellDates: false });
              var all = [];
              wb.SheetNames.forEach(function (sn) { all = all.concat(parseRows(window.XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' }))); });
              done(all);
            } catch (e) { done([]); }
          });
        };
        rd.readAsArrayBuffer(f);
      }
    }
    // PDF: לא סומכים על מיקום העמודות (כותרת ממורכזת, סכום צמוד לימין). מפרקים כל שורה לפי תוכן:
    // תאריך, סכומים (מספר עם נקודה עשרונית, או תא שכולו מספר), וטקסט. הטקסט הראשון = שם העסק, השאר = הערות.
    // אם יש כמה סכומים, לוקחים את זה שבמקום של "סכום חיוב" בכותרת.
    var MONEY = /^-?(\d{1,3}(,\d{3})+|\d+)\.\d{1,2}$/, INT = /^-?(\d{1,3}(,\d{3})+|\d+)$/, DATE = /\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/;
    function pdfTx(lines) {
      var out = [], ci = -1;
      lines.forEach(function (L) {
        var t = L.map(function (c) { return c.t; }), all = t.join(' | ');
        if (/בית.?ה?עסק|שם ה?עסק|תיאור|merchant|description/i.test(all) && /סכום/.test(all) && !DATE.test(all)) {
          var am = all.match(/סכום\s*[^\s|]*/g) || [];
          ci = am.findIndex(function (x) { return /חיוב/.test(x); }); if (ci < 0) ci = am.length - 1;
          return;
        }
        if (ci < 0) return;
        var d = '', money = [], texts = [];
        t.forEach(function (cell) {
          var tok = cell.split(' '), rest = [];
          var pureNum = tok.every(function (w) { return MONEY.test(w) || INT.test(w) || w === '₪'; });
          tok.forEach(function (w) {
            if (!d && DATE.test(w)) { d = monthOf(w); return; }
            if (MONEY.test(w) || (pureNum && INT.test(w))) { money.push(num(w)); return; }
            if (w === '₪') return;
            rest.push(w);
          });
          if (rest.join('').trim()) texts.push(rest.join(' ').trim());
        });
        if (!money.length || !texts.length) return;
        var n = texts[0], extra = texts.slice(1).join(' ');
        if (/סה"?כ|סך הכל|total|יתרה/i.test(n)) return;
        var a = money[Math.min(ci, money.length - 1)];
        if (!a) return;
        out.push({ d: d, n: n.slice(0, 60), a: Math.round(a * 100) / 100, c: catOf(n, ''), r: /קבע/.test(extra) ? 1 : 0, p: /תשלום|תשלומים/.test(extra) ? 1 : 0 });
      });
      return out;
    }
    // res: [{f: שם הקובץ, list, info}] – כמה קבצים ביחד, אישור אחד לכולם
    function pdfPreview(res) {
      var box = $('a-pdf-out'); box.hidden = false;
      var list = [], notes = [], flip = false;
      res.forEach(function (r) {
        if (r.err) notes.push('⚠️ ' + esc(r.f) + ': לא הצלחנו לפתוח את הקובץ.');
        else if (r.info.chars < 30) notes.push('⚠️ ' + esc(r.f) + ': אין בו טקסט. נראה שזה PDF סרוק או צילום, ואת זה עוד אי אפשר לקרוא בטלפון.');
        else if (!r.list.length) notes.push('⚠️ ' + esc(r.f) + ': לא מצאנו טבלת חיובים (עמודות "שם בית העסק" ו"סכום").');
        else { notes.push('✓ ' + esc(r.f) + ': ' + r.list.length + ' חיובים'); list = list.concat(r.list); flip = flip || r.info.flip; }
      });
      if (!list.length) { box.innerHTML = '<p>' + notes.join('<br>') + '</p><p class="note">הכי טוב: קובץ אקסל מהאתר של חברת האשראי.</p>'; return; }
      var tot = list.reduce(function (s, t) { return s + t.a; }, 0), noDate = list.filter(function (t) { return !t.d; }).length;
      var ms = {}; list.forEach(function (t) { if (t.d) ms[t.d] = 1; });
      var fname = res.length > 1 ? res.length + ' קבצים' : res[0].f;
      box.innerHTML = '<p><b>מצאנו ב-PDF ' + list.length + ' חיובים, ביחד ' + ils(tot, 2) + (Object.keys(ms).length > 1 ? ', ב-' + Object.keys(ms).length + ' חודשים' : '') + '.</b> בודקים שזה נראה נכון מול הדף, ולוחצים "להוסיף".' + (flip ? ' (העברית בקובץ הייתה שמורה הפוך, והפכנו אותה.)' : '') + (noDate ? '<br>⚠️ ל-' + noDate + ' חיובים לא מצאנו תאריך.' : '') + '</p>' +
        (res.length > 1 || notes.some(function (n) { return n.charAt(0) === '⚠'; }) ? '<p class="note">' + notes.join('<br>') + '</p>' : '') +
        '<div class="log">' + list.slice(0, 8).map(function (t) { return '<div><span>' + esc(t.n) + ' <small class="note">· ' + esc(t.d || 'בלי תאריך') + (t.r ? ' · קבע' : '') + (t.p ? ' · תשלומים' : '') + '</small></span><b>' + ils(t.a, 2) + '</b></div>'; }).join('') +
        (list.length > 8 ? '<div><span class="note">ועוד ' + (list.length - 8) + '…</span></div>' : '') + '</div>' +
        '<button class="big-btn" type="button" id="a-pdf-ok" style="margin-top:.6rem">נראה נכון – להוסיף</button>' +
        '<button class="add" type="button" id="a-pdf-no">לא נכון – לבטל</button>';
      $('a-pdf-ok').addEventListener('click', function () {
        if (st.demo) { st.tx = []; st.demo = 0; }
        var got = addTx(list, fname); box.hidden = true; box.innerHTML = '';
        if (got) { flash($('a-msg'), 'נוספו ' + got + ' חיובים מה-PDF ✓'); used('upload', { rows: got, pdf: 1 }); }
        draw();
      });
      $('a-pdf-no').addEventListener('click', function () { box.hidden = true; box.innerHTML = ''; used('pdf_no'); });
    }
    $('a-file').addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files || []), got = 0;
      var pdfs = files.filter(function (f) { return /\.pdf$/i.test(f.name) || f.type === 'application/pdf'; });
      files = files.filter(function (f) { return pdfs.indexOf(f) < 0; });
      var left = files.length;
      // כמה PDF: קוראים אחד אחרי השני (חוסך זיכרון בטלפון), ואז תצוגה אחת לאישור
      if (pdfs.length) {
        var res = [], pi = 0;
        $('a-pdf-out').hidden = false;
        (function next() {
          if (pi >= pdfs.length) { pdfPreview(res); used('pdf', { files: pdfs.length }); return; }
          var f = pdfs[pi++];
          $('a-pdf-out').innerHTML = '<p class="note">קורא את ה-PDF' + (pdfs.length > 1 ? ' (' + pi + ' מתוך ' + pdfs.length + ')' : '') + '…</p>';
          pdfLines(f, function (lines, info) { res.push({ f: f.name, list: pdfTx(lines), info: info }); next(); },
            function () { res.push({ f: f.name, err: 1, list: [], info: {} }); next(); });
        })();
      }
      if (!left) { this.value = ''; return; }
      flash($('a-msg'), 'קורא…');
      files.forEach(function (f) {
        readFile(f, function (list) {
          if (st.demo && list.length) { st.tx = []; st.demo = 0; }
          got += addTx(list, f.name);
          if (--left === 0) { if (got) { flash($('a-msg'), 'נקראו ' + got + ' חיובים ✓'); used('upload', { rows: got }); } draw(); }
        });
      });
      this.value = '';
    });
    $('a-demo').addEventListener('click', function () {
      var D = [['שופרסל דיל', 612], ['רמי לוי', 845.4], ['פז ', 320], ['נטפליקס', 54.9], ['ספוטיפיי', 21.9], ['פרטנר תקשורת', 89, 1], ['הראל ביטוח', 212, 1], ['ארומה', 46], ['וולט', 118], ['סופר-פארם', 164.5], ['חברת החשמל', 410, 1], ['עלי אקספרס', 73.2], ['קסטרו', 239, 0, 1], ['רב-קו', 50], ['חדר כושר', 199, 1], ['איקאה', 129, 0, 1]];
      var list = [];
      ['2026-09', '2026-10'].forEach(function (m, mi) {
        D.forEach(function (x) { list.push({ d: m, n: x[0].trim(), a: Math.round(x[1] * (mi || x[2] || SUBS.test(x[0]) ? 1 : 0.9) * 100) / 100, c: catOf(x[0], ''), r: x[2] || 0, p: x[3] || 0 }); });
      });
      st.tx = list; st.demo = 1; save('ashrai', st); flash($('a-msg'), 'זו דוגמה. כשתעלו קובץ אמיתי, הוא יחליף אותה.'); used('demo'); draw();
    });
    function draw() {
      if (!st.tx.length) { $('a-out').hidden = true; return; }
      $('a-out').hidden = false;
      var months = []; st.tx.forEach(function (t) { if (months.indexOf(t.d) < 0) months.push(t.d); });
      months.sort();
      var last = months[months.length - 1], prevM = months.length > 1 ? months[months.length - 2] : null;
      var cur = st.tx.filter(function (t) { return t.d === last; });
      var total = cur.reduce(function (s, t) { return s + t.a; }, 0);
      var mName = function (m) { if (!m) return 'בלי תאריך'; var p = m.split('-'); return ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'][+p[1] - 1] + ' ' + p[0]; };
      $('a-lbl').textContent = 'סך הכל ' + mName(last);
      $('a-total').textContent = ils(total);
      // לפי קטגוריה
      var cats = {}; cur.forEach(function (t) { cats[t.c] = (cats[t.c] || 0) + t.a; });
      var catArr = Object.keys(cats).map(function (k) { return [k, cats[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
      $('a-cats').innerHTML = catArr.map(function (c) {
        var w = total > 0 ? Math.max(2, c[1] / total * 100) : 0;
        return '<div class="yk"><div class="yk-top"><b>' + esc(c[0]) + '</b><span class="n">' + ils(c[1]) + '</span></div><div class="bar2"><i style="width:' + w + '%;background:var(--gold)"></i></div><span class="note">' + Math.round(c[1] / total * 100) + '% מהחודש</span></div>';
      }).join('');
      // לפי עסק
      var biz = {}; cur.forEach(function (t) { biz[t.n] = (biz[t.n] || 0) + t.a; });
      var bizArr = Object.keys(biz).map(function (k) { return [k, biz[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
      $('a-top').innerHTML = bizArr.slice(0, 10).map(function (b) { return '<div><span>' + esc(b[0]) + '</span><b>' + ils(b[1]) + '</b></div>'; }).join('');
      // חוזרים: הוראת קבע / מנוי מוכר / אותו עסק ביותר מחודש
      // אותו עסק בחודש אחר, בסכום כמעט זהה (עד 5% הבדל) = חוזר. סופר ודלק לא נחשבים חוזרים גם אם חוזרים.
      var inMonths = {};
      st.tx.forEach(function (t) {
        if (t.d === last || /סופר|דלק|אוכל/.test(t.c)) return;
        cur.forEach(function (c) { if (c.n === t.n && Math.abs(c.a - t.a) <= Math.max(1, c.a * 0.05)) inMonths[t.n] = 1; });
      });
      var recSeen = {}, recs = [];
      cur.forEach(function (t) {
        if (recSeen[t.n]) return;
        var why = t.r ? 'הוראת קבע' : SUBS.test(t.n) ? 'נראה כמו מנוי' : inMonths[t.n] ? 'חוזר כל חודש' : '';
        if (why && !t.p) { recSeen[t.n] = 1; recs.push([t.n, t.a, why]); }
      });
      var recSum = recs.reduce(function (s, r) { return s + r[1]; }, 0);
      st.recs = recs.map(function (r) { return { n: r[0], a: r[1] }; }); save('ashrai', st);
      $('a-send').hidden = !recs.length;
      $('a-recs').innerHTML = recs.length ? recs.map(function (r) { return '<div><span>' + esc(r[0]) + ' <small class="note">· ' + r[2] + '</small></span><b>' + ils(r[1]) + '</b></div>'; }).join('') : '<div><span>לא זיהינו חיובים חוזרים. עם קובץ של חודש נוסף, יהיה קל יותר.</span></div>';
      var pays = cur.filter(function (t) { return t.p; });
      $('a-n').textContent = cur.length; $('a-rec').textContent = ils(recSum); $('a-pay').textContent = pays.length;
      // חודש מול חודש
      var tot = {}; st.tx.forEach(function (t) { tot[t.d] = (tot[t.d] || 0) + t.a; });
      $('a-months-box').hidden = months.length < 2;
      $('a-months').innerHTML = months.slice(-6).map(function (m) { return '<div><span>' + mName(m) + '</span><b>' + ils(tot[m]) + '</b></div>'; }).join('');
      var diff = prevM ? total - tot[prevM] : null;
      $('a-sub').textContent = st.demo ? 'דוגמה בלבד' : (diff == null ? '' : (diff > 0 ? 'יותר ב-' + ils(diff) : 'פחות ב-' + ils(-diff)) + ' מ' + mName(prevM));
      // 5 שורות מסקנה
      var lines = [];
      if (catArr[0]) lines.push('הכי הרבה הלך על <b>' + esc(catArr[0][0]) + '</b>: ' + ils(catArr[0][1]) + ' (' + Math.round(catArr[0][1] / total * 100) + '%).');
      if (bizArr[0]) lines.push('העסק הכי יקר החודש: <b>' + esc(bizArr[0][0]) + '</b>, ' + ils(bizArr[0][1]) + '.');
      if (recs.length) lines.push('<b>' + recs.length + ' חיובים חוזרים</b> לוקחים ' + ils(recSum) + ' בחודש, ' + ils(recSum * 12) + ' בשנה.');
      if (prevM) {
        var pc = {}; st.tx.filter(function (t) { return t.d === prevM; }).forEach(function (t) { pc[t.c] = (pc[t.c] || 0) + t.a; });
        var up = catArr.map(function (c) { return [c[0], c[1] - (pc[c[0]] || 0)]; }).sort(function (a, b) { return b[1] - a[1]; })[0];
        lines.push('לעומת ' + mName(prevM) + ': ' + (diff > 0 ? 'יותר' : 'פחות') + ' ב-' + ils(Math.abs(diff)) + '.' + (up && up[1] > 50 ? ' הכי עלה: ' + esc(up[0]) + ' (+' + ils(up[1]) + ').' : ''));
      }
      if (pays.length) lines.push('<b>' + pays.length + ' חיובים בתשלומים</b> ממשיכים גם בחודשים הבאים.');
      $('a-sum5').innerHTML = '<b>בקצרה</b><ul>' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';
    }
    // מעבירים את החיובים החוזרים לכלי המנויים ולכלי ההוצאות לאורך השנה, בלי כפילויות (לפי שם)
    $('a-send').addEventListener('click', function () {
      if (st.demo) { flash($('a-msg2'), 'זו דוגמה. מעבירים אחרי שמעלים קובץ אמיתי.'); return; }
      var r = recsTo(st.recs || []);
      flash($('a-msg2'), r.m + r.s ? 'נוספו ' + r.m + ' ל"כמה זה עולה לי באמת" ו-' + r.s + ' ל"הוצאות קבועות לאורך השנה" ✓' : 'הכול כבר נמצא בשני הכלים ✓');
      used('send', { n: r.m + r.s });
    });
    $('a-csv').addEventListener('click', function () {
      var rows = [['חודש', 'עסק', 'סכום', 'קטגוריה', 'הוראת קבע', 'תשלומים']];
      st.tx.forEach(function (t) { rows.push([t.d, t.n, t.a, t.c, t.r ? 'כן' : '', t.p ? 'כן' : '']); });
      csvDownload('פירוט אשראי', rows); used('csv');
    });
    draw();
  })();

  // =====================================================================
  // K10 מעקב קרנות השתלמות וגמל – נתוני גמל נט (/kesef/kranot.json, מתעדכן פעם בחודש ב-GitHub Action)
  // =====================================================================
  (function () {
    if (!$('kranot')) return;
    var KINDS = [['קרנות השתלמות', 'השתלמות'], ['תגמולים ואישית לפיצויים', 'קופת גמל'], ['קופת גמל להשקעה', 'גמל להשקעה'], ['קופת גמל להשקעה - חסכון לילד', 'חיסכון לילד'],
      ['קרן פנסיה מקיפה', 'פנסיה'], ['קרן פנסיה כללית (משלימה)', 'פנסיה משלימה']];
    var YEAR = 365 * 864e5;
    function isPen(k) { return /פנסיה/.test(k); }
    function ago(d) { var t = Date.parse(d); return isFinite(t) ? Date.now() - t : 0; }
    var st = load('kranot', null) || { kind: KINDS[0][0], fund: null, mine: [] };
    var D = null, byId = {};
    function pc(v, sign) { return v == null ? '-' : (sign && v > 0 ? '+' : '') + v.toLocaleString('he-IL', { maximumFractionDigits: 2 }) + '%'; }
    function median(a) { a = a.filter(function (x) { return x != null; }).sort(function (x, y) { return x - y; }); if (!a.length) return null; var m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; }
    function rank(list, key, val, lowBetter) {
      var a = list.map(function (f) { return f[key]; }).filter(function (x) { return x != null; });
      if (val == null || !a.length) return '-';
      var better = a.filter(function (x) { return lowBetter ? x < val : x > val; }).length;
      return (better + 1) + ' מתוך ' + a.length;
    }
    function per(p) { var s = String(p); return ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'][+s.slice(4) - 1] + ' ' + s.slice(0, 4); }
    function drawKinds() {
      $('f-kind').innerHTML = KINDS.map(function (k) { return '<button type="button" data-k="' + esc(k[0]) + '" aria-pressed="' + (st.kind === k[0]) + '">' + k[1] + '</button>'; }).join('');
    }
    function drawCorps() {
      var corps = {}; D.funds.forEach(function (f) { if (f.k === st.kind) corps[f.c] = (corps[f.c] || 0) + 1; });
      var names = Object.keys(corps).sort(function (a, b) { return a.localeCompare(b, 'he'); });
      var cur = st.fund && byId[st.fund] && byId[st.fund].k === st.kind ? byId[st.fund].c : '';
      $('f-corp').innerHTML = '<option value="">בוחרים חברה…</option>' + names.map(function (n) { return '<option' + (n === cur ? ' selected' : '') + '>' + esc(n) + '</option>'; }).join('');
      drawFunds();
    }
    function drawFunds() {
      var c = $('f-corp').value;
      var list = D.funds.filter(function (f) { return f.k === st.kind && f.c === c; });
      $('f-fund').innerHTML = '<option value="">' + (c ? 'בוחרים מסלול…' : 'קודם חברה') + '</option>' + list.map(function (f) { return '<option value="' + f.i + '"' + (f.i === st.fund ? ' selected' : '') + '>' + esc(f.n) + '</option>'; }).join('');
      show();
    }
    function show() {
      var f = byId[$('f-fund').value];
      $('f-out').hidden = !f;
      if (!f) return;
      st.fund = f.i; save('kranot', st);
      // דומים: אותו סוג, אותה התמחות ותת-התמחות, פתוח לכלל האוכלוסייה (ותמיד כולל את שלך)
      var grp = D.funds.filter(function (g) { return g.k === f.k && g.s === f.s && g.ss === f.ss && (g.p === 'כלל האוכלוסיה' || g.i === f.i); });
      $('f-name').textContent = f.c + ' · ' + f.n;
      $('f-y1').textContent = pc(f.y1 != null ? f.y1 : f.ytd, true);
      $('f-sub').textContent = (f.y1 != null ? 'תשואה ב-12 החודשים האחרונים' : 'תשואה מתחילת השנה') + ', עד ' + per(D.period) + '. אחרי דמי ניהול.';
      $('f-y3').textContent = pc(f.y3); $('f-y5').textContent = pc(f.y5); $('f-fee').textContent = pc(f.f);
      $('f-grp').textContent = 'השוואה ל-' + grp.length + ' מסלולים מאותו סוג: ' + (f.s + (f.ss && f.ss !== f.s ? ', ' + f.ss : '')) + '. מקום 1 = הכי גבוה בתשואה, או הכי נמוך בדמי ניהול.' +
        (isPen(f.k) ? ' בפנסיה ההתמחות נקבעת לפי שם המסלול. דמי הניהול כאן הם הממוצע בקרן, ולכל אחד יש דמי ניהול משלו (בדוח השנתי).' : '');
      var mine = st.mine.filter(function (m) { return m.i === f.i; })[0];
      $('f-old').hidden = !(mine && ago(mine.d) >= YEAR);
      var rows = [['12 חודשים', 'y1', false], ['3 שנים, לשנה', 'y3', false], ['5 שנים, לשנה', 'y5', false], ['דמי ניהול מהצבירה', 'f', true]];
      if (isPen(f.k)) rows.push(['דמי ניהול מההפקדה', 'fd', true]);
      $('f-cmp').innerHTML = rows.map(function (r) {
        var me = f[r[1]], md = median(grp.map(function (g) { return g[r[1]]; }));
        var cls = me == null || md == null ? '' : ((r[2] ? me < md : me > md) ? 'down' : (me === md ? '' : 'up'));
        return '<tr><td>' + r[0] + '</td><td class="n ' + cls + '">' + pc(me) + '</td><td class="n">' + pc(md) + '</td><td>' + rank(grp, r[1], me, r[2]) + '</td></tr>';
      }).join('');
      $('f-all').innerHTML = grp.slice().sort(function (a, b) { return (b.y5 == null ? -99 : b.y5) - (a.y5 == null ? -99 : a.y5); }).map(function (g) {
        return '<tr' + (g.i === f.i ? ' style="background:rgba(220,183,99,.15)"' : '') + '><td>' + esc(g.c) + '<br><small class="note">' + esc(g.n) + '</small></td><td class="n">' + pc(g.y5) + '</td><td class="n">' + pc(g.y1) + '</td><td class="n">' + pc(g.f) + '</td></tr>';
      }).join('');
      $('f-liq-box').hidden = f.k !== 'קרנות השתלמות';
      $('f-myfee').placeholder = f.f != null ? String(f.f) : '';
      // סימון: המסלול בחצי התחתון (תשואה ל-5 שנים, או 12 חודשים אם אין) או דמי ניהול מעל האמצע. רק נתון, לא המלצה.
      var fl = flags(f);
      $('f-flag').hidden = !fl.length;
      $('f-flag').innerHTML = fl.length ? '<b>📊 שווה לדעת</b><ul>' + fl.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><p class="note">זה רק נתון מהעבר, לא המלצה לעבור. שאלה טובה לחברה או ליועץ פנסיוני מורשה: למה, ומה האפשרויות.</p>' : '';
      cost(); liq();
      used('view', { kind: f.k });
    }
    function cost() {
      var f = byId[st.fund]; if (!f) return;
      st.bal = $('f-bal').value; st.myfee = $('f-myfee').value; save('kranot', st);
      var bal = num(st.bal), fee = st.myfee !== '' ? num(st.myfee) : f.f;
      if (!bal) { $('f-cost').textContent = 'מקלידים כמה יש בקרן, ורואים כמה דמי הניהול לוקחים בשנה.'; return; }
      var y = bal * (fee || 0) / 100, ten = 0, b = bal;
      for (var i = 0; i < 10; i++) { ten += b * (fee || 0) / 100; b *= 1.04; }   // הנחה: 4% תשואה בשנה, בלי הפקדות
      $('f-cost').innerHTML = 'ב-' + pc(fee) + ' דמי ניהול: בערך <b>' + ils(y) + ' בשנה</b>. ב-10 שנים, אם הקרן גדלה 4% בשנה ובלי הפקדות נוספות: בערך ' + ils(ten) + '. כל 0.1% פחות = בערך ' + ils(bal * 0.001) + ' בשנה.' +
        (isPen(f.k) ? '<br>בפנסיה יש גם דמי ניהול מכל הפקדה' + (f.fd != null ? ' (הממוצע במסלול הזה: ' + pc(f.fd) + ')' : '') + '. למשל, על הפקדה של 1,000 ₪ בחודש, כל 1% = 120 ₪ בשנה.' : '');
    }
    function liq() {
      st.open = $('f-open').value; save('kranot', st);
      var y = Math.round(num(st.open)), now = new Date().getFullYear();
      if (!y || y < 1970 || y > now) { $('f-liq').textContent = 'קרן השתלמות נזילה בדרך כלל 6 שנים אחרי שנפתחה (3 שנים, אם המשיכה ללימודים, או בגיל פרישה).'; return; }
      $('f-liq').innerHTML = y + 6 <= now ? '✅ הקרן כבר נזילה (נפתחה לפני יותר מ-6 שנים). אפשר למשוך, או להשאיר ולהמשיך לחסוך.' : 'הקרן תהיה נזילה בערך ב-<b>' + (y + 6) + '</b>, ' + (y + 6 - now === 1 ? 'עוד שנה' : 'עוד ' + (y + 6 - now) + ' שנים') + '. (את התאריך המדויק רואים בדוח השנתי.)';
    }
    function group(f) { return D.funds.filter(function (g) { return g.k === f.k && g.s === f.s && g.ss === f.ss && (g.p === 'כלל האוכלוסיה' || g.i === f.i); }); }
    function flags(f) {
      var grp = group(f), out = [];
      if (grp.length < 4) return out;
      var k = f.y5 != null ? 'y5' : f.y1 != null ? 'y1' : null, lbl = k === 'y5' ? 'בתשואה הממוצעת ל-5 שנים' : 'בתשואה ל-12 חודשים';
      if (k) {
        var a = grp.map(function (g) { return g[k]; }).filter(function (x) { return x != null; });
        var better = a.filter(function (x) { return x > f[k]; }).length;
        if (a.length >= 4 && better + 1 > Math.ceil(a.length / 2)) out.push('המסלול ' + lbl + ' בחצי התחתון: מקום ' + (better + 1) + ' מתוך ' + a.length + ' מסלולים דומים.');
      }
      var md = median(grp.map(function (g) { return g.f; }));
      if (f.f != null && md != null && f.f > md + 0.01) out.push('דמי הניהול הממוצעים במסלול (' + pc(f.f) + ') מעל האמצע בשוק (' + pc(md) + '). את דמי הניהול שלך רואים בדוח השנתי.');
      return out;
    }
    function drawMine() {
      $('f-mine-box').hidden = !st.mine.length;
      // בדיקה שנתית: קרן שנשמרה לפני שנה ויותר מקבלת תזכורת. שמירה מחדש מאפסת אותה.
      var old = st.mine.filter(function (m) { return ago(m.d) >= YEAR; }).length;
      $('f-mine-old').hidden = !old;
      $('f-mine-old').innerHTML = old ? '⏰ <b>עברה שנה</b> מאז ששמרת ' + (old === 1 ? 'קרן אחת' : old + ' קרנות') + '. כדאי לבדוק שוב: לוחצים על הקרן, מסתכלים, ושומרים שוב.' : '';
      $('f-mine').innerHTML = st.mine.map(function (m) {
        var f = byId[m.i], late = ago(m.d) >= YEAR;
        var low = f && flags(f).length;
        return '<div><span><a href="#" class="gold" data-open="' + m.i + '">' + esc(f ? f.c + ' · ' + f.n : 'מסלול ' + m.i) + '</a><br><small class="note">נשמר ' + esc(m.d) + (late ? ' · <b style="color:var(--bad)">עברה שנה, כדאי לבדוק שוב</b>' : '') + (low ? ' · 📊 יש מה לדעת' : '') + '</small></span><b>' + (f ? pc(f.y1, true) : '-') + '</b></div>';
      }).join('');
    }
    $('f-kind').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; st.kind = b.getAttribute('data-k'); st.fund = null; drawKinds(); drawCorps(); });
    $('f-corp').addEventListener('change', drawFunds);
    $('f-fund').addEventListener('change', show);
    $('f-bal').addEventListener('input', cost); $('f-myfee').addEventListener('input', cost); $('f-open').addEventListener('input', liq);
    $('f-keep').addEventListener('click', function () {
      if (!st.fund) return;
      st.mine = st.mine.filter(function (m) { return m.i !== st.fund; }).concat([{ i: st.fund, d: today() }]);
      save('kranot', st); drawMine(); $('f-old').hidden = true; flash($('f-saved'), 'נשמר. בעוד שנה תופיע כאן תזכורת לבדוק שוב ✓'); used('keep');
    });
    $('f-mine').addEventListener('click', function (e) {
      var a = e.target.closest('[data-open]'); if (!a) return; e.preventDefault();
      var f = byId[a.getAttribute('data-open')]; if (!f) return;
      st.kind = f.k; st.fund = f.i; drawKinds(); drawCorps(); $('f-out').scrollIntoView({ behavior: 'smooth' });
    });
    ['bal', 'myfee', 'open'].forEach(function (k) { if (st[k] != null) $('f-' + k).value = st[k]; });
    drawKinds();
    fetch('/kesef/kranot.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
      D = d; d.funds.forEach(function (f) { byId[f.i] = f; });
      $('f-src').textContent = 'נתוני ' + d.source + ', נכון ל' + per(d.period) + '. ' + d.funds.length + ' מסלולים.';
      drawCorps(); drawMine();
    }).catch(function () { $('f-src').textContent = 'לא הצלחנו לטעון את הנתונים. בודקים אינטרנט ומרעננים.'; });
  })();

  // =====================================================================
  // K7 כמה הגיוני לשלם על זה? – מחירי סופר מקבצי שקיפות המחירים (/kesef/mechir.json, מתעדכן פעם בשבוע ב-GitHub Action)
  // =====================================================================
  (function () {
    if (!$('mechir')) return;
    var D = null, cur = null, timer = null;
    // שורה: [ברקוד, שם, הכי זול, אמצע, [מחיר לכל רשת], הכי יקר]
    function norm(s) { return String(s || '').replace(/["'״׳`.,\-]/g, '').replace(/\s+/g, ' ').trim(); }
    function sh(n) { return '₪' + n.toFixed(2).replace(/\.00$/, ''); }
    function heDate(iso) { var p = String(iso).split('-'); return +p[2] + '.' + +p[1] + '.' + p[0]; }
    function search() {
      var q = norm($('m-q').value), box = $('m-list');
      if (!D || q.length < 2) { box.innerHTML = ''; return; }
      var hits;
      if (/^\d{4,}$/.test(q)) {
        hits = D.items.filter(function (r) { return r[0].indexOf(q.replace(/^0+/, '')) === 0; });
      } else {
        var words = q.split(' ');
        hits = D.items.filter(function (r) { var n = r._n; return words.every(function (w) { return n.indexOf(w) >= 0; }); });
        hits.sort(function (a, b) { return (a._n.indexOf(words[0]) === 0 ? 0 : 1) - (b._n.indexOf(words[0]) === 0 ? 0 : 1) || a[1].length - b[1].length; });
      }
      used('search');
      if (!hits.length) { box.innerHTML = '<p class="note">לא מצאנו. אפשר לנסות מילה אחת (למשל "קוטג"), או את הברקוד שעל המוצר.</p>'; return; }
      box.innerHTML = hits.slice(0, 12).map(function (r) {
        return '<button type="button" role="option" data-c="' + r[0] + '"><span>' + esc(r[1]) + '</span><b>' + sh(r[2]) + '–' + sh(r[5]) + '</b></button>';
      }).join('') + (hits.length > 12 ? '<p class="note">ועוד ' + (hits.length - 12) + '. כדאי להוסיף מילה (גודל, טעם).</p>' : '');
    }
    function pick(code) {
      cur = null;
      D.items.some(function (r) { if (r[0] === code) { cur = r; return true; } return false; });
      if (!cur) return;
      $('m-list').innerHTML = '';
      $('m-out').hidden = false;
      $('m-name').textContent = cur[1];
      $('m-mid').textContent = sh(cur[3]); $('m-mid2').textContent = sh(cur[3]);
      $('m-lo').textContent = sh(cur[2]); $('m-hi').textContent = sh(cur[5]);
      var rows = D.chains.map(function (c, i) { return [c.name, cur[4][i], c.date]; }).filter(function (x) { return x[1] != null; });
      rows.sort(function (a, b) { return a[1] - b[1]; });
      $('m-chains').innerHTML = rows.map(function (x, i) {
        return '<tr><td>' + esc(x[0]) + (x[2] && x[2] !== D.date ? ' <small class="note">(' + heDate(x[2]) + ')</small>' : '') + (i === 0 && x[1] < rows[rows.length - 1][1] ? ' <span class="m-tag">הכי זול</span>' : '') + '</td><td class="n">' + sh(x[1]) + '</td></tr>';
      }).join('');
      $('m-code').textContent = 'ברקוד ' + cur[0] + '. מחיר אמצע בין כמה סניפים בכל רשת, לפי מחירי הרשתות בתאריך ' + heDate(D.date) + '.';
      verdict();
      used('view');
      $('m-out').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function verdict() {
      var el = $('m-verdict'), dot = $('m-dot');
      if (!cur) return;
      var p = num($('m-my').value.replace(',', '.')), lo = cur[2], mid = cur[3], hi = cur[5];
      if (!p) { el.className = 'm-verdict'; el.textContent = 'מקלידים את המחיר שרואים, ונגיד אם הוא יקר, סביר או מציאה.'; dot.hidden = true; return; }
      var v, cls;
      if (p <= lo) { v = 'מציאה'; cls = 'good'; }
      else if (p > hi * 1.02 || p > mid * 1.12) { v = 'יקר'; cls = 'bad'; }
      else { v = 'סביר'; cls = 'ok'; }
      var diff = p - lo;
      el.className = 'm-verdict ' + cls;
      el.innerHTML = '<b>' + v + '</b> ' + (v === 'מציאה' ? 'זה המחיר הכי נמוך שראינו, או פחות.' :
        'יקר ב-' + sh(diff) + ' מהמחיר הכי זול' + (v === 'יקר' ? ', ומעל מה שרוב הרשתות מבקשות.' : '. בטווח הרגיל.'));
      var span = hi - lo, pos = span > 0 ? (p - lo) / span : (p <= lo ? 0 : 1);
      dot.hidden = false; dot.style.insetInlineStart = (Math.max(0, Math.min(1, pos)) * 100) + '%';
      used('price');
    }
    $('m-q').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(search, 150); });
    $('m-list').addEventListener('click', function (e) { var b = e.target.closest('[data-c]'); if (b) pick(b.getAttribute('data-c')); });
    $('m-my').addEventListener('input', verdict);
    fetch('/kesef/mechir.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) {
      D = d; d.items.forEach(function (r) { r._n = norm(r[1]); });
      $('m-src').textContent = 'לפי מחירי הרשתות בתאריך ' + heDate(d.date) + ': ' + d.chains.filter(function (c) { return c.date !== null; }).map(function (c) { return c.name + (c.date && c.date !== d.date ? ' (' + heDate(c.date) + ')' : ''); }).join(', ') + '. ' + d.items.length + ' מוצרים נפוצים.';
      if ($('m-q').value) search();
    }).catch(function () { $('m-src').textContent = 'לא הצלחנו לטעון את המחירים. בודקים אינטרנט ומרעננים.'; });
  })();
})();
