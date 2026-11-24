/* הודעות להורים בשפה שלהם – המוהל מנסח בעברית, בודק, ושולח ברוסית או בשפה אחרת.
   תרגום: השרת של מיזם הכלים (kelim-tirgum), ואם הוא לא עונה – MyMemory. */
(function () {
  'use strict';
  var API = 'https://kelim-tirgum.gilad4049.workers.dev';
  // הערת "תרגום אוטומטי" בכל שפה – כתובה מראש, לא מתורגמת במכונה
  var LANGS = {
    ru: { n: 'רוסית', note: 'Автоматический перевод, возможны ошибки.', rtl: false },
    en: { n: 'אנגלית', note: 'Automatic translation, there may be errors.', rtl: false },
    uk: { n: 'אוקראינית', note: 'Автоматичний переклад, можливі помилки.', rtl: false },
    fr: { n: 'צרפתית', note: 'Traduction automatique, des erreurs sont possibles.', rtl: false },
    es: { n: 'ספרדית', note: 'Traducción automática, puede contener errores.', rtl: false },
    de: { n: 'גרמנית', note: 'Automatische Übersetzung, Fehler sind möglich.', rtl: false },
    pt: { n: 'פורטוגזית', note: 'Tradução automática, pode conter erros.', rtl: false },
    ar: { n: 'ערבית', note: 'ترجمة آلية، قد تحتوي على أخطاء.', rtl: true }
  };
  var HE_NOTE = 'תרגום אוטומטי, ייתכנו טעויות.';
  var TPL = {
    achrei: 'מזל טוב! הברית עברה בשלום.\n' +
      'אחרי כל החלפת טיטול מטפטפים שמן טבעי על התחבושת.\n' +
      'בודקים שהתינוק נותן שתן.\n' +
      'מעט דם בטיטול זה רגיל. אם יש הרבה דם, מתקשרים אליי מיד.\n' +
      'מחר אגיע להוריד את התחבושת.',
    tizkoret: 'שלום, תזכורת: הברית ביום ___ בשעה ___, ב___.\n' +
      'כדאי להגיע רבע שעה לפני.\n' +
      'אם יש שאלה, אני זמין בטלפון.',
    machar: 'שלום, אגיע מחר בשעה ___ להוריד את התחבושת.\n' +
      'עד אז ממשיכים לטפטף שמן על התחבושת אחרי כל החלפת טיטול.',
    mazal: 'מזל טוב להולדת הבן! שמחתי להיות שותף בשמחה שלכם.\n' +
      'שתזכו לגדל אותו לתורה, לחופה ולמעשים טובים.'
  };
  var $ = function (id) { return document.getElementById(id); };
  var src = $('ho-src'), lang = $('ho-lang'), out = $('ho-out'), back = $('ho-back'),
    status = $('ho-status'), res = $('ho-res'), ok = $('ho-ok'), copyB = $('ho-copy'), waB = $('ho-wa');
  if (!src) return;
  Object.keys(LANGS).forEach(function (k) {
    var o = document.createElement('option'); o.value = k; o.textContent = LANGS[k].n; lang.appendChild(o);
  });
  try { var saved = localStorage.getItem('ho-lang'); if (saved && LANGS[saved]) lang.value = saved; } catch (_) {}
  var ev = function (n, p) { try { if (window.kelimEv) window.kelimEv(n, Object.assign({ tool: src.getAttribute('data-tool') || 'mohel_hodaot' }, p || {})); } catch (_) {} };

  document.querySelectorAll('[data-tpl]').forEach(function (b) {
    b.addEventListener('click', function () { src.value = TPL[b.getAttribute('data-tpl')] || ''; src.focus(); ev('hodaot_tpl', { t: b.getAttribute('data-tpl') }); });
  });

  async function post(body) {
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, 20000);
    try {
      var r = await fetch(API + '/t', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
      var d = await r.json();
      if (!d || d.error || typeof d.t !== 'string') throw new Error(d && d.error || 'server');
      return d.t;
    } finally { clearTimeout(t); }
  }
  async function mymemory(q, a, b) {
    var lines = q.split('\n'), outp = [];
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) { outp.push(''); continue; }
      var r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(lines[i].slice(0, 480)) + '&langpair=' + a + '|' + b);
      var d = await r.json();
      outp.push(d && d.responseData && d.responseData.translatedText || '');
    }
    return outp.join('\n');
  }
  async function tr(q, a, b) {
    try { return await post({ q: q, from: a, to: b }); }
    catch (e) { return await mymemory(q, a, b); }
  }
  function message() {
    var L = LANGS[lang.value];
    // סיומת שלא מתרגמים (למשל קישור לכרטיס) – הדף שמארח את הכלי מגדיר אותה
    var sfx = typeof window.hoSuffix === 'function' ? window.hoSuffix(lang.value) : '';
    return out.value.trim() + (sfx ? '\n' + sfx : '') + '\n\n(' + L.note + ' / ' + HE_NOTE + ')';
  }
  function gate() {
    var can = ok.checked && out.value.trim();
    copyB.disabled = !can;
    waB.setAttribute('aria-disabled', can ? 'false' : 'true');
    waB.classList.toggle('ho-off', !can);
    if (can) waB.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(message());
    else waB.removeAttribute('href');
  }

  $('ho-go').addEventListener('click', async function () {
    var q = src.value.trim();
    if (!q) { status.textContent = 'כתבו קודם את ההודעה בעברית.'; src.focus(); return; }
    if (q.length > 4000) { status.textContent = 'ההודעה ארוכה מדי. עד 4,000 תווים.'; return; }
    var to = lang.value, L = LANGS[to];
    try { localStorage.setItem('ho-lang', to); } catch (_) {}
    status.textContent = 'מתרגם ל' + L.n + '…';
    this.disabled = true; ok.checked = false; gate();
    try {
      var t = await tr(q, 'he', to);
      out.value = t; out.dir = L.rtl ? 'rtl' : 'ltr'; out.lang = to;
      res.hidden = false;
      status.textContent = 'מתרגם בחזרה לעברית, כדי שתוכלו לבדוק…';
      var b = await tr(t, to, 'he');
      back.textContent = b;
      status.textContent = 'מוכן. קראו את התרגום החוזר, ורק אחר כך שלחו.';
      ev('hodaot_translate', { lang: to });
    } catch (e) {
      status.textContent = 'התרגום לא הצליח כרגע. נסו שוב בעוד דקה.';
    } finally { this.disabled = false; gate(); }
  });
  ok.addEventListener('change', gate);
  out.addEventListener('input', function () { back.textContent = '(שיניתם את התרגום. אפשר ללחוץ שוב על "לתרגם" כדי לבדוק.)'; gate(); });
  lang.addEventListener('change', function () { if (!res.hidden) status.textContent = 'החלפתם שפה. לחצו שוב על "לתרגם".'; });
  copyB.addEventListener('click', function () {
    var t = message();
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () {
      copyB.textContent = 'הועתק ✓'; setTimeout(function () { copyB.textContent = 'להעתיק'; }, 2500);
    }).catch(function () { out.select(); });
    ev('hodaot_copy', { lang: lang.value });
  });
  waB.addEventListener('click', function (e) {
    if (waB.getAttribute('aria-disabled') === 'true') { e.preventDefault(); status.textContent = 'קודם מסמנים שבדקתם את התרגום.'; return; }
    ev('hodaot_wa', { lang: lang.value });
  });
  gate();
})();
