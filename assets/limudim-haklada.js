/* הקלדה עיוורת בעברית – הכלים של גילעד רחמים */
(function () {
  var app = document.getElementById('hk'); if (!app) return;
  var ROWS = [['/', "'", 'ק', 'ר', 'א', 'ט', 'ו', 'ן', 'ם', 'פ'], ['ש', 'ד', 'ג', 'כ', 'ע', 'י', 'ח', 'ל', 'ך', 'ף'], ['ז', 'ס', 'ב', 'ה', 'נ', 'מ', 'צ', 'ת', 'ץ']];
  var LAT = { q: '/', w: "'", e: 'ק', r: 'ר', t: 'א', y: 'ט', u: 'ו', i: 'ן', o: 'ם', p: 'פ', a: 'ש', s: 'ד', d: 'ג', f: 'כ', g: 'ע', h: 'י', j: 'ח', k: 'ל', l: 'ך', ';': 'ף', z: 'ז', x: 'ס', c: 'ב', v: 'ה', b: 'נ', n: 'מ', m: 'צ', ',': 'ת', '.': 'ץ' };
  var LESSONS = [
    { n: 'שורת הבית: כ ח', l: 'כח' }, { n: 'שורת הבית: ג ל ד ך', l: 'כחגלדך' }, { n: 'כל שורת הבית', l: 'שדגכעיחלךף' },
    { n: 'שורה עליונה: ר א ט ו', l: 'שדגכעיחלךףראטו' }, { n: 'שורה עליונה: ק ן ם פ', l: 'שדגכעיחלךףראטוקןםפ' },
    { n: 'שורה תחתונה: ה נ ב מ', l: 'שדגכעיחלךףראטוקןםפהנבמ' }, { n: 'כל האותיות', l: 'שדגכעיחלךףראטוקןםפהנבמזסצתץ' }, { n: 'משפטים', l: '' }
  ];
  var WORDS = 'של את על לא כי גם אם כל אני הוא היא זה מה יש אין עם אל עד רק כך לך לי שלך שלי יד דג גל חג כד חלב לחם ילד ילדה דלי גדי שיר שיחה עכשיו יחד כלב גדול חכם שלג כיף ליל לילה עיר עלה עלי דוד רחל ראש אור טוב יום רגע רגל אחד אחר אוכל אהבה תודה בית ספר מים שמש שלום ברוך מורה מחר היום אתמול שבת חדש חדשה טלפון מחשב מקלדת ילדים אמא אבא סבא סבתא חבר חברה משפחה דרך רחוב גן גינה עץ פרח ים נהר הר שמים כוכב ירח בוקר ערב צהריים שעה דקה שנה חודש שבוע ספרים מחברת עט עיפרון לוח כיתה תלמיד תלמידה מבחן ציון שאלה תשובה ארץ ישראל ירושלים חיפה עבודה כסף זמן רעיון מילה משפט אות אותיות שם ראשון שני שלישי רביעי חמישי שישי קפה תה חלה עוגה פיתה סלט מרק שולחן כיסא חלון דלת קיר מדף מטבח חדר מיטה'.split(' ');
  var SENT = ['שלום לכולם, היום לומדים להקליד בלי להסתכל על המקלדת.', 'האצבעות נחות על שורת הבית: ש ד ג כ ביד שמאל, ח ל ך ף ביד ימין.', 'מי שמתרגל עשר דקות ביום מקליד מהר יותר בתוך שבועיים.', 'ירושלים היא עיר עתיקה ויפה, ויש בה הרבה היסטוריה.', 'בבוקר שותים קפה, אוכלים לחם עם גבינה ויוצאים לעבודה.', 'הילדים שיחקו בגינה עד שהשמש שקעה מאחורי ההרים.', 'כדאי לשבת זקוף, להניח את הידיים בעדינות ולנשום לאט.', 'הספר הזה מספר על משפחה שעברה לגור בכפר קטן ליד הים.'];
  var kb = document.getElementById('hk-kb'), tgt = document.getElementById('hk-target'), inp = document.getElementById('hk-in'), sel = document.getElementById('hk-lesson'),
      stat = document.getElementById('hk-stat'), out = document.getElementById('hk-res'), hint = document.getElementById('hk-hint');
  var text = '', t0 = 0, keys = 0, errs = 0, firstUse = true, lastLen = 0;
  sel.innerHTML = LESSONS.map(function (l, n) { return '<option value="' + n + '">' + (n + 1) + '. ' + l.n + '</option>'; }).join('');
  try { var sv = +localStorage.getItem('haklada-lesson'); if (sv >= 0 && sv < LESSONS.length) sel.value = sv; } catch (e) {}
  kb.innerHTML = ROWS.map(function (r, n) { return '<div class="hk-row r' + n + '">' + r.map(function (k) { return '<span data-k="' + k + '"' + ((k === 'כ' || k === 'ח') ? ' class="bump"' : '') + '>' + k + '</span>'; }).join('') + '</div>'; }).join('') +
    '<div class="hk-row r3"><span data-k=" " class="space">רווח</span></div>';
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function line() {
    var L = LESSONS[+sel.value];
    if (!L.l) return rnd(SENT);
    var ok = WORDS.filter(function (w) { for (var j = 0; j < w.length; j++) if (L.l.indexOf(w[j]) < 0) return false; return true; }), out = [];
    for (var j = 0; j < 8; j++) {
      if (ok.length >= 6 && Math.random() < .75) out.push(rnd(ok));
      else { var w = '', n = 2 + Math.floor(Math.random() * 3); while (w.length < n) w += rnd(L.l); out.push(w); }
    }
    return out.join(' ');
  }
  function fresh() { text = line(); inp.value = ''; lastLen = 0; t0 = 0; keys = 0; errs = 0; out.hidden = true; paint(); }
  function paint() {
    var v = inp.value, h = '';
    for (var j = 0; j < text.length; j++) {
      var c = text[j] === ' ' ? '&nbsp;' : text[j];
      if (j < v.length) h += '<span class="' + (v[j] === text[j] ? 'g' : 'b') + '">' + (v[j] !== text[j] && text[j] === ' ' ? '·' : c) + '</span>';
      else h += '<span' + (j === v.length ? ' class="cur"' : '') + '>' + c + '</span>';
    }
    tgt.innerHTML = h;
    var nx = text[v.length] || '';
    kb.querySelectorAll('[data-k]').forEach(function (s) { s.classList.toggle('next', s.dataset.k === nx); });
    var sec = t0 ? (Date.now() - t0) / 1000 : 0, good = 0;
    for (var j = 0; j < v.length; j++) if (v[j] === text[j]) good++;
    var wpm = sec > 2 ? Math.round(good / 5 / (sec / 60)) : 0, acc = keys ? Math.round((keys - errs) / keys * 100) : 100;
    stat.textContent = 'מהירות: ' + wpm + ' מילים לדקה · דיוק: ' + acc + '%';
    return { wpm: wpm, acc: acc };
  }
  inp.addEventListener('input', function () {
    var v = inp.value;
    if (/[a-z]/i.test(v.slice(-1))) { hint.hidden = false; var fix = LAT[v.slice(-1).toLowerCase()]; if (fix) inp.value = v = v.slice(0, -1) + fix; } else if (/[א-ת]/.test(v.slice(-1))) hint.hidden = true;
    if (!t0 && v.length) { t0 = Date.now(); if (firstUse) { firstUse = false; try { window.toolUsed && window.toolUsed('limudim_haklada', { how: 'start' }); } catch (e) {} } }
    if (v.length > lastLen) { keys++; if (v[v.length - 1] !== text[v.length - 1]) errs++; }
    lastLen = v.length;
    var r = paint();
    if (v.length >= text.length) done(r);
  });
  function done(r) {
    var best = 0; try { best = +localStorage.getItem('haklada-best') || 0; if (r.acc >= 90 && r.wpm > best) localStorage.setItem('haklada-best', r.wpm); localStorage.setItem('haklada-lesson', sel.value); } catch (e) {}
    out.hidden = false;
    out.innerHTML = '<h3>' + (r.acc >= 95 ? 'מצוין!' : r.acc >= 85 ? 'יפה מאוד' : 'לאט ובדיוק, המהירות תבוא') + '</h3><p class="big">' + r.wpm + ' <span class="g">מילים לדקה</span></p><ul><li>דיוק: ' + r.acc + '%</li>' +
      (r.acc >= 90 && r.wpm > best && best ? '<li>🏆 שיא אישי חדש! הקודם היה ' + best + '.</li>' : best ? '<li>השיא שלכם: ' + Math.max(best, r.acc >= 90 ? r.wpm : 0) + ' מילים לדקה.</li>' : '') +
      '</ul><div class="hk-btns"><button class="btn btn-gold" type="button" id="hk-again">שורה הבאה ←</button>' + (+sel.value < LESSONS.length - 1 && r.acc >= 90 ? ' <button class="btn btn-line" type="button" id="hk-up">לשיעור הבא</button>' : '') + '</div>';
    inp.blur();
  }
  app.addEventListener('click', function (e) {
    if (e.target.id === 'hk-again') { fresh(); inp.focus(); }
    if (e.target.id === 'hk-up') { sel.value = +sel.value + 1; fresh(); inp.focus(); }
    if (e.target.closest('#hk-target')) inp.focus();
  });
  sel.addEventListener('change', function () { try { localStorage.setItem('haklada-lesson', sel.value); } catch (e) {} fresh(); inp.focus(); });
  inp.addEventListener('paste', function (e) { e.preventDefault(); });
  fresh();
})();
