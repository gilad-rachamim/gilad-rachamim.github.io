// מחשבון תמחור מנה (כלים לעסק קטן). הכול בדפדפן, הנתונים נשמרים רק ב-localStorage של הטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('tm-form'), rows = $('tm-rows'), KEY = 'esek-tmchur';
  if (!form) return;
  function used(a, x) { if (window.toolUsed) window.toolUsed('esek_tmchur', Object.assign({ action: a }, x || {})); }
  function num(v) { v = String(v == null ? '' : v).replace(',', '.').replace(/[^\d.]/g, ''); var n = parseFloat(v); return isFinite(n) ? n : 0; }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function money(n) { return (Math.round(n * 100) / 100).toLocaleString('he-IL', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' ₪'; }

  function addRow(d) {
    d = d || {};
    var r = document.createElement('div'); r.className = 'tm-row';
    r.innerHTML = '<input data-k="n" type="text" maxlength="40" placeholder="רכיב" aria-label="שם הרכיב">' +
      '<input data-k="p" type="text" inputmode="decimal" maxlength="8" placeholder="מחיר ₪" aria-label="מחיר ששילמתם">' +
      '<input data-k="q" type="text" inputmode="decimal" maxlength="8" placeholder="באריזה" aria-label="כמות באריזה">' +
      '<input data-k="u" type="text" inputmode="decimal" maxlength="8" placeholder="במנה" aria-label="כמות במנה">' +
      '<button type="button" class="tm-x" aria-label="למחוק רכיב">×</button>';
    ['n', 'p', 'q', 'u'].forEach(function (k) { if (d[k] != null) r.querySelector('[data-k=' + k + ']').value = d[k]; });
    rows.appendChild(r);
    return r;
  }
  function readRows() {
    return [].map.call(rows.children, function (r) {
      var o = {}; [].forEach.call(r.querySelectorAll('input'), function (i) { o[i.getAttribute('data-k')] = i.value.trim(); }); return o;
    });
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ dish: $('tm-dish').value, rows: readRows(), pack: $('tm-pack').value, waste: $('tm-waste').value, target: $('tm-target').value, vat: $('tm-vat').value, price: $('tm-price').value, qty: $('tm-qty').value })); } catch (e) {}
  }
  var SAMPLE = [{ n: 'בשר טחון', p: '62', q: '1000', u: '200' }, { n: 'לחמנייה', p: '14', q: '8', u: '1' }, { n: 'חסה, עגבנייה, מלפפון חמוץ', p: '20', q: '10', u: '1' }, { n: 'רוטב ושמן', p: '25', q: '50', u: '1' }, { n: 'צ\'יפס (מנה)', p: '9', q: '', u: '' }];

  rows.addEventListener('click', function (e) { var b = e.target.closest('.tm-x'); if (b) { b.parentNode.remove(); if (!rows.children.length) addRow(); save(); } });
  $('tm-add').addEventListener('click', function () { addRow().querySelector('input').focus(); });
  $('tm-sample').addEventListener('click', function () {
    if (readRows().some(function (r) { return r.n || r.p; }) && !confirm('להחליף את מה שכתבתם בדוגמה?')) return;
    rows.innerHTML = ''; SAMPLE.forEach(addRow);
    $('tm-dish').value = 'המבורגר 200 גרם'; $('tm-pack').value = '1.2'; $('tm-price').value = '58'; $('tm-qty').value = '400';
    save(); used('sample');
  });
  form.addEventListener('input', save);

  var st = null; try { st = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  if (st && st.rows && st.rows.length) {
    st.rows.forEach(addRow);
    $('tm-dish').value = st.dish || ''; $('tm-pack').value = st.pack || ''; $('tm-waste').value = st.waste || '5'; $('tm-target').value = st.target || '30'; $('tm-vat').value = st.vat || '18'; $('tm-price').value = st.price || ''; $('tm-qty').value = st.qty || '';
  } else { addRow(); addRow(); addRow(); }

  var summary = '';
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var items = readRows().filter(function (r) { return num(r.p) > 0; });
    if (!items.length) { $('tm-res').hidden = false; $('tm-res').innerHTML = '<p>כתבו לפחות רכיב אחד עם מחיר.</p>'; return; }
    var sum = 0, lines = [];
    items.forEach(function (r) {
      var p = num(r.p), q = num(r.q), u = num(r.u), c = q > 0 && u > 0 ? p / q * u : p;
      sum += c; lines.push({ n: r.n || 'רכיב', c: c });
    });
    var pack = num($('tm-pack').value), waste = Math.min(num($('tm-waste').value), 100), target = num($('tm-target').value), vat = num($('tm-vat').value);
    if (target <= 0 || target >= 100) { target = 30; $('tm-target').value = '30'; }
    var cost = (sum + pack) * (1 + waste / 100);
    var exV = cost / (target / 100), incV = exV * (1 + vat / 100), sugg = Math.ceil(incV);
    var cur = num($('tm-price').value), qty = num($('tm-qty').value), dish = $('tm-dish').value.trim() || 'המנה';
    var h = '<h3>' + esc(dish) + ': עלות ' + money(cost) + '</h3>';
    h += '<p class="tm-big">מחיר מומלץ בתפריט: <b>' + sugg + ' ₪</b> <span>כולל מע"מ, לעלות חומרי גלם של ' + target + '%</span></p>';
    h += '<table class="tm-t"><tbody>' + lines.map(function (l) { return '<tr><td>' + esc(l.n) + '</td><td>' + money(l.c) + '</td></tr>'; }).join('') +
      (pack ? '<tr><td>אריזה</td><td>' + money(pack) + '</td></tr>' : '') +
      (waste ? '<tr><td>פחת (' + waste + '%)</td><td>' + money((sum + pack) * waste / 100) + '</td></tr>' : '') +
      '<tr class="tot"><td>עלות המנה</td><td>' + money(cost) + '</td></tr></tbody></table>';
    var sum2 = dish + ': עלות ' + money(cost) + ', מחיר מומלץ ' + sugg + ' ₪ כולל מע"מ (עלות חומרי גלם ' + target + '%).';
    h += '<p>מחיר לפני מע"מ: ' + money(exV) + ' · רווח למנה לפני הוצאות קבועות: ' + money(exV - cost) + '</p>';
    if (cur > 0) {
      var exCur = cur / (1 + vat / 100), pct = cost / exCur * 100, prof = exCur - cost;
      var verdict = pct <= 28 ? 'מצוין, יש מקום להנחות ולמבצעים.' : pct <= 35 ? 'תקין לעסק אוכל.' : 'גבוה: או שהמחיר נמוך מדי, או שהמנה יקרה להכנה. כדאי לבדוק מחיר או כמויות.';
      h += '<p class="tm-cur">במחיר שלכם היום (' + money(cur) + '): עלות חומרי גלם <b>' + (Math.round(pct * 10) / 10) + '%</b>, רווח למנה ' + money(prof) + '. ' + verdict + '</p>';
      sum2 += ' במחיר היום ' + money(cur) + ': ' + (Math.round(pct * 10) / 10) + '% עלות, רווח ' + money(prof) + ' למנה.';
      if (qty > 0) { h += '<p>רווח חודשי מהמנה הזאת, ' + qty + ' מנות: <b>' + money(prof * qty) + '</b>. אם תעלו למחיר המומלץ: ' + money((sugg / (1 + vat / 100) - cost) * qty) + '.</p>'; }
    }
    h += '<table class="tm-t"><caption>המחיר בתפריט לפי אחוז עלות</caption><tbody>' + [25, 30, 35].map(function (t) { return '<tr><td>' + t + '% עלות חומרי גלם</td><td>' + Math.ceil(cost / (t / 100) * (1 + vat / 100)) + ' ₪</td></tr>'; }).join('') + '</tbody></table>';
    var el = $('tm-res'); el.innerHTML = h; el.hidden = false; $('tm-share').hidden = false;
    summary = sum2;
    $('tm-wa').href = 'https://wa.me/?text=' + encodeURIComponent(sum2);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    used('calc', { items: items.length, pct: Math.round(target) });
  });
  $('tm-copy').addEventListener('click', function () {
    var b = this;
    (navigator.clipboard ? navigator.clipboard.writeText(summary) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; used('copy'); }).catch(function () {});
  });
  $('tm-wa').addEventListener('click', function () { used('wa'); });
})();
