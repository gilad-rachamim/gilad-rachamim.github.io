#!/usr/bin/env python3
"""בונה את assets/brachon-data.js מתוך tools/brachon-source.json (הנוסחים מספריא, בלי שינוי).

השינוי היחיד במילים: שם ה' נכתב ה' (כי הברכון מודפס), למשל לַיהֹוָה ← לַה'.
תגיות: נשארות רק b, small, big, br. כל השאר יורד (התוכן שבתוכן נשאר).
הבדיקה שהפלט זהה למקור: node tools/check_brachon.js
מריצים:  python tools/gen_brachon.py  ואז  python build.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = json.loads((ROOT / "tools" / "brachon-source.json").read_text(encoding="utf-8"))

MARKS = "֑-ֽֿ-ׇ"  # ניקוד וטעמים, בלי המקף העברי (־), כדי ש-אֶת־יְהֹוָה יתפצל
# מילה = אותיות עבריות, ניקוד וטעמים, גרש ומקף "קשיח" (‑) שמופיע ב-יְ‑יָ
WORD = re.compile(r"[א-ת" + MARKS + r"‑]+")
PREFIX = set("ובלכמש")


def name_fix(word):
    """אם המילה היא שם ה' (עם אותיות שימוש לפניה) מחזיר את האותיות שלפני + ה'. אחרת – את המילה כמו שהיא."""
    letters = [(i, ch) for i, ch in enumerate(word) if "א" <= ch <= "ת"]
    cons = "".join(ch for _, ch in letters)
    for core in ("יהוה", "יי"):
        if cons.endswith(core):
            pre = cons[: -len(core)]
            if len(pre) <= 2 and all(c in PREFIX for c in pre):
                cut = letters[len(pre)][0]  # המקום של ה-י של השם
                return word[:cut] + "ה'"
    return word


def clean(seg):
    seg = re.sub(r"<(?!/?(?:b|small|big|br)\b)[^>]*>", "", seg)  # רק התגיות שמותרות
    seg = re.sub(r"<(/?)(b|small|big)\b[^>]*>", r"<\1\2>", seg)
    seg = re.sub(r"<br\s*/?>", "<br>", seg)
    # שם ה' רק בטקסט, לא בתוך תגית
    parts = re.split(r"(<[^>]+>)", seg)
    parts = [p if p.startswith("<") else WORD.sub(lambda m: name_fix(m.group(0)), p) for p in parts]
    return re.sub(r"[ \t]+", " ", "".join(parts)).strip()


LIC = {"Public Domain": "נחלת הכלל", "CC0": "CC0, נחלת הכלל", "CC-BY": "רישיון CC-BY"}
VER = {"Daat Siddur Ashkenaz": "סידור אשכנז, מהדורת \"דעת\"", "Torat Emet 357": "סידור ספרד, \"תורת אמת\"",
       "Shaliehsaboo Edition": "סידור עדות המזרח, מהדורת שלייסבו", "The Metsudah siddur, 1981": "סידור \"מצודה\" (1981)"}
# קטע שנלקח ממהדורה אחרת – כתוב במפורש בשורת המקור שבברכון
PART = {"sef_mazon_end": 'סוף ברכת המזון (מ"הרחמן הוא ינחילנו" ועד הסוף) מ'}
WHY = {"sef_mazon_end": ', כי בסידור "תורת אמת" שבספריא הקטע הזה ריק'}
out = {}
for k, v in SRC.items():
    segs = [clean(s) for s in v["text"] if isinstance(s, str)]
    segs = [s for s in segs if re.sub(r"<[^>]+>|\s", "", s)]
    vt = (v.get("versionTitle") or "").strip()
    out[k] = {"src": PART.get(k, "") + VER.get(vt, vt) + ", " + LIC.get(v.get("license"), v.get("license") or "") + ", דרך ספריא" + WHY.get(k, ""),
              "ref": v["ref"], "segs": segs}

js = ("// נוצר אוטומטית ע\"י tools/gen_brachon.py מתוך tools/brachon-source.json – לא לערוך ביד.\n"
      "// הנוסחים מספריא מילה במילה; השינוי היחיד: שם ה' נכתב ה'. בדיקה: node tools/check_brachon.js\n"
      "window.BRACHON_DATA = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
(ROOT / "assets" / "brachon-data.js").write_text(js, encoding="utf-8")
print("brachon-data.js:", {k: len(v["segs"]) for k, v in out.items()})
