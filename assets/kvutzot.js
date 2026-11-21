/* מוצאים קבוצה – שאלון התאמה לקבוצות ווטסאפ. הרעיון באדיבות אהרן גרינברג.
   ההתאמה מחושבת כאן בדפדפן: התשובות לשאלון לא נשלחות לשום שרת. לשרת נשלחת רק בקשה לקישור של קבוצה אחת. */
(function (root) {
  'use strict';
  var API = 'https://kelim-kvutzot.gilad4049.workers.dev';
  var OPPOSITE = { 'נשים בלבד': 'גברים בלבד', 'גברים בלבד': 'נשים בלבד' };
  var KINDS = ['שקטה – רק הודעות חשובות', 'שיחה רגועה', 'שיחה ערה'];
  var SAVE_KEY = 'kv-saved-v1', NEW_DAYS = 21;
  function isNew(g, now) { return !!g.since && ((now || Date.now()) - Date.parse(g.since)) / 864e5 <= NEW_DAYS; }
  /* חיפוש שמור: קבוצות מתאימות שעוד לא הוצגו בטלפון הזה */
  function fresh(saved, groups) {
    if (!saved || !saved.a) return [];
    var seen = saved.seen || [];
    return top(saved.a, groups, 50).filter(function (x) { return seen.indexOf(x.g.id) < 0; });
  }

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
    if (a.kind && g.kind) {   // סגנון: שקטה / רגועה / ערה. מי שמבקש שקט לא מקבל קבוצה ערה למעלה
      var K = KINDS.indexOf(a.kind), G2 = KINDS.indexOf(g.kind);
      if (K >= 0 && G2 >= 0) { if (K === G2) { s += 12; why.push('בסגנון שביקשתם: ' + g.kind); } else s -= 8 * Math.abs(K - G2); }
    }
    return { score: Math.max(1, s), why: why };
  }
  function top(a, groups, n) {
    return groups.map(function (g) { var r = score(a, g); return { g: g, score: r.score, why: r.why }; })
      .filter(function (x) { return x.score > 0; })
      .sort(function (x, y) { return y.score - x.score || (x.g.name < y.g.name ? -1 : 1); })
      .slice(0, n || 3);
  }
  root.KvutzotMatch = { score: score, top: top, fresh: fresh, isNew: isNew, KINDS: KINDS };
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

  function answers(f) { return { interests: vals(f, 'int'), tags: vals(f, 'tag'), region: f.region.value, age: f.age.value, kind: f.kind ? f.kind.value : '' }; }
  function lsGet() { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
  function lsSet(v) { try { if (v) localStorage.setItem(SAVE_KEY, JSON.stringify(v)); else localStorage.removeItem(SAVE_KEY); return true; } catch (e) { return false; } }
  function ids(a) { return top(a, GROUPS, 50).map(function (x) { return x.g.id; }); }
  function setForm(f, a) {
    $$('input[name="int"],input[name="tag"]', f).forEach(function (x) { x.checked = (a[x.name === 'int' ? 'interests' : 'tags'] || []).indexOf(x.value) >= 0; });
    f.region.value = a.region || ''; f.age.value = a.age || ''; if (f.kind) f.kind.value = a.kind || '';
  }
  var PAGE_URL = 'https://hakelim.com/kelim/kehila/kvutzot-whatsapp/';
  function card(x, note) {
    var g = x.g;
    var share = 'מצאתי קבוצת ווטסאפ שאולי תתאים לך: "' + g.name + '"\n' + PAGE_URL + '#g=' + g.id;
    return '<article class="kv-card" data-id="' + esc(g.id) + '">' + (note ? '<p class="kv-note">' + esc(note) + '</p>' : '') +
      '<h3>' + esc(g.name) + (isNew(g) ? ' <span class="kv-new">חדשה</span>' : '') + '</h3><p class="kv-desc">' + esc(g.desc) + '</p>' +
      (g.kind ? '<p class="kv-kind">סגנון: ' + esc(g.kind) + '</p>' : '') +
      (x.why && x.why.length ? '<p class="kv-why"><b>למה זה מתאים:</b> ' + esc(x.why.join(' · ')) + '</p>' : '') +
      '<div class="kv-act"><button class="btn btn-gold" type="button" data-kv-link>לקבל קישור להצטרפות</button>' +
      '<a class="kv-share" href="https://wa.me/?text=' + encodeURIComponent(share) + '" target="_blank" rel="noopener" data-kv-share>לשלוח לחבר</a>' +
      '<button class="kv-rep" type="button" data-kv-rep>לדווח על הקבוצה</button></div><p class="kv-msg" role="status"></p></article>';
  }
  function speakable() { return 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'; }
  var SPEAK_LBL = '🔊 להקריא לי את התוצאות';
  function readAloud(btn) {
    var ss = window.speechSynthesis;
    if (ss.speaking) { ss.cancel(); btn.textContent = SPEAK_LBL; return; }
    var txt = $$('[data-kv-res] .kv-count, [data-kv-res] .kv-card h3, [data-kv-res] .kv-desc, [data-kv-res] .kv-why').map(function (el) { return el.textContent; }).join('. ');
    var u = new SpeechSynthesisUtterance(txt); u.lang = 'he-IL'; u.rate = 0.9;
    var he = ss.getVoices().filter(function (v) { return /^(he|iw)/i.test(v.lang); })[0]; if (he) u.voice = he;
    u.onend = function () { btn.textContent = SPEAK_LBL; };
    ss.speak(u); btn.textContent = '⏹ לעצור את ההקראה'; used('speak');
  }

  function render(a) {
    var out = $('[data-kv-res]'), list = top(a, GROUPS, 3);
    if (!list.length) {
      out.innerHTML = '<div class="kv-empty"><p><b>עדיין אין קבוצה שמתאימה בדיוק.</b> המאגר רק התחיל, וכל קבוצה נבדקת לפני שהיא עולה.</p>' +
        '<p>אפשר לספר שאתם מחפשים קבוצה כזאת. בלי שם ובלי טלפון – רק סופרים כמה אנשים רוצים. כשמספיק אנשים מבקשים, נחפש או נפתח קבוצה.</p>' +
        '<button class="btn btn-gold" type="button" data-kv-want>אני רוצה קבוצה כזאת</button><p class="kv-msg" data-kv-want-msg role="status"></p></div>';
      return;
    }
    out.innerHTML = '<p class="kv-count">' + (list.length === 1 ? 'מצאנו קבוצה אחת שמתאימה:' : (list.length === 2 ? 'שתי' : 'שלוש') + ' הקבוצות שהכי מתאימות לכם:') + '</p>' +
      (speakable() ? '<p class="kv-tts"><button class="kv-link" type="button" data-kv-speak>' + SPEAK_LBL + '</button></p>' : '') +
      list.map(function (x) { return card(x); }).join('') +
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
      if (f.kind) opts(f.kind, META.kinds || KINDS, 'לא משנה');
      if (reg && reg.kind) opts(reg.kind, META.kinds || KINDS, 'לא ידוע');
      var out = $('[data-kv-res]'), hm = /[#&]g=([a-z0-9]{4,20})/.exec(location.hash), saved = lsGet();
      var shared = hm && GROUPS.filter(function (g) { return g.id === hm[1]; })[0];
      if (shared) {   // חבר שלח קבוצה
        out.innerHTML = card({ g: shared, why: [] }, 'חבר שלח לכם את הקבוצה הזאת. רוצים לראות עוד קבוצות? ענו על השאלון.');
        used('shared_open');
        setTimeout(function () { out.scrollIntoView({ block: 'start' }); }, 50);
      } else if (hm) {
        out.innerHTML = '<p class="kv-err">הקבוצה ששלחו לכם כבר לא במאגר. אפשר לחפש קבוצה אחרת בשאלון.</p>';
      } else if (saved && saved.a) {   // חיפוש שמור בטלפון הזה
        setForm(f, saved.a); if (f.save) f.save.checked = true;
        var nw = fresh(saved, GROUPS);
        render(saved.a);
        var forget = ' <button class="kv-link" type="button" data-kv-forget>למחוק את החיפוש השמור</button>';
        out.insertAdjacentHTML('afterbegin', nw.length
          ? '<p class="kv-saved-msg"><b>🔔 ' + (nw.length === 1 ? 'נוספה קבוצה חדשה שמתאימה' : 'נוספו ' + nw.length + ' קבוצות חדשות שמתאימות') + ' לחיפוש ששמרתם.</b>' + forget + '</p>'
          : '<p class="kv-demo">אלה התוצאות לחיפוש ששמרתם בטלפון הזה. אין קבוצות חדשות מאז הביקור הקודם.' + forget + '</p>');
        saved.seen = ids(saved.a); lsSet(saved);
        if (nw.length) used('saved_new');
      } else {
        // דוגמה מלאה בכניסה הראשונה
        var ex = $('input[name="int"][value="ספורט והליכה"]', f); if (ex) ex.checked = true;
        f.region.value = 'ירושלים והסביבה';
        render(answers(f));
        out.insertAdjacentHTML('afterbegin', '<p class="kv-demo">זו דוגמה: בחרנו "ספורט והליכה" ואזור ירושלים. שנו את הבחירות ולחצו שוב.</p>');
      }
    }).catch(function () {
      $('[data-kv-res]').innerHTML = '<p class="kv-err">לא הצלחנו לטעון את רשימת הקבוצות. בדקו את החיבור לאינטרנט ונסו לרענן.</p>';
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var a = answers(f);
      if (!a.interests.length && !a.tags.length) { $('[data-kv-res]').innerHTML = '<p class="kv-err">בחרו לפחות תחום עניין אחד.</p>'; return; }
      render(a); used('match');
      if (f.save) {
        if (f.save.checked) { if (lsSet({ a: a, seen: ids(a), at: Date.now() })) used('save'); }
        else lsSet(null);
      }
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
            m.innerHTML = 'לפני שנכנסים: קראו את כללי הבטיחות למטה. אם משהו לא בסדר בקבוצה – יוצאים ומדווחים.' +
              ' <button class="kv-link" type="button" data-kv-broken>הקישור לא עובד?</button>';
            used('link');
          } else { m.textContent = j.error || 'משהו השתבש. נסו שוב.'; t.disabled = false; }
        }).catch(function () { $('.kv-msg', card).textContent = 'אין חיבור. נסו שוב.'; t.disabled = false; });
      }
      if (t.matches('[data-kv-broken]') && card) {
        t.disabled = true;
        post('/broken', { id: card.getAttribute('data-id') }).then(function () {
          t.outerHTML = '<span class="kv-ok">תודה. נבקש מהמנהל קישור חדש. בינתיים אפשר לנסות קבוצה אחרת.</span>'; used('broken');
        }).catch(function () { t.disabled = false; });
      }
      if (t.matches('[data-kv-speak]')) readAloud(t);
      if (t.matches('[data-kv-share]')) used('share');
      if (t.matches('[data-kv-forget]')) { lsSet(null); if (f.save) f.save.checked = false; t.parentNode.textContent = 'החיפוש השמור נמחק מהטלפון.'; }
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
        var wl = a.interests.length ? a.interests.slice(0, 3) : [''];
        Promise.all(wl.map(function (it) { return post('/want', { interest: it, region: a.region, age: a.age, tag: a.tags[0] || '' }); })).then(function (all) {
          var j = all.filter(function (x) { return x.n; }).sort(function (x, y) { return y.n - x.n; })[0] || all[0];
          msg.textContent = j.error ? j.error : 'נרשם. תודה! ' + (j.n > 1 ? 'עוד ' + (j.n - 1) + ' אנשים ביקשו קבוצה כזאת.' : 'אתם הראשונים שביקשו קבוצה כזאת.');
          used('want');
        }).catch(function () { msg.textContent = 'אין חיבור. נסו שוב.'; t.disabled = false; });
      }
    });

    if (reg) reg.addEventListener('submit', function (e) {
      e.preventDefault();
      var r = $('.res', reg);
      var data = { name: reg.gname.value, desc: reg.gdesc.value, link: reg.glink.value.trim(), region: reg.region.value,
        interests: vals(reg, 'aint'), ages: vals(reg, 'aage'), tags: vals(reg, 'atag'), kind: reg.kind ? reg.kind.value : '', ok18: reg.ok18.checked, hp: reg._honey.value };
      r.textContent = 'שולח...';
      post('/add', data).then(function (j) {
        if (j.error) { r.textContent = j.error; return; }
        reg.reset();
        r.innerHTML = '<b>הקבוצה נקלטה ומחכה לאישור.</b> אחרי בדיקה היא תופיע בהתאמות.<br>שמרו את קוד הניהול – בעזרתו אפשר להוריד את הקבוצה מתי שתרצו:<br><code class="kv-code" dir="ltr">' + esc(j.id) + ' / ' + esc(j.key) + '</code>';
        used('add');
      }).catch(function () { r.textContent = 'אין חיבור. נסו שוב.'; });
    });

    var rl = $('[data-kv-relink]');
    if (rl) rl.addEventListener('submit', function (e) {
      e.preventDefault();
      var parts = rl.code.value.split('/').map(function (s) { return s.trim(); }), r = $('.res', rl);
      r.textContent = 'שולח...';
      post('/relink', { id: parts[0], key: parts[1], link: rl.nlink.value.trim() }).then(function (j) {
        r.textContent = j.ok ? (j.st === 'live' ? 'הקישור הוחלף, והקבוצה מופיעה שוב בהתאמות.' : 'הקישור הוחלף.') : (j.error || 'לא הצלחנו.');
        if (j.ok) used('relink');
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
