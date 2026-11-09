#!/usr/bin/env python3
"""בודק ש-assets/chanuka-nusach.js זהה מילה במילה ל-tools/chanuka-source.json.
ההבדל היחיד שמותר: שם ה' (יהוה / יי עם אותיות שימוש) ← ה'. כתוב כאן שוב, בנפרד מ-gen_chanuka.py,
כדי שהבדיקה לא תסמוך על אותו קוד. יוצא עם 1 אם יש הבדל.
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = json.loads((ROOT / "tools" / "chanuka-source.json").read_text(encoding="utf-8"))["text"]
js = (ROOT / "assets" / "chanuka-nusach.js").read_text(encoding="utf-8")
data = json.loads(js[js.index("{"): js.rstrip().rindex("}") + 1])


def plain(s):
    return " ".join(re.sub(r"<[^>]+>", " ", s).split())


def fix(w):
    cons = "".join(c for c in w if "א" <= c <= "ת")
    for core in ("יהוה", "יי", "אדני"):
        pre = cons[: -len(core)] if cons.endswith(core) else None
        if pre is not None and len(pre) <= 2 and all(c in "ובלכמש" for c in pre):
            idx = [i for i, c in enumerate(w) if "א" <= c <= "ת"][len(pre)]
            return w[:idx] + "ה'"
    return w


bad = n = 0
for part, segs in data["parts"].items():
    for s in segs:
        n += 1
        want = re.sub(r"[א-ת֑-ֽֿ-ׇ‑]+", lambda m: fix(m.group(0)), plain(src[s["i"]]))
        got = plain(s["h"])
        if want != got:
            bad += 1
            print("DIFF", part, s["i"]); print(" want:", want[:160]); print(" got: ", got[:160])
        if "יְהֹוָה" in got or "אדני" in re.sub(r"[^א-ת ]", "", got) or re.search(r"[^א-ת]יהוה", got):
            bad += 1; print("NAME LEFT", part, s["i"])
print(f"{n} segments, {bad} problems")
sys.exit(1 if bad else 0)
