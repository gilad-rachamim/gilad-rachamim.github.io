/* פורטל שכבה – שבת זכור ופורים תורה: לוח משימות, דבר תורה היתולי, דף גמרא, ספר שירים.
   כללים: צחוק על תופעות; בלי שמות קדושים; בלי שינוי פסוקים; בלי ציטוט מומצא מחז"ל;
   מראה מקום אמיתי מוסיפים התלמידים בעצמם ומסמנים "אמיתי"; שם איש צוות רק דרך רמזור הכבוד ומסלול האישור. */
(function () {
  'use strict';
  var SH = window.SH = window.SH || {};
  SH.creators = SH.creators || {};
  function esc(s) { return SH.esc ? SH.esc(s) : String(s); }
  function $(s, el) { return (el || document).querySelector(s); }
  function toast(t) { if (SH.toast) SH.toast(t); }
  var PREFIX = 'שבת זכור –';

  /* ---------- ציר פנימי של הלשונית ---------- */
  var SUBS = [['lu', 'לוח שבת זכור'], ['torah', 'דבר תורה'], ['gemara', 'דף גמרא'], ['shir', 'שירים'], ['sefer', 'ספר השירים']];
  SH.views.zachor = function (v, arg) {
    var k = arg || 'lu';
    v.innerHTML = '<div class="sh-sub" role="tablist">' + SUBS.map(function (x) { return '<button type="button" data-go="zachor:' + x[0] + '" aria-selected="' + (x[0] === k) + '">' + x[1] + '</button>'; }).join('') + '</div><div id="yz"></div>';
    var root = $('#yz');
    if (k === 'lu') board(root);
    else if (k === 'sefer') songbook(root);
    else if (SH.creators[k]) SH.creators[k](root, null);
  };

  /* ---------- לוח משימות שבת זכור ---------- */
  function shortDate(s) { if (!s) return 'בלי תאריך'; var p = String(s).split('-'); return p.length === 3 ? p[2] + '.' + p[1] : s; }
  function daysTo(s) { if (!s) return 99; return Math.round((new Date(s + 'T00:00:00') - new Date(new Date().toDateString())) / 864e5); }
  function board(root) {
    var S = SH.state(), me = S.me, isR = me.role === 'rakaz';
    var all = (S.tasks || []).filter(function (t) { return String(t.title).indexOf(PREFIX) === 0; });
    var open = all.filter(function (t) { return !t.done; }), done = all.filter(function (t) { return t.done; });
    var row = function (t) {
      var d = daysTo(t.due);
      return '<li class="sh-task' + (t.done ? ' sh-done' : '') + '" data-t="' + esc(t.id) + '"><label class="sh-check"><input type="checkbox" data-zdone' + (t.done ? ' checked' : '') + '> <span>' + esc(String(t.title).replace(PREFIX, '').trim()) + '</span></label>' +
        '<small class="' + (!t.done && d < 0 ? 'sh-late' : '') + '">' + shortDate(t.due) + (t.done ? '' : d < 0 ? ' · באיחור ' + (-d) + ' ימים' : d === 0 ? ' · היום' : ' · עוד ' + d + ' ימים') + (t.owner ? ' · ' + esc(t.owner) : '') + '</small></li>';
    };
    root.innerHTML = '<section class="sh-card"><h2>שבת זכור וליל פורים תורה</h2>' +
      '<p class="msg">שבת נפרדת ללוח הרגיל: תפילות, סעודות, עונג, תוכן, רבני פורים, קישוט ואוכל. כל משימה עם תאריך יעד מחושב אחורה מהשבת.</p>' +
      (all.length ? '<div class="sh-prog"><span style="width:' + Math.round(done.length * 100 / all.length) + '%"></span></div><p class="msg">' + done.length + ' מתוך ' + all.length + ' בוצעו</p>' : '<p class="msg">עוד לא נוצר לוח לשבת זכור.</p>') +
      (isR ? '<form class="k-form" id="zForm"><label class="field">תאריך השבת (לא חובה, ברירת מחדל: השבת האחרונה לפני ההכתרה)<input type="date" name="shabbat"></label><button class="btn btn-gold">' + (all.length ? 'להשלים משימות חסרות' : 'ליצור את לוח שבת זכור') + '</button></form>' : (all.length ? '' : '<p class="msg">הרכז יוצר את הלוח.</p>')) +
      '<ul class="sh-tasks">' + open.map(row).join('') + '</ul></section>' +
      '<section class="sh-card"><h2>כלים לשבת זכור</h2><ul class="sh-links">' +
      '<li><a href="#" data-go="zachor:torah">דבר תורה היתולי</a> – קושיה, תירוץ מופרך, גימטריה ונפקא מינה</li>' +
      '<li><a href="#" data-go="zachor:gemara">דף גמרא</a> – בדיחה שמנוסחת כמשנה וגמרא עם רש"י ותוספות</li>' +
      '<li><a href="#" data-go="zachor:shir">שירים</a> ו<a href="#" data-go="zachor:sefer">ספר השירים להדפסה</a></li>' +
      '<li><a href="#" data-go="kiosk:ads">מעצב מודעות</a> – מודעה לשבת זכור</li>' +
      '<li><a href="#" data-go="yetzira:video">עורך סרטון</a> – סרטון הזמנה</li>' +
      '<li><a href="#" data-go="yetzira:meme">מחולל ממים</a></li></ul></section>' +
      (done.length ? '<section class="sh-card"><details><summary>בוצעו (' + done.length + ')</summary><ul class="sh-tasks">' + done.map(row).join('') + '</ul></details></section>' : '');
    var f = $('#zForm', root);
    if (f) f.onsubmit = function (e) {
      e.preventDefault(); var b = f.querySelector('button'); b.disabled = true;
      SH.api('/task/zachor', { shabbat: f.shabbat.value || undefined }).then(function (r) { toast(r.added ? 'נוספו ' + r.added + ' משימות' : 'הלוח כבר שלם'); return SH.refresh(); }).catch(function (er) { b.disabled = false; toast(SH.err(er)); });
    };
    root.querySelectorAll('[data-zdone]').forEach(function (x) {
      x.onchange = function () {
        var li = x.closest('li');
        SH.api('/task/update', { id: li.getAttribute('data-t'), done: x.checked, owner: x.checked ? me.name : undefined }).then(function () { if (x.checked) toast('כל הכבוד! ✓'); return SH.refresh(); }).catch(function (e) { toast(SH.err(e)); });
      };
    });
  }

  /* ---------- שמירה ---------- */
  function saveBox(existing, kind) {
    return '<section class="sh-card"><h2>' + (existing ? 'שמירת השינויים' : 'שמירה בוועדה') + '</h2>' + (existing ? '' : SH.committeeSelect()) +
      '<label class="field">כותרת<input name="ptitle" maxlength="80" required value="' + esc(existing ? existing.title : '') + '"></label>' +
      '<label class="sh-check"><input type="checkbox" name="staff"' + (existing && existing.about_staff ? ' checked' : '') + '> יש כאן איש צוות (יעבור לאישור המלווה, ורק אחרי רמזור כבוד)</label>' +
      '<p class="msg">נשמר כטיוטה בוועדה ועובר את מסלול האישור. ' + (kind === 'gemara' ? 'מומלץ לתת למי שיודע ארמית לעבור על הדף לפני ההדפסה. ' : '') + 'אין כאן שמות קדושים, אין שינוי פסוקים ואין ציטוט שלא נאמר.</p>' +
      '<button type="button" class="btn btn-gold" data-save>שמירה</button></section>';
  }
  function wireSave(root, existing, kind, collect) {
    var b = root.querySelector('[data-save]'); if (!b) return;
    b.onclick = function () {
      var t = root.querySelector('[name=ptitle]').value.trim(); if (!t) { toast('חסרה כותרת'); return; }
      var cs = root.querySelector('[name=committee_id]');
      if (!existing && !cs) { toast('צריך להיות בוועדה כדי לשמור'); return; }
      var o = collect(); o.title = t; o.kind = kind;
      if (!existing) o.committee_id = cs.value;
      var st = root.querySelector('[name=staff]'); if (st) o.about_staff = st.checked;
      b.disabled = true;
      SH.saveProduct(o, existing).then(function () { SH.go('vaadot:' + (existing ? existing.committee_id : o.committee_id)); }).catch(function (e) { b.disabled = false; toast(SH.err(e)); });
    };
  }
  function lines(t) { return String(t || '').split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function nl(t) { return esc(t).replace(/\n/g, '<br>'); }

  /* ---------- הדפסה: העתק של האזור בלבד, A4 ---------- */
  function printNode(html, cls) {
    var old = document.getElementById('shPrintRoot'); if (old) old.remove();
    var d = document.createElement('div'); d.id = 'shPrintRoot'; d.className = cls || ''; d.innerHTML = html;
    document.body.appendChild(d); document.body.classList.add('sh-printing');
    var clean = function () { d.remove(); document.body.classList.remove('sh-printing'); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean);
    setTimeout(function () { window.print(); }, 60);
  }

  /* ================= דבר תורה היתולי ================= */
  function torahHtml(d) {
    var src = (d.sources || []).filter(function (x) { return x.text; });
    return '<article class="sh-torah"><p class="sh-badge">פורים תורה</p><h3>' + esc(d.title || 'דבר תורה') + '</h3>' +
      (d.opening ? '<p>' + nl(d.opening) + '</p>' : '') +
      (d.question ? '<p><b>קושיה:</b> ' + nl(d.question) + '</p>' : '') +
      (d.answer ? '<p><b>ותירץ:</b> ' + nl(d.answer) + '</p>' : '') +
      (d.gematria ? '<p><b>גימטריה:</b> ' + nl(d.gematria) + '</p>' : '') +
      (d.nafka ? '<p><b>נפקא מינה:</b> ' + nl(d.nafka) + '</p>' : '') +
      (d.closing ? '<p>' + nl(d.closing) + '</p>' : '') +
      (src.length ? '<ul class="sh-src">' + src.map(function (x) { return '<li>' + esc(x.text) + ' <small>' + (x.real ? '(מקור אמיתי)' : '(היתולי, לא מקור)') + '</small></li>'; }).join('') + '</ul>' : '') + '</article>';
  }
  SH.creators.torah = function (root, existing) {
    var d = existing && existing.data ? JSON.parse(JSON.stringify(existing.data)) : {};
    var light = null, hint = '';
    if (!Array.isArray(d.sources)) d.sources = [];
    var F = [['opening', 'פתיחה', 2], ['question', 'קושיה', 3], ['answer', 'תירוץ (מופרך ומצחיק)', 3], ['gematria', 'גימטריה (עם החישוב)', 2], ['nafka', 'נפקא מינה לחיי השכבה', 3], ['closing', 'סיום עם שורת כבוד', 2]];
    root.innerHTML = '<section class="sh-card"><h2>דבר תורה היתולי</h2><p class="sh-warn">זה צחוק על תופעות. לא ממציאים ציטוטים מחז"ל, לא משנים פסוקים ולא כותבים שמות קדושים. מראה מקום אמיתי מוסיפים בעצמנו למטה ומסמנים "אמיתי".</p>' +
      '<label class="field">על מה הדבר תורה<input id="tzTopic" maxlength="150" placeholder="מי אוכל את הקוגל האחרון בסעודה"></label>' +
      '<label class="field">הרעיון שלנו (לא חובה)<textarea id="tzIdea" rows="2" maxlength="400"></textarea></label>' +
      '<button type="button" class="btn btn-gold" id="tzGo">לבנות דבר תורה בגבאי</button><div id="tzLight"></div><p class="msg" id="tzHint"></p></section>' +
      '<section class="sh-card"><h2>הנוסח (אפשר לתקן הכול ביד)</h2><label class="field">כותרת<input id="tzTitle" maxlength="80"></label>' +
      F.map(function (f) { return '<label class="field">' + f[1] + '<textarea data-f="' + f[0] + '" rows="' + f[2] + '" maxlength="700"></textarea></label>'; }).join('') +
      '<h3>מראה מקום אמיתי</h3><p class="msg">מוסיפים רק מה שבדקנו בספר. הגבאי לא נותן ציטוטים.</p><div id="tzSrc"></div>' +
      '<div class="sh-row"><input id="tzSrcIn" maxlength="120" placeholder="למשל: מסכת מגילה דף ז." aria-label="מראה מקום"><button type="button" class="btn btn-sm btn-line" id="tzSrcAdd">הוספה כמקור אמיתי</button></div></section>' +
      '<section class="sh-card"><h2>תצוגה</h2><div id="tzView" class="sh-paper"></div><div class="sh-row"><button type="button" class="btn btn-sm btn-line" id="tzPrint">הדפסה או PDF</button></div></section>' + saveBox(existing, 'torah');
    $('#tzTitle', root).value = d.title || ''; $('#tzTopic', root).value = d.topic || '';
    root.querySelectorAll('[data-f]').forEach(function (x) { x.value = d[x.getAttribute('data-f')] || ''; });
    function gather() { d.title = $('#tzTitle', root).value; d.topic = $('#tzTopic', root).value; root.querySelectorAll('[data-f]').forEach(function (x) { d[x.getAttribute('data-f')] = x.value; }); }
    function paint() {
      gather();
      $('#tzView', root).innerHTML = torahHtml(d);
      $('#tzLight', root).innerHTML = light ? SH.lightHtml(light.light, light.why) : '';
      $('#tzHint', root).textContent = hint ? 'כדאי לחפש מקור אמיתי: ' + hint : '';
      $('#tzSrc', root).innerHTML = d.sources.map(function (s, i) { return '<div class="sh-row"><span>' + esc(s.text) + ' <small>(אמיתי)</small></span><button type="button" class="btn btn-sm btn-line" data-sx="' + i + '" aria-label="הסרה">✕</button></div>'; }).join('');
      root.querySelectorAll('[data-sx]').forEach(function (x) { x.onclick = function () { d.sources.splice(+x.getAttribute('data-sx'), 1); paint(); }; });
    }
    root.addEventListener('input', function (e) { if (e.target.matches('[data-f],#tzTitle,#tzTopic')) paint(); });
    $('#tzSrcAdd', root).onclick = function () { var i = $('#tzSrcIn', root); if (!i.value.trim()) return; d.sources.push({ text: i.value.trim(), real: true }); i.value = ''; paint(); };
    $('#tzGo', root).onclick = function () {
      var b = this, tp = $('#tzTopic', root).value.trim(); if (!tp) { toast('צריך נושא'); return; }
      b.disabled = true;
      SH.api('/ai', { task: 'torah', topic: tp, idea: $('#tzIdea', root).value.trim() }).then(function (r) {
        ['opening', 'question', 'answer', 'gematria', 'nafka', 'closing'].forEach(function (k) { d[k] = r[k] || ''; root.querySelector('[data-f=' + k + ']').value = d[k]; });
        if (!$('#tzTitle', root).value) $('#tzTitle', root).value = tp;
        light = { light: r.light, why: r.why }; hint = r.search_hint || ''; paint();
      }).catch(function (e) { toast(SH.err(e)); }).then(function () { b.disabled = false; });
    };
    $('#tzPrint', root).onclick = function () { gather(); printNode(torahHtml(d), 'sh-print-torah'); };
    wireSave(root, existing, 'torah', function () { gather(); return { light: light, body: [d.opening, d.question, d.answer, d.gematria, d.nafka, d.closing].filter(Boolean).join('\n'), data: d }; });
    paint();
  };

  /* ================= דף גמרא ================= */
  // מדגישים את תחילת כל פסקה (דיבור המתחיל) בשתי מילים ראשונות
  function boldDh(txt) {
    return lines(txt).map(function (p) { var w = p.split(' '); return '<p><b>' + esc(w.slice(0, 2).join(' ')) + '</b> ' + esc(w.slice(2).join(' ')) + '</p>'; }).join('');
  }
  function gemaraHtml(d) {
    var rashi = (d.rashi || []).filter(function (x) { return x.text; }), tos = (d.tosafot || []).filter(function (x) { return x.text; });
    var side = function (a) { return a.map(function (x) { return '<p><b>' + esc(x.dh) + '</b> ' + esc(x.text) + '</p>'; }).join(''); };
    return '<div class="gm-page"><div class="gm-badge">פורים תורה</div>' +
      '<header class="gm-head"><span>' + esc(d.masechet || 'מסכת הכתרה') + '</span><span>' + esc(d.perek || 'פרק י"ב') + '</span><span>דף ' + esc(d.daf || 'ב.') + '</span></header>' +
      '<div class="gm-body"><aside class="gm-rashi"><h4>רש"י</h4>' + (side(rashi) || '<p class="gm-empty">…</p>') + '</aside>' +
      '<section class="gm-main"><h4>מתניתין</h4>' + boldDh(d.mishna) + '<h4>גמרא</h4>' + boldDh(d.gemara) + '</section>' +
      '<aside class="gm-tos"><h4>תוספות</h4>' + (side(tos) || '<p class="gm-empty">…</p>') + '</aside></div>' +
      (d.margin ? '<footer class="gm-margin">' + nl(d.margin) + '</footer>' : '') +
      '<p class="gm-note">דף היתולי לפורים תורה – כל מה שכתוב כאן בצחוק. לא מקור ולא הלכה.</p></div>';
  }
  SH.creators.gemara = function (root, existing) {
    var d = existing && existing.data ? JSON.parse(JSON.stringify(existing.data)) : { rashi: [], tosafot: [] };
    if (!Array.isArray(d.rashi)) d.rashi = []; if (!Array.isArray(d.tosafot)) d.tosafot = [];
    var light = null;
    root.innerHTML = '<section class="sh-card"><h2>דף גמרא היתולי</h2><p class="sh-warn">חשוב: לתת למי שיודע ארמית לעבור על הדף לפני שמדפיסים. בלי שמות קדושים, בלי שינוי פסוקים, בלי להעמיד פנים שזה ציטוט אמיתי.</p>' +
      '<label class="field">נושא הסוגיה (לא חובה)<input id="gmTopic" maxlength="120" placeholder="האם מותר להירדם בשיעור בוקר"></label>' +
      '<label class="field">הבדיחה בעברית רגילה<textarea id="gmJoke" rows="3" maxlength="500"></textarea></label>' +
      '<div class="sh-row"><button type="button" class="btn btn-line" id="gmSuggest">הצע בדיחה לסוגיה</button><button type="button" class="btn btn-gold" id="gmGo">לנסח כגמרא</button></div>' +
      '<div class="sh-caps" id="gmJokes"></div><div id="gmLight"></div></section>' +
      '<section class="sh-card"><h2>הנוסח (אפשר לתקן הכול ביד)</h2>' +
      '<div class="sh-row"><label class="field">מסכת<input id="gmMas" maxlength="40" placeholder="מסכת הכתרה"></label><label class="field">פרק<input id="gmPer" maxlength="30" placeholder="פרק י&quot;ב"></label><label class="field">דף<input id="gmDaf" maxlength="10" placeholder="ב."></label></div>' +
      '<label class="field">מתניתין<textarea id="gmMish" rows="2" maxlength="600"></textarea></label><label class="field">גמרא (כל פסקה בשורה נפרדת, שתי המילים הראשונות יודגשו)<textarea id="gmGem" rows="6" maxlength="1500"></textarea></label>' +
      '<label class="field">רש"י (שורה לכל הערה: דיבור מתחיל, נקודתיים, הסבר)<textarea id="gmRashi" rows="4" maxlength="1200"></textarea></label>' +
      '<label class="field">תוספות (שורה לכל קושיה: דיבור מתחיל, נקודתיים, קושיה)<textarea id="gmTos" rows="3" maxlength="900"></textarea></label>' +
      '<label class="field">הערות שוליים היתוליות (לא מראי מקומות אמיתיים)<textarea id="gmMar" rows="2" maxlength="400" placeholder="ראו עוד: שיעור בוקר ד. ע&quot;ב (כמעט)"></textarea></label></section>' +
      '<section class="sh-card"><h2>הדף</h2><div id="gmView" class="sh-paper"></div><div class="sh-row"><button type="button" class="btn btn-sm btn-line" id="gmPrint">הדפסה או PDF (A4)</button></div></section>' + saveBox(existing, 'gemara');
    function toLines(a) { return a.map(function (x) { return (x.dh ? x.dh + ': ' : '') + x.text; }).join('\n'); }
    function fromLines(t) { return lines(t).map(function (l) { var i = l.indexOf(':'); return i > 0 && i < 40 ? { dh: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { dh: '', text: l }; }); }
    $('#gmTopic', root).value = d.topic || ''; $('#gmMas', root).value = d.masechet || ''; $('#gmPer', root).value = d.perek || ''; $('#gmDaf', root).value = d.daf || '';
    $('#gmMish', root).value = d.mishna || ''; $('#gmGem', root).value = d.gemara || ''; $('#gmRashi', root).value = toLines(d.rashi); $('#gmTos', root).value = toLines(d.tosafot); $('#gmMar', root).value = d.margin || ''; $('#gmJoke', root).value = d.joke || '';
    function gather() {
      d.topic = $('#gmTopic', root).value; d.masechet = $('#gmMas', root).value; d.perek = $('#gmPer', root).value; d.daf = $('#gmDaf', root).value;
      d.mishna = $('#gmMish', root).value; d.gemara = $('#gmGem', root).value; d.rashi = fromLines($('#gmRashi', root).value); d.tosafot = fromLines($('#gmTos', root).value);
      d.margin = $('#gmMar', root).value; d.joke = $('#gmJoke', root).value;
    }
    function paint() { gather(); $('#gmView', root).innerHTML = gemaraHtml(d); $('#gmLight', root).innerHTML = light ? SH.lightHtml(light.light, light.why) : ''; }
    root.addEventListener('input', function (e) { if (e.target.closest('.sh-card') && e.target.id && e.target.id.indexOf('gm') === 0) paint(); });
    $('#gmSuggest', root).onclick = function () {
      var b = this; b.disabled = true; $('#gmJokes', root).innerHTML = '<p class="msg">הגבאי חושב…</p>';
      SH.api('/ai', { task: 'joke', topic: $('#gmTopic', root).value.trim() || 'חיי שכבת י"ב בישיבה' }).then(function (r) {
        var js = r.jokes || [];
        $('#gmJokes', root).innerHTML = js.map(function (j, i) { return '<button type="button" class="btn btn-sm btn-line" data-jk="' + i + '">' + esc(j.text) + '<br>' + SH.lightHtml(j.light, j.why) + '</button>'; }).join('');
        $('#gmJokes', root).querySelectorAll('[data-jk]').forEach(function (x) { x.onclick = function () { $('#gmJoke', root).value = js[+x.getAttribute('data-jk')].text; paint(); toast('הבדיחה נכנסה. עכשיו "לנסח כגמרא"'); }; });
      }).catch(function (e) { $('#gmJokes', root).innerHTML = '<p class="msg sh-err">' + esc(SH.err(e)) + '</p>'; }).then(function () { b.disabled = false; });
    };
    $('#gmGo', root).onclick = function () {
      var b = this, j = $('#gmJoke', root).value.trim(); if (!j) { toast('צריך בדיחה'); return; }
      b.disabled = true; b.textContent = 'הגבאי מנסח…';
      SH.api('/ai', { task: 'gemara', joke: j, topic: $('#gmTopic', root).value.trim() }).then(function (r) {
        if (r.title && !$('#gmMas', root).value) $('#gmMas', root).value = r.title;
        $('#gmMish', root).value = r.mishna || ''; $('#gmGem', root).value = r.gemara || '';
        $('#gmRashi', root).value = toLines(r.rashi || []); $('#gmTos', root).value = toLines(r.tosafot || []);
        light = { light: r.light, why: r.why }; paint(); toast('הדף נוסח. כדאי שמי שיודע ארמית יעבור עליו');
      }).catch(function (e) { toast(SH.err(e)); }).then(function () { b.disabled = false; b.textContent = 'לנסח כגמרא'; });
    };
    $('#gmPrint', root).onclick = function () { gather(); printNode(gemaraHtml(d), 'sh-print-gemara'); };
    wireSave(root, existing, 'gemara', function () { gather(); return { light: light, body: [d.mishna, d.gemara].filter(Boolean).join('\n'), data: d }; });
    paint();
  };

  /* ================= שירים וספר שירים ================= */
  SH.creators.shir = function (root, existing) {
    var d = existing && existing.data ? JSON.parse(JSON.stringify(existing.data)) : {};
    var rows = Array.isArray(d.lines) ? d.lines : [], light = null;
    root.innerHTML = '<section class="sh-card"><h2>שיר עם מילים חדשות</h2><p class="sh-warn">לשימוש פנימי בשבת ובסעודה. אם מעלים לרשת – לבדוק זכויות על השיר.</p>' +
      '<label class="field">שם השיר<input id="srSong" maxlength="80"></label>' +
      '<label class="field">מילות השיר המקורי (מדביקים)<textarea id="srLy" rows="6" maxlength="3000"></textarea></label>' +
      '<label class="field">על מה צוחקים<input id="srTopic" maxlength="120" placeholder="שבת זכור בשכבה"></label>' +
      '<button type="button" class="btn btn-gold" id="srGo">לכתוב מילים חדשות</button><div id="srLight"></div></section>' +
      '<section class="sh-card"><h2>השורות</h2><div id="srLines"></div></section>' + saveBox(existing, 'shir');
    $('#srSong', root).value = d.song || ''; $('#srTopic', root).value = d.topic || '';
    if (rows.length) $('#srLy', root).value = rows.map(function (l) { return l.orig; }).join('\n');
    function paintRows() {
      $('#srLight', root).innerHTML = light ? SH.lightHtml(light.light, light.why) : '';
      $('#srLines', root).innerHTML = rows.length ? rows.map(function (l, i) { return '<div class="sh-tline"><span class="sh-orig">' + esc(l.orig) + '</span><input data-ln="' + i + '" value="' + esc(l.new) + '" maxlength="120" aria-label="שורה ' + (i + 1) + '"></div>'; }).join('') : '<p class="msg">עוד אין שורות.</p>';
      $('#srLines', root).querySelectorAll('[data-ln]').forEach(function (x) { x.onchange = function () { rows[+x.getAttribute('data-ln')].new = x.value; }; });
    }
    $('#srGo', root).onclick = function () {
      var b = this, ly = $('#srLy', root).value.trim(); if (!ly) { toast('צריך להדביק מילים'); return; }
      b.disabled = true; $('#srLines', root).innerHTML = '<p class="msg">הגבאי כותב…</p>';
      SH.api('/ai', { task: 'parody', lyrics: ly, topic: $('#srTopic', root).value.trim() }).then(function (r) { rows = r.lines || []; light = { light: r.light, why: r.why }; paintRows(); })
        .catch(function (e) { $('#srLines', root).innerHTML = '<p class="msg sh-err">' + esc(SH.err(e)) + '</p>'; }).then(function () { b.disabled = false; });
    };
    wireSave(root, existing, 'shir', function () { return { light: light, body: rows.map(function (l) { return l.new; }).join('\n'), data: { song: $('#srSong', root).value.trim(), topic: $('#srTopic', root).value.trim(), lines: rows.map(function (l) { return { orig: l.orig, new: l.new }; }) } }; });
    paintRows();
  };

  function songbook(root) {
    var S = SH.state();
    var ps = (S.products || []).filter(function (p) { return p.kind === 'shir'; });
    var sel = {};
    root.innerHTML = '<section class="sh-card"><h2>ספר השירים להדפסה</h2><p class="msg">בוחרים שירים שנשמרו בוועדות, ומדפיסים דף יפה לשולחן (A4). בדף מודפסים רק הנוסח החדש.</p>' +
      (ps.length ? '<ul class="sh-tasks">' + ps.map(function (p) { return '<li class="sh-task"><label class="sh-check"><input type="checkbox" data-sg="' + esc(p.id) + '" checked> <span>' + esc(p.title) + '</span></label><small>' + esc(STATE_LABEL[p.state] || '') + '</small></li>'; }).join('') + '</ul><div class="sh-row"><button type="button" class="btn btn-gold" id="sbPrint">הדפסה או PDF</button></div>' : '<p class="msg">עוד אין שירים. אפשר ליצור ב<a href="#" data-go="zachor:shir">לשונית שירים</a>.</p>') + '</section>';
    var b = $('#sbPrint', root);
    if (b) b.onclick = function () {
      var ids = {}; root.querySelectorAll('[data-sg]').forEach(function (x) { if (x.checked) ids[x.getAttribute('data-sg')] = 1; });
      var chosen = ps.filter(function (p) { return ids[p.id]; }); if (!chosen.length) { toast('לא נבחר שיר'); return; }
      printNode('<div class="sb-book"><h2>ספר שירים · שבת זכור</h2>' + chosen.map(function (p) {
        var d = p.data || {};
        return '<section class="sb-song"><h3>' + esc(p.title) + '</h3>' + (d.song ? '<p class="sb-tune">לחן: ' + esc(d.song) + '</p>' : '') + '<div>' + (d.lines || []).map(function (l) { return l.new ? '<p>' + esc(l.new) + '</p>' : '<br>'; }).join('') + '</div></section>';
      }).join('') + '</div>', 'sh-print-book');
    };
  }
  var STATE_LABEL = { draft: 'טיוטה', liked: 'אהבנו', head: 'אצל האחראי הראשי', melave: 'אצל המלווה', approved: 'אושר', replace: 'להחליף' };
})();
