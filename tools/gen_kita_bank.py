# -*- coding: utf-8 -*-
"""בנק שאלות מוכן ל"כיתה משחקת" (דף המורה, לשונית שאלות) -> assets/kita-bank.json

כל שורה: שאלה | נכונה | שגויה | שגויה | שגויה.
התשובות השגויות נבחרו לפי טעויות נפוצות, כדי ש"מה קשה לכיתה" ילמד את המורה משהו.
כל תשובה נכונה נבדקת פעמיים: חישוב מדויק בשברים (Fraction) וחישוב שני בדרך אחרת
(מספרים עשרוניים / הצבה במשוואה / חיבור חוזר). באנגלית: מול מילון תשובות שנכתב בנפרד.
כל שורה עוברת גם את המסנן של השרת (cleanQ), כדי שלא תיחסם בשמירה.

הרצה: python -I tools/gen_kita_bank.py
"""
import json
import re
import sys
from fractions import Fraction as F
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "kita-bank.json"


def num(s):
    """מספר מתוך תשובה: '5/6', 'x = 4', '25%', '60 ₪', '−9', '1.5', '24 סמ״ר'."""
    s = s.replace("−", "-").replace("x =", "").strip()
    m = re.match(r"^(-?\d+(?:\.\d+)?)(?:/(\d+))?", s)
    if not m:
        raise ValueError("no number in %r" % s)
    v = F(m.group(1))
    if m.group(2):
        v = v / int(m.group(2))
    return v


def ev(expr, exact=True):
    """חישוב ביטוי. exact=True בשברים מדויקים, אחרת ב-float (בדיקה שנייה, בדרך אחרת)."""
    e = expr.replace("^", "**")
    if exact:
        e = re.sub(r"(\d+)", r"F(\1)", e)
        return F(eval(e, {"F": F}))
    return float(eval(e))


# ---------- מתמטיקה ----------
# (שאלה, ביטוי לחישוב התשובה, נכונה, [שגויות], הטעות שכל שגויה מייצגת)
SHEVARIM = [
    ("כמה זה 1/2 + 1/3?", "1/2+1/3", "5/6", ["2/5", "2/6", "1/6"]),          # חיבור מונים ומכנים / מכנה משותף בלי להרחיב
    ("כמה זה 2/5 + 1/5?", "2/5+1/5", "3/5", ["3/10", "2/25", "1/5"]),        # חיבור המכנים
    ("כמה זה 3/4 − 1/4?", "3/4-1/4", "1/2", ["1/4", "1", "3/16"]),
    ("כמה זה 1/2 × 1/4?", "1/2*1/4", "1/8", ["2/6", "3/4", "1/6"]),          # חיבור במקום כפל
    ("כמה זה 2/3 × 3/4?", "2/3*3/4", "1/2", ["6/7", "5/7", "8/9"]),          # כפל מונים וחיבור מכנים / כפל בהצלבה
    ("כמה זה 3/5 ÷ 1/5?", "(3/5)/(1/5)", "3", ["3/25", "1/3", "3/5"]),       # כפל במקום חילוק
    ("איזה שבר שווה ל-2/3?", "2/3", "4/6", ["3/4", "2/6", "4/3"]),           # הוספת 1 למונה ולמכנה / הפיכה
    ("צמצום של 6/8 הוא:", "6/8", "3/4", ["6/4", "1/2", "3/8"]),
    ("כמה זה 1 − 1/4?", "1-1/4", "3/4", ["1/3", "1/4", "4/3"]),
    ("כמה זה 1/4 מתוך 20?", "1/4*20", "5", ["80", "16", "4"]),               # כפל ב-4 / חיסור 4
    ("כמה זה 2/3 + 2/3?", "2/3+2/3", "4/3", ["4/6", "4/9", "2/6"]),
    ("כמה זה 5/6 − 1/3?", "5/6-1/3", "1/2", ["4/3", "4/6", "1/6"]),          # חיסור מונים ומכנים
]
SHEVARIM_MAX = [  # התשובה הנכונה היא השבר הגדול מכולם
    ("איזה שבר הכי גדול?", "3/4", ["3/8", "3/5", "3/7"]),                    # "מכנה גדול = שבר גדול"
    ("איזה שבר הכי גדול?", "2/3", ["2/9", "1/2", "3/8"]),
]

