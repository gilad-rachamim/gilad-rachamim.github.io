#!/usr/bin/env python3
"""בונה את assets/chanuka-nusach.js מתוך tools/chanuka-source.json
(ספריא: Siddur Edot HaMizrach, Hanukkah, Menorah Lighting – מהדורת שלייסבו, CC0).

לוקחים רק חלק מהקטעים (ברכות, הנרות הללו, מזמור שיר, מעוז צור) – כל קטע כמו שהוא.
השינוי היחיד במילים: שם ה' נכתב ה' (הדף מודפס), כמו ב-gen_brachon.py.
בדיקה שהפלט זהה למקור: python tools/check_chanuka.py
מריצים:  python tools/gen_chanuka.py  ואז  python build.py
"""
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = json.loads((ROOT / "tools" / "chanuka-source.json").read_text(encoding="utf-8"))

# הקטעים שנכנסים לדף, לפי מספר הקטע במקור (0 = הכותרת "חנוכה")
PICK = {"brachot": [3, 4, 5, 6], "halalu": [7, 8], "mizmor": [9], "maoz": [13, 14, 15, 16, 17, 18, 19, 20],
        "segula": [10, 11, 12]}

MARKS = "֑-ֽֿ-ׇ"
WORD = re.compile(r"[א-ת" + MARKS + r"‑]+")
PREFIX = set("ובלכמש")


def name_fix(word):
    letters = [(i, ch) for i, ch in enumerate(word) if "א" <= ch <= "ת"]
    cons = "".join(ch for _, ch in letters)
    for core in ("יהוה", "יי", "אדני"):
        if cons.endswith(core):
            pre = cons[: -len(core)]
            if len(pre) <= 2 and all(c in PREFIX for c in pre):
                return word[: letters[len(pre)][0]] + "ה'"
    return word


def clean(seg):
    seg = re.sub(r"<(?!/?(?:b|small|big|br)\b)[^>]*>", "", seg)
    seg = re.sub(r"<(/?)(b|small|big)\b[^>]*>", r"<\1\2>", seg)
    parts = re.split(r"(<[^>]+>)", seg)
    parts = [p if p.startswith("<") else WORD.sub(lambda m: name_fix(m.group(0)), p) for p in parts]
    return re.sub(r"[ \t]+", " ", "".join(parts)).strip()


text = SRC["text"]
out = {"src": "סידור עדות המזרח, מהדורת שלייסבו, CC0, נחלת הכלל, דרך ספריא", "ref": SRC["ref"],
       "parts": {k: [{"i": i, "h": clean(text[i])} for i in v] for k, v in PICK.items()}}
js = ("// נוצר אוטומטית ע\"י tools/gen_chanuka.py מתוך tools/chanuka-source.json – לא לערוך ביד.\n"
      "// הנוסח מספריא מילה במילה; השינוי היחיד: שם ה' נכתב ה'. בדיקה: python tools/check_chanuka.py\n"
      "window.CHANUKA_NUSACH = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
(ROOT / "assets" / "chanuka-nusach.js").write_text(js, encoding="utf-8")
print("chanuka-nusach.js:", {k: len(v) for k, v in out["parts"].items()})
