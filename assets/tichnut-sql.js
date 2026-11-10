// בודק SQL בדפדפן: SQLite (sql.js, WebAssembly) עם מסד לדוגמה של סטודנטים/קורסים/ציונים, ותרגילים שנבדקים אוטומטית.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_sql', $ = function (id) { return document.getElementById(id); };
  var SEED = [
    "CREATE TABLE students (id INTEGER PRIMARY KEY, name TEXT, city TEXT, year INTEGER);",
    "CREATE TABLE courses (id INTEGER PRIMARY KEY, title TEXT, credits REAL, dept TEXT);",
    "CREATE TABLE grades (student_id INTEGER, course_id INTEGER, grade INTEGER);",
    "INSERT INTO students VALUES (1,'נועה','ירושלים',1),(2,'יוסף','תל אביב',2),(3,'מרים','חיפה',3),(4,'דוד','ירושלים',2),(5,'שירה','באר שבע',1),(6,'אביגיל','תל אביב',3),(7,'אליהו','ירושלים',3),(8,'תמר','חיפה',2),(9,'יונתן','באר שבע',1),(10,'רבקה','ירושלים',1);",
    "INSERT INTO courses VALUES (1,'מבוא למדעי המחשב',5,'מדמח'),(2,'מבני נתונים',4,'מדמח'),(3,'אלגוריתמים',4,'מדמח'),(4,'בסיסי נתונים',3.5,'מדמח'),(5,'מבנה מחשבים',4,'הנדסה'),(6,'מתמטיקה בדידה',5,'מתמטיקה');",
    "INSERT INTO grades VALUES (1,1,92),(1,2,88),(1,6,95),(2,1,75),(2,2,81),(2,3,70),(3,2,97),(3,3,94),(3,4,90),(3,5,88),(4,1,64),(4,6,72),(5,1,85),(6,2,91),(6,3,99),(6,4,87),(7,2,78),(7,5,83),(8,1,90),(8,6,85),(9,1,58),(9,6,66),(2,4,93),(8,2,84);"
  ].join('\n');
  // [כותרת, משימה, פתרון, ordered?, רמז]
  var EX = [
    ['הכול', 'הציגו את כל הסטודנטים.', 'SELECT * FROM students;', 0, 'SELECT * FROM שם_טבלה'],
    ['סינון', 'שם ועיר של הסטודנטים מירושלים בלבד.', "SELECT name, city FROM students WHERE city = 'ירושלים';", 0, "WHERE city = 'ירושלים' (מחרוזת בגרש)"],
    ['מיון', 'שם ונקודות זכות של הקורסים עם יותר מ-4 נקודות, מהגבוה לנמוך.', 'SELECT title, credits FROM courses WHERE credits > 4 ORDER BY credits DESC, title;', 1, 'ORDER BY credits DESC'],
    ['קיבוץ', 'כמה סטודנטים יש בכל עיר? (עיר, מספר)', 'SELECT city, COUNT(*) FROM students GROUP BY city;', 0, 'GROUP BY city עם COUNT(*)'],
    ['JOIN ראשון', 'לכל ציון: שם הסטודנט והציון.', 'SELECT s.name, g.grade FROM grades g JOIN students s ON s.id = g.student_id;', 0, 'JOIN students ON students.id = grades.student_id'],
    ['שלוש טבלאות', 'שם הסטודנט, שם הקורס והציון.', 'SELECT s.name, c.title, g.grade FROM grades g JOIN students s ON s.id = g.student_id JOIN courses c ON c.id = g.course_id;', 0, 'שני JOIN-ים: אחד ל-students ואחד ל-courses'],
    ['ממוצע לקורס', 'שם הקורס והממוצע שלו.', 'SELECT c.title, AVG(g.grade) FROM grades g JOIN courses c ON c.id = g.course_id GROUP BY c.id;', 0, 'JOIN + GROUP BY + AVG(grade)'],
    ['HAVING', 'שמות הקורסים שהממוצע בהם מעל 85.', 'SELECT c.title FROM grades g JOIN courses c ON c.id = g.course_id GROUP BY c.id HAVING AVG(g.grade) > 85;', 0, 'תנאי על קבוצה כותבים ב-HAVING, לא ב-WHERE'],
    ['LEFT JOIN', 'שמות הסטודנטים שאין להם אף ציון.', 'SELECT s.name FROM students s LEFT JOIN grades g ON g.student_id = s.id WHERE g.student_id IS NULL;', 0, 'LEFT JOIN ואז WHERE ... IS NULL'],
    ['הכי טוב', 'שם הסטודנט עם הממוצע הגבוה ביותר, והממוצע.', 'SELECT s.name, AVG(g.grade) AS a FROM grades g JOIN students s ON s.id = g.student_id GROUP BY s.id ORDER BY a DESC LIMIT 1;', 1, 'GROUP BY, ORDER BY ... DESC ו-LIMIT 1'],
    ['שאלת ראיון', 'הציון השני בגובהו בקורס "מבני נתונים" (רק המספר).', "SELECT DISTINCT g.grade FROM grades g JOIN courses c ON c.id = g.course_id WHERE c.title = 'מבני נתונים' ORDER BY g.grade DESC LIMIT 1 OFFSET 1;", 1, 'ORDER BY DESC עם LIMIT 1 OFFSET 1 – או תת-שאילתה עם MAX'],
    ['תת-שאילתה', 'שמות הסטודנטים שקיבלו ציון מעל הממוצע הכללי של כל הציונים (בלי כפילויות).', 'SELECT DISTINCT s.name FROM grades g JOIN students s ON s.id = g.student_id WHERE g.grade > (SELECT AVG(grade) FROM grades);', 0, 'WHERE grade > (SELECT AVG(grade) FROM grades)']
  ];
  var st = T.load(KEY, { i: 0, done: {}, q: {} }), SQL = null, db = null;
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fresh() { if (db) db.close(); db = new SQL.Database(); db.run(SEED); }
  function run(q) { var r = db.exec(q); return r.length ? r[r.length - 1] : { columns: [], values: [] }; }
  function norm(r, ordered) {
    var rows = r.values.map(function (v) { return JSON.stringify(v.map(function (x) { return typeof x === 'number' ? Math.round(x * 100) / 100 : x; })); });
    if (!ordered) rows.sort(); return r.columns.length + '|' + rows.join('\n');
  }
  function table(r) {
    if (!r.columns.length) return '<p class="note">השאילתה רצה, אבל לא החזירה שורות.</p>';
    return '<div class="sq-tw"><table class="sq-t" dir="auto"><thead><tr>' + r.columns.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      r.values.slice(0, 200).map(function (v) { return '<tr>' + v.map(function (x) { return '<td>' + (x === null ? '<i>NULL</i>' : esc(typeof x === 'number' ? Math.round(x * 100) / 100 : x)) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table></div><p class="note">' + r.values.length + ' שורות</p>';
  }
  function heb(m) {
    if (/no such table/.test(m)) return 'אין טבלה כזאת. הטבלאות הן students, courses, grades.';
    if (/no such column/.test(m)) return 'אין עמודה כזאת. בדקו את השם בתרשים למעלה (ואם יש כמה טבלאות – כתבו s.name).';
    if (/syntax error/.test(m)) return 'שגיאת תחביר – בדקו פסיקים, גרשיים וסדר המילים (SELECT … FROM … WHERE … GROUP BY … ORDER BY).';
    if (/ambiguous column/.test(m)) return 'העמודה קיימת ביותר מטבלה אחת – כתבו לפניה את שם הטבלה או הכינוי, למשל g.grade.';
    if (/misuse of aggregate/.test(m)) return 'פונקציית קיבוץ (AVG, COUNT) במקום לא נכון – תנאי עליה כותבים ב-HAVING.';
    return 'השאילתה לא רצה.';
  }
  function exec(check) {
    var q = $('sq-in').value, out = $('sq-out'); st.q[st.i] = q; T.save(KEY, st);
    if (!db) return;
    try {
      var r = run(q); out.innerHTML = table(r);
      if (check) {
        var e = EX[st.i], want = run(e[2]);
        if (/^\s*(insert|update|delete|drop|create|alter)/i.test(q)) fresh();
        if (norm(r, e[3]) === norm(want, e[3])) { st.done[st.i] = 1; out.insertAdjacentHTML('afterbegin', '<p class="sq-ok">✓ נכון! ' + (st.i < EX.length - 1 ? 'אפשר לעבור לתרגיל הבא.' : 'סיימתם את כל התרגילים 🎉') + '</p>'); T.used('tichnut_sql', 'solved'); }
        else out.insertAdjacentHTML('afterbegin', '<p class="sq-no">✗ עוד לא. ' + (r.values.length !== want.values.length ? 'קיבלתם ' + r.values.length + ' שורות, צריך ' + want.values.length + '.' : r.columns.length !== want.columns.length ? 'מספר העמודות שונה (צריך ' + want.columns.length + ').' : 'הנתונים שונים' + (e[3] ? ' (או הסדר).' : '.')) + '</p>');
        T.save(KEY, st); list();
      }
    } catch (x) { out.innerHTML = '<p class="sq-no">✗ ' + heb(x.message) + '</p><p class="note" dir="ltr">' + esc(x.message) + '</p>'; }
  }
  function list() {
    var n = Object.keys(st.done).length;
    $('sq-prog').textContent = n + ' מתוך ' + EX.length;
    $('sq-ex').innerHTML = EX.map(function (e, i) { return '<button type="button" data-i="' + i + '"' + (i === st.i ? ' aria-current="true"' : '') + (st.done[i] ? ' class="ok"' : '') + '>' + (st.done[i] ? '✓ ' : (i + 1) + '. ') + e[0] + '</button>'; }).join('');
  }
  function pick(i) {
    st.i = i; var e = EX[i];
    $('sq-task').innerHTML = '<b>תרגיל ' + (i + 1) + ':</b> ' + e[1];
    $('sq-hint').hidden = true; $('sq-hint').textContent = '💡 ' + e[4]; $('sq-sol').hidden = true; $('sq-sol').textContent = e[2];
    $('sq-in').value = st.q[i] || ''; $('sq-out').innerHTML = ''; list(); T.save(KEY, st);
  }
  $('sq-ex').addEventListener('click', function (e) { var b = e.target.closest('button[data-i]'); if (b) pick(+b.getAttribute('data-i')); });
  $('sq-run').addEventListener('click', function () { exec(false); T.used('tichnut_sql', 'run'); });
  $('sq-check').addEventListener('click', function () { exec(true); });
  $('sq-in').addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); exec(true); } });
  $('sq-hint-b').addEventListener('click', function () { $('sq-hint').hidden = false; T.used('tichnut_sql', 'hint'); });
  $('sq-sol-b').addEventListener('click', function () { $('sq-sol').hidden = false; T.used('tichnut_sql', 'solution'); });
  $('sq-reset').addEventListener('click', function () { fresh(); $('sq-out').innerHTML = '<p class="sq-ok">המסד חזר למצב ההתחלתי.</p>'; });
  pick(st.i < EX.length ? st.i : 0);
  $('sq-status').textContent = 'טוען את SQLite…';
  initSqlJs({ locateFile: function () { return '/assets/vendor/sqljs/sql-wasm-1.10.3.wasm'; } }).then(function (S) {
    SQL = S; fresh(); $('sq-status').textContent = '✓ SQLite מוכן – הכול רץ בדפדפן שלכם';
    window.TICHNUT.sqlCheck = function (i, q) { var e = EX[i]; return norm(run(q), e[3]) === norm(run(e[2]), e[3]); };
    window.TICHNUT.sqlEx = EX;
  }).catch(function (e) { $('sq-status').textContent = 'לא הצלחתי לטעון את SQLite: ' + e.message; });
})();