ACHUZIM = [
    ("כמה זה 10% מ-50?", "10/100*50", "5", ["10", "40", "500"]),
    ("כמה זה 25% מ-80?", "25/100*80", "20", ["25", "55", "320"]),
    ("כמה זה 50% מ-36?", "50/100*36", "18", ["72", "50", "14"]),
    ("כמה זה 20% מ-150?", "20/100*150", "30", ["20", "130", "75"]),
    ("כמה זה 1% מ-300?", "1/100*300", "3", ["30", "1", "299"]),
    ("כמה זה 75% מ-40?", "75/100*40", "30", ["10", "35", "75"]),
    ("כמה אחוזים הם 1/4?", "1/4*100", "25%", ["14%", "4%", "40%"]),
    ("כמה אחוזים הם 3/5?", "3/5*100", "60%", ["35%", "53%", "15%"]),
    ("10 מתוך 40 הם כמה אחוזים?", "10/40*100", "25%", ["10%", "40%", "30%"]),
    ("חולצה עולה 80 ₪ ויש עליה הנחה של 25%. כמה משלמים?", "80*75/100", "60 ₪", ["20 ₪", "55 ₪", "75 ₪"]),
    ("מחיר של 200 ₪ עלה ב-10%. מה המחיר החדש?", "200*110/100", "220 ₪", ["210 ₪", "20 ₪", "180 ₪"]),
    ("איך כותבים 0.5 באחוזים?", "5/10*100", "50%", ["5%", "0.5%", "500%"]),
]

# משוואות: (משוואה להצגה, צד שמאל, צד ימין, נכונה, שגויות). הבדיקה: הצבה בשני הצדדים.
MISHVAOT = [
    ("x + 7 = 12", "x+7", "12", "x = 5", ["x = 19", "x = 7", "x = −5"]),
    ("x − 4 = 10", "x-4", "10", "x = 14", ["x = 6", "x = 40", "x = −6"]),
    ("3x = 21", "3*x", "21", "x = 7", ["x = 18", "x = 24", "x = 63"]),
    ("x/4 = 5", "x/4", "5", "x = 20", ["x = 1.25", "x = 9", "x = 1"]),
    ("2x + 3 = 11", "2*x+3", "11", "x = 4", ["x = 7", "x = 2.5", "x = 8"]),
    ("5x − 2 = 18", "5*x-2", "18", "x = 4", ["x = 3.2", "x = 20", "x = 16"]),
    ("4x = 2", "4*x", "2", "x = 1/2", ["x = 2", "x = 8", "x = −2"]),
    ("3x + 5 = 2", "3*x+5", "2", "x = −1", ["x = 1", "x = 7/3", "x = −3"]),
    ("2(x + 1) = 10", "2*(x+1)", "10", "x = 4", ["x = 4.5", "x = 5", "x = 9"]),
    ("7 − x = 3", "7-x", "3", "x = 4", ["x = −4", "x = 10", "x = 3"]),
    ("x + x = 18", "x+x", "18", "x = 9", ["x = 18", "x = 36", "x = 3"]),
    ("6x − 4 = 2x + 8", "6*x-4", "2*x+8", "x = 3", ["x = 1", "x = 1.5", "x = −3"]),
]

# לוח הכפל: (a, אופרטור, b, נכונה, שגויות). בדיקה שנייה: חיבור חוזר.
KEFEL = [
    (7, "×", 8, "56", ["54", "63", "48"]),
    (6, "×", 7, "42", ["36", "48", "13"]),
    (8, "×", 9, "72", ["81", "63", "17"]),
    (9, "×", 6, "54", ["45", "56", "15"]),
    (12, "×", 4, "48", ["44", "52", "16"]),
    (7, "×", 7, "49", ["47", "14", "56"]),
    (6, "×", 8, "48", ["46", "54", "14"]),
    (9, "×", 9, "81", ["18", "72", "99"]),
    (3, "×", 12, "36", ["33", "15", "32"]),
    (11, "×", 11, "121", ["111", "22", "112"]),
    (63, "÷", 9, "7", ["6", "8", "54"]),
    (56, "÷", 8, "7", ["6", "8", "48"]),
]

