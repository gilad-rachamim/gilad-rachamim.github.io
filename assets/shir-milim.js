// "השיר שלי" – כותבים את המילים: נושא, חרוזים ומבנה, שאלות מנחות, עורך עם הצעות, ודף השיר.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sm-parts') || !window.Shir) return;
  var S = window.Shir, TOOL = 'shir_milim', esc = S.esc;
  var MOODS = ['שמח', 'שקט', 'געגוע', 'תודה', 'תפילה', 'כוח', 'אהבה', 'תקווה', 'לילדים'];
  var QS = [['what', 'מה קרה?', 'מה הסיפור שמאחורי השיר'], ['felt', 'מה הרגשת?', 'מילים פשוטות, כמו שאומרים לחבר'], ['helped', 'מה עזר לך?', 'אדם, מקום, דבר קטן'],
    ['say', 'מה היית רוצה להגיד?', 'למישהו, לעצמך, לעולם'], ['one', 'במשפט אחד – מה הכי חשוב?', 'זה יכול להיות הפזמון']];
  var song, screen = 1, LAST = 5, busy = false;
  function used(how) { S.used(TOOL, how); }

  function touch() { if (song.demo) { S.undemo(song); $('sm-demo').hidden = true; } S.save(); }

  function drawSongs() {
    $('sm-songs').innerHTML = S.list().map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === song.id ? ' selected' : '') + '>' + esc(s.title || s.topic || 'שיר בלי שם') + '</option>'; }).join('');
  }
  function orderText() {
    return 'סדר השירה: <b>' + song.order.map(function (id) { var p = S.part(song, id); return p ? S.partName(song, p) : ''; }).filter(Boolean).join(' ← ') + '</b>';
  }

  // ---------- מסכים ----------
  function show(n) {
    screen = Math.max(1, Math.min(LAST, n)); song.screen = screen; S.save();
    [].forEach.call(document.querySelectorAll('.shr-screen'), function (el) { el.hidden = +el.getAttribute('data-s') !== screen; });
    $('sm-where').textContent = 'שלב ' + screen + ' מתוך ' + LAST;
    $('sm-prev').style.visibility = screen === 1 ? 'hidden' : 'visible';
    $('sm-next').hidden = screen === LAST;
    $('sm-final').hidden = screen !== LAST;
    if (screen === 2) $('sm-order2').innerHTML = orderText();
    if (screen === 4) drawEditor();
    if (screen === LAST) drawCard();
  }
  function drawAll() {
    $('sm-demo').hidden = !song.demo;
    $('sm-topic').value = song.topic || ''; $('sm-for').value = song.forWhom || '';
    $('sm-title').value = song.title || ''; $('sm-author').value = song.author || '';
    $('sm-mood').innerHTML = MOODS.map(function (m) { return '<button type="button" class="' + (song.mood === m ? 'on' : '') + '" data-v="' + m + '">' + m + '</button>'; }).join('');
    [].forEach.call($('sm-rhyme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-v') === (song.rhyme || 'yes')); });
    $('sm-qs').innerHTML = QS.map(function (q) {
      return '<div class="shr-q"><label for="sm-q-' + q[0] + '">' + q[1] + '</label><textarea class="k-ta" id="sm-q-' + q[0] + '" data-q="' + q[0] + '" maxlength="300" placeholder="' + esc(q[2]) + '">' + esc((song.answers || {})[q[0]] || '') + '</textarea></div>';
    }).join('');
    drawSongs(); show(song.screen || 1);
  }

  // ---------- העורך ----------
  function drawEditor() {
    var raw = QS.map(function (q) { var a = (song.answers || {})[q[0]]; return a ? '<li>' + esc(a) + '</li>' : ''; }).join('');
    $('sm-raw').hidden = !raw; $('sm-rawl').innerHTML = raw;
    $('sm-order').innerHTML = orderText();
    $('sm-parts').innerHTML = song.parts.map(function (p) {
      return '<div class="shr-part ' + p.type + '" data-p="' + p.id + '"><div class="ph"><b>' + S.partName(song, p) + '</b>' +
        (p.id === 'v1' || p.id === 'c' ? '' : '<button type="button" data-delp="1">להוריד את החלק</button>') + '</div>' +
        p.lines.map(function (l, i) {
          var n = S.lineSyl(l);
          return '<div class="shr-line" data-i="' + i + '"><input type="text" maxlength="90" value="' + esc(l.t) + '" placeholder="' + (i ? 'עוד שורה' : 'השורה הראשונה') + '" aria-label="שורה ' + (i + 1) + '">' +
            '<span class="tools"><span class="shr-syl' + (l.s ? ' man' : '') + '" title="מספר הברות (בערך)"><button type="button" data-syl="-1" aria-label="פחות הברות">−</button><span>' + n + ' הבר\'</span><button type="button" data-syl="1" aria-label="יותר הברות">+</button></span>' +
            '<button class="shr-mini gold" type="button" data-ask="1">הצע לי</button><button class="shr-mini" type="button" data-dell="1" aria-label="למחוק שורה">✕</button></span>' +
            '<div class="shr-ask" hidden><button class="shr-mini" type="button" data-t="next_line">שורה הבאה</button><button class="shr-mini" type="button" data-t="rephrase">ניסוח אחר</button><button class="shr-mini" type="button" data-t="rhymes">חרוז למילה האחרונה</button></div>' +
            '<div class="shr-sug" hidden></div></div>';
        }).join('') +
        '<button class="shr-mini" type="button" data-addl="1">+ שורה</button></div>';
    }).join('');
  }
  function lineOf(el) { var p = el.closest('[data-p]'), r = el.closest('[data-i]'); return { part: S.part(song, p.getAttribute('data-p')), i: r ? +r.getAttribute('data-i') : -1, row: r }; }
  function sugBox(row, title, opts, onPick, note) {
    var box = row.querySelector('.shr-sug'); box.hidden = false;
    box.innerHTML = '<button class="x" type="button" aria-label="לסגור">✕</button><p>' + esc(title) + '</p><div class="opts">' +
      (opts.length ? opts.map(function (o, k) { return '<button type="button" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') : '<span class="hint">לא נמצא. אפשר לנסות מילה אחרת.</span>') + '</div>' +
      (note ? '<p style="margin-top:.4rem">' + esc(note) + '</p>' : '');
    box.onclick = function (e) {
      if (e.target.classList.contains('x')) { box.hidden = true; return; }
      var b = e.target.closest('[data-k]'); if (b) { onPick(opts[+b.getAttribute('data-k')]); }
    };
  }
  function rhymeTarget(p, i) {
    // השורה שצריך לחרוז איתה: בחרוזים – השורה הזוגית חורזת עם הקודמת (שורה 2 עם 1, 4 עם 3, או ABCB: 4 עם 2)
    if (song.rhyme === 'no' || (song.rhyme === 'chorus' && p.type !== 'chorus')) return '';
    var n = i + 1; // השורה החדשה תהיה במקום i+1
    if (n % 2 === 1) { var prev = p.lines[n - 1]; return prev ? S.lastWord(prev.t) : ''; }
    return '';
  }
  function localIdeas(task, p, i) {
    // בלי עוזר: שאלה מנחה, או חרוזים מהמילון
    var l = p.lines[i] || { t: '' };
    if (task === 'rhymes' || (task === 'next_line' && rhymeTarget(p, i))) return S.rhymes(task === 'rhymes' ? S.lastWord(l.t) : rhymeTarget(p, i), 12);
    var ans = QS.map(function (q) { return (song.answers || {})[q[0]]; }).filter(Boolean);
    return Promise.resolve(ans.length ? ans.slice(0, 3) : ['מה רואים שם?', 'מה שומעים?', 'מה היית אומר לעצמך?']);
  }
  function askFor(row, task) {
    if (busy) return; busy = true;
    var L = lineOf(row), p = L.part, i = L.i, l = p.lines[i];
    var title = { next_line: 'הצעות לשורה הבאה – לוחצים על מה שמתאים:', rephrase: 'ניסוחים אחרים – לוחצים כדי להחליף:', rhymes: 'מילים שחורזות עם "' + S.lastWord(l.t) + '" (בערך):' }[task];
    var box = row.querySelector('.shr-sug'); box.hidden = false; box.innerHTML = '<p>חושב…</p>';
    var pick = function (o) {
      touch();
      if (task === 'rephrase') { l.t = o; l.s = 0; }
      else if (task === 'rhymes') { l.t = (l.t || '').replace(/\s+$/, ''); var nl = { t: '' }; p.lines.splice(i + 1, 0, nl); setTimeout(function () { var inp = document.querySelector('[data-p="' + p.id + '"] [data-i="' + (i + 1) + '"] input'); if (inp) { inp.placeholder = 'שורה שנגמרת ב"' + o + '"'; inp.focus(); } }, 0); }
      else { p.lines.splice(i + 1, 0, { t: o }); }
      S.save(); used('pick_' + task); drawEditor();
    };
    var line = { text: l.t, section: S.partName(song, p), syllables: S.lineSyl(l), rhymeWith: rhymeTarget(p, i), word: S.lastWord(l.t) };
    var local = task === 'rhymes' ? S.rhymes(S.lastWord(l.t), 14) : null;
    var ai = S.ask(task, song, line);
    Promise.all([local || Promise.resolve([]), ai.catch(function (e) { return { err: e && e.msg || S.REST }; })]).then(function (r) {
      busy = false;
      var aiOpts = Array.isArray(r[1]) ? r[1] : [];
      if (task === 'rhymes') { sugBox(row, title, aiOpts.concat(r[0]).slice(0, 16), pick, aiOpts.length ? '' : (r[1].err || '')); used('rhymes'); return; }
      if (aiOpts.length) { sugBox(row, title, aiOpts, pick); used('ai_' + task); return; }
      localIdeas(task, p, i).then(function (ideas) {
        sugBox(row, task === 'next_line' && rhymeTarget(p, i) ? 'השורה הבאה צריכה לחרוז עם "' + rhymeTarget(p, i) + '". מילים שמתאימות:' : 'רעיונות מתוך מה שסיפרת:', ideas,
          task === 'next_line' && rhymeTarget(p, i) ? function (o) { touch(); p.lines.splice(i + 1, 0, { t: '' }); S.save(); drawEditor(); var inp = document.querySelector('[data-p="' + p.id + '"] [data-i="' + (i + 1) + '"] input'); if (inp) { inp.placeholder = 'שורה שנגמרת ב"' + o + '"'; inp.focus(); } } : pick,
          r[1].err || S.REST);
      });
    });
  }

  function addPart(type) {
    touch();
    var id = type[0] + S.uid().slice(-4), np = { id: id, type: type, lines: [{ t: '' }] };
    if (type === 'bridge') { song.parts.push(np); var last = song.order.lastIndexOf('c'); song.order.splice(last < 0 ? song.order.length : last, 0, id); }
    else { song.parts.push(np); song.order.push(id); if (S.part(song, 'c')) song.order.push('c'); }
    S.save(); used('add_' + type);
    if (screen === 2) $('sm-order2').innerHTML = orderText(); else drawEditor();
  }

  // ---------- דף השיר ----------
  function drawCard() {
    var th = song.theme || 'klaf';
    $('sm-card').className = 'shr-card t-' + th;
    [].forEach.call($('sm-theme').children, function (b) { b.classList.toggle('on', b.getAttribute('data-t') === th); });
    var seen = {};
    $('sm-card').innerHTML = '<h3>' + esc(song.title || 'השיר שלי') + '</h3>' + (song.author ? '<p class="by">מילים: ' + esc(song.author) + '</p>' : '<p class="by"></p>') +
      S.sung(song).map(function (x) {
        if (seen[x.part.id]) return '<h4>(' + esc(x.name) + ')</h4>'; seen[x.part.id] = 1;
        return '<h4>' + esc(x.name) + '</h4><p>' + esc(x.lines.join('\n')) + '</p>';
      }).join('') + '<p class="ft">נכתב ב"השיר שלי" – הכלים של גילעד רחמים</p>';
    $('sm-wa').href = S.wa((song.title ? '🎵 ' + song.title + '\n' : '') + (song.author ? 'מילים: ' + song.author + '\n\n' : '\n') + S.plain(song) + '\n\nכתבתי את השיר ב"השיר שלי", בחינם: https://hakelim.com/kelim/shir/');
  }

  // ---------- אירועים ----------
  $('sm-next').onclick = function () { if (screen === 1 && !song.topic && !song.demo) { $('sm-topic').focus(); $('sm-where').textContent = 'כתבו נושא קצר, ואז ממשיכים.'; return; } used('step_' + (screen + 1)); show(screen + 1); window.scrollTo(0, 0); };
  $('sm-prev').onclick = function () { show(screen - 1); window.scrollTo(0, 0); };
  $('sm-topic').oninput = function () { touch(); song.topic = this.value; S.save(); };
  $('sm-for').oninput = function () { touch(); song.forWhom = this.value; S.save(); };
  $('sm-title').oninput = function () { touch(); song.title = this.value; S.save(); drawSongs(); drawCard(); };
  $('sm-author').oninput = function () { touch(); song.author = this.value; S.save(); drawCard(); };
  $('sm-mood').onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; touch(); song.mood = song.mood === b.getAttribute('data-v') ? '' : b.getAttribute('data-v'); S.save(); used('mood'); drawAll(); };
  $('sm-rhyme').onclick = function (e) { var b = e.target.closest('[data-v]'); if (!b) return; touch(); song.rhyme = b.getAttribute('data-v'); S.save(); used('rhyme_' + song.rhyme); [].forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); }); };
  $('sm-qs').oninput = function (e) { var q = e.target.getAttribute('data-q'); if (!q) return; touch(); song.answers = song.answers || {}; song.answers[q] = e.target.value; S.save(); };
  [].forEach.call(document.querySelectorAll('[data-add]'), function (b) { b.onclick = function () { addPart(b.getAttribute('data-add')); }; });
  $('sm-parts').oninput = function (e) {
    if (e.target.tagName !== 'INPUT') return; var L = lineOf(e.target); touch();
    L.part.lines[L.i].t = e.target.value; L.part.lines[L.i].s = 0; S.save();
    L.row.querySelector('.shr-syl span').textContent = S.lineSyl(L.part.lines[L.i]) + " הבר'"; L.row.querySelector('.shr-syl').classList.remove('man');
  };
  $('sm-parts').onchange = function (e) { if (e.target.tagName === 'INPUT') used('write'); };
  $('sm-parts').onkeydown = function (e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return; e.preventDefault();
    var L = lineOf(e.target); touch(); L.part.lines.splice(L.i + 1, 0, { t: '' }); S.save(); drawEditor();
    var inp = document.querySelector('[data-p="' + L.part.id + '"] [data-i="' + (L.i + 1) + '"] input'); if (inp) inp.focus();
  };
  $('sm-parts').onclick = function (e) {
    var t = e.target, L;
    if (t.closest('.shr-sug')) return;
    if (t.hasAttribute('data-addl')) { L = lineOf(t); touch(); L.part.lines.push({ t: '' }); S.save(); drawEditor(); var ins = document.querySelectorAll('[data-p="' + L.part.id + '"] input'); if (ins.length) ins[ins.length - 1].focus(); return; }
    if (t.hasAttribute('data-delp')) { L = lineOf(t); touch(); song.parts = song.parts.filter(function (p) { return p !== L.part; }); song.order = song.order.filter(function (id) { return id !== L.part.id; }); S.save(); drawEditor(); return; }
    if (t.hasAttribute('data-dell')) { L = lineOf(t); touch(); L.part.lines.splice(L.i, 1); if (!L.part.lines.length) L.part.lines.push({ t: '' }); S.save(); drawEditor(); return; }
    if (t.hasAttribute('data-syl')) { L = lineOf(t); touch(); var l = L.part.lines[L.i]; l.s = Math.max(1, S.lineSyl(l) + +t.getAttribute('data-syl')); S.save(); used('syl'); L.row.querySelector('.shr-syl span').textContent = l.s + " הבר'"; L.row.querySelector('.shr-syl').classList.add('man'); return; }
    if (t.hasAttribute('data-ask')) { var a = t.closest('[data-i]').querySelector('.shr-ask'); a.hidden = !a.hidden; return; }
    if (t.hasAttribute('data-t')) { t.closest('.shr-ask').hidden = true; askFor(t.closest('[data-i]'), t.getAttribute('data-t')); }
  };
  $('sm-chorus-ai').onclick = function () {
    if (busy) return; busy = true; var btn = this; btn.textContent = 'חושב…';
    S.ask('chorus', song, {}).then(function (opts) {
      busy = false; btn.textContent = 'הצע לי פזמון'; used('ai_chorus');
      var c = S.part(song, 'c'); var host = document.querySelector('[data-p="c"] .shr-line'); if (!c || !host) return;
      sugBox(host, 'פזמונים מתוך מה שסיפרת – לוחצים כדי להכניס (מחליף את הפזמון):', opts, function (o) { touch(); c.lines = o.split(/\s*\/\s*|\n/).filter(Boolean).map(function (t) { return { t: t.trim() }; }); S.save(); used('pick_chorus'); drawEditor(); });
    }, function (e) { busy = false; btn.textContent = 'הצע לי פזמון'; $('sm-msg').textContent = (e && e.msg) || S.REST + ' בינתיים: "במשפט אחד – מה הכי חשוב?" יכול להיות הפזמון.'; });
  };
  $('sm-title-ai').onclick = function () {
    var box = $('sm-title-sug'); box.innerHTML = '<p class="hint">חושב…</p>';
    S.ask('title', song, {}).then(function (opts) {
      used('ai_title');
      box.innerHTML = '<div class="shr-chips">' + opts.map(function (o) { return '<button type="button">' + esc(o) + '</button>'; }).join('') + '</div>';
      box.onclick = function (e) { if (e.target.tagName === 'BUTTON') { touch(); song.title = e.target.textContent; $('sm-title').value = song.title; S.save(); drawSongs(); drawCard(); box.innerHTML = ''; } };
    }, function (e) { box.innerHTML = '<p class="hint">' + esc((e && e.msg) || S.REST) + '</p>'; });
  };
  $('sm-theme').onclick = function (e) { var b = e.target.closest('[data-t]'); if (!b) return; song.theme = b.getAttribute('data-t'); S.save(); used('theme'); drawCard(); };
  $('sm-print').onclick = function () { used('print'); window.print(); };
  $('sm-wa').addEventListener('click', function () { used('wa'); });
  $('sm-go').addEventListener('click', function () { used('next'); S.save(); });
  $('sm-songs').onchange = function () { song = S.select(this.value); used('switch'); drawAll(); };
  $('sm-new').onclick = function () { song = S.create(); used('new'); drawAll(); $('sm-topic').focus(); };
  $('sm-start').onclick = function () { song = S.create(); used('start_own'); drawAll(); $('sm-topic').focus(); };
  $('sm-del').onclick = function () { if (!confirm('למחוק את השיר "' + (song.title || song.topic || 'בלי שם') + '"? אי אפשר להחזיר.')) return; S.remove(song.id); song = S.cur(); used('delete'); drawAll(); };

  song = S.cur();
  drawAll();
})();
