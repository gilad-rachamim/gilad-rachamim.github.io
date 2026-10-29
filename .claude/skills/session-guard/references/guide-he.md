# Session Guard: מדריך קצר

## מה זה עושה

- כשסוללת המחשב יורדת ל-**5%** (כשהוא לא בטעינה), כשסוללת הטלפון יורדת ל-**5%**, או כשהשימוש
  בתוכנית של Claude מגיע ל-**95%** (בחלון 5 השעות או במכסה השבועית), כל שיחות Claude Code במחשב
  נעצרות בצורה מסודרת:
  - כל שיחה שבאמצע עבודה כותבת **מסמך העברה**: מה המטרה, מה כבר נעשה, איפה בדיוק עצרה, הצעדים
    הבאים, דברים חשובים לדעת, ו**הפקת לקחים**.
  - אחר כך היא נעצרת. הודעות חדשות לא נשלחות ל-Claude עד סוף העצירה; מה שכותבים בזמן הזה נשמר
    ויורץ אחר כך.
- כבר ב-**90%** שימוש (או 10% סוללה בלי טעינה) כל שיחה שומרת נקודת ביניים קצרה, ליתר ביטחון.
- כשהסוללה חוזרת ל-**10%**, או כשמכסת השימוש **מתאפסת**, נפתחות אוטומטית **שיחות חדשות** ברקע,
  אחת לכל עבודה שנעצרה, וכל אחת ממשיכה מהמקום שבו העבודה נעצרה.
- הלקחים נאספים לקובץ אחד, ושיחות חדשות באותה תיקייה מקבלות אותם אוטומטית.

על "שימוש יומי": ל-Claude אין מכסה יומית. יש חלון של 5 שעות (Current session במסך ‎/usage) ומכסה
שבועית. Session Guard שומר על שתיהן.

## התקנה (פעם אחת, במחשב)

הכי פשוט: לפתוח את Claude Code במחשב ולכתוב לו:

> תתקין את session-guard מהריפו github.com/gilad-rachamim/gilad-rachamim.github.io (התיקייה
> ‎.claude/skills/session-guard), כולל הטלפון.

או ידנית, בטרמינל:

```sh
git clone https://github.com/gilad-rachamim/gilad-rachamim.github.io.git
python3 gilad-rachamim.github.io/.claude/skills/session-guard/scripts/install.py --phone
```

בווינדוס כותבים `py` במקום `python3` (צריך Python מ-python.org או מ-Microsoft Store).

אחרי ההתקנה פותחים **שיחה חדשה** של Claude Code ובודקים: `/session-guard status`.

ההתקנה מדפיסה כתובת לטלפון. איך מגדירים את הטלפון: `phone.md`.

## בשימוש יומיומי

| כותבים ל-Claude | מה קורה |
|---|---|
| `/session-guard status` | מצב: סוללות, אחוזי שימוש ומתי מתאפסים, האם יש עצירה, עבודות פתוחות |
| `/session-guard pause` | מסיים את השיחה הזאת עם מסמך העברה, להמשך בפעם הבאה |
| `/session-guard pause all` | עוצר את כל השיחות במחשב עכשיו |
| `/session-guard resume` | ממשיך עבודה שנשמרה |
| `/session-guard override 30` | ממשיכים לעבוד למרות העצירה, ל-30 דקות |

השיחות שנפתחות ברקע: `claude agents` מציג אותן, `claude attach <id>` נכנס לאחת מהן. כדי לראות
אותן גם באפליקציה בטלפון, מפעילים ב-`/config` את Remote Control לכל השיחות.

## לשנות את הספים

אפשר פשוט לבקש מ-Claude, למשל "תעצור כבר ב-90% שימוש". מאחורי הקלעים:

```sh
python3 ~/.claude/skills/session-guard/scripts/guard.py config --set usage.pause_at=90
```

הגדרות נפוצות: `usage.pause_at` (95), `usage.checkpoint_at` (90), `battery.pause_at` (5),
`battery.resume_at` (10), `phone.pause_at` (5), `phone.resume_at` (10),
`resume.permission_mode` (למשל `acceptEdits`, כדי שהשיחות שנפתחות ברקע לא יחכו לאישורים).

## לבדוק בלי לחכות לסוללה

```sh
python3 ~/.claude/skills/session-guard/scripts/guard.py simulate --battery 4
```

עכשיו לבקש מ-Claude משימה קטנה בשיחה חדשה ולראות איך הוא כותב מסמך העברה ונעצר. לסיום:
`simulate --clear`. תוך דקה נפתחת שיחה חדשה שממשיכה את המשימה (`claude agents`).

## מה זה לא עושה

- נעצרות רק שיחות Claude Code שרצות **במחשב**: בטרמינל, ברקע, דרך Remote Control. שיחות בענן
  (claude.ai/code) ושיחות צ'אט באפליקציה לא נעצרות אוטומטית. בענן אפשר לבקש `/session-guard pause`
  ידנית.
- שיחה שמחכה לתשובה ממך לא כותבת מסמך העברה (אין בה עבודה באמצע); היא רק לא תקבל הודעות חדשות עד
  סוף העצירה.
- פקודה ארוכה שכבר רצה לא נקטעת; העצירה קורית בצעד הבא.
- אחוזי השימוש מגיעים משורת הסטטוס של Claude Code, ולכן מתעדכנים רק כשיש שיחה פעילה בטרמינל.
- אם המחשב כבוי כשהעצירה נגמרת, ההמשך קורה כשהוא נדלק.

## הסרה

```sh
python3 ~/.claude/skills/session-guard/scripts/install.py --uninstall
```

מסמכי ההעברה והלקחים נשארים ב-`~/.claude/session-guard/` (עם `--purge` הם נמחקים).
