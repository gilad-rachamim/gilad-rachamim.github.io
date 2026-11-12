#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""בדיקה: הטקסט בדפי הקריאה (ברכת המזון, תפילת הדרך, תהילים ו-150 הפרקים) זהה תו בתו למקור מספריא.
נכתבה בנפרד מ-tools/make_dapei_kria.py, כדי שהבדיקה לא תסמוך על אותו קוד.

מה מותר להיות שונה (רק תצוגה, ונעשה גם כאן מחדש):
  טעמים ומתג יורדים, פסק יורד, סוף פסוק = ":", קמץ קטן = קמץ, חולם חסר = חולם, תגיות HTML יורדות,
  בתהילים הכתיב יורד והקרי בלי סוגריים, ושם ה' בכינוי (ה', אלוקים, אֲ-דֹנָי).
כל מקטע בדף (data-s) מושווה למקטע שלו במקור; כל ציטוט (data-q) חייב להופיע במקור מילה במילה.
גם: אין שם ה' מלא בדף, ובדיקת מוטציה (שינוי של אות אחת חייב להיתפס).
הרצה:  python tools/check_dapei_kria.py          (מול הקובץ שהורד)
        python tools/check_dapei_kria.py --live   (וגם: הקובץ שהורד זהה למה שיש עכשיו בספריא)
