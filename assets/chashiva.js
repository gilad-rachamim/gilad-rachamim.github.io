// משחקי חשיבה (/kelim/chashiva/) – משותף לשלושת המשחקים:
// מחולל אקראי עם זרע (אותו לוח לכולם לפי התאריך), שמירה בטלפון, רצף ימים, שעון,
// וחלון "פתרתם!" עם תוצאה לשיתוף בלי ספוילר ובקשה חמה לעזור למיזם.
(function () {
  'use strict';
  var CH = window.CH = {};

  // ---------- אקראי עם זרע ----------
  function hash(s) { var h = 1779033703 ^ s.length; for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return function () { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; }; }
  CH.rng = function (seed) {
    var a = hash(String(seed))();
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  CH.shuffle = function (arr, rnd) { var a = arr.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  // ---------- תאריך ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  CH.dateKey = function (d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  CH.today = function () { return CH.dateKey(); };
  CH.shortDate = function () { var d = new Date(); return d.getDate() + '.' + (d.getMonth() + 1); };
  // מספר האתגר: יום 1 = 10.11.2026, יום פתיחת המשחקים
  CH.dayNum = function () { var a = new Date(2026, 10, 10), b = new Date(); b.setHours(0, 0, 0, 0); return Math.round((b - a) / 864e5) + 1; };

  // ---------- שמירה (בטלפון בלבד) ----------
  CH.load = function (game) { try { return JSON.parse(localStorage.getItem('chashiva-' + game) || '{}') || {}; } catch (e) { return {}; } };
  CH.save = function (game, obj) { try { localStorage.setItem('chashiva-' + game, JSON.stringify(obj)); } catch (e) {} };

  // ---------- רצף ימים ----------
  function streakOf(days) {
    var n = 0, d = new Date();
    if (!days[CH.dateKey(d)]) d.setDate(d.getDate() - 1); // עוד לא שיחקו היום – הרצף של אתמול עדיין חי
    while (days[CH.dateKey(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  CH.stats = function (game) {
    var s = CH.load(game), days = s.days || {};
    return { streak: streakOf(days), best: s.bestStreak || 0, solved: s.solved || 0, todaySec: days[CH.today()] || 0, doneToday: !!days[CH.today()] };
  };
  // רושם פתרון. daily=true – גם לרצף ולאתגר של היום
  CH.record = function (game, daily, sec, hints) {
    var s = CH.load(game);
    s.solved = (s.solved || 0) + 1;
    if (daily) {
      s.days = s.days || {};
      if (!s.days[CH.today()]) s.days[CH.today()] = Math.max(1, sec | 0);
      var keys = Object.keys(s.days).sort(); while (keys.length > 400) delete s.days[keys.shift()];
      s.bestStreak = Math.max(s.bestStreak || 0, streakOf(s.days));
    }
    CH.save(game, s);
    // רצף כללי: יום שבו נפתר לפחות אתגר יומי אחד
    if (daily) { var all = CH.load('all'); all.days = all.days || {}; all.days[CH.today()] = 1; CH.save('all', all); logDaily(game, hints); }
    return CH.stats(game);
  };
  CH.days = function (n) { return n === 1 ? 'יום אחד' : n + ' ימים'; };
  CH.allStreak =function () { return streakOf(CH.load('all').days || {}); };

  // ---------- האתגר השבועי: מטרה אחת משותפת לכל המשחקים, מתחלפת כל יום ראשון ----------
  // כולם מקבלים את אותה מטרה באותו שבוע. מי שמשלים מקבל תג לאוסף.
  var GOALS = [
    { id: 'five', icon: '⭐', t: 'לפתור 5 אתגרים יומיים', n: 5, f: function (L) { return L.length; } },
    { id: 'games3', icon: '🎯', t: 'לפתור את האתגר היומי ב-3 משחקים שונים', n: 3, f: function (L) { return uniq(L, 'g'); } },
    { id: 'days4', icon: '📅', t: 'לפתור אתגר יומי ב-4 ימים שונים', n: 4, f: function (L) { return uniq(L, 'd'); } },
    { id: 'clean3', icon: '🧠', t: 'לפתור 3 אתגרים יומיים בלי אף רמז', n: 3, f: function (L) { return L.filter(function (x) { return !x.h; }).length; } },
    // all4: ארבעת משחקי הפתרון (מילה, שחור ופתור, תשחצים, סודוקו). משחקי הלוח והקלפים נספרים בשאר המטרות
    { id: 'all4', icon: '🏆', t: 'לפתור את האתגר היומי בכל ארבעת משחקי הפתרון (מילה, שחור ופתור, תשחצים, סודוקו)', n: 4, f: function (L) { return uniq(L.filter(function (x) { return PUZ[x.g]; }), 'g'); } }
  ];
  var PUZ = { mila: 1, nono: 1, tash: 1, sudoku: 1 }, DAILY = { blackjack: 1 };
  function uniq(L, k) { var o = {}; L.forEach(function (x) { o[x[k]] = 1; }); return Object.keys(o).length; }
  function sunday(d) { d = new Date(d || Date.now()); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d; }
  CH.week = function () {
    var s0 = sunday(), wk = CH.dateKey(s0), idx = Math.round((s0 - new Date(2026, 10, 8)) / 6048e5);
    var goal = GOALS[((idx % GOALS.length) + GOALS.length) % GOALS.length];
    var all = CH.load('all'), L = (all.log || []).filter(function (x) { return x.d >= wk; });
    var have = Math.min(goal.n, goal.f(L)), end = new Date(s0); end.setDate(end.getDate() + 6);
    var left = Math.round((end - new Date(new Date().setHours(0, 0, 0, 0))) / 864e5) + 1;
    return { key: wk, goal: goal, have: have, done: have >= goal.n, left: left, badges: all.badges || {} };
  };
  // נקרא מתוך CH.record: רושם פתרון יומי ביומן ובודק אם המטרה של השבוע הושלמה עכשיו
  function logDaily(game, hints) {
    var all = CH.load('all'); all.log = all.log || [];
    if (!all.log.some(function (x) { return x.d === CH.today() && x.g === game; })) all.log.push({ d: CH.today(), g: game, h: hints ? 1 : 0 });
    while (all.log.length > 200) all.log.shift();
    CH.save('all', all);
    var w = CH.week();
    if (w.done && !w.badges[w.key]) { all = CH.load('all'); all.badges = all.badges || {}; all.badges[w.key] = w.goal.id; CH.save('all', all); CH.justEarned = w; CH.used('chashiva_week', 'badge', { goal: w.goal.id }); }
  }
  CH.badgeIcon = function (id) { var g = GOALS.filter(function (x) { return x.id === id; })[0]; return g ? g.icon : '🏅'; };
  CH.weekLine = function () {
    var w = CH.week();
    if (w.done) return '🏅 האתגר השבועי הושלם! ' + w.goal.icon + ' ' + w.goal.t + '. מטרה חדשה ביום ראשון.';
    return '🏅 האתגר השבועי: ' + w.goal.t + ' · ' + w.have + ' מתוך ' + w.goal.n + ' · ' + (w.left === 1 ? 'נשאר יום אחד' : 'נשארו ' + w.left + ' ימים');
  };

  // ---------- שעון ----------
  CH.fmt = function (sec) { sec = sec | 0; var m = Math.floor(sec / 60), s = sec % 60; return m + ':' + pad(s); };
  CH.clock = function (el) {
    var c = { sec: 0, on: false };
    setInterval(function () { if (c.on && !document.hidden) { c.sec++; if (el) el.textContent = CH.fmt(c.sec); } }, 1000);
    c.set = function (s) { c.sec = s | 0; if (el) el.textContent = CH.fmt(c.sec); };
    return c;
  };

  // ---------- מדידה ----------
  // רמז / בדיקה / גילוי: לכל היותר אירוע אחד בחצי דקה, כדי לא להציף את הנתונים
  var lastEv = {};
  CH.used = function (tool, how, extra) {
    if (/^(hint|check|reveal)$/.test(how)) { var k = tool + how, t = Date.now(); if (lastEv[k] && t - lastEv[k] < 30000) return; lastEv[k] = t; }
    if (window.toolUsed) window.toolUsed(tool, Object.assign({ how: how }, extra || {}));
  };

  // ---------- משחק עם חבר: קישור שפותח את אותו לוח בדיוק, עם התוצאה של מי ששלח ----------
  // הקישור נושא רק את מספר הלוח (זרע), את התוצאה ואת השם אם הוקלד. אין שרת: הכול בתוך הקישור.
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  CH.esc = esc;
  function b64e(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function b64d(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return decodeURIComponent(escape(atob(s))); }
  CH.vsIn = (function () {
    try { var q = new URLSearchParams(location.search).get('vs'); if (!q) return null; var o = JSON.parse(b64d(q)); if (!o || !o.g || (typeof o.t !== 'number' && typeof o.z !== 'string')) return null; if (o.m) o.m = String(o.m).slice(0, 20); return o; } catch (e) { return null; }
  })();
  CH.vsActive = false;
  function tries(t) { return t > 6 ? '✕' : t === 1 ? 'ניסיון אחד' : t + ' ניסיונות'; }
  function vsScore(o) { if (o.q === 'pts') return 'סיים עם ' + o.t + ' נקודות'; return o.q === 'tries' ? (o.t > 6 ? 'לא נוחשה' : 'נוחשה ב' + (o.t === 1 ? 'ניסיון אחד' : '-' + o.t + ' ניסיונות')) : 'נפתר ב-' + CH.fmt(o.t); }
  CH.vsStart = function (tool, what) {
    var v = CH.vsIn, el = document.getElementById('ch-vsbanner'); CH.vsActive = true;
    if (el) { el.hidden = false; el.innerHTML = '⚔️ <b>אתגר מאת ' + esc(v.m || 'חבר') + '</b>: ' + what + ' ' + vsScore(v) + (v.h ? ' (עם רמזים)' : '') + '. ' + (v.q === 'pts' ? 'תצליחו לצבור יותר?' : v.q === 'tries' ? (v.t > 6 ? 'תצליחו לנחש אותה?' : 'תצליחו בפחות ניסיונות?') : 'תצליחו מהר יותר?'); }
    CH.used(tool, 'vs_open');
  };
  CH.vsReset = function () { CH.vsActive = false; var el = document.getElementById('ch-vsbanner'); if (el) el.hidden = true; };
  function vsResult(o) {
    var v = CH.vsIn; if (!o.vsMine || !CH.vsActive || !v) return '';
    var me = o.vsMine.t, them = v.t, nm = esc(v.m || 'החבר שלכם');
    var show = function (t) { return o.vsMine.q === 'tries' ? tries(t) : o.vsMine.q === 'pts' ? t + ' נקודות' : CH.fmt(t); };
    // בנקודות: יותר = טוב. בזמן ובניסיונות: פחות = טוב
    if (o.vsMine.q === 'pts') { me = -me; them = -them; }
    var head = me < them ? '🏆 ניצחתם את ' + nm + '!' : me === them ? '🤝 תיקו עם ' + nm + '!' : '💪 הפעם הניצחון של ' + nm + '.';
    if (o.vsMine.q === 'pts') { me = -me; them = -them; }
    CH.used(o.tool, 'vs_done', { win: (o.vsMine.q === 'pts' ? me > them : me < them) ? 1 : 0 });
    return '<div class="ch-vsres"><b>' + head + '</b><span>אתם: ' + show(me) + ' · ' + nm + ': ' + show(them) + '</span></div>';
  }
  function vsBox(o) {
    if (!o.vs) return '';
    var nm = ''; try { nm = localStorage.getItem('chashiva-name') || ''; } catch (e) {}
    return '<div class="ch-vs"><b>⚔️ לאתגר חבר על ' + o.vsWhat + ' בדיוק</b><span>החבר יקבל את ' + o.vsWhat + ' ואת התוצאה שלכם, ובסוף יראה מי ניצח.</span>' +
      '<input type="text" maxlength="20" placeholder="השם שלכם (לא חובה)" value="' + esc(nm) + '" data-vs-name aria-label="השם שלכם">' +
      '<div class="actions"><a class="btn btn-gold" href="#" target="_blank" rel="noopener" data-vs-wa><svg class="ic"><use href="#wa"/></svg> לשלוח אתגר בווטסאפ</a><button class="btn btn-line" type="button" data-vs-copy>🔗 להעתיק קישור</button></div></div>';
  }
  function vsWire(el, o) {
    var box = el.querySelector('.ch-vs'); if (!box) return;
    var inp = box.querySelector('[data-vs-name]');
    function msg() {
      var name = (inp.value || '').trim().slice(0, 20); try { localStorage.setItem('chashiva-name', name); } catch (e) {}
      var p = Object.assign({}, o.vs, o.vsMine); if (name) p.m = name;
      var link = location.origin + location.pathname + '?vs=' + b64e(JSON.stringify(p)) + '&utm_source=share&utm_medium=friend&utm_campaign=vs_' + o.vs.g;
      return o.vsMsg + '\n' + link;
    }
    box.querySelector('[data-vs-wa]').addEventListener('click', function () { this.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg()); CH.used(o.tool, 'vs_send', { how: 'wa' }); });
    box.querySelector('[data-vs-copy]').addEventListener('click', function () { var t = msg(); if (window.kelimCopy) window.kelimCopy(t, this, 'הקישור הועתק ✓ אפשר להדביק לחבר'); CH.used(o.tool, 'vs_send', { how: 'copy' }); });
  }

  // ---------- משחק לפי תורות בקישור (שחמט, דמקה, שש-בש) ----------
  // אותו מנגנון ?vs= כמו האתגר, רק שבמקום תוצאה הקישור נושא את מצב הלוח (z) אחרי המהלך.
  // החבר פותח, משחק את התור שלו, ושולח קישור בחזרה. אין שרת: הכול בתוך הקישור.
  CH.vsLink = function (p, tag) { return location.origin + location.pathname + '?vs=' + b64e(JSON.stringify(p)) + '&utm_source=share&utm_medium=friend&utm_campaign=turn_' + (tag || p.g); };
  CH.myName = function () { try { return localStorage.getItem('chashiva-name') || ''; } catch (e) { return ''; } };
  // o: {el, tool, p (האובייקט לקישור, בלי שם), msg(name) -> טקסט, title, sub}
  CH.turnSend = function (o) {
    var el = o.el; if (!el) return;
    el.innerHTML = '<div class="ch-vs ch-turn"><b>' + (o.title || '📨 עכשיו התור של החבר') + '</b><span>' + (o.sub || 'שולחים לו את הלוח בווטסאפ. הוא משחק את התור שלו ושולח לכם קישור בחזרה.') + '</span>' +
      '<input type="text" maxlength="20" placeholder="השם שלכם (לא חובה)" value="' + esc(CH.myName()) + '" data-vs-name aria-label="השם שלכם">' +
      '<div class="actions"><a class="btn btn-gold" href="#" target="_blank" rel="noopener" data-vs-wa><svg class="ic"><use href="#wa"/></svg> לשלוח את התור בווטסאפ</a><button class="btn btn-line" type="button" data-vs-copy>🔗 להעתיק קישור</button></div></div>';
    var inp = el.querySelector('[data-vs-name]');
    function msg() {
      var name = (inp.value || '').trim().slice(0, 20); try { localStorage.setItem('chashiva-name', name); } catch (e) {}
      var p = Object.assign({}, o.p); if (name) p.m = name;
      return o.msg(name) + '\n' + CH.vsLink(p);
    }
    CH.turnMsg = msg;
    el.querySelector('[data-vs-wa]').addEventListener('click', function () { this.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg()); CH.used(o.tool, 'turn_send', { how: 'wa' }); });
    el.querySelector('[data-vs-copy]').addEventListener('click', function () { var t = msg(); if (window.kelimCopy) window.kelimCopy(t, this, 'הקישור הועתק ✓ אפשר להדביק לחבר'); CH.used(o.tool, 'turn_send', { how: 'copy' }); });
  };
  // באנר למי שפתח תור מחבר
  CH.turnBanner = function (html) { var el = document.getElementById('ch-vsbanner'); if (el) { el.hidden = !html; el.innerHTML = html || ''; } };

  // ---------- חלון "פתרתם!" ----------
  // o: {tool, el, title, line, share, daily, next:[{label, fn}]}
  function weekBox(o) {
    var e = CH.justEarned; CH.justEarned = null;
    if (e) { o.share = (o.share || '') + '\n🏅 השלמתי את האתגר השבועי: ' + e.goal.t; return '<div class="ch-badge-new"><b>' + e.goal.icon + ' השלמתם את האתגר השבועי!</b><span>' + e.goal.t + '. התג נכנס לאוסף שלכם בדף המשחקים.</span></div>'; }
    return '<p class="ch-weekline">' + CH.weekLine() + '</p>';
  }
  CH.win = function (o) {
    var el = o.el; if (!el) return;
    var st = o.stats || {};
    var streakTxt = o.daily && st.streak ? '<span>🔥 רצף <b>' + CH.days(st.streak) + '</b></span>' : '';
    el.innerHTML =
      '<div class="ch-win" role="status">' +
        '<h2>' + (o.title || 'פתרתם! 🎉') + '</h2>' + vsResult(o) +
        '<div class="ch-pills">' + (o.line || '') + streakTxt + '</div>' +
        (o.daily ? weekBox(o) : '') +
        (o.extra || '') +
        '<div class="ch-next"></div>' + vsBox(o) +
        '<div class="ch-help">' +
          '<b>רגע אחד, מכל הלב 🙏</b>' +
          '<p>המשחקים כאן בחינם ובלי פרסומות. אני גילעד, נפגעתי בחאן יונס, ואני בונה את האתר הזה לבד ובאהבה. גם לי הוא עולה כסף כל חודש. אם נהניתם, שתי דרכים לעזור:</p>' +
          '<ol><li><b>לשלוח לחבר אחד</b> שאוהב לפתור. זה הכי עוזר, והתוצאה לא מגלה את הפתרון.</li>' +
          '<li>מי שרוצה ויכול: <b>לתמוך במיזם</b>, בכל סכום.</li></ol>' +
          '<pre class="ch-res" dir="rtl"></pre>' +
          '<div class="actions"><a class="btn btn-gold" href="#" data-share-tool="wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a>' +
          '<button class="btn btn-line" type="button" data-ch-give>💛 לתמוך במיזם</button></div>' +
          '<div class="ch-give" hidden><p>בביט או בפייבוקס, למספר <b dir="ltr">058-404-9049</b>. אפשר לכתוב בהערה "משחקים", כדי שאדע ואודה לכם.</p>' +
          '<button class="btn btn-gold btn-sm" type="button" data-donate="copy" data-num="0584049049">להעתיק את המספר</button> ' +
          '<a class="btn btn-line btn-sm" href="/kelim/#litmoch">עוד דרכים לעזור</a></div>' +
        '</div>' +
      '</div>';
    el.querySelector('.ch-res').textContent = o.share || '';
    var wl = document.getElementById('ch-weekline'); if (wl) wl.textContent = CH.weekLine();
    el.querySelector('[data-share-tool]').setAttribute('data-text', o.share || 'משחקי חשיבה בחינם');
    var nx = el.querySelector('.ch-next');
    (o.next || []).forEach(function (n, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (i ? 'btn-line' : 'btn-gold'); b.textContent = n.label;
      b.onclick = function () { el.innerHTML = ''; CH.vsReset(); n.fn(); window.scrollTo({ top: 0, behavior: 'smooth' }); };
      nx.appendChild(b);
    });
    vsWire(el, o); CH.vsActive = false;
    el.querySelector('[data-ch-give]').onclick = function () { el.querySelector('.ch-give').hidden = false; CH.used(o.tool, 'give_open'); };
    el.querySelector('[data-share-tool]').addEventListener('click', function () { CH.used(o.tool, 'share_result', { daily: o.daily ? 1 : 0 }); });
    setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250);
  };

  // ---------- שורת האתגר השבועי בכל משחק ----------
  var wl0 = document.getElementById('ch-weekline'); if (wl0) wl0.textContent = CH.weekLine();

  // ---------- דף התחום: האתגר השבועי ואוסף התגים ----------
  var wb = document.getElementById('ch-week');
  if (wb) {
    var w = CH.week(), keys = Object.keys(w.badges).sort().reverse();
    var pct = Math.round(w.have / w.goal.n * 100);
    var shareTxt = ('השלמתי את האתגר השבועי במשחקי החשיבה: ' + w.goal.t + ' ' + w.goal.icon + ' מצטרפים אליי?').replace(/"/g, '&quot;');
    wb.innerHTML = '<div class="ch-weekcard' + (w.done ? ' done' : '') + '"><div class="ic">' + w.goal.icon + '</div><div><b>' + w.goal.t + '</b>' +
      '<div class="ch-meter"><i style="width:' + pct + '%"></i></div>' +
      '<span>' + (w.done ? '✓ הושלם! התג שלכם באוסף למטה. מטרה חדשה ביום ראשון.' : w.have + ' מתוך ' + w.goal.n + ' · ' + (w.left === 1 ? 'נשאר יום אחד' : 'נשארו ' + w.left + ' ימים')) + '</span></div></div>' +
      '<div class="ch-badges"><b>אוסף התגים שלכם</b>' + (keys.length ? '<div>' + keys.slice(0, 24).map(function (k) { var d = k.split('-'); return '<span title="השבוע של ' + (+d[2]) + '.' + (+d[1]) + '">' + CH.badgeIcon(w.badges[k]) + '<small>' + (+d[2]) + '.' + (+d[1]) + '</small></span>'; }).join('') + '</div>' : '<p class="ch-hint">עוד אין תגים. משלימים את האתגר השבועי, והתג הראשון נכנס לכאן.</p>') + '</div>' +
      (w.done ? '<div class="actions"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="' + shareTxt + '" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לספר לחברים</a></div>' : '');
  }

  // ---------- דף התחום: ההתקדמות שלכם ----------
  var box = document.getElementById('ch-progress');
  if (box) {
    var games = [['mila', 'מילה ביום', '/kelim/chashiva/mila/'], ['nono', 'שחור ופתור', '/kelim/chashiva/shachor/'], ['tash', 'תשחצים', '/kelim/chashiva/tashchetz/'], ['sudoku', 'סודוקו', '/kelim/chashiva/sudoku/'],
      ['shachmat', 'שחמט', '/kelim/chashiva/shachmat/'], ['damka', 'דמקה', '/kelim/chashiva/damka/'], ['shesh', 'שש-בש', '/kelim/chashiva/shesh-besh/'], ['chidon', 'חידון וטריוויה', '/kelim/chashiva/chidon/'],
      ['blackjack', 'בלאק ג׳ק', '/kelim/chashiva/blackjack/'], ['reviiot', 'רביעיות', '/kelim/chashiva/reviiot/'], ['yaniv', 'יניב', '/kelim/chashiva/yaniv/'], ['avanim', 'אבני מספרים (רמי)', '/kelim/chashiva/avanim/'], ['poker', 'פוקר', '/kelim/chashiva/poker/']];
    var any = false;
    box.innerHTML = '<div class="ch-prog">' + games.map(function (g) {
      var s = CH.stats(g[0]); if (s.solved) any = true;
      var duel = !PUZ[g[0]] && !DAILY[g[0]];
      return '<a href="' + g[2] + (duel ? '' : '#daily') + '"><b>' + g[1] + '</b><span>' + (duel ? (s.doneToday ? '✓ ניצחתם היום' : '⭐ ניצחון היום נספר לאתגר השבועי') : (s.doneToday ? '✓ האתגר של היום נפתר' : '⭐ האתגר של היום מחכה')) + '</span>' +
        '<span>🔥 רצף ' + s.streak + ' · ' + (duel ? 'ניצחונות ' : 'נפתרו ') + s.solved + '</span></a>';
    }).join('') + '</div>' + (any ? '' : '<p class="ch-hint">עוד לא שיחקתם כאן. ההתקדמות נשמרת בטלפון הזה בלבד, בלי הרשמה.</p>');
  }
})();
