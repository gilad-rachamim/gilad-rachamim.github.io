// הצעת מחיר ללקוח של רואה חשבון (/kelim/cheshbon/hatzaa/ + הבונה בחדר של רואה החשבון).
// ההצעה מגיעה ללקוח בקישור: עם קוד המשרד בגוגל (גרסה 5) היא נשמרת בגיליון של המשרד, והאישור נרשם שם ונשלח במייל.
// בלי חיבור – כל ההצעה בתוך הקישור עצמו (אחרי #, לא נשלח לשום שרת), והאישור נשלח בווטסאפ למשרד.
(function () {
  'use strict';
  var CH = window.CH; if (!CH) return;
  var $ = CH.$, esc = CH.esc;
  var HZ = window.HZ = {};
  var VAT = 0.18;
  var U = { m: 'לחודש', y: 'לשנה', '1': 'חד-פעמי', h: 'לשעה' };
  var COLORS = ['#c9a24d', '#5fbfa6', '#7aa7e0', '#e08a72', '#b48ad6', '#e0c35a'];

  HZ.nis = function (n) { return Math.round(n).toLocaleString('he-IL') + ' ₪'; };
  function lines(s) { return String(s || '').replace(/\r/g, '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }
  function dPlus(iso, days) { var d = CH.date(iso) || new Date(); d.setDate(d.getDate() + (+days || 0)); return d; }
  function phoneWa(p) { p = String(p || '').replace(/\D/g, ''); if (/^0\d{8,9}$/.test(p)) p = '972' + p.slice(1); return /^\d{10,15}$/.test(p) ? p : ''; }
  function initials(o) { var w = String(o || '').replace(/["'״׳]/g, '').split(/[\s·\-–,]+/).filter(Boolean); return (w[0] ? w[0][0] : '') + (w[1] ? '·' + w[1][0] : ''); }

  // ---- סכומים ----
  HZ.totals = function (q) {
    var m = 0, y = 0, one = 0, h = 0;
    (q.it || []).forEach(function (i) { var p = +i.p || 0; if (i.u === 'm') m += p; else if (i.u === 'y') y += p; else if (i.u === '1') one += p; else if (i.u === 'h' && p) h++; });
    return { m: m, year: m * 12 + y, y: y, one: one, h: h };
  };
  HZ.summary = function (q) {
    var t = HZ.totals(q), s = [];
    if (t.m) s.push(HZ.nis(t.m) + ' לחודש (' + HZ.nis(t.year) + ' לשנה)');
    else if (t.year) s.push(HZ.nis(t.year) + ' לשנה');
    if (t.one) s.push((s.length ? 'ועוד ' : '') + HZ.nis(t.one) + ' חד-פעמי');
    return s.join(', ') + (s.length && q.vat === 'plus' ? ' + מע"מ' : '');
  };

  // ---- ההצעה עצמה: אותו עיצוב בתצוגה המקדימה, בדף הלקוח וב-PDF ----
  HZ.render = function (q, brand) {
    brand = brand || {};
    var color = COLORS.indexOf(brand.color || q.c) >= 0 ? (brand.color || q.c) : COLORS[0];
    var t = HZ.totals(q), office = q.o || 'המשרד';
    var logo = brand.logo ? '<img class="hz-logo" src="' + esc(brand.logo) + '" alt="' + esc(office) + '">' : '<span class="hz-mono" aria-hidden="true">' + esc(initials(office)) + '</span>';
    var contact = [q.ph ? '<span dir="ltr">' + esc(q.ph) + '</span>' : '', q.em ? '<span dir="ltr">' + esc(q.em) + '</span>' : ''].filter(Boolean).join(' · ');
    var dt = CH.date(q.dt) || new Date();
    var s = '<article class="hz-doc" style="--hz:' + color + '">';
    s += '<header class="hz-top"><div class="hz-brand">' + logo + '<div class="hz-o">' + (brand.logo ? '' : '<b>' + esc(office) + '</b>') + (contact ? '<span>' + contact + '</span>' : '') + '</div></div>' +
      '<div class="hz-meta"><h2>הצעת מחיר</h2>' + (q.no ? '<span>מספר ' + esc(q.no) + '</span>' : '') + '<span>' + CH.heDate(dt) + (q.vd ? ' · בתוקף עד ' + CH.heDate(dPlus(q.dt, q.vd)) : '') + '</span></div></header>';
    if (q.cl) s += '<p class="hz-to">לכבוד: <b>' + esc(q.cl) + '</b></p>';
    if (q.intro) s += '<p class="hz-intro">' + esc(q.intro).replace(/\n/g, '<br>') + '</p>';
    s += '<h3 class="hz-h">מה מקבלים</h3><ul class="hz-items">' + (q.it || []).map(function (i) {
      var p = +i.p || 0, price = p ? HZ.nis(p) + ' <small>' + (U[i.u] || '') + '</small>' : '<span class="hz-inc">כלול</span>';
      var d = lines(i.d);
      return '<li><div class="hz-ih"><b>' + esc(i.n) + '</b><span class="hz-p">' + price + '</span></div>' + (d.length ? '<ul class="hz-d">' + d.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + '</li>';
    }).join('') + '</ul>';
    if (q.portal) {
      s += '<section class="hz-portal"><h3>פורטל מסמכים אישי, כלול בליווי</h3><p class="hz-pl">במקום לחפש קבלות בסוף השנה ולשלוח צילומים בווטסאפ, מקבלים מהמשרד קישור אישי שעובד מהטלפון:</p><ul>' +
        '<li><b>מצלמים ושולחים ברגע שהמסמך מגיע.</b> קבלה, טופס 106, אישור שנתי או חשבונית נכנסים ישר לתיק שלך במשרד.</li>' +
        '<li><b>לא מאבדים כלום.</b> כל מסמך נשמר בתיק מסודר לפי שנה וסוג, ורואים בכל רגע מה כבר נשלח ומה עוד חסר.</li>' +
        '<li><b>הכול מוגש בזמן.</b> המשרד עוקב אחרי התיק שלך ושולח תזכורת כשחסר משהו, כדי שכל דיווח יוגש במועד.</li>' +
        '<li><b>בלי אפליקציה ובלי סיסמה.</b> בלי להגיע למשרד ובלי לרדוף אחרי ניירת.</li></ul></section>';
    }
    s += '<div class="hz-total">';
    if (t.m) s += '<div class="hz-big">' + HZ.nis(t.m) + ' <small>לחודש</small></div><div class="hz-sub">סך הכול ' + HZ.nis(t.year) + ' לשנה</div>';
    else if (t.year) s += '<div class="hz-big">' + HZ.nis(t.year) + ' <small>לשנה</small></div>';
    if (t.one) s += '<div class="hz-sub">' + (t.year ? 'ובנוסף, ' : '') + 'חד-פעמי: ' + HZ.nis(t.one) + '</div>';
    if (!t.m && !t.year && !t.one) s += '<div class="hz-sub">המחיר לפי שעות העבודה, כמפורט למעלה</div>';
    if (q.vat === 'inc') s += '<div class="hz-vat">המחירים כוללים מע"מ</div>';
    else if (q.vat === 'plus') s += '<div class="hz-vat">המחירים לפני מע"מ (' + Math.round(VAT * 100) + '%)' + (t.m ? '. לחודש כולל מע"מ: ' + HZ.nis(t.m * (1 + VAT)) : t.year ? '. לשנה כולל מע"מ: ' + HZ.nis(t.year * (1 + VAT)) : '') + '</div>';
    s += '</div>';
    var tr = lines(q.terms);
    if (tr.length) s += '<h3 class="hz-h">תנאים</h3><ul class="hz-terms">' + tr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    s += '<footer class="hz-sign"><div>בברכה,<br><b>' + esc(q.sig || office) + '</b></div><div class="hz-ok-line" id="hz-ok-line"><span>אישור הלקוח</span><i></i><span>תאריך</span><i></i></div></footer>';
    return s + '</article>';
  };

  // ---- קידוד ההצעה לקישור (UTF-8 → base64url) ----
  HZ.pack = function (q) {
    var b = new TextEncoder().encode(JSON.stringify(q)), s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  HZ.unpack = function (s) {
    try {
      s = String(s).replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
      var r = atob(s), b = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) b[i] = r.charCodeAt(i);
      var q = JSON.parse(new TextDecoder().decode(b)); return q && q.it ? q : null;
    } catch (e) { return null; }
  };
  HZ.PAGE = 'https://hakelim.com/kelim/cheshbon/hatzaa/';

  // ---- דוגמה כללית (#demo) ----
  HZ.DEMO = {
    v: 1, no: '2026-001', dt: CH.iso(new Date()), vd: 30, o: 'משרד לדוגמה · ייעוץ מס', sig: 'משרד לדוגמה · ייעוץ מס', ph: '', em: '', c: '#c9a24d', cl: 'ישראל ישראלי', vat: 'inc', portal: 1,
    intro: 'שמחים להציע לך ליווי מקצועי ושקט לאורך כל השנה. כאן מפורט בדיוק מה כלול, וכמה זה עולה.',
    it: [
      { n: 'ליווי שוטף לאורך כל השנה', p: 150, u: 'm', d: 'הנהלת חשבונות שוטפת\nדיווחי מע"מ ומקדמות מס הכנסה\nדיווחים לביטוח לאומי\nמענה לכל שאלה לאורך השנה, בטלפון ובווטסאפ' },
      { n: 'דוח שנתי למס הכנסה', p: 0, u: 'y', d: 'הכנה והגשה של הדוח השנתי\nבדיקה של כל הזיכויים והניכויים שמגיעים לך' }
    ],
    terms: 'התשלום בתחילת כל חודש, בהעברה בנקאית או בהוראת קבע\nההתקשרות לשנה, ואפשר לסיים בהודעה של 30 יום מראש\nלא כלול: ייצוג בביקורת או בדיון, דוחות לשנים קודמות ושכר עובדים. אלה בתיאום מראש'
  };

  // =================== דף הלקוח ===================
  var page = $('hz-page');
  if (page) (function () {
    var h = window.__hzH || location.hash || '';
    try { if (h) sessionStorage.setItem('hz-h', h); else h = sessionStorage.getItem('hz-h') || ''; } catch (e) {}
    var p = new URLSearchParams(h.replace(/^#/, '')), T = window.TIK;
    var q = null, brand = {}, conn = null;
    var box = $('hz-view'), msg = $('hz-msg');

    function draw(approved, by) {
      box.innerHTML = HZ.render(q, brand); $('hz-act').hidden = false;
      var ph = phoneWa(q.ph);
      $('hz-ask').hidden = !ph;
      if (ph) $('hz-ask').href = 'https://wa.me/' + ph + '?text=' + encodeURIComponent('שלום, יש לי שאלה על הצעת המחיר' + (q.no ? ' מספר ' + q.no : '') + ':\n');
      if (approved) done(approved, by);
      if (p.get('p') === '1') setTimeout(function () { window.print(); }, 400);
    }
    function done(at, by) {
      $('hz-form').hidden = true;
      var d = CH.date(String(at).slice(0, 10)) || new Date();
      $('hz-done').hidden = false;
      $('hz-done').innerHTML = '✓ ההצעה אושרה' + (by ? ' על ידי <b>' + esc(by) + '</b>' : '') + ' ב-' + CH.heDate(d) + '. ' + (conn ? 'האישור נרשם במשרד.' : '');
      var ol = $('hz-ok-line'); if (ol) ol.innerHTML = '<span>אושר על ידי ' + esc(by || '') + ', ' + CH.heDate(d) + '</span>';
    }

    if (p.get('d')) q = HZ.unpack(p.get('d'));
    else if (/^#?demo/.test(h)) q = JSON.parse(JSON.stringify(HZ.DEMO));
    if (q) { draw(); CH.used('cheshbon_hatzaa', 'view'); }
    else if (T && p.get('u') && p.get('q') && T.okUrl(p.get('u'))) {
      conn = { u: p.get('u'), q: p.get('q') };
      msg.textContent = 'טוען את ההצעה…';
      T.call(conn.u, { a: 'qGet', q: conn.q }).then(function (r) {
        if (!r.ok) { msg.textContent = r.err === 'quote' ? 'ההצעה לא נמצאה. בקשו מהמשרד קישור חדש.' : T.err(r.err); return; }
        q = JSON.parse(r.data); brand = r.brand || {}; msg.textContent = ''; draw(r.approved, r.by); CH.used('cheshbon_hatzaa', 'view');
      }).catch(function () { msg.textContent = 'אין חיבור למשרד כרגע. נסו שוב בעוד דקה.'; });
    } else { msg.textContent = 'כאן נפתחת הצעת מחיר שקיבלתם מרואה החשבון. הקישור שקיבלתם לא שלם: פתחו אותו שוב מההודעה.'; $('hz-empty').hidden = false; }

    $('hz-print').addEventListener('click', function () { CH.used('cheshbon_hatzaa', 'print'); window.print(); });
    $('hz-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var name = $('hz-name').value.trim(), m = $('hz-fmsg');
      if (!name) { m.textContent = 'כתבו את השם המלא שלכם, כדי שהמשרד יידע מי אישר.'; $('hz-name').focus(); return; }
      var text = 'שלום, אני ' + name + ' ומאשר/ת את הצעת המחיר' + (q.no ? ' מספר ' + q.no : '') + (q.cl && q.cl !== name ? ' (' + q.cl + ')' : '') + ': ' + HZ.summary(q) + '.';
      if (conn) {
        m.textContent = 'שולח את האישור…';
        T.call(conn.u, { a: 'qOk', q: conn.q, name: name }).then(function (r) {
          if (!r.ok) { m.textContent = T.err(r.err); return; }
          m.textContent = ''; done(r.approved, r.by); CH.used('cheshbon_hatzaa', 'approve');
        }).catch(function () { m.textContent = 'האישור לא נשלח. נסו שוב בעוד דקה.'; });
        return;
      }
      if (/^#?demo/.test(h)) { done(new Date().toISOString(), name); m.textContent = 'זו דוגמה, אז שום דבר לא נשלח.'; return; }
      var ph = phoneWa(q.ph); CH.used('cheshbon_hatzaa', 'approve_wa');
      done(new Date().toISOString(), name);
      if (ph) location.href = 'https://wa.me/' + ph + '?text=' + encodeURIComponent(text);
      else { CH.copy(text, m); m.textContent = 'האישור הועתק. שלחו אותו למשרד בהודעה.'; }
    });
  })();

  // =================== הבונה, בחדר של רואה החשבון ===================
  var bld = $('hz-build');
  if (!bld) return;
  var SKEY = 'hatzaa-set';
  var CAT = [
    { k: 'livui', n: 'ליווי שוטף לעוסק מורשה', u: 'm', d: 'הנהלת חשבונות שוטפת\nדיווחי מע"מ ומקדמות מס הכנסה\nדיווחים לביטוח לאומי\nמענה לשאלות לאורך השנה' },
    { k: 'patur', n: 'ליווי שוטף לעוסק פטור', u: 'm', d: 'מקדמות מס הכנסה וביטוח לאומי\nהצהרת מחזור שנתית למע"מ\nמענה לשאלות לאורך השנה' },
    { k: 'doch', n: 'דוח שנתי למס הכנסה (עוסק)', u: 'y', d: 'הכנה והגשה של הדוח השנתי\nדוח רווח והפסד\nבדיקה של כל הזיכויים והניכויים' },
    { k: 'sachir', n: 'דוח שנתי או החזר מס לשכיר', u: 'y', d: 'בדיקת זכאות להחזר מס\nהכנה והגשה של הדוח\nמעקב עד שההחזר מגיע' },
    { k: 'hon', n: 'הצהרת הון', u: '1', d: 'הכנת הצהרת ההון והגשתה\nליווי מול פקיד השומה' },
    { k: 'ptiha', n: 'פתיחת תיק עוסק', u: '1', d: 'רישום במע"מ, במס הכנסה ובביטוח לאומי\nהדרכה קצרה להוצאת חשבוניות' },
    { k: 'sachar', n: 'תלושי שכר לעובדים', u: 'm', d: 'הפקת תלוש חודשי\nדיווח 102 לביטוח לאומי ולמס הכנסה\nטופס 106 בסוף השנה' },
    { k: 'sgira', n: 'סגירת תיק', u: '1', d: 'סגירת התיק במע"מ, במס הכנסה ובביטוח לאומי\nדוח סגירה' },
    { k: 'shaa', n: 'ייעוץ או ייצוג מול הרשויות', u: 'h', d: 'פגישה, שיחה או ייצוג מול פקיד השומה' }
  ];
  var DEF = { o: '', sig: '', ph: '', em: '', c: '', vat: 'inc', vd: 30, n: 0, intro: HZ.DEMO.intro, terms: HZ.DEMO.terms, portal: 1, cat: CAT.map(function (c) { return { k: c.k, n: c.n, u: c.u, d: c.d, p: '', on: 0 }; }) };
  var st = CH.load(SKEY, null) || JSON.parse(JSON.stringify(DEF));
  var room = CH.load('tik-cheder', null), ver = 0, brand = {}, last = { h: '', link: '' };
  if (!st.o && room && room.office) st.o = room.office;
  if (!st.sig) st.sig = st.o;

  function isPartner() { try { return /^\d{3}-?\d{5}$/.test((localStorage.getItem('kelim-partner') || '').replace(/\s/g, '')); } catch (e) { return false; } }
  function save() { CH.save(SKEY, st); }
  function no() { return new Date().getFullYear() + '-' + ('00' + ((st.n || 0) + 1)).slice(-3); }
  function quote() {
    return { v: 1, no: $('hz-no').value.trim() || no(), dt: CH.iso(new Date()), vd: +st.vd || 0, o: st.o, sig: st.sig, ph: st.ph, em: st.em, c: brand.color || st.c || '', cl: $('hz-cl').value.trim(), vat: st.vat, portal: st.portal ? 1 : 0, intro: st.intro, terms: st.terms,
      it: st.cat.filter(function (c) { return c.on && c.n; }).map(function (c) { return { n: c.n, p: +String(c.p).replace(/[^\d.]/g, '') || 0, u: c.u, d: c.d }; }) };
  }

  function rows() {
    $('hz-cat').innerHTML = st.cat.map(function (c, i) {
      return '<div class="hz-row' + (c.on ? ' is-on' : '') + '"><label class="hz-on"><input type="checkbox" data-i="' + i + '" data-f="on"' + (c.on ? ' checked' : '') + '><span class="sr">לכלול</span></label>' +
        '<input class="hz-n" type="text" maxlength="70" data-i="' + i + '" data-f="n" value="' + esc(c.n) + '" aria-label="שם השירות">' +
        '<input class="hz-pr" type="text" inputmode="decimal" dir="ltr" maxlength="8" data-i="' + i + '" data-f="p" value="' + esc(c.p) + '" placeholder="0 = כלול" aria-label="מחיר בשקלים">' +
        '<select data-i="' + i + '" data-f="u" aria-label="לפי">' + Object.keys(U).map(function (k) { return '<option value="' + k + '"' + (c.u === k ? ' selected' : '') + '>' + U[k] + '</option>'; }).join('') + '</select>' +
        '<details class="hz-more"' + (c.on ? '' : '') + '><summary>מה כלול</summary><textarea data-i="' + i + '" data-f="d" rows="4" aria-label="מה כלול, שורה לכל דבר">' + esc(c.d) + '</textarea>' +
        '<button class="btn btn-line btn-sm" type="button" data-del="' + i + '">למחוק את השירות</button></details></div>';
    }).join('');
  }
  function preview() { $('hz-prev').innerHTML = HZ.render(quote(), brand); $('hz-sum').textContent = HZ.summary(quote()) || 'בחרו לפחות שירות אחד'; }
  function fill() {
    ['o', 'sig', 'ph', 'em', 'intro', 'terms', 'vd'].forEach(function (k) { $('hz-' + k).value = st[k] == null ? '' : st[k]; });
    $('hz-vat').value = st.vat; $('hz-portal').checked = !!st.portal; $('hz-no').placeholder = no();
    rows(); preview();
  }

  bld.addEventListener('input', function (e) {
    var el = e.target, i = el.getAttribute('data-i');
    if (i != null) { var c = st.cat[+i], f = el.getAttribute('data-f'); c[f] = el.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value; if (f === 'on') el.closest('.hz-row').classList.toggle('is-on', !!c.on); }
    else if (el.id && /^hz-(o|sig|ph|em|intro|terms|vd)$/.test(el.id)) st[el.id.slice(3)] = el.value;
    else if (el.id === 'hz-vat') st.vat = el.value;
    else if (el.id === 'hz-portal') st.portal = el.checked ? 1 : 0;
    save(); preview();
  });
  bld.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-del')) { st.cat.splice(+b.getAttribute('data-del'), 1); save(); rows(); preview(); }
    else if (b.id === 'hz-addrow') { st.cat.push({ k: 'x' + Date.now(), n: '', u: 'm', d: '', p: '', on: 1 }); save(); rows(); var ins = $('hz-cat').querySelectorAll('.hz-n'); ins[ins.length - 1].focus(); }
    else if (b.id === 'hz-reset') { if (confirm('להחזיר את רשימת השירותים לברירת המחדל? המחירים שכתבתם יימחקו.')) { st.cat = JSON.parse(JSON.stringify(DEF.cat)); save(); rows(); preview(); } }
    else if (b.id === 'hz-wa') send('wa');
    else if (b.id === 'hz-copy') send('copy');
    else if (b.id === 'hz-pdf') send('pdf');
    else if (b.id === 'hz-list-r') list();
  });

  // יצירת הקישור: בגיליון של המשרד (גרסה 5) או כולו בתוך הקישור
  function link(q) {
    var h = JSON.stringify(q);
    if (last.h === h) return Promise.resolve(last.link);
    if (room && ver >= 5 && window.TIK) {
      return window.TIK.call(room.u, { a: 'mQuote', key: room.key, data: h, no: q.no, client: q.cl, month: HZ.totals(q).m, year: HZ.totals(q).year }).then(function (r) {
        if (!r.ok) throw new Error(r.err);
        last = { h: h, link: HZ.PAGE + '#u=' + encodeURIComponent(room.u) + '&q=' + r.q }; return last.link;
      });
    }
    last = { h: h, link: HZ.PAGE + '#d=' + HZ.pack(q) }; return Promise.resolve(last.link);
  }
  function copyRaw(text) { var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); }
  function send(how) {
    var q = quote(), m = $('hz-smsg');
    if (!q.it.length) { m.textContent = 'בחרו לפחות שירות אחד.'; return; }
    if (!q.cl) { m.textContent = 'כתבו את שם הלקוח.'; $('hz-cl').focus(); return; }
    m.textContent = 'מכין את הקישור…';
    link(q).then(function (L) {
      if (!$('hz-no').value.trim()) { st.n = (st.n || 0) + 1; save(); $('hz-no').value = q.no; }
      CH.used('cheshbon_hatzaa', 'send_' + how);
      if (how === 'pdf') { m.textContent = ''; window.open(L.replace('#', '#p=1&'), '_blank', 'noopener'); return; }
      var text = 'שלום ' + q.cl + ',\nמצורפת הצעת המחיר' + (q.no ? ' מספר ' + q.no : '') + ' מ' + (q.o || 'המשרד') + ': ' + HZ.summary(q) + '.\n\nכל הפרטים, ואישור בלחיצה:\n' + L + '\n\n' + (q.sig || q.o || '');
      if (how === 'wa') { m.textContent = ''; location.href = 'https://wa.me/?text=' + encodeURIComponent(text); }
      else { copyRaw(text); m.textContent = 'ההודעה עם הקישור הועתקה ✓ אפשר להדביק במייל או בווטסאפ.'; }
      setTimeout(list, 1500);
    }).catch(function () { m.textContent = 'לא הצלחנו לשמור את ההצעה בגיליון. נסו שוב בעוד דקה.'; });
  }

  function list() {
    var box = $('hz-list');
    if (!room || ver < 5) { box.innerHTML = ''; return; }
    window.TIK.call(room.u, { a: 'mQuotes', key: room.key }).then(function (r) {
      if (!r.ok || !r.quotes.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<h3>ההצעות ששלחתם</h3><div class="tbl-wrap"><table><thead><tr><th>לקוח</th><th>מספר</th><th>לחודש</th><th>לשנה</th><th>מצב</th></tr></thead><tbody>' + r.quotes.slice(0, 50).map(function (x) {
        var stt = x.approved ? '<b class="hz-yes">✓ אושרה' + (x.by ? ' (' + esc(x.by) + ')' : '') + '</b>' : x.seen ? 'נצפתה ' + CH.heDate(new Date(x.seen)) : 'נשלחה';
        return '<tr><td>' + esc(x.client) + '</td><td>' + esc(x.no) + '</td><td class="n">' + (x.month ? HZ.nis(x.month) : '') + '</td><td class="n">' + (x.year ? HZ.nis(x.year) : '') + '</td><td>' + stt + '</td></tr>';
      }).join('') + '</tbody></table></div><button class="btn btn-line btn-sm" type="button" id="hz-list-r">לרענן</button>';
    }).catch(function () {});
  }

  function gate() {
    var on = isPartner();
    $('hz-tool').hidden = !on; $('hz-teaser').hidden = on;
    if (!on) return;
    room = CH.load('tik-cheder', null);
    $('hz-mode').textContent = room ? 'מחובר לחדר: כשמכינים קישור, ההצעה נשמרת בגיליון של המשרד, והאישור של הלקוח נרשם שם ומגיע במייל.' : 'בלי חדר מחובר, כל ההצעה נמצאת בתוך הקישור, והלקוח מאשר בווטסאפ לטלפון של המשרד.';
    if (room && window.TIK) window.TIK.call(room.u, { a: 'mInfo', key: room.key }).then(function (r) {
      if (!r.ok) return;
      ver = r.ver || 1; brand = r.brand || {};
      if (!st.o && r.office) { st.o = st.sig = r.office; save(); fill(); } else preview();
      $('hz-mode').textContent = ver >= 5 ? 'מחובר לחדר ✓ כל הצעה נשמרת בגיליון "הצעות מחיר" בדרייב של המשרד. רואים כאן מתי הלקוח פתח ומתי אישר, ומקבלים מייל באישור.' : 'כדי שהאישורים יירשמו בגיליון, מעדכנים את הקוד בגוגל לגרסה 5 (ההוראות בחדר למעלה). עד אז הלקוח מאשר בווטסאפ.';
      list();
    }).catch(function () {});
  }
  var pc = $('cd-pcode'); if (pc) pc.addEventListener('input', function () { setTimeout(gate, 50); });
  fill(); gate();
})();
