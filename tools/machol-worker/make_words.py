# -*- coding: utf-8 -*-
# בונה את he-words.js: המילים שעוזר המילים רשאי להציע (כדי שלא ימציא מילים).
# מקור: assets/vendor/frequencywords-he/he-20k.txt (20,000 המילים השכיחות, CC BY-SA 4.0) + כל המילים מבנקי המחוללים.
# הרצה: python tools/machol-worker/make_words.py
import io, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
words = set()
for line in io.open(os.path.join(ROOT, "assets", "vendor", "frequencywords-he", "he-20k.txt"), encoding="utf-8"):
    w = line.strip()
    if re.fullmatch(r"[א-ת]{2,14}", w):
        words.add(w)
banks = io.open(os.path.join(ROOT, "assets", "machol-banks.js"), encoding="utf-8").read()
for w in re.findall(r"'([א-ת]{2,14})\|", banks):
    words.add(w)
out = ("// נוצר ע\"י make_words.py – לא לערוך ביד. המילים העבריות שעוזר המילים רשאי להציע.\n"
       "// מקור: FrequencyWords (Hermit Dave, CC BY-SA 4.0) + בנקי המחוללים של האתר.\n"
       "export function heWords() { return " + repr("\n".join(sorted(words))).replace("'", '"') + "; }\n")
io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "he-words.js"), "w", encoding="utf-8", newline="\n").write(out)
print(len(words), "words")