SHETACH = [
    ("מה השטח של מלבן באורך 6 ס״מ וברוחב 4 ס״מ?", "6*4", "24 סמ״ר", ["20 סמ״ר", "10 סמ״ר", "48 סמ״ר"]),     # היקף / חיבור
    ("מה ההיקף של מלבן באורך 6 ס״מ וברוחב 4 ס״מ?", "2*(6+4)", "20 ס״מ", ["24 ס״מ", "10 ס״מ", "12 ס״מ"]),   # שטח / חצי היקף
    ("מה השטח של ריבוע שאורך הצלע שלו 5 ס״מ?", "5*5", "25 סמ״ר", ["20 סמ״ר", "10 סמ״ר", "50 סמ״ר"]),
    ("מה ההיקף של ריבוע שאורך הצלע שלו 7 ס״מ?", "4*7", "28 ס״מ", ["49 ס״מ", "14 ס״מ", "21 ס״מ"]),
    ("מה השטח של משולש שהבסיס שלו 8 ס״מ והגובה 5 ס״מ?", "8*5/2", "20 סמ״ר", ["40 סמ״ר", "13 סמ״ר", "80 סמ״ר"]),  # שוכחים לחלק ב-2
    ("מה השטח של משולש שהבסיס שלו 10 ס״מ והגובה 6 ס״מ?", "10*6/2", "30 סמ״ר", ["60 סמ״ר", "16 סמ״ר", "15 סמ״ר"]),
    ("מה ההיקף של משולש שהצלעות שלו 3, 4 ו-5 ס״מ?", "3+4+5", "12 ס״מ", ["60 ס״מ", "6 ס״מ", "9 ס״מ"]),
    ("שטח מלבן הוא 36 סמ״ר והאורך שלו 9 ס״מ. מה הרוחב?", "36/9", "4 ס״מ", ["27 ס״מ", "6 ס״מ", "45 ס״מ"]),
    ("ההיקף של ריבוע הוא 32 ס״מ. מה אורך הצלע?", "32/4", "8 ס״מ", ["16 ס״מ", "4 ס״מ", "28 ס״מ"]),
    ("מה השטח של חדר מלבני באורך 12 מ׳ וברוחב 3 מ׳?", "12*3", "36 מ״ר", ["30 מ״ר", "15 מ״ר", "18 מ״ר"]),
    ("מה השטח של מקבילית שהבסיס שלה 7 ס״מ והגובה 4 ס״מ?", "7*4", "28 סמ״ר", ["22 סמ״ר", "11 סמ״ר", "14 סמ״ר"]),
    ("מה השטח של טרפז שהבסיסים שלו 6 ס״מ ו-4 ס״מ והגובה 5 ס״מ?", "(6+4)*5/2", "25 סמ״ר", ["50 סמ״ר", "120 סמ״ר", "15 סמ״ר"]),
]

CHEZKOT = [
    ("כמה זה 2 בחזקת 3?", "2^3", "8", ["6", "5", "9"]),          # 2×3 / 2+3 / 3²
    ("כמה זה 3 בחזקת 2?", "3^2", "9", ["6", "8", "5"]),
    ("כמה זה 5²?", "5^2", "25", ["10", "7", "32"]),
    ("כמה זה 10³?", "10^3", "1000", ["30", "100", "13"]),
    ("כמה זה 2 בחזקת 5?", "2^5", "32", ["10", "25", "16"]),
    ("כמה זה 4 בחזקת 0?", "4^0", "1", ["0", "4", "40"]),          # "בחזקת 0 זה 0"
    ("כמה זה 1 בחזקת 7?", "1^7", "1", ["7", "8", "0"]),
    ("כמה זה (−3)²?", "(-3)^2", "9", ["−9", "−6", "6"]),
    ("כמה זה 2³ × 2²?", "2^3*2^2", "32", ["64", "1024", "12"]),   # כפל המעריכים / כפל בסיסים
    ("כמה זה 3² + 4²?", "3^2+4^2", "25", ["49", "14", "7"]),       # (3+4)²
    ("כמה זה 6²?", "6^2", "36", ["12", "8", "64"]),
    ("כמה זה 10² − 1?", "10^2-1", "99", ["19", "81", "100"]),
]

