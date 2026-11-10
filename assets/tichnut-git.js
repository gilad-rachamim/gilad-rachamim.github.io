// מה לעשות ב-Git: בוחרים מצב ("שכחתי קובץ", "קונפליקט"...) ומקבלים את הפקודות, הסבר לכל אחת, ואזהרה כשמשהו לא הפיך.
(function () {
  var T = window.TICHNUT, KEY = 'tichnut_git', $ = function (id) { return document.getElementById(id); };
  // [קבוצה, מצב, פקודות, [[פקודה, הסבר]], אזהרה]
  var S = [
    ['מתחילים', 'להתחיל פרויקט חדש ולשמור גרסה ראשונה', 'git init\ngit add .\ngit commit -m "first commit"',
      [['git init', 'הופך את התיקייה למאגר Git (נוצרת תיקייה נסתרת .git).'], ['git add .', 'מסמן את כל הקבצים לשמירה (staging).'], ['git commit -m', 'שומר "צילום" של הקבצים עם הודעה שמתארת מה עשיתם.']]],
    ['מתחילים', 'לחבר את הפרויקט ל-GitHub ולהעלות', 'git remote add origin https://github.com/USER/REPO.git\ngit branch -M main\ngit push -u origin main',
      [['remote add origin', 'מחבר את המאגר המקומי למאגר ב-GitHub (קודם יוצרים אותו באתר, ריק).'], ['branch -M main', 'קורא לענף הראשי main.'], ['push -u', 'מעלה, וזוכר את החיבור כך שבפעם הבאה מספיק git push.']]],
    ['מתחילים', 'להוריד פרויקט קיים מ-GitHub', 'git clone https://github.com/USER/REPO.git\ncd REPO',
      [['git clone', 'מוריד את כל הפרויקט עם כל ההיסטוריה שלו לתיקייה חדשה.']]],
    ['מתחילים', 'לראות מה השתנה ומה מצב הקבצים', 'git status\ngit diff\ngit log --oneline --graph -15',
      [['git status', 'אילו קבצים השתנו, מה מסומן לשמירה, ובאיזה ענף אתם.'], ['git diff', 'מה בדיוק השתנה בכל שורה (שעוד לא סומן).'], ['log --oneline --graph', '15 השמירות האחרונות, שורה לכל אחת, עם ציור של הענפים.']]],
    ['עבודה יומית', 'לעבוד על פיצ\'ר בענף נפרד', 'git switch -c feature/login\n# ...עובדים, ואז:\ngit add .\ngit commit -m "add login page"\ngit push -u origin feature/login',
      [['switch -c', 'יוצר ענף חדש ועובר אליו. main נשאר נקי.'], ['push -u origin', 'מעלה את הענף. ב-GitHub פותחים ממנו Pull Request.']]],
    ['עבודה יומית', 'למשוך את העדכונים האחרונים', 'git switch main\ngit pull',
      [['git pull', 'מוריד את מה שאחרים העלו וממזג אצלכם. כדאי לעשות לפני שמתחילים לעבוד.']]],
    ['עבודה יומית', 'לעדכן את הענף שלי עם מה שחדש ב-main', 'git switch feature/login\ngit fetch origin\ngit merge origin/main',
      [['fetch', 'מוריד את השינויים בלי לגעת בקבצים שלכם.'], ['merge origin/main', 'מכניס לענף שלכם את מה שחדש ב-main. אם יש קונפליקט – ראו "קונפליקט במיזוג".']]],
    ['עבודה יומית', 'לשמור שינויים בצד לרגע (בלי commit)', 'git stash push -m "half done"\n# ...עושים משהו אחר, ואז:\ngit stash pop',
      [['stash push', 'מחביא את השינויים שלא נשמרו ומחזיר את הקבצים למצב האחרון.'], ['stash pop', 'מחזיר אותם.']]],
    ['עבודה יומית', 'שלא יעלו קבצים מיותרים (.gitignore)', 'printf "__pycache__/\\n.venv/\\nnode_modules/\\n.env\\n*.log\\n.DS_Store\\n" > .gitignore\ngit add .gitignore\ngit commit -m "add gitignore"',
      [['.gitignore', 'רשימת קבצים ותיקיות ש-Git מתעלם מהם: סביבות, תלויות, לוגים, וקובץ .env עם סיסמאות.']], 'קובץ שכבר נשמר ב-Git לא יוסר רק כי הוספתם אותו ל-.gitignore – צריך גם git rm --cached <file>.'],
    ['אופס', 'לבטל שינויים בקובץ (לחזור לגרסה השמורה)', 'git restore app.py',
      [['git restore', 'מחזיר את הקובץ למצב של השמירה האחרונה.']], 'השינויים שלא נשמרו בקובץ הזה יימחקו ולא יחזרו.'],
    ['אופס', 'סימנתי קובץ ב-add בטעות', 'git restore --staged secrets.txt',
      [['restore --staged', 'מוציא את הקובץ מהרשימה לשמירה. הקובץ עצמו לא משתנה.']]],
    ['אופס', 'לתקן את ההודעה של ה-commit האחרון', 'git commit --amend -m "fix: correct message"',
      [['--amend', 'מחליף את השמירה האחרונה בחדשה.']], 'רק אם עוד לא עשיתם push. אחרי push זה משכתב היסטוריה שאחרים כבר הורידו.'],
    ['אופס', 'שכחתי קובץ ב-commit האחרון', 'git add forgotten.py\ngit commit --amend --no-edit',
      [['--no-edit', 'מוסיף את הקובץ לשמירה האחרונה בלי לשנות את ההודעה.']], 'רק לפני push.'],
    ['אופס', 'לבטל את ה-commit האחרון אבל להשאיר את השינויים', 'git reset --soft HEAD~1',
      [['reset --soft HEAD~1', 'מוחק את השמירה האחרונה, והשינויים שלה חוזרים להיות "מסומנים לשמירה".']], 'רק לפני push. אחרי push – השתמשו ב-git revert.'],
    ['אופס', 'לבטל commit שכבר עלה ל-GitHub', 'git revert <commit-hash>\ngit push',
      [['git revert', 'יוצר שמירה חדשה שהופכת את השינויים של שמירה ישנה. ההיסטוריה לא נמחקת – בטוח גם בעבודה בצוות.'], ['<commit-hash>', 'את המזהה לוקחים מ-git log --oneline.']]],
    ['אופס', 'עשיתי commit לענף הלא נכון (main)', 'git switch -c feature/fix\ngit switch main\ngit reset --hard origin/main',
      [['switch -c', 'יוצר ענף חדש שמכיל את השמירות שלכם.'], ['reset --hard origin/main', 'מחזיר את main למצב של GitHub.']], 'reset --hard מוחק שינויים שלא נשמרו. ודאו קודם (git status) שהכול נשמר בענף החדש.'],
    ['אופס', 'מחקתי משהו ורוצה לחזור לאחור', 'git reflog\ngit switch -c rescue <hash-from-reflog>',
      [['git reflog', 'יומן של כל מקום שבו HEAD היה – גם שמירות "שנמחקו". כמעט כל דבר ב-Git אפשר להציל ממנו.'], ['switch -c rescue', 'יוצר ענף חדש במקום ההוא, כדי לא לאבד אותו שוב.']]],
    ['צוות', 'קונפליקט במיזוג', 'git status\n# פותחים כל קובץ שמסומן "both modified",\n# מחפשים <<<<<<< ======= >>>>>>> ומשאירים את הנכון\ngit add .\ngit commit',
      [['<<<<<<< / =======', 'למעלה – הגרסה שלכם, למטה – הגרסה שנכנסת. מוחקים את הסימנים ומשאירים את מה שצריך (לפעמים את שניהם).'], ['git add + commit', 'מסמן שהקונפליקט נפתר ומסיים את המיזוג.'], ['git merge --abort', 'אם רוצים לוותר ולחזור למצב שלפני המיזוג.']]],
    ['צוות', 'Pull Request – הזרימה המקובלת', 'git switch main && git pull\ngit switch -c feature/x\n# ...commits...\ngit push -u origin feature/x\n# ב-GitHub: Compare & pull request',
      [['ענף לכל משימה', 'אף פעם לא עובדים ישר על main בצוות.'], ['Pull Request', 'בקשה למזג את הענף. מישהו עושה code review, ואחרי אישור ממזגים ב-GitHub.']]],
    ['צוות', 'למחוק ענף שסיימתי איתו', 'git switch main\ngit branch -d feature/login\ngit push origin --delete feature/login',
      [['branch -d', 'מוחק את הענף המקומי (רק אם כבר מוזג – אחרת Git יסרב).'], ['push --delete', 'מוחק אותו גם ב-GitHub.']]]
  ];
  var st = T.load(KEY, { i: 0 });
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function list() {
    var q = $('gt-q').value.trim().toLowerCase(), cat = '';
    $('gt-list').innerHTML = S.map(function (s, i) {
      if (q && (s[0] + s[1] + s[2]).toLowerCase().indexOf(q) < 0) return '';
      var h = s[0] !== cat ? '<li class="cat">' + s[0] + '</li>' : ''; cat = s[0];
      return h + '<li><button type="button" data-i="' + i + '"' + (i === st.i ? ' aria-current="true"' : '') + '>' + esc(s[1]) + '</button></li>';
    }).join('') || '<li class="cat">לא נמצא. נסו מילה אחרת.</li>';
  }
  function show() {
    var s = S[st.i];
    $('gt-t').textContent = s[1];
    $('gt-cmd').textContent = s[2];
    $('gt-e').innerHTML = s[3].map(function (e) { return '<li><code dir="ltr">' + esc(e[0]) + '</code><span>' + esc(e[1]) + '</span></li>'; }).join('');
    $('gt-warn').textContent = s[4] ? '⚠️ ' + s[4] : ''; $('gt-warn').hidden = !s[4];
    T.wa($('gt-wa'), s[1] + ':\n\n' + s[2] + '\n\nhttps://hakelim.com/kelim/tichnut/git/');
    T.save(KEY, st);
  }
  $('gt-list').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return;
    st.i = +b.getAttribute('data-i'); list(); show(); T.used('tichnut_git', 'pick');
    if (window.innerWidth < 760) $('gt-t').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('gt-q').addEventListener('input', list);
  $('gt-copy').addEventListener('click', function () {
    var txt = $('gt-cmd').textContent.split('\n').filter(function (l) { return l.indexOf('#') !== 0; }).join('\n');
    try { navigator.clipboard.writeText(txt); $('gt-copy').textContent = 'הועתק ✓'; setTimeout(function () { $('gt-copy').textContent = 'להעתיק'; }, 1500); } catch (x) {}
    T.used('tichnut_git', 'copy');
  });
  $('gt-wa').addEventListener('click', function () { T.used('tichnut_git', 'wa'); });
  if (!S[st.i]) st.i = 0;
  list(); show();
})();
