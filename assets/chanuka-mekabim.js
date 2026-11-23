/* חידון קטן על ספר המקבים א': משוב מיידי, בלי הרשמה */
(function () {
  var Q = [
    ['מי היה הכוהן שהתחיל את המרד במודיעין?', ['מתתיהו', 'יהודה', 'שמעון'], 0],
    ['מי נקרא "המכבי" ופיקד על הצבא אחרי מתתיהו?', ['יונתן', 'יהודה', 'אלעזר'], 1],
    ['באיזה תאריך עברי חנכו את המזבח מחדש?', ['כ"ה בכסלו', 'ט"ו בשבט', 'י"ד באדר'], 0],
    ['כמה ימים נמשכה חנוכת המזבח לפי הספר?', ['שבעה ימים', 'שמונה ימים', 'עשרה ימים'], 1],
    ['עם איזו מעצמה כרת יהודה ברית בפרק ח?', ['מצרים', 'רומא', 'בבל'], 1],
    ['מי נהרג בקרב מתחת לפיל בבית זכריה?', ['אלעזר אחי יהודה', 'מתתיהו', 'שמעון'], 0],
    ['מי הפך לכוהן גדול ושליט אחרי יונתן והשיג חירות מהמס?', ['שמעון', 'יוחנן', 'יהונתן'], 0],
    ['האם ספר המקבים א נמצא בתנ"ך?', ['כן, בנביאים', 'לא, הוא ספר חיצוני', 'כן, בכתובים'], 1]
  ];
  var box = document.getElementById('mk-quiz'); if (!box) return;
  var score = 0, i = 0, done = false;
  function show() {
    if (i >= Q.length) {
      box.innerHTML = '<p class="cg-st"><b>סיימתם: ' + score + ' מתוך ' + Q.length + '.</b> ' + (score >= 6 ? 'כל הכבוד, אתם מכירים את הסיפור!' : 'אפשר לקרוא שוב את הפרקים למעלה ולנסות פעם נוספת.') + '</p><button type="button" class="btn btn-gold" id="mk-again">עוד פעם</button>';
      document.getElementById('mk-again').onclick = function () { i = 0; score = 0; show(); };
      if (!done && window.toolUsed) { try { window.toolUsed('chanuka_mekabim', { score: score }); } catch (e) {} }
      done = true; return;
    }
    var q = Q[i];
    box.innerHTML = '<p class="cg-st">שאלה ' + (i + 1) + ' מתוך ' + Q.length + '</p><p><b>' + q[0] + '</b></p><div class="cg-bar" id="mk-opts"></div><p class="cg-st" id="mk-fb" aria-live="polite"></p>';
    var o = document.getElementById('mk-opts');
    q[1].forEach(function (t, k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-line'; b.textContent = t;
      b.onclick = function () {
        if (o.getAttribute('data-d')) return; o.setAttribute('data-d', 1);
        var ok = k === q[2]; if (ok) score++;
        document.getElementById('mk-fb').innerHTML = (ok ? 'נכון! ' : 'כמעט. התשובה: ' + q[1][q[2]] + '. ') + '<button type="button" class="btn btn-gold" id="mk-next">הבא</button>';
        document.getElementById('mk-next').onclick = function () { i++; show(); };
      };
      o.appendChild(b);
    });
  }
  show();
})();
