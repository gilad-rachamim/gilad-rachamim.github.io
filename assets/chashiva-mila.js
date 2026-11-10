// מילה ביום – /kelim/chashiva/mila/
// מנחשים מילה בת חמש אותיות בשישה ניסיונות. זהב = האות במקום, טורקיז = האות במילה אבל במקום אחר.
// לכל מילה יש הגדרה קצרה: אפשר לבקש אותה כרמז, והיא מופיעה בסוף בכל מקרה.
(function () {
  'use strict';
  var CH = window.CH, TOOL = 'chashiva_mila', G = 'mila';
  function $(id) { return document.getElementById(id); }
  if (!$('ml-grid')) return;

  var WORDS = [
    ['שולחן', 'רהיט שאוכלים עליו'], ['מחברת', 'כותבים בה בכיתה'], ['מטריה', 'שומרת עליכם מהגשם'], ['תלמיד', 'לומד בבית הספר'],
    ['חנוכה', 'חג האורים'], ['משפחה', 'הורים, ילדים, סבים וסבתות'], ['ארנבת', 'חיה עם אוזניים ארוכות'], ['גלידה', 'קינוח קר בגביע'],
    ['עוגיה', 'מאפה קטן ופריך'], ['מקלחת', 'מתרחצים בה בבוקר או בערב'], ['מרפסת', 'יוצאים אליה מהסלון לאוויר'], ['מדרגה', 'עולים עליה, אחת אחרי השנייה'],
    ['צפרדע', 'קופצת ליד הבריכה ומקרקרת'], ['דבורה', 'מייצרת דבש, וגם נביאה'], ['קופסה', 'שמים בה דברים וסוגרים במכסה'], ['מעטפה', 'שמים בה מכתב'],
    ['תרמיל', 'תיק על הגב לטיול'], ['מצלמה', 'מצלמים בה תמונות'], ['טלפון', 'מתקשרים בו'], ['מקלדת', 'מקלידים בה מול המחשב'],
    ['מסגרת', 'שמים בה תמונה על הקיר'], ['תמונה', 'תולים אותה על הקיר'], ['סיפור', 'מספרים אותו לפני השינה'], ['שיעור', 'לומדים בו בכיתה'],
    ['ספרות', 'שירים, רומנים וסיפורים'], ['חשבון', 'פלוס, מינוס, כפול וחילוק'], ['הנדסה', 'משולשים, ריבועים ועיגולים'], ['מעיין', 'מים שנובעים מהאדמה'],
    ['שקיעה', 'השמש יורדת בערב'], ['זריחה', 'השמש עולה בבוקר'], ['ארוחה', 'בוקר, צהריים או ערב'], ['סעודה', 'ארוחה חגיגית, כמו בשבת'],
    ['חביתה', 'ביצה מטוגנת במחבת'], ['קציצה', 'מכינים אותה מבשר טחון'], ['פלאפל', 'כדורים מחומוס בפיתה'], ['חומוס', 'ממרח מגרגרים, עם טחינה'],
    ['טחינה', 'רוטב משומשום'], ['בורקס', 'מאפה עלים עם גבינה או תפוחי אדמה'], ['לביבה', 'מטגנים אותה בחנוכה'], ['מנורה', 'מדליקים אותה כשחשוך'],
    ['פתילה', 'דולקת בתוך השמן'], ['סוכות', 'חג שיושבים בו בחוץ'], ['פורים', 'חג עם תחפושות ומשלוחי מנות'], ['מגילה', 'קוראים אותה בפורים'],
    ['תפילה', 'שחרית, מנחה או ערבית'], ['סידור', 'מתפללים מתוכו'], ['מזוזה', 'קובעים אותה על המשקוף'], ['חתונה', 'חופה, כלה וחתן'],
    ['הזמנה', 'מקבלים אותה לפני אירוע'], ['חגיגה', 'שמחה גדולה עם הרבה אנשים'], ['ריקוד', 'זזים לפי המוזיקה'], ['גיטרה', 'כלי נגינה עם שישה מיתרים'],
    ['שחייה', 'עושים אותה בבריכה או בים'], ['משאית', 'רכב גדול שמוביל סחורה'], ['אוניה', 'שטה בים, גדולה מסירה'], ['רמזור', 'אדום, צהוב וירוק'],
    ['מדרכה', 'הולכים עליה לצד הכביש'], ['שכונה', 'כמה רחובות קרובים בעיר'], ['מרפאה', 'הולכים אליה כשלא מרגישים טוב'], ['תרופה', 'לוקחים אותה כדי להבריא'],
    ['חיסון', 'זריקה שמגינה ממחלה'], ['שמיכה', 'מתכסים בה בלילה'], ['מגירה', 'נפתחת מתוך השולחן או הארון'], ['מברשת', 'מצחצחים בה שיניים'],
    ['מכונה', 'עושה עבודה במקומנו'], ['כביסה', 'בגדים שצריך לנקות'], ['מטאטא', 'מנקים איתו את הרצפה'], ['קניון', 'הרבה חנויות תחת גג אחד'],
    ['עבודה', 'הולכים אליה בבוקר ומקבלים משכורת'], ['פגישה', 'נפגשים בה בשעה שקבענו'], ['מחשבה', 'עוברת לכם בראש'], ['רעיון', 'פתאום עולה לכם בראש'],
    ['תקווה', 'מחכים ומאמינים שיהיה טוב'], ['אמונה', 'בטחון במה שלא רואים'], ['שלווה', 'שקט ורוגע בלב'], ['חברות', 'הקשר בין חברים טובים'],
    ['נשיקה', 'נותנים אותה על הלחי'], ['חיבוק', 'עוטפים מישהו בידיים'], ['גבורה', 'אומץ גדול ברגע קשה'], ['חירות', 'יוצאים מעבדות אליה בפסח'],
    ['מדינה', 'יש לה דגל, המנון וגבולות'], ['ממשלה', 'ראש הממשלה והשרים'], ['חיילת', 'משרתת בצבא'], ['שמירה', 'עומדים בה בלילה כדי שכולם יישנו בשקט'],
    ['ארמון', 'מלך גר בו'], ['נסיכה', 'בת של מלך'], ['דרקון', 'יצור מהאגדות שיורק אש'], ['פיראט', 'שודד ים עם רטייה'],
    ['מנעול', 'נפתח רק עם מפתח'], ['ציפור', 'עפה ושרה על העץ'], ['ינשוף', 'ציפור שערה בלילה'], ['תמנון', 'יצור ימי עם שמונה זרועות'],
    ['מדוזה', 'שקופה בים, ועוקצת'], ['עכביש', 'טווה רשת'], ['שבלול', 'זוחל לאט עם הבית על הגב'], ['תולעת', 'חיה באדמה וגם בתפוח'],
    ['שושנה', 'פרח עם קוצים, ושם של בת'], ['חרצית', 'פרח צהוב-לבן בשדה'], ['כלנית', 'פרח אדום של החורף בישראל'], ['נרקיס', 'פרח לבן וריחני בחורף'],
    ['רימון', 'פרי עם הרבה גרעינים אדומים'], ['ענבים', 'גדלים באשכולות על הגפן'], ['אבטיח', 'פרי ירוק מבחוץ ואדום מבפנים'], ['שמרים', 'שמים בבצק כדי שיתפח'],
    ['קינוח', 'מגיע בסוף הארוחה, ומתוק'], ['ספרים', 'יש הרבה מהם בספרייה'], ['גינון', 'שותלים, משקים ומטפחים'], ['מסיבה', 'מוזיקה, חברים ושמחה'],
    ['טיסות', 'ממריאים בהן לחו"ל'], ['מזרון', 'שוכבים עליו במיטה']
  ].filter(function (w) { return w[0].length === 5; });
  var FIN = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }, TOFIN = { 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' };
  function norm(s) { return s.replace(/[ךםןףץ]/g, function (c) { return FIN[c]; }); }
  function show(ch, pos) { return pos === 4 && TOFIN[ch] ? TOFIN[ch] : ch; }
  var ORDER = CH.shuffle(WORDS, CH.rng('mila-order-v1'));

  // ---------- מצב ----------
  var data = CH.load(G); data.dist = data.dist || [0, 0, 0, 0, 0, 0, 0];
  var W = null, guesses = [], cur = '', won = false, lost = false, mode = 'daily', hint = false, keys = {};
  function say(t) { $('ml-msg').textContent = t || ''; }
  function persist() {
    var s = CH.load(G); s.dist = data.dist;
    s.cur = { key: W.key, g: guesses, h: hint, done: won || lost };
    data.cur = s.cur; CH.save(G, s);
  }
  function start(m) {
    mode = m; guesses = []; cur = ''; won = false; lost = false; hint = false; keys = {}; $('ml-win').innerHTML = ''; say('');
    var key, w;
    if (m === 'daily') { var i = (CH.dayNum() - 1) % ORDER.length; if (i < 0) i += ORDER.length; w = ORDER[i]; key = 'mila-daily-' + CH.today(); }
    else { w = WORDS[Math.floor(Math.random() * WORDS.length)]; key = 'mila-practice-' + Date.now(); }
    W = { word: norm(w[0]), raw: w[0], clue: w[1], key: key };
    var sv = data.cur;
    if (m === 'daily' && sv && sv.key === key) { guesses = sv.g || []; hint = !!sv.h; guesses.forEach(function (g) { score(g).forEach(function (s, k) { mark(g[k], s); }); }); won = guesses.indexOf(W.word) > -1; lost = !won && guesses.length >= 6; }
    $('ml-label').textContent = m === 'daily' ? 'המילה של היום · #' + CH.dayNum() : 'תרגול · מילה אקראית';
    $('ml-clue').hidden = !hint; $('ml-clue').textContent = '💡 ' + W.clue;
    draw();
    if (won || lost) { say(won ? 'פתרתם את המילה של היום ✓ מחר מחכה מילה חדשה.' : 'המילה של היום הייתה: ' + W.raw + '. מחר מחכה מילה חדשה.'); $('ml-clue').hidden = false; }
    persist();
  }

  // ---------- ניקוד: זהב = במקום, טורקיז = במילה, כהה = לא במילה ----------
  function score(g) {
    var res = [0, 0, 0, 0, 0], left = {};
    for (var i = 0; i < 5; i++) { if (g[i] === W.word[i]) res[i] = 2; else left[W.word[i]] = (left[W.word[i]] || 0) + 1; }
    for (var j = 0; j < 5; j++) if (res[j] !== 2 && left[g[j]]) { res[j] = 1; left[g[j]]--; }
    return res;
  }
  function mark(ch, s) { if ((keys[ch] || -1) < s) keys[ch] = s; }

  // ---------- ציור ----------
  var CLS = ['no', 'in', 'ok'];
  function draw() {
    var h = '';
    for (var r = 0; r < 6; r++) {
      var g = guesses[r], sc = g ? score(g) : null, row = g || (r === guesses.length ? cur : '');
      h += '<div class="ml-row' + (r === guesses.length && !won && !lost ? ' now' : '') + '">';
      for (var c = 0; c < 5; c++) h += '<span class="' + (sc ? CLS[sc[c]] : row[c] ? 'typed' : '') + '">' + (row[c] ? show(row[c], c) : '') + '</span>';
      h += '</div>';
    }
    $('ml-grid').innerHTML = h;
    $('ml-kb').querySelectorAll('[data-l]').forEach(function (b) {
      var l = norm(b.getAttribute('data-l')); if (l.length !== 1) return;
      b.className = keys[l] === 2 ? 'ok' : keys[l] === 1 ? 'in' : keys[l] === 0 ? 'no' : '';
    });
    $('ml-hint').disabled = hint || won || lost;
  }

  // ---------- קלט ----------
  var startedUse = false;
  function type(ch) { if (won || lost || cur.length >= 5) return; cur += norm(ch); draw(); }
  function back() { if (won || lost) return; cur = cur.slice(0, -1); draw(); }
  function enter() {
    if (won || lost) return;
    if (cur.length < 5) { say('צריך חמש אותיות'); shake(); return; }
    if (!startedUse) { startedUse = true; CH.used(TOOL, 'start', { mode: mode }); }
    var g = cur; guesses.push(g); cur = '';
    score(g).forEach(function (s, k) { mark(g[k], s); });
    won = g === W.word; lost = !won && guesses.length >= 6;
    draw(); persist(); say('');
    if (won || lost) finish();
  }
  function shake() { var r = $('ml-grid').querySelector('.now'); if (!r) return; r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake'); }
  $('ml-kb').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var k = b.getAttribute('data-l');
    if (k === 'del') back(); else if (k === 'enter') enter(); else type(k);
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input,textarea,select')) return;
    if (/^[א-ת]$/.test(e.key)) { type(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { back(); e.preventDefault(); }
    else if (e.key === 'Enter') { enter(); e.preventDefault(); }
  });
  $('ml-hint').onclick = function () { if (hint || won || lost) return; hint = true; $('ml-clue').hidden = false; draw(); persist(); CH.used(TOOL, 'hint', { mode: mode }); };

  // ---------- סיום ----------
  function finish() {
    $('ml-clue').hidden = false;
    var daily = mode === 'daily', st = CH.stats(G);
    if (won) { st = CH.record(G, daily, 1); if (daily) data.dist[guesses.length - 1]++; }
    else if (daily) data.dist[6]++;
    persist();
    CH.used(TOOL, won ? 'solve' : 'fail', { mode: mode, tries: guesses.length, hint: hint ? 1 : 0 });
    var dots = guesses.map(function (g) { return score(g).map(function (s) { return ['⚫', '🔵', '🟡'][s]; }).join(''); }).join('\n');
    var share = '🔤 מילה ביום' + (daily ? ' #' + CH.dayNum() : ' · תרגול') + '\n' + (won ? 'הצלחתי ב-' + guesses.length + ' מתוך 6' : 'הפעם לא הצלחתי') + (hint ? ' (עם רמז)' : '') + '\n' + dots + (daily && won && st.streak ? '\n🔥 רצף ' + CH.days(st.streak) : '') + '\nמה איתכם? 😉';
    var max = Math.max.apply(0, data.dist) || 1;
    var bars = '<div class="ml-dist"><b>הניחושים שלכם במילה היומית</b>' + data.dist.map(function (n, i) {
      return '<div><span>' + (i < 6 ? i + 1 : '✕') + '</span><i style="width:' + Math.max(6, Math.round(n / max * 100)) + '%"' + (won && daily && i === guesses.length - 1 ? ' class="me"' : '') + '>' + n + '</i></div>';
    }).join('') + '</div>';
    var next = [{ label: daily ? 'לתרגל עוד מילה ←' : 'עוד מילה לתרגול', fn: function () { tab('practice'); } }];
    CH.win({ tool: TOOL, el: $('ml-win'), daily: daily && won, stats: st,
      title: won ? (guesses.length <= 2 ? 'מדהים! 🎉' : guesses.length <= 4 ? 'יפה מאוד! 🎉' : 'הצלחתם! 🎉') : 'כמעט! המילה הייתה ' + W.raw,
      line: '<span>המילה: <b>' + W.raw + '</b></span><span>' + W.clue + '</span>',
      extra: daily ? bars : '', share: share, next: next });
  }

  // ---------- לשוניות ----------
  function tab(m) {
    document.querySelectorAll('#ml-tabs button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute('data-m') === m); });
    start(m);
  }
  document.querySelectorAll('#ml-tabs button').forEach(function (b) { b.onclick = function () { tab(b.getAttribute('data-m')); }; });
  tab('daily');
})();
