/* סידור מיילים בג'ימייל – בונה ההגדרות, תצוגת מייל הסיכום והעתקת הקוד
   הכול בדפדפן. הקוד שנוצר רץ בחשבון הגוגל של המשתמש בלבד. */
(function () {
  'use strict';
  var KEY = 'sk-set-v1';
  var SRC_URL = '/assets/machshev-sikum-script.txt';
  var $ = function (id) { return document.getElementById(id); };
  var src = '';
  var api = null;

  var CAT_KEYS = ['sales', 'reply', 'important', 'money', 'follow', 'ship', 'promo'];
  var DEF = {
    freq: 'daily', hour: 7, weekday: 'SUNDAY', everyDays: 3, to: '',
    labels: true, tasks: false, archivePromo: false, skipEmpty: false, followDays: 3,
    first: 'sales',
    on: { sales: true, reply: true, important: true, money: true, follow: true, ship: true, promo: true },
    vip: '', salesWords: '', rules: ''
  };

  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    var o = JSON.parse(JSON.stringify(DEF));
    if (s && typeof s === 'object') {
      Object.keys(DEF).forEach(function (k) { if (s[k] !== undefined) o[k] = s[k]; });
      o.on = Object.assign({}, DEF.on, s.on || {});
    }
    return o;
  }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }

  function lines(t) {
    return String(t || '').split(/\n|,/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 200);
  }

  /* ---------- טופס ⇄ הגדרות ---------- */
  function readForm() {
    var o = load();
    var fr = document.querySelector('input[name="sk-freq"]:checked');
    o.freq = fr ? fr.value : 'daily';
    o.hour = Number($('sk-hour').value);
    o.weekday = $('sk-weekday').value;
    o.everyDays = Math.max(2, Math.min(30, Number($('sk-every').value) || 3));
    o.first = $('sk-first').value;
    CAT_KEYS.forEach(function (k) { var c = $('sk-on-' + k); if (c) o.on[k] = c.checked; });
    o.vip = $('sk-vip').value;
    o.salesWords = $('sk-sales').value;
    o.rules = $('sk-rules').value;
    o.to = $('sk-to').value.trim();
    o.labels = $('sk-labels').checked;
    o.tasks = $('sk-tasks').checked;
    o.archivePromo = $('sk-archive').checked;
    o.skipEmpty = $('sk-skip').checked;
    o.followDays = Number($('sk-follow').value) || 3;
    return o;
  }
  function fillForm(o) {
    var r = document.querySelector('input[name="sk-freq"][value="' + o.freq + '"]');
    if (r) r.checked = true;
    $('sk-hour').value = String(o.hour);
    $('sk-weekday').value = o.weekday;
    $('sk-every').value = o.everyDays;
    $('sk-first').value = o.first;
    CAT_KEYS.forEach(function (k) { var c = $('sk-on-' + k); if (c) c.checked = !!o.on[k]; });
    $('sk-vip').value = o.vip;
    $('sk-sales').value = o.salesWords;
    $('sk-rules').value = o.rules;
    $('sk-to').value = o.to;
    $('sk-labels').checked = !!o.labels;
    $('sk-tasks').checked = !!o.tasks;
    $('sk-archive').checked = !!o.archivePromo;
    $('sk-skip').checked = !!o.skipEmpty;
    $('sk-follow').value = String(o.followDays);
    showFreq();
  }
  function showFreq() {
    var fr = document.querySelector('input[name="sk-freq"]:checked');
    var v = fr ? fr.value : 'daily';
    $('sk-weekday-f').hidden = v !== 'weekly';
    $('sk-every-f').hidden = v !== 'every';
    $('sk-tasks-help').hidden = !$('sk-tasks').checked;
  }

  /* ---------- הגדרות ← CONFIG של הסקריפט ---------- */
  function toConfig(o, base) {
    var c = JSON.parse(JSON.stringify(base));
    c.freq = o.freq; c.hour = o.hour; c.weekday = o.weekday; c.everyDays = o.everyDays;
    c.to = o.to; c.labels = o.labels; c.tasks = o.tasks; c.archivePromo = o.archivePromo; c.skipEmpty = o.skipEmpty;
    c.followDays = o.followDays;
    c.on = Object.assign({}, o.on);
    var order = c.order.slice();
    if (o.first === 'reply') order = ['reply', 'sales'].concat(order.filter(function (k) { return k !== 'reply' && k !== 'sales'; }));
    else order = ['sales', 'reply'].concat(order.filter(function (k) { return k !== 'reply' && k !== 'sales'; }));
    c.order = order;
    c.vip = lines(o.vip);
    var extra = lines(o.salesWords);
    extra.forEach(function (w) { if (c.salesWords.indexOf(w) < 0) c.salesWords.push(w); });
    c.rules = String(o.rules || '').split('\n').map(function (l) {
      var m = l.split(/\s*(?:=|->|→|⟵|←)\s*/);
      if (m.length < 2 || !m[0].trim() || !m[1].trim()) return null;
      return { match: m[0].trim(), label: m[1].trim().replace(/\//g, '-').slice(0, 40) };
    }).filter(Boolean).slice(0, 50);
    return c;
  }

  function baseConfig() {
    var m = src.match(/\/\*__CONFIG__\*\/([\s\S]*?)\/\*__END__\*\//);
    return m ? JSON.parse(m[1]) : null;
  }
  function buildCode(o) {
    var base = baseConfig();
    if (!base) return src;
    var cfg = toConfig(o, base);
    return src.replace(/\/\*__CONFIG__\*\/[\s\S]*?\/\*__END__\*\//, '/*__CONFIG__*/' + JSON.stringify(cfg, null, 2) + '/*__END__*/');
  }

  /* ---------- תצוגה: אותה פונקציה בדיוק שבונה את המייל האמיתי ---------- */
  function loadApi() {
    if (api) return api;
    try {
      var tz = 'Asia/Jerusalem';
      var Utilities = { formatDate: function (d, z, f) {
        var p = function (n) { return (n < 10 ? '0' : '') + n; };
        if (f === 'dd.MM') return p(d.getDate()) + '.' + p(d.getMonth() + 1);
        return p(d.getDate()) + '.' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
      } };
      var Session = { getScriptTimeZone: function () { return tz; } };
      var f = new Function('Utilities', 'Session', src + '\n;return {CONFIG:CONFIG, CATS:CATS, renderHtml_:renderHtml_, subject_:subject_};');
      api = f(Utilities, Session);
    } catch (e) { api = null; }
    return api;
  }

  function sample(now) {
    var h = 36e5;
    var D = function (hrs) { return new Date(now.getTime() - hrs * h); };
    var it = function (subj, who, snip, hrs, why) { return { id: 'demo', subj: subj, who: who, snip: snip, date: D(hrs), why: why || '' }; };
    return {
      total: 47, promoCount: 21,
      promoSenders: { 'שופרסל': 6, 'עלי אקספרס': 5, 'ישראכרט': 4, 'אמזון': 3, 'ynet': 3 },
      sales: [
        it('שאלה על הצעת מחיר לאירוע ב-20.12', 'דנה כהן', 'שלום, אני מעוניינת בהצעת מחיר לאירוע של כ-80 איש. אפשר לדבר מחר בבוקר?', 3, 'הצעת מחיר'),
        it('פנייה מהאתר: טופס יצירת קשר', 'אתר העסק', 'שם: משה לוי · טלפון: 050-0000000 · הודעה: רציתי לשאול כמה עולה...', 9, 'טופס יצירת קשר')
      ],
      reply: [
        it('Re: החוזה לחתימה', 'עו״ד רונית אברהם', 'שלחתי לך את הגרסה המתוקנת. תאשר שקיבלת?', 52, 'עדיין לא ענית'),
        it('פגישה ביום שלישי?', 'יוסי מהעבודה', 'היי, אפשר לקבוע ב-10 או ב-12?', 5, 'שאלו אותך משהו')
      ],
      important: [
        Object.assign(it('Action required: verify your account', 'שירות האחסון', 'If you do not verify your account by 30.11, it will be suspended.', 6, 'אזהרה: action required'), { alert: true }),
        it('דחוף – המסמכים לבנק', 'אבא', 'צריך עד יום חמישי את הטופס החתום.', 1, 'דחוף')
      ],
      money: [
        it('חשבונית מס לחודש נובמבר', 'סלקום', 'החשבונית החודשית שלך מוכנה. סכום לתשלום: 89.90 ₪.', 8, 'חשבונית'),
        it('קבלה על תשלום ארנונה', 'העירייה', 'תודה, התשלום התקבל.', 20, 'קבלה')
      ],
      vendors: [{ who: 'סלקום', n: 1, sums: { '₪': 89.9 } }, { who: 'העירייה', n: 1, sums: { '₪': 412 } }],
      follow: [it('בקשה להחזר חיוב כפול', 'שירות לקוחות הבנק', 'אבקש לבדוק את החיוב הכפול מ-3.11.', 100, 'שלחת לפני 4 ימים')],
      ship: [it('ההזמנה שלך יצאה למשלוח', 'עלי אקספרס', 'מספר מעקב: LP00123456789', 10, 'יצא למשלוח')]
    };
  }

  function preview() {
    var a = loadApi();
    var box = $('sk-preview');
    if (!a || !box) return;
    var o = readForm();
    var cfg = toConfig(o, baseConfig());
    Object.keys(cfg).forEach(function (k) { a.CONFIG[k] = cfg[k]; });
    var now = new Date();
    var d = sample(now);
    var since = new Date(now.getTime() - (o.freq === 'weekly' ? 7 : o.freq === 'every' ? o.everyDays : 1) * 864e5);
    var html = a.renderHtml_(d, since, now).replace(/https:\/\/mail\.google\.com\/mail\/u\/0\/#all\/demo/g, '#sk-preview');
    box.innerHTML = '<div class="sk-mailhead"><b>' + esc(a.subject_(d, now)) + '</b><span>מאת: סיכום המיילים שלי · אל: ' + esc(o.to || 'עצמך') + '</span></div>' + html;
    // קישורי הדוגמה לא יוצאים מהדף
    Array.prototype.forEach.call(box.querySelectorAll('a[href="#sk-preview"]'), function (x) {
      x.addEventListener('click', function (e) { e.preventDefault(); });
    });
  }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function freqLine(o) {
    var days = { SUNDAY: 'ראשון', MONDAY: 'שני', TUESDAY: 'שלישי', WEDNESDAY: 'רביעי', THURSDAY: 'חמישי', FRIDAY: 'שישי', SATURDAY: 'שבת' };
    var hh = (o.hour < 10 ? '0' : '') + o.hour + ':00';
    if (o.freq === 'weekly') return 'פעם בשבוע, ביום ' + days[o.weekday] + ' בסביבות ' + hh;
    if (o.freq === 'every') return 'כל ' + o.everyDays + ' ימים בסביבות ' + hh;
    return 'כל יום בסביבות ' + hh;
  }

  function onChange() {
    showFreq();
    var o = readForm();
    save(o);
    $('sk-summary').textContent = 'הסיכום יגיע ' + freqLine(o) + (o.to ? ', אל ' + o.to : ', אל המייל שלך') + '.';
    preview();
  }

  var usedOnce = {};
  function used(how) {
    if (usedOnce[how] && Date.now() - usedOnce[how] < 30000) return;
    usedOnce[how] = Date.now();
    try { window.toolUsed && window.toolUsed('sidur_mailim', { how: how }); } catch (e) {}
  }

  function copyCode() {
    var code = buildCode(readForm());
    var ta = $('sk-code');
    ta.value = code;
    var ok = function () { $('sk-copy-msg').textContent = '✓ הקוד הועתק. עכשיו מדביקים אותו בעורך (שלב 2).'; used('copy'); };
    var fail = function () {
      ta.hidden = false; ta.focus(); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { $('sk-copy-msg').textContent = 'סמנו את הקוד בתיבה (Ctrl+A) והעתיקו (Ctrl+C).'; }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(ok, fail); else fail();
  }
  function download() {
    var code = buildCode(readForm());
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }));
    a.download = 'sidur-mailim.gs';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    used('download');
  }
  function showCode() {
    var ta = $('sk-code');
    ta.value = buildCode(readForm());
    ta.hidden = !ta.hidden;
    $('sk-show').setAttribute('aria-pressed', String(!ta.hidden));
    $('sk-show').textContent = ta.hidden ? '👁 לראות את הקוד לפני שמעתיקים' : 'להסתיר את הקוד';
  }

  function init() {
    var form = $('sk-form');
    if (!form) return;
    fillForm(load());
    form.addEventListener('input', onChange);
    form.addEventListener('change', onChange);
    form.addEventListener('submit', function (e) { e.preventDefault(); });
    $('sk-copy').addEventListener('click', copyCode);
    $('sk-copy2').addEventListener('click', copyCode);
    $('sk-dl').addEventListener('click', download);
    $('sk-show').addEventListener('click', showCode);
    $('sk-reset').addEventListener('click', function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      fillForm(load()); onChange();
    });
    fetch(SRC_URL, { cache: 'no-cache' }).then(function (r) { return r.text(); }).then(function (t) {
      src = t;
      onChange();
      $('sk-copy').disabled = false; $('sk-copy2').disabled = false;
    }).catch(function () {
      $('sk-copy-msg').textContent = 'הקוד לא נטען. בדקו את החיבור ורעננו את הדף.';
    });
    onChange();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  window.SK = { buildCode: function () { return buildCode(readForm()); }, toConfig: toConfig };
})();
