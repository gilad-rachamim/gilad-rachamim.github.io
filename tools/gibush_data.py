# -*- coding: utf-8 -*-
"""נתונים לכלי "הכנה לגיבוש" (/kelim/miluim/gibush/) מתוך הספר "המסע לסופר-על – מהדורת הגיבוש".
מקור: src/drip.py שבתיקיית הספר (40 הודעות ל-40 יום). לא ממציאים טקסט: רק שלושה מספרי ימים
שנכתבו לפי לוח של 40 יום הופכים ל-{left} (כמה ימים נשארו), כדי שיהיו נכונים גם במסלול מקוצר.

פלט:
  assets/miluim-gibush-data.js            – ציבורי: כותרות כל 40 הימים + הטקסט המלא רק של ימים שיכולים להיות
                                             בשבוע החינמי (7 הימים הראשונים של כל מסלול אפשרי)
  tools/gibush-worker/private/days.json   – לשותפים בלבד (לא במאגר): כל 40 הימים, נמסר ע"י ה-Worker אחרי בדיקת קוד

שימוש:  python -I tools/gibush_data.py "<תיקיית מהדורת הגיבוש 2026>"
"""
import json, os, re, sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOK = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser(
    r"~/OneDrive - Michlelet Orot Israel/Documents/6. כתבים אישיים/המסע לסופר-על/מהדורת הגיבוש 2026")

src = open(os.path.join(BOOK, "src", "drip.py"), encoding="utf-8").read()
m = re.search(r"^DAYS = \[.*?^\]", src, re.S | re.M)
ns = {}
exec(m.group(0), ns)
DAYS = ns["DAYS"]
assert len(DAYS) == 40

# מספרים שנכתבו ללוח של 40 יום -> כמה ימים נשארו בפועל במסלול של המשתמש
LEFT = {8: ("עוד 32 יום", "עוד {left} ימים"), 28: ("נשארו 12 יום", "נשארו {left} ימים"), 29: ("יש עוד 11 יום", "יש עוד {left} ימים")}
REST = {6, 20, 27, 34}  # הימים שהכותרת שלהם "מנוחה" / "שבת או יום מנוחה"

# סדר החשיבות במסלול מקוצר (פחות מ-40 יום עד הגיבוש): לוקחים את הראשונים ברשימה ומסדרים לפי סדר הספר.
# קודם ההתחלה, הערב שלפני וה"למה"; ימי מנוחה וימי ספירת ווים (7, 14...) יוצאים ראשונים כשמקצרים.
PRIORITY = [1, 40, 2, 12, 39, 22, 10, 8, 15, 36, 37, 4, 13, 32, 24, 18, 17, 33, 9, 23, 29, 31, 38, 5, 3,
            16, 25, 30, 11, 19, 26, 6, 20, 27, 34, 7, 14, 21, 28, 35]
assert sorted(PRIORITY) == list(range(1, 41))


def path(n):
    """רשימת ימי הספר למסלול של n ימים (1..40)."""
    n = max(1, min(40, n))
    return sorted(PRIORITY[:n])


free = set()
for n in range(1, 41):
    free |= set(path(n)[:7])

days = []
for i, (subj, quote, task, q) in enumerate(DAYS, 1):
    if i in LEFT:
        a, b = LEFT[i]
        assert a in task, (i, a)
        task = task.replace(a, b)
    days.append({"n": i, "t": subj, "q": quote, "k": task, "a": q, "r": i in REST})

pub = [{"n": d["n"], "t": d["t"], "r": d["r"], **({"q": d["q"], "k": d["k"], "a": d["a"]} if d["n"] in free else {})} for d in days]
js = ("// נוצר ע\"י tools/gibush_data.py מתוך הספר \"המסע לסופר-על – מהדורת הגיבוש\" (40 הודעות ל-40 יום). לא לערוך ביד.\n"
      "window.GIBUSH = " + json.dumps({"priority": PRIORITY, "days": pub}, ensure_ascii=False, separators=(",", ":")) + ";\n")
with open(os.path.join(ROOT, "assets", "miluim-gibush-data.js"), "w", encoding="utf-8", newline="\n") as f:
    f.write(js)
priv = os.path.join(ROOT, "tools", "gibush-worker", "private")
os.makedirs(priv, exist_ok=True)
with open(os.path.join(priv, "days.json"), "w", encoding="utf-8", newline="\n") as f:
    json.dump(days, f, ensure_ascii=False)
print(f"public: {len(free)} full days {sorted(free)}; private: 40 days")
