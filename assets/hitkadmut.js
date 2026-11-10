// התקדמות עדינה לכלים שחוזרים אליהם כל יום (כרטיסיות, לימוד יומי, תהילים ועוד).
// אותו רעיון כמו במשחקי החשיבה (assets/chashiva.js), בגרסה רכה:
// רצף ימים, יעד שבועי לבחירה (3/5/7 ימים), תג על כל שבוע שהושלם, וחלון קטן אחרי הצלחה
// עם בקשה חמה לשתף ולתמוך. בלי "פספסת", בלי מספר ימים שהוחמצו, בלי אדום.
// הכול נשמר רק בטלפון (localStorage hitkadmut-<key>).
//
// שימוש בדף:  <p class="hk-strip" data-hk="kartisiot" data-goal="5" data-tool="kartisiot" data-what="חזרה"></p>
//             data-gentle="1" = בלי רצף ובלי יעד, רק "כל יום שחזרת נחשב" (לכלי נפש). data-verb / data-pill משנים את המילים.
// בקוד הכלי:  window.HK && HK.done('kartisiot', { el: winBox, title: 'כל הכבוד!', share: 'טקסט לשיתוף' });
(function () {
  'use strict';
  if (window.HK) return;
  var HK = window.HK = {};

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function key(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function sunday() { var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d; }
  HK.today = function () { return key(); };
  HK.days = function (n) { return n === 1 ? 'יום אחד' : n === 2 ? 'יומיים' : n + ' ימים'; };

  HK.load = function (k) { try { return JSON.parse(localStorage.getItem('hitkadmut-' + k) || '{}') || {}; } catch (e) { return {}; } };
  HK.save = function (k, o) { try { localStorage.setItem('hitkadmut-' + k, JSON.stringify(o)); } catch (e) {} };

  function streakOf(days) {
    var n = 0, d = new Date();
    if (!days[key(d)]) d.setDate(d.getDate() - 1); // עוד לא היום – הרצף של אתמול עדיין חי
    while (days[key(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function goalOf(k, def) { var s = HK.load(k); return s.goal || def || 5; }

  HK.stats = function (k, defGoal) {
    var s = HK.load(k), days = s.days || {}, wk = key(sunday());
    var week = Object.keys(days).filter(function (d) { return d >= wk; }).length;
    var goal = goalOf(k, defGoal);
    return {
      streak: streakOf(days), best: s.best || 0, total: Object.keys(days).length + (s.older || 0),
      today: !!days[key()], week: week, goal: goal, weekDone: week >= goal,
      badges: Object.keys(s.badges || {}).length, weekKey: wk
    };
  };

  // רושם שהיום היה יום של לימוד. מחזיר {first: האם זו הפעם הראשונה היום, earned: האם הושלם עכשיו היעד השבועי, st}
  HK.mark = function (k, defGoal, tool) {
    var s = HK.load(k), t = key(), first = false, earned = false;
    s.days = s.days || {};
    if (!s.days[t]) {
      first = true; s.days[t] = 1;
      var ks = Object.keys(s.days).sort();
      while (ks.length > 400) { delete s.days[ks.shift()]; s.older = (s.older || 0) + 1; }
      s.best = Math.max(s.best || 0, streakOf(s.days));
      if (!s.goal) s.goal = defGoal || 5;
      HK.save(k, s);
      var st0 = HK.stats(k, defGoal);
      if (st0.weekDone) {
        s = HK.load(k); s.badges = s.badges || {};
        if (!s.badges[st0.weekKey]) { s.badges[st0.weekKey] = 1; earned = true; HK.save(k, s); }
      }
      used(tool || k, 'streak_day', { streak: st0.streak, week: st0.week });
      if (earned) used(tool || k, 'badge', { goal: st0.goal });
    }
    HK.render();
    return { first: first, earned: earned, st: HK.stats(k, defGoal) };
  };

  function used(tool, how, extra) { if (window.toolUsed) window.toolUsed(tool, Object.assign({ how: how }, extra || {})); }

  // ---------- השורה הקטנה בראש הכלי ----------
  var ALL_LINK = ' <a class="hk-all" href="/kelim/hitkadmut/">כל ההתקדמות שלי ›</a>';
  function lineHTML(el) {
    var k = el.getAttribute('data-hk'), def = +el.getAttribute('data-goal') || 5, st = HK.stats(k, def);
    var what = el.getAttribute('data-what') || 'לימוד';
    if (el.getAttribute('data-gentle')) {
      if (!st.total) return '🌱 כל יום שחוזרים לכאן נחשב. בלי לחץ, בקצב שלכם.';
      return '🌱 ' + (el.getAttribute('data-verb') || 'חזרתם לכאן') + ' ' + HK.days(st.total) + (st.week ? ' · השבוע: ' + HK.days(st.week) : '') + '. כל יום נחשב, וכל חזרה היא התחלה חדשה.' + ALL_LINK;
    }
    var parts = [];
    if (!st.total) parts.push('🌱 כל יום של ' + what + ' נספר כאן');
    else if (st.streak >= 2) parts.push('🔥 ' + HK.days(st.streak) + ' ברצף' + (st.today ? ' ✓' : ' · היום ממשיכים'));
    else if (st.streak === 1 && st.today) parts.push(st.total > 1 ? '💪 יום ראשון ברצף חדש' : '🔥 יום ראשון ✓');
    else if (st.streak === 1) parts.push('🔥 אתמול היה יום של ' + what + ' · היום ממשיכים');
    else parts.push('💪 היום אפשר להתחיל רצף חדש');
    if (st.weekDone) parts.push('🏅 היעד השבועי הושלם!');
    else parts.push('היעד השבועי: ' + (st.week ? st.week + ' מתוך ' + st.goal : HK.days(st.goal)));
    var html = esc(parts.join(' · '));
    html += ' <button type="button" class="hk-goal" data-hk-goal="' + esc(k) + '" title="לשנות את היעד השבועי">יעד ' + st.goal + ' ✎</button>';
    if (st.badges) html += ' <span class="hk-badges" title="שבועות שבהם השלמתם את היעד">🏅×' + st.badges + '</span>';
    return html + (st.total ? ALL_LINK : '');
  }

  // ---------- כל הכלים שמשתמשים במנגנון (לדף "ההתקדמות שלי", /kelim/hitkadmut/) ----------
  // כלי חדש עם data-hk = שורה חדשה כאן. g = גרסה עדינה (בלי רצף ובלי יעד).
  HK.TOOLS = [
    { k: 'kartisiot', n: 'כרטיסיות חזרה', u: '/limudim/kartisiot/', i: '📇', w: 'חזרה' },
    { k: 'yomi', n: 'לימוד יומי לסיום', u: '/limudim/yomi/', i: '📖', w: 'לימוד' },
    { k: 'matematika', n: 'תרגול מתמטיקה', u: '/limudim/matematika/', i: '➗', w: 'תרגול' },
    { k: 'timer', n: 'טיימר הלימוד', u: '/limudim/timer/', i: '⏱️', w: 'לימוד' },
    { k: 'mivchan', n: 'מתכנן למבחן', u: '/limudim/mivchan/', i: '🎯', w: 'לימוד' },
    { k: 'tehillim', n: 'סיום תהילים', u: '/kodesh/tehillim/', i: '📜', w: 'תהילים', goal: 3 },
    { k: 'omer', n: 'פרקי אבות לספירת העומר', u: '/kodesh/omer-avot/', i: '🌾', w: 'לימוד' },
    { k: 'hayom', n: 'הדבר החשוב של היום', u: '/nefesh/hayom/', i: '🌱', g: 1, verb: 'חזרתם' },
    { k: 'yoman', n: 'יומן קול', u: '/nefesh/yoman/', i: '🎙️', g: 1, verb: 'כתבתם' }
  ];
  function renderAll(box) {
    var all = {}, wk = key(sunday()), used0 = [], fresh = [], badges = [];
    HK.TOOLS.forEach(function (t) {
      var s = HK.load(t.k), st = HK.stats(t.k, t.goal);
      Object.keys(s.days || {}).forEach(function (d) { all[d] = 1; });
      Object.keys(s.badges || {}).forEach(function (b) { badges.push({ d: b, t: t }); });
      (st.total ? used0 : fresh).push({ t: t, st: st });
    });
    used0.sort(function (a, b) { return (b.st.today - a.st.today) || (b.st.total - a.st.total); });
    var days = Object.keys(all), week = days.filter(function (d) { return d >= wk; }).length, today = !!all[key()];
    var head = !days.length ? '<b>🌱 עוד לא התחלתם</b><span>בוחרים כלי אחד מלמטה. כל יום שחוזרים אליו נספר כאן, בטלפון שלכם בלבד.</span>'
      : '<b>' + (today ? '✓ היום כבר הייתם כאן' : '🌱 היום עוד מחכה לכם') + '</b><span>השבוע: ' + HK.days(week) + ' של לימוד ועשייה · בסך הכול ' + HK.days(days.length) + '</span>';
    function card(x) {
      var t = x.t, st = x.st, line;
      if (!st.total) line = '<span class="hk-c-l">עוד לא התחלתם · להתחיל ›</span>';
      else if (t.g) line = '<span class="hk-c-l">🌱 ' + t.verb + ' ' + HK.days(st.total) + (st.week ? ' · השבוע ' + HK.days(st.week) : '') + '</span><span class="hk-c-s">כל יום נחשב</span>';
      else line = '<span class="hk-c-l">' + (st.streak >= 2 ? '🔥 ' + HK.days(st.streak) + ' ברצף' : st.today ? '✓ היום' : '💪 היום אפשר להמשיך') + '</span>' +
        '<span class="hk-c-s">' + (st.weekDone ? '🏅 היעד השבועי הושלם' : st.week ? 'השבוע ' + st.week + ' מתוך ' + st.goal : 'היעד השבועי: ' + HK.days(st.goal)) + (st.badges ? ' · 🏅×' + st.badges : '') + '</span>';
      return '<a class="hk-c' + (st.today ? ' on' : '') + '" href="' + t.u + '"><span class="hk-c-i">' + t.i + '</span><span class="hk-c-b"><b>' + esc(t.n) + '</b>' + line + '</span></a>';
    }
    badges.sort(function (a, b) { return a.d < b.d ? 1 : -1; });
    box.innerHTML = '<div class="hk-sum">' + head + '</div>' +
      (used0.length ? '<h2 class="hk-h">הכלים שלכם</h2><div class="hk-grid">' + used0.map(card).join('') + '</div>' : '') +
      (badges.length ? '<h2 class="hk-h">התגים שלכם</h2><div class="hk-bdg">' + badges.slice(0, 40).map(function (b) { var p = b.d.split('-'); return '<span title="' + esc(b.t.n) + '">🏅<small>' + b.t.i + ' ' + (+p[2]) + '.' + (+p[1]) + '</small></span>'; }).join('') + '</div>' : '') +
      (fresh.length ? '<h2 class="hk-h">' + (used0.length ? 'עוד כלים שאפשר להתחיל' : 'הכלים') + '</h2><div class="hk-grid">' + fresh.map(card).join('') + '</div>' : '');
  }
  HK.renderAll = function () { var b = document.getElementById('hk-all'); if (b) renderAll(b); };
  HK.render = function () {
    document.querySelectorAll('[data-hk]').forEach(function (el) { el.innerHTML = lineHTML(el); el.hidden = false; });
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-hk-goal]'); if (!b) return;
    var k = b.getAttribute('data-hk-goal'), s = HK.load(k), cur = s.goal || 5;
    s.goal = cur === 3 ? 5 : cur === 5 ? 7 : 3; HK.save(k, s); HK.render();
    var el = document.querySelector('[data-hk="' + k + '"]');
    used((el && el.getAttribute('data-tool')) || k, 'goal', { goal: s.goal });
  });

  // ---------- חלון קטן אחרי הצלחה, פעם אחת ביום ----------
  // o: {el, tool, title, line, share, help (טקסט על הכלי), force}
  HK.done = function (k, o) {
    o = o || {};
    var strip = document.querySelector('[data-hk="' + k + '"]');
    var def = strip ? +strip.getAttribute('data-goal') || 5 : 5, tool = o.tool || (strip && strip.getAttribute('data-tool')) || k;
    var gentle = strip && strip.getAttribute('data-gentle');
    var r = HK.mark(k, def, tool), st = r.st, el = o.el;
    // החלון מופיע פעם אחת ביום לכל כלי (גם אם היום כבר נספר קודם, למשל בכלי נפש: בחירה ואז "עשיתי")
    var s = HK.load(k);
    if (!el || (s.win === HK.today() && !o.force)) return r;
    s.win = HK.today(); HK.save(k, s);
    var pills = gentle ? '<span>🌱 ' + HK.days(st.total) + ' ' + ((strip && strip.getAttribute('data-pill')) || 'שחזרתם') + '</span>'
      : '<span>🔥 ' + (st.streak === 1 ? (st.total > 1 ? 'יום ראשון ברצף חדש' : 'יום ראשון') : HK.days(st.streak) + ' ברצף') + '</span><span>📅 השבוע ' + st.week + ' מתוך ' + st.goal + '</span>';
    var share = (o.share || document.title) + (gentle ? '' : st.streak >= 2 ? '\n🔥 ' + HK.days(st.streak) + ' ברצף' : '');
    el.innerHTML =
      '<div class="hk-win" role="status"><button type="button" class="hk-x" aria-label="לסגור">✕</button>' +
        '<b class="hk-t">' + esc(o.title || 'כל הכבוד! 💪') + '</b>' +
        (o.line ? '<p>' + esc(o.line) + '</p>' : '') +
        '<div class="hk-pills">' + pills + '</div>' +
        (r.earned ? '<div class="hk-badge-new"><b>🏅 השלמתם את היעד השבועי!</b><span>' + HK.days(st.goal) + ' השבוע. התג נשמר אצלכם, ויעד חדש מתחיל ביום ראשון.</span></div>' : '') +
        '<div class="hk-help"><b>רגע אחד, מכל הלב 🙏</b>' +
          '<p>' + esc(o.help || 'הכלים כאן בחינם ובלי פרסומות') + '. אני גילעד, נפגעתי בחאן יונס, ואני בונה את האתר הזה לבד ובאהבה. גם לי הוא עולה כסף כל חודש. אם זה עוזר לכם, שתי דרכים לעזור:</p>' +
          '<ol><li><b>לשלוח לחבר אחד</b> שזה יכול לעזור לו. זה הכי עוזר.</li><li>מי שרוצה ויכול: <b>לתמוך במיזם</b>, בכל סכום.</li></ol>' +
          '<div class="hk-acts"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a>' +
          '<button class="btn btn-line btn-sm" type="button" data-hk-give>💛 לתמוך במיזם</button></div>' +
          '<div class="hk-give" hidden><p>בביט או בפייבוקס, למספר <b dir="ltr">058-404-9049</b>. אפשר לכתוב בהערה "כלים", כדי שאדע ואודה לכם.</p>' +
          '<button class="btn btn-gold btn-sm" type="button" data-donate="copy" data-num="0584049049">להעתיק את המספר</button> ' +
          '<a class="btn btn-line btn-sm" href="/kelim/#litmoch">עוד דרכים לעזור</a></div>' +
        '</div></div>';
    el.hidden = false;
    el.querySelector('[data-share-tool]').setAttribute('data-text', share);
    el.querySelector('[data-share-tool]').addEventListener('click', function () { used(tool, 'share_progress', { streak: st.streak }); });
    el.querySelector('[data-hk-give]').onclick = function () { el.querySelector('.hk-give').hidden = false; used(tool, 'give_open'); };
    el.querySelector('.hk-x').onclick = function () { el.innerHTML = ''; el.hidden = true; };
    return r;
  };

  // ---------- עיצוב (קטן, על משתני הצבע של האתר) ----------
  var css = '.hk-strip{margin:.2rem 0 .9rem;padding:.55rem .8rem;border:1px solid var(--line,#3a3a3a);border-radius:12px;background:rgba(216,179,95,.07);color:var(--parchment,#e9dfc7);font-size:.95rem;line-height:1.6}' +
    '.hk-goal{font:inherit;font-size:.82rem;background:none;border:1px solid var(--line,#555);color:var(--gold,#d8b35f);border-radius:999px;padding:0 .55rem;cursor:pointer;margin-inline-start:.2rem}' +
    '.hk-badges{white-space:nowrap;color:var(--gold-hi,#f0cf7f)}' +
    '.hk-win{position:relative;border:1px solid var(--gold,#d8b35f);border-radius:16px;padding:1rem .95rem;margin:1rem 0;background:linear-gradient(180deg,rgba(216,179,95,.12),rgba(216,179,95,.03));text-align:center}' +
    '.hk-win .hk-t{display:block;font-family:var(--serif,inherit);color:var(--cream,#fff6e0);font-size:1.35rem;margin:0 0 .3rem}' +
    '.hk-win>p{margin:.2rem 0 .5rem;color:var(--parchment,#e9dfc7)}' +
    '.hk-x{position:absolute;top:.35rem;left:.45rem;background:none;border:0;color:var(--muted,#aaa);font-size:1.1rem;cursor:pointer;padding:.2rem .4rem}' +
    '.hk-pills{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:center;margin:.3rem 0 .6rem}.hk-pills span{border:1px solid var(--line,#555);border-radius:999px;padding:.15rem .7rem;color:var(--cream,#fff6e0)}' +
    '.hk-badge-new{border:1px dashed var(--gold,#d8b35f);border-radius:12px;padding:.5rem;margin:.4rem 0 .6rem}.hk-badge-new b{display:block;color:var(--gold-hi,#f0cf7f)}.hk-badge-new span{color:var(--parchment,#e9dfc7)}' +
    '.hk-help{text-align:right;border-top:1px dashed var(--line,#555);padding-top:.8rem;color:var(--parchment,#e9dfc7)}.hk-help>b{color:var(--gold-hi,#f0cf7f)}.hk-help p{margin:.3rem 0}.hk-help ol{margin:.3rem 1.2rem .5rem 0;padding:0}' +
    '.hk-acts{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:center;margin-top:.4rem}.hk-give{margin-top:.6rem;text-align:center}' +
    '.hk-all{color:var(--gold,#d8b35f);font-size:.85rem;white-space:nowrap;margin-inline-start:.3rem}' +
    '.hk-sum{border:1px solid var(--gold,#d8b35f);border-radius:16px;padding:.9rem 1rem;text-align:center;background:rgba(216,179,95,.08)}.hk-sum b{display:block;color:var(--cream,#fff6e0);font-size:1.2rem}.hk-sum span{color:var(--parchment,#e9dfc7)}' +
    '.hk-h{font-family:var(--serif,inherit);color:var(--cream,#fff6e0);font-size:1.2rem;margin:1.3rem 0 .6rem}' +
    '.hk-grid{display:grid;gap:.55rem}.hk-c{display:flex;gap:.7rem;align-items:center;border:1px solid var(--line,#444);border-radius:14px;padding:.7rem .85rem;text-decoration:none;color:inherit;background:rgba(255,255,255,.02)}.hk-c.on{border-color:var(--gold,#d8b35f)}' +
    '.hk-c-i{font-size:1.6rem;flex:none}.hk-c-b{display:grid;gap:.1rem;min-width:0}.hk-c-b b{color:var(--cream,#fff6e0)}.hk-c-l{color:var(--parchment,#e9dfc7)}.hk-c-s{color:var(--muted,#aaa);font-size:.88rem}' +
    '.hk-bdg{display:flex;flex-wrap:wrap;gap:.5rem}.hk-bdg span{display:grid;justify-items:center;font-size:1.5rem;border:1px solid var(--line,#444);border-radius:12px;padding:.3rem .5rem}.hk-bdg small{font-size:.75rem;color:var(--muted,#aaa)}' +
    '@media print{.hk-strip,.hk-win{display:none!important}}';
  var tag = document.createElement('style'); tag.textContent = css; document.head.appendChild(tag);

  function boot() { HK.render(); HK.renderAll(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