# ---------- אנגלית ----------
# שורות מוכנות + מילון נפרד לבדיקה שנייה: התשובה הנכונה חייבת להיות זו שבמילון.
MILIM = [
    ("מה זה 'כלב' באנגלית?", "dog", ["cat", "dig", "doll"]),
    ("מה זה 'ספר' באנגלית?", "book", ["look", "boat", "cook"]),
    ("מה זה 'בית' באנגלית?", "house", ["horse", "mouse", "hose"]),
    ("מה זה 'מים' באנגלית?", "water", ["winter", "wait", "weather"]),
    ("מה זה 'תפוח' באנגלית?", "apple", ["orange", "ample", "able"]),
    ("מה זה 'שולחן' באנגלית?", "table", ["chair", "tablet", "cable"]),
    ("מה זה 'ירוק' באנגלית?", "green", ["grey", "blue", "grin"]),
    ("מה זה 'חלון' באנגלית?", "window", ["wind", "door", "widow"]),
    ("מה זה 'שמש' באנגלית?", "sun", ["son", "moon", "sand"]),
    ("מה זה 'חבר' באנגלית?", "friend", ["fried", "free", "family"]),
    ("מה זה 'בית ספר' באנגלית?", "school", ["class", "teacher", "cool"]),
    ("מה זה 'לאכול' באנגלית?", "eat", ["drink", "seat", "sleep"]),
]
MILIM_KEY = {"כלב": "dog", "ספר": "book", "בית": "house", "מים": "water", "תפוח": "apple", "שולחן": "table",
             "ירוק": "green", "חלון": "window", "שמש": "sun", "חבר": "friend", "בית ספר": "school", "לאכול": "eat"}

ZMANIM = [
    ("Yesterday I ___ to school.", "went", ["go", "goes", "going"]),
    ("She ___ to school every day.", "goes", ["go", "went", "going"]),
    ("Last night we ___ a movie.", "watched", ["watch", "watches", "watching"]),
    ("Every morning he ___ breakfast.", "eats", ["eat", "ate", "eaten"]),
    ("They ___ football yesterday.", "played", ["play", "plays", "playing"]),
    ("I ___ my homework last night.", "did", ["do", "does", "doing"]),
    ("Look! The baby ___ now.", "is sleeping", ["sleeps", "slept", "sleep"]),
    ("We ___ in Jerusalem two years ago.", "lived", ["live", "lives", "living"]),
    ("Dan ___ his teeth every night.", "brushes", ["brush", "brushed", "brushing"]),
    ("Yesterday she ___ a letter.", "wrote", ["write", "writes", "writing"]),
    ("I ___ happy today.", "am", ["is", "are", "be"]),
    ("They ___ at home last Sunday.", "were", ["was", "are", "is"]),
]
# בדיקה שנייה: מילת הזמן במשפט קובעת את הזמן, והנושא קובע את הצורה
ZMANIM_KEY = {
    "Yesterday I": "went", "She ___ to school every": "goes", "Last night we": "watched", "Every morning he": "eats",
    "They ___ football yesterday": "played", "I ___ my homework last": "did", "Look! The baby": "is sleeping",
    "We ___ in Jerusalem": "lived", "Dan ___ his teeth": "brushes", "Yesterday she": "wrote", "I ___ happy": "am",
    "They ___ at home last": "were",
}

