/* הכיתה הווירטואלית – דף התלמידים (/limudim/kita/talmidim/).
   השרת: kelim-kita (tools/kita-worker). אותה הצטרפות כמו במחברת ובכיתה משחקת (localStorage 'kita-me').
   מטלות עם דפי עבודה, לכל תרגיל: מחברת, מחשבון שהמורה בחרה, סרטון או שיעור קצר, ושאלה לכיתה. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('ks-app')) return;
  var API = (function () { try { var o = localStorage.getItem('kita-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8796' : 'https://kelim-kita.gilad4049.workers.dev'; })();
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var usedOnce = {};
  function used(a, again) { if (usedOnce[a] && !again) return; usedOnce[a] = 1; if (window.toolUsed) window.toolUsed('kita_talmidim', { action: a }); }
  function call(path, body) {
    return fetch(API + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); })
      .catch(function () { return { _s: 0, error: 'אין חיבור לאינטרנט כרגע. בודקים את החיבור ומנסים שוב.' }; });
  }
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'עכשיו'; if (m < 60) return 'לפני ' + m + ' דק׳'; var h = Math.round(m / 60); if (h < 24) return 'לפני ' + h + ' שע׳';
    return new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  }
  function toast(msg) { var t = $('ks-toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { t.hidden = true; }, 4500); }
  var TOPICS = [["seder", "סדר פעולות חשבון"], ["shvarim", "חיבור וחיסור שברים"], ["achuzim", "אחוזים"], ["mishvaa", "משוואה עם נעלם אחד"], ["pilug", "פתיחת סוגריים וכינוס איברים"], ["pitagoras", "משפט פיתגורס"], ["shorashim", "משוואה ריבועית ונוסחת השורשים"], ["kefel", "לוח הכפל"], ["shetach", "שטח והיקף"], ["kefel-shvarim", "כפל וחילוק שברים"], ["chezkot", "חזקות"], ["maarechet", "מערכת משוואות"], ["hiluk", "חילוק ארוך"], ["asroni", "מספרים עשרוניים"], ["memutza", "ממוצע"], ["yachas", "יחס ופרופורציה"], ["histabrut", "הסתברות"], ["kav", "פונקציה קווית וגרף"], ["sidra", "סדרה חשבונית"], ["merchak", "מרחק בין נקודות ואמצע קטע"], ["parabola", "פונקציה ריבועית: קודקוד וחיתוך עם הצירים"], ["trigo", "טריגונומטריה במשולש ישר זווית"], ["gdila", "גדילה ודעיכה (ריבית)"], ["stiya", "חציון, שכיח וסטיית תקן"], ["nigzeret", "נגזרת של פולינום"], ["mashik", "משוואת משיק"], ["kitzon", "נקודות קיצון"], ["integral", "אינטגרל ושטח מתחת לגרף"], ["maagal", "משוואת מעגל"], ["normalit", "התפלגות נורמלית"], ["handasit", "סדרה הנדסית"], ["sinusim", "משפט הסינוסים, הקוסינוסים ושטח משולש"], ["tnua", "בעיות תנועה ועבודה"], ["merchav", "טריגונומטריה במרחב: תיבה"], ["rationalit", "פונקציה רציונלית: תחום ואסימפטוטות"], ["shoresh-f", "פונקציית שורש: תחום ונגזרת"], ["etz", "הסתברות: עץ והסתברות מותנית"], ["trig-nigzeret", "נגזרת של sin ושל cos"], ["vektor", "וקטורים"], ["merukav", "מספרים מרוכבים"], ["logaritm", "לוגריתמים ומשוואות מעריכיות"], ["exp-ln", "נגזרת של e ושל ln"], ["piramida", "פירמידה: מקצוע, גובה וזוויות"], ["dimyon", "דמיון משולשים"], ["zaviot-maagal", "זוויות במעגל"], ["parametr", "חקירה עם פרמטר"], ["induktzia", "אינדוקציה"], ["nefach-sivuv", "נפח גוף סיבוב"]];
  function topicName(id) { var t = TOPICS.filter(function (x) { return x[0] === id; })[0]; return t ? t[1] : ''; }
  var CALC = { sci: ['🧮 מחשבון מדעי', '/limudim/machshevon/?mini=1'], graph: ['📈 מחשבון וגרפים', '/limudim/machshevon/#graph'], exam: ['🧮 מחשבון במצב בחינה', '/limudim/machshevon/?mini=1&exam=1'] };

  var ME = lsGet('kita-me', null), HWD = null, FD = null, OPEN = null, tab = 'hw', poll = null;
  var qcode = (location.search.match(/[?&]kita=(\d{6})/) || [])[1];
  if (ME && qcode && ME.code !== qcode) ME = null; // קישור לכיתה אחרת: מצטרפים אליה

  // ---------- הצטרפות ----------
  function showJoin() {
    $('ks-join').hidden = false; $('ks-main').hidden = true;
    if (qcode) { $('ks-code').value = qcode; $('ks-nick').focus(); }
  }
  $('ks-join-b').addEventListener('click', function () {
    var code = $('ks-code').value.replace(/\D/g, ''), b = this, e = $('ks-jerr');
    if (!/^\d{6}$/.test(code)) { e.hidden = false; e.textContent = 'קוד הכיתה הוא 6 ספרות, כמו שהמורה שלחה.'; return; }
    b.disabled = true;
    call('/c/' + code + '/join', { nick: $('ks-nick').value }).then(function (d) {
      b.disabled = false;
      if (!d.ok) { e.hidden = false; e.textContent = d.error; return; }
      e.hidden = true;
      ME = { code: code, sid: d.sid, token: d.token, nick: d.nick, name: d.name, teacher: d.teacher };
      lsSet('kita-me', ME); used('join'); start();
    });
  });
  $('ks-nick').addEventListener('keydown', function (e) { if (e.key === 'Enter') $('ks-join-b').click(); });

  function start() {
    $('ks-join').hidden = true; $('ks-main').hidden = false;
    $('ks-cls').textContent = ME.name || 'הכיתה'; $('ks-tch').textContent = ME.teacher ? ' · ' + ME.teacher : '';
    $('ks-nickshow').textContent = ME.nick;
    if (history.replaceState && qcode) history.replaceState(null, '', location.pathname + location.hash);
    var h = location.hash.slice(1); setTab(/^(hw|forum|pts)$/.test(h) ? h : 'hw');
    loadMe();
    clearInterval(poll); poll = setInterval(function () { if (document.hidden) return; loadMe(); if (tab === 'forum') loadForum(); else if (tab === 'hw' && !OPEN) loadHw(); }, 30000);
  }
  function gone(d) { if (d && d.gone) { lsSet('kita-me', null); ME = null; toast(d.error); showJoin(); return true; } return false; }

  // ---------- לשוניות ----------
  function setTab(t) {
    tab = t;
    ['hw', 'forum', 'pts'].forEach(function (x) { $('ks-t-' + x).setAttribute('aria-selected', x === t ? 'true' : 'false'); $('ks-p-' + x).hidden = x !== t; });
    if (t === 'hw') loadHw(); else if (t === 'forum') loadForum(); else loadMe();
    used('tab_' + t);
  }
  ['hw', 'forum', 'pts'].forEach(function (x) { $('ks-t-' + x).addEventListener('click', function () { setTab(x); history.replaceState(null, '', '#' + x); }); });

  // ---------- מטלות ----------
  function loadHw(cb) {
    call('/c/' + ME.code + '/hw', { sid: ME.sid, token: ME.token }).then(function (d) {
      if (gone(d)) return;
      if (!d.ok) { $('ks-hwlist').innerHTML = '<p class="pt-err">' + esc(d.error) + '</p>'; return; }
      HWD = d; renderHwList(); if (OPEN) openHw(OPEN, true); if (cb) cb();
    });
  }
  function prepOf(h) { return (HWD.mprep || []).filter(function (r) { return r.hw === h.id; })[0]; }
  function doneOf(h) { if (h.kind === 'prep') return prepOf(h) ? 1 : 0; return HWD.work.filter(function (w) { return w.hw === h.id && w.done; }).length; }
  function nOf(h) { return h.kind === 'prep' ? 1 : h.ex.length; }
  function dueTxt(due) {
    if (!due) return '';
    var d = Math.round((new Date(due + 'T23:59:00') - Date.now()) / 864e5);
    return d < 0 ? 'ההגשה עברה' : d === 0 ? 'להגיש היום' : d === 1 ? 'להגיש מחר' : 'להגיש עד ' + new Date(due + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
  }
  function renderHwList() {
    var el = $('ks-hwlist');
    if (!HWD.hw.length) { el.innerHTML = '<p class="note">עוד אין מטלות מהמורה. כשתהיה, היא תופיע כאן.</p>'; return; }
    el.innerHTML = HWD.hw.map(function (h) {
      var dn = doneOf(h), n = nOf(h), pct = Math.round(dn / n * 100);
      if (h.kind === 'prep') return '<button type="button" class="kp-card kp-prepc' + (dn ? ' is-done' : '') + '" data-hw="' + h.id + '"><span class="kp-card-t"><b>' + esc(h.title) + '</b><span class="kp-tag">🎬 הכנה לשיעור</span>' + (h.due ? '<span class="kp-tag' + (/עברה|היום/.test(dueTxt(h.due)) ? ' warn' : '') + '">📅 ' + dueTxt(h.due) + '</span>' : '') + '</span><span class="kp-sub">' + (dn ? 'צפית וענית ✓' : 'סרטון קצר' + (h.prep && h.prep.q.length ? ' ו-' + h.prep.q.length + ' שאלות' : '') + ' · עד ' + (10 + 5 * (h.prep ? h.prep.q.length : 0)) + ' נקודות') + '</span></button>';
      return '<button type="button" class="kp-card' + (dn === n ? ' is-done' : '') + '" data-hw="' + h.id + '"><span class="kp-card-t"><b>' + esc(h.title) + '</b>' + (h.mar ? '<span class="kp-tag">🏃 מרתון כיתתי</span>' : '') + (h.np ? '<span class="kp-tag">📄 ' + h.np + ' עמ׳</span>' : '') + (h.due ? '<span class="kp-tag' + (/עברה|היום/.test(dueTxt(h.due)) ? ' warn' : '') + '">📅 ' + dueTxt(h.due) + '</span>' : '') + '</span>' +
        '<span class="kp-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span class="kp-sub">' + (dn === n ? 'הכול נפתר ✓ כל הכבוד!' : dn + ' מתוך ' + n + ' תרגילים') + '</span></button>';
    }).join('');
  }
  $('ks-hwlist').addEventListener('click', function (e) { var b = e.target.closest('[data-hw]'); if (b) { openHw(b.getAttribute('data-hw')); used('hw_open', true); } });
  $('ks-back').addEventListener('click', function () { OPEN = null; $('ks-hw1').hidden = true; $('ks-hwlist').hidden = false; $('ks-hwhead').hidden = false; loadHw(); });

  function openHw(id, quiet) {
    var h = HWD && HWD.hw.filter(function (x) { return x.id === id; })[0]; if (!h) { OPEN = null; return; }
    OPEN = id;
    $('ks-hwlist').hidden = true; $('ks-hwhead').hidden = true; $('ks-hw1').hidden = false;
    $('ks-h-title').textContent = h.title;
    if (h.kind === 'prep') return openPrep(h, quiet);
    $('ks-prep').hidden = true; $('ks-exs').hidden = false; $('ks-exh').hidden = false;
    $('ks-h-meta').textContent = [h.due ? '📅 ' + dueTxt(h.due) : '', h.np ? '📄 ' + (h.np === 1 ? 'עמוד אחד' : h.np + ' עמודים') : '', doneOf(h) + ' מתוך ' + h.ex.length + ' נפתרו'].filter(Boolean).join(' · ');
    $('ks-h-note').hidden = !h.note; $('ks-h-note').textContent = h.note ? '📌 ' + h.note : '';
    var mb = $('ks-mar'); mb.hidden = !h.mar;
    if (h.mar) {
      var left = Math.max(0, h.mar.goal - h.mar.full);
      mb.innerHTML = '<b>🏃 מרתון חזרה למבחן</b><span class="kp-bar" aria-hidden="true"><i style="width:' + Math.min(100, Math.round(h.mar.full / Math.max(1, h.mar.goal) * 100)) + '%"></i></span>' +
        '<span>' + (left ? h.mar.full + ' מתוך ' + h.mar.n + ' כבר סיימו. עוד ' + left + ' – וכל מי שסיים/ה מקבל/ת 20 נקודות בונוס! 💪' : '🎉 הכיתה השיגה את היעד! כל מי שמסיים/ת מקבל/ת 20 נקודות בונוס.') + '</span>';
    }
    var pg = $('ks-pages');
    if (!quiet || pg.getAttribute('data-hw') !== id) {
      pg.setAttribute('data-hw', id); pg.hidden = !h.np;
      pg.innerHTML = h.np ? '<h3>דף העבודה</h3><div class="kp-pages">' + Array.apply(null, Array(h.np)).map(function (x, i) {
        var u = API + '/c/' + ME.code + '/page?hw=' + h.id + '&i=' + i;
        return '<a href="' + u + '" target="_blank" rel="noopener" class="kp-page"><img src="' + u + '" alt="דף העבודה, עמוד ' + (i + 1) + '" loading="lazy"><span>עמוד ' + (i + 1) + ' · להגדלה</span></a>';
      }).join('') + '</div>' : '';
    }
    $('ks-exs').innerHTML = h.ex.map(function (x, i) {
      var w = HWD.work.filter(function (k) { return k.hw === h.id && k.ex === i; })[0];
      var st = w && w.done ? '<span class="kp-st ok">✓ נפתר</span>' : w && w.stuck ? '<span class="kp-st stuck">🙋 המורה יודעת</span>' : w ? '<span class="kp-st mid">✏️ בדרך</span>' : '';
      var msgs = HWD.msgs.filter(function (m) { return m.hw === h.id && m.ex === i; });
      var tl = x.tl || 'sci', btns = '<a class="btn btn-sm btn-gold" href="/limudim/machberet/?kita=' + ME.code + '#hw=' + h.id + '&ex=' + i + '">✏️ לפתור במחברת</a>';
      if (CALC[tl]) btns += '<button type="button" class="btn btn-sm" data-calc="' + tl + '">' + CALC[tl][0] + '</button>';
      if (x.v) btns += '<button type="button" class="btn btn-sm" data-vid="' + esc(x.v) + '">▶️ סרטון הדרכה</button>';
      if (x.top && topicName(x.top)) btns += '<button type="button" class="btn btn-sm" data-top="' + esc(x.top) + '">🎬 שיעור קצר: ' + esc(topicName(x.top)) + '</button>';
      btns += '<button type="button" class="btn btn-sm" data-ask="' + i + '">❓ לשאול את הכיתה</button>';
      return '<li class="kp-ex"><div class="kp-ex-h"><b>תרגיל ' + (i + 1) + '</b>' + st + (tl === 'none' ? '<span class="kp-tag">בלי מחשבון</span>' : '') + '</div>' +
        '<p class="kp-q" dir="' + (x.pg ? 'rtl' : 'ltr') + '">' + esc(x.pg ? x.q.replace(/ מהדף$/, '') + ' · עמוד ' + x.pg + ' בדף העבודה' : x.q) + '</p>' +
        msgs.map(function (m) { return '<p class="kp-msg ' + m.kind + '">' + (m.kind === 'answer' ? '🔓 התשובה מהמורה: ' : '💬 רמז מהמורה: ') + '<span dir="auto">' + esc(m.text) + '</span></p>'; }).join('') +
        '<div class="btns">' + btns + '</div></li>';
    }).join('');
    if (!quiet) window.scrollTo({ top: $('ks-app').offsetTop - 60, behavior: 'smooth' });
  }
  // ---------- הכנה לשיעור ----------
  function vidSrc(v) { return /^d:/.test(v) ? 'https://drive.google.com/file/d/' + v.slice(2) + '/preview' : 'https://www.youtube-nocookie.com/embed/' + v + '?rel=0'; }
  function shuffle(n, seed) { var a = []; for (var i = 0; i < n; i++) a.push(i); var x = seed; for (var j = n - 1; j > 0; j--) { x = (x * 9301 + 49297) % 233280; var k = Math.floor(x / 233280 * (j + 1)); var t = a[j]; a[j] = a[k]; a[k] = t; } return a; }
  function openPrep(h, quiet) {
    $('ks-pages').hidden = true; $('ks-exs').hidden = true; $('ks-exh').hidden = true; $('ks-prep').hidden = false; $('ks-mar').hidden = true;
    $('ks-h-meta').textContent = [h.due ? '📅 ' + dueTxt(h.due) : '', '🎬 הכנה לשיעור הבא'].filter(Boolean).join(' · ');
    $('ks-h-note').hidden = !h.note; $('ks-h-note').textContent = h.note ? '📌 ' + h.note : '';
    var mine = prepOf(h), el = $('ks-prep');
    if (quiet && el.getAttribute('data-hw') === h.id && !mine) return;
    el.setAttribute('data-hw', h.id);
    var q = (h.prep && h.prep.q) || [], seed = 0; for (var i = 0; i < ME.sid.length; i++) seed += ME.sid.charCodeAt(i);
    var tn = h.prep.top ? topicName(h.prep.top) : '';
    el.innerHTML = (h.prep.top ? '<div class="kp-lesson"><b>📚 השיעור: ' + esc(tn) + '</b><p class="note">שיעור קצר שמתנגן כמו סרטון, ואחריו תרגול עם רמזים.</p><a class="btn btn-gold" href="/limudim/matematika/#' + esc(h.prep.top) + '" target="_blank" rel="noopener" id="ks-lesson-a">▶️ לפתוח את השיעור</a></div>' : '') +
      (h.prep.v ? '<div class="kp-video"><iframe src="' + esc(vidSrc(h.prep.v)) + '" title="סרטון ההכנה" allow="encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' : '') +
      (q.length ? '<h3>שאלות קצרות אחרי הצפייה</h3>' : '') +
      q.map(function (x, qi) {
        var ord = shuffle(x.a.length, seed + qi * 7);
        return '<fieldset class="kp-pq1"><legend>' + (qi + 1) + '. ' + esc(x.q) + '</legend>' + ord.map(function (ai) {
          var cls = mine ? (ai === 0 ? ' ok' : mine.ans[qi] === ai ? ' no' : '') : '';
          return '<label class="kp-opt' + cls + '"><input type="radio" name="pq' + qi + '" value="' + ai + '"' + (mine ? ' disabled' + (mine.ans[qi] === ai ? ' checked' : '') : '') + '> <span dir="auto">' + esc(x.a[ai]) + '</span></label>';
        }).join('') + '</fieldset>';
      }).join('') +
      (mine ? '<p class="kp-note">✓ ' + (h.prep.top && !h.prep.v ? 'עברת על השיעור' : 'צפית') + (q.length ? ' וענית: ' + mine.ok + ' מתוך ' + q.length + ' נכון' : '') + '. נתראה בשיעור מוכנים! 🎉</p>'
        : '<button type="button" class="btn btn-gold" id="ks-prep-b">✓ ' + (h.prep.top && !h.prep.v ? 'עברתי על השיעור' : 'צפיתי') + (q.length ? ' ועניתי' : '') + ' – לשלוח</button><p class="note">צפייה = 10 נקודות, וכל תשובה נכונה = עוד 5.</p>');
    if (!mine) $('ks-prep-b').addEventListener('click', function () {
      var ans = q.map(function (x, qi) { var c = el.querySelector('input[name="pq' + qi + '"]:checked'); return c ? +c.value : -1; });
      if (ans.some(function (a) { return a < 0; }) && !confirm('לא ענית על כל השאלות. לשלוח בכל זאת?')) return;
      this.disabled = true;
      call('/c/' + ME.code + '/prep', { sid: ME.sid, token: ME.token, hw: h.id, ans: ans }).then(function (d) {
        if (gone(d)) return; if (!d.ok) { toast(d.error); loadHw(); return; }
        toast('🎉 +' + d.pts + ' נקודות! ' + (q.length ? d.right + ' מתוך ' + d.of + ' נכון' : 'מוכנים לשיעור'));
        used('prep_done', true); loadHw(function () { openHw(h.id, true); }); loadMe();
      });
    });
    if (!quiet) window.scrollTo({ top: $('ks-app').offsetTop - 60, behavior: 'smooth' });
  }

  $('ks-exs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.calc) { dlg(CALC[b.dataset.calc][0], CALC[b.dataset.calc][1]); used('calc_' + b.dataset.calc, true); }
    else if (b.dataset.vid) { dlg('▶️ סרטון הדרכה', 'https://www.youtube-nocookie.com/embed/' + b.dataset.vid + '?rel=0', true); used('video', true); }
    else if (b.dataset.top) { dlg('🎬 ' + topicName(b.dataset.top), '/limudim/matematika/#' + b.dataset.top); used('lesson', true); }
    else if (b.dataset.ask) {
      var h = HWD.hw.filter(function (x) { return x.id === OPEN; })[0];
      askAbout = { hw: OPEN, ex: +b.dataset.ask, label: h.title + ' · תרגיל ' + (+b.dataset.ask + 1) };
      setTab('forum'); history.replaceState(null, '', '#forum'); $('ks-ask').focus();
    }
  });

  // ---------- חלון: מחשבון / סרטון / שיעור ----------
  var D = $('ks-dlg');
  function dlg(title, src, video) {
    $('ks-dlg-t').textContent = title;
    $('ks-dlg-f').innerHTML = '<iframe src="' + esc(src) + '" title="' + esc(title) + '"' + (video ? ' allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen class="is-video"' : '') + '></iframe>';
    $('ks-dlg-open').href = video ? src.replace('youtube-nocookie.com/embed/', 'youtube.com/watch?v=').replace('?rel=0', '') : src;
    try { D.showModal(); } catch (e) { D.setAttribute('open', ''); }
  }
  function dlgClose() { $('ks-dlg-f').innerHTML = ''; try { D.close(); } catch (e) { D.removeAttribute('open'); } }
  $('ks-dlg-x').addEventListener('click', dlgClose);
  D.addEventListener('click', function (e) { if (e.target === D) dlgClose(); });
  D.addEventListener('close', function () { $('ks-dlg-f').innerHTML = ''; });

  // ---------- שאלות לכיתה ----------
  var askAbout = null;
  function loadForum() {
    call('/c/' + ME.code + '/forum', { sid: ME.sid, token: ME.token }).then(function (d) { if (gone(d)) return; if (!d.ok) { $('ks-posts').innerHTML = '<p class="pt-err">' + esc(d.error) + '</p>'; return; } FD = d; renderForum(); });
  }
  function hwLabel(p) {
    if (!p.hw || !HWD) return '';
    var h = HWD.hw.filter(function (x) { return x.id === p.hw; })[0];
    return h ? '<button type="button" class="kp-about" data-go="' + p.hw + '">📚 ' + esc(h.title) + (p.ex >= 0 ? ' · תרגיל ' + (p.ex + 1) : '') + '</button>' : '';
  }
  function postHtml(p, root) {
    var acts = '';
    if (!p.me && !p.teacher) acts += '<button type="button" class="linkish" data-rep="' + p.id + '" title="לדווח למורה על הודעה לא מתאימה">🚩</button>';
    if (p.me) acts += '<button type="button" class="linkish" data-del="' + p.id + '">למחוק</button>';
    if (root && root.me && !p.me && !p.teacher && !p.help) acts += '<button type="button" class="btn btn-sm" data-help="' + p.id + '">👍 זה עזר לי</button>';
    return '<div class="kp-post' + (p.teacher ? ' is-t' : '') + (p.good ? ' is-good' : '') + '"><div class="kp-post-h"><b>' + (p.teacher ? '👩‍🏫 ' : '') + esc(p.nick) + (p.me ? ' (אני)' : '') + '</b>' + (p.crown ? '<span class="kp-crown">' + esc(p.crown) + '</span>' : '') + '<span>' + ago(p.t) + '</span>' +
      (p.good ? '<span class="kp-badge">⭐ תשובה מצוינת</span>' : '') + (p.help ? '<span class="kp-badge">👍 עזר</span>' : '') + '</div>' +
      '<p dir="auto">' + esc(p.text).replace(/\n/g, '<br>') + '</p>' + (acts ? '<div class="kp-post-a">' + acts + '</div>' : '') + '</div>';
  }
  function renderForum() {
    $('ks-closed').hidden = FD.open; $('ks-askbox').hidden = !FD.open;
    $('ks-about').hidden = !askAbout; if (askAbout) $('ks-about-t').textContent = askAbout.label;
    $('ks-posts').innerHTML = FD.posts.length ? FD.posts.map(function (p) {
      return '<article class="kp-thread">' + hwLabel(p) + postHtml(p, null) +
        '<div class="kp-replies">' + p.replies.map(function (r) { return postHtml(r, p); }).join('') + '</div>' +
        (FD.open ? '<div class="kp-reply"><textarea class="kh-in" rows="1" maxlength="600" placeholder="לענות… (אפשר גם לכתוב איך פתרת)" aria-label="תשובה לשאלה של ' + esc(p.nick) + '"></textarea><button type="button" class="btn btn-sm" data-par="' + p.id + '">לשלוח</button></div>' : '') + '</article>';
    }).join('') : '<p class="note">עוד אין שאלות. נתקעת? שאלה טובה עוזרת לכל הכיתה, וגם מי שעונה מקבל/ת נקודות.</p>';
  }
  function after(d) { if (gone(d)) return; if (!d.ok) { toast(d.error); return false; } FD.posts = d.posts; renderForum(); return true; }
  $('ks-ask-b').addEventListener('click', function () {
    var t = $('ks-ask').value.trim(), b = this; if (!t) { $('ks-ask').focus(); return; }
    b.disabled = true;
    call('/c/' + ME.code + '/post', { sid: ME.sid, token: ME.token, text: t, hw: askAbout ? askAbout.hw : '', ex: askAbout ? askAbout.ex : -1 }).then(function (d) {
      b.disabled = false; if (after(d)) { $('ks-ask').value = ''; askAbout = null; renderForum(); toast('✓ השאלה פורסמה לכיתה'); used('ask', true); }
    });
  });
  $('ks-about-x').addEventListener('click', function () { askAbout = null; renderForum(); });
  $('ks-posts').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.par) {
      var ta = b.parentNode.querySelector('textarea'), t = ta.value.trim(); if (!t) { ta.focus(); return; }
      b.disabled = true;
      call('/c/' + ME.code + '/post', { sid: ME.sid, token: ME.token, text: t, par: +b.dataset.par }).then(function (d) { b.disabled = false; if (after(d)) { toast('✓ התשובה נשלחה. אם היא תעזור – תקבלו 10 נקודות'); used('answer', true); } });
    } else if (b.dataset.help) {
      call('/c/' + ME.code + '/help', { sid: ME.sid, token: ME.token, id: +b.dataset.help }).then(function (d) { if (after(d)) { toast('👍 תודה! על התשובה הזאת נוספו 10 נקודות'); used('help', true); } });
    } else if (b.dataset.rep) {
      if (!confirm('לדווח למורה שההודעה הזאת לא מתאימה?')) return;
      call('/c/' + ME.code + '/report', { sid: ME.sid, token: ME.token, id: +b.dataset.rep }).then(function (d) { if (after(d)) toast('✓ דיווחת. המורה תראה את זה.'); used('report', true); });
    } else if (b.dataset.del) {
      if (!confirm('למחוק את ההודעה?')) return;
      call('/c/' + ME.code + '/postdel', { sid: ME.sid, token: ME.token, id: +b.dataset.del }).then(after);
    } else if (b.dataset.go) { setTab('hw'); history.replaceState(null, '', '#hw'); loadHw(function () { openHw(b.dataset.go); }); }
  });
  $('ks-posts').addEventListener('input', function (e) { if (e.target.tagName === 'TEXTAREA') { e.target.style.height = 'auto'; e.target.style.height = Math.min(220, e.target.scrollHeight + 2) + 'px'; } });

  // ---------- הנקודות שלי, תגים ופרסים ----------
  var BADGES = [
    ['🌱', 'צעד ראשון', 'פתרתם תרגיל ראשון', function (m) { return m.solved >= 1; }],
    ['✏️', 'התמדה', '10 תרגילים פתורים', function (m) { return m.solved >= 10; }],
    ['🧠', 'אלופי תרגול', '50 תרגילים פתורים', function (m) { return m.solved >= 50; }],
    ['⚡', 'זריזות', 'בין שלושת הראשונים שסיימו מטלה', function (m) { return m.fast >= 1; }],
    ['🥇', 'ראשונים לסיים', 'סיימתם מטלה לפני כל הכיתה', function (m) { return m.first >= 1; }],
    ['🔥', '3 ימים ברצף', 'תרגול שלושה ימים רצוף', function (m) { return m.streak >= 3; }],
    ['🌟', 'שבוע ברצף', 'שבעה ימים רצוף', function (m) { return m.streak >= 7; }],
    ['❓', 'שאלה אמיצה', 'שאלתם את הכיתה', function (m) { return m.asked >= 1; }],
    ['🤝', 'עזרה לחברים', 'תשובה שלכם עזרה למישהו', function (m) { return m.helped >= 1; }],
    ['💎', 'מורה קטן/ה', 'עזרתם 5 פעמים', function (m) { return m.helped >= 5; }],
    ['⭐', 'תשובה מצוינת', 'המורה סימנה תשובה שלכם', function (m) { return m.good >= 1; }],
    ['💯', '100 נקודות', 'מאה נקודות מאז שהצטרפתם', function (m) { return m.all >= 100; }],
    ['🚀', '500 נקודות', 'חמש מאות נקודות', function (m) { return m.all >= 500; }],
    ['🏆', 'ראש הלוח', 'מקום ראשון בלוח הכיתה', function (m) { return m.place === 1 && m.pts > 0; }]
  ];
  var PER = { week: 'השבוע', month: 'החודש', round: 'בסבב הזה' };
  function loadMe() {
    call('/c/' + ME.code + '/me', { sid: ME.sid, token: ME.token }).then(function (m) {
      if (gone(m) || !m.ok) return;
      $('ks-mypts').textContent = m.pts; $('ks-chip').hidden = false;
      $('ks-role').hidden = !m.crown; $('ks-role').textContent = m.crown || '';
      $('ks-msg').hidden = !m.msg; $('ks-msg').textContent = m.msg ? '📣 ' + m.msg : '';
      $('ks-stats').innerHTML = '<div><b>' + m.pts + '</b><span>נקודות ' + (PER[m.period] || 'השבוע') + '</span></div><div><b>' + (m.place ? m.place : '–') + '</b><span>מקום בלוח (מתוך ' + m.of + ')</span></div><div><b>' + m.streak + (m.streak ? ' 🔥' : '') + '</b><span>ימים ברצף</span></div><div><b>' + m.solved + '</b><span>תרגילים פתורים</span></div>';
      var got = BADGES.filter(function (b) { return b[3](m); }).length;
      $('ks-badges-n').textContent = got + ' מתוך ' + BADGES.length;
      $('ks-badges').innerHTML = BADGES.map(function (b) { var on = b[3](m); return '<li class="' + (on ? 'on' : '') + '"><span aria-hidden="true">' + (on ? b[0] : '🔒') + '</span><b>' + b[1] + '</b><small>' + b[2] + '</small></li>'; }).join('');
      $('ks-top').innerHTML = m.top.length ? m.top.map(function (r) { return '<li class="' + (r.me ? 'me' : '') + '"><span>' + (r.place ? ['🥇', '🥈', '🥉'][r.place - 1] || r.place : '·') + '</span><b>' + esc(r.nick) + (r.crown ? ' 👑 ' + esc(r.crown) : '') + '</b><em>' + r.pts + '</em></li>'; }).join('') : '<li class="note">עוד אין נקודות השבוע.</li>';
      showNotes(m.notes || []); showBrk(m.brk);
      $('ks-gifts').hidden = !m.gifts.length;
      $('ks-gifts-l').innerHTML = m.gifts.map(function (g) {
        var who = g.who === 'all' ? 'לכל מי שמשתתף/ת' : g.who === 'top3' ? 'לשלושת הראשונים' : /^pts:/.test(g.who) ? 'למי שמגיע/ה ל-' + g.who.slice(4) + ' נקודות' : 'למקום ' + g.who;
        return '<li><span aria-hidden="true">' + esc(g.i) + '</span><b>' + esc(g.t) + '</b><small>' + who + (g.d ? ' · ' + esc(g.d) : '') + '</small></li>';
      }).join('');
    });
  }
  // ---------- פרגון ותזכורות מהמורה ----------
  function showNotes(notes) {
    var seen = lsGet('kita-seen-' + ME.code, []), fresh = notes.filter(function (n) { return seen.indexOf(n.id) < 0; });
    var k = fresh.filter(function (n) { return n.kind === 'kudos'; })[0], r = fresh.filter(function (n) { return n.kind === 'remind'; })[0];
    var box = $('ks-notes'); box.innerHTML = '';
    if (k) box.insertAdjacentHTML('beforeend', '<div class="kp-kudo" role="status"><span class="kp-kudo-e" aria-hidden="true">' + esc(k.emoji || '💐') + '</span><div><b>פרגון מהמורה' + (k.pts ? ' · +' + k.pts + ' נקודות' : '') + '</b><p dir="auto">' + esc(k.text) + '</p></div><button type="button" class="linkish" data-seen="' + k.id + '">תודה! ✕</button></div>');
    if (r) box.insertAdjacentHTML('beforeend', '<div class="kp-remind" role="status"><span aria-hidden="true">⏰</span><p dir="auto">' + esc(r.text) + '</p><button type="button" class="linkish" data-seen="' + r.id + '">✕</button></div>');
    var ks = notes.filter(function (n) { return n.kind === 'kudos'; });
    $('ks-kudos').hidden = !ks.length;
    $('ks-kudos-l').innerHTML = ks.map(function (n) { return '<li><span aria-hidden="true">' + esc(n.emoji || '💐') + '</span><b dir="auto">' + esc(n.text) + '</b><small>' + ago(n.t) + (n.pts ? ' · +' + n.pts : '') + '</small></li>'; }).join('');
  }
  $('ks-notes').addEventListener('click', function (e) {
    var b = e.target.closest('[data-seen]'); if (!b) return;
    var seen = lsGet('kita-seen-' + ME.code, []); seen.push(+b.dataset.seen); lsSet('kita-seen-' + ME.code, seen.slice(-80));
    b.parentNode.remove(); used('note_seen', true);
  });

  // ---------- הפסקת חשיבה מהמורה ----------
  var GAMES = { sudoku: 'סודוקו', mila: 'מילה – וורדל בעברית', avanim: 'אבני מספרים', reviiot: 'ארבע בשורה', 'tzviya-misparim': 'צביעה לפי מספרים', tashbetz: 'תשבץ', damka: 'דמקה', shachmat: 'שחמט' }, brkT = null;
  function showBrk(k) {
    clearInterval(brkT); var el = $('ks-brk');
    if (!k || k.until < Date.now()) { el.hidden = true; return; }
    el.hidden = false; $('ks-brk-g').textContent = GAMES[k.g] || k.g; $('ks-brk-a').href = '/kelim/chashiva/' + k.g + '/';
    var tick = function () { var s = Math.max(0, Math.round((k.until - Date.now()) / 1000)); $('ks-brk-t').textContent = Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); if (!s) { clearInterval(brkT); el.hidden = true; } };
    tick(); brkT = setInterval(tick, 1000);
  }
  $('ks-brk-a').addEventListener('click', function () { used('brk_play', true); });

  // ---------- להורים ----------
  $('ks-par').addEventListener('click', function () {
    var u = location.origin + '/kelim/chashiva/kita/horim/#c=' + ME.code + '&s=' + ME.sid;
    window.open('https://wa.me/?text=' + encodeURIComponent('אמא, אבא, כאן רואים את ההתקדמות שלי בכיתה הווירטואלית 🏆\n' + u), '_blank'); used('parents_wa');
  });

  $('ks-leave').addEventListener('click', function () {
    if (!confirm('לצאת מהכיתה? הנקודות והעבודה שלך יימחקו.')) return;
    call('/c/' + ME.code + '/leave', { sid: ME.sid, token: ME.token }).then(function () { lsSet('kita-me', null); ME = null; used('leave'); showJoin(); });
  });

  if (ME) start(); else showJoin();
})();
