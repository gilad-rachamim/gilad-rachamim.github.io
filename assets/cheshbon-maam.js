// דוח מע"מ מהחשבוניות (/kelim/cheshbon/doch-maam/) + מגירת המע"מ בפורטל הלקוחות של רואה החשבון.
// window.MAAM = המנוע: תקופות ומועדים, סוגי חשבוניות, חישוב שדות הדוח, בדיקות (ח.פ, מספר הקצאה, תאריך, כפולים),
// קידוד של פרטי החשבונית בשדה "הערה" בגיליון של רואה החשבון, ויצוא לאקסל.
// בדף הציבורי הכול נשמר רק בדפדפן. בפורטל הקבצים עוברים ישר לגוגל דרייב של רואה החשבון, לא דרך האתר.
(function () {
  'use strict';
  var CH = window.CH; if (!CH) return;
  var M = window.MAAM = {};
  M.DRAWER = 'חשבוניות לדוח מע"מ';
  // סוגי שורות בדוח: עסקה חייבת, עסקה פטורה או בשיעור אפס, תשומות אחרות, תשומות ציוד
  M.KINDS = [
    { k: 'sale', t: 'הכנסה', l: 'עסקה חייבת (הכנסה)', h: 'חשבונית שהוצאתם ללקוח, עם מע"מ' },
    { k: 'exp', t: 'הוצאה', l: 'תשומות אחרות (הוצאה)', h: 'חשבונית מס שקיבלתם מספק: חומרים, טלפון, שכירות, דלק' },
    { k: 'eq', t: 'ציוד', l: 'תשומות ציוד', h: 'רכוש קבוע: מחשב, מכונה, ריהוט, רכב מסחרי' },
    { k: 'zero', t: 'פטורה / אפס', l: 'עסקה פטורה או בשיעור אפס', h: 'ייצוא, אילת, עסקה פטורה: נכנסת למחזור בלי מע"מ' }
  ];
  // סדר תצוגה: הכנסות, פטורות, הוצאות, ציוד – ובתוך כל סוג לפי תאריך
  M.sort = function (L) { var o = { sale: 0, zero: 1, exp: 2, eq: 3 }; return L.slice().sort(function (a, b) { return (o[a.k] - o[b.k]) || String(a.d || '').localeCompare(String(b.d || '')); }); };
  M.kind = function (k) { return M.KINDS.filter(function (x) { return x.k === k; })[0] || M.KINDS[1]; };
  M.rate = function (iso) { return String(iso || '9') >= '2025-01-01' ? 18 : 17; };
  // מספר הקצאה: רף לפני מע"מ לפי תאריך החשבונית (הודעת רשות המסים 24.5.2026, כמו בבודק מספר ההקצאה)
  var HK = [['2026-06-01', 5000], ['2026-01-01', 10000], ['2025-01-01', 20000], ['2024-05-05', 25000]];
  M.hkLimit = function (iso) { iso = String(iso || ''); for (var i = 0; i < HK.length; i++) if (iso >= HK[i][0]) return HK[i][1]; return null; };
  // ספרת ביקורת של ח.פ / ע.מ / ת.ז (9 ספרות)
  M.idOk = function (s) {
    s = String(s || '').replace(/\D/g, ''); if (!s || s.length > 9) return false;
    s = ('000000000' + s).slice(-9); var t = 0;
    for (var i = 0; i < 9; i++) { var d = +s[i] * (i % 2 + 1); t += d > 9 ? d - 9 : d; }
    return t % 10 === 0 && !/^0+$/.test(s);
  };

  // ---- תקופות: key = 'YYYY-m' (m = החודש האחרון בתקופה, 0–11), freq 1 = חודשי, 2 = דו-חודשי ----
  M.label = function (key, freq) {
    var p = String(key).split('-'), y = +p[0], m = +p[1];
    return freq === 2 ? CH.MONTHS[m - 1] + '–' + CH.MONTHS[m] + ' ' + y : CH.MONTHS[m] + ' ' + y;
  };
  M.range = function (key, freq) { // [מ-iso, עד-iso]
    var p = String(key).split('-'), y = +p[0], m = +p[1], m0 = freq === 2 ? m - 1 : m;
    return [CH.iso(new Date(y, m0, 1)), CH.iso(new Date(y, m + 1, 0))];
  };
  M.due = function (key) { var p = String(key).split('-'), row = CH.DATES[p[0]] && CH.DATES[p[0]][+p[1]]; return row ? CH.date(row[0]) : null; };
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  // התקופה שהמועד שלה הבא בתור (היום 16.11 בדו-חודשי: ספטמבר–אוקטובר עד היום, ואחרי זה נובמבר–דצמבר)
  M.current = function (freq) {
    var nx = CH.deadlines('vat', freq, today())[0];
    if (nx) return nx.y + '-' + nx.m;
    var d = new Date(); return d.getFullYear() + '-' + (freq === 2 ? d.getMonth() | 1 : d.getMonth());
  };
  M.periods = function (freq) { // מכל השנים בלוח המועדים, ועוד שנה אחורה
    var out = [], ys = Object.keys(CH.DATES).map(Number); ys.unshift(ys[0] - 1);
    ys.forEach(function (y) { for (var m = freq === 2 ? 1 : 0; m < 12; m += freq) out.push(y + '-' + m); });
    return out;
  };
  // תקופה לפי תאריך חשבונית
  M.periodOf = function (iso, freq) { var d = CH.date(iso); if (!d) return ''; var m = d.getMonth(); if (freq === 2) m = m | 1; return d.getFullYear() + '-' + m; };

  // ---- חשבונית: {k, d (iso), who, osek, no, hk, tot (כולל מע"מ), vat} ----
  M.fix = function (r) {
    r.tot = isFinite(+r.tot) ? CH.r2(+r.tot) : 0;
    if (r.k === 'zero') r.vat = 0;
    else if (r.vat === '' || r.vat == null || !isFinite(+r.vat)) { var rt = M.rate(r.d); r.vat = CH.r2(r.tot * rt / (100 + rt)); r.auto = 1; }
    else r.vat = CH.r2(+r.vat);
    r.net = CH.r2(r.tot - r.vat);
    return r;
  };
  M.calc = function (list) {
    var o = { saleNet: 0, saleVat: 0, zeroNet: 0, eqVat: 0, expVat: 0, expNet: 0, n: { sale: 0, exp: 0, eq: 0, zero: 0 } };
    list.forEach(function (r) {
      o.n[r.k] = (o.n[r.k] || 0) + 1;
      if (r.k === 'sale') { o.saleNet += r.net; o.saleVat += r.vat; }
      else if (r.k === 'zero') o.zeroNet += r.tot;
      else if (r.k === 'eq') { o.eqVat += r.vat; o.expNet += r.net; }
      else { o.expVat += r.vat; o.expNet += r.net; }
    });
    ['saleNet', 'saleVat', 'zeroNet', 'eqVat', 'expVat', 'expNet'].forEach(function (k) { o[k] = CH.r2(o[k]); });
    o.inVat = CH.r2(o.eqVat + o.expVat);
    o.pay = CH.r2(o.saleVat - o.inVat);
    o.turn = CH.r2(o.saleNet + o.zeroNet);
    return o;
  };
  // בדיקות לכל חשבונית: מה לבדוק לפני הדיווח
  M.checks = function (r, key, freq, all) {
    var w = [], rg = key ? M.range(key, freq) : null;
    if (!r.d) w.push('חסר תאריך');
    else if (rg && (r.d < rg[0] || r.d > rg[1])) w.push('התאריך מחוץ לתקופה');
    if (!(r.tot > 0)) w.push('חסר סכום');
    if (r.k === 'exp' || r.k === 'eq') {
      if (!r.osek) w.push('חסר ח.פ של הספק');
      else if (!M.idOk(r.osek)) w.push('ח.פ לא תקין (ספרת ביקורת)');
      var lim = M.hkLimit(r.d);
      if (lim != null && r.net > lim && !/^\d{9}$/.test(String(r.hk || ''))) w.push('מעל ' + CH.money(lim, 0) + ' לפני מע"מ: צריך מספר הקצאה כדי לקזז');
      if (r.vat > 0 && r.d && Math.abs(r.vat - r.tot * M.rate(r.d) / (100 + M.rate(r.d))) > Math.max(1, r.tot * 0.004) && !r.auto) w.push('המע"מ לא ' + M.rate(r.d) + '% מהסכום: אולי מע"מ חלקי (רכב, טלפון) – לבדוק');
    } else if (r.k === 'sale' && r.osek && !M.idOk(r.osek)) w.push('ח.פ הלקוח לא תקין');
    if (all && r.no && r.osek) {
      var same = all.filter(function (x) { return x !== r && x.no && String(x.no) === String(r.no) && String(x.osek) === String(r.osek); });
      if (same.length) w.push('אותה חשבונית פעמיים?');
    }
    return w;
  };
  // ---- קידוד בשדה "הערה" (עד 200 תווים) בגיליון של רואה החשבון, כך שגם עין אנושית מבינה ----
  M.encode = function (r) {
    var a = ['מעמ', M.kind(r.k).t, 'כולל ' + r.tot, 'מעמ ' + r.vat];
    if (r.osek) a.push('חפ ' + String(r.osek).replace(/\D/g, ''));
    if (r.no) a.push('מס ' + String(r.no).replace(/[·|]/g, ' ').slice(0, 20));
    if (r.hk) a.push('הקצאה ' + String(r.hk).replace(/\D/g, ''));
    if (r.d) a.push('תאריך ' + r.d);
    if (r.who) a.push('שם ' + String(r.who).replace(/[·|]/g, ' ').slice(0, 50));
    return a.join(' · ').slice(0, 200);
  };
  M.decode = function (note) {
    var p = String(note || '').split(' · ');
    if (p[0] !== 'מעמ') return null;
    var k = (M.KINDS.filter(function (x) { return x.t === p[1]; })[0] || M.KINDS[1]).k, r = { k: k };
    p.slice(2).forEach(function (s) {
      var i = s.indexOf(' '), a = s.slice(0, i), v = s.slice(i + 1);
      if (a === 'כולל') r.tot = +v; else if (a === 'מעמ') r.vat = +v; else if (a === 'חפ') r.osek = v; else if (a === 'מס') r.no = v;
      else if (a === 'הקצאה') r.hk = v; else if (a === 'תאריך') r.d = v; else if (a === 'שם') r.who = v;
    });
    return M.fix(r);
  };
  // שורות לאקסל (להקלדה בתוכנת הנהלת החשבונות)
  M.HEAD = ['סוג', 'תאריך', 'ספק / לקוח', 'ח.פ', 'מספר חשבונית', 'מספר הקצאה', 'לפני מע"מ', 'מע"מ', 'כולל מע"מ', 'לבדוק'];
  M.row = function (r, w) { return [M.kind(r.k).l, r.d ? CH.heDate(CH.date(r.d)) : '', r.who || '', r.osek || '', r.no || '', r.hk || '', r.net, r.vat, r.tot, (w || []).join('; ')]; };
  M.summaryRows = function (o) {
    return [['שדה בדוח', 'סכום'], ['עסקאות חייבות (לפני מע"מ)', o.saleNet], ['מע"מ עסקאות', o.saleVat], ['עסקאות פטורות / בשיעור אפס', o.zeroNet],
      ['מע"מ תשומות ציוד', o.eqVat], ['מע"מ תשומות אחרות', o.expVat], [o.pay >= 0 ? 'מע"מ לתשלום' : 'מע"מ להחזר', Math.abs(o.pay)]];
  };
  M.text = function (o, label, due, name) {
    var L = [(name ? name + ' – ' : '') + 'דוח מע"מ ל' + label];
    L.push('עסקאות חייבות: ' + CH.money(o.saleNet) + ' (מע"מ ' + CH.money(o.saleVat) + ')');
    if (o.zeroNet) L.push('עסקאות פטורות / אפס: ' + CH.money(o.zeroNet));
    L.push('תשומות: ציוד ' + CH.money(o.eqVat) + ', אחרות ' + CH.money(o.expVat));
    L.push(o.pay >= 0 ? 'מע"מ לתשלום: ' + CH.money(o.pay) : 'מע"מ להחזר: ' + CH.money(-o.pay));
    if (due) L.push('מועד אחרון: ' + CH.heDate(due));
    return L.join('\n');
  };
  // תוצאה כמו בטופס המקוון של רשות המסים
  M.resHtml = function (o, label, due) {
    var esc = CH.esc, h = '<h3>' + esc(label) + '</h3><div class="sum">';
    h += '<div>עסקאות חייבות, לפני מע"מ<b>' + CH.money(o.saleNet) + '</b></div>';
    h += '<div>מע"מ עסקאות<b>' + CH.money(o.saleVat) + '</b></div>';
    h += '<div>עסקאות פטורות / בשיעור אפס<b>' + CH.money(o.zeroNet) + '</b></div>';
    h += '<div>מע"מ תשומות ציוד<b>' + CH.money(o.eqVat) + '</b></div>';
    h += '<div>מע"מ תשומות אחרות<b>' + CH.money(o.expVat) + '</b></div>';
    h += '<div class="tot">' + (o.pay >= 0 ? 'מע"מ לתשלום' : 'מע"מ להחזר') + '<b>' + CH.money(Math.abs(o.pay)) + '</b></div></div>';
    if (due) { var days = Math.round((due - today()) / 864e5); h += '<p class="g" style="margin-top:.6rem">מועד אחרון לדיווח ולתשלום: <b>' + CH.heDate(due) + '</b>' + (days > 1 ? ' (בעוד ' + days + ' ימים)' : days === 1 ? ' (מחר)' : days === 0 ? ' (היום!)' : ' (עבר)') + '</p>'; }
    if (o.pay < 0) h += '<p class="hint">יוצא החזר מע"מ. ההחזר מתקבל אחרי הגשת הדוח, לפי הכללים של רשות המסים.</p>';
    return h;
  };

  // ---- קריאת חשבונית אוטומטית (לשותפים במיזם): אותו Worker של פורטל הלקוחות ----
  // מחזיר סכום כולל, תאריך, שם העסק, ואם נקראו גם מע"מ, ח.פ ומספר חשבונית. שום דבר לא נשמר שם.
  M.fromRead = function (r) {
    var o = { tot: r.amount ? String(r.amount) : '', d: r.date || '', who: r.vendor || '' };
    if (r.vat) o.vat = String(r.vat);
    if (r.osek) o.osek = String(r.osek).replace(/\D/g, '');
    if (r.no) o.no = String(r.no);
    return o;
  };

  // =================== הדף הציבורי: מחשבון דוח מע"מ מהחשבוניות ===================
  var root = CH.$('maam');
  if (!root) return;
  var $ = CH.$, esc = CH.esc, TOOL = 'cheshbon_doch_maam', KEY = 'kelim-cheshbon-maam';
  var EX = [ // דוגמה מלאה בכניסה הראשונה (עוסק מורשה דו-חודשי)
    { k: 'sale', d: '', who: 'לקוח לדוגמה בע"מ', osek: '', no: '1041', tot: 11800 },
    { k: 'sale', d: '', who: 'לקוח פרטי', osek: '', no: '1042', tot: 2360 },
    { k: 'exp', d: '', who: 'ספק תקשורת (דוגמה)', osek: '515432102', no: '88231', tot: 236 },
    { k: 'exp', d: '', who: 'ציוד משרדי (דוגמה)', osek: '512887704', no: '55120', tot: 590 },
    { k: 'eq', d: '', who: 'חנות מחשבים (דוגמה)', osek: '516773405', no: '771903', tot: 7080 }
  ];
  var st = CH.load(KEY, null);
  if (!st || !st.list) {
    var k0 = M.current(2), rg0 = M.range(k0, 2);
    st = { freq: 2, key: k0, kind: 'sale', list: EX.map(function (r, i) { var o = JSON.parse(JSON.stringify(r)); o.d = i % 2 ? rg0[0].slice(0, 8) + '0' + (3 + i) : rg0[1].slice(0, 8) + '1' + i; return M.fix(o); }), ex: 1, name: '' };
  }
  st.list = (st.list || []).map(M.fix);
  var edit = -1;
  function save() { CH.save(KEY, st); }

  function fillPer() {
    $('mm-per').innerHTML = M.periods(st.freq).map(function (k) { return '<option value="' + k + '"' + (k === st.key ? ' selected' : '') + '>' + esc(M.label(k, st.freq)) + '</option>'; }).join('');
    if ($('mm-per').value !== st.key) { st.key = M.current(st.freq); $('mm-per').value = st.key; }
  }
  function inPer() { var rg = M.range(st.key, st.freq); return M.sort(st.list.filter(function (r) { return !r.d || (r.d >= rg[0] && r.d <= rg[1]); })); }
  function render() {
    CH.pick($('mm-freq'), String(st.freq)); CH.pick($('mm-kind'), st.kind);
    var L = inPer(), o = M.calc(L), due = M.due(st.key), lab = M.label(st.key, st.freq);
    var other = st.list.length - L.length;
    $('mm-kh').textContent = M.kind(st.kind).h;
    var badN = 0;
    $('mm-list').innerHTML = L.length ? '<div class="tbl-wrap"><table><thead><tr><th>סוג</th><th>תאריך</th><th>ספק / לקוח</th><th>כולל מע"מ</th><th>מע"מ</th><th><span class="vh">פעולות</span></th></tr></thead><tbody>' + L.map(function (r) {
      var i = st.list.indexOf(r), w = M.checks(r, st.key, st.freq, L); if (w.length) badN++;
      return '<tr class="' + (w.length ? 'is-bad' : 'is-ok') + '"><td>' + esc(M.kind(r.k).t) + '</td><td class="n">' + (r.d ? esc(CH.heDate(CH.date(r.d))) : '—') + '</td><td>' + esc(r.who || '') + (r.no ? ' <span class="hint">#' + esc(r.no) + '</span>' : '') +
        (w.length ? '<div class="mm-w">⚠ ' + w.map(esc).join(' · ') + '</div>' : '') + '</td><td class="n">' + CH.money(r.tot) + '</td><td class="n">' + CH.money(r.vat) + '</td>' +
        '<td class="mm-act"><button type="button" data-ed="' + i + '" aria-label="לערוך">✎</button><button type="button" data-rm="' + i + '" aria-label="למחוק">✕</button></td></tr>';
    }).join('') + '</tbody></table></div>' : '<p class="hint">עוד אין חשבוניות בתקופה הזאת. מוסיפים למעלה, או מדביקים רשימה מאקסל.</p>';
    if (other > 0) $('mm-list').insertAdjacentHTML('beforeend', '<p class="hint">' + other + ' חשבוניות שמורות בתקופות אחרות. הן מחכות שם.</p>');
    $('mm-res').innerHTML = M.resHtml(o, (st.name ? st.name + ' · ' : '') + lab, due) +
      '<p class="hint">' + L.length + ' חשבוניות: ' + o.n.sale + ' הכנסה, ' + (o.n.exp + o.n.eq) + ' הוצאה' + (o.n.zero ? ', ' + o.n.zero + ' פטורה' : '') + '.' + (badN ? ' <b class="warn">' + badN + ' לבדוק לפני הדיווח (מסומנות באדום).</b>' : ' הכול נראה תקין ✓') + '</p>';
    $('mm-wa').href = CH.wa(M.text(o, lab, due, st.name) + '\n\nחושב בכלי החינמי: https://hakelim.com/kelim/cheshbon/doch-maam/');
    $('mm-add-btn').textContent = edit >= 0 ? 'לשמור את התיקון' : '+ להוסיף חשבונית';
    $('mm-cancel').hidden = edit < 0;
  }

  // ---- טופס חשבונית ----
  var F = ['d', 'tot', 'vat', 'who', 'osek', 'no', 'hk'];
  function formVals() { var o = { k: st.kind }; F.forEach(function (f) { o[f] = $('mm-' + f).value.trim(); }); o.tot = CH.num(o.tot); o.vat = o.vat === '' ? '' : CH.num(o.vat); o.osek = o.osek.replace(/\D/g, ''); o.hk = o.hk.replace(/\D/g, ''); return o; }
  function formSet(r) { F.forEach(function (f) { $('mm-' + f).value = r && r[f] != null && !(f === 'vat' && r.auto) ? r[f] : ''; }); if (r) { st.kind = r.k; } vatHint(); }
  function vatHint() {
    var v = formVals(), rt = M.rate(v.d || CH.iso(new Date()));
    $('mm-vat').placeholder = st.kind === 'zero' ? '0' : (isFinite(v.tot) && v.tot > 0 ? 'אוטומטי: ' + CH.r2(v.tot * rt / (100 + rt)) : 'אוטומטי ' + rt + '%');
    var lim = M.hkLimit(v.d || CH.iso(new Date())), net = isFinite(v.tot) ? v.tot / (1 + rt / 100) : 0;
    $('mm-hk-box').hidden = !((st.kind === 'exp' || st.kind === 'eq') && lim != null && net > lim);
    $('mm-vat-box').hidden = st.kind === 'zero';
  }
  $('mm-form').addEventListener('input', vatHint);
  $('mm-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var r = formVals();
    if (!(r.tot > 0)) { $('mm-msg').textContent = 'כתבו את הסכום הכולל של החשבונית (כולל מע"מ).'; $('mm-tot').focus(); return; }
    if (!r.d) r.d = CH.iso(new Date());
    M.fix(r);
    if (st.ex) { st.list = []; st.ex = 0; } // הדוגמה מתנקה בחשבונית האמיתית הראשונה
    if (edit >= 0) { st.list[edit] = r; edit = -1; CH.used(TOOL, 'edit'); } else { st.list.push(r); CH.used(TOOL, 'add'); }
    var pk = M.periodOf(r.d, st.freq); if (pk && pk !== st.key) { st.key = pk; fillPer(); $('mm-msg').textContent = 'החשבונית נכנסה לתקופה ' + M.label(pk, st.freq) + ', לפי התאריך שלה.'; }
    else $('mm-msg').textContent = 'נוספה ✓';
    formSet(null); save(); render(); $('mm-tot').focus();
  });
  $('mm-cancel').addEventListener('click', function () { edit = -1; formSet(null); render(); });
  CH.seg($('mm-kind'), function (v) { st.kind = v; save(); vatHint(); $('mm-kh').textContent = M.kind(v).h; });
  CH.seg($('mm-freq'), function (v) { st.freq = +v; st.key = M.current(st.freq); fillPer(); save(); render(); });
  $('mm-per').addEventListener('change', function () { st.key = this.value; save(); render(); });
  $('mm-name').addEventListener('input', function () { st.name = this.value.trim(); save(); render(); });
  $('mm-list').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-rm')) { st.list.splice(+b.getAttribute('data-rm'), 1); edit = -1; save(); render(); }
    else if (b.hasAttribute('data-ed')) { edit = +b.getAttribute('data-ed'); formSet(st.list[edit]); render(); $('mm-tot').focus(); }
  });

  // ---- הדבקה מאקסל: סוג · תאריך · ספק/לקוח · ח.פ · מספר חשבונית · סכום כולל מע"מ · מע"מ (לא חובה) ----
  function kindOf(s) { s = String(s || ''); if (/ציוד|רכוש/.test(s)) return 'eq'; if (/פטור|אפס|ייצוא|יצוא/.test(s)) return 'zero'; if (/הכנס|עסק|מכיר|לקוח|sale/i.test(s)) return 'sale'; return 'exp'; }
  $('mm-paste-go').addEventListener('click', function () {
    var rows = CH.rows($('mm-paste').value), n = 0;
    rows.forEach(function (c) {
      if (c.length < 2 || /^סוג/.test(c[0])) return;
      var tot = CH.num(c[5] != null ? c[5] : c[c.length - 1]); if (!(tot > 0)) return;
      var d = CH.date(c[1]);
      if (st.ex) { st.list = []; st.ex = 0; }
      st.list.push(M.fix({ k: kindOf(c[0]), d: d ? CH.iso(d) : '', who: c[2] || '', osek: String(c[3] || '').replace(/\D/g, ''), no: c[4] || '', tot: tot, vat: c[6] != null && c[6] !== '' ? CH.num(c[6]) : '' }));
      n++;
    });
    $('mm-pmsg').textContent = n ? 'נוספו ' + n + ' חשבוניות ✓' : 'לא מצאנו שורות. הסדר: סוג · תאריך · ספק או לקוח · ח.פ · מספר חשבונית · סכום כולל מע"מ.';
    if (n) { $('mm-paste').value = ''; var f = st.list[st.list.length - 1]; var pk = f.d && M.periodOf(f.d, st.freq); if (pk) { st.key = pk; fillPer(); } save(); render(); CH.used(TOOL, 'paste'); }
  });

  // ---- כפתורים ----
  $('mm-csv').addEventListener('click', function () {
    var L = inPer(), o = M.calc(L), rows = [M.HEAD].concat(L.map(function (r) { return M.row(r, M.checks(r, st.key, st.freq, L)); }));
    rows.push([]); rows = rows.concat(M.summaryRows(o));
    CH.csv('דוח-מעמ-' + M.label(st.key, st.freq).replace(/\s+/g, '-') + '.csv', rows); CH.used(TOOL, 'csv');
  });
  $('mm-copy').addEventListener('click', function () { var o = M.calc(inPer()); CH.copy(M.text(o, M.label(st.key, st.freq), M.due(st.key), st.name), $('mm-msg2')); CH.used(TOOL, 'copy'); });
  $('mm-wa').addEventListener('click', function () { CH.used(TOOL, 'wa'); });
  $('mm-print').addEventListener('click', function () { CH.used(TOOL, 'print'); window.print(); });
  $('mm-clear').addEventListener('click', function () {
    var L = inPer(); if (L.length && !confirm('למחוק את ' + L.length + ' החשבוניות של ' + M.label(st.key, st.freq) + '?')) return;
    st.list = st.list.filter(function (r) { return L.indexOf(r) < 0; }); st.ex = 0; save(); render();
  });

  // ---- צילום חשבונית (לשותפים במיזם: קריאה אוטומטית של הסכום, התאריך והספק) ----
  function partner() { try { var p = (localStorage.getItem('kelim-partner') || '').replace(/\s/g, ''); return /^\d{3}-?\d{5}$/.test(p) ? p : ''; } catch (e) { return ''; } }
  var AI = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8841' : 'https://kelim-kabala.gilad4049.workers.dev';
  $('mm-photo-box').hidden = !partner() || !window.TIK;
  $('mm-photo-note').hidden = !!partner();
  $('mm-photo').addEventListener('change', function () {
    var f = this.files && this.files[0]; this.value = ''; if (!f || !window.TIK) return;
    var m = $('mm-msg'); m.textContent = 'קורא את החשבונית…';
    var key = CH.load('kelim-maam-aikey', '');
    (key ? Promise.resolve(key) : fetch(AI + '/key', { method: 'POST', headers: { 'x-kelim-partner': partner() } }).then(function (r) { return r.json(); }).then(function (k) { if (k.key) CH.save('kelim-maam-aikey', k.key); return k.key || ''; }))
      .then(function (k) {
        if (!k) { m.textContent = 'קוד השותף לא נכון, ולכן אין קריאה אוטומטית. אפשר להקליד את הפרטים.'; return; }
        return window.TIK.read(k, f).then(function (r) {
          if (!r.found) { m.textContent = r.error === 'quota' ? 'הקריאה האוטומטית הגיעה למכסה של היום. אפשר להקליד.' : 'לא הצלחנו לקרוא את הסכום. אפשר להקליד אותו.'; return; }
          var o = M.fromRead(r); edit = -1; formSet(o); CH.used(TOOL, 'ai_read');
          m.textContent = 'נקרא מהחשבונית. בדקו את הפרטים, בחרו הכנסה או הוצאה, ולחצו "להוסיף".';
          $('mm-tot').focus();
        });
      }).catch(function () { m.textContent = 'אין חיבור לקריאה האוטומטית. אפשר להקליד את הפרטים.'; });
  });

  fillPer(); $('mm-name').value = st.name || ''; formSet(null); render();
  if (st.ex) $('mm-msg').textContent = 'דוגמה: עוסק מורשה עם 5 חשבוניות. מוסיפים חשבונית אמיתית, והדוגמה נמחקת לבד.';
})();