HAFACHIM = [
    ("What is the opposite of big?", "small", ["large", "bag", "tall"]),
    ("What is the opposite of hot?", "cold", ["warm", "hat", "hut"]),
    ("What is the opposite of happy?", "sad", ["glad", "funny", "hungry"]),
    ("What is the opposite of up?", "down", ["on", "at", "top"]),
    ("What is the opposite of fast?", "slow", ["quick", "first", "fist"]),
    ("What is the opposite of open?", "close", ["over", "oven", "often"]),
    ("What is the opposite of day?", "night", ["dry", "today", "light"]),
    ("What is the opposite of old?", "new", ["cold", "gold", "told"]),
    ("What is the opposite of good?", "bad", ["food", "great", "wood"]),
    ("What is the opposite of full?", "empty", ["fall", "pull", "fill"]),
    ("What is the opposite of buy?", "sell", ["by", "bye", "boy"]),
    ("What is the opposite of early?", "late", ["earth", "easy", "yearly"]),
]
HAFACHIM_KEY = {"big": "small", "hot": "cold", "happy": "sad", "up": "down", "fast": "slow", "open": "close",
                "day": "night", "old": "new", "good": "bad", "full": "empty", "buy": "sell", "early": "late"}

SHEELOT = [
    ("___ is your name?", "What", ["Where", "When", "Who"]),
    ("___ do you live? I live in Haifa.", "Where", ["What", "Who", "When"]),
    ("___ is your birthday? In May.", "When", ["Where", "Who", "How"]),
    ("___ is your teacher? Mrs Cohen.", "Who", ["What", "Where", "Why"]),
    ("___ are you sad? Because I lost my pen.", "Why", ["Who", "Where", "What"]),
    ("___ old are you?", "How", ["What", "Who", "When"]),
    ("___ many books do you have?", "How", ["What", "Who", "Where"]),
    ("___ are you? I am fine, thanks.", "How", ["Who", "What", "Where"]),
    ("___ color is the sky? Blue.", "What", ["Who", "Where", "How"]),
    ("___ bag is this? It is Dana's.", "Whose", ["Who's", "Where", "When"]),
    ("___ time is it?", "What", ["Who", "Where", "Why"]),
    ("___ is the cat? Under the table.", "Where", ["Who", "When", "What"]),
]
SHEELOT_KEY = {"name": "What", "live": "Where", "birthday": "When", "teacher": "Who", "sad": "Why", "old": "How",
               "many": "How", "fine": "How", "color": "What", "bag": "Whose", "time": "What", "cat": "Where"}

# ---------- הרחבה: עוד שאלות לכל נושא (tools/kita_bank_more.py) ----------
sys.path.insert(0, str(Path(__file__).resolve().parent))
import kita_bank_more as _m  # noqa: E402
for _n in ("SHEVARIM", "SHEVARIM_MAX", "ACHUZIM", "MISHVAOT", "KEFEL", "SHETACH", "CHEZKOT", "MILIM", "ZMANIM", "HAFACHIM", "SHEELOT"):
    globals()[_n] = globals()[_n] + getattr(_m, _n)
for _n in ("MILIM_KEY", "ZMANIM_KEY", "HAFACHIM_KEY", "SHEELOT_KEY"):
    _dup = set(globals()[_n]) & set(getattr(_m, _n))
    if _dup:
        raise SystemExit("KEY USED TWICE: %s" % _dup)
    globals()[_n] = dict(globals()[_n], **getattr(_m, _n))

# ---------- המסנן של השרת (העתק של cleanQ ו-bad מ-tools/kita-worker/kita-worker.js) ----------
BAD = ['זונה', 'זין', 'כוס', 'מזדיין', 'לזיין', 'שרמוטה', 'מניאק', 'חרא', 'קקי', 'דביל', 'מפגר', 'אידיוט', 'סתום', 'סתומה',
       'מטומטם', 'מטומטמת', 'שמן', 'שמנה', 'מכוער', 'מכוערת', 'fuck', 'shit', 'bitch', 'sex', 'porn', 'סקס', 'פורנו',
       'נאצי', 'היטלר', 'מוות ל']


def server_ok(s, mx):
    s = re.sub(r"\s+", " ", s).strip()
    if not s or len(s) > mx:
        return False
    if re.search(r"https?:|www\.|\.(com|co|il|net|org|ly|me)\b|@|t\.me", s, re.I):
        return False
    if re.search(r"(^|\D)05\d-?\d{7}(\D|$)", s) or re.search(r"[<>{}]", s):
        return False
    low = " " + re.sub(r"[.,?!:;()'\"״׳-]", " ", s.lower()) + " "
    return not any((" " + w + " ") in low or (len(w) > 3 and w in low) for w in BAD)


