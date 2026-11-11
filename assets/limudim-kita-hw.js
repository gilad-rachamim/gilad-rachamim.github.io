/* שיעורי בית במחברת – דף המורה (/limudim/machberet/kita/).
   השרת: kelim-kita (tools/kita-worker), אותה כיתה כמו "כיתה משחקת". מפתח המורה נשמר רק בטלפון (kita-teach) ובקישור. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('kh-app')) return;
  var M = window.MbMath;
  var API = (function () { try { var o = localStorage.getItem('kita-api'); if (o) return o; } catch (e) {} return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? 'http://127.0.0.1:8796' : 'https://kelim-kita.gilad4049.workers.dev'; })();
  function lsGet(k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var usedOnce = {};
  function used(a) { if (usedOnce[a]) return; usedOnce[a] = 1; if (window.toolUsed) window.toolUsed('machberet_kita', { action: a }); }
  function call(path, body) {
    return fetch(API + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
      .then(function (r) { return r.json().then(function (d) { d._s = r.status; if (/פעולה לא מוכרת/.test(d.error || '') || (r.status === 404 && d.error === 'לא נמצא')) d.error = 'שיעורי הבית במחברת יופעלו ממש בקרוב. בינתיים אפשר לפתוח כיתה ולשלוח לתלמידים את הקישור.'; return d; }); })
      .catch(function () { return { _s: 0, error: 'אין חיבור לשרת כרגע. בודקים את האינטרנט ומנסים שוב.' }; });
  }
  function tex(el, s) { if (window.katex) { try { window.katex.render(String(s), el, { throwOnError: false, output: 'html' }); return; } catch (_) {} } el.textContent = s; }
  function err(id, msg) { var e = $(id); e.hidden = !msg; e.textContent = msg || ''; }

  // ---------- הכיתה: מהקישור (#c=&k=) או ממה שנשמר בטלפון ----------
  var list = lsGet('kita-teach', []), T = null;
  var hp = new URLSearchParams(location.hash.slice(1));
  if (/^\d{6}$/.test(hp.get('c') || '') && hp.get('k')) {
    T = { code: hp.get('c'), key: hp.get('k'), name: '' };
    var old = list.filter(function (c) { return c.code === T.code; })[0]; if (old) T.name = old.name;
    list = [T].concat(list.filter(function (c) { return c.code !== T.code; })); lsSet('kita-teach', list);
  } else if (list.length) T = list[0];

  if (!T) { $('kh-new-class').hidden = false; }
  $('kh-create').addEventListener('click', function () {
    var b = this; b.disabled = true; err('kh-cerr', '');
    call('/create', { name: $('kh-cname').value, teacher: $('kh-cteacher').value }).then(function (d) {
      b.disabled = false;
      if (!d.ok) return err('kh-cerr', d.error);
      T = { code: d.code, key: d.key, name: $('kh-cname').value.trim() };
      list = [T].concat(list); lsSet('kita-teach', list); used('class_new');
      $('kh-new-class').hidden = true; start();
    });
  });

  var cur = null, view = null, sel = null, timer = null;
  function start() {
    history.replaceState(null, '', '#c=' + T.code + '&k=' + T.key);
    $('kh-main').hidden = false;
    var s = $('kh-cls');
    if (list.length > 1) {
      s.hidden = false; s.innerHTML = list.map(function (c) { return '<option value="' + c.code + '"' + (c.code === T.code ? ' selected' : '') + '>' + esc(c.name || c.code) + '</option>'; }).join('');
    }
    $('kh-code').textContent = T.code;
    var link = location.origin + '/limudim/machberet/?kita=' + T.code;
    $('kh-slink').value = link;
    $('kh-mylink').href = location.origin + '/limudim/machberet/kita/#c=' + T.code + '&k=' + T.key;
    $('kh-wa').href = 'https://wa.me/?text=' + encodeURIComponent('שיעורי הבית במחברת 📓 נכנסים לקישור, בוחרים כינוי (בלי שם מלא) ופותרים. כל שורה נבדקת לבד, ואם נתקעים לוחצים "נתקעתי":\n' + link);
    loadList();
  }
  $('kh-cls').addEventListener('change', function () { var c = this.value; T = list.filter(function (x) { return x.code === c; })[0]; cur = null; $('kh-live').hidden = true; start(); });
  $('kh-copy').addEventListener('click', function () {
    var i = $('kh-slink'); i.select();
    try { navigator.clipboard.writeText(i.value).then(function () { $('kh-copy').textContent = '✓ הועתק'; }); } catch (e) { document.execCommand('copy'); $('kh-copy').textContent = '✓ הועתק'; }
    used('copy_link');
  });

  function admin(act, x) { return call('/c/' + T.code + '/admin', Object.assign({ key: T.key, act: act }, x || {})); }

  function loadList() {
    admin('hw_list').then(function (d) {
      if (!d.ok) { $('kh-list').innerHTML = '<li class="pt-err">' + esc(d.error) + '</li>'; return; }
      T.name = d.name; $('kh-cls-name').textContent = d.name; lsSet('kita-teach', list);
      $('kh-nst').textContent = d.students ? d.students + ' תלמידים בכיתה' : 'עוד אין תלמידים. שולחים להם את הקישור למטה.';
      var ul = $('kh-list');
      if (!d.hw.length) { ul.innerHTML = '<li class="note">עוד אין מטלות. נותנים את הראשונה למעלה.</li>'; return; }
      ul.innerHTML = d.hw.map(function (h) {
        return '<li><button type="button" class="kh-hw' + (cur === h.id ? ' on' : '') + '" data-hw="' + h.id + '"><b>' + esc(h.title) + '</b>' +
          '<span>' + h.n + ' תרגילים · ' + h.who + ' התחילו · ' + h.done + ' ✓' + (h.stuck ? ' · <em>' + h.stuck + ' 🙋</em>' : '') + (h.open ? '' : ' · סגורה') + '</span></button></li>';
      }).join('');
    });
  }
  $('kh-list').addEventListener('click', function (e) { var b = e.target.closest('[data-hw]'); if (b) openHw(b.getAttribute('data-hw')); });

  // ---------- מטלה חדשה ----------
  function lines(id) { return $(id).value.split('\n').map(function (s) { return s.trim(); }); }
  $('kh-ex').addEventListener('input', function () {
    var p = $('kh-exprev'); p.innerHTML = '';
    lines('kh-ex').filter(Boolean).slice(0, 10).forEach(function (q, i) {
      var d = document.createElement('div'); d.className = 'kh-pq';
      var I = M ? M.readLine(q) : null;
      d.innerHTML = '<span>' + (i + 1) + '.</span><span class="m" dir="ltr"></span>';
      if (I && I.tex) tex(d.querySelector('.m'), I.tex); else d.querySelector('.m').textContent = q;
      p.appendChild(d);
    });
  });
  $('kh-send').addEventListener('click', function () {
    var qs = lines('kh-ex'), hs = lines('kh-hints'), as = lines('kh-ans'), ex = [];
    qs.forEach(function (q, i) { if (q) ex.push({ q: q, h: hs[i] || '', a: as[i] || '' }); });
    err('kh-err', '');
    if (!ex.length) return err('kh-err', 'כותבים לפחות תרגיל אחד, כל תרגיל בשורה משלו.');
    var b = this; b.disabled = true;
    admin('hw_new', { title: $('kh-title').value || 'שיעורי בית', ex: ex }).then(function (d) {
      b.disabled = false;
      if (!d.ok) return err('kh-err', d.error);
      $('kh-title').value = ''; $('kh-ex').value = ''; $('kh-hints').value = ''; $('kh-ans').value = ''; $('kh-exprev').innerHTML = '';
      used('hw_new'); loadList(); openHw(d.id);
    });
  });

  // ---------- לוח חי ----------
  function openHw(id) {
    cur = id; sel = null; $('kh-detail').hidden = true; $('kh-live').hidden = false;
    refresh(true); clearInterval(timer);
    timer = setInterval(function () { if (!document.hidden) refresh(false); }, 10000);
    used('hw_view');
  }
  function refresh(scroll) {
    if (!cur) return;
    admin('hw_view', { hw: cur }).then(function (d) {
      if (!d.ok) { $('kh-upd').textContent = d.error; return; }
      view = d; draw();
      $('kh-upd').textContent = 'עודכן ' + new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      $('kh-close').textContent = d.hw.open ? 'לסגור את המטלה' : 'לפתוח שוב את המטלה';
      if (scroll) $('kh-live').scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (sel) detail(sel.sid, sel.ex, true);
      loadList();
    });
  }
  function workOf(sid, ex) { for (var i = 0; i < view.work.length; i++) if (view.work[i].sid === sid && view.work[i].ex === ex) return view.work[i]; return null; }
  function cell(w) {
    if (!w) return ['·', 'none', 'עוד לא התחיל/ה'];
    if (w.done) return ['✓', 'done', 'פתר/ה'];
    if (w.stuck) return ['🙋', 'stuck', 'נתקע/ה ומחכה לעזרה'];
    var n = w.rows.filter(function (r) { return String(r).trim(); }).length;
    return ['✏️' + (w.warn ? '<small>' + w.warn + '?</small>' : ''), w.warn ? 'warn' : 'work', 'בדרך: ' + n + ' שורות' + (w.warn ? ', ' + w.warn + ' עם "?"' : '')];
  }
  function draw() {
    var h = view.hw, g = $('kh-grid');
    $('kh-live-t').textContent = h.title;
    var head = '<thead><tr><th>כינוי</th>' + h.ex.map(function (e, i) { return '<th title="' + esc(e.q) + '">' + (i + 1) + '</th>'; }).join('') + '</tr></thead>';
    var body = view.students.map(function (s) {
      return '<tr><th>' + esc(s.nick) + '</th>' + h.ex.map(function (e, i) {
        var c = cell(workOf(s.sid, i));
        return '<td><button type="button" class="kh-c ' + c[1] + (sel && sel.sid === s.sid && sel.ex === i ? ' on' : '') + '" data-sid="' + s.sid + '" data-ex="' + i + '" aria-label="' + esc(s.nick) + ', תרגיל ' + (i + 1) + ': ' + c[2] + '">' + c[0] + '</button></td>';
      }).join('') + '</tr>';
    }).join('');
    g.innerHTML = head + '<tbody>' + (body || '<tr><td colspan="' + (h.ex.length + 1) + '" class="note">עוד אין תלמידים בכיתה. שולחים להם את הקישור.</td></tr>') + '</tbody>';
  }
  $('kh-grid').addEventListener('click', function (e) { var b = e.target.closest('[data-sid]'); if (b) detail(b.getAttribute('data-sid'), +b.getAttribute('data-ex')); });

  function detail(sid, ex, keep) {
    sel = { sid: sid, ex: ex };
    var st = view.students.filter(function (s) { return s.sid === sid; })[0], e = view.hw.ex[ex], w = workOf(sid, ex), box = $('kh-detail');
    if (!st || !e) { box.hidden = true; return; }
    var typing = keep && box.querySelector('textarea') && box.querySelector('textarea') === document.activeElement;
    if (typing) return; // לא לדרוס רמז שהמורה כותבת עכשיו
    box.hidden = false;
    var rows = (w && w.rows.length ? w.rows : [e.q]);
    var res = M ? M.checkAll(rows, { deg: true }) : [];
    var msgs = view.msgs.filter(function (m) { return (m.sid === sid || m.sid === '*') && m.ex === ex; });
    box.innerHTML = '<h3>' + esc(st.nick) + ' · תרגיל ' + (ex + 1) + ' <small>' + esc(cell(w)[2]) + '</small></h3>' +
      '<ol class="kh-rows"></ol>' +
      (msgs.length ? '<ul class="kh-msgs">' + msgs.map(function (m) { return '<li>' + (m.kind === 'answer' ? '🔓 תשובה' : '💬 רמז') + (m.sid === '*' ? ' (לכל הכיתה)' : '') + ': ' + esc(m.text) + '</li>'; }).join('') + '</ul>' : '') +
      '<label class="pt-lbl" for="kh-msg">רמז או תשובה ל' + esc(st.nick) + '</label><textarea class="kh-in" id="kh-msg" rows="2"></textarea>' +
      '<div class="btns"><button type="button" class="btn btn-gold btn-sm" data-send="hint">💬 לשלוח רמז</button><button type="button" class="btn btn-sm" data-send="answer">🔓 לשחרר תשובה</button>' +
      (e.h ? '<button type="button" class="linkish" data-fill="h">הרמז שהכנתי</button>' : '') + '<button type="button" class="linkish" data-fill="auto">רמז אוטומטי</button>' + (e.a ? '<button type="button" class="linkish" data-fill="a">התשובה שהכנתי</button>' : '') + '</div>' +
      '<p class="pt-err" id="kh-merr" hidden></p>';
    var ol = box.querySelector('.kh-rows');
    rows.forEach(function (r, i) {
      var R = res[i] || { info: {} }, li = document.createElement('li');
      li.className = R.mark === 'ok' ? 'ok' : R.mark === 'warn' ? 'warn' : '';
      li.innerHTML = '<span class="n">' + (i ? i : 'תרגיל') + '</span><span class="m" dir="ltr"></span><span class="k">' + (R.mark === 'ok' ? '✓' : R.mark === 'warn' ? '?' : '') + '</span>' + (R.msg && R.mark === 'warn' ? '<small>' + esc(R.msg) + '</small>' : '');
      if (R.info.tex) tex(li.querySelector('.m'), R.info.tex); else li.querySelector('.m').textContent = r;
      ol.appendChild(li);
    });
    box.querySelectorAll('[data-fill]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-fill');
        $('kh-msg').value = k === 'h' ? e.h : k === 'a' ? e.a : autoHint(rows, res);
      });
    });
    box.querySelectorAll('[data-send]').forEach(function (b) {
      b.addEventListener('click', function () {
        var kind = b.getAttribute('data-send'), text = $('kh-msg').value.trim();
        if (!text && kind === 'answer' && e.a) text = e.a;
        if (!text && kind === 'hint' && e.h) text = e.h;
        if (!text) { err('kh-merr', 'כותבים קודם רמז או תשובה.'); return; }
        b.disabled = true;
        admin('hw_msg', { hw: cur, sid: sid, ex: ex, kind: kind, text: text }).then(function (d) {
          b.disabled = false;
          if (!d.ok) return err('kh-merr', d.error);
          used(kind === 'answer' ? 'send_answer' : 'send_hint'); $('kh-msg').value = ''; refresh(false);
        });
      });
    });
    draw();
    if (!keep) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  // רמז אוטומטי: איפה הסימן הצהוב הראשון, בלי לגלות תשובה
  function autoHint(rows, res) {
    for (var i = 1; i < res.length; i++) if (res[i].mark === 'warn') return 'בדקו שוב את שורה ' + i + ': היא לא מסתדרת עם השורה שלפניה. נסו להציב מספר קטן בשתי השורות ולראות איפה זה מתפרק.';
    var last = rows[rows.length - 1] || '';
    if (/=/.test(last)) return 'הצעד הבא: לפשט עוד צעד אחד. מה אפשר להעביר אגף, לפתוח או לפרק?';
    return 'מתחילים מהתרגיל: מה הצעד הראשון שאתם מכירים לסוג כזה של תרגיל?';
  }

  $('kh-all').addEventListener('click', function () {
    if (!view) return;
    var t = prompt('רמז לכל הכיתה (למשל: "בתרגיל 2 – לפתוח קודם את הסוגריים"):');
    if (!t || !t.trim()) return;
    var exs = view.hw.ex.length > 1 ? prompt('לאיזה תרגיל? (מספר 1–' + view.hw.ex.length + ')', '1') : '1';
    var ex = Math.max(1, Math.min(view.hw.ex.length, parseInt(exs, 10) || 1)) - 1;
    admin('hw_msg', { hw: cur, sid: '*', ex: ex, kind: 'hint', text: t.trim() }).then(function (d) { if (!d.ok) alert(d.error); else { used('send_all'); refresh(false); } });
  });
  $('kh-close').addEventListener('click', function () { if (!view) return; admin('hw_open', { hw: cur, open: !view.hw.open }).then(function () { refresh(false); }); });
  $('kh-del').addEventListener('click', function () {
    if (!view || !confirm('למחוק את המטלה "' + view.hw.title + '" עם כל העבודות של התלמידים? אי אפשר לבטל.')) return;
    admin('hw_del', { hw: cur }).then(function () { cur = null; view = null; clearInterval(timer); $('kh-live').hidden = true; loadList(); });
  });

  if (T) start();
})();
