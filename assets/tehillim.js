// סיום תהילים בקישור + מעשי חסד (כלי קודש). השרת: tools/tehillim-worker (Cloudflare Worker + Durable Object).
// /kodesh/tehillim/            → פתיחת סיום חדש (וגם ?new=1&p=&n=&bb=&par= ממילוי מוקדם)
// /kodesh/tehillim/?s=<id>     → הסיום: לוקחים פרקים, קוראים בדף, מסמנים "קראתי", מקבלים מעשה טוב
// #a=<key>                     → קישור ניהול (נשמר בטלפון ונמחק מהכתובת)
(function () {
  'use strict';
  var API = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://localhost:8788' : 'https://kodesh-tehillim.gilad4049.workers.dev';
  var $ = function (id) { return document.getElementById(id); };
  var N = window.TehillimText.num;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var used = function (x) { if (window.toolUsed) window.toolUsed('tehillim_siyum', x); };
  function ls(k, v) {
    try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; }
  }
  var TOK = ls('kodesh-tehillim-tok');
  if (!TOK) { TOK = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); ls('kodesh-tehillim-tok', TOK); }

  var T = window.TehillimText;
  function titleOf(m) {
    var h = m.p === 'other' ? (m.pt || '') : T.phrase(m.p);
    var who = m.n + (m.par ? ' ' + m.bb + ' ' + m.par : '');
    var full = T.join(h, who);
    // לתצוגה בשתי שורות: "לזיווג הגון" / "ליעקב בן שרה" (ה-ל' עוברת לשם)
    if (/(^|\s)ל$/.test(h)) { h = h.slice(0, -1).trim(); who = 'ל' + who; }
    return { h: h, who: who, full: full };
  }
  // קישור לשיתוף: דרך השרת, כדי שבווטסאפ תופיע כותרת עם השם ותמונה (הוא מפנה מיד לדף)
  // רק אם השרת כבר תומך בזה (ping מחזיר v>=2); אחרת קישור רגיל לדף.
  var SHARE = null;
  if (!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    fetch(API + '/ping').then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.v >= 2) { SHARE = API + '/j/'; if (S) set(S); }
    }).catch(function () {});
  }

  // ---------- יחידות: פרק / יום בחודש / ספר ----------
  var YOM = [[1, 9], [10, 17], [18, 22], [23, 28], [29, 34], [35, 38], [39, 43], [44, 48], [49, 54], [55, 59], [60, 65], [66, 68], [69, 71], [72, 76], [77, 78],
    [79, 82], [83, 87], [88, 89], [90, 96], [97, 103], [104, 105], [106, 107], [108, 112], [113, 118], ['119a'], ['119b'], [120, 134], [135, 139], [140, 144], [145, 150]];
  var SEFER = [[1, 41], [42, 72], [73, 89], [90, 106], [107, 150]], SNAME = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי'];
  var MODE_N = { perek: 150, yom: 30, sefer: 5 };
  function range(a, b) { var r = []; for (var i = a; i <= b; i++) r.push('Psalms.' + i); return r; }
  function unit(mo, k) {
    var i = k % MODE_N[mo], round = Math.floor(k / MODE_N[mo]);
    if (mo === 'perek') return { short: N(i + 1), name: 'פרק ' + N(i + 1), sub: '', refs: ['Psalms.' + (i + 1)], round: round };
    if (mo === 'sefer') { var s = SEFER[i]; return { short: 'ספר ' + SNAME[i], name: 'ספר ' + SNAME[i], sub: 'פרקים ' + N(s[0]) + '–' + N(s[1]), refs: range(s[0], s[1]), round: round }; }
    var y = YOM[i];
    if (y[0] === '119a') return { short: 'יום ' + N(i + 1), name: 'יום ' + N(i + 1) + ' בחודש', sub: 'קיט, א–צו', refs: ['Psalms.119.1-96'], round: round };
    if (y[0] === '119b') return { short: 'יום ' + N(i + 1), name: 'יום ' + N(i + 1) + ' בחודש', sub: 'קיט, צז–קעו', refs: ['Psalms.119.97-176'], round: round };
    return { short: 'יום ' + N(i + 1), name: 'יום ' + N(i + 1) + ' בחודש', sub: (y[0] === y[1] ? 'פרק ' + N(y[0]) : 'פרקים ' + N(y[0]) + '–' + N(y[1])), refs: range(y[0], y[1]), round: round };
  }

  // ---------- רשת ----------
  function api(path, body) {
    var o = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
    return fetch(API + path, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || 'שגיאה ' + r.status); return d; });
    }, function () { throw new Error('אין חיבור לשרת. בודקים את האינטרנט ומנסים שוב.'); });
  }
  function err(id, msg) { var e = $(id); e.textContent = msg || ''; e.hidden = !msg; }

  var q = new URLSearchParams(location.search), SID = (q.get('s') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  var hashA = (location.hash.match(/a=([a-z0-9]+)/) || [])[1];
  if (SID && hashA) { var ad = ls('kodesh-tehillim-adm') || {}; ad[SID] = hashA; ls('kodesh-tehillim-adm', ad); try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {} }
  var ADM = SID ? (ls('kodesh-tehillim-adm') || {})[SID] : null;

  if (!SID) initNew(); else initView();

  // ================= פתיחת סיום =================
  function initNew() {
    var f = $('ts-form');
    var v = function (n) { var el = f.querySelector('[name=' + n + ']'); return el.type === 'checkbox' ? el.checked : el.value.trim(); };
    T.fill($('ts-p'), true);
    if (q.get('new')) ['p', 'n', 'bb', 'par'].forEach(function (k) { if (q.get(k)) { var el = f.querySelector('[name=' + k + ']'); el.value = q.get(k); } });
    function onP() {
      $('ts-pt-w').hidden = v('p') !== 'other';
      $('ts-par-l').innerHTML = (/^refua/.test(v('p')) ? 'שם האם' : 'שם ההורה') + ' <span class="opt">(לא חובה)</span>';
      var d = T.defName(v('p')); if (d && !v('n')) $('ts-n').value = d;
    }
    f.addEventListener('change', onP); onP();
    var list = ls('kodesh-tehillim-list') || [];
    if (list.length) {
      $('ts-mine').hidden = false;
      $('ts-mine-list').innerHTML = list.slice(-8).reverse().map(function (x) { return '<li><a href="?s=' + esc(x.id) + '">' + esc(x.t) + '</a> <small>' + new Date(x.at).toLocaleDateString('he-IL') + '</small></li>'; }).join('');
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      err('ts-err', '');
      if (!v('n')) { err('ts-err', 'כתבו את השם.'); $('ts-n').focus(); return; }
      if (v('p') === 'other' && !v('pt')) { err('ts-err', 'כתבו את הניסוח.'); $('ts-pt').focus(); return; }
      var key = v('p'), core = T.CORE[key];
      var m = { p: core ? key : 'other', pt: core ? v('pt') : T.phrase(key), n: v('n'), bb: v('bb'), par: v('par'), g: v('g'), x: v('x'), cr: v('cr'), mo: f.querySelector('[name=mo]:checked').value, r: parseInt(v('r'), 10), ch: v('ch') ? 1 : 0 };
      var b = $('ts-create'); b.disabled = true; b.textContent = 'פותח…';
      api('/s', { m: m }).then(function (d) {
        var ad = ls('kodesh-tehillim-adm') || {}; ad[d.id] = d.a; ls('kodesh-tehillim-adm', ad);
        var l = ls('kodesh-tehillim-list') || []; l.push({ id: d.id, t: titleOf(m).full, at: Date.now() }); ls('kodesh-tehillim-list', l.slice(-30));
        used({ how: 'create', mode: m.mo, rounds: m.r, kind: m.p, chesed: m.ch });
        location.href = '?s=' + d.id + '&made=1';
      }).catch(function (x) { err('ts-err', x.message); b.disabled = false; b.textContent = 'לפתוח את הסיום ולקבל קישור'; });
    });
  }

  // ================= הסיום =================
  var S = null, reader = null;
  function link() { return SHARE ? SHARE + SID : location.origin + '/kodesh/tehillim/?s=' + SID; }
  function uw(one) { var mo = S.m.mo; return one ? (mo === 'perek' ? 'פרק אחד' : mo === 'yom' ? 'יום אחד' : 'ספר אחד') : (mo === 'perek' ? 'פרקים' : mo === 'yom' ? 'ימים' : 'ספרים'); }
  function waText() {
    var t = titleOf(S.m), m = S.m, free = S.total - S.taken;
    var prog = S.done === S.total ? 'ברוך ה׳, הסיום הושלם! תודה לכל מי שהשתתף.' : S.taken ? 'כבר נלקחו ' + S.taken + ' מתוך ' + S.total + ' ' + uw() + (free ? ', נשארו עוד ' + free + '.' : '. הכול נלקח, מחכים לקריאה.') : 'מתחילים עכשיו: ' + S.total + ' ' + uw() + (S.r > 1 ? ' (' + S.r + ' סיומים)' : '') + '.';
    return '📖 *סיום תהילים ' + t.full + '*' + (m.g ? '\n🗓️ ' + m.g : '') + '\n\n' + prog +
      (free ? '\n\n🤲 לוקחים ' + uw(1) + ' וקוראים אותו ישר בקישור, כמה דקות. כל פרק הוא זכות גדולה.' : '') +
      (m.ch ? '\n💛 ואפשר גם מעשה טוב של דקה, כבר עכשיו.' : '') + '\n\n👈 ' + (free ? 'לבחור פרק' : 'לסיום') + ': ' + link();
  }
  function initView() {
    $('ts-new').hidden = true; $('ts-hero').hidden = true; $('ts-view').hidden = false;
    var w = ls('kodesh-tehillim-name'); if (w) $('ts-w').value = w;
    $('ts-w').addEventListener('change', function () { ls('kodesh-tehillim-name', this.value.trim()); });
    load(true);
    setInterval(function () { if (!document.hidden) load(false); }, 25000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(false); });
    document.querySelectorAll('[data-copy-link]').forEach(function (b) {
      b.addEventListener('click', function () { copy(link(), b); used({ how: 'copy_link' }); });
    });
    document.querySelectorAll('[data-wa]').forEach(function (a) { a.addEventListener('click', function () { used({ how: 'wa', where: a.id || 'after' }); }); });
    document.querySelectorAll('[data-share-img]').forEach(function (b) { b.addEventListener('click', shareImage); });
    $('ts-now').addEventListener('click', onNow);
    $('ts-copy-admin').addEventListener('click', function () { copy(location.origin + '/kodesh/tehillim/?s=' + SID + '#a=' + ADM, this); });
    $('ts-add-round').addEventListener('click', function () {
      if (!confirm('להוסיף עוד סיום שלם (סבב נוסף)?')) return;
      api('/s/' + SID + '/admin', { a: ADM, t: TOK, op: 'round' }).then(function (d) { set(d.s); }).catch(function (x) { alert(x.message); });
    });
    $('ts-del').addEventListener('click', function () {
      if (!confirm('למחוק את הסיום לגמרי? כל הפרקים שנלקחו והמעשים הטובים יימחקו, והקישור יפסיק לעבוד. אי אפשר לבטל.')) return;
      api('/s/' + SID + '/admin', { a: ADM, op: 'delete' }).then(function () {
        var l = (ls('kodesh-tehillim-list') || []).filter(function (x) { return x.id !== SID; }); ls('kodesh-tehillim-list', l);
        location.href = '/kodesh/tehillim/';
      }).catch(function (x) { alert(x.message); });
    });
    $('ts-grid').addEventListener('click', onGrid);
    $('ts-my').addEventListener('click', onMy);
    $('ts-chesed').addEventListener('click', onChesed);
    $('ts-pl-go').addEventListener('click', pledge);
  }
  function copy(text, b) {
    var old = b.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { b.textContent = 'הועתק ✓'; }, function () { prompt('להעתיק:', text); }).then(function () { setTimeout(function () { b.textContent = old; }, 1800); });
  }
  function load(first) {
    return api('/s/' + SID + '?t=' + TOK).then(function (d) { set(d); }).catch(function (x) {
      if (first) $('ts-head').innerHTML = '<p class="ts-err">' + esc(x.message) + '</p><p class="ts-hint"><a class="gold" href="/kodesh/tehillim/">לפתוח סיום חדש</a></p>';
    });
  }
  function set(d) {
    var firstTime = !S;
    S = d;
    if (firstTime) {
      var t = titleOf(S.m);
      document.title = 'סיום תהילים ' + t.full + ' | כלי קודש';
      $('ts-head').innerHTML = '<div class="k">בס"ד · סיום תהילים' + (S.r > 1 ? ' · ' + S.r + ' סיומים' : '') + '</div>' +
        (t.h ? '<p class="for">' + esc(t.h) + '</p>' : '') + '<h1>' + esc(t.who) + '</h1>' +
        (S.m.g ? '<p class="g">' + esc(S.m.g) + '</p>' : '') + (S.m.x ? '<p class="x">' + esc(S.m.x) + '</p>' : '') +
        (S.m.cr ? '<p class="cr">פתחו: ' + esc(S.m.cr) + '</p>' : '');
      $('ts-made').hidden = !(q.get('made') && ADM);
      $('ts-admin').hidden = !ADM;
      $('ts-az').hidden = S.m.p !== 'niftar';
      var sq = new URLSearchParams({ k: S.m.p, n: S.m.n, bb: S.m.bb });
      if (S.m.par) sq.set('par', S.m.par);
      $('ts-shem').href = '/kodesh/tehillim/shem/?' + sq.toString();
      $('ts-chesed-box').hidden = !S.m.ch;
      $('ts-now').hidden = !S.m.ch;
      $('ts-now-for').textContent = t.full;
      var doneNow = ls('kodesh-tehillim-now-' + SID) || {};
      Object.keys(doneNow).forEach(function (k) { var b = $('ts-now').querySelector('[data-now="' + k + '"]'); if (b) b.classList.add('on'); });
      $('ts-ch-for').textContent = t.full;
      var B = S.m.mo === 'perek' ? [[1, 'לקחת פרק אחד'], [3, '3 פרקים'], [5, '5 פרקים'], [10, '10 פרקים']] : S.m.mo === 'yom' ? [[1, 'לקחת יום אחד'], [2, 'יומיים'], [3, '3 ימים']] : [[1, 'לקחת ספר אחד']];
      $('ts-take-btns').innerHTML = B.map(function (b, i) { return '<button class="btn ' + (i ? 'btn-line' : 'btn-gold') + ' btn-sm" type="button" data-n="' + b[0] + '">' + b[1] + '</button>'; }).join('');
      $('ts-take-btns').addEventListener('click', function (e) { var b = e.target.closest('[data-n]'); if (b) take({ n: parseInt(b.getAttribute('data-n'), 10) }); });
    }
    var wa = 'https://wa.me/?text=' + encodeURIComponent(waText());
    document.querySelectorAll('[data-wa]').forEach(function (a) { a.href = wa; });
    renderProg(); renderGrid(); renderMine(); renderChesed();
  }
  function renderProg() {
    var pd = S.done / S.total * 100, pt = (S.taken - S.done) / S.total * 100, free = S.total - S.taken;
    var u = S.m.mo === 'perek' ? 'פרקים' : S.m.mo === 'yom' ? 'ימים' : 'ספרים';
    var h = '<div class="ts-bar" role="img" aria-label="' + S.done + ' נקראו מתוך ' + S.total + '"><i class="d" style="width:' + pd + '%"></i><i class="t" style="width:' + pt + '%"></i></div>' +
      '<div class="ts-nums"><span><b>' + S.taken + '</b> מתוך ' + S.total + ' ' + u + ' נלקחו</span><span><b>' + S.done + '</b> נקראו</span><span>' + (free ? '<b>' + free + '</b> עוד פנויים' : 'הכול נלקח') + '</span></div>';
    var rounds = Math.floor(S.done / S.N);
    if (S.done === S.total) h += '<div class="ts-done">ספר התהילים הושלם' + (S.r > 1 ? ' ' + S.r + ' פעמים' : '') + '!<small>תודה לכל מי שהשתתף. ' + esc(titleOf(S.m).full) + '.</small></div>';
    else if (S.r > 1 && rounds) h += '<div class="ts-done" style="font-size:1.1rem">כבר ' + (rounds === 1 ? 'סיום אחד שלם' : rounds + ' סיומים שלמים') + '</div>';
    else if (!free) h += '<p class="ts-hint" style="text-align:center">כל ה' + u + ' נלקחו. מחכים שכולם יסמנו "קראתי".</p>';
    $('ts-prog').innerHTML = h;
    $('ts-take-box').hidden = !free;
  }
  function renderGrid() {
    var mine = {}; S.mine.forEach(function (k) { mine[k] = 1; });
    var h = '';
    for (var r = 0; r < S.r; r++) {
      if (S.r > 1) h += '<div class="ts-round">סיום ' + N(r + 1) + '</div>';
      h += '<div class="ts-g' + (S.m.mo === 'perek' ? '' : ' wide') + '">';
      for (var i = 0; i < S.N; i++) {
        var k = r * S.N + i, st = S.s.charAt(k), u = unit(S.m.mo, k), who = S.w[k];
        var cls = st === '2' ? 'd' : st === '1' ? 't' : 'f';
        var lab = u.name + (u.sub ? ' (' + u.sub + ')' : '') + (st === '0' ? ' – פנוי, ללחוץ כדי לקחת' : st === '1' ? ' – נלקח' + (who ? ' ע"י ' + who : '') : ' – נקרא' + (who ? ' ע"י ' + who : ''));
        h += '<button type="button" class="ts-u ' + cls + (mine[k] ? ' mine' : '') + '" data-k="' + k + '" title="' + esc(lab) + '" aria-label="' + esc(lab) + '">' + esc(u.short) + (u.sub && S.m.mo !== 'perek' ? '<small>' + esc(u.sub) + '</small>' : '') + '</button>';
      }
      h += '</div>';
    }
    $('ts-grid').innerHTML = h;
  }
  function renderMine() {
    var my = S.mine.slice().sort(function (a, b) { return a - b; });
    $('ts-my-box').hidden = !my.length && !reader;
    $('ts-my').innerHTML = my.map(function (k) {
      var u = unit(S.m.mo, k), ok = S.s.charAt(k) === '2';
      return '<li class="' + (ok ? 'ok' : '') + '"><b>' + esc(u.name) + (ok ? ' ✓' : '') + '<small>' + esc([u.sub, S.r > 1 ? 'סיום ' + N(u.round + 1) : ''].filter(Boolean).join(' · ')) + '</small></b>' +
        '<button class="btn btn-gold" type="button" data-read="' + k + '">לקרוא כאן</button>' +
        (ok ? '' : '<button class="btn btn-line" type="button" data-done="' + k + '">קראתי ✓</button><button class="btn btn-line" type="button" data-free="' + k + '">להחזיר</button>') + '</li>';
    }).join('');
  }
  function take(body) {
    err('ts-take-err', '');
    body.t = TOK; body.w = $('ts-w').value.trim(); ls('kodesh-tehillim-name', body.w);
    return api('/s/' + SID + '/take', body).then(function (d) {
      set(d.s);
      if (!d.got.length) { err('ts-take-err', 'מישהו אחר לקח את זה רגע לפניך. בחרו משהו אחר.'); return; }
      used({ how: 'take', n: d.got.length, mode: S.m.mo });
      $('ts-after').hidden = false;
      openReader(d.got[0], 0);
    }).catch(function (x) { err('ts-take-err', x.message); });
  }
  function onGrid(e) {
    var b = e.target.closest('[data-k]'); if (!b) return;
    var k = parseInt(b.getAttribute('data-k'), 10), st = S.s.charAt(k);
    if (st === '0') { take({ u: [k] }); return; }
    if (S.mine.indexOf(k) >= 0) { openReader(k, 0); return; }
    if (ADM && st === '1' && confirm('להחזיר את "' + unit(S.m.mo, k).name + '" לפנויים? (מי שלקח עוד לא סימן שקרא)')) {
      api('/s/' + SID + '/free', { t: TOK, a: ADM, u: [k] }).then(function (d) { set(d.s); }).catch(function (x) { alert(x.message); });
    }
  }
  function onMy(e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-read')) { openReader(parseInt(b.getAttribute('data-read'), 10), 0); return; }
    var k = parseInt(b.getAttribute('data-done') || b.getAttribute('data-free'), 10), op = b.hasAttribute('data-done') ? 'done' : 'free';
    if (op === 'free' && !confirm('להחזיר את "' + unit(S.m.mo, k).name + '" כדי שמישהו אחר ייקח?')) return;
    mark(k, op);
  }
  function mark(k, op) {
    return api('/s/' + SID + '/' + op, { t: TOK, u: [k] }).then(function (d) {
      set(d.s); used({ how: op });
      if (op === 'free' && reader && reader.k === k) closeReader();
      if (op === 'done' && reader && reader.k === k) renderReader();
      // התקדמות אישית: כל יום שקראתם בו תהילים נספר, בכל הסיומים יחד (assets/hitkadmut.js)
      if (op === 'done' && window.HK) HK.done('tehillim', { el: $('ts-hk'), title: 'תזכו למצוות ✓', line: 'עוד פרקים נקראו לזכות ' + titleOf(S.m).full + '.', help: 'הכלי הזה בחינם ובלי פרסומות', share: 'קראתי היום תהילים בסיום ' + titleOf(S.m).full + '. מצטרפים לקחת פרק?\n' + link() });
    }).catch(function (x) { alert(x.message); });
  }

  // ---------- מעשה טוב של דקה, עכשיו ----------
  var NOW = {
    mila: ['milatova', 'שלחתי עכשיו מילה טובה למישהו'],
    tzedaka: ['tzedaka', 'נתתי עכשיו צדקה'],
    lashon: ['lashon', 'שעה מעכשיו בלי לשון הרע'],
    zikui: ['other', 'זיכיתי עוד חבר בסיום']
  };
  var KIND = ['רציתי רק להגיד: תודה שיש אותך 💛 שיהיה לך יום טוב!', 'חשבתי עליך עכשיו, ורציתי להגיד שטוב שיש אותך 💛', 'בלי סיבה מיוחדת: שמחה גדולה שיש אותך בחיים שלי 💛'];
  function onNow(e) {
    var b = e.target.closest('[data-now]'); if (!b) return;
    var k = b.getAttribute('data-now'), done = ls('kodesh-tehillim-now-' + SID) || {};
    if (k === 'mila') window.open('https://wa.me/?text=' + encodeURIComponent(KIND[Math.floor(Math.random() * KIND.length)]), '_blank', 'noopener');
    if (k === 'zikui') window.open('https://wa.me/?text=' + encodeURIComponent(waText()), '_blank', 'noopener');
    if (done[k]) { $('ts-now-ok').textContent = 'כבר נרשם, תודה!' + (k === 'mila' || k === 'zikui' ? ' אפשר לשלוח עוד, זה רק מוסיף זכויות.' : ''); $('ts-now-ok').hidden = false; return; }
    api('/s/' + SID + '/chesed', { i: NOW[k][0], w: $('ts-w').value.trim(), x: NOW[k][1], t: TOK }).then(function (d) {
      done[k] = Date.now(); ls('kodesh-tehillim-now-' + SID, done);
      b.classList.add('on');
      $('ts-now-ok').textContent = 'זכית! זה נרשם ' + titleOf(S.m).full + '.';
      $('ts-now-ok').hidden = false;
      used({ how: 'now', item: k });
      set(d.s);
    }).catch(function (x) { $('ts-now-ok').textContent = x.message; $('ts-now-ok').hidden = false; });
  }

  // ---------- תמונה לשיתוף: שם, מטרה והתקדמות, עם הקישור בהודעה ----------
  function shareImage() {
    var cv = $('ts-cv'), c = cv.getContext('2d'), W = 1080, H = 1080, t = titleOf(S.m);
    var SERIF = '"Frank Ruhl Libre", serif', SANS = '"Assistant", Arial, sans-serif';
    var fonts = document.fonts && document.fonts.load ? Promise.all([document.fonts.load('700 60px "Frank Ruhl Libre"'), document.fonts.load('600 40px "Assistant"')]).catch(function () {}) : Promise.resolve();
    fonts.then(function () {
      var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0e1628'); g.addColorStop(1, '#1b2a4a');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#d4b062'; c.lineWidth = 4; c.strokeRect(30, 30, W - 60, H - 60); c.lineWidth = 1; c.strokeRect(44, 44, W - 88, H - 88);
      c.direction = 'rtl'; c.textAlign = 'right'; c.fillStyle = '#d4b062'; c.font = '600 30px ' + SANS; c.fillText('בס"ד', W - 80, 100);
      c.textAlign = 'center';
      function fit(txt, font, size, max) { var s = size; do { c.font = font.replace('#', s); s -= 2; } while (c.measureText(txt).width > max && s > 20); }
      var y = 230;
      c.fillStyle = '#e6c57e'; c.font = '700 84px ' + SERIF; c.fillText('סיום תהילים', W / 2, y);
      if (t.h) { y += 95; c.fillStyle = '#d3d9e6'; fit(t.h, '400 #px ' + SANS, 46, W - 200); c.fillText(t.h, W / 2, y); }
      y += 105; c.fillStyle = '#fbfaf4'; fit(t.who, '700 #px ' + SERIF, 92, W - 180); c.fillText(t.who, W / 2, y);
      if (S.m.g) { y += 75; c.fillStyle = '#d4b062'; fit(S.m.g, '600 #px ' + SANS, 40, W - 200); c.fillText(S.m.g, W / 2, y); }
      y += 95; var x0 = 190, x1 = W - 190, bw = x1 - x0;
      c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(x0, y, bw, 26);
      c.fillStyle = '#8a7444'; c.fillRect(x1 - bw * S.taken / S.total, y, bw * S.taken / S.total, 26);
      c.fillStyle = '#d4b062'; c.fillRect(x1 - bw * S.done / S.total, y, bw * S.done / S.total, 26);
      y += 75; c.fillStyle = '#d3d9e6'; c.font = '600 40px ' + SANS;
      c.fillText(S.done === S.total ? 'הסיום הושלם, תודה לכולם!' : 'נלקחו ' + S.taken + ' מתוך ' + S.total + ' ' + uw(), W / 2, y);
      y += 100; c.fillStyle = '#e6c57e'; c.font = '700 54px ' + SERIF;
      c.fillText(S.taken < S.total ? 'קחו ' + uw(1) + ' – זכות גדולה' : 'תודה לכל המשתתפים', W / 2, y);
      c.fillStyle = '#9aa6bf'; c.font = '400 30px ' + SANS; c.fillText('הקישור בהודעה · נוצר בחינם בכלי קודש', W / 2, H - 90);
      cv.toBlob(function (blob) {
        var file = new File([blob], 'siyum-tehillim.png', { type: 'image/png' }), text = waText();
        used({ how: 'share_img' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text: text }).catch(function () {}); return; }
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'siyum-tehillim.png'; document.body.appendChild(a); a.click(); a.remove();
        if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function () {});
        alert('התמונה נשמרה, וההודעה עם הקישור הועתקה. פותחים ווטסאפ, מצרפים את התמונה ומדביקים את ההודעה.');
      }, 'image/png');
    });
  }

  // ---------- קריאה בדף ----------
  function openReader(k, i) { reader = { k: k, i: i }; $('ts-my-box').hidden = false; renderReader(); $('ts-reader').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function closeReader() { reader = null; $('ts-reader').hidden = true; renderMine(); }
  function renderReader() {
    var el = $('ts-reader'), u = unit(S.m.mo, reader.k), ref = u.refs[reader.i], last = reader.i >= u.refs.length - 1;
    var ch = parseInt(ref.split('.')[1], 10), part = ref.split('.')[2];
    el.hidden = false;
    el.innerHTML = '<h3>' + esc(u.name) + (u.refs.length > 1 ? ' · פרק ' + N(ch) : '') + '</h3><p class="ts-hint" style="text-align:center">טוען…</p>';
    var want = reader.k + ':' + reader.i;
    window.TehillimText.load(ref).then(function (vs) {
      if (!reader || reader.k + ':' + reader.i !== want) return;
      var ok = S.s.charAt(reader.k) === '2';
      var h = '<h3>' + (u.refs.length > 1 ? esc(u.name) + ' · ' : '') + 'תהילים פרק ' + N(ch) + (part ? ' (' + (part === '1-96' ? 'א–צו' : 'צז–קעו') + ')' : '') + '</h3>';
      h += vs ? vs.map(function (v) { return '<p><sup>' + N(v.v) + '</sup>' + esc(v.t) + '</p>'; }).join('') : '<p class="ts-hint">לא הצלחתי לטעון את הטקסט. בודקים את האינטרנט ולוחצים שוב על "לקרוא כאן".</p>';
      h += '<div class="nav">';
      if (reader.i > 0) h += '<button class="btn btn-line btn-sm" type="button" data-rd="-1">לפרק הקודם</button>';
      if (!last) h += '<button class="btn btn-gold btn-sm" type="button" data-rd="1">לפרק הבא (' + N(parseInt(u.refs[reader.i + 1].split('.')[1], 10)) + ')</button>';
      if (last && !ok) h += '<button class="btn btn-gold btn-sm" type="button" data-rd="done">סיימתי, קראתי ✓</button>';
      if (last && ok) h += '<span class="ts-pl-sum">סומן שקראת ✓ תודה!</span>';
      h += '<button class="btn btn-line btn-sm" type="button" data-rd="x">לסגור</button></div>';
      h += '<p class="src">' + (u.refs.length > 1 ? 'פרק ' + (reader.i + 1) + ' מתוך ' + u.refs.length + ' · ' : '') + 'הטקסט מתוך ספריא</p>';
      el.innerHTML = h;
    });
  }
  $('ts-reader').addEventListener('click', function (e) {
    var b = e.target.closest('[data-rd]'); if (!b || !reader) return;
    var a = b.getAttribute('data-rd');
    if (a === 'x') return closeReader();
    if (a === 'done') return mark(reader.k, 'done');
    reader.i += parseInt(a, 10); renderReader(); $('ts-reader').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------- מעשי חסד ----------
  var CH = [
    ['tzedaka', 'צדקה', 'לתת צדקה, גם סכום קטן'],
    ['bikur', 'ביקור חולים', 'לבקר חולה, או להתקשר לשאול לשלומו'],
    ['ner', 'הדלקת נר', ''],
    ['lashon', 'שמירת הלשון', 'שעה ביום בלי לשון הרע ובלי רכילות'],
    ['brachot', 'ברכות בכוונה', 'ברכה אחת ביום, לאט, מתוך הסידור'],
    ['mishna', 'לימוד משנה', ''],
    ['tefila', 'תפילה בכוונה', 'תפילה אחת ביום במניין, או "אמן" בכוונה'],
    ['horim', 'כיבוד הורים', 'שיחה, עזרה או ביקור אצל ההורים'],
    ['ezra', 'עזרה לזולת', 'לעזור לשכן, לחבר או למשפחה'],
    ['orchim', 'הכנסת אורחים', 'להזמין מישהו לסעודת שבת'],
    ['milatova', 'מילה טובה', 'לפרגן למישהו אחד כל יום'],
    ['other', 'קבלה אישית', 'כותבים לבד מה מקבלים']
  ];
  var CHN = {}; CH.forEach(function (c) { CHN[c[0]] = c[1]; });
  var sel = null;
  function chText(c) {
    if (c[0] === 'ner') return S.m.p === 'niftar' ? 'נר נשמה, לעילוי ' + (S.m.bb === 'בת' ? 'נשמתה' : 'נשמתו') : 'הדלקת נרות שבת בזמן';
    if (c[0] === 'mishna') return S.m.p === 'niftar' ? 'פרק משנה, משנה אותיות נשמה' : 'פרק משנה אחד, או הלכה אחת ביום';
    return c[2];
  }
  function renderChesed() {
    if (!S.m.ch) return;
    $('ts-chesed').innerHTML = CH.map(function (c) {
      var n = (S.c && S.c[c[0]]) || 0;
      return '<button type="button" data-ch="' + c[0] + '" aria-pressed="' + (sel === c[0]) + '"><span class="c' + (n ? '' : ' z') + '">' + n + '</span><b>' + c[1] + '</b><small>' + esc(chText(c)) + '</small></button>';
    }).join('');
    var h = S.cn ? '<li class="ts-pl-sum" style="border:0;padding:0">' + S.cn + ' מעשים טובים כבר נלקחו</li>' : '';
    h += S.cl.slice(0, 15).map(function (x) {
      return '<li>' + (x[1] ? '<b>' + esc(x[1]) + '</b> – ' : '') + esc(CHN[x[0]] || '') + (x[2] ? ': ' + esc(x[2]) : '') + ' <small>' + ago(x[3]) + '</small></li>';
    }).join('');
    $('ts-pl-list').innerHTML = h;
  }
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 2) return 'עכשיו'; if (m < 60) return 'לפני ' + m + ' דקות';
    var h = Math.round(m / 60); if (h < 24) return h === 1 ? 'לפני שעה' : 'לפני ' + h + ' שעות';
    var d = Math.round(h / 24); return d === 1 ? 'אתמול' : 'לפני ' + d + ' ימים';
  }
  function onChesed(e) {
    var b = e.target.closest('[data-ch]'); if (!b) return;
    sel = b.getAttribute('data-ch');
    var c = CH.filter(function (x) { return x[0] === sel; })[0];
    $('ts-pledge').hidden = false;
    $('ts-pl-sel').textContent = 'בחרת: ' + c[1];
    $('ts-pl-x-l').innerHTML = sel === 'other' ? 'מה מקבלים על עצמך' : 'במילים שלך <span class="opt">(לא חובה)</span>';
    err('ts-pl-err', '');
    renderChesed();
    $('ts-pledge').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(function () { $('ts-pl-x').focus({ preventScroll: true }); }, 400);
  }
  function pledge() {
    if (!sel) return;
    var x = $('ts-pl-x').value.trim();
    if (sel === 'other' && !x) { err('ts-pl-err', 'כתבו מה מקבלים על עצמכם.'); return; }
    var b = $('ts-pl-go'); b.disabled = true;
    api('/s/' + SID + '/chesed', { i: sel, w: $('ts-w').value.trim(), x: x, t: TOK }).then(function (d) {
      used({ how: 'chesed', item: sel });
      sel = null; $('ts-pl-x').value = ''; $('ts-pledge').hidden = true;
      set(d.s);
      $('ts-pl-ok').textContent = 'תודה! זה נרשם ' + titleOf(S.m).full + '.';
      $('ts-pl-ok').hidden = false;
    }).catch(function (x2) { err('ts-pl-err', x2.message); }).then(function () { b.disabled = false; });
  }
})();