errors = []


def err(msg):
    errors.append(msg)


def check_numeric(q, correct_val, correct, wrongs, second=None):
    """correct_val = חישוב ראשון (מדויק). second = חישוב שני ב-float. בודק נכונה ושגויות."""
    if num(correct) != correct_val:
        err("WRONG ANSWER: %s -> %s, computed %s" % (q, correct, correct_val))
    if second is not None and abs(float(num(correct)) - second) > 1e-9:
        err("SECOND CHECK FAILED: %s -> %s, float %s" % (q, correct, second))
    vals = [num(w) for w in wrongs]
    for w, v in zip(wrongs, vals):
        if v == correct_val:
            err("DISTRACTOR EQUALS ANSWER: %s -> %s" % (q, w))
    if len(set(vals)) != len(vals):
        err("TWO DISTRACTORS WITH SAME VALUE: %s -> %s" % (q, wrongs))


def line(q, correct, wrongs):
    parts = [q, correct] + wrongs
    if len(wrongs) != 3 or len({p.lower() for p in [correct] + wrongs}) != 4:
        err("NEED 4 DIFFERENT OPTIONS: %s" % parts)
    if not server_ok(q, 200) or not all(server_ok(p, 80) for p in [correct] + wrongs):
        err("SERVER FILTER WOULD BLOCK: %s" % parts)
    if any("|" in p for p in parts):
        err("PIPE INSIDE: %s" % parts)
    return " | ".join(parts)


