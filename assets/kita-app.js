// כיתה משחקת (/kelim/chashiva/kita/): הצטרפות ולוח לתלמידים, דף מורה (לוח, מתנות, תעודות, הגדרות), ודף לבית הספר.
// השרת: Worker kelim-kita (tools/kita-worker). בטלפון: kita-me (תלמיד/ה), kita-teach (הכיתות של המורה), kita-names-<קוד> (שמות אמיתיים לתעודות, רק מקומי).
(function () {
  'use strict';
  var API = (function () { try { var o = localStorage.getItem('kita-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8796' : 'https://kelim-kita.gilad4049.workers.dev'; })();
  var SITE = location.origin + '/kelim/chashiva/kita/';
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function used(tool, how) { if (window.toolUsed) window.toolUsed(tool, { how: how }); }
  function call(path, body) {
    return fetch(API + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
      .then(function (r) { return r.json().then(function (d) { d._s = r.status; return d; }); })
      .catch(function () { return { _s: 0, error: 'אין חיבור לשרת כרגע. בודקים את האינטרנט ומנסים שוב.' }; });
  }
  var GAMES = { sudoku: 'סודוקו', mila: 'מילה ביום', tashchetz: 'תשחצים', shachor: 'שחור ופתור', 'bagrut-math': 'מתמטיקה לבגרות', 'bagrut-english': 'אנגלית לבגרות', math: 'מתמטיקה', english: 'אנגלית', trivia: 'טריוויה', quiz: 'חידון' };
  var PER = { week: 'השבוע', month: 'החודש', round: 'בסבב הזה', all: 'מההתחלה' };
  function who(w) { if (w === '1') return 'למקום הראשון'; if (w === '2') return 'למקום השני'; if (w === '3') return 'למקום השלישי'; if (w === 'top3') return 'לשלושת הראשונים'; if (w === 'all') return 'לכל מי שצובר נקודות'; var m = /^pts:(\d+)$/.exec(w || ''); return m ? 'לכל מי שמגיע ל-' + m[1] + ' נקודות' : ''; }
  function medal(p) { return p === 1 ? '🥇' : p === 2 ? '🥈' : p === 3 ? '🥉' : p ? String(p) : '·'; }
  function giftsHtml(list) {
    return (list || []).map(function (g) { return '<li><span class="gi">' + esc(g.i) + '</span><div><b>' + esc(g.t) + '</b> <small>' + esc(who(g.who)) + (g.d ? ' · ' + esc(g.d) : '') + '</small></div></li>'; }).join('');
  }
  function tabs(box, attr, cur, fn) {
    box.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-selected', b.getAttribute(attr) === cur ? 'true' : 'false'); });
    box.onclick = function (e) { var b = e.target.closest('button[' + attr + ']'); if (b) fn(b.getAttribute(attr)); };
  }

  var app = $('kt-app'), page = app ? app.getAttribute('data-page') : '';
  // השרת עוד לא עלה / לא זמין: הודעה רכה במקום שגיאות בכל כפתור
  if (app) call('/ping').then(function (d) {
    if (d.ok) return;
    var n = document.createElement('p'); n.className = 'kt-warn'; n.id = 'kt-offline';
    n.textContent = 'הכיתות נפתחות ממש בקרוב. בינתיים אפשר לשחק במשחקי החשיבה, והנקודות יתחילו להיספר מהיום שהכיתה נפתחת.';
    app.insertBefore(n, app.firstChild);
  });
  if ($('kt-doc-print')) $('kt-doc-print').addEventListener('click', function () { used('chashiva_kita_school', 'print'); window.print(); });

  // ================= תלמידים + פתיחת כיתה =================
  if (page === 'student') {
    var me = lsGet('kita-me', null), per = null;
    var qc = (new URLSearchParams(location.search).get('c') || '').replace(/\D/g, '').slice(0, 6);
    var codeIn = $('kt-code'), nickIn = $('kt-nick');
    if (qc) codeIn.value = qc;
    function peek() {
      var c = codeIn.value.replace(/\D/g, ''); codeIn.value = c; $('kt-code-name').textContent = ''; $('kt-join-err').textContent = '';
      if (c.length !== 6) return;
      call('/c/' + c + '/info').then(function (d) {
        if (codeIn.value !== c) return;
        if (d.ok) $('kt-code-name').textContent = '✓ ' + d.name + (d.teacher ? ' · ' + d.teacher : '') + (d.locked ? ' (ההצטרפות סגורה כרגע)' : '');
        else $('kt-join-err').textContent = d.error;
      });
    }
    codeIn.addEventListener('input', peek); if (qc) peek();
    $('kt-join').addEventListener('submit', function (e) {
      e.preventDefault();
      var c = codeIn.value.replace(/\D/g, ''), n = nickIn.value.trim(), err = $('kt-join-err');
      if (c.length !== 6) { err.textContent = 'קוד הכיתה הוא 6 ספרות. מקבלים אותו מהמורה.'; codeIn.focus(); return; }
      if (n.length < 2) { err.textContent = 'כותבים כינוי של 2 אותיות לפחות.'; nickIn.focus(); return; }
      err.textContent = 'מצטרפים…';
      call('/c/' + c + '/join', { nick: n }).then(function (d) {
        if (!d.ok) { err.textContent = d.error; return; }
        err.textContent = '';
        me = { code: c, sid: d.sid, token: d.token, nick: d.nick, name: d.name, teacher: d.teacher };
        lsSet('kita-me', me); used('chashiva_kita', 'join');
        if (!window.KITA) { var s = document.createElement('script'); s.src = '/assets/kita.js'; document.head.appendChild(s); }
        showMine(true);
      });
    });
    function showMine(scroll) {
      $('kt-mine').hidden = !me; $('kt-join-sec').hidden = !!me;
      if (!me) return;
      $('kt-mine-name').textContent = me.name || ''; $('kt-mine-nick').textContent = me.nick;
      $('kt-mine-teacher').textContent = me.teacher || 'הכיתה שלי';
      loadBoard();
      if (scroll) $('kt-mine').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function loadBoard() {
      call('/c/' + me.code + '/board' + (per ? '?p=' + per : '')).then(function (d) {
        var err = $('kt-mine-err'); err.textContent = '';
        if (!d.ok) { err.textContent = d.error; if (d._s === 404) { lsSet('kita-me', null); } return; }
        per = d.period;
        me.name = d.name; me.teacher = d.teacher; lsSet('kita-me', me);
        $('kt-mine-name').textContent = d.name; $('kt-mine-teacher').textContent = d.teacher || 'הכיתה שלי';
        $('kt-mine-msg').textContent = d.msg ? '📣 ' + d.msg : '';
        tabs($('kt-per'), 'data-p', per, function (p) { per = p; loadBoard(); });
        var found = d.rows.some(function (r) { return r.sid === me.sid; });
        if (!found) { err.textContent = 'הכינוי שלכם כבר לא בכיתה (אולי המורה הסירה). אפשר להצטרף שוב.'; lsSet('kita-me', null); me = null; $('kt-join-sec').hidden = false; }
        $('kt-mine-board').innerHTML = d.rows.map(function (r) {
          return '<li class="' + (me && r.sid === me.sid ? 'me ' : '') + (r.place === 1 ? 'p1' : '') + '"><span class="pl">' + medal(r.place) + '</span><span class="nk">' + esc(r.nick) + (me && r.sid === me.sid ? ' (אני)' : '') + (r.crown ? '<small class="crown">👑 ' + esc(r.crown) + '</small>' : '') + '</span><span class="pt">' + (r.pts || '—') + '</span></li>';
        }).join('') || '<li><span class="pl">·</span><span class="nk">עוד אין אף אחד בכיתה</span><span></span></li>';
        $('kt-mine-gifts').innerHTML = giftsHtml(d.gifts); $('kt-mine-gifts-h').hidden = !d.gifts.length;
        $('kt-mine-magen').hidden = !d.gifts.some(function (g) { return g.k === 'magen'; });
      });
    }
    $('kt-leave').addEventListener('click', function () {
      if (!me || !confirm('לצאת מהכיתה ' + (me.name || '') + '? הכינוי והנקודות שלכם יימחקו מהלוח.')) return;
      call('/c/' + me.code + '/leave', { sid: me.sid, token: me.token }).then(function () { lsSet('kita-me', null); me = null; used('chashiva_kita', 'leave'); showMine(); });
    });
    // מורים
    var mine = lsGet('kita-teach', []);
    if (mine.length) {
      $('kt-my-classes').hidden = false;
      $('kt-my-classes').innerHTML = '<b>הכיתות שלי</b>' + mine.map(function (c) { return '<a href="/kelim/chashiva/kita/more/#c=' + c.code + '&k=' + c.key + '">' + esc(c.name) + ' ←<span>' + c.code + '</span></a>'; }).join('');
    }
    $('kt-new').addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('kt-new-err'), name = $('kt-new-name').value.trim();
      if (!name) { err.textContent = 'כותבים שם לכיתה, למשל ח׳2 מתמטיקה.'; $('kt-new-name').focus(); return; }
      err.textContent = 'פותחים…';
      call('/create', { name: name, teacher: $('kt-new-teacher').value.trim(), period: $('kt-new-period').value }).then(function (d) {
        if (!d.ok) { err.textContent = d.error; return; }
        var L = lsGet('kita-teach', []).filter(function (c) { return c.code !== d.code; });
        L.unshift({ code: d.code, key: d.key, name: name }); lsSet('kita-teach', L);
        used('chashiva_kita', 'create');
        location.href = '/kelim/chashiva/kita/more/#c=' + d.code + '&k=' + d.key + '&new=1';
      });
    });
    showMine();
  }

  // ================= דף המורה =================
  if (page === 'teacher') {
    var hp = new URLSearchParams(location.hash.slice(1)), T = null, data = null, tp = null, gifts = [];
    var list = lsGet('kita-teach', []);
    if (/^\d{6}$/.test(hp.get('c') || '') && hp.get('k')) {
      T = { code: hp.get('c'), key: hp.get('k'), name: '' };
      var old = list.filter(function (c) { return c.code === T.code; })[0]; if (old) T.name = old.name;
      list = [T].concat(list.filter(function (c) { return c.code !== T.code; })); lsSet('kita-teach', list);
    } else if (list.length) { T = list[0]; history.replaceState(null, '', '#c=' + T.code + '&k=' + T.key); }
    if (!T) { $('kt-nokey').hidden = false; return; }
    var adminUrl = SITE + 'more/#c=' + T.code + '&k=' + T.key;
    var names = lsGet('kita-names-' + T.code, {});
    function nm(r) { return names[r.sid] || r.nick; }

    function admin(act, extra) {
      var b = Object.assign({ key: T.key, act: act, p: tp }, extra || {});
      return call('/c/' + T.code + '/admin', b).then(function (d) {
        if (!d.ok) {
          $('kt-t-err').textContent = d.error;
          if (d._s === 404 || d._s === 403) { if (d._s === 404) lsSet('kita-teach', lsGet('kita-teach', []).filter(function (c) { return c.code !== T.code; })); $('kt-t').hidden = true; $('kt-nokey').hidden = false; $('kt-nokey').querySelector('p').textContent = d.error; }
          return d;
        }
        if (d.deleted) return d;
        data = d; tp = d.p; render(); return d;
      });
    }
    function render() {
      $('kt-t').hidden = false; $('kt-t-err').textContent = '';
      $('kt-t-name').textContent = data.name; $('kt-t-teacher').textContent = data.teacher || 'דף המורה';
      $('kt-t-count').textContent = data.rows.length + ' בכיתה' + (data.locked ? ' · הצטרפות סגורה' : '');
      $('kt-t-code').textContent = T.code;
      if (T.name !== data.name) { T.name = data.name; lsSet('kita-teach', lsGet('kita-teach', []).map(function (c) { return c.code === T.code ? T : c; })); }
      var inv = 'הצטרפו לכיתה "' + data.name + '" במשחקי החשיבה! נכנסים לקישור, בוחרים כינוי, וכל משחק ותרגול מוסיף נקודות ללוח הכיתה 🏆\nקוד הכיתה: ' + T.code + '\n' + SITE + '?c=' + T.code;
      $('kt-t-wa').href = 'https://wa.me/?text=' + encodeURIComponent(inv);
      $('kt-t-self').href = 'https://wa.me/?text=' + encodeURIComponent('קישור הניהול שלי לכיתה "' + data.name + '" (לא לשתף עם אף אחד):\n' + adminUrl);
      var others = lsGet('kita-teach', []).filter(function (c) { return c.code !== T.code; });
      $('kt-t-switch').hidden = !others.length;
      $('kt-t-switch').innerHTML = others.length ? '<b>עוד כיתות שלי</b>' + others.map(function (c) { return '<a href="#c=' + c.code + '&k=' + c.key + '" data-sw>' + esc(c.name) + ' ←<span>' + c.code + '</span></a>'; }).join('') : '';
      tabs($('kt-t-per'), 'data-p', tp, function (p) { tp = p; admin('get'); });
      renderBoard(); renderGifts(); renderSet(); renderCerts(); giladGift();
    }
    $('kt-t-switch').addEventListener('click', function (e) { if (e.target.closest('[data-sw]')) setTimeout(function () { location.reload(); }, 30); });

    function renderBoard() {
      $('kt-t-board').innerHTML = data.rows.map(function (r) {
        var g = Object.keys(r.games || {}).map(function (k) { return (GAMES[k] || k) + ' ' + r.games[k].p; }).join(' · ');
        return '<li class="' + (r.place === 1 ? 'p1' : '') + '" data-sid="' + esc(r.sid) + '"><span class="pl">' + medal(r.place) + '</span><span class="nk">' + esc(nm(r)) + (names[r.sid] ? '<small>כינוי: ' + esc(r.nick) + '</small>' : '') + (r.crown ? '<small class="crown">👑 ' + esc(r.crown) + '</small>' : '') + '</span><span class="pt">' + (r.pts || '—') + '</span>' +
          (g ? '<span class="kt-games">' + esc(g) + '</span>' : '') +
          '<span class="acts no-print"><button type="button" data-a="crown">👑 ' + (r.crown ? 'להוריד כתר' : 'כתר') + '</button><button type="button" data-a="real">✏️ שם אמיתי</button><button type="button" data-a="remove">הסרה</button></span></li>';
      }).join('') || '<li><span class="pl">·</span><span class="nk">עוד אין תלמידים. שולחים לקבוצת הכיתה את הקוד.</span><span></span></li>';
    }
    $('kt-t-board').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var sid = b.closest('li').getAttribute('data-sid'), r = data.rows.filter(function (x) { return x.sid === sid; })[0]; if (!r) return;
      var a = b.getAttribute('data-a');
      if (a === 'crown') {
        if (r.crown) { admin('crown', { sid: sid, label: '' }); return; }
        var l = prompt('מה כתוב ליד הכתר?', 'אלופת ' + { week: 'השבוע', month: 'החודש', round: 'הסבב', all: 'הכיתה' }[tp]);
        if (l) { admin('crown', { sid: sid, label: l }); used('chashiva_kita_more', 'crown'); }
      } else if (a === 'real') {
        var n = prompt('השם האמיתי של "' + r.nick + '" לתעודות. נשמר רק בטלפון הזה, לא נשלח לשרת. (ריק = למחוק)', names[sid] || '');
        if (n === null) return; n = n.trim().slice(0, 40);
        if (n) names[sid] = n; else delete names[sid];
        lsSet('kita-names-' + T.code, names); renderBoard(); renderCerts();
      } else if (a === 'remove') {
        if (confirm('להסיר את "' + r.nick + '" מהכיתה? גם הנקודות שלו יימחקו.')) admin('remove', { sid: sid });
      }
    });
    $('kt-t-refresh').addEventListener('click', function () { admin('get'); });

    // ---- מתנות ----
    var PRESETS = [
      { k: 'crown', i: '👑', t: 'כתר בלוח הכיתה', d: 'ליד הכינוי, עד הסבב הבא', who: '1' },
      { k: 'cert', i: '📜', t: 'תעודת הצטיינות', d: 'מודפסת ומוענקת מול הכיתה', who: 'top3' },
      { k: 'magen', i: '⭐', t: 'תוספת במגן', d: 'לפי החלטת המורה ובית הספר', who: '1' },
      { k: 'sweet', i: '🍫', t: 'צ׳ופר מתוק', d: '', who: 'top3' },
      { k: 'song', i: '🎵', t: 'בוחרת שיר או משחק לסוף השיעור', d: '', who: '1' },
      { k: 'hw', i: '📚', t: 'פטור משיעורי בית אחד', d: '', who: 'pts:300' },
      { k: 'parents', i: '💌', t: 'מילה טובה להורים', d: 'הודעה אישית מהמורה הביתה', who: 'top3' }
    ];
    var WHO = [['1', 'מקום ראשון'], ['2', 'מקום שני'], ['3', 'מקום שלישי'], ['top3', 'שלושת הראשונים'], ['pts', 'כל מי שמגיע ל…נקודות'], ['all', 'כל מי שצובר נקודות']];
    function renderGifts() {
      var cur = data.gifts || [];
      gifts = PRESETS.map(function (p) { var s = cur.filter(function (g) { return g.k === p.k; })[0]; return Object.assign({}, p, s || {}, { on: !!s }); })
        .concat(cur.filter(function (g) { return g.k === 'other'; }).map(function (g) { return Object.assign({}, g, { on: true }); }));
      drawGifts();
    }
    function drawGifts() {
      $('kt-g-list').innerHTML = gifts.map(function (g, i) {
        var w = /^pts:/.test(g.who) ? 'pts' : g.who, n = /^pts:(\d+)/.exec(g.who);
        return '<div class="kt-preset" data-i="' + i + '"><input type="checkbox" data-f="on" ' + (g.on ? 'checked' : '') + ' aria-label="' + esc(g.t) + '"><div><b>' + esc(g.i) + ' ' + esc(g.t) + '</b></div>' +
          '<div class="pd"><select data-f="who">' + WHO.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === w ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>' +
          '<input type="text" data-f="pts" inputmode="numeric" placeholder="כמה נקודות" value="' + (n ? n[1] : '200') + '"' + (w === 'pts' ? '' : ' hidden') + '>' +
          '<input type="text" data-f="d" maxlength="160" placeholder="פרטים (לא חובה)" value="' + esc(g.d || '') + '"></div></div>';
      }).join('');
    }
    $('kt-g-list').addEventListener('input', function (e) {
      var row = e.target.closest('[data-i]'); if (!row) return;
      var g = gifts[+row.getAttribute('data-i')], f = e.target.getAttribute('data-f');
      if (f === 'on') g.on = e.target.checked;
      if (f === 'd') g.d = e.target.value;
      if (f === 'who' || f === 'pts') {
        var w = row.querySelector('[data-f=who]').value, n = (row.querySelector('[data-f=pts]').value.replace(/\D/g, '') || '200').slice(0, 5);
        g.who = w === 'pts' ? 'pts:' + n : w; row.querySelector('[data-f=pts]').hidden = w !== 'pts';
      }
      if (f !== 'on') { g.on = true; row.querySelector('[data-f=on]').checked = true; }
    });
    $('kt-g-list').addEventListener('change', function (e) { if (e.target.tagName === 'SELECT' || e.target.type === 'checkbox') e.target.dispatchEvent(new Event('input', { bubbles: true })); });
    $('kt-g-add').addEventListener('click', function () {
      var t = $('kt-g-new-t').value.trim(); if (!t) { $('kt-g-new-t').focus(); return; }
      gifts.push({ k: 'other', i: '🎁', t: t, d: '', who: '1', on: true }); $('kt-g-new-t').value = ''; drawGifts();
    });
    $('kt-g-save').addEventListener('click', function () {
      $('kt-g-ok').textContent = ''; $('kt-g-err').textContent = '';
      var out = gifts.filter(function (g) { return g.on; }).map(function (g) { return { k: g.k, i: g.i, t: g.t, d: g.d || '', who: g.who }; });
      call('/c/' + T.code + '/admin', { key: T.key, act: 'gifts', gifts: out, p: tp }).then(function (d) {
        if (!d.ok) { $('kt-g-err').textContent = d.error; return; }
        data = d; $('kt-g-ok').textContent = '✓ נשמר. התלמידים רואים עכשיו ' + out.length + ' מתנות מעל הלוח.'; used('chashiva_kita_more', 'gifts'); renderCerts();
      });
    });

    // ---- מתנה מגילעד: שובר 50 ₪ למקום הראשון בחודש בכיתה פעילה (6 בחודש). הבקשה בווטסאפ, רק קוד וכינוי ----
    var giftChecked = '';
    function giladGift() {
      if (giftChecked === T.code) return; giftChecked = T.code;
      call('/c/' + T.code + '/admin', { key: T.key, act: 'get', p: 'month' }).then(function (d) {
        if (!d.ok) return;
        var top = d.rows[0], n = d.rows.length, st = $('kt-gilad-st'), btn = $('kt-gilad-btn');
        var ok = n >= 5 && top && top.pts >= 300;
        st.textContent = ok ? '✓ הכיתה עומדת בתנאים החודש. המקום הראשון: "' + top.nick + '" עם ' + top.pts + ' נקודות.'
          : 'החודש: ' + n + ' תלמידים, למקום הראשון ' + (top ? top.pts : 0) + ' נקודות. צריך 5 תלמידים ו-300 נקודות.';
        btn.hidden = !ok;
        if (ok) {
          var mon = new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
          btn.href = 'https://wa.me/972584049049?text=' + encodeURIComponent('שלום גילעד, אני ' + (d.teacher || 'מורה') + ' מכיתה משחקת "' + d.name + '" (קוד ' + T.code + '). המקום הראשון ב' + mon + ': הכינוי "' + top.nick + '" עם ' + top.pts + ' נקודות, ' + n + ' תלמידים בכיתה. אשמח לשובר המתנה, ואעביר אותו לתלמידה.
לבדיקה: https://kelim-kita.gilad4049.workers.dev/c/' + T.code + '/board?p=month');
          btn.onclick = function () { used('chashiva_kita_more', 'gilad-gift'); };
        }
      });
    }

    // ---- תעודות ----
    function certRows() {
      var w = $('kt-c-who').value;
      return data.rows.filter(function (r) { return r.pts > 0 && (w === 'all' || (w === '1' ? r.place === 1 : r.place >= 1 && r.place <= 3)); });
    }
    function giftFor(r) {
      return (data.gifts || []).filter(function (g) {
        if (g.k === 'crown' || g.k === 'cert' || g.k === 'magen') return false;
        var m = /^pts:(\d+)$/.exec(g.who);
        return g.who === 'all' || (m ? r.pts >= +m[1] : g.who === 'top3' ? r.place <= 3 : +g.who === r.place);
      }).map(function (g) { return g.i + ' ' + g.t; }).join(' · ');
    }
    function renderCerts() {
      if (!data) return;
      var rows = certRows(), st = $('kt-c-style').value, what = $('kt-c-what').value.trim(), dt = new Date().toLocaleDateString('he-IL');
      $('kt-c-out').innerHTML = rows.map(function (r) {
        var g = giftFor(r);
        return '<div class="kt-cert ' + st + '"><span class="c-bsd">בס״ד</span><div class="c-t">תעודת הצטיינות</div><div class="c-to">מוענקת בהוקרה ל</div><div class="c-n">' + esc(nm(r)) + '</div>' +
          '<div class="c-w">' + esc(what) + '<br>' + (r.place <= 3 ? 'במקום ה' + ['', 'ראשון', 'שני', 'שלישי'][r.place] : 'במקום ה-' + r.place) + ' בכיתה ' + esc(data.name) + ', ' + PER[tp] + ': ' + r.pts + ' נקודות</div>' +
          (g ? '<div class="c-g">' + esc(g) + '</div>' : '') +
          '<div class="c-sig"><span>' + esc(data.teacher || 'המורה') + '</span><span>' + dt + '</span></div></div>';
      }).join('') || '<p class="kt-note">עוד אין נקודות בלוח ' + PER[tp] + '. אפשר להחליף בלשונית הלוח ל"החודש" או "מההתחלה".</p>';
    }
    ['kt-c-who', 'kt-c-style', 'kt-c-what'].forEach(function (id) { $(id).addEventListener('input', renderCerts); $(id).addEventListener('change', renderCerts); });
    function printWith(cls, how) {
      document.body.classList.add(cls); used('chashiva_kita_more', how);
      var done = function () { document.body.classList.remove(cls); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done); window.print(); setTimeout(done, 60000);
    }
    $('kt-c-print').addEventListener('click', function () { if (!certRows().length) { renderCerts(); return; } printWith('kt-printing-cert', 'print-cert'); });

    // ---- מודעה לכיתה ----
    $('kt-t-poster-btn').addEventListener('click', function () {
      $('kt-poster').innerHTML = '<div class="p-h">🏆 ' + esc(data.name) + ': כיתה משחקת</div><div>כל משחק ותרגול מוסיף נקודות ללוח הכיתה</div><div class="p-code">' + T.code + '</div>' +
        '<ol><li>נכנסים ל: <span class="p-url">gilad-rachamim.github.io/kelim/chashiva/kita</span></li><li>כותבים את הקוד למעלה</li><li>בוחרים כינוי (לא שם מלא)</li><li>משחקים, מתרגלים וצוברים!</li></ol>' +
        ((data.gifts || []).length ? '<div><b>על מה מתחרים:</b> ' + data.gifts.map(function (g) { return esc(g.i + ' ' + g.t); }).join(' · ') + '</div>' : '');
      $('kt-poster-sec').hidden = false; $('kt-poster-sec').scrollIntoView({ behavior: 'smooth' }); used('chashiva_kita_more', 'poster');
    });
    $('kt-p-print').addEventListener('click', function () { printWith('kt-printing-poster', 'print-poster'); });
    $('kt-p-close').addEventListener('click', function () { $('kt-poster-sec').hidden = true; });

    // ---- הגדרות ----
    function renderSet() {
      $('kt-s-name').value = data.name; $('kt-s-teacher').value = data.teacher || ''; $('kt-s-period').value = data.period;
      $('kt-s-msg').value = data.msg || ''; $('kt-s-lock').checked = !!data.locked;
    }
    $('kt-s-form').addEventListener('submit', function (e) {
      e.preventDefault(); $('kt-s-ok').textContent = ''; $('kt-s-err').textContent = '';
      call('/c/' + T.code + '/admin', { key: T.key, act: 'settings', p: tp, name: $('kt-s-name').value, teacher: $('kt-s-teacher').value, period: $('kt-s-period').value, msg: $('kt-s-msg').value, locked: $('kt-s-lock').checked }).then(function (d) {
        if (!d.ok) { $('kt-s-err').textContent = d.error; return; }
        data = d; render(); $('kt-s-ok').textContent = '✓ נשמר'; used('chashiva_kita_more', 'settings');
      });
    });
    $('kt-s-round').addEventListener('click', function () {
      if (!confirm('להתחיל סבב חדש? לוח "מהסבב" יתאפס והכתרים יורדו. הנקודות הקודמות נשארות ב"מההתחלה".')) return;
      tp = 'round'; admin('round').then(function () { used('chashiva_kita_more', 'round'); });
    });
    $('kt-s-delete').addEventListener('click', function () {
      var c = prompt('מחיקה לגמרי של הכיתה "' + data.name + '", כולל כל הכינויים והנקודות. אי אפשר לשחזר.\nכדי לאשר, כתבו את קוד הכיתה: ' + T.code);
      if (c !== T.code) return;
      admin('delete').then(function (d) {
        if (!d.deleted) return;
        lsSet('kita-teach', lsGet('kita-teach', []).filter(function (x) { return x.code !== T.code; })); lsSet('kita-names-' + T.code, null);
        $('kt-t').hidden = true; $('kt-nokey').hidden = false; $('kt-nokey').querySelector('h2').textContent = 'הכיתה נמחקה';
        history.replaceState(null, '', location.pathname);
      });
    });

    // ---- לשוניות ----
    function tab(t) {
      tabs($('kt-t-tabs'), 'data-tab', t, tab);
      app.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== t; });
      if (t === 'cert') renderCerts();
    }
    tab('board');
    $('kt-t-copy').addEventListener('click', function () {
      var ok = function () { $('kt-t-copied').textContent = '✓ הקישור הועתק. שומרים אותו במקום בטוח.'; };
      if (navigator.clipboard) navigator.clipboard.writeText(adminUrl).then(ok, function () { prompt('להעתיק:', adminUrl); }); else prompt('להעתיק:', adminUrl);
    });
    $('kt-t-wa').addEventListener('click', function () { used('chashiva_kita_more', 'wa'); });
    if (hp.get('new')) { $('kt-t-save').scrollIntoView(); history.replaceState(null, '', '#c=' + T.code + '&k=' + T.key); }
    admin('get');
  }
})();
