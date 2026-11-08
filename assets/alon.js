// מנוע העלון של כלי קודש: טקסט של שיעור → עמודי A4 בשני טורים, עם כותרת, כותרות משנה, ציטוט בתיבה, חתימה והקדשה.
// משמש את "שיעור לעלון" (/kodesh/alon/) ואת "שיעור אחד, שבוע של תוכן" (/kodesh/shavua/).
// בלי AI: הרב מסמן בעצמו. שורה שמתחילה ב-# היא כותרת משנה, שורה שמתחילה ב-> היא ציטוט מודגש,
// ו-**מילים** מודגשות. המילים עצמן לא משתנות: רק הסימנים יורדים.
// העימוד נעשה כאן ב-JS (מילוי טור אחרי טור), ולכן מה שרואים בתצוגה זה בדיוק מה שיודפס, כולל מספרי העמודים בתוכן העניינים.
(function () {
  'use strict';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // ---------- קריאת הסימנים ----------
  function clean(line) { return line.replace(/^\s*(#{1,3}|>)\s*/, '').trim(); }
  function parse(body) {
    var out = [];
    String(body || '').replace(/\r/g, '').split('\n').forEach(function (raw) {
      var l = raw.trim();
      if (!l) return;
      if (/^#{1,3}\s*\S/.test(l)) out.push({ t: 'h', text: clean(l) });
      else if (/^>\s*\S/.test(l)) out.push({ t: 'q', text: clean(l) });
      else out.push({ t: 'p', text: l });
    });
    return out;
  }
  // מילים עם הדגשה (**...**). כל מילה היא HTML סגור, כדי שאפשר יהיה לחתוך פסקה בכל מילה.
  function words(text) {
    var out = [], bold = false, glue = false;
    String(text).split(/(\*\*)/).forEach(function (part) {
      if (part === '**') { bold = !bold; return; }
      if (!part) return;
      var ws = part.split(/\s+/), first = true;
      // בלי רווח בין ההדגשה לסימן הפיסוק או לאות שאחריה ("**ללכת**,"): מצמידים למילה הקודמת
      if (ws[0] === '') { ws.shift(); first = false; }
      ws.forEach(function (w) {
        if (!w) return;
        var h = bold ? '<b>' + esc(w) + '</b>' : esc(w);
        if (first && glue && out.length) out[out.length - 1] += h; else out.push(h);
        first = false;
      });
      glue = !/\s$/.test(part);
    });
    return out;
  }
  function plain(text) { return String(text).replace(/\*\*/g, ''); }

  // ---------- בניית העמודים ----------
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function host() {
    var h = document.getElementById('al-print');
    if (!h) { h = el('div'); h.id = 'al-print'; h.setAttribute('aria-hidden', 'true'); document.body.appendChild(h); }
    return h;
  }
  function logoImg(d) { return d.logo ? '<img class="al-logo" alt="" src="' + esc(d.logo) + '">' : ''; }

  // d: { mode:'alon'|'sefer', name, par, issue, rav, ded, foot, theme, cols(1|2), big, logo, btitle, items:[{title, body}] }
  function render(d, target) {
    var H = target || host();
    H.innerHTML = '';
    var pages = [], cur = null, colIdx = 0, ci = 0, toc = [], pageNo = 0;
    var cols = d.cols === 1 || d.cols === '1' ? 1 : 2;
    var root = el('div', 'al-doc al-th-' + (d.theme || 'kachol') + (d.big ? ' al-big' : '') + (cols === 1 ? ' al-one' : ''));
    H.appendChild(root);

    function newPage(kind, head) {
      var pg = el('section', 'al-page al-' + kind);
      root.appendChild(pg);
      pages.push(pg);
      pageNo++;
      if (head) pg.appendChild(head);
      if (kind === 'cover' || kind === 'toc') { pg.dataset.no = pageNo; return pg; }
      var box = el('div', 'al-cols');
      for (var i = 0; i < cols; i++) box.appendChild(el('div', 'al-col'));
      pg.appendChild(box);
      var ft = el('div', 'al-foot');
      ft.innerHTML = '<span>' + esc(d.foot || '') + '</span><span class="al-no">' + pageNo + '</span>';
      pg.appendChild(ft);
      cur = pg; colIdx = 0;
      return pg;
    }
    function col() { return cur.querySelectorAll('.al-col')[colIdx]; }
    function fits(c) { return c.scrollHeight <= c.clientHeight + 1; }
    function used(c) { var l = c.lastElementChild; return l ? l.offsetTop + l.offsetHeight : 0; } // .al-col הוא position:relative
    function runHead(title) {
      var r = el('div', 'al-run');
      r.innerHTML = '<span>' + esc(d.mode === 'sefer' ? (d.btitle || '') : (d.name || '')) + '</span><span>' + esc(plain(title || '')) + '</span>';
      return r;
    }
    function nextCol(title) {
      if (colIdx < cols - 1) { colIdx++; return; }
      newPage('cont', runHead(title));
    }
    function make(b, part) {
      var e;
      if (b._w && part == null) part = b.w.join(' '); // המשך של פסקה שכבר חולקה למילים
      if (b.t === 'h') e = el('h3', 'al-h', words(b.text).join(' '));
      else if (b.t === 'q') e = el('blockquote', 'al-q', part != null ? part : words(b.text).join(' '));
      else if (b.t === 'sig') e = el('div', 'al-sig', esc(b.text));
      else e = el('p', 'al-p' + (b.cont ? ' al-cont' : ''), part != null ? part : words(b.text).join(' '));
      return e;
    }
    function place(b, title, guard) {
      if ((guard = (guard || 0) + 1) > 400) return;
      var c = col(), e = make(b);
      var empty = !c.firstElementChild;
      c.appendChild(e);
      if (fits(c)) {
        // כותרת לא נשארת לבד בתחתית הטור
        if (b.t === 'h' && !empty && c.clientHeight - used(c) < e.offsetHeight * 1.8 + 40) { c.removeChild(e); nextCol(title); place(b, title, guard); }
        return;
      }
      c.removeChild(e);
      var split = b.t === 'p' || (b.t === 'q' && empty);
      if (split) {
        var w = b.w || words(b.text), lo = 0, hi = w.length - 1, best = 0;
        while (lo <= hi) {
          var mid = (lo + hi) >> 1, t = make(b, w.slice(0, mid).join(' '));
          c.appendChild(t);
          if (fits(c)) { best = mid; lo = mid + 1; } else hi = mid - 1;
          c.removeChild(t);
        }
        if (best >= 3 || (empty && best > 0)) {
          var h = make(b, w.slice(0, best).join(' ')); h.classList.add('al-split'); c.appendChild(h);
          nextCol(title);
          place({ t: b.t, w: w.slice(best), text: '', cont: true, _w: 1 }, title, guard);
          return;
        }
      }
      if (empty) { c.appendChild(e); return; } // לא נכנס גם לטור ריק: משאירים, כדי לא להיתקע
      nextCol(title); place(b, title, guard);
    }
    function topBlock(it, first) {
      var t = el('header', 'al-top');
      var line = [d.par, d.issue ? 'גיליון ' + d.issue : ''].filter(Boolean).join(' · ');
      if (d.mode === 'sefer') {
        t.className = 'al-top al-top-s';
        t.innerHTML = '<div class="al-bsd">בס"ד</div><h1>' + esc(plain(it.title || 'שיעור')) + '</h1>' + (it.sub ? '<div class="al-line">' + esc(it.sub) + '</div>' : '') + '<div class="al-rule"></div>';
        return t;
      }
      t.innerHTML = '<div class="al-bsd">בס"ד</div>' + logoImg(d) +
        (d.name ? '<div class="al-name">' + esc(d.name) + '</div>' : '') +
        (line ? '<div class="al-line">' + esc(line) + '</div>' : '') +
        '<h1>' + esc(plain(it.title || 'דבר תורה')) + '</h1>' +
        (d.rav ? '<div class="al-by">' + esc(d.rav) + '</div>' : '') +
        '<div class="al-rule"></div>' +
        (d.ded ? '<div class="al-ded">' + esc(d.ded) + '</div>' : '');
      return t;
    }
    function flowItem(it, idx) {
      newPage('first', topBlock(it, idx === 0));
      toc.push({ title: plain(it.title || 'שיעור ' + (idx + 1)), page: pageNo });
      var blocks = parse(it.body);
      if (!blocks.length) blocks = [{ t: 'p', text: '…' }];
      blocks.forEach(function (b) { place(b, it.title); });
      var sig = d.mode === 'sefer' ? (it.sig || '') : (d.rav || '');
      if (sig) place({ t: 'sig', text: sig }, it.title);
      balance(cur);
    }
    // בעמוד האחרון של שיעור: שני הטורים באותו גובה (הדפדפן מאזן לבד עם column-count), ולא טור מלא וטור ריק
    function balance(pg) {
      if (cols < 2) return;
      var box = pg.querySelector('.al-cols'), cs = box.querySelectorAll('.al-col'), h = cs[0].clientHeight;
      var bal = el('div', 'al-bal');
      [].forEach.call(cs, function (c) { while (c.firstChild) bal.appendChild(c.firstChild); });
      box.innerHTML = ''; box.appendChild(bal);
      if (bal.scrollHeight > h + 1 || bal.offsetHeight > h + 1) { // לא נכנס מאוזן: מחזירים לטורים כמו שהיה
        box.innerHTML = ''; var c1 = el('div', 'al-col'), c2 = el('div', 'al-col'); box.appendChild(c1); box.appendChild(c2);
        while (bal.firstChild) { c1.appendChild(bal.firstChild); if (!fits(c1)) { c2.appendChild(c1.lastChild); } }
      }
    }

    var items = (d.items || []).filter(function (it) { return (it.title || '').trim() || (it.body || '').trim(); });
    if (!items.length) items = [{ title: '', body: '' }];
    if (d.mode === 'sefer') {
      var cv = newPage('cover');
      cv.innerHTML = '<div class="al-bsd">בס"ד</div><div class="al-cv">' + logoImg(d) +
        (d.name ? '<div class="al-name">' + esc(d.name) + '</div>' : '') +
        '<h1>' + esc(d.btitle || 'קובץ שיעורים') + '</h1>' +
        (d.par ? '<div class="al-line">' + esc(d.par) + '</div>' : '') +
        '<div class="al-rule"></div>' +
        (d.rav ? '<div class="al-by">' + esc(d.rav) + '</div>' : '') +
        (d.ded ? '<div class="al-ded">' + esc(d.ded) + '</div>' : '') +
        '</div>' + (d.foot ? '<div class="al-cvfoot">' + esc(d.foot) + '</div>' : '');
      var tp = newPage('toc');
      items.forEach(function (it, i) { flowItem(it, i); });
      tp.innerHTML = '<div class="al-bsd">בס"ד</div><h2>תוכן העניינים</h2><ol class="al-toc">' + toc.map(function (x) {
        return '<li><span>' + esc(x.title) + '</span><i></i><b>' + x.page + '</b></li>';
      }).join('') + '</ol>';
    } else {
      items.slice(0, 1).forEach(function (it, i) { flowItem(it, i); });
    }
    return { pages: pages.length, toc: toc, root: root };
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all(['400 14px "Frank Ruhl Libre"', '700 14px "Frank Ruhl Libre"', '400 14px "Assistant"', '700 14px "Assistant"'].map(function (f) { return document.fonts.load(f, 'אבג'); })).catch(function () {});
  }
  // הדפסה: רק העמודים (שאר הדף מוסתר), וכל עמוד בדף A4 משלו. "שמירה כ-PDF" בחלון ההדפסה נותנת קובץ.
  function print(d) {
    return fontsReady().then(function () {
      if (d) render(d);
      document.documentElement.classList.add('al-printing');
      var off = function () { document.documentElement.classList.remove('al-printing'); window.removeEventListener('afterprint', off); };
      window.addEventListener('afterprint', off);
      setTimeout(function () { window.print(); }, 120);
    });
  }
  // תצוגה מוקטנת של העמודים בתוך הדף
  function preview(view) {
    var src = host().querySelector('.al-doc');
    view.innerHTML = '';
    if (!src) return;
    var sc = el('div', 'al-scale'), copy = src.cloneNode(true);
    sc.appendChild(copy); view.appendChild(sc);
    function fit() {
      var w = view.clientWidth || 360, k = Math.min(1, w / 800);
      sc.style.transform = 'scale(' + k + ')';
      view.style.height = Math.ceil(copy.offsetHeight * k) + 'px';
    }
    fit();
    if (!view._fit) { view._fit = true; window.addEventListener('resize', function () { var s = view.querySelector('.al-scale'); if (s) fit(); }); }
  }
  // טקסט לדוגמה (נכתב לכלי הזה), כדי לראות איך העלון נראה לפני שמדביקים שיעור אמיתי
  var DEMO = {
    title: 'הדרך היא חלק מהמקום',
    par: 'פרשת לך לך',
    body: [
      'אברהם אבינו שומע ציווי שאין בו כתובת. "לך לך מארצך וממולדתך ומבית אביך, אל הארץ אשר אראך". הוא יודע מה הוא עוזב, ואינו יודע לאן הוא הולך.',
      'רוב האנשים רוצים לראות את הסוף לפני שהם יוצאים לדרך. אנחנו מבקשים תוכנית, לוח זמנים ותשובה ברורה. התורה מלמדת אותנו שלפעמים הצעד הראשון בא לפני ההבנה.',
      '# לצאת בלי לדעת',
      'מה נתן לאברהם את הכוח לצאת? לא הידיעה, אלא האמון. מי שסומך על מי ששולח אותו, יכול ללכת גם בלי מפה.',
      '> הצעד הראשון לא צריך לראות את כל הדרך. הוא צריך רק לסמוך על מי ששולח אותו.',
      'כך גם אצלנו. החלטה ללמוד דף אחד ביום, לבקר חבר חולה, או לפתוח מחדש קשר שנסגר. איננו יודעים לאן זה יוביל, ובכל זאת יוצאים.',
      '# הדרך עצמה מלמדת',
      'המילים "לך לך" נדרשו גם במובן של "לך לעצמך": ההליכה היא לא רק אל מקום חדש, אלא גם אל האדם שאברהם עתיד להיות. בכל תחנה בדרך הוא בונה מזבח, וקורא בשם ה\'.',
      'מי שמחכה להגיע כדי להתחיל לחיות, מפספס את הדרך. מי שבונה מזבח בכל תחנה, מגלה שהדרך עצמה היא כבר חלק מהמקום.',
      '> כל תחנה בדרך יכולה להיות מקום של קדושה, אם רק עוצרים לבנות בה מזבח.',
      '# מזבח בכל תחנה',
      'יש מי שחושב שקדושה שייכת רק למקומות גדולים: לבית המקדש, לבית הכנסת, לשבת ולחג. אברהם מלמד שגם אוהל במדבר, גם באר בדרך וגם עצירה קצרה בין שתי ערים יכולים להיות מקום שבו קוראים בשם ה\'.',
      'הבית שלנו, מקום העבודה, הנסיעה בבוקר והשיחה עם השכן הם התחנות שלנו. בכל אחת מהן אפשר לעצור לרגע, להודות, לברך ולהיטיב.',
      'השבוע ננסה לבחור צעד אחד קטן שדחינו, ולצאת אליו. לא לחכות לתמונה המלאה. **ללכת**, ולתת לדרך ללמד אותנו.'
    ].join('\n'),
    rav: 'הרב משה כהן',
    name: 'עלון שבועי · קהילת אהל יצחק',
    ded: 'העלון מוקדש לרפואה שלמה של כל החולים',
    foot: 'להצטרפות לקבוצת השיעורים: 050-0000000'
  };
  window.KAlon = { DEMO: DEMO, parse: parse, render: render, print: print, preview: preview, fontsReady: fontsReady, plain: plain, clean: clean };
})();
