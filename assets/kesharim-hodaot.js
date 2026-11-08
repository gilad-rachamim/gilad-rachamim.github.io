// הודעות מוכנות: מצבים × נוסחים, עם מילוי שם ({n}). שליחה בווטסאפ או העתקה. הבחירה האחרונה נשמרת בטלפון.
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var box = $('hd-msgs');
  if (!box) return;
  var KEY = 'kelim-hodaot';
  var M = [
    ['late', 'מאחר', [
      'היי{,n}, אני מתעכב קצת, מגיע בעוד כרבע שעה. סליחה על ההמתנה 🙏',
      '{n}, רק מעדכן שאני באיחור של כמה דקות. כבר בדרך!',
      'שלום{ ,n}, נתקעתי ואאחר בערך בחצי שעה. אם זה לא מסתדר לך, נקבע לזמן אחר. מצטער על זה.']],
    ['cancel', 'מבטל או דוחה', [
      'היי{,n}, אני ממש מצטער, אבל לא אוכל להגיע היום. אפשר לקבוע ליום אחר השבוע?',
      '{n}, נאלצתי לבטל את מה שקבענו, ולא נעים לי. מתי נוח לך שנקבע מחדש?',
      'שלום{ ,n}, צץ לי משהו שאי אפשר לדחות. סליחה על ההודעה המאוחרת. אשמח לקבוע מחדש בזמן שנוח לך.']],
    ['yes', 'מאשר הגעה', [
      'היי{,n}, נשמח מאוד להגיע! תודה על ההזמנה 😊',
      '{n}, מאשרים הגעה, נהיה שם בעזרת ה׳. מחכים!',
      'תודה רבה על ההזמנה{,n}. לצערנו לא נוכל להגיע, אבל אנחנו איתכם בשמחה ושולחים ברכה חמה.']],
    ['thanks', 'תודה', [
      'היי{,n}, רציתי להגיד תודה מכל הלב. זה ממש עזר לי ❤',
      '{n}, תודה רבה! לא מובן מאליו בכלל. אם תצטרך משהו, אני כאן.',
      'תודה{ ,n} על הערב המקסים. היה כיף גדול, נתראה בשמחות 🙂']],
    ['shalom', 'מה שלומך?', [
      'היי{,n}, עבר הרבה זמן! חשבתי עליך היום ורציתי לשאול מה שלומך 🙂',
      '{n}, מה נשמע? מתגעגע. בא לך שנדבר השבוע או ניפגש לקפה?',
      'שלום{ ,n}, רק רציתי להגיד שאני חושב עליך. מקווה שהכול טוב אצלך.']],
    ['refua', 'רפואה שלמה', [
      'היי{,n}, שמעתי שאתה לא מרגיש טוב. מאחל לך רפואה שלמה ומהירה 🙏 צריך משהו?',
      '{n}, חושבים עליך ומתפללים לרפואתך. אם אפשר לעזור בכלום – קניות, הסעה, ילדים – רק תגיד.',
      'רפואה שלמה{ ,n}! שתחזור לאיתנך במהרה. אני כאן לכל דבר.']],
    ['nichum', 'ניחומים', [
      '{n}, משתתף בצערך מכל הלב. המקום ינחם אתכם בתוך שאר אבלי ציון וירושלים.',
      'היי{,n}, שמעתי, ואני כל כך מצטער. אני כאן אם תצטרך משהו, בכל שעה.',
      '{n}, אין מילים. חושב עליך ועל המשפחה. המקום ינחם אתכם, ולא תוסיפו לדאבה עוד.']],
    ['mazal', 'מזל טוב קצר', [
      'מזל טוב{ ,n}! שמחה גדולה, שתזכו להרבה נחת 🎉',
      '{n}, מזל טוב מכל הלב! שמחים בשמחתכם ❤',
      'מזל טוב{ ,n}! בשעה טובה ומוצלחת, שרק נשמע בשורות טובות.']],
    ['sorry', 'סליחה', [
      'היי{,n}, אני מרגיש שפגעתי בך, וזה ממש לא היה בכוונה. סליחה. חשוב לי שנהיה בסדר.',
      '{n}, טעיתי, ואני מבקש סליחה. אשמח לדבר כשיתאים לך.']],
    ['ezra', 'לבקש עזרה', [
      'היי{,n}, יש לי בקשה קטנה, ואם לא מסתדר זה לגמרי בסדר: תוכל לעזור לי עם משהו השבוע?',
      '{n}, לא נעים לי לבקש, אבל אני צריך קצת עזרה. יש לך כמה דקות לדבר?']]
  ];
  var st = { k: 'late', n: '' };
  try { var sv = JSON.parse(localStorage.getItem(KEY) || 'null'); if (sv) Object.keys(sv).forEach(function (k) { st[k] = sv[k]; }); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // {n} = השם; {,n} = ", השם"; { ,n} = " השם". בלי שם: כולם נעלמים, ו-{n} בתחילת משפט הופך ל"היי".
  function fill(t, n) {
    n = (n || '').trim();
    if (!n) return t.replace(/^\{n\}, /, 'היי, ').replace(/\{n\}, /g, '').replace(/\{,n\}|\{ ,n\}|\{n\}/g, '');
    return t.replace(/\{,n\}/g, ', ' + n).replace(/\{ ,n\}/g, ' ' + n).replace(/\{n\}/g, n);
  }
  $('hd-name').value = st.n || '';
  function draw() {
    $('hd-tabs').innerHTML = M.map(function (m) { return '<button type="button" role="tab" data-k="' + m[0] + '" aria-selected="' + (m[0] === st.k) + '">' + m[1] + '</button>'; }).join('');
    var m = M.filter(function (x) { return x[0] === st.k; })[0] || M[0];
    box.innerHTML = m[2].map(function (t, i) {
      var txt = fill(t, st.n);
      return '<div class="hd-msg"><p>' + esc(txt) + '</p><div class="share-row"><a class="btn btn-gold btn-sm" target="_blank" rel="noopener" data-i="' + i + '" href="https://api.whatsapp.com/send?text=' + encodeURIComponent(txt) + '"><svg class="ic"><use href="#wa"/></svg> לשלוח</a><button class="btn btn-line btn-sm" type="button" data-copy="' + i + '">להעתיק</button></div></div>';
    }).join('');
  }
  $('hd-tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; st.k = b.getAttribute('data-k'); save(); draw(); });
  $('hd-name').addEventListener('input', function () { st.n = this.value; save(); draw(); });
  box.addEventListener('click', function (e) {
    var c = e.target.closest('[data-copy]');
    if (c) {
      var p = c.closest('.hd-msg').querySelector('p').textContent;
      (navigator.clipboard ? navigator.clipboard.writeText(p) : Promise.reject()).then(function () { c.textContent = 'הועתק ✓'; setTimeout(function () { c.textContent = 'להעתיק'; }, 1800); }).catch(function () {});
    }
    var a = e.target.closest('[data-i]');
    if ((a || c) && window.toolUsed) window.toolUsed('kesharim_hodaot', { how: a ? 'wa' : 'copy', kind: st.k });
  });
  draw();
})();
