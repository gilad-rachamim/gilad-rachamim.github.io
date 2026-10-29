# סוללת הטלפון (Phone battery)

המחשב לא יכול לראות את הסוללה של הטלפון, אז הטלפון מדווח בעצמו: כשהסוללה יורדת ל-5% וכשהיא עולה
בחזרה ל-10%, אוטומציה בטלפון שולחת את אחוז הסוללה לכתובת פרטית בשירות החינמי ntfy.sh. ה-watchdog
במחשב בודק את הכתובת הזאת פעם בדקה.

*How it works, in English: two phone automations send the battery level to a private ntfy.sh topic
when it drops to 5% and when it climbs back to 10%; the computer's watchdog polls that topic every
minute. Only the number is sent.*

## 1. הכתובת שלך

ההתקנה עם `--phone` מדפיסה כתובת כזאת (היא נשמרת גם ב-`~/.claude/session-guard/config.json`, בשדה
`phone.ntfy_topic`):

```
https://ntfy.sh/claude-guard-<אותיות ומספרים>
```

שם הנושא (topic) הוא כמו סיסמה: מי שמכיר אותו יכול לעצור או להמשיך את העבודה. לא לפרסם אותו.

בכל השלבים למטה הכתובת ששולחים אליה היא:

```
https://ntfy.sh/claude-guard-<...>/publish?message=<אחוז הסוללה>
```

## 2. אייפון: אפליקציית קיצורים (Shortcuts)

יוצרים שתי אוטומציות. הראשונה, כשהסוללה יורדת:

1. פותחים את **קיצורים** (Shortcuts) ← לשונית **אוטומציה** (Automation) ← **+** / אוטומציה חדשה.
2. בוחרים **רמת הסוללה** (Battery Level) ← **יורדת אל מתחת ל-** (Falls Below) ← **6%**
   (אם הסרגל מאפשר רק קפיצות של 5, לבחור 5%).
3. בוחרים **הפעל מיד** (Run Immediately) ← הבא (Next) ← **אוטומציה ריקה חדשה** (New Blank Automation).
4. מוסיפים פעולה **קבל את רמת הסוללה** (Get Battery Level).
5. מוסיפים פעולה **קבל את התוכן של URL** (Get Contents of URL). בשדה ה-URL כותבים
   `https://ntfy.sh/claude-guard-<...>/publish?message=` ומיד אחרי ה-`=` מכניסים את המשתנה
   **רמת הסוללה** (Battery Level) מהשורה שמעל המקלדת.
6. שומרים.

השנייה זהה, רק בשלב 2: **עולה אל מעל** (Rises Above) ← **9%** (או 10%).

(שמות הכפתורים בעברית יכולים להיות מעט שונים, לפי גרסת iOS.)

## 3. אנדרואיד: MacroDroid (חינמי)

1. מתקינים את **MacroDroid** מחנות Play ← **הוסף מאקרו** (Add Macro).
2. טריגר (Trigger): **Battery/Power** ← **Battery Level** ← **Decreases to** ← **5%**.
3. פעולה (Action): **Connectivity** ← **HTTP Request**, שיטה (Method) **GET**, וכתובת
   `https://ntfy.sh/claude-guard-<...>/publish?message=[battery]`
   (את `[battery]` אפשר להכניס דרך כפתור ה-Magic Text: Battery level).
4. שומרים, ויוצרים מאקרו שני זהה עם **Increases to** ← **10%**.

ב-Tasker או Automate עובדים באותה צורה: טריגר של רמת סוללה, ופעולת HTTP GET לאותה כתובת.

## 4. בדיקה

1. בדפדפן (גם בטלפון) פותחים `https://ntfy.sh/claude-guard-<...>/publish?message=4`.
2. תוך דקה בערך המחשב מציג התראה ש-Claude נעצר, ו-`/session-guard status` מראה
   `phone battery: 4%`.
3. פותחים `https://ntfy.sh/claude-guard-<...>/publish?message=50` כדי לבטל: תוך דקה העבודה ממשיכה.

## 5. התראות לטלפון (לא חובה)

התקנה עם `--phone --alerts` שולחת גם התראות "נעצר" / "ממשיך" לטלפון. מתקינים את אפליקציית **ntfy**
ונרשמים (Subscribe) לנושא `claude-guard-<...>-alerts`.

## הערות

- הטלפון שולח רק את המספר. ntfy.sh שומר הודעות עד 12 שעות, כך שגם אם המחשב היה כבוי, הדיווח
  האחרון מחכה לו.
- אם הדיווח האחרון ישן מיממה, הוא לא עוצר כלום.
- סוללה נמוכה בטלפון לא משפיעה על Claude עצמו. העצירה נועדה לכך שלא תישאר עבודה שמחכה לאישור
  כשאין לך איך לענות.