"""
import html, json, random, re, sys, time, unicodedata, urllib.parse, urllib.request
from html.parser import HTMLParser
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
SRC = json.loads((ROOT / "tools/data/dapei-kria-source.json").read_text(encoding="utf-8"))
TEH = json.loads((ROOT / "tools/data/tehillim-source.json").read_text(encoding="utf-8"))
PAGES = [ROOT / "src/pages/kodesh/birkat-hamazon/index.html", ROOT / "src/pages/kodesh/tefilat-haderech/index.html",
         ROOT / "src/pages/kodesh/tehillim/sefer/index.html"] + [ROOT / f"src/pages/kodesh/tehillim/sefer/{n}/index.html" for n in range(1, 151)]


def nfc(s):
    return unicodedata.normalize("NFC", s)


def squash(s):
    return re.sub(r"\s+", " ", s).strip()


# ---- שם ה' (כתוב כאן שוב, בדרך אחרת: לפי האותיות של כל מילה)
def is_letter(c):
    return "א" <= c <= "ת"


def fix_word(w):
    idx = [i for i, c in enumerate(w) if is_letter(c)]
    cons = "".join(w[i] for i in idx)
    for core in ("יהוה", "יי"):
        if cons.endswith(core) and len(cons) - len(core) <= 2 and all(c in "ובלכמש" for c in cons[:len(cons) - len(core)]):
            if core == "יי" and len(cons) != len(core) + len(cons[:len(cons) - len(core)]):
                continue
            return w[:idx[len(cons) - len(core)]] + "ה'"
    # אלה + אות שימוש -> אלק
    out = list(w)
    for j in range(len(idx) - 3):
        a, l, h, nx = (w[idx[j]], w[idx[j + 1]], w[idx[j + 2]], w[idx[j + 3]])
        between = w[idx[j] + 1:idx[j + 1]] + w[idx[j + 1] + 1:idx[j + 2]] + w[idx[j + 2] + 1:idx[j + 3]]
        if (a, l, h) == ("א", "ל", "ה") and nx in "יםנךכ" and all("ְ" <= c <= "ׇ" and c not in "־׀׃" for c in between):
            out[idx[j + 2]] = "ק"
    return "".join(out)


def names(t):
    # מילה = אותיות וניקוד (והמקף הקשיח של יְ‑יָ); מקף עברי (־) מפריד בין מילים
    t = re.sub(r"[ְ-ֽֿ-ׇא-ת‑]+", lambda m: fix_word(m.group(0)), t)
    return t.replace(nfc("אֲדֹנָי"), nfc("אֲ-דֹנָי"))


def src_text(seg, mam=False):
    if mam:
        seg = re.sub(r"<sup[^>]*>.*?</sup>|<i class=\"footnote\">.*?</i>|<span class=\"mam-kq-k\">.*?</span>|<span class=\"mam-spi-[^\"]*\">.*?</span>", "", seg, flags=re.S)
        seg = re.sub(r'<span class="mam-kq-q">\[(.*?)\]</span>', r"\1", seg, flags=re.S)
        seg = re.sub(r"\{[פס]\}", "", seg)
    seg = re.sub(r"<br\s*/?>", " ", seg)
    seg = re.sub(r"<[^>]+>", "", seg)
    t = html.unescape(seg)
    t = "".join(c for c in t if not ("֑" <= c <= "֯" or c in "ֽ׀‎‏"))
    t = t.replace("׃", ":").replace("ׇ", "ָ").replace("ֺ", "ֹ").replace("\xa0", " ").replace(" ", " ")
    return squash(nfc(names(nfc(t))))


# ---- מה כתוב בדף
class Grab(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.out, self.skip = [], [], 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        key = a.get("data-s") or (a.get("data-q") and "q:" + a["data-q"])
        vn = "vn" in (a.get("class") or "").split()
        self.stack.append((tag, key, vn))
        if key:
            self.out.append([key, ""])
        if vn:
            self.skip += 1

    def handle_endtag(self, tag):
        while self.stack:
            t, key, vn = self.stack.pop()
            if vn:
                self.skip -= 1
            if key:
                for o in reversed(self.out):
                    if o[0] == key and not o[0].endswith("#done"):
                        o[0] += "#done"
                        break
            if t == tag:
                break

    def handle_data(self, d):
        if self.skip:
            return
        for o in self.out:
            if not o[0].endswith("#done"):
                o[1] += d


def page_items(text):
    body = text.split("-->", 1)[1]                        # בלי ה-meta
    g = Grab()
    g.feed(body)
    return [(k[:-5], squash(nfc(v))) for k, v in g.out]


def check(pages_text, quiet=False):
    say = (lambda *a: None) if quiet else print
    bad, n_seg, n_q, ps = 0, 0, 0, set()
    for name, text in pages_text:
        for key, got in page_items(text):
            if key.startswith("q:"):
                k, i = key[2:].split(":")
                whole = src_text(SRC[k]["text"] if isinstance(SRC[k]["text"], str) else SRC[k]["text"][int(i)], mam=k.startswith("deut"))
                n_q += 1
                if got not in whole:
                    say("ציטוט לא נמצא במקור:", name, key, got[:80]); bad += 1
                continue
            k, i = key.split(":")
            if k == "ps":
                want = " ".join(src_text(v, mam=True) for v in TEH["chapters"][i])
                ps.add(int(i))
            else:
                want = src_text(SRC[k]["text"][int(i)])
            n_seg += 1
            if got != want:
                d = next((j for j in range(min(len(got), len(want))) if got[j] != want[j]), min(len(got), len(want)))
                say("לא זהה למקור:", name, key, "\n  מקור:", want[max(0, d - 30):d + 40], "\n  דף:  ", got[max(0, d - 30):d + 40]); bad += 1
        for full in re.findall(r"יְהֹוָה|יְהוָה|יהוה|יְיָ|(?<![א-ת])יי(?![א-ת])|אֱלֹהִים|אֱלֹהֵינוּ", re.sub(r"<!--meta.*?-->", "", text, flags=re.S)):
            say("שם ה' מלא בדף:", name, full); bad += 1
    if not quiet and ps != set(range(1, 151)):
        print("חסרים פרקי תהילים:", sorted(set(range(1, 151)) - ps)); bad += 1
    return bad, n_seg, n_q


def live():
    UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"}

    def get(u):
        for i in range(8):
            try:
                return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=45))
            except Exception as e:
                time.sleep(6)
        raise SystemExit("ספריא לא ענתה: " + u)
    bad = 0
    keys = list(SRC)
    for k in keys:
        v = SRC[k]
        j = get("https://www.sefaria.org/api/v3/texts/" + urllib.parse.quote(v["ref"]) + "?version=" + urllib.parse.quote("hebrew|" + v["versionTitle"].strip()))
        now = j["versions"][0]["text"] if j.get("versions") else None
        if now != v["text"]:
            print("שונה בספריא עכשיו:", k); bad += 1
        time.sleep(1)
    for n in random.sample(range(1, 151), 12) + [119]:
        j = get("https://www.sefaria.org/api/v3/texts/" + urllib.parse.quote(f"Psalms {n}") + "?version=hebrew")
        if j["versions"][0]["text"] != TEH["chapters"][str(n)]:
            print("פרק שונה בספריא עכשיו:", n); bad += 1
        time.sleep(1)
    print(("נכשל: " + str(bad)) if bad else f"ספריא עכשיו: {len(keys)} קטעי סידור והלכה ו-13 פרקים זהים לקובץ שהורד")
    return bad


texts = [(p.relative_to(ROOT).as_posix(), p.read_text(encoding="utf-8")) for p in PAGES]
bad, n_seg, n_q = check(texts)

# מוטציה: אות אחת שהשתנתה בברכת המזון, בתפילת הדרך ובפרק תהילים – הבדיקה חייבת להיכשל
caught = 0
for i in (0, 1, 3 + 22):
    name, t = texts[i]
    m = re.search(r'data-s="[^"]+">([^<]{20})', t) or re.search(r'aria-hidden="true">[^<]+</span>([^<]{20})', t)
    pos = m.start(1) + 10
    t2 = t[:pos] + ("ש" if t[pos] != "ש" else "ס") + t[pos + 1:]
    b2, _, _ = check([(name, t2)], quiet=True)
    caught += 1 if b2 else 0
print("מוטציה: נתפסו", caught, "מתוך 3")
ok = not bad and caught == 3
if "--live" in sys.argv:
    ok = live() == 0 and ok
print(("עבר: " if ok else "נכשל: ") + f"{n_seg} מקטעים ו-{n_q} ציטוטים בדפים, זהים למקור (חוץ מכללי התצוגה ושם ה' בכינוי)" + ("" if ok else f" – {bad} בעיות"))
sys.exit(0 if ok else 1)