def build():
    topics = []

    rows = []
    for q, expr, c, w in SHEVARIM:
        check_numeric(q, ev(expr), c, w, ev(expr, exact=False))
        rows.append(line(q, c, w))
    for q, c, w in SHEVARIM_MAX:
        allv = [num(c)] + [num(x) for x in w]
        if num(c) != max(allv) or sorted(allv)[-2] == max(allv):
            err("MAX CHECK FAILED: %s" % c)
        if max(float(num(x)) for x in [c] + w) != float(num(c)):  # שני: ב-float
            err("MAX SECOND CHECK FAILED: %s" % c)
        # השאלה כוללת את השברים, כדי שכל שאלה תיראה אחרת ב"מה קשה לכיתה" (המקום של הנכונה מתחלף)
        shown = list(reversed(w))
        shown.insert([1, 2, 0, 3][len(rows) % 4], c)  # המקום של הנכונה מתחלף משאלה לשאלה
        rows.append(line("איזה שבר הכי גדול: " + ", ".join(shown) + "?", c, w))
    topics.append(("shevarim", "math", "שברים", rows))

    rows = []
    for q, expr, c, w in ACHUZIM:
        check_numeric(q, ev(expr), c, w, ev(expr, exact=False))
        rows.append(line(q, c, w))
    topics.append(("achuzim", "math", "אחוזים", rows))

    rows = []
    for eq, lhs, rhs, c, w in MISHVAOT:
        x = num(c)
        # בדיקה 1: הצבה מדויקת. בדיקה 2: הצבה ב-float.
        if ev(lhs.replace("x", "(%s)" % x)) != ev(rhs.replace("x", "(%s)" % x)):
            err("EQUATION WRONG: %s -> %s" % (eq, c))
        xf = float(x)
        if abs(eval(lhs.replace("x", "(%r)" % xf)) - eval(rhs.replace("x", "(%r)" % xf))) > 1e-9:
            err("EQUATION SECOND CHECK: %s" % eq)
        for wv in w:
            y = num(wv)
            if ev(lhs.replace("x", "(%s)" % y)) == ev(rhs.replace("x", "(%s)" % y)):
                err("DISTRACTOR SOLVES EQUATION: %s -> %s" % (eq, wv))
        check_numeric(eq, x, c, w)
        rows.append(line("פתרו: " + eq, c, w))
    topics.append(("mishvaot", "math", "משוואות ממעלה ראשונה", rows))

    rows = []
    for a, op, b, c, w in KEFEL:
        if op == "×":
            v1 = F(a * b)
            v2 = sum([a] * b)  # חיבור חוזר
        else:
            v1 = F(a, b)
            v2 = 0
            while v2 * b < a:  # כמה פעמים b נכנס ב-a
                v2 += 1
            if v2 * b != a:
                err("DIVISION NOT WHOLE: %s" % a)
        check_numeric("%s %s %s" % (a, op, b), v1, c, w, float(v2))
        rows.append(line("כמה זה %s %s %s?" % (a, op, b), c, w))
    topics.append(("kefel", "math", "לוח הכפל", rows))

    rows = []
    for q, expr, c, w in SHETACH:
        check_numeric(q, ev(expr), c, w, ev(expr, exact=False))
        unit_c = c.split(" ", 1)[1]
        if any(x.split(" ", 1)[1] != unit_c for x in w):
            err("UNITS DIFFER: %s" % q)
        rows.append(line(q, c, w))
    topics.append(("shetach", "math", "שטח והיקף", rows))

    rows = []
    for q, expr, c, w in CHEZKOT:
        second = 1.0
        base, _, rest = expr.partition("^")
        # בדיקה שנייה: כפל חוזר (רק לביטוי של חזקה אחת פשוטה), אחרת float
        if re.fullmatch(r"\(?-?\d+\)?\^\d+", expr):
            b = int(base.strip("()"))
            for _ in range(int(rest)):
                second *= b
        else:
            second = ev(expr, exact=False)
        check_numeric(q, ev(expr), c, w, second)
        rows.append(line(q, c, w))
    topics.append(("chezkot", "math", "חזקות", rows))

    rows = []
    for q, c, w in MILIM:
        heb = re.search(r"'(.+)'", q).group(1)
        if MILIM_KEY.get(heb) != c:
            err("VOCAB KEY MISMATCH: %s" % q)
        if any(x in MILIM_KEY.values() and x != c for x in w):
            pass
        rows.append(line(q, c, w))
    topics.append(("milim", "eng", "אוצר מילים בסיסי", rows))

    rows = []
    for q, c, w in ZMANIM:
        keys = [k for k in ZMANIM_KEY if q.startswith(k)]
        if len(keys) != 1 or ZMANIM_KEY[keys[0]] != c:
            err("TENSE KEY MISMATCH: %s" % q)
        rows.append(line(q, c, w))
    topics.append(("zmanim", "eng", "זמנים (past / present)", rows))

    rows = []
    for q, c, w in HAFACHIM:
        word = re.search(r"of (\w+)\?", q).group(1)
        if HAFACHIM_KEY.get(word) != c:
            err("OPPOSITE KEY MISMATCH: %s" % q)
        rows.append(line(q, c, w))
    topics.append(("hafachim", "eng", "הפכים (opposites)", rows))

    rows = []
    for q, c, w in SHEELOT:
        keys = [k for k in SHEELOT_KEY if re.search(r"\b%s\b" % k, q)]
        if not keys or any(SHEELOT_KEY[k] != c for k in keys):
            err("QUESTION-WORD KEY MISMATCH: %s %s" % (q, keys))
        rows.append(line(q, c, w))
    topics.append(("sheelot", "eng", "מילות שאלה (question words)", rows))

    for tid, subj, name, rows in topics:
        if not 10 <= len(rows) <= 30:
            err("TOPIC SIZE %s: %d" % (tid, len(rows)))
        if len(set(rows)) != len(rows) or len({r.split(" | ")[0] for r in rows}) != len(rows):
            err("DUPLICATE QUESTION IN %s" % tid)
    return topics


def main():
    topics = build()
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    data = {"v": 2, "pick": 10, "topics": [{"id": t, "subj": s, "name": n, "q": r} for t, s, n, r in topics]}
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    total = sum(len(r) for *_, r in topics)
    print("OK: %d topics, %d questions, every answer checked twice -> %s" % (len(topics), total, OUT.relative_to(ROOT)))


if __name__ == "__main__":
    main()
