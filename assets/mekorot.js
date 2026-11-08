// R4 – דף מקורות לשיעור (כלי קודש). מקלידים רשימת מקורות בעברית, הטקסט מגיע מספריא (sefaria.org, בלי מפתח),
// ונבנה דף ממוספר להדפסה A4. מקור שלא נמצא: מקום ריק להדבקה ידנית. הכול נשמר בטלפון (localStorage).
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var form = $('mk-form'), sheet = $('mk-sheet');
  if (!form || !sheet) return;

  // ---------- מילונים ----------
  var SHAS = {
    'ברכות': 'Berakhot', 'שבת': 'Shabbat', 'עירובין': 'Eruvin', 'ערובין': 'Eruvin', 'פסחים': 'Pesachim', 'שקלים': 'Shekalim', 'יומא': 'Yoma',
    'סוכה': 'Sukkah', 'ביצה': 'Beitzah', 'ראש השנה': 'Rosh Hashanah', 'ר"ה': 'Rosh Hashanah', 'תענית': 'Taanit', 'מגילה': 'Megillah',
    'מועד קטן': 'Moed Katan', 'מו"ק': 'Moed Katan', 'חגיגה': 'Chagigah', 'יבמות': 'Yevamot', 'כתובות': 'Ketubot', 'נדרים': 'Nedarim',
    'נזיר': 'Nazir', 'סוטה': 'Sotah', 'גיטין': 'Gittin', 'קידושין': 'Kiddushin', 'קדושין': 'Kiddushin', 'בבא קמא': 'Bava Kamma', 'ב"ק': 'Bava Kamma',
    'בבא מציעא': 'Bava Metzia', 'ב"מ': 'Bava Metzia', 'בבא בתרא': 'Bava Batra', 'ב"ב': 'Bava Batra', 'סנהדרין': 'Sanhedrin', 'מכות': 'Makkot',
    'שבועות': 'Shevuot', 'עבודה זרה': 'Avodah Zarah', 'ע"ז': 'Avodah Zarah', 'הוריות': 'Horayot', 'זבחים': 'Zevachim', 'מנחות': 'Menachot',
    'חולין': 'Chullin', 'בכורות': 'Bekhorot', 'ערכין': 'Arakhin', 'תמורה': 'Temurah', 'כריתות': 'Keritot', 'מעילה': 'Meilah', 'תמיד': 'Tamid', 'נדה': 'Niddah'
  };
  var MISHNA_ONLY = {
    'פאה': 'Peah', 'דמאי': 'Demai', 'כלאים': 'Kilayim', 'שביעית': 'Sheviit', 'תרומות': 'Terumot', 'מעשרות': 'Maasrot', 'מעשר שני': 'Maaser Sheni',
    'חלה': 'Challah', 'ערלה': 'Orlah', 'ביכורים': 'Bikkurim', 'בכורים': 'Bikkurim', 'עדיות': 'Eduyot', 'מדות': 'Middot', 'מידות': 'Middot', 'קינים': 'Kinnim',
    'כלים': 'Kelim', 'אהלות': 'Oholot', 'נגעים': 'Negaim', 'פרה': 'Parah', 'טהרות': 'Tahorot', 'מקואות': 'Mikvaot', 'מכשירין': 'Makhshirin',
    'זבים': 'Zavim', 'טבול יום': 'Tevul Yom', 'ידים': 'Yadayim', 'ידיים': 'Yadayim', 'עוקצין': 'Oktzin'
  };
  var TANAKH = {
    'בראשית': 'Genesis', 'שמות': 'Exodus', 'ויקרא': 'Leviticus', 'במדבר': 'Numbers', 'דברים': 'Deuteronomy', 'יהושע': 'Joshua', 'שופטים': 'Judges',
    'שמואל א': 'I Samuel', 'שמואל ב': 'II Samuel', 'מלכים א': 'I Kings', 'מלכים ב': 'II Kings', 'ישעיהו': 'Isaiah', 'ישעיה': 'Isaiah',
    'ירמיהו': 'Jeremiah', 'ירמיה': 'Jeremiah', 'יחזקאל': 'Ezekiel', 'הושע': 'Hosea', 'יואל': 'Joel', 'עמוס': 'Amos', 'עובדיה': 'Obadiah',
    'יונה': 'Jonah', 'מיכה': 'Micah', 'נחום': 'Nahum', 'חבקוק': 'Habakkuk', 'צפניה': 'Zephaniah', 'חגי': 'Haggai', 'זכריה': 'Zechariah',
    'מלאכי': 'Malachi', 'תהלים': 'Psalms', 'תהילים': 'Psalms', 'משלי': 'Proverbs', 'איוב': 'Job', 'שיר השירים': 'Song of Songs', 'רות': 'Ruth',
    'איכה': 'Lamentations', 'קהלת': 'Ecclesiastes', 'אסתר': 'Esther', 'דניאל': 'Daniel', 'עזרא': 'Ezra', 'נחמיה': 'Nehemiah',
    'דברי הימים א': 'I Chronicles', 'דברי הימים ב': 'II Chronicles', 'דה"א': 'I Chronicles', 'דה"ב': 'II Chronicles'
  };
  var SA = { 'או"ח': 'Orach Chayim', 'אורח חיים': 'Orach Chayim', 'יו"ד': 'Yoreh De\'ah', 'יורה דעה': 'Yoreh De\'ah',
    'אה"ע': 'Even HaEzer', 'אבן העזר': 'Even HaEzer', 'חו"מ': 'Choshen Mishpat', 'חושן משפט': 'Choshen Mishpat' };
  var SA_HE = { 'Orach Chayim': 'אורח חיים', 'Yoreh De\'ah': 'יורה דעה', 'Even HaEzer': 'אבן העזר', 'Choshen Mishpat': 'חושן משפט' };

  // ---------- עזרים ----------
  var GV = { 'א': 1, 'ב': 2, 'ג': 3, 'ד': 4, 'ה': 5, 'ו': 6, 'ז': 7, 'ח': 8, 'ט': 9, 'י': 10, 'כ': 20, 'ך': 20, 'ל': 30, 'מ': 40, 'ם': 40, 'נ': 50, 'ן': 50,
    'ס': 60, 'ע': 70, 'פ': 80, 'ף': 80, 'צ': 90, 'ץ': 90, 'ק': 100, 'ר': 200, 'ש': 300, 'ת': 400 };
  function num(s) {
    s = (s || '').replace(/["'״׳]/g, '');
    if (/^\d+$/.test(s)) return +s;
    var n = 0;
    for (var i = 0; i < s.length; i++) { if (!GV[s[i]]) return 0; n += GV[s[i]]; }
    return n;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) {
    return s.replace(/[״“”]/g, '"').replace(/[׳‘’`]/g, "'").replace(/[–—]/g, '-').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // מוצא את המפתח הארוך ביותר במילון שהשורה מתחילה בו
  function lead(s, dict) {
    var best = null;
    Object.keys(dict).forEach(function (k) {
      if ((s === k || s.indexOf(k + ' ') === 0 || s.indexOf(k + '.') === 0 || s.indexOf(k + ':') === 0) && (!best || k.length > best.length)) best = k;
    });
    return best ? { key: best, val: dict[best], rest: s.slice(best.length).trim() } : null;
  }
  // "ב", "ב.", "ב:", "ב ע"א", "ב ע"ב", "ב א", "2a"
  function daf(rest) {
    var m = rest.match(/^([א-ת"']+|\d+)\s*([.:])?\s*(?:ע"?([אב])|עמוד ([אב])|([אב])(?=\s|$))?/);
    if (!m) return null;
    var d = num(m[1]); if (!d) return null;
    var side = m[2] === ':' ? 'b' : 'a';
    var x = m[3] || m[4] || m[5];
    if (x === 'ב') side = 'b';
    return d + side;
  }
  // מספרים אחרי שם הספר: "א ה-ז" / "1 5" → [פרק, פסוק, עד]
  function nums(rest) {
    var parts = rest.replace(/(פרק|סימן|סעיף|הלכה|פסוק|משנה|ס"ק|סק)\s*/g, '').replace(/\s*-\s*/g, '-').split(/[\s.:]+/).filter(Boolean);
    var out = [];
    parts.forEach(function (p) {
      var r = p.split('-');
      if (r.length === 2 && num(r[0]) && num(r[1])) { out.push(num(r[0])); out.push('-' + num(r[1])); }
      else if (num(p)) out.push(num(p));
    });
    return out;
  }
  function seg(base, n) {
    var s = base + ' ' + n.filter(function (x) { return typeof x === 'number'; }).slice(0, 3).join(':');
    var to = n.filter(function (x) { return typeof x === 'string'; })[0];
    return to ? s + to : s;
  }

  // מתרגם שורה למועמדים לספריא (מנסים לפי הסדר עד שאחד נמצא)
  function candidates(line) {
    var s = norm(line), c = [], m;
    s = s.replace(/^(מסכת|גמרא|בבלי|תלמוד בבלי)\s+/, '');
    // משנה ברורה
    if ((m = s.match(/^(משנה ברורה|מ"ב|משנ"ב)\s+(.*)$/))) { var mb = nums(m[2]); if (mb[0]) c.push(seg('Mishnah Berurah', mb)); }
    // משנה
    else if ((m = s.match(/^(משנה|משנת|מ')\s+(.*)$/)) || lead(s, MISHNA_ONLY)) {
      var body = m ? m[2] : s;
      if (/^(פרקי )?אבות/.test(body)) { c.push(seg('Pirkei Avot', nums(body.replace(/^(פרקי )?אבות/, '')))); }
      else { var t = lead(body, SHAS) || lead(body, MISHNA_ONLY); if (t) c.push(seg('Mishnah ' + t.val, nums(t.rest))); }
    }
    else if (/^(פרקי )?אבות/.test(s)) c.push(seg('Pirkei Avot', nums(s.replace(/^(פרקי )?אבות/, ''))));
    // שולחן ערוך
    else if ((m = s.match(/^(שו"ע|שולחן ערוך|שלחן ערוך|ש"ע)\s+(.*)$/))) {
      var p = lead(m[2], SA);
      if (p) { var n = nums(p.rest); if (n[0]) { c.push(seg('Shulchan Arukh, ' + p.val, n)); c.push('שולחן ערוך, ' + SA_HE[p.val] + ' ' + p.rest); } }
    }
    // רמב"ם
    else if ((m = s.match(/^(רמב"ם|רמבם|משנה תורה|הרמב"ם)\s+(.*)$/))) {
      var r = m[2].replace(/^הל'\s*|^הלכות\s+/, ''), w = r.split(' '), nn = [];
      while (w.length > 1 && num(w[w.length - 1]) && nn.length < 2) nn.unshift(w.pop());
      var name = w.join(' ');
      c.push('משנה תורה, הלכות ' + name + ' ' + nn.join(' '));
      c.push('רמב"ם הלכות ' + name + ' ' + nn.join(' '));
    }
    else {
      var g = lead(s, SHAS), tk = lead(s, TANAKH);
      if (g && !tk) { var dd = daf(g.rest); if (dd) c.push(g.val + ' ' + dd); }
      else if (tk) { var tn = nums(tk.rest); if (tn[0]) c.push(seg(tk.val, tn)); else c.push(tk.val + ' 1'); }
    }
    c.push(line.trim()); // תמיד מנסים גם כמו שהוקלד – ספריא מבינה הרבה הפניות בעברית
    return c.filter(function (x, i) { return x && c.indexOf(x) === i; });
  }

  function flat(t) { return Array.isArray(t) ? t.map(flat).filter(Boolean).join(' ') : (t || ''); }
  function clean(t) {
    return t.replace(/<sup[^>]*>.*?<\/sup>/g, '').replace(/<i class="footnote">.*?<\/i>/g, '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&thinsp;/g, ' ').replace(/\{[פס]\}/g, '').replace(/\s+/g, ' ').trim();
  }
  var cache = {};
  // תקלת רשת (לא "לא נמצא") – מנסים שוב עד פעמיים, אחרי הפסקה קצרה
  function get(u, tries) {
    return fetch(u).then(function (r) { return r.ok ? r.json() : null; }, function (err) {
      if (tries > 0) return new Promise(function (ok) { setTimeout(ok, 1200); }).then(function () { return get(u, tries - 1); });
      throw err;
    });
  }
  function fetchOne(ref) {
    if (cache[ref]) return Promise.resolve(cache[ref]);
    var u = 'https://www.sefaria.org/api/v3/texts/' + encodeURIComponent(ref) + '?version=hebrew';
    return get(u, 2).then(function (d) {
      if (!d || d.error || !d.versions || !d.versions.length) return null;
      var txt = clean(flat(d.versions[0].text));
      if (!txt) return null;
      var res = { he: d.heRef || ref, text: txt, ref: d.ref || ref };
      cache[ref] = res;
      return res;
    }).catch(function () { return null; });
  }
  function resolve(line) {
    var list = candidates(line), i = 0;
    function next() {
      if (i >= list.length) return Promise.resolve(null);
      return fetchOne(list[i++]).then(function (r) { return r || next(); });
    }
    return next();
  }

  // ---------- מצב ----------
  var KEY = 'kodesh-mekorot';
  var st = { title: '', sub: '', list: 'ברכות ב.\nמשנה ברכות א א\nרמב"ם קריאת שמע א א\nשו"ע או"ח נח א\nדברים ו ד-ט', notes: 1, plain: 0, items: [] };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  ['title', 'sub', 'list'].forEach(function (k) { var el = form.querySelector('[name=' + k + ']'); if (el) el.value = st[k] || ''; });
  $('mk-notes').checked = !!st.notes; $('mk-plain').checked = !!st.plain;
  function show(t) { return st.plain ? t.replace(/־/g, ' ').replace(/[֑-ׇ]/g, '') : t; }

  function draw() {
    var h = '<div class="mk-head"><span class="bsd">בס"ד</span>' +
      '<h2 contenteditable="true" data-k="title">' + esc(st.title || 'דף מקורות') + '</h2>' +
      (st.sub ? '<p class="mk-sub">' + esc(st.sub) + '</p>' : '') + '</div>';
    if (!st.items.length) h += '<p class="mk-empty no-print">מקלידים מקורות למעלה ולוחצים "להביא את המקורות".</p>';
    st.items.forEach(function (it, i) {
      h += '<section class="mk-src"><h3><span class="mk-n">' + (i + 1) + '</span> ' + esc(it.he || it.q) +
        '<button type="button" class="mk-x no-print" data-i="' + i + '" aria-label="להסיר את המקור">✕</button></h3>';
      if (it.state === 'wait') h += '<p class="mk-wait no-print">מביא מספריא…</p>';
      else if (it.text) h += '<div class="mk-text" contenteditable="true" data-i="' + i + '">' + esc(show(it.text)) + '</div>';
      else h += '<p class="mk-miss no-print">לא מצאתי את המקור בספריא. אפשר להדביק כאן את הטקסט:</p><div class="mk-text mk-paste" contenteditable="true" data-i="' + i + '"></div>';
      if (st.notes) h += '<div class="mk-lines" aria-hidden="true"></div>';
      h += '</section>';
    });
    h += '<p class="mk-foot">הטקסטים מתוך ספריא (sefaria.org) · נוצר בכלי קודש, kodesh</p>';
    sheet.innerHTML = h;
  }
  sheet.addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.k === 'title') { st.title = el.textContent; form.querySelector('[name=title]').value = st.title; }
    else if (el.dataset.i != null) { st.items[+el.dataset.i].text = el.innerText; }
    save();
  });
  sheet.addEventListener('click', function (e) {
    var b = e.target.closest('.mk-x'); if (!b) return;
    st.items.splice(+b.dataset.i, 1); save(); draw();
  });
  form.addEventListener('input', function () {
    st.title = form.elements.title.value; st.sub = form.elements.sub.value; st.list = form.elements.list.value; st.notes = $('mk-notes').checked ? 1 : 0; st.plain = $('mk-plain').checked ? 1 : 0; save(); draw();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); go(); });
  function go() {
    var lines = (form.elements.list.value || '').split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 30);
    st.items = lines.map(function (q) { return { q: q, state: 'wait' }; });
    draw();
    var status = $('mk-status'); status.textContent = 'מביא ' + lines.length + ' מקורות…';
    var found = 0;
    Promise.all(st.items.map(function (it) {
      return resolve(it.q).then(function (r) {
        it.state = 'done';
        if (r) { it.he = r.he; it.text = r.text; it.ref = r.ref; found++; }
        draw();
      });
    })).then(function () {
      save();
      status.textContent = found === lines.length ? 'כל המקורות נמצאו (' + found + '). אפשר לערוך את הטקסט ישר בדף.' :
        'נמצאו ' + found + ' מתוך ' + lines.length + '. במקורות שלא נמצאו יש מקום להדביק את הטקסט.';
    });
  }
  $('mk-go').addEventListener('click', go);
  $('mk-print').addEventListener('click', function () { window.print(); });
  $('mk-copy').addEventListener('click', function () {
    var t = (st.title || 'דף מקורות') + '\n\n' + st.items.map(function (it, i) { return (i + 1) + '. ' + (it.he || it.q) + '\n' + show(it.text || ''); }).join('\n\n');
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { $('mk-status').textContent = 'הועתק. אפשר להדביק בוורד או בווטסאפ.'; }, function () {});
  });
  // קישור לדף: ?q=מקור|מקור&t=כותרת – מי שפותח מקבל את אותו דף מקורות (לשליחה לתלמידים)
  $('mk-link').addEventListener('click', function () {
    var lines = (form.elements.list.value || '').split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var u = location.origin + location.pathname + '?q=' + encodeURIComponent(lines.join('|')) + (st.title ? '&t=' + encodeURIComponent(st.title) : '');
    (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { $('mk-status').textContent = 'הקישור הועתק. מי שפותח אותו מקבל את אותו דף מקורות.'; }, function () { window.prompt('הקישור לדף:', u); });
  });
  var qs = null; try { qs = new URLSearchParams(location.search); } catch (e) {}
  if (qs && qs.get('q')) {
    form.elements.list.value = st.list = qs.get('q').split('|').join('\n');
    if (qs.get('t')) form.elements.title.value = st.title = qs.get('t');
    go();
  } else draw();
})();
