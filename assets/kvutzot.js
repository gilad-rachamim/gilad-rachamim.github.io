/* מוצאים קבוצה – שאלון התאמה לקבוצות ווטסאפ. הרעיון באדיבות אהרן גרינברג.
   ההתאמה מחושבת כאן בדפדפן: התשובות לשאלון לא נשלחות לשום שרת. לשרת נשלחת רק בקשה לקישור של קבוצה אחת. */
(function (root) {
  'use strict';
  var API = 'https://kelim-kvutzot.gilad4049.workers.dev';
  var OPPOSITE = { 'נשים בלבד': 'גברים בלבד', 'גברים בלבד': 'נשים בלבד' };

  /* ניקוד: תחום עניין 30 (עד 60), אזור 25 (קבוצה ארצית 15), גיל 15 (קבוצה לכל הגילאים 10), כל "חשוב לי" 20.
     בלי אף תחום משותף ובלי אף "חשוב לי" משותף – לא מתאים. */
  function score(a, g) {
    var why = [], s = 0, i;
    var ints = (g.interests || []).filter(function (x) { return (a.interests || []).indexOf(x) >= 0; });
    var tags = (g.tags || []).filter(function (x) { return (a.tags || []).indexOf(x) >= 0; });
    for (i = 0; i < (a.tags || []).length; i++) if (OPPOSITE[a.tags[i]] && (g.tags || []).indexOf(OPPOSITE[a.tags[i]]) >= 0) return { score: 0, why: [] };
    if (!ints.length && !tags.length) return { score: 0, why: [] };
    if (ints.length) { s += Math.min(60, ints.length * 30); why.push('תחום משותף: ' + ints.join(', ')); }
    if (tags.length) { s += tags.length * 20; why.push('קבוצה של ' + tags.join(', ')); }
    if (a.region && g.region === a.region && a.region !== 'כל הארץ') { s += 25; why.push('באזור שלכם: ' + g.region); }
    else if (g.region === 'כל הארץ') { s += 15; why.push('קבוצה ארצית – פתוחה לכל אזור'); }
    else if (a.region === 'כל הארץ') { s += 10; }
    if (a.age && (g.ages || []).indexOf(a.age) >= 0) { s += 15; why.push('מתאימה לגיל ' + a.age); }
    else if (!(g.ages || []).length) { s += 10; why.push('לכל הגילאים'); }
    else if (a.age) s -= 10;
    return { score: Math.max(1, s), why: why };
  }
  function top(a, groups, n) {
    return groups.map(function (g) { var r = score(a, g); return { g: g, score: r.score, why: r.why }; })
      .filter(function (x) { return x.score > 0; })
      .sort(function (x, y) { return y.score - x.score || (x.g.name < y.g.name ? -1 : 1); })
      .slice(0, n || 3);
  }
  root.KvutzotMatch = { score: score, top: top };
  if (typeof module === 'object' && module.exports) { module.exports = root.KvutzotMatch; return; }
  if (typeof document === 'undefined') return;

  /* ---------- ממשק ---------- */
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return [].slice.call((el || document).querySelectorAll(s)); };
  function used(how) { if (window.toolUsed) window.toolUsed('kehila_kvutzot', { how: how }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  function post(path, data) {
    return fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { j._s = r.status; return j; }); });
  }
  var META = null, GROUPS = null;
  function load() {
    if (GROUPS) return Promise.resolve();
    return Promise.all([
      fetch(API + '/meta').then(function (r) { return r.json(); }),
      fetch(API + '/groups').then(function (r) { return r.json(); })
    ]).then(function (x) { META = x[0]; GROUPS = x[1].items || []; });
  }
  function chips(box, list, name) {
    box.innerHTML = list.map(function (v, i) {
      return '<label class="kv-chip"><input type="checkbox" name="' + name + '" value="' + esc(v) + '"><span>' + esc(v) + '</span></label>';
    }).join('');
  }
  function opts(sel, list, first) {
    sel.innerHTML = (first ? '<option value="">' + first + '</option>' : '') + list.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join('');
  }
  function vals(form, name) { return $$('input[name="' + name + '"]:checked', form).map(function (x) { return x.value; }); }

  function answers(f) { return { interests: vals(f, 'int'), tags: vals(f, 'tag'), region: f.region.value, age: f.age.value }; }

  function render(a) {
    var out = $('[data-kv-res]'), list = top(a, GROUPS, 3);
    if (!list.length) {
      out.innerHTML = '<div class="kv-empty"><p><b>עדיין אין קבוצה שמתאימה בדיוק.</b> המאגר רק התחיל, וכל קבוצה נבדקת לפני שהיא עולה.</p>' +
        '<p>אפשר לספר שאתם מחפשים קבוצה כזאת. בלי שם ובלי טלפון – רק סופרים כמה אנשים רוצים. כשמספיק אנשים מבקשים, נחפש או נפתח קבוצה.</p>' +
        '<button class="btn btn-gold" type="button" data-kv-want>אני רוצה קבוצה כזאת</button><p class="kv-msg" data-kv-want-msg role="status"></p></div>';
      return;
    }
    out.innerHTML = '<p class="kv-count">' + (list.length === 1 ? 'מצאנו קבוצה אחת שמתאימה:' : (list.length === 2 ? 'שתי' : 'שלוש') + ' הקבוצות שהכי מתאימות לכם:') + '</p>' +
      list.map(function (x) {
        var g = x.g;
        return '<article class="kv-card" data-id="' + esc(g.id) + '"><h3>' + esc(g.name) + '</h3><p>' + esc(g.desc) + '</p>' +
          '<p class="kv-why"><b>למה זה מתאים:</b> ' + esc(x.why.join(' · ')) + '</p>' +
          '<div class="kv-act"><button class="btn btn-gold" type="button" data-kv-link>לקבל קישור להצטרפות</button>' +
          '<button class="kv-rep" type="button" data-kv-rep>לדווח על הקבוצה</button></div><p class="kv-msg" role="status"></p></article>';
      }).join('') +
      '<p class="kv-more">לא מה שחיפשתם? <button class="kv-link" type="button" data-kv-want>ספרו לנו שאתם מחפשים קבוצה אחרת</button></p><p class="kv-msg" data-kv-want-msg role="status"></p>';
  }

  function init() {
    var f = $('[data-kv-form]'); if (!f) return;
    var reg = $('[data-kv-add]');
    load().then(function () {
      chips($('[data-kv-int]'), META.interests, 'int'); chips($('[data-kv-tag]'), META.tags, 'tag');
      opts(f.region, META.regions, 'כל אזור'); opts(f.age, META.ages, 'לא משנה');
      if (reg) {
        chips($('[data-kv-aint]'), META.interests, 'aint'); chips($('[data-kv-atag]'), META.tags, 'atag'); chips($('[data-kv-aage]'), META.ages, 'aage');
        opts(reg.region, META.regions);
      }
      // דוגמה מלאה בכניסה הראשונה
      var ex = $('input[name="int"][value="ספורט והליכה"]', f); if (ex) ex.checked = true;
      f.region.value = 'ירושלים והסביבה';
      render(answers(f));
      $('[data-kv-res]').insertAdjacentHTML('afterbegin', '<p class="kv-demo">זו דוגמה: בחרנו "ספורט והליכה" ואזור ירושלים. שנו את הבחירות ולחצו שוב.</p>');
    }).catch(function () {
      $('[data-kv-res]').innerHTML = '<p class="kv-err">לא הצלחנו לטעון את רשימת הקבוצות. בדקו את החיבור לאינטרנט ונסו לרענן.</p>';
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = answers(f);
      if (!a.interests.length && !a.tags.length) { $('[data-kv-res]').innerHTML = '<p class="kv-err">בחרו לפחות תחום עניין אחד.</p>'; return; }
      render(a); used('match');
      $('[data-kv-res]').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.addEventListener('click', function (e) {
      var t = e.target, card = t.closest && t.closest('.kv-card');
      if (t.matches('[data-kv-link]') && card) {
        t.disabled = true;
        post('/link', { id: card.getAttribute('data-id') }).then(function (j) {
          var m = $('.kv-msg', card);
          if (j.link) {
            t.outerHTML = '<a class="btn btn-gold" href="' + esc(j.link) + '" target="_blank" rel="noopener nofollow">להצטרף בווטסאפ</a>';
            m.textContent = 'לפני שנכנסים: קראו את כללי הבטיחות למטה. אם משהו לא בסדר בקבוצה – יוצאים ומדווחים.';
            used('link');
          } else { m.textContent = j.error || 'משהו השתבש. נסו שוב.'; t.disabled = false; }
        }).catch(function () { $('.kv-msg', card).textContent = 'אין חיבור. נסו שוב.'; t.disabled = false; });
      }
      if (t.matches('[data-kv-rep]') && card) {
        var why = window.prompt('מה לא בסדר בקבוצה? (לא חובה)') ;
        if (why === null) return;
        post('/report', { id: card.getAttribute('data-id'), why: why }).then(function () {
          $('.kv-msg', card).textContent = 'תודה. הדיווח התקבל. קבוצה שמדווחת פעמיים יורדת עד שנבדוק אותה.'; t.disabled = true; used('report');
        });
      }
      if (t.matches('[data-kv-want]')) {
        var a = answers(f), msg = $('[data-kv-want-msg]');
        if (!a.interests.length && !a.tags.length) { msg.textContent = 'בחרו קודם תחום עניין בשאלון.'; return; }
        t.disabled = true;
        post('/want', { interest: a.interests[0] || '', region: a.region, age: a.age, tag: a.tags[0] || '' }).then(function (j) {
          msg.textContent = j.error ? j.error : 'נרשם. תודה! ' + (j.n > 1 ? 'עוד ' + (j.n - 1) + ' אנשים ביקשו קבוצה כזאת.' : 'אתם הראשונים שביקשו קבוצה כזאת.');
          used('want');
        }).catch(function () { msg.textContent = 'אין חיבור. נסו שוב.'; t.disabled = false; });
      }
    });

    if (reg) reg.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = $('.res', reg);
      var data = { name: reg.gname.value, desc: reg.gdesc.value, link: reg.glink.value.trim(), region: reg.region.value,
        interests: vals(reg, 'aint'), ages: vals(reg, 'aage'), tags: vals(reg, 'atag'), ok18: reg.ok18.checked, hp: reg._honey.value };
      r.textContent = 'שולח...';
      post('/add', data).then(function (j) {
        if (j.error) { r.textContent = j.error; return; }
        reg.reset();
        r.innerHTML = '<b>הקבוצה נקלטה ומחכה לאישור.</b> אחרי בדיקה היא תופיע בהתאמות.<br>שמרו את קוד הניהול – בעזרתו אפשר להוריד את הקבוצה מתי שתרצו:<br><code dir="ltr">' + esc(j.id) + ' / ' + esc(j.key) + '</code>';
        used('add');
      }).catch(function () { r.textContent = 'אין חיבור. נסו שוב.'; });
    });

    var rm = $('[data-kv-rm]');
    if (rm) rm.addEventListener('submit', function (e) {
      e.preventDefault();
      var parts = rm.code.value.split('/').map(function (s) { return s.trim(); }), r = $('.res', rm);
      post('/remove', { id: parts[0], key: parts[1] }).then(function (j) { r.textContent = j.ok ? 'הקבוצה הוסרה.' : (j.error || 'לא הצלחנו.'); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}(typeof window !== 'undefined' ? window : globalThis));
