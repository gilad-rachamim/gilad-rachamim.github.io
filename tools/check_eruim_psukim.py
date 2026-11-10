# -*- coding: utf-8 -*-
"""בודק שכל פסוק במחולל ההזמנות (assets/eruim-hazmana.js, PSUKIM) כתוב מילה במילה כמו בספריא.
המקור: tools/eruim-hazmana-psukim-source.json (Sefaria API v3, version=hebrew, נמשך 10.11.2026).
מנרמלים: בלי טעמים ומתג, מקף = רווח, קמץ קטן = קמץ, שם ה' = ה׳. הרצה: python -I tools/check_eruim_psukim.py"""
import json, pathlib, re, sys, unicodedata
ROOT = pathlib.Path(__file__).resolve().parent.parent
src = json.loads((ROOT / "tools" / "eruim-hazmana-psukim-source.json").read_text(encoding="utf-8"))
js = (ROOT / "assets" / "eruim-hazmana.js").read_text(encoding="utf-8")

def norm(t):
    t = unicodedata.normalize("NFD", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"&[a-z]+;", " ", t)
    t = re.sub(r"\{[^}]*\}", " ", t)
    t = re.sub("[\u0591-\u05AF\u05BD\u05C0\u05C3\u034F]", "", t)
    t = t.replace("\u05BE", " ").replace("\u05C7", "\u05B8").replace("\u05F3", "'")
    t = re.sub(r"(\S?[\u05B0-\u05BC]*)י[\u05B0-\u05BC]*ה[\u05B0-\u05BC]*ו[\u05B0-\u05BC]*ה", lambda m: m.group(1) + "ה'", t)
    return re.sub(r"\s+", " ", t).strip()

block = re.search(r"var PSUKIM = \{(.*?)\n  \};", js, re.S).group(1)
rows = re.findall(r"(\w+): \['([^']+)', '([^']+)', '([^']+)'\]", block)
bad = 0
for key, text, label, ref in rows:
    if ref not in src:
        print("MISSING SOURCE", key, ref); bad += 1; continue
    if norm(text.replace("׳", "'")) not in norm(src[ref]):
        print("MISMATCH", key, ref, "\n  tool:", norm(text), "\n  src: ", norm(src[ref])); bad += 1
    else:
        print("ok", key, ref)
print(f"summary: {len(rows)} verses, {bad} bad")
sys.exit(1 if bad or not rows else 0)
