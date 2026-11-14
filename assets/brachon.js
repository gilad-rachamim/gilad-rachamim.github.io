// ברכונים להדפסה (כלי קודש): קריאת שמע שעל המיטה, ברכת המזון, מעין שלוש, תפילת הדרך – עם עמוד הקדשה לאירוע.
// המילים והניקוד מספריא בלי שינוי (assets/brachon-data.js, נבנה ע"י tools/gen_brachon.py). שם ה' נכתב ה'.
// BRACHON_BUILD הוא פונקציה טהורה, ו-tools/check_brachon.js מריץ אותה ובודק שהטקסט זהה למקור.
(function () {
  'use strict';
  var D = window.BRACHON_DATA;
  var NUS = { ash: 'אשכנז', sef: 'ספרד (חסידי)', em: 'עדות המזרח' };
  // ברכת המזון ספרד: "תורת אמת", חוץ מסוף הברכה שריק שם ולכן מסידור "מצודה" (ראו tools/fetch_brachon.py). המשך = לא נכנס לתוכן העניינים.
  var SEF_MAZON = [['', 'sef_mazon'], ['', 'sef_mazon_end', 1], ['', 'sef_mazon_shichecha', 1]];
  var KINDS = {
    shema: { t: 'קריאת שמע שעל המיטה', cover: ['קריאת שמע', 'שעל המיטה'], n: { ash: [['', 'ash_shema']], sef: [['', 'sef_shema']], em: [['', 'em_shema']] } },
    mazon: { t: 'ברכת המזון', cover: ['ברכת המזון'], n: { ash: [['', 'ash_mazon']], sef: SEF_MAZON, em: [['', 'em_mazon']] }, brit: { sef: 'sef_brit' } },
    meein: { t: 'ברכה מעין שלוש', cover: ['ברכה', 'מעין שלוש'], n: { ash: [['ברכה מעין שלוש', 'ash_meein'], ['בורא נפשות', 'ash_nefashot']], em: [['', 'em_meein']] },
      miss: { sef: 'בסידור "תורת אמת" (נוסח ספרד) שבספריא אין ברכה מעין שלוש, ולכן אין כאן נוסח ספרד. אפשר לבחור אשכנז או עדות המזרח.' } },
    haderech: { t: 'תפילת הדרך', cover: ['תפילת הדרך'], n: { ash: [['', 'ash_haderech']], em: [['', 'em_haderech']] },
      miss: { sef: 'בסידור "תורת אמת" (נוסח ספרד) שבספריא אין תפילת הדרך. אפשר לבחור אשכנז או עדות המזרח.' } },
    kol: { t: 'ברכון לאירוע', cover: ['ברכון'], n: {
      ash: [['ברכת המזון', 'ash_mazon'], ['ברכה מעין שלוש', 'ash_meein'], ['בורא נפשות', 'ash_nefashot'], ['תפילת הדרך', 'ash_haderech']],
      sef: SEF_MAZON.map(function (p, i) { return i ? p : ['ברכת המזון', p[1]]; }).concat([['', 'sef_foods']]),
      em: [['', 'em_mazon'], ['', 'em_meein'], ['', 'em_haderech']] }, brit: { sef: 'sef_brit' } }
  };
  // מחזיר את מה שמודפס: כותרות (שלנו) ומקטעים (מהמקור, כמו שהם).
  function build(kind, nus, opts) {
    var K = KINDS[kind], list = (K.n[nus] || []).slice(), secs = [];
    if (opts && opts.brit && K.brit && K.brit[nus]) list.push(['', K.brit[nus]]);
    list.forEach(function (p) { var d = D[p[1]]; secs.push({ label: p[0], key: p[1], src: d.src, segs: d.segs, cont: !!p[2] }); });
    return { title: K.t, cover: K.cover, miss: K.miss && K.miss[nus], hasBrit: !!(K.brit && K.brit[nus]), secs: secs };
  }
  window.BRACHON_KINDS = KINDS; window.BRACHON_NUS = NUS; window.BRACHON_BUILD = build;
  if (typeof document === 'undefined' || !document.getElementById('br-form')) return;

  var $ = function (id) { return document.getElementById(id); };
  var form = $('br-form');
  function v(n) { var el = form.elements[n]; if (!el) return ''; if (el.type === 'checkbox') return el.checked; return (el.value || '').trim(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ev(name, p) { if (window.gtag) window.gtag('event', name, p || {}); }
  var EVENTS = {
    barmitzva: 'לרגל בר המצווה של', batmitzva: 'לרגל בת המצווה של', chatuna: 'לרגל נישואי', sheva: 'שבע ברכות לרגל נישואי',
    brit: 'לרגל ברית המילה של', bat: 'לרגל שמחת הולדת בתם של', bayit: 'לרגל חנוכת הבית של', siyum: 'לרגל סיום המסכת של', none: ''
  };
  var SIZES = { a6: [105, 148, '10.5pt'], a5: [148, 210, '12.5pt'], a4: [210, 297, '15pt'] };
  var pageStyle = document.createElement('style'); document.head.appendChild(pageStyle);

  function render() {
    var kind = v('kind'), nus = v('nus');
    // נוסח שאין לברכון הזה: עוברים לראשון שיש
    var K = KINDS[kind];
    Array.prototype.forEach.call(form.elements.nus.options, function (o) { o.disabled = !K.n[o.value]; o.textContent = NUS[o.value] + (K.n[o.value] ? '' : ' (אין במקור)'); });
    if (!K.n[nus]) { nus = Object.keys(K.n)[0]; form.elements.nus.value = nus; }
    var b = build(kind, nus, { brit: v('brit') });
    $('br-brit-wrap').hidden = !b.hasBrit;
    $('br-miss').hidden = !b.miss; $('br-miss').textContent = b.miss || '';
    var st = form.querySelector('[name=st]:checked'); st = st ? st.value : 'blue';
    var size = SIZES[v('size')] || SIZES.a5;
    var book = $('br-book');
    book.className = 'br-book st-' + st + ' sz-' + v('size') + (v('big') ? ' big' : '');
    // עמוד שער והקדשה
    var evk = v('event'), line = evk === 'other' ? v('eventtxt') : EVENTS[evk] || '', names = v('names'), date = v('date'), ded = v('ded');
    var cover = '<div class="br-frame"><span class="bsd">בס"ד</span><div class="br-orn" aria-hidden="true"></div>' +
      '<h2>' + b.cover.map(esc).join('<br>') + '</h2>' +
      (b.secs.length > 1 && kind === 'kol' ? '<p class="br-cont">' + b.secs.filter(function (s) { return !s.cont; }).map(function (s) { return esc(s.label || D[s.key].segs[0].replace(/<[^>]+>/g, '')); }).join(' · ') + '</p>' : '') +
      '<p class="br-nus">נוסח ' + esc(NUS[nus]) + '</p>' +
      ((line || names || date || ded) ? '<div class="br-ded">' + (line ? '<p class="l1">' + esc(line) + '</p>' : '') + (names ? '<p class="nm">' + esc(names) + '</p>' : '') +
        (date ? '<p class="dt">' + esc(date) + '</p>' : '') + (ded ? '<p class="sn">' + esc(ded).replace(/\n/g, '<br>') + '</p>' : '') + '</div>' : '') +
      '<div class="br-orn" aria-hidden="true"></div></div>';
    var html = '';
    b.secs.forEach(function (s) {
      html += '<section class="br-sec" data-src="' + s.key + '">' + (s.label ? '<h3>' + esc(s.label) + '</h3>' : '');
      s.segs.forEach(function (g) {
        var m = /^<big>([\s\S]*)<\/big>$/.exec(g);
        html += m ? '<h4>' + m[1] + '</h4>' : '<p>' + g + '</p>';
      });
      html += '</section>';
    });
    var srcs = []; b.secs.forEach(function (s) { if (srcs.indexOf(s.src) < 0) srcs.push(s.src); });
    html += '<p class="br-credit">הנוסח: ' + esc(srcs.join(' · ')) + '. שם ה\' נכתב ה\'.<br>כלי קודש · hakelim.com/kodesh</p>';
    $('br-cover').innerHTML = cover;
    $('br-text').innerHTML = html;
    // <small> במקור משמש גם להוראות וגם לתוספות שאומרים רק לפעמים: הוראה = בלי ניקוד, תוספת = עם ניקוד
    Array.prototype.forEach.call($('br-text').querySelectorAll('small'), function (el) {
      el.className = /[ְ-ּׁׂ]/.test(el.textContent) ? 'opt' : 'ins';
    });
    pageStyle.textContent = '@page{size:' + size[0] + 'mm ' + size[1] + 'mm;margin:9mm 9mm 11mm}@page :first{margin:0}' +
      '@media print{.br-cover{width:' + size[0] + 'mm;height:' + size[1] + 'mm}.br-book{font-size:' + size[2] + '}.br-book.big{font-size:calc(' + size[2] + ' * 1.2)}}';
    $('br-pages-note').textContent = 'גודל: ' + { a6: 'A6 (רבע דף, מקפלים פעמיים)', a5: 'A5 (חצי דף)', a4: 'A4 (דף מלא)' }[v('size')];
  }
  form.addEventListener('input', render);
  form.addEventListener('change', render);
  $('br-event').addEventListener('change', function () { $('br-eventtxt-wrap').hidden = v('event') !== 'other'; });
  $('br-printbtn').addEventListener('click', function () {
    ev('brachon_print', { kind: v('kind'), nusach: v('nus'), style: (form.querySelector('[name=st]:checked') || {}).value, size: v('size'), dedication: !!(v('names') || v('ded')) });
    window.print();
  });
  render();
})();
