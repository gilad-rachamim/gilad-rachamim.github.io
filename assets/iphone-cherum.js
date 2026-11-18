/* Emergency-alerts checker: 4 questions, answers stay on the device, output = which settings to check.
   Menu names for iPhone come from support.apple.com/he-il (guide iph7c3d96bab). No promises: always follow the Home Front Command. */
(function () {
  var form = document.getElementById('ch-form'); if (!form) return;
  var out = document.getElementById('ch-out'), list = document.getElementById('ch-list'), head = document.getElementById('ch-head');
  var ans = {};
  [].forEach.call(form.querySelectorAll('.ip-chips'), function (g) {
    g.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'); if (!b) return;
      [].forEach.call(g.querySelectorAll('button'), function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      ans[g.getAttribute('data-q')] = b.getAttribute('data-v');
    });
  });
  function li(t, why) { return '<li><b>' + t + '</b>' + (why ? '<br><span class="ip-why">' + why + '</span>' : '') + '</li>'; }
  document.getElementById('ch-go').addEventListener('click', function () {
    var msg = document.getElementById('ch-msg');
    if (!ans.dev || !ans.app || !ans.quiet || !ans.what) { msg.textContent = 'נשארה שאלה בלי תשובה. עונים על ארבע השאלות ולוחצים שוב.'; return; }
    msg.textContent = '';
    var h = [], ip = ans.dev === 'ip';
    if (ip) {
      h.push(li('פותחים: הגדרות ← עדכונים, וגוללים עד למטה אל "התראות חירום"', 'מוודאים שההתראות שם דולקות. באייפון הן פועלות כברירת מחדל, אבל שווה לבדוק.'));
      if (ans.quiet !== 'no' || ans.what === 'silent')
        h.push(li('נכנסים ל"התראות חירום" ומפעילים "תמיד להשמיע צליל"', 'כך התראת חירום משמיעה צליל גם כשהאייפון במצב שקט.'));
      h.push(li('באותו מסך: מפעילים גם "מודעות מקומית" אם היא מופיעה', 'לפי אפל, באזורים מסוימים זה משפר את הדיוק של חלק מההתראות.'));
      if (ans.quiet !== 'no')
        h.push(li('בודקים את מצב "ריכוז" (נא לא להפריע, שינה)', 'בהגדרות ← ריכוז בוחרים את המצב שפועל בלילה, ובודקים אילו אפליקציות מורשות להתריע בו. מוסיפים את אפליקציית פיקוד העורף.'));
    } else {
      h.push(li('פותחים את ההגדרות ומחפשים בשורת החיפוש "התראות חירום"', 'השם והמיקום משתנים בין סמסונג, שיאומי, פיקסל ואחרים, ולכן החיפוש הוא הדרך הבטוחה. מוודאים שההתראות דולקות.'));
      if (ans.quiet !== 'no' || ans.what === 'silent')
        h.push(li('בודקים את "נא לא להפריע" ואת מצב השינה', 'מוודאים שאפליקציית פיקוד העורף מורשית להתריע גם במצב הזה, ושעוצמת ההתראות לא על אפס.'));
      h.push(li('בודקים שחיסכון בסוללה לא סוגר את האפליקציה', 'בהגדרות הסוללה של האפליקציה בוחרים שלא להגביל אותה ברקע.'));
    }
    if (ans.app === 'no')
      h.push(li('מתקינים את האפליקציה הרשמית של פיקוד העורף', 'מהאתר הרשמי oref.org.il, שם יש קישור לחנות הנכונה. לא מתקינים אפליקציות עם שם דומה ממקור אחר בלי לבדוק מי עומד מאחוריהן.'));
    else
      h.push(li('פותחים את אפליקציית פיקוד העורף ובודקים את אזורי ההתרעה', 'מוודאים שהאזור שלכם מוגדר, שההתראות של האפליקציה מאושרות בהגדרות הטלפון, ושהאפליקציה מעודכנת.'));
    if (ans.what === 'none' || ans.what === 'late')
      h.push(li('בודקים קליטה ואינטרנט במקום שבו ישנים', 'התראה באפליקציה צריכה חיבור. במקום עם קליטה חלשה כדאי שיהיה גם Wi-Fi, ושיהיה ערוץ נוסף: רדיו, טלוויזיה או הצופר בחוץ.'));
    h.push(li('לא סומכים על ערוץ אחד', 'הטלפון הוא עוד ערוץ, לא התחליף לצופר. נשמעים תמיד להנחיות פיקוד העורף.'));
    head.textContent = ip ? 'מה לבדוק עכשיו באייפון, לפי הסדר' : 'מה לבדוק עכשיו באנדרואיד, לפי הסדר';
    list.innerHTML = h.join('');
    out.hidden = false;
    try { out.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {}
    if (window.toolUsed) window.toolUsed('iphone_hatraot_cherum', { dev: ans.dev, what: ans.what });
  });
})();
