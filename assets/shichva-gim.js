/* פורטל שכבה – גימטריות מצחיקות: אותו חישוב כמו בכלי הגימטריה (https://hakelim.com/kodesh/gimatria/),
   בנק מילים מחיי השכבה, ומציאת מילים וצירופים בעלי אותו מספר. משמש את דבר התורה, דף הגמרא והממים.
   כללים: בלי שמות קודש (נחסמים), בלי אנשים בבנק, צוחקים על תופעות. כל מה שמוצע ניתן לעריכה ביד. */
(function () {
  'use strict';
  var SH = window.SH = window.SH || {};
  function esc(s) { return SH.esc ? SH.esc(s) : String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(s, el) { return (el || document).querySelector(s); }

  var LET = 'אבגדהוזחטיכלמנסעפצקרשת';
  var VAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300, 400];
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
  var BAN_RE = /יהוה|אלהי|אלוה|אדני|שדי/;
  var BAN_X = { 'יה': 1, 'אל': 1 };

  function parse(raw) {
    var s = String(raw || '').normalize('NFKD').replace(/[֑-ׇֽֿׁׂׅׄ̀-ͯ]/g, '').replace(/[׳״'"`‘’“”]/g, '');
    return s.split(/[^א-ת]+/).filter(Boolean);
  }
  function letterVal(ch) { var i = LET.indexOf(FIN[ch] || ch); return i < 0 ? 0 : VAL[i]; }
  function wordVal(w) { var t = 0; for (var i = 0; i < w.length; i++) t += letterVal(w[i]); return t; }
  function textVal(t) { return parse(t).reduce(function (a, w) { return a + wordVal(w); }, 0); }
  function banned(words) { return words.some(function (w) { return BAN_RE.test(w) || BAN_X[w]; }); }
  /* פירוט החישוב: 100+80+5 ; לכמה מילים – כל מילה בסוגריים */
  function calc(t) {
    var ws = parse(t);
    var one = function (w) { return w.split('').map(function (c) { return letterVal(c); }).join('+'); };
    return ws.length === 1 ? one(ws[0]) : ws.map(function (w) { return '(' + one(w) + ')'; }).join('+');
  }

  /* בנק מילים מחיי השכבה. בלי אנשים, בלי שמות קודש. מרווח בפנים = צירוף קבוע */
  var BANK = ('קפה תה שיעור מחברת עט טוש לוח פעמון מזנון חברותא הפסקה מבחן בגרות ציון תעודה מחזור מלכים הכתרה כיתה שולחן כסא תיק קלמר מחק סרגל ' +
    'דפים סיכום שינה בוקר ערב צהריים שחרית מנחה ארוחה קוגל חמין שניצל פיתה חומוס שוקולד במבה ביסלי נשנוש ממתק עוגה סוכר מים חלב קרח מזגן חימום ' +
    'חשמל אינטרנט וייפיי טלפון מסך מטען סוללה הודעה קבוצה סטטוס צילום סלפי תמונה אלבום סרטון שיר ריקוד מסיבה חגיגה כיף שמחה צחוק בדיחה ליצן ' +
    'פורים משלוח מסכה תחפושת מגילה רעשן אוזן המן הטיול אוטובוס מחנה אוהל מדים חולצה נעליים גרביים שעון שבוע חופש קיץ חורף גשם בוץ חום קור רעב ' +
    'שובע עייפות לחץ מתח סבלנות הצלחה כישלון חלום סיכוי תכנית פרויקט דוח מסמך תיקייה קובץ מחשב מקלדת עכבר חבר חברים שכבה מסלול תור פתק ' +
    'איחור חיסור דדליין שאלה תשובה קושיה תירוץ נפקא_מינה בדיחה רעיון חוכמה טעות תיקון הפתעה סוד שקט רעש מוזיקה גיטרה תוף חלילית מיקרופון ' +
    'במה קהל מחיאות כפיים הצגה תסריט סרט כוכב מפורסם עולם ארץ שמיים כוכבים ירח שמש ענן רוח ים הר נחל עץ פרח פרי תפוח תמר זית ענבים אגוז ' +
    'לחם גבינה ביצה דג בשר אורז מרק סלט פלפל עגבנייה מלפפון בצל שום לימון תפוז בננה אבטיח גלידה פופקורן פיצה המבורגר צ׳יפס שתייה ' +
    'כסף שקל מחיר הנחה מבצע קנייה חנות סופר דוכן שוק מונית רכבת מטוס אופניים קורקינט נהג מפה כיוון דרך עצירה מהירות ' +
    'בוקר_טוב לילה_טוב סוף_שנה סוף_טוב כל_הכבוד מחזור_ס״ט במלכים_מחזור שבת_שלום חג_שמח מזל_טוב יום_הולדת לחיים בהצלחה בשעה_טובה ' +
    'ראש_השנה חופש_גדול שנה_טובה אין_מצב הכול_טוב בסדר_גמור כמעט_שם עוד_רגע בא_לי_לישון אני_לא_מבין ללא_תשובה ' +
    'בוגרים בוגר כתר יין שלום אמת חי לב מזל בית אור שנה יום לילה מלך חכם חכמה בן אח סבא סבתא משפחה פרנסה בריאות תודה חן רינה גילה כוכב ' +
    'ניצחון גביע מדליה פרס הישג צוות ביחד אחדות רעות אלוף זריחה שקיעה סיום פרידה געגוע זיכרון מתוק דור נבחרת ' +
    'שיעור_בוקר שיעור_ערב סדר_ב ארוחת_בוקר ארוחת_ערב הפסקת_קפה קפה_שחור קפה_הפוך תה_עם_נענע').split(' ')
    .map(function (w) { return w.replace(/_/g, ' ').replace(/״/g, '').replace(/׳/g, ''); })
    .filter(function (w) { return w && !banned(parse(w)); });

  var GEMS = [
    ['מחזור', 'בוגרים', 'מחזור בלי בוגרים – אינו מחזור'],
    ['מלכים', 'בהצלחה', 'מי שלמד במלכים – ההצלחה כבר בגימטריא'],
    ['כתר', 'רעשן', 'לכן בהכתרה מרעישים'],
    ['טעות', 'תעודה', 'כל תעודה מתחילה בטעות קטנה'],
    ['פורים', 'שאלה', 'בפורים כל שאלה היא נפקא מינה'],
    ['רעיון', 'נפקא מינה', 'רעיון בלי נפקא מינה – רק רעיון'],
    ['מבחן', 'מזגן', 'אין מבחן בלי מזגן'],
    ['דדליין', 'חמין', 'שניהם מתבשלים כל הלילה'],
    ['ערב', 'רעב', 'שיעור ערב – חייב בכריך'],
    ['בוקר', 'קרח', 'לכן בבוקר כולם קפואים במקום'],
    ['קפה', 'פיצה', 'מה שהקפה לא עושה – הפיצה עושה'],
    ['תירוץ', 'נשנוש', 'על כל תירוץ – נשנוש'],
    ['חופש', 'שולחן', 'בחופש רק השולחן נשאר ללמוד'],
    ['שיר', 'תיק', 'תיק בלי שיר – כבד פי שניים'],
    ['פתק', 'ממתק', 'פתק שעובר בכיתה – מתוק'],
    ['חלום', 'עוגה', 'החלום של כל סוף שיעור'],
    ['בדיחה', 'חגיגה', 'בדיחה טובה – חגיגה לכל הכיתה'],
    ['סלפי', 'ליצן', 'מי שעושה סלפי בשיעור – ליצן הכיתה'],
    ['סיכום', 'לימון', 'סיכום שלא כתבת – תמיד חמוץ'],
    ['עוד רגע', 'שמחה', 'השמחה הכי גדולה: עוד רגע הפעמון'],
    ['שבוע', 'שובע', 'שבוע טוב מתחיל בשובע'],
    ['סוף שנה', 'תמונה', 'סוף שנה בלי תמונה – כאילו לא היה'],
    ['יום הולדת', 'סוף שנה', 'כל סוף שנה הוא יום הולדת למחזור'],
    ['שעון', 'מפורסם', 'מי שמסתכל בשעון – מפורסם בכיתה'],
    ['בוקר טוב', 'סרטון', 'כל בוקר טוב מתחיל בסרטון בקבוצה'],
    ['חבר', 'נעליים', 'חבר טוב כמו נעליים: הולך איתך לכל מקום'],
    ['חולצה', 'קוגל', 'לכן הקוגל תמיד נשפך על החולצה'],
    ['חומוס', 'מסך', 'אוכלים חומוס מול המסך'],
    ['הכול טוב', 'לחם', 'יש לחם – הכול טוב'],
    ['מדים', 'מזל טוב', 'מי שלבש מדים – מזל טוב'],
    ['בוץ', 'לחיים', 'אחרי הטיול בבוץ – לחיים'],
    ['ס"ט', 'סוד', 'מחזור ס"ט עם הכולל – זה כל הסוד', 1]
  ];
  function gems() {
    return GEMS.map(function (g) {
      var a = textVal(g[0]), b = textVal(g[1]);
      return { a: g[0], t: g[1], n: b, k: a !== b, punch: g[2], ok: g[3] ? Math.abs(a - b) === 1 : a === b };
    }).filter(function (g) { return g.ok; });
  }
  function uniq(a) { var s = {}; return a.filter(function (x) { if (s[x]) return false; s[x] = 1; return true; }); }

  /* הצעות: מילים בודדות וצירופי שתי מילים בעלי אותו מספר. diff = 1 מאפשר "עם הכולל" */
  function find(seed, extra, withKolel) {
    var sw = parse(seed), n = textVal(seed), key = sw.join(' ');
    var bank = uniq(BANK.concat((extra || []).map(function (x) { return parse(x).join(' '); }).filter(Boolean)))
      .filter(function (w) { return w !== key && !banned(parse(w)); });
    var vals = bank.map(function (w) { return textVal(w); });
    var single = [], pairs = [], seen = {};
    function ok(v, d) { return v === n || (d && (v === n - 1 || v === n + 1)); }
    bank.forEach(function (w, i) { if (ok(vals[i], withKolel)) single.push({ t: w, n: vals[i], k: vals[i] !== n }); });
    for (var i = 0; i < bank.length; i++) {
      if (vals[i] >= n) continue;
      for (var j = 0; j < bank.length; j++) {
        if (i === j) continue;
        var s = vals[i] + vals[j];
        if (!ok(s, withKolel)) continue;
        var t = bank[i] + ' ' + bank[j], sk = [bank[i], bank[j]].sort().join('|');
        if (t === key || seen[sk]) continue;
        seen[sk] = 1; pairs.push({ t: t, n: s, k: s !== n });
        if (pairs.length >= 400) i = bank.length;
      }
    }
    /* עדיפות לצירופים אמיתיים בלי "כולל", ואז לפי אורך קצר */
    var cmp = function (a, b) { return (a.k - b.k) || (a.t.length - b.t.length) || (a.t < b.t ? -1 : 1); };
    single.sort(cmp); pairs.sort(cmp);
    return { n: n, single: single, pairs: pairs, words: sw };
  }

  /* שורה מוכנה להדבקה עם החישוב המלא */
  function line(seed, hit) {
    var sw = parse(seed).join(' ');
    return sw + ' (' + calc(sw) + ' = ' + textVal(sw) + ') ' + (hit.k ? 'עם הכולל ' : 'בגימטריא ') + hit.t + ' (' + hit.n + ')' + (hit.punch ? ' – ' + hit.punch : ' – רמז לכך ש…');
  }

  SH.gim = { gems: gems, parse: parse, value: textVal, calc: calc, find: find, line: line, bank: BANK };

  /* ---------- רכיב ממשק משותף ----------
     host: אלמנט ריק. o = { seed: ()=>טקסט התחלתי, insert: (hit, line, seed)=>void, hint: טקסט } */
  SH.gimBox = function (host, o) {
    var shown = 12, extra = [], kolel = false, last = null;
    host.innerHTML = '<h2>' + esc(o.title || 'גימטריות מצחיקות') + '</h2>' +
      '<p class="msg">' + esc(o.hint || 'כותבים מילה או שם של תופעה, והמערכת מוצאת מילים וצירופים עם אותו מספר. לוחצים על הצעה והיא נכנסת עם החישוב המלא.') + ' ' +
      'החישוב כמו בכלי הגימטריה: <a href="https://hakelim.com/kodesh/gimatria/" target="_blank" rel="noopener">hakelim.com/kodesh/gimatria</a>.</p>' +
      '<h3>מוכנות ונבדקות</h3><div class="sh-gimchips gim-gems">' + gems().map(function (g, i) { return '<button type="button" class="btn btn-sm btn-line" data-gem="' + i + '"><bdi>' + esc(g.a) + '</bdi> = <bdi>' + esc(g.t) + '</bdi> <small>' + g.n + (g.k ? ' · עם הכולל' : '') + '</small></button>'; }).join('') + '</div>' +
      '<h3>למצוא גימטריה למילה שלכם</h3>' +
      '<div class="sh-row"><label class="field">המילה או הצירוף<input class="gim-in" maxlength="60" placeholder="למשל: קפה"></label>' +
      '<label class="sh-check"><input type="checkbox" class="gim-k"> גם "עם הכולל" (פלוס או מינוס אחד)</label></div>' +
      '<label class="field">מילים משלכם לבנק (מופרדות בפסיק, לא חובה)<input class="gim-x" maxlength="200" placeholder="למשל: דדליין, סדר ב, מסיבת סיום"></label>' +
      '<div class="gim-val msg" aria-live="polite"></div><div class="sh-gimchips gim-res"></div>';
    var G = gems();
    host.querySelectorAll('[data-gem]').forEach(function (b) { b.onclick = function () { var g = G[+b.getAttribute('data-gem')]; o.insert(g, line(g.a, g), g.a); }; });
    var inp = $('.gim-in', host), kk = $('.gim-k', host), xx = $('.gim-x', host), val = $('.gim-val', host), res = $('.gim-res', host);
    function seed() { return inp.value.trim(); }
    function paint() {
      var s = seed();
      if (!parse(s).length) { val.textContent = ''; res.innerHTML = ''; last = null; return; }
      if (banned(parse(s))) { val.textContent = 'שמות קודש לא נכנסים לגימטריות מצחיקות. מנסים מילה אחרת.'; res.innerHTML = ''; return; }
      var r = last = find(s, xx.value.split(/[,،]/).map(function (x) { return x.trim(); }), kolel);
      val.innerHTML = '<bdi>' + esc(r.words.join(' ')) + '</bdi> = <b>' + r.n + '</b> <small>(' + esc(calc(s)) + ')</small>';
      var all = r.single.map(function (h) { h.kind = 'מילה'; return h; }).concat(r.pairs.map(function (h) { h.kind = 'צירוף'; return h; }));
      if (!all.length) { res.innerHTML = '<p class="msg">לא נמצא כלום עם המספר ' + r.n + '. אפשר להוסיף מילים משלכם, לסמן "עם הכולל" או לנסות מילה אחרת.</p>'; return; }
      res.innerHTML = all.slice(0, shown).map(function (h, i) {
        return '<button type="button" class="btn btn-sm btn-line" data-gi="' + i + '"><bdi>' + esc(h.t) + '</bdi> <small>' + h.n + (h.k ? ' · עם הכולל' : '') + '</small></button>';
      }).join('') + (all.length > shown ? '<button type="button" class="btn btn-sm btn-gold" data-more="1">עוד הצעות (' + (all.length - shown) + ')</button>' : '');
      res.querySelectorAll('[data-gi]').forEach(function (b) {
        b.onclick = function () { var h = all[+b.getAttribute('data-gi')]; o.insert(h, line(s, h), s); };
      });
      var m = res.querySelector('[data-more]'); if (m) m.onclick = function () { shown += 12; paint(); };
    }
    inp.addEventListener('input', function () { shown = 12; paint(); });
    xx.addEventListener('input', function () { shown = 12; paint(); });
    kk.addEventListener('change', function () { kolel = kk.checked; shown = 12; paint(); });
    var s0 = o.seed ? String(o.seed() || '').trim() : '';
    if (s0) inp.value = s0.slice(0, 60);
    host.refresh = function () { var s1 = o.seed ? String(o.seed() || '').trim() : ''; if (s1 && !inp.value.trim()) inp.value = s1.slice(0, 60); paint(); };
    paint();
    return host;
  };
})();
