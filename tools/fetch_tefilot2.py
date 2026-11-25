#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""מוריד מספריא (API v3) את מנחה, ערבית, מוסף ראש חודש ומוסף לשלוש רגלים (חול המועד)
בשלושת הנוסחים, בדיוק כפי שהם. נשמר ב-tools/data/tefilot2-source.json.
tools/make_tefilot2.py בונה מזה את הדפים. אותו מקור ואותה שיטה כמו tools/fetch_tefilot.py.
הרצה: python -X utf8 tools/fetch_tefilot2.py
"""
import json, sys, time, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import importlib.util
# משתמשים בפונקציות של fetch_tefilot בלי להריץ אותו
src = (pathlib.Path(__file__).resolve().parent / "fetch_tefilot.py").read_text(encoding="utf-8")
ns = {"__file__": str(pathlib.Path(__file__).resolve().parent / "fetch_tefilot.py"), "sys": sys}
head = src[:src.index("BOOKS = ")]
sys.argv = [sys.argv[0]]
exec(head, ns)
get, text, leaves = ns["get"], ns["text"], ns["leaves"]

DEST = pathlib.Path(__file__).resolve().parent / "data" / "tefilot2-source.json"

# לכל תפילה ולכל נוסח: (ספר, קידומת של הענף בספריא, האם כל הענפים או רק עלה אחד)
PLAN = {
    "mincha": {"em": ("Siddur Edot HaMizrach", ["Weekday Mincha"]),
               "sef": ("Siddur Sefard", ["Weekday Mincha"]),
               "ash": ("Siddur Ashkenaz", ["Weekday", "Minchah"])},
    "arvit": {"em": ("Siddur Edot HaMizrach", ["Weekday Arvit"]),
              "sef": ("Siddur Sefard", ["Weekday Maariv"]),
              "ash": ("Siddur Ashkenaz", ["Weekday", "Maariv"])},
    "rc": {"em": ("Siddur Edot HaMizrach", ["Rosh Hodesh", "Mussaf"]),
           "sef": ("Siddur Sefard", ["Rosh Chodesh", "Mussaf"]),
           "ash": ("Siddur Ashkenaz", ["Festivals", "Rosh Chodesh", "Musaf Amidah for Rosh Chodesh"])},
    "chm": {"em": ("Siddur Edot HaMizrach", ["Prayers for Three Festivals", "Mussaf"]),
            "sef": ("Siddur Sefard", ["Holidays", "Yom Tov Musaf Amidah"]),
            "ash": ("Siddur Ashkenaz", ["Festivals", "Shalosh Regalim", "Mussaf"])},
}

out = json.loads(DEST.read_text(encoding="utf-8")) if DEST.exists() else {}
for prayer, by in PLAN.items():
    out.setdefault(prayer, {})
    for nus, (book, pre) in by.items():
        if nus in out[prayer]:
            continue
        idx = get("https://www.sefaria.org/api/v2/raw/index/" + ns["urllib"].parse.quote(book))
        L = []; leaves(idx["schema"], [], [], L)
        want = ", ".join([book] + pre)
        nodes = []
        for ref, hp in L:
            if not (ref == want or ref.startswith(want + ", ")):
                continue
            g = text(ref)
            if not g:
                print("אין גרסה", ref, file=sys.stderr); continue
            g["he"] = hp[1 + len(pre):] if len(hp) > 1 + len(pre) else []
            g["hefull"] = hp
            nodes.append(g); print(prayer, nus, ref, len(g["text"]), file=sys.stderr); time.sleep(.7)
        out[prayer][nus] = nodes
        DEST.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
print("ok", {p: {n: len(v) for n, v in d.items()} for p, d in out.items()})
