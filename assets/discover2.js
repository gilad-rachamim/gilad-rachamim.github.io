/* הצעד הבא + "חדש באתר": פס קטן אחרי שימוש ראשון בכלי, ובועה אחת למבקר חוזר. בלי שרת, הכול בדפדפן. */
(function () {
  var J = [{"id":"newborn","s":[["/kodesh/tofes-brit/","טופס פרטי הברית"],["/kodesh/kibudim-brit/","כיבודים בברית מילה"],["/kodesh/simcha/","הזמנות לכל שמחה"],["/kodesh/brachon/","ברכונים להדפסה עם הקדשה"]]},{"id":"vaada","s":[["/kelim/shikum/vaada/","הכנה לוועדה רפואית"],["/kelim/shikum/tik/","תיק מסמכים לפני פנייה או ועדה"],["/kelim/machshev/ichud-pdf/","איחוד קבצי PDF"],["/kelim/machshev/pdf/","כיווץ PDF"],["/kelim/machshev/chatima/","עריכת PDF וחתימה"],["/kelim/machshev/fax/","שליחת פקס בלי פקס"]]},{"id":"shabat","s":[["/bait/shabat/","תפריט לשבת ומתכנן אורחים"],["/kodesh/shabat/","צאת שבת וכניסת שבת השבוע"],["/bait/kniyot/","רשימת קניות שבועית"]]},{"id":"miluim","s":[["/kelim/miluim/tziyud/","רשימת ציוד למילואים"],["/kelim/miluim/bait/","דף לבית לפני מילואים"],["/kelim/miluim/yamim/","מחשבון מילואים"]]},{"id":"avoda","s":[["/kelim/avoda/korot/","קורות חיים בחינם"],["/kelim/avoda/misrot/","מעקב משרות"],["/kelim/avoda/reayon/","הכנה לראיון עבודה"]]},{"id":"kita","s":[["/limudim/kita/","כיתה וירטואלית למתמטיקה"],["/limudim/matematika/","תרגילים במתמטיקה"],["/limudim/kartisiot/","כרטיסיות זיכרון אונליין לחזרה חכמה"]]},{"id":"esek","s":[["/esek/ptiha/","פתיחת עוסק פטור ועסק קטן"],["/esek/qr/","יצירת קוד QR מעוצב"],["/esek/tafrit/","תפריט דיגיטלי ו-QR"],["/esek/tfutsa/","רשימת תפוצה בוואטסאפ ובמייל"],["/esek/mivtza/","מודעת מבצע"]]},{"id":"simcha","s":[["/kodesh/simcha/","הזמנות לכל שמחה"],["/bait/mevi/","מי מביא מה"],["/bait/matana/","מתנה קבוצתית"]]},{"id":"chanuka","s":[["/kodesh/chanuka/nerot/","סדר הדלקת נרות חנוכה"],["/kodesh/chanuka/bracha/","ברכות לחנוכה"],["/kodesh/chanuka/kniyot/","מחשבון קניות לחנוכה"],["/kodesh/chanuka/matkonim/","מתכון סופגניות ולביבות"],["/kodesh/chanuka/shirim/","שירי חנוכה לילדים"],["/kodesh/chanuka/sevivon/","סביבון דיגיטלי"]]},{"id":"briut","s":[["/kelim/briut/rofe/","הכנה לביקור אצל רופא"],["/kelim/briut/trufot/","רשימת תרופות וסימון יומי"],["/kelim/briut/tizkorot/","תזכורת לתרופות"],["/kelim/briut/madadim/","יומן מדדים"]]}], NEW = [["/kodesh/parasha/hakdasha/","לימוד תורה לעילוי נשמת"],["/kelim/shir/metronom/","מטרונום"],["/kelim/shir/kivun-gitara/","כיוון גיטרה"],["/kelim/kesharim/sidur/","סידור אנשי קשר"],["/kodesh/tefillin/afula/","זמן הנחת תפילין עפולה"],["/kodesh/mohalim/hodaot/","ברית מילה ברוסית"],["/kodesh/kivun-yerushalayim/","כיוון ירושלים אונליין"],["/kodesh/giur/shut/yom-hagiur/","טבילה במקווה לגיור וברית מילה"],["/kodesh/giur/shut/shavua-rishon/","אחרי הגיור"],["/kodesh/giur/shut/lekehila/","היחס לגר"],["/kodesh/giur/shut/chidon/","מבחן גיור"],["/kesef/zchuyot-pitorin/","מחשבון זכויות בפיטורין"]], SF = ["/kelim/chashiva/","/kelim/chashiva/avanim/","/kelim/chashiva/bingo/","/kelim/chashiva/bingo/yeladim/","/kelim/chashiva/blackjack/","/kelim/chashiva/chidon/","/kelim/chashiva/chidon/sheelot/","/kelim/chashiva/damka/","/kelim/chashiva/galgal-shemot/","/kelim/chashiva/galgal/","/kelim/chashiva/galgal/ken-o-lo/","/kelim/chashiva/galgal/sheelot/","/kelim/chashiva/gil-shlishi/","/kelim/chashiva/hagrala/","/kelim/chashiva/kita/","/kelim/chashiva/kita/beit-sefer/","/kelim/chashiva/klafim/","/kelim/chashiva/kubiya/","/kelim/chashiva/lishnayim/","/kelim/chashiva/luach/","/kelim/chashiva/matbea/","/kelim/chashiva/mila/","/kelim/chashiva/mokshim/","/kelim/chashiva/poker/","/kelim/chashiva/reviiot/","/kelim/chashiva/shachmat/","/kelim/chashiva/shachor/","/kelim/chashiva/shesh-besh/","/kelim/chashiva/snake/","/kelim/chashiva/solitaire/","/kelim/chashiva/sudoku/","/kelim/chashiva/sudoku/beinoni/","/kelim/chashiva/sudoku/kal/","/kelim/chashiva/sudoku/kashe/","/kelim/chashiva/sudoku/lehadpasa/","/kelim/chashiva/sudoku/pitaron/","/kelim/chashiva/sudoku/yeladim/","/kelim/chashiva/tashbetz/","/kelim/chashiva/tashchetz/","/kelim/chashiva/tifzoret/","/kelim/chashiva/tzviya-misparim/","/kelim/chashiva/yaniv/","/kelim/chashiva/yeladim/","/kodesh/azkara/","/kodesh/tahara/shiva-nekiyim/","/nefesh/","/nefesh/hayom/","/nefesh/koach/","/nefesh/michtav/","/nefesh/mishpacha/","/nefesh/rega/","/nefesh/tmicha/","/nefesh/yoman/"];
  var p = location.pathname, d = document, root = d.documentElement;
  if (!d.body || root.classList.contains('in-app') || p === '/kelim/' || p.split('/').length < 4 || SF.indexOf(p) > -1 ||
    /^\/(nefesh|go|k|s|horim|mohel)\/|azkara|avel|shiva|levaya|kadish|rega|tmicha|nefesh/.test(p)) return;
  function gt(n, o) { try { if (window.gtag) window.gtag('event', n, o); } catch (e) {} }
  function lg(k) { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch (e) { return []; } }
  function ls(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var done = false, typing = function () { var a = d.activeElement; return a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName); };
  function css() {
    if (d.getElementById('hk-nx-css')) return;
    var s = d.createElement('style'); s.id = 'hk-nx-css';
    s.textContent = '.hk-nx{position:fixed;inset-inline:.6rem;bottom:.6rem;z-index:40;max-width:34rem;margin-inline:auto;display:flex;align-items:center;gap:.5rem;padding:.4rem .5rem .4rem .8rem;border-radius:.8rem;background:#1b1b1b;color:#f3ead2;border:1px solid #d8b35f;box-shadow:0 6px 20px rgba(0,0,0,.35);font-size:.95rem;line-height:1.4;animation:hknx .25s ease-out}.hk-nx a{color:#f3d98c;font-weight:700}.hk-nx button{flex:none;min-width:44px;min-height:44px;margin-inline-start:auto;border:0;background:transparent;color:#f3ead2;font-size:1.3rem;cursor:pointer}.hk-nx button:focus-visible,.hk-nx a:focus-visible{outline:3px solid #f3d98c;outline-offset:2px}@keyframes hknx{from{transform:translateY(12px);opacity:0}}@media (prefers-reduced-motion:reduce){.hk-nx{animation:none}}@media print{.hk-nx{display:none}}';
    d.head.appendChild(s);
  }
  function show(html, src, to) {
    if (window.__hkSlot) return false; window.__hkSlot = 1;
    css();
    var b = d.createElement('div'); b.className = 'hk-nx'; b.setAttribute('role', 'region'); b.setAttribute('aria-label', 'הצעה לכלי הבא');
    b.innerHTML = '<span>' + html + '</span><button type="button" aria-label="סגירה">×</button>';
    var bar = d.getElementById('install-bar');
    if (bar && !bar.hidden && bar.offsetHeight) b.style.bottom = (bar.offsetHeight + 10) + 'px';
    b.querySelector('button').onclick = function () { b.remove(); };
    b.querySelector('a').addEventListener('click', function () { gt('discover_click', { src: src, to: to }); });
    d.body.appendChild(b); return true;
  }
  function nm(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function nextOf() {
    for (var i = 0; i < J.length; i++) { var k = J[i].s.map(function (x) { return x[0]; }).indexOf(p); if (k > -1 && J[i].s[k + 1]) return J[i].s[k + 1]; }
    var a = d.querySelector('.rel-v2 .rc a'); if (a && a.getAttribute('href') !== p) return [a.getAttribute('href'), a.textContent.trim()];
    return null;
  }
  // ד-4: המשכתם לאחרונה – רק דפים שבהם השתמשו בכלי (עד 8), נשמר בדפדפן בלבד
  function remember() { var r = lg('hk-recent').filter(function (x) { return x && x.u !== p; }); r.unshift({ u: p }); ls('hk-recent', r.slice(0, 8)); }
  function onUse() {
    if (done) return; done = true; remember();
    setTimeout(function () {
      if (typing()) return;
      var n = nextOf(); if (n) show('סיימתם? הצעד הבא: <a href="' + n[0] + '">' + nm(n[1]) + '</a>', 'next', n[0]);
    }, 1800);
  }
  var tu = window.toolUsed;
  window.toolUsed = function () { try { onUse(); } catch (e) {} return tu && tu.apply(this, arguments); };
  // ה-4: "חדש באתר" – מבקר חוזר, פעם אחת בביקור, אחרי 25 שניות או 60% גלילה
  var seen = lg('hk-seen-new'), vis = lg('hk-visit'), today = new Date().toISOString().slice(0, 10), returning = vis.length > 0 && vis.indexOf(today) < 0;
  if (vis.indexOf(today) < 0) { vis.push(today); ls('hk-visit', vis.slice(-30)); }
  var asked = false; try { asked = sessionStorage.getItem('hk-bub') === '1'; } catch (e) {}
  if (returning && !asked && NEW.length) {
    var pre = p.split('/').slice(0, 3).join('/'), cand = NEW.filter(function (x) { return seen.indexOf(x[0]) < 0 && x[0] !== p; });
    cand.sort(function (a, b) { return (b[0].indexOf(pre) === 0) - (a[0].indexOf(pre) === 0); });
    var c = cand[0];
    if (c) {
      var fired = false, go = function () {
        if (fired || window.__hkSlot || typing()) return; fired = true;
        if (show('✨ חדש באתר: <a href="' + c[0] + '">' + nm(c[1]) + '</a>', 'newbub', c[0])) {
          seen.push(c[0]); ls('hk-seen-new', seen.slice(-40)); try { sessionStorage.setItem('hk-bub', '1'); } catch (e) {}
        }
      };
      setTimeout(go, 25000);
      addEventListener('scroll', function () { var h = d.documentElement; if ((scrollY + innerHeight) / h.scrollHeight > 0.6) go(); }, { passive: true });
    }
  }
})();
