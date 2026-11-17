/* שמות לתינוק: לבנים ולבנות, עם משמעות – הכלים של גילעד רחמים */
(function () {
  var app = document.getElementById('sh'); if (!app) return;
  // שם|משמעות|מקור: ת = תנ"ך, מ = מסורת וחז"ל, ח = עברית חדשה
  var B = "אברהם|אב המון גויים|ת;יצחק|מלשון צחוק ושמחה|ת;יעקב|מלשון עקב, אחז בעקב אחיו|ת;יוסף|ה' יוסיף|ת;משה|משוי מן המים|ת;אהרן|הכהן הגדול, אחי משה|ת;דוד|אהוב, ידיד|ת;שלמה|מלשון שלום ושלמות|ת;אליהו|אלי הוא ה'|ת;שמואל|שמו אל, \"מה' שאלתיו\"|ת;נתן|נתינה, מתנה|ת;נתנאל|אל נתן, מתנת אלוהים|ת;יהונתן|ה' נתן|ת;יונתן|ה' נתן|ת;אריאל|אריה של אל, כינוי לירושלים|ת;אורי|האור שלי|ת;אור|אור|ח;איתי|ה' איתי|ת;איתן|חזק ויציב|ת;אלון|עץ חזק|ת;אביב|עונת ההתחדשות|ח;עומר|אלומת שיבולים|ת;עידו|נביא בתנ\"ך, מלשון עדות|ת;עמית|חבר, רע|ח;נועם|נעימות ויופי|ת;יואב|ה' אב|ת;יהודה|הודאה לה'|ת;בנימין|בן הימין, בן אהוב|ת;ראובן|ראו בן|ת;שמעון|ה' שמע|ת;לוי|נלווה, מתחבר|ת;דן|דין, משפט|ת;נפתלי|מאבק והתמודדות|ת;גד|מזל טוב|ת;אשר|אושר ושמחה|ת;יששכר|יש שכר|ת;זבולון|מלשון זבול, מעון של כבוד|ת;אפרים|פרי ופוריות|ת;מנשה|שכחת הצער|ת;יהושע|ה' מושיע|ת;כלב|כל לב|ת;גדעון|גיבור, לוחם|ת;שמשון|מלשון שמש|ת;שאול|שביקשו אותו|ת;אלישע|אלי ישועה|ת;ישעיהו|ישועת ה'|ת;ירמיהו|ה' ירומם|ת;יחזקאל|אל יחזק|ת;דניאל|אל הוא דייני|ת;עזרא|עזרה|ת;נחמיה|נחמת ה'|ת;מרדכי|גיבור מגילת אסתר|ת;עובדיה|עובד ה'|ת;יונה|יונה, ציפור השלום|ת;מיכאל|מי כאל|ת;גבריאל|גבורת אל|ת;רפאל|אל ירפא|ת;אוריאל|אור אל|ת;עזריאל|עזרת אל|ת;אליאב|אבי הוא אל|ת;אלעד|אל לעד|ת;אליעזר|אלי עזר|ת;אלחנן|אל חנן|ת;חנן|חסד וחנינה|ת;מתן|מתנה|ת;ישי|מתנה, יש|ת;ידידיה|ידיד ה'|ת;יאיר|יפיץ אור|ת;מאיר|מפיץ אור|מ;הלל|שבח|מ;עקיבא|מלשון עקב|מ;נחמן|נחמה|מ;מנחם|מביא נחמה|מ;שלום|שלום|מ;חיים|חיים|מ;ברוך|מבורך|ת;טוביה|טוב ה'|ת;צבי|יופי והדר|מ;אריה|גבורה|מ;זאב|זאב, אומץ|מ;דביר|החלק הפנימי בבית המקדש|ת;הראל|הר אל|ת;נריה|נר ה'|ת;אלרועי|ה' רועה אותי|ח;ינון|שמו של המשיח|ת;אופק|קו האופק|ח;רועי|הרועה שלי|ח;ליאור|אור לי|ח;עדי|תכשיט|ת;גיא|עמק|ח;טל|טל הבוקר|ח;יובל|נחל, שנת היובל|ת;נדב|נדיב|ת;אביתר|אבי יתר, שפע|ת;שילה|מקום המשכן|ת;עמרי|מלך בישראל|ת;אסף|משורר בתהלים|ת;יגאל|יושיע|ת;ניר|שדה חרוש|ת;רון|שירה ורינה|ח;שחר|תחילת היום|ח;תומר|עץ תמר|ח;עוז|עוצמה|ח;נחום|נחמה|ת;חגי|חגיגה|ת;זכריה|ה' זכר|ת;יחיאל|יחי אל|ת;אלקנה|אל קנה|ת;מלאכי|שליחי|ת;אוריה|אורי ה'|ת;ישראל|שרית עם אל|ת;פנחס|כהן קנאי לה'|ת;אביחי|אבי חי|ת;בועז|בו עוז|ת;יוחנן|ה' חנן|ת;אלישיב|אל ישיב|ת;יהושפט|ה' שפט|ת;עמנואל|עמנו אל|ת;שגיא|גדול, נשגב|ח;נבו|הר נבו|ת;אלנתן|אל נתן|ת;אחיה|אחי ה'|ת;ברק|ברק, אור|ת;יהלי|אור, זוהר|ח;אליאור|אלי אור|ח;שמעיה|ה' שמע|ת";
  var G = "שרה|שרה, נסיכה|ת;רבקה|אמנו, אשת יצחק|ת;רחל|כבשה, תום|ת;לאה|אמנו, אשת יעקב|ת;מרים|הנביאה, אחות משה|ת;דבורה|הנביאה והשופטת|ת;אסתר|מלכה במגילת אסתר, בפרסית כוכב|ת;רות|רעות וחברות|ת;נעמי|נעימה|ת;חנה|חן וחסד|ת;אביגיל|שמחת אבי|ת;יעל|יעלה, גיבורה בשירת דבורה|ת;מיכל|מי כאל|ת;תמר|עץ תמר|ת;אלישבע|אלי שבועה|ת;בתיה|בת ה'|ת;ציפורה|ציפור|ת;יוכבד|ה' כבוד|ת;שירה|שיר|ח;נועה|מבנות צלפחד, תנועה|ת;אורה|אור|ת;אוריה|אור ה'|ח;מאיה|מים, מעיין|ח;טליה|טל ה'|ח;הדס|צמח ריחני, שמה העברי של אסתר|ת;הדר|יופי והדר|ח;הילה|הילת אור|ח;יהודית|גיבורה בימי החשמונאים|מ;אילה|אילה, צבייה|ח;איילת|איילת השחר|ת;נוגה|זוהר|ח;שקד|הפריחה הראשונה|ח;מעיין|מקור מים|ח;עדי|תכשיט|ת;עדן|גן עדן, עדנה|ת;ליה|לי ה'|ח;ליאת|את שלי|ח;אביה|אבי ה'|ת;אפרת|פוריות|ת;אלה|עץ האלה|ת;אסנת|אשת יוסף|ת;גאולה|גאולה|ח;שלומית|שלום|ת;שושנה|פרח השושן|ת;ורד|פרח הוורד|ח;שני|צבע אדום יקר|ת;רננה|רינה ושמחה|ח;רינה|שמחה ושירה|ח;רוני|השמחה שלי|ח;טובה|טובה|מ;חיה|חיים|מ;פנינה|פנינה|ת;מלכה|מלכה|מ;נחמה|נחמה|מ;בת שבע|בת השבועה|ת;אביטל|אבי טל|ת;נעמה|נעימה|ת;עטרה|כתר|ת;יפה|יופי|מ;דינה|דין, משפט|ת;הודיה|הודיה לה'|ח;נוי|יופי|ח;אגם|מים שקטים|ח;יערה|יערת דבש|ח;נטע|שתיל|ת;אלומה|אלומת שיבולים|ח;מוריה|הר המוריה|ת;ירדן|הנהר|ח;גפן|גפן|ח;תהילה|שבח|ת;תפארת|יופי וכבוד|ת;אמונה|אמונה|ח;יסכה|כינוי לשרה אמנו|ת;אורית|אור|ח;חגית|חגיגה|ת;גילה|שמחה|ח;נאוה|יפה|ת;רעות|חברות|ח;שלהבת|להבה|ת;זהבה|זהב|ח;אושרת|אושר|ח;טל|טל הבוקר|ח;שחר|תחילת היום|ח;אור|אור|ח;ליבי|הלב שלי|ח;אדר|חודש השמחה, אדיר|ח;אביגיל|שמחת אבי|ת;אסתר|כוכב|ת;צופיה|צופה, מתבוננת|ח;רוחמה|מרוחמת, אהובה|ת;שילת|שאלתיה מה'|ח;נגה|זוהר|ח;בשמת|ריח טוב|ת;חמוטל|אם המלך יהואחז|ת;ענבל|הלשון של הפעמון|ח;ענבר|אבן חן|ח;הלל|שבח|ח";
  function parse(s) {
    var seen = {}, out = [];
    s.split(';').forEach(function (x) { var p = x.split('|'); if (!p[0] || seen[p[0]]) return; seen[p[0]] = 1; out.push({ n: p[0], m: p[1], s: p[2] }); });
    return out.sort(function (a, b) { return a.n.localeCompare(b.n, 'he'); });
  }
  var sex = app.dataset.sex === 'g' ? 'g' : 'b', all = parse(sex === 'g' ? G : B), SRC = { 'ת': 'מהתנ"ך', 'מ': 'מהמסורת', 'ח': 'עברית חדשה' };
  var q = document.getElementById('sh-q'), list = document.getElementById('sh-list'), cnt = document.getElementById('sh-count'),
      favEl = document.getElementById('sh-fav'), favBox = document.getElementById('sh-favbox'), letters = document.getElementById('sh-letters');
  var flt = { letter: '', src: '', short: false }, KEY = 'shemot-fav-' + sex, fav = [], firstUse = true;
  try { fav = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) {}
  function used(how) { if (!firstUse && how === 'search') return; firstUse = false; try { window.toolUsed && window.toolUsed('shemot_' + (sex === 'g' ? 'banot' : 'banim'), { how: how }); } catch (e) {} }
  var L = 'אבגדהוזחטיכלמנסעפצקרשת'.split('');
  letters.innerHTML = '<button type="button" data-l="" aria-pressed="true">הכול</button>' + L.filter(function (l) { return all.some(function (x) { return x.n[0] === l; }); })
    .map(function (l) { return '<button type="button" data-l="' + l + '" aria-pressed="false">' + l + '</button>'; }).join('');
  function norm(s) { return s.replace(/[ךםןףץ]/g, function (c) { return 'כמנפצ'['ךםןףץ'.indexOf(c)]; }); }
  function render() {
    var t = norm(q.value.trim()), r = all.filter(function (x) {
      if (flt.letter && x.n[0] !== flt.letter) return false;
      if (flt.src && x.s !== flt.src) return false;
      if (flt.short && x.n.replace(/ /g, '').length > 3) return false;
      return !t || norm(x.n).indexOf(t) >= 0 || norm(x.m).indexOf(t) >= 0;
    });
    cnt.textContent = r.length + ' שמות';
    list.innerHTML = r.map(function (x) {
      var on = fav.indexOf(x.n) >= 0;
      return '<li><button type="button" class="sh-star" data-f="' + x.n + '" aria-pressed="' + on + '" aria-label="' + (on ? 'להוריד מהמועדפים' : 'להוסיף למועדפים') + ': ' + x.n + '">' + (on ? '★' : '☆') + '</button>' +
        '<b>' + x.n + '</b><span>' + x.m + '</span><small>' + SRC[x.s] + '</small></li>';
    }).join('') || '<li class="sh-none">לא נמצאו שמות. נסו אות אחרת או מילה אחרת.</li>';
  }
  function renderFav() {
    favBox.hidden = !fav.length;
    favEl.innerHTML = fav.map(function (n) { return '<button type="button" data-f="' + n + '" aria-label="להוריד: ' + n + '">' + n + ' ✕</button>'; }).join('');
    var a = document.getElementById('sh-wa');
    a.href = 'https://wa.me/?text=' + encodeURIComponent('השמות שאהבנו ' + (sex === 'g' ? 'לבת' : 'לבן') + ': ' + fav.join(', ') + '\nבחרנו כאן: ' + location.origin + location.pathname);
  }
  function toggle(n) {
    var i = fav.indexOf(n); if (i >= 0) fav.splice(i, 1); else { fav.push(n); used('fav'); }
    try { localStorage.setItem(KEY, JSON.stringify(fav)); } catch (e) {}
    render(); renderFav();
  }
  app.addEventListener('click', function (e) {
    var f = e.target.closest('[data-f]'); if (f) return toggle(f.dataset.f);
    var l = e.target.closest('[data-l]');
    if (l) { flt.letter = l.dataset.l; letters.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b === l); }); used('letter'); return render(); }
    var s = e.target.closest('[data-src]');
    if (s) { var v = s.dataset.src; app.querySelectorAll('[data-src]').forEach(function (b) { b.setAttribute('aria-pressed', b === s); });
      flt.short = v === 'short'; flt.src = v === 'short' ? '' : v; used('filter'); return render(); }
  });
  document.getElementById('sh-rand').addEventListener('click', function () {
    var x = all[Math.floor(Math.random() * all.length)], o = document.getElementById('sh-pick');
    o.hidden = false; o.innerHTML = '<p class="big">' + x.n + '</p><p>' + x.m + ' · ' + SRC[x.s] + '</p><button type="button" class="btn btn-line btn-sm" data-f="' + x.n + '">☆ להוסיף למועדפים</button>';
    used('random');
  });
  q.addEventListener('input', function () { used('search'); render(); });
  render(); renderFav();
})();
