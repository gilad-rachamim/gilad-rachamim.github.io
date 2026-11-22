/* פורטל שכבה – קיוסק וכסף: קופה, מלאי וקניות, ספר חשבונות, גבייה, ספונסרים, מודעות ודוח.
   האתר לא סולק ולא מחזיק כסף. זה פנקס: מה נכנס, מה יצא, מה במלאי, ומי שילם. */
(function () {
  'use strict';
  var SH = window.SH = window.SH || {};
  var api = function (p, b, m) { return SH.api(p, b, m); };
  var esc = function (s) { return SH.esc(s); };
  var toast = function (t) { SH.toast(t); };
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var K = null, host = null, sub = 'sell';

  var SUBS = [['sell', 'קופה'], ['stock', 'מלאי וקניות'], ['ledger', 'ספר חשבונות'], ['coll', 'גבייה'], ['spons', 'ספונסרים'], ['ads', 'מודעות'], ['report', 'דוח']];
  var ST = { new: 'חדש', letter: 'מכתב מוכן', sent: 'נשלח', talked: 'דיברנו', yes: 'אישר', no: 'סירב' };
  var PACK = ['לוגו בחוברת', 'לוגו על המסך', 'תודה בערב', 'לוגו בחוברת ועל המסך ותודה בערב'];
  var METH = { cash: 'מזומן', bit: 'ביט', other: 'אחר' };

  function ils(a) { a = Math.round(a || 0); var neg = a < 0; a = Math.abs(a); var s = (a / 100).toFixed(a % 100 ? 2 : 0); return (neg ? '−' : '') + '₪' + s; }
  function toAg(v) { var n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? Math.round(n * 100) : NaN; }
  function dshort(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? (+p[2]) + '.' + (+p[1]) : ''; }
  function money() { return !!(K && K.money); }
  function fail(e) { toast(SH.err ? SH.err(e) : 'משהו השתבש.'); }

  /* ---------- טופס קטן עם כמה שדות ---------- */
  function form(title, fields, ok) {
    return new Promise(function (res) {
      var d = $('#dlg'), b = $('#dlgBody');
      b.innerHTML = '<h3>' + esc(title) + '</h3>' + fields.map(function (f, i) {
        var inp;
        if (f.options) inp = '<select id="kf' + i + '">' + f.options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(f.value) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
        else if (f.long) inp = '<textarea id="kf' + i + '" rows="3" maxlength="' + (f.max || 300) + '">' + esc(f.value || '') + '</textarea>';
        else inp = '<input id="kf' + i + '" type="' + (f.type || 'text') + '"' + (f.inputmode ? ' inputmode="' + f.inputmode + '"' : '') + ' maxlength="' + (f.max || 80) + '" value="' + esc(f.value == null ? '' : f.value) + '"' + (f.required ? ' required' : '') + (f.dir ? ' dir="' + f.dir + '"' : '') + '>';
        return '<label class="field">' + esc(f.label) + inp + '</label>';
      }).join('') + '<div class="sh-row"><button class="btn btn-gold" value="ok">' + esc(ok || 'שמירה') + '</button><button class="btn btn-line" value="no" formnovalidate>ביטול</button></div>';
      var done = false, fin = function (v) { if (done) return; done = true; if (d.open) d.close(); res(v); };
      $('#dlgForm').onsubmit = function (e) {
        e.preventDefault();
        if (!(e.submitter && e.submitter.value === 'ok')) return fin(null);
        var out = {};
        fields.forEach(function (f, i) { out[f.k] = $('#kf' + i).value.trim(); });
        fin(out);
      };
      d.oncancel = function () { fin(null); };
      d.showModal(); var first = $('#kf0'); if (first) first.focus();
    });
  }

  /* ---------- טעינה ---------- */
  function load() { return api('/kiosk/state').then(function (j) { K = j; return j; }); }
  function reload() { return load().then(draw).catch(fail); }
  function act(path, body, msg) { return api(path, body).then(function (r) { if (msg) toast(msg); return reload().then(function () { return r; }); }).catch(function (e) { fail(e); throw e; }); }

  SH.views.kiosk = function (v, arg) {
    host = v; sub = arg && SUBS.some(function (x) { return x[0] === arg; }) ? arg : (sub || 'sell');
    if (K) draw(); else v.innerHTML = '<p class="msg">טוען את הקיוסק…</p>';
    load().then(draw).catch(function (e) { v.innerHTML = '<p class="msg sh-err">' + esc(SH.err(e)) + '</p>'; });
  };

  function draw() {
    if (!host || !K) return;
    var h = '<div class="sh-sub" role="tablist">' + SUBS.map(function (x) { return '<button type="button" role="tab" data-ksub="' + x[0] + '" aria-selected="' + (sub === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>';
    h += '<div id="kbody"></div>';
    host.innerHTML = h;
    host.querySelectorAll('[data-ksub]').forEach(function (b) { b.onclick = function () { sub = b.getAttribute('data-ksub'); draw(); }; });
    var body = $('#kbody', host);
    ({ sell: vSell, stock: vStock, ledger: vLedger, coll: vColl, spons: vSpons, ads: vAds, report: vReport })[sub](body);
  }

  function lowBanner() {
    if (!K.low.length) return '';
    return '<div class="sh-warn" role="status"><b>נגמר או עומד להיגמר:</b> ' + K.low.map(function (x) { return esc(x.name) + ' (' + x.stock + ')'; }).join(', ') + '</div>';
  }

  /* ---------- קופה ---------- */
  function vSell(el) {
    var act1 = K.items.filter(function (i) { return i.active; });
    var today = new Date().toISOString().slice(0, 10);
    var td = K.tx.filter(function (t) { return t.date === today && !t.voided && t.kind === 'income' && t.item_name; }).reduce(function (s, t) { return s + t.amount; }, 0);
    var h = lowBanner() + '<section class="sh-card"><h2>קופה</h2><p class="sh-meta">נמכר היום: <b>' + ils(td) + '</b> · לוחצים על מוצר כדי לרשום מכירה. הכסף עצמו נשאר אצל הגזבר – האתר רק רושם.</p>';
    h += '<div class="sh-row"><label>אמצעי תשלום <select id="kmeth"><option value="cash">מזומן</option><option value="bit">ביט</option></select></label>' + (money() ? '<button class="btn btn-sm btn-line" type="button" id="kNewItem">+ מוצר חדש</button>' : '') + '</div>';
    if (!act1.length) h += '<p class="msg">עוד אין מוצרים בקיוסק.' + (money() ? ' אפשר להוסיף את הראשון.' : ' הגזבר או הרכז מוסיפים מוצרים.') + '</p>';
    h += '<div class="sh-grid">' + act1.map(function (i) {
      var out = i.track && i.stock <= 0;
      return '<button type="button" class="btn ' + (out ? 'btn-line' : 'btn-gold') + ' sh-tap" data-sell="' + i.id + '"' + (out ? ' disabled' : '') + '>' + esc(i.name) + '<br><small>' + ils(i.price) + (i.track ? ' · במלאי ' + i.stock : '') + '</small></button>';
    }).join('') + '</div></section>';
    el.innerHTML = h;
    el.querySelectorAll('[data-sell]').forEach(function (b) {
      b.onclick = function () {
        var it = K.items.find(function (x) { return x.id === b.getAttribute('data-sell'); });
        b.disabled = true;
        api('/kiosk/sale', { item_id: it.id, qty: 1, method: $('#kmeth').value }).then(function () { toast('נרשם: ' + it.name + ' ' + ils(it.price)); return reload(); }).catch(function (e) { fail(e); b.disabled = false; });
      };
    });
    var n = $('#kNewItem', el); if (n) n.onclick = function () { editItem(); };
  }
  function editItem(it) {
    form(it ? 'עריכת מוצר' : 'מוצר חדש בקיוסק', [
      { k: 'name', label: 'שם המוצר', value: it ? it.name : '', required: true, max: 40 },
      { k: 'price', label: 'מחיר מכירה בשקלים', value: it ? (it.price / 100) : '', inputmode: 'decimal', required: true },
      { k: 'min', label: 'להתריע כשנשארו עד (יחידות)', value: it ? it.min_stock : 3, inputmode: 'numeric' }
    ], 'שמירה').then(function (r) {
      if (!r) return;
      var p = toAg(r.price); if (!(p >= 0)) return toast('המחיר לא תקין.');
      act('/kiosk/item', { id: it && it.id, name: r.name, price: p, min_stock: +r.min || 0 }, 'נשמר');
    });
  }

  /* ---------- מלאי וקניות ---------- */
  function vStock(el) {
    var h = lowBanner() + '<section class="sh-card"><h2>מה יש במלאי</h2>';
    if (!K.items.length) h += '<p class="msg">עוד אין מוצרים. מוסיפים אותם בלשונית "קופה".</p>';
    h += '<ul class="sh-mlist">' + K.items.map(function (i) {
      return '<li><span><b>' + esc(i.name) + '</b>' + (i.active ? '' : ' (לא פעיל)') + '<br><small>' + (i.track ? 'במלאי ' + i.stock + ' · רף התראה ' + i.min_stock : 'בלי מעקב מלאי') + (i.cost ? ' · עלות אחרונה ' + ils(i.cost) + ' ליחידה · רווח ' + ils(i.price - i.cost) : '') + '</small></span>' +
        (money() ? '<span class="sh-acts"><button class="btn btn-sm btn-gold" type="button" data-buy="' + i.id + '">קניתי</button><button class="btn btn-sm btn-line" type="button" data-edit="' + i.id + '">עריכה</button></span>' : '') + '</li>';
    }).join('') + '</ul></section>';
    h += '<section class="sh-card"><h2>רשימת קניות</h2><ul class="sh-tasks" id="kShop">' + K.shop.map(function (s) {
      return '<li class="sh-task' + (s.done ? ' sh-done' : '') + '"><label class="sh-check"><input type="checkbox" data-shop="' + s.id + '"' + (s.done ? ' checked' : '') + '><span>' + esc(s.name) + (s.qty ? ' – ' + esc(s.qty) : '') + '</span></label><button class="btn btn-sm btn-line" type="button" data-shopdel="' + s.id + '" aria-label="מחיקה">✕</button></li>';
    }).join('') + '</ul>' + (K.shop.length ? '' : '<p class="msg">הרשימה ריקה.</p>') +
      '<div class="sh-row"><button class="btn btn-sm btn-line" type="button" id="kShopAdd">+ להוסיף לרשימה</button><button class="btn btn-sm btn-line" type="button" id="kShopLow">להוסיף את מה שנגמר</button></div></section>';
    el.innerHTML = h;
    el.querySelectorAll('[data-buy]').forEach(function (b) { b.onclick = function () { buy(K.items.find(function (x) { return x.id === b.getAttribute('data-buy'); })); }; });
    el.querySelectorAll('[data-edit]').forEach(function (b) { b.onclick = function () { editItem(K.items.find(function (x) { return x.id === b.getAttribute('data-edit'); })); }; });
    el.querySelectorAll('[data-shop]').forEach(function (b) { b.onchange = function () { act('/kiosk/shop', { action: 'done', id: b.getAttribute('data-shop'), done: b.checked }); }; });
    el.querySelectorAll('[data-shopdel]').forEach(function (b) { b.onclick = function () { act('/kiosk/shop', { action: 'del', id: b.getAttribute('data-shopdel') }); }; });
    $('#kShopAdd', el).onclick = function () { form('מוסיפים לרשימה', [{ k: 'name', label: 'מה צריך לקנות', required: true, max: 40 }, { k: 'qty', label: 'כמה (לא חובה)', max: 20 }], 'הוספה').then(function (r) { if (r) act('/kiosk/shop', { action: 'add', name: r.name, qty: r.qty }); }); };
    $('#kShopLow', el).onclick = function () { api('/kiosk/shop', { action: 'low' }).then(function (r) { toast(r.added ? 'נוספו ' + r.added + ' פריטים' : 'אין חדש להוסיף'); reload(); }).catch(fail); };
  }
  function buy(it) {
    form('קנייה: ' + it.name, [
      { k: 'qty', label: 'כמה יחידות קנית', inputmode: 'numeric', required: true },
      { k: 'total', label: 'כמה שילמת בסך הכול (שקלים)', inputmode: 'decimal', required: true },
      { k: 'method', label: 'איך שולם', value: 'cash', options: [['cash', 'מזומן מהקופה'], ['bit', 'ביט'], ['other', 'אחר']] },
      { k: 'receipt', label: 'קבלה (לא חובה – אפשר לצלם אחרי)', type: 'file' }
    ], 'רישום הקנייה').then(function (r) {
      if (!r) return;
      var a = toAg(r.total), q = Math.round(+r.qty);
      if (!(a > 0) || !(q > 0)) return toast('הכמות או הסכום לא תקינים.');
      api('/kiosk/expense', { item_id: it.id, qty: q, amount: a, method: r.method, category: 'קנייה לקיוסק' }).then(function (x) {
        toast('נרשם. המלאי עודכן'); return reload().then(function () { askReceipt(x.id); });
      }).catch(fail);
    });
  }

  /* ---------- קבלה בצילום ---------- */
  function askReceipt(txId) {
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');
    inp.onchange = function () { if (inp.files && inp.files[0]) shrink(inp.files[0]).then(function (d) { return api('/kiosk/receipt/save', { tx: txId, mime: 'image/jpeg', data: d }); }).then(function () { toast('הקבלה נשמרה'); reload(); }).catch(function (e) { fail(e); }); };
    inp.click();
  }
  function shrink(file) {
    return new Promise(function (res, rej) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, max = 1100, sc = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas');
        c.width = Math.round(w * sc); c.height = Math.round(h * sc);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        var q = 0.65, d;
        do { d = c.toDataURL('image/jpeg', q).split(',')[1]; q -= 0.1; } while (d.length > 360000 && q > 0.2);
        URL.revokeObjectURL(u);
        if (d.length > 360000) rej(new Error('receipt')); else res(d);
      };
      img.onerror = function () { rej(new Error('receipt')); };
      img.src = u;
    });
  }
  function showReceipt(txId) {
    fetch(SH.API + '/kiosk/receipt?tx=' + encodeURIComponent(txId), { headers: { authorization: 'Bearer ' + SH.token() } }).then(function (r) { if (!r.ok) throw new Error('receipt'); return r.blob(); }).then(function (b) {
      var d = $('#dlg'), body = $('#dlgBody'), u = URL.createObjectURL(b);
      body.innerHTML = '<h3>הקבלה</h3><img src="' + u + '" alt="צילום הקבלה" style="width:100%;border-radius:8px"><div class="sh-row"><button class="btn btn-line" value="no" formnovalidate>סגירה</button></div>';
      $('#dlgForm').onsubmit = function (e) { e.preventDefault(); d.close(); URL.revokeObjectURL(u); };
      d.showModal();
    }).catch(function () { toast('הקבלה לא נמצאה.'); });
  }

  /* ---------- ספר חשבונות ---------- */
  function vLedger(el) {
    var h = '<section class="sh-card"><h2>ספר חשבונות</h2><p class="sh-meta">בקופה (מזומן): <b>' + ils(K.cash) + '</b> · רווח כולל: <b>' + ils(K.total.profit) + '</b>. שום דבר לא נמחק – טעות מבטלים עם סיבה, וזה נשאר גלוי.</p>';
    if (money()) h += '<div class="sh-row"><button class="btn btn-sm btn-gold" type="button" id="kExp">+ הוצאה</button><button class="btn btn-sm btn-line" type="button" id="kInc">+ הכנסה אחרת</button><button class="btn btn-sm btn-line" type="button" id="kCount">ספירת קופה</button></div>';
    if (money() && K.counts.length) { var c = K.counts[0]; h += '<p class="sh-meta">ספירה אחרונה: נספרו ' + ils(c.counted) + ', היה אמור להיות ' + ils(c.expected) + ' – ' + (c.diff === 0 ? 'מתאים בדיוק.' : '<span class="sh-late">פער ' + ils(c.diff) + '</span>') + ' (' + esc(c.by_name) + ')</p>'; }
    h += '<ul class="sh-mlist">' + K.tx.map(function (t) {
      var sign = t.kind === 'income' ? '+' : '−';
      return '<li' + (t.voided ? ' class="sh-done"' : '') + '><span><b>' + sign + ils(t.amount) + '</b> ' + esc(t.item_name ? (t.kind === 'income' ? 'מכירת ' : 'קניית ') + t.item_name + (t.qty ? ' ×' + t.qty : '') : t.category) + '<br><small>' + dshort(t.date) + ' · ' + METH[t.method] + ' · ' + esc(t.by_name) + (t.note ? ' · ' + esc(t.note) : '') + (t.voided ? ' · <b>בוטל: ' + esc(t.void_reason) + '</b>' : '') + '</small></span>' +
        (money() && !t.voided ? '<span class="sh-acts">' + (t.kind === 'expense' ? (t.receipt ? '<button class="btn btn-sm btn-line" type="button" data-rec="' + t.id + '">קבלה</button>' : '<button class="btn btn-sm btn-line" type="button" data-addrec="' + t.id + '">+ קבלה</button>') : '') + '<button class="btn btn-sm btn-line sh-danger" type="button" data-void="' + t.id + '">ביטול</button></span>' : (t.receipt ? '<button class="btn btn-sm btn-line" type="button" data-rec="' + t.id + '">קבלה</button>' : '')) + '</li>';
    }).join('') + '</ul>' + (K.tx.length ? '' : '<p class="msg">עוד אין תנועות.</p>') + '</section>';
    el.innerHTML = h;
    el.querySelectorAll('[data-rec]').forEach(function (b) { b.onclick = function () { showReceipt(b.getAttribute('data-rec')); }; });
    el.querySelectorAll('[data-addrec]').forEach(function (b) { b.onclick = function () { askReceipt(b.getAttribute('data-addrec')); }; });
    el.querySelectorAll('[data-void]').forEach(function (b) { b.onclick = function () { SH.ask('לבטל את הרישום?', { text: 'הרישום נשאר בספר עם הסיבה, והמלאי חוזר למה שהיה.', label: 'סיבה', required: true, ok: 'ביטול הרישום' }).then(function (v) { if (v) act('/kiosk/void', { id: b.getAttribute('data-void'), reason: v }, 'בוטל'); }); }; });
    var e1 = $('#kExp', el); if (e1) e1.onclick = function () {
      form('הוצאה חדשה', [
        { k: 'amount', label: 'סכום בשקלים', inputmode: 'decimal', required: true },
        { k: 'category', label: 'על מה', options: K.cats.map(function (c) { return [c, c]; }) },
        { k: 'note', label: 'פירוט קצר', max: 120 },
        { k: 'method', label: 'איך שולם', options: [['cash', 'מזומן מהקופה'], ['bit', 'ביט'], ['other', 'אחר']] }
      ], 'רישום').then(function (r) { if (!r) return; var a = toAg(r.amount); if (!(a > 0)) return toast('הסכום לא תקין.'); api('/kiosk/expense', { amount: a, category: r.category, note: r.note, method: r.method }).then(function (x) { toast('נרשם'); return reload().then(function () { askReceipt(x.id); }); }).catch(fail); });
    };
    var i1 = $('#kInc', el); if (i1) i1.onclick = function () {
      form('הכנסה שאינה ממכירה', [
        { k: 'amount', label: 'סכום בשקלים', inputmode: 'decimal', required: true },
        { k: 'category', label: 'מקור', value: 'תרומה או גבייה', max: 30 },
        { k: 'note', label: 'פירוט קצר', max: 120 },
        { k: 'method', label: 'איך התקבל', options: [['cash', 'מזומן'], ['bit', 'ביט'], ['other', 'אחר']] }
      ], 'רישום').then(function (r) { if (!r) return; var a = toAg(r.amount); if (!(a > 0)) return toast('הסכום לא תקין.'); act('/kiosk/income', { amount: a, category: r.category, note: r.note, method: r.method }, 'נרשם'); });
    };
    var c1 = $('#kCount', el); if (c1) c1.onclick = function () {
      form('ספירת קופה', [{ k: 'counted', label: 'כמה מזומן יש עכשיו בקופה (שקלים)', inputmode: 'decimal', required: true }, { k: 'note', label: 'הערה (לא חובה)', max: 120 }], 'השוואה').then(function (r) {
        if (!r) return; var a = toAg(r.counted); if (!(a >= 0)) return toast('הסכום לא תקין.');
        api('/kiosk/count', { counted: a, note: r.note }).then(function (x) { toast(x.diff === 0 ? 'מתאים בדיוק' : 'פער של ' + ils(x.diff) + ' (היה אמור להיות ' + ils(x.expected) + ')'); reload(); }).catch(fail);
      });
    };
  }

  /* ---------- גבייה שכבתית ---------- */
  function vColl(el) {
    var h = '<section class="sh-card"><h2>גבייה שכבתית</h2><p class="sh-meta">הכסף לא עובר דרך האתר. פותחים קבוצה בביט או בפייבוקס, שמים כאן את הקישור, והגזבר מסמן מי שילם.</p>';
    if (money()) h += '<div class="sh-row"><button class="btn btn-sm btn-gold" type="button" id="kCollNew">+ גבייה חדשה</button></div>';
    if (!K.coll.length) h += '<p class="msg">עוד אין גבייה פתוחה.</p>';
    K.coll.forEach(function (c) {
      var n = K.members.length, p = c.paid.length, pct = n ? Math.round(100 * p / n) : 0;
      h += '<div class="sh-prod"><h3>' + esc(c.title) + '</h3><p class="sh-meta">' + (c.per_head ? ils(c.per_head) + ' לתלמיד · ' : '') + 'שילמו ' + p + ' מתוך ' + n + (c.due ? ' · עד ' + dshort(c.due) : '') + '</p><div class="sh-prog"><span style="width:' + pct + '%"></span></div>';
      h += '<div class="sh-acts">' + (c.link ? '<a class="btn btn-sm btn-gold" href="' + esc(c.link) + '" target="_blank" rel="noopener">לתשלום</a>' : '') +
        '<a class="btn btn-sm btn-line" target="_blank" rel="noopener" href="' + esc(SH.wa('תזכורת: ' + c.title + (c.per_head ? ' – ' + ils(c.per_head) : '') + (c.link ? '\n' + c.link : ''))) + '">שליחה בווטסאפ</a>' +
        (money() ? '<button class="btn btn-sm btn-line" type="button" data-cedit="' + c.id + '">עריכה</button><button class="btn btn-sm btn-line sh-danger" type="button" data-cdel="' + c.id + '">מחיקה</button>' : '') + '</div>';
      h += '<div class="sh-chips" style="margin-top:.5rem">' + K.members.map(function (m) { var paid = c.paid.indexOf(m.id) >= 0; return '<button type="button" ' + (money() ? 'data-paid="' + c.id + '|' + m.id + '"' : 'disabled') + ' aria-pressed="' + paid + '">' + esc(m.name) + '</button>'; }).join('') + '</div></div>';
    });
    el.innerHTML = h + '</section>';
    var nw = $('#kCollNew', el); if (nw) nw.onclick = function () { editColl(); };
    el.querySelectorAll('[data-cedit]').forEach(function (b) { b.onclick = function () { editColl(K.coll.find(function (x) { return x.id === b.getAttribute('data-cedit'); })); }; });
    el.querySelectorAll('[data-cdel]').forEach(function (b) { b.onclick = function () { SH.ask('למחוק את הגבייה?', { input: false, ok: 'מחיקה' }).then(function (v) { if (v) act('/kiosk/coll', { action: 'delete', id: b.getAttribute('data-cdel') }, 'נמחק'); }); }; });
    el.querySelectorAll('[data-paid]').forEach(function (b) { b.onclick = function () { var x = b.getAttribute('data-paid').split('|'); act('/kiosk/paid', { coll_id: x[0], member_id: x[1], paid: b.getAttribute('aria-pressed') !== 'true' }); }; });
  }
  function editColl(c) {
    form(c ? 'עריכת גבייה' : 'גבייה חדשה', [
      { k: 'title', label: 'על מה הגבייה', value: c ? c.title : '', required: true, max: 60 },
      { k: 'per', label: 'כמה לתלמיד (שקלים)', value: c ? c.per_head / 100 : '', inputmode: 'decimal' },
      { k: 'link', label: 'קישור לקבוצה בביט או בפייבוקס (https://…)', value: c ? c.link : '', dir: 'ltr', max: 300 },
      { k: 'due', label: 'עד תאריך (לא חובה)', value: c ? c.due : '', type: 'date' }
    ], 'שמירה').then(function (r) { if (!r) return; var per = r.per ? toAg(r.per) : 0; if (!(per >= 0)) return toast('הסכום לא תקין.'); act('/kiosk/coll', { id: c && c.id, title: r.title, per_head: per, link: r.link, due: r.due }, 'נשמר'); });
  }

  /* ---------- ספונסרים ---------- */
  function vSpons(el) {
    var cnt = {}; K.sponsors.forEach(function (s) { cnt[s.status] = (cnt[s.status] || 0) + 1; });
    var h = '<section class="sh-card"><h2>ספונסרים</h2><p class="sh-meta">עד 20 עסקים. לכל עסק מכתב אישי וחבילת תודה. <b>האתר לא שולח כלום בעצמו</b> – כפתור פותח את המייל או הווטסאפ שלך עם הטקסט מוכן, ואתה שולח.</p>' +
      '<p class="sh-meta">' + Object.keys(ST).map(function (k) { return ST[k] + ': ' + (cnt[k] || 0); }).join(' · ') + ' · סה"כ ' + K.sponsors.length + '/20</p>' +
      '<div class="sh-row"><button class="btn btn-sm btn-gold" type="button" id="kSpNew"' + (K.sponsors.length >= 20 ? ' disabled' : '') + '>+ עסק חדש</button></div>';
    h += '<ul class="sh-mlist">' + K.sponsors.map(function (s) {
      return '<li><span><b>' + esc(s.business) + '</b> <span class="sh-state">' + ST[s.status] + '</span><br><small>' + esc(s.package || 'בלי חבילה') + (s.contact ? ' · ' + esc(s.contact) : '') + (s.note ? ' · ' + esc(s.note) : '') + '</small></span>' +
        '<span class="sh-acts"><button class="btn btn-sm btn-gold" type="button" data-letter="' + s.id + '">מכתב ומודעה</button><button class="btn btn-sm btn-line" type="button" data-spedit="' + s.id + '">עריכה</button></span></li>';
    }).join('') + '</ul>' + (K.sponsors.length ? '' : '<p class="msg">עוד לא נרשם אף עסק. כדאי להתחיל מהעסקים שהמשפחות מכירות.</p>') + '</section>';
    el.innerHTML = h;
    $('#kSpNew', el).onclick = function () { editSpons(); };
    el.querySelectorAll('[data-spedit]').forEach(function (b) { b.onclick = function () { editSpons(K.sponsors.find(function (x) { return x.id === b.getAttribute('data-spedit'); })); }; });
    el.querySelectorAll('[data-letter]').forEach(function (b) { b.onclick = function () { letter(K.sponsors.find(function (x) { return x.id === b.getAttribute('data-letter'); })); }; });
  }
  function editSpons(s) {
    form(s ? 'עריכת עסק' : 'עסק חדש', [
      { k: 'business', label: 'שם העסק', value: s ? s.business : '', required: true, max: 60 },
      { k: 'contact', label: 'איש קשר או מייל (לא חובה)', value: s ? s.contact : '', max: 80 },
      { k: 'package', label: 'מה השכבה נותנת בתמורה', value: s ? s.package : PACK[0], options: PACK.map(function (p) { return [p, p]; }) },
      { k: 'status', label: 'איפה זה עומד', value: s ? s.status : 'new', options: Object.keys(ST).map(function (k) { return [k, ST[k]]; }) },
      { k: 'note', label: 'הערה', value: s ? s.note : '', max: 200 }
    ], 'שמירה').then(function (r) {
      if (!r) return;
      if (r.contact && /@/.test(r.contact) === false && /^[\d\s+\-()]{7,}$/.test(r.contact) === false && r.contact.length > 40) return toast('איש הקשר ארוך מדי.');
      act('/kiosk/sponsor', { id: s && s.id, business: r.business, contact: r.contact, package: r.package, status: r.status, note: r.note }, 'נשמר');
    });
  }
  function letter(s) {
    var d = $('#dlg'), body = $('#dlgBody');
    body.innerHTML = '<h3>מכתב ל' + esc(s.business) + '</h3><p class="msg" id="kLetWait">הגבאי כותב…</p><div id="kLet" hidden></div>';
    $('#dlgForm').onsubmit = function (e) { e.preventDefault(); d.close(); };
    d.showModal();
    api('/ai', { task: 'sponsor_letter', business: s.business, package: s.package, sender: (SH.state().me.name || '').split(' ')[0], when: 'פורים' }).then(function (r) {
      $('#kLetWait').hidden = true; var w = $('#kLet'); w.hidden = false;
      w.innerHTML = '<label class="field">נושא<input id="kLs" value="' + esc(r.subject) + '"></label><label class="field">המכתב (אפשר לערוך)<textarea id="kLt" rows="8">' + esc(r.letter) + '</textarea></label>' + SH.lightHtml(r.light, r.why) +
        '<p class="sh-meta">שורת תודה לחוברת ולמסך: <b>' + esc(r.thanks) + '</b></p><p class="sh-warn">קוראים ומתקנים לפני שליחה. האתר לא שולח כלום – הכפתורים פותחים לך את המייל או הווטסאפ.</p>' +
        '<div class="sh-row"><button class="btn btn-gold" type="button" id="kMail">לפתוח במייל</button><button class="btn btn-line" type="button" id="kWa">לפתוח בווטסאפ</button><button class="btn btn-line" type="button" id="kCopy">העתקה</button><button class="btn btn-line" value="no" formnovalidate>סגירה</button></div>';
      var txt = function () { return $('#kLt').value; };
      $('#kMail').onclick = function () { var to = /@/.test(s.contact) ? s.contact.trim() : ''; location.href = 'mailto:' + encodeURIComponent(to).replace('%40', '@') + '?subject=' + encodeURIComponent($('#kLs').value) + '&body=' + encodeURIComponent(txt()); mark(s, 'sent'); };
      $('#kWa').onclick = function () { window.open(SH.wa(txt()), '_blank', 'noopener'); mark(s, 'sent'); };
      $('#kCopy').onclick = function () { try { navigator.clipboard.writeText(txt()); toast('הועתק'); } catch (e) { toast('ההעתקה לא עבדה'); } };
      if (s.status === 'new') mark(s, 'letter', true);
    }).catch(function (e) { $('#kLetWait').textContent = SH.err(e); });
  }
  function mark(s, status, quiet) { if (['yes', 'no', 'talked'].indexOf(s.status) >= 0) return; api('/kiosk/sponsor', { id: s.id, business: s.business, contact: s.contact, package: s.package, status: status, note: s.note }).then(function () { if (!quiet) toast('הסטטוס עודכן: ' + ST[status]); return load(); }); }

  /* ---------- מודעות ---------- */
  var PAL = [['ירוק וזהב', ['#16322d', '#0e1f1c', '#d8b35f', '#f6efe0']], ['כחול וכתום', ['#14305a', '#0a1a33', '#ff9a3c', '#ffffff']], ['שחור וצהוב', ['#1a1a1a', '#000000', '#ffd23f', '#ffffff']]];
  var ad = { headline: '', lines: '', cta: '', footer: '', pal: 0, weekly: '' };
  function vAds(el) {
    el.innerHTML = '<section class="sh-card"><h2>מודעות ושיווק</h2><p class="sh-meta">הגבאי מנסח, אתה מעצב ומוריד תמונה, וההודעה השבועית נשלחת על ידך בלחיצה לקבוצת בית הספר. כלום לא נשלח אוטומטית.</p>' +
      '<label class="field">על מה המודעה<input id="adAbout" maxlength="200" value="הקיוסק של י&quot;ב – חטיפים ושתייה קרה"></label>' +
      '<label class="field">הצעה או מבצע (לא חובה)<input id="adOffer" maxlength="200" placeholder="למשל: 1+1 בהפסקה השנייה"></label>' +
      '<label class="field">מתי ואיפה<input id="adWhen" maxlength="120" placeholder="למשל: כל יום בהפסקה, ליד חדר האוכל"></label>' +
      '<label class="field">סגנון<select id="adTone"><option value="funny">מצחיק וקליל</option><option value="warm">חם ומזמין</option><option value="short">קצר וקולע</option></select></label>' +
      '<div class="sh-row"><button class="btn btn-gold" type="button" id="adGo">הגבאי מנסח</button></div><p class="msg" id="adMsg" hidden></p></section>' +
      '<section class="sh-card" id="adEd"><h2>המעצב</h2><div class="sh-row"><label>צבעים <select id="adPal">' + PAL.map(function (p, i) { return '<option value="' + i + '"' + (i === ad.pal ? ' selected' : '') + '>' + p[0] + '</option>'; }).join('') + '</select></label></div>' +
      '<label class="field">כותרת<input id="adH" maxlength="60" value="' + esc(ad.headline) + '"></label><label class="field">שורות (כל שורה בנפרד)<textarea id="adL" rows="3">' + esc(ad.lines) + '</textarea></label>' +
      '<label class="field">קריאה לפעולה<input id="adC" maxlength="60" value="' + esc(ad.cta) + '"></label><label class="field">שורה תחתונה<input id="adF" maxlength="60" value="' + esc(ad.footer || ('הקיוסק של ' + (SH.state().grade.name || 'השכבה'))) + '"></label>' +
      '<div class="sh-stage"><canvas id="adCv" width="1080" height="1350"></canvas></div><div class="sh-row"><button class="btn btn-gold" type="button" id="adPng">הורדת תמונה</button><button class="btn btn-line" type="button" id="adPrint">הדפסה או PDF</button></div></section>' +
      '<section class="sh-card"><h2>ההודעה השבועית לקבוצה</h2><label class="field">אפשר לערוך<textarea id="adW" rows="5" maxlength="600">' + esc(ad.weekly) + '</textarea></label><div class="sh-row"><button class="btn btn-gold" type="button" id="adWa">שליחה בווטסאפ</button><button class="btn btn-line" type="button" id="adCopy">העתקה</button></div><p class="sh-meta" id="adLight"></p></section>';
    ['adPal', 'adH', 'adL', 'adC', 'adF'].forEach(function (id) { $('#' + id).oninput = $('#' + id).onchange = paint; });
    $('#adGo').onclick = function () {
      var b = this, m = $('#adMsg'); b.disabled = true; m.hidden = false; m.textContent = 'הגבאי כותב…';
      api('/ai', { task: 'ad', about: $('#adAbout').value, offer: $('#adOffer').value, when: $('#adWhen').value, tone: $('#adTone').value }).then(function (r) {
        $('#adH').value = r.headline; $('#adL').value = r.lines.join('\n'); $('#adC').value = r.cta; $('#adW').value = r.weekly; m.innerHTML = SH.lightHtml(r.light, r.why); $('#adLight').innerHTML = SH.lightHtml(r.light, r.why); paint(); b.disabled = false;
      }).catch(function (e) { m.textContent = SH.err(e); b.disabled = false; });
    };
    $('#adPng').onclick = function () { var a = document.createElement('a'); a.download = 'מודעה.png'; a.href = $('#adCv').toDataURL('image/png'); a.click(); };
    $('#adPrint').onclick = function () { var w = window.open('', '_blank'); if (!w) return toast('החלון נחסם. צריך לאפשר חלונות קופצים.'); w.document.write('<html dir="rtl"><body style="margin:0"><img src="' + $('#adCv').toDataURL('image/png') + '" style="width:100%"></body></html>'); w.document.close(); w.onload = function () { w.print(); }; };
    $('#adWa').onclick = function () { window.open(SH.wa($('#adW').value), '_blank', 'noopener'); };
    $('#adCopy').onclick = function () { try { navigator.clipboard.writeText($('#adW').value); toast('הועתק'); } catch (e) { toast('ההעתקה לא עבדה'); } };
    paint();
  }
  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function paint() {
    var cv = $('#adCv'); if (!cv) return; var ctx = cv.getContext('2d'), P = PAL[+$('#adPal').value || 0][1], W = 1080, H = 1350;
    ad.pal = +$('#adPal').value || 0;
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, P[0]); g.addColorStop(1, P[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = P[2]; ctx.lineWidth = 8; ctx.strokeRect(40, 40, W - 80, H - 80);
    ctx.direction = 'rtl'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var y = 240; ctx.fillStyle = P[2]; ctx.font = '800 112px Heebo, Arial, sans-serif';
    wrap(ctx, $('#adH').value || 'הכותרת כאן', W - 200).forEach(function (l) { ctx.fillText(l, W / 2, y); y += 128; });
    y += 40; ctx.fillStyle = P[3]; ctx.font = '500 62px Heebo, Arial, sans-serif';
    $('#adL').value.split('\n').filter(Boolean).forEach(function (ln) { wrap(ctx, ln, W - 220).forEach(function (l) { ctx.fillText(l, W / 2, y); y += 84; }); y += 14; });
    var c = $('#adC').value;
    if (c) { ctx.font = '800 64px Heebo, Arial, sans-serif'; var bw = Math.min(W - 160, ctx.measureText(c).width + 120), by = Math.max(y + 40, 1000); ctx.fillStyle = P[2]; roundRect(ctx, (W - bw) / 2, by, bw, 120, 60); ctx.fill(); ctx.fillStyle = P[1]; ctx.fillText(c, W / 2, by + 82); }
    ctx.fillStyle = P[3]; ctx.globalAlpha = 0.8; ctx.font = '500 46px Heebo, Arial, sans-serif'; ctx.fillText($('#adF').value, W / 2, H - 90); ctx.globalAlpha = 1;
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  /* ---------- דוח ---------- */
  var MO = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  function vReport(el) {
    var h = lowBanner() + '<section class="sh-card"><h2>דוח הקיוסק</h2><p class="sh-meta">סך הכול: הכנסות <b>' + ils(K.total.inc) + '</b> · הוצאות <b>' + ils(K.total.exp) + '</b> · רווח <b>' + ils(K.total.profit) + '</b> · בקופה (מזומן) <b>' + ils(K.cash) + '</b></p>';
    h += '<table class="sh-table" style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:start">חודש</th><th>הכנסות</th><th>הוצאות</th><th>רווח</th></tr></thead><tbody>' + K.months.map(function (m) { var p = m.mo.split('-'); return '<tr><td>' + MO[+p[1]] + ' ' + p[0] + '</td><td>' + ils(m.inc) + '</td><td>' + ils(m.exp) + '</td><td><b>' + ils(m.inc - m.exp) + '</b></td></tr>'; }).join('') + '</tbody></table>' + (K.months.length ? '' : '<p class="msg">עוד אין נתונים לדוח.</p>');
    if (K.top.length) h += '<h3 style="margin-top:1rem">הנמכרים ביותר</h3><ol>' + K.top.map(function (t) { return '<li>' + esc(t.n) + ' – ' + t.q + ' יחידות (' + ils(t.a) + ')</li>'; }).join('') + '</ol>';
    var sum = 'סיכום הקיוסק: הכנסות ' + ils(K.total.inc) + ', הוצאות ' + ils(K.total.exp) + ', רווח ' + ils(K.total.profit) + '.';
    h += '<div class="sh-row"><button class="btn btn-gold" type="button" onclick="window.print()">הדפסה או PDF</button><a class="btn btn-line" target="_blank" rel="noopener" href="' + esc(SH.wa(sum)) + '">שליחה בווטסאפ</a></div></section>';
    el.innerHTML = h;
  }
})();
