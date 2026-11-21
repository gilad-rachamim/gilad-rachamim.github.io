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
  function printNode(html, cls, after) {
    var old = document.getElementById('shPrintRoot'); if (old) old.remove();
    var d = document.createElement('div'); d.id = 'shPrintRoot'; d.className = cls || ''; d.innerHTML = html;
    document.body.appendChild(d); document.body.classList.add('sh-printing');
    if (after) { d.style.cssText = 'display:block;position:absolute;left:-9999px;top:0;width:186mm'; after(d); d.style.cssText = ''; }
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
      '<section class="sh-card" id="tzGim"></section>' +
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
    if (SH.gimBox) SH.gimBox($('#tzGim', root), { title: 'גימטריות מצחיקות לדבר התורה', seed: function () { return $('#tzTopic', root).value.split(/\s+/).slice(-1)[0]; },
      insert: function (h, ln) { var g = $('[data-f="gematria"]', root); g.value = (g.value.trim() ? g.value.replace(/\s+$/, '') + '\n' : '') + ln + '.'; g.dispatchEvent(new Event('input', { bubbles: true })); toast('נכנס לשדה "גימטריה". אפשר לתקן'); } });
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
  // צורת הדף של דפוס וילנא: גמרא באמצע, רש"י בצד הפנימי ותוספות בחיצוני,
  // הפרשנים מתחילים מעל הגמרא ועוטפים אותה, ומי שנגמר ראשון – הגמרא מתרחבת לתוך מקומו.
  function boldDh(paras) {
    return paras.map(function (p) { var w = p.split(' '); return '<span class="gm-p"><b>' + esc(w.slice(0, 2).join(' ')) + '</b> ' + esc(w.slice(2).join(' ')) + '</span> '; }).join('');
  }
  // פיצול לעמוד א' ולעמוד ב': שורת "---" מסמנת מעבר עמוד, ובלעדיה חצי-חצי
  function splitAmud(arr, isSep) {
    var i = -1; arr.forEach(function (x, k) { if (i < 0 && isSep(x)) i = k; });
    var clean = function (a) { return a.filter(function (x) { return !isSep(x); }); };
    if (i >= 0) return [clean(arr.slice(0, i)), clean(arr.slice(i + 1))];
    var all = clean(arr), h = Math.ceil(all.length / 2); return [all.slice(0, h), all.slice(h)];
  }
  // רש"י: דיבור המתחיל מודגש ואחריו נקודה, וכל הערה נגמרת בנקודתיים – ברצף אחד כמו בדף
  function cmt(a, tos) {
    return a.filter(function (x) { return x.text; }).map(function (x, i) {
      var dh = esc(x.dh || ''), w = dh.split(' ');
      if (i === 0 && dh) dh = '<span class="gm-big">' + w[0] + '</span>' + (w.length > 1 ? ' ' + w.slice(1).join(' ') : '');
      return '<span class="gm-e"><b>' + dh + '.</b> ' + esc(x.text).replace(/[.:\s]+$/, '') + (tos ? '. ' : ': ') + '</span>';
    }).join('');
  }
  var ORD = ['', 'ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'שמיני', 'תשיעי', 'עשירי'];
  function headParts(d) {
    var per = String(d.perek || 'פרק ראשון – הכתרה').split(/\s+[–-]\s+/), mas = String(d.masechet || 'מסכת הכתרה').replace(/^מסכת\s+/, '');
    var pk = per[0], nm = per[1] || '';
    if (!/^פרק/.test(pk)) { nm = pk; pk = 'פרק ' + ORD[1]; }
    return { nm: nm, pk: pk, mas: mas, daf: String(d.daf || 'ב').replace(/[.:\s]/g, '') || 'ב' };
  }
  // עין משפט נר מצוה: מראי מקומות בצורה המדויקת של הדף (מיי' פרק הלכה, סמג, טור ושו"ע סימן סעיף) – אבל כולם בדיחה
  var EIN = [
    'מיי\' פ"א מהל\' שינה בשיעור הלכה ג. סמג עשין נ"ה. טור ושו"ע או"ח סי\' ו סעיף א',
    'מיי\' פ"ב מהל\' קפה ותה הלכה ז. סמג לאוין ק"ב. טוש"ע י"ד סי\' ט"ל סעיף ד בהג"ה',
    'מיי\' פ"ג מהל\' פעמון הלכה א. טור או"ח סי\' ק"ס, ושו"ע שם סעיף ג',
    'מיי\' פ"ד מהל\' מזנון הלכה ה. טור ושו"ע חו"מ סי\' שנ"ט סעיף א (ובמיוחד בשיעור שני)',
    'מיי\' פ"ה מהל\' חברותא הלכה ט. סמג עשין ל"ב. טוש"ע חו"מ סי\' קל"ז סעיף ב',
    'מיי\' פ"ו מהל\' מחברת הלכה ב. סמג עשין ע"א. טוש"ע או"ח סי\' תקפ"ג סעיף ו',
    'מיי\' פ"ז מהל\' הפסקה הלכה י. טוש"ע או"ח סי\' רצ"ז סעיף ה, ובמ"ב ס"ק ח',
    'מיי\' פ"ח מהל\' תחנונים לרב הלכה ד. סמג לאוין כ"ו. טור ושו"ע י"ד סי\' ר"מ סעיף ז',
    'מיי\' פ"ט מהל\' כסאות וכסתות הלכה ג. טוש"ע חו"מ סי\' ק"ע סעיף ג',
    'מיי\' פי"ב מהל\' טוש ולוח הלכה ו. סמג עשין ק"י. טור ושו"ע או"ח סי\' ת"ר סעיף ב',
    'מיי\' פי"א מהל\' פתקים הלכה ח. טוש"ע אה"ע סי\' כ"ה סעיף א',
    'מיי\' פ"י מהל\' שיעור ערב הלכה א. סמג לאוין ס"ח. טור ושו"ע או"ח סי\' ק"ח סעיף ט'
  ];
  var LET = 'אבגדהוזחטיכלמנסעפצקרשת';
  function hn(n) { var t = ['', 'י', 'כ', 'ל', 'מ', 'נ'], u = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']; if (n === 15) return 'טו'; if (n === 16) return 'טז'; return t[Math.floor(n / 10)] + u[n % 10]; }
  function einLists(d) {
    var own = lines(d.ein || ''), all = own;
    if (!own.length) {
      var h = 0, sd = String(d.topic || d.masechet || 'x');
      for (var i = 0; i < sd.length; i++) h = (h * 31 + sd.charCodeAt(i)) % 997;
      all = []; for (var k = 0; k < 11; k++) all.push(EIN[(h + k) % EIN.length]);
    }
    return splitAmud(all, function (x) { return x === '---'; });
  }
  function amudHtml(side, d, gem, rashi, tos, first, einItems, off) {
    var h = headParts(d), mis = first && d.mishna ? lines(d.mishna) : [];
    var gemHtml = '';
    if (mis.length) {
      var w = mis[0].split(' ');
      gemHtml += '<div class="gm-frame"><span>' + esc(w[0]) + '</span></div><span class="gm-p">' + esc(w.slice(1).join(' ')) + '</span> ' + (mis.length > 1 ? boldDh(mis.slice(1)) : '');
    }
    if (gem.length) gemHtml += (mis.length ? '<b class="gm-mark">גמ׳</b> ' : '') + boldDh(gem);
    var half = function (cls, inner) { return '<div class="gm-half ' + cls + '"><i class="gm-strut"></i><i class="gm-hole"></i>' + inner + '</div>'; };
    var R = half('gm-rashi', cmt(rashi, false)), T = half('gm-tos', cmt(tos, true));
    // בעמוד א' הכריכה מימין: רש"י מימין ותוספות משמאל. בעמוד ב' להפך.
    var halves = side === 'a' ? R + T : T + R;
    var items = String(d.margin || '').split(/[;\n]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    var heb = 'אבגדהוזחטיכלמנ';
    var mesoret = '<aside class="gm-mar gm-inner">' + items.map(function (x, i) { return '<p><b>' + heb.charAt(i % heb.length) + '</b> ' + esc(x) + '</p>'; }).join('') + '</aside>';
    var ein = '<aside class="gm-mar gm-outer">' + einItems.map(function (x, i) { return '<p><b class="gm-n">' + hn(off + i + 1) + '</b> <b>' + LET.charAt((off + i) % LET.length) + '</b> ' + esc(x) + '</p>'; }).join('') + '<p class="gm-purim">פורים תורה</p></aside>';
    var tIn = '<span class="gm-mt">מסורת<br>הש״ס</span>', tOut = '<span class="gm-mt">עין משפט<br>נר מצוה</span>';
    var run = '<span class="gm-run">' + (h.nm ? '<span>' + esc(h.nm) + '</span>' : '') + '<span>' + esc(h.pk) + '</span><span>' + esc(h.mas) + '</span></span>';
    var num = '<span class="gm-num">' + esc(h.daf) + (side === 'a' ? '.' : ':') + '</span>';
    var head = side === 'a' ? tIn + '<span class="gm-hc">' + run + num + '</span>' + tOut : tOut + '<span class="gm-hc">' + num + run + '</span>' + tIn;
    var body = side === 'a' ? mesoret + '<div class="gm-core">' + halves + '<div class="gm-gem"><i class="gm-wr"></i><i class="gm-wl"></i>' + gemHtml + '</div></div>' + ein
      : ein + '<div class="gm-core">' + halves + '<div class="gm-gem"><i class="gm-wr"></i><i class="gm-wl"></i>' + gemHtml + '</div></div>' + mesoret;
    return '<div class="gm-amud gm-' + side + '"><header class="gm-head">' + head + '</header><div class="gm-body">' + body + '</div>' +
      (String(d.promo || '').trim() ? '<div class="gm-promo">' + esc(String(d.promo).trim()) + '</div>' : '') + '<footer class="gm-foot"><b>גליון הש״ס</b> דף היתולי לפורים תורה – כל מה שכתוב כאן בצחוק. לא מקור ולא הלכה.</footer></div>';
  }
  function gemaraHtml(d) {
    var g = splitAmud(lines(d.gemara), function (x) { return x === '---'; });
    var r = splitAmud(d.rashi || [], function (x) { return x.sep; }), t = splitAmud(d.tosafot || [], function (x) { return x.sep; });
    var two = g[1].length || r[1].length || t[1].length, e = einLists(d);
    return '<div class="gm-spread gm-t' + (/^[123]$/.test(d.theme) ? d.theme : '1') + '">' + amudHtml('a', d, g[0], r[0], t[0], true, e[0], 0) + (two ? amudHtml('b', d, g[1], r[1], t[1], false, e[1], e[0].length) : '') + '</div>';
  }
  // חישוב הצורה: כמה שורות פרשנים מעל הגמרא, כמה הגמרא יורדת, ואיפה היא מתרחבת
  function layoutDaf(root, noFit) {
    root.querySelectorAll('.gm-amud').forEach(function (pg) {
      pg.style.zoom = '';
      var core = pg.querySelector('.gm-core'), gem = pg.querySelector('.gm-gem'), W = core.clientWidth;
      var G = Math.round(W * 0.47), gap = 9, S = (W - G) / 2;
      var halves = [].slice.call(core.querySelectorAll('.gm-half')); // [ימין, שמאל]
      var lh = parseFloat(getComputedStyle(halves[0]).lineHeight) || 15;
      var hasGem = !!gem.textContent.trim();
      var TOP = hasGem ? Math.round(lh * (pg.classList.contains('gm-a') ? 4 : 3)) : 0;
      var end = function (el) { var l = el.lastElementChild; return l && l.tagName !== 'I' ? l.offsetTop + l.offsetHeight : 0; };
      var gEnd = function () { var r = 0; [].forEach.call(gem.children, function (c) { if (c.tagName !== 'I') r = Math.max(r, c.offsetTop + c.offsetHeight); }); return r; };
      halves.forEach(function (hv) {
        var st = hv.querySelector('.gm-strut'), ho = hv.querySelector('.gm-hole');
        st.style.height = TOP + 'px'; ho.style.width = hasGem ? (G / 2 + gap) + 'px' : '0px'; ho.style.height = hasGem ? '99999px' : '0px';
      });
      gem.style.top = TOP + 'px';
      var wr = gem.querySelector('.gm-wr'), wl = gem.querySelector('.gm-wl');
      wr.style.width = wl.style.width = (S + gap) + 'px';
      wr.style.height = wl.style.height = '99999px';
      // גובה כל פרשן כשהוא צר לאורך כל הגמרא
      var cR = end(halves[0]), cL = end(halves[1]);
      var Hg = gEnd();
      // פרשן שנגמר לפני הגמרא – הגמרא מתרחבת לתוך הצד שלו
      if (hasGem && cR < TOP + Hg) wr.style.height = Math.max(0, cR - TOP + (cR ? gap : 0)) + 'px';
      if (hasGem && cL < TOP + Hg) wl.style.height = Math.max(0, cL - TOP + (cL ? gap : 0)) + 'px';
      Hg = gEnd();
      if (parseFloat(wr.style.height) > Hg) wr.style.height = Hg + 'px';
      if (parseFloat(wl.style.height) > Hg) wl.style.height = Hg + 'px';
      // פרשן שארוך מהגמרא ממשיך מתחתיה ברוחב מלא של החצי שלו
      halves.forEach(function (hv) { hv.querySelector('.gm-hole').style.height = hasGem ? (Hg + gap) + 'px' : '0px'; });
      gem.style.height = Hg + 'px';
      core.style.height = Math.ceil(Math.max(TOP + Hg, end(halves[0]), end(halves[1]))) + 4 + 'px';
      if (!noFit) { var box = root.closest('main') || document.body, avail = box.clientWidth - 8; if (avail && avail < pg.offsetWidth) pg.style.zoom = (avail / pg.offsetWidth).toFixed(3); }
    });
  }
  SH.creators.gemara = function (root, existing) {
    var d = existing && existing.data ? JSON.parse(JSON.stringify(existing.data)) : { rashi: [], tosafot: [] };
    if (!Array.isArray(d.rashi)) d.rashi = []; if (!Array.isArray(d.tosafot)) d.tosafot = [];
    var light = null;
    root.innerHTML = '<section class="sh-card"><h2>דף גמרא היתולי</h2><p class="sh-warn">חשוב: לתת למי שיודע ארמית לעבור על הדף לפני שמדפיסים. בלי שמות קדושים, בלי שינוי פסוקים, בלי להעמיד פנים שזה ציטוט אמיתי.</p>' +
      '<label class="field">נושא הסוגיה (לא חובה)<input id="gmTopic" maxlength="120" placeholder="האם מותר להירדם בשיעור בוקר"></label>' +
      '<label class="field">הבדיחה בעברית רגילה<textarea id="gmJoke" rows="3" maxlength="500"></textarea></label>' +
      '<div class="sh-row"><button type="button" class="btn btn-line" id="gmSuggest">הצע בדיחה לסוגיה</button><button type="button" class="btn btn-gold" id="gmGo">לנסח כגמרא</button><button type="button" class="btn btn-line" id="gmSample">טען דף לדוגמה מלא</button></div>' +
      '<div class="sh-caps" id="gmJokes"></div><div id="gmLight"></div></section>' +
      '<section class="sh-card" id="gmGimBox"></section>' +
      '<section class="sh-card"><h2>הנוסח (אפשר לתקן הכול ביד)</h2>' +
      '<div class="sh-row"><label class="field">מסכת<input id="gmMas" maxlength="40" placeholder="מסכת הכתרה"></label><label class="field">פרק<input id="gmPer" maxlength="30" placeholder="פרק י&quot;ב"></label><label class="field">דף<input id="gmDaf" maxlength="10" placeholder="ב."></label></div>' +
      '<label class="field">מתניתין<textarea id="gmMish" rows="2" maxlength="800"></textarea></label><label class="field">גמרא (כל פסקה בשורה נפרדת, שתי המילים הראשונות יודגשו; שורה עם --- בלבד מעבירה לעמוד ב׳)<textarea id="gmGem" rows="8" maxlength="3000"></textarea></label>' +
      '<label class="field">רש"י (שורה לכל הערה: דיבור מתחיל, נקודתיים, הסבר; --- מעביר לעמוד ב׳)<textarea id="gmRashi" rows="6" maxlength="3000"></textarea></label>' +
      '<label class="field">תוספות (שורה לכל קושיה: דיבור מתחיל, נקודתיים, קושיה; --- מעביר לעמוד ב׳)<textarea id="gmTos" rows="5" maxlength="2500"></textarea></label>' +
      '<label class="field">עין משפט נר מצוה – מראי מקומות מצחיקים (שורה לכל מקור; ריק = הגבאי ממלא לבד; --- מעביר לעמוד ב׳)<textarea id="gmEin" rows="3" maxlength="1500" placeholder="מיי\' פ&quot;א מהל\' שינה בשיעור הלכה ג. סמג עשין נ&quot;ה. טור ושו&quot;ע או&quot;ח סי\' ו סעיף א"></textarea></label>' +
      '<label class="field">שורת שיווק למחזור – מודפסת בתחתית כל עמוד (ריק = בלי)<input id="gmPromo" maxlength="80" placeholder="מחזור ס&quot;ט במלכים!!!"></label>' +
      '<label class="field">מסורת הש"ס – הערות שוליים היתוליות (לא מראי מקומות אמיתיים)<textarea id="gmMar" rows="2" maxlength="400" placeholder="ראו עוד: שיעור בוקר ד. ע&quot;ב (כמעט)"></textarea></label></section>' +
      '<section class="sh-card"><h2>הדף</h2><div class="sh-themes" id="gmThemes" role="group" aria-label="עיצוב הדף"><button type="button" class="btn btn-sm btn-line" data-th="1">1 · קלף קלאסי</button><button type="button" class="btn btn-sm btn-line" data-th="2">2 · צבעוני מלא</button><button type="button" class="btn btn-sm btn-line" data-th="3">3 · שחור-לבן חד</button></div><p class="sh-hint">מדפיסים בלי צבע? בוחרים 3: הוא בנוי כך שכל ההדגשות בולטות גם בשחור-לבן. מדפיסים בצבע? 2 מראה הכי טוב כל צבע.</p><div id="gmView" class="sh-paper"></div><div class="sh-row"><button type="button" class="btn btn-sm btn-line" id="gmPrint">הדפסה או PDF (A4)</button></div></section>' + saveBox(existing, 'gemara');
    function toLines(a) { return a.map(function (x) { return x.sep ? '---' : (x.dh ? x.dh + ': ' : '') + x.text; }).join('\n'); }
    function fromLines(t) { return lines(t).map(function (l) { if (l === '---') return { sep: true }; var i = l.indexOf(':'); return i > 0 && i < 40 ? { dh: l.slice(0, i).trim(), text: l.slice(i + 1).trim() } : { dh: '', text: l }; }); }
    $('#gmTopic', root).value = d.topic || ''; $('#gmMas', root).value = d.masechet || ''; $('#gmPer', root).value = d.perek || ''; $('#gmDaf', root).value = d.daf || '';
    $('#gmMish', root).value = d.mishna || ''; $('#gmGem', root).value = d.gemara || ''; $('#gmRashi', root).value = toLines(d.rashi); $('#gmTos', root).value = toLines(d.tosafot); $('#gmMar', root).value = d.margin || ''; $('#gmEin', root).value = d.ein || ''; $('#gmPromo', root).value = d.promo == null ? 'מחזור ס"ט במלכים!!!' : d.promo; $('#gmJoke', root).value = d.joke || '';
    function gather() {
      d.topic = $('#gmTopic', root).value; d.masechet = $('#gmMas', root).value; d.perek = $('#gmPer', root).value; d.daf = $('#gmDaf', root).value;
      d.mishna = $('#gmMish', root).value; d.gemara = $('#gmGem', root).value; d.rashi = fromLines($('#gmRashi', root).value); d.tosafot = fromLines($('#gmTos', root).value);
      d.margin = $('#gmMar', root).value; d.ein = $('#gmEin', root).value; d.promo = $('#gmPromo', root).value; d.joke = $('#gmJoke', root).value;
    }
    function paint() { gather(); $('#gmView', root).innerHTML = gemaraHtml(d); layoutDaf($('#gmView', root)); $('#gmLight', root).innerHTML = light ? SH.lightHtml(light.light, light.why) : ''; }
    root.addEventListener('input', function (e) { if (e.target.closest('.sh-card') && e.target.id && e.target.id.indexOf('gm') === 0) paint(); });
    if (SH.gimBox) SH.gimBox($('#gmGimBox', root), { title: 'גימטריות מצחיקות לדף הגמרא', hint: 'ההצעה נכנסת לתוספות בלשון "בגימטריא", לפני המעבר לעמוד ב׳, עם החישוב המלא.', seed: function () { return $('#gmTopic', root).value.split(/\s+/).slice(-1)[0]; },
      insert: function (h, ln, sd) {
        var t = $('#gmTos', root), a = t.value.split('\n'), i = a.indexOf('---'), add = 'בגימטריא: ' + ln.replace(' בגימטריא ', ' כמניין ') + '.';
        if (i < 0) a.push(add); else a.splice(i, 0, add);
        t.value = a.filter(function (x, k) { return x.trim() || k < a.length; }).join('\n').replace(/^\n+/, ''); t.dispatchEvent(new Event('input', { bubbles: true })); toast('נכנס לתוספות. אפשר לתקן');
      } });
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
    var SAMPLE = {"topic": "האם מותר להירדם בשיעור בוקר", "masechet": "מסכת שיעור בוקר", "perek": "פרק ראשון – הנרדם", "daf": "ב.", "joke": "מי שנרדם בשיעור בוקר – האם חייב להעיר אותו חברו, או שפטור כי גם החבר ישן?", "mishna": "הנרדם בשיעור בוקר, משעה שהרב פותח את הגמרא ועד שהפעמון מצלצל – חייב להתעורר. רבי יהודה אומר: פטור, שהרי עיניו נעצמו שלא מדעתו. וחכמים אומרים: אף על פי כן חייב בכוס קפה.", "gemara": "מאי טעמא דרבי יהודה? דכתיב: אני ישנה ולבי ער. ורבנן? ההוא בשיעור בוקר לא נאמר.\nתנו רבנן: הנרדם בשיעור – מעירו חברו בעט, ואם אין עט – בכתף, ואם אין כתף – בקול רם. ואם גם החבר ישן – הרי זה שיעור שכולו ישן.\nאיבעיא להו: נרדם בשיעור שלא מדעתו, מהו? תא שמע: מעשה בתלמיד אחד שנרדם והתעורר כשהרב שאל אותו שאלה, ואמר: אמן. אמרו לו: אין זו תשובה. אמר להם: אף אין זו שאלה. תיקו.\nאמר רב נחמן אמר שמואל: הלכה כרבנן, ובלבד שלא יישן בשורה הראשונה.\nמתקיף לה רב פפא: והא תניא, נרדם בשורה הראשונה – חייב להביא קפה לכל השורה! אמר ליה: התם בשיעור ארוך, הכא בשיעור קצר.\nאמר רב אשי: כך מקובלני ממורי, כל הנרדם בשיעור בוקר ומתעורר לפני הסיום – כאילו לא ישן, וכל שלא התעורר – כאילו הקדים את הסיום.\n---\nתנא: שלוש שעות אין שואלים בהן את הרב – משעה שנכנס לכיתה, משעה שלקח את הטוש, ומשעה שהסתכל בשעון.\nאמר רבא: אין בין שיעור בוקר לשיעור ערב אלא מספר האנשים שהחזיקו מעמד.\nמיתיבי: הישן בשיעור – אינו מקבל ציון על ההשתתפות. אמר ליה: התם דחוק, הכא דמיך. ורב אחא בר יעקב? אמר: אף בהשתתפות בחלום.\nאמר ליה אביי לרבא: מה ראית שהקדמת את הקפה לשיעור? אמר ליה: דאי לא, לא תוכל לשמוע. אמר ליה: והלא אף הקפה מרדים! אמר ליה: נמצא שכרו בצדו.\nתנן התם: המקדים להתעורר ינקה את הלוח. רבי חייא אומר: אף המאחר. ומה בין זה לזה? בין זה לזה – מי שהוא הנקי.", "rashi": [{"dh": "הנרדם בשיעור", "text": "תלמיד שעיניו נעצמו וראשו נופל על השולחן, ועדיין נראה כמי ששומע."}, {"dh": "משעה שהרב פותח", "text": "משעה שאמר 'נפתח בעמוד הראשון', ואין זה כשאמר 'נמשיך מהמקום שעצרנו'."}, {"dh": "עד שהפעמון", "text": "לא פעמון של ממש, אלא צילצול הטלפון של מי ששכח להשתיק."}, {"dh": "פטור", "text": "מלהתעורר, אך לא מלהתבייש."}, {"dh": "חייב בכוס קפה", "text": "קפה שחור, בלי סוכר, ובלי לקחת מהמזנון של אחרים."}, {"dh": "אני ישנה", "text": "פסוק שאין לו קשר לעניין, ואין להקשות על כך."}, {"dh": "בעט", "text": "עט רגיל, לא עט נובע, שלא ישאיר כתם על חברו."}, {"dh": "שיעור שכולו ישן", "text": "כמו כיתה כולה שהסכימה בשתיקה להפסקה."}, {"dh": "אמן", "text": "התלמיד ענה על דעת עצמו, שכך הורגל לענות על כל דבר."}, {"dh": "תיקו", "text": "תשבי יתרץ קושיות ובעיות, ואילו כאן תשבי עדיין ישן."}, {"dh": "בשורה הראשונה", "text": "המקום שבו הרב רואה הכול ואין מקום להתחבא."}, {"sep": true}, {"dh": "שלוש שעות", "text": "אלו שעות של פחות סבלנות, ואין להקשות שהשעה קצרה."}, {"dh": "הטוש", "text": "טוש לוח לבן, ולא טוש של כביסה, ולכן אין לטעות בצבע."}, {"dh": "דמיך", "text": "ישן, ובלשון בני אדם: הלך לעולם אחר."}, {"dh": "ציון על ההשתתפות", "text": "ציון שניתן למי שענה, ולא למי שחלם שענה."}, {"dh": "והלא אף הקפה", "text": "כלומר, קפה שאינו מועיל, מועיל שלא ליפול לתוך הספל."}, {"dh": "נמצא שכרו בצדו", "text": "הנאה מועטה בדמות ריח של קפה."}, {"dh": "ינקה את הלוח", "text": "הלוח נקי כבר מאתמול, והכוונה לנקות שוב כדי להרגיש שימושי."}], "tosafot": [{"dh": "הנרדם בשיעור", "text": "וקשה, והלא אין שינה בכיתה אלא בשיעור שני, ואיך אפשר להירדם בשיעור ראשון ללא לילה קודם?"}, {"dh": "ורבי יהודה", "text": "ואם תאמר, מה ראיה מהפסוק, והרי זה נאמר בזמן אחר? ויש לומר שאין ראיה אלא הנחה."}, {"dh": "בעט", "text": "ואם אין עט, כיצד כותבים? ויש לומר שהוא שואל מחבר, וחוזר חלילה."}, {"dh": "אמן", "text": "וקשה, מדוע לא אמר 'אכן'? ויש לומר שהוא לא היה בטוח, ולכן קיצר."}, {"dh": "ובלבד", "text": "ואם יש תלמיד אחד בכיתה, איפה השורה הראשונה? ויש לומר שזה אותו תלמיד בכל השורות."}, {"dh": "כאילו לא ישן", "text": "ולכאורה קשה, והלא ישן, ויש לומר שכוונתו שהחבר לא ישן במקומו."}, {"sep": true}, {"dh": "שלוש שעות", "text": "ואם תאמר, מדוע שלוש ולא ארבע? ויש לומר שארבע הוא כבר שעת סיום."}, {"dh": "הטוש", "text": "ואם אין טוש בכלל, יש לשאול מהכיתה הסמוכה, ואין זו גניבה."}, {"dh": "בהשתתפות בחלום", "text": "וקשה, וכי חולמים בקול רם? ויש לומר שמי שנרדם חולם בקול, ומי שער – לא."}, {"dh": "מה בין זה", "text": "ויש לומר שהכוונה לשניהם, והרי הכול אחד."}, {"dh": "תנן התם", "text": "אין בגמרא מקום כזה, אבל זה דף היתולי ואין צורך בראיה."}], "margin": "ראו עוד: שיעור צהריים ג. (נרדם); שיעור ערב ו: (כמעט); הפסקה ד. (סוף סוף). אין אלו מראי מקומות אמיתיים."};
    $('#gmSample', root).onclick = function () {
      $('#gmTopic', root).value = SAMPLE.topic; $('#gmMas', root).value = SAMPLE.masechet; $('#gmPer', root).value = SAMPLE.perek; $('#gmDaf', root).value = SAMPLE.daf;
      $('#gmJoke', root).value = SAMPLE.joke; $('#gmMish', root).value = SAMPLE.mishna; $('#gmGem', root).value = SAMPLE.gemara;
      $('#gmRashi', root).value = toLines(SAMPLE.rashi); $('#gmTos', root).value = toLines(SAMPLE.tosafot); $('#gmMar', root).value = SAMPLE.margin; $('#gmEin', root).value = ''; $('#gmPromo', root).value = 'מחזור ס"ט במלכים!!!';
      paint(); toast('נטען דף לדוגמה מלא. אפשר לתקן הכול'); $('#gmView', root).scrollIntoView({ behavior: 'smooth' });
    };
    function themeMark() { root.querySelectorAll('[data-th]').forEach(function (b) { var on = b.getAttribute('data-th') === (d.theme || '1'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('btn-gold', on); b.classList.toggle('btn-line', !on); }); }
    root.querySelectorAll('[data-th]').forEach(function (b) { b.onclick = function () { d.theme = b.getAttribute('data-th'); themeMark(); paint(); }; });
    themeMark();
    $('#gmPrint', root).onclick = function () { gather(); printNode(gemaraHtml(d), 'sh-print-gemara', function (n) { layoutDaf(n, true); }); };
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
