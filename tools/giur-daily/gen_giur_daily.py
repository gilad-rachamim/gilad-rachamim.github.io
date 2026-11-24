# -*- coding: utf-8 -*-
"""Generator for the "daily giur question" posts (Telegram-ready). Sends NOTHING.

  python -I gen_giur_daily.py build  [--src qa-final.json] [--out DIR]   -> posts.json, posts.txt
  python -I gen_giur_daily.py images [--out DIR] [--only 1,2,3]          -> PNG card per post (headless Chrome)
  python -I gen_giur_daily.py verify [--src qa-final.json] [--out DIR]   -> proves every answer == JSON answer
"""
import argparse, html, json, os, subprocess, sys, tempfile
from collections import defaultdict

PAGE = "https://hakelim.com/kodesh/giur/shut/"
CREDIT = ("ההלכות מתוך הספר פניני הלכה – גיור מאת הרב אליעזר מלמד, "
          "ערך כשאלות ותשובות גילעד רחמים ברשות הרב.")
NOTE = "לשאלה מעשית פונים לבית הדין או לרב המלווה."
HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SRC = os.path.join(os.path.expanduser("~"), "OneDrive - Michlelet Orot Israel",
                           "Documents", "claude-plans", "giur-shut", "qa-final.json")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def order(items):
    """Mixed rounds: never the same category twice in a row (when possible),
    always take from the fullest category; fixed order -> deterministic, no repeats."""
    buckets = defaultdict(list)
    for it in items:
        buckets[it["cat"]].append(it)
    cats = sorted(buckets)  # stable tie-break
    out, prev = [], None
    while any(buckets.values()):
        cand = [c for c in cats if buckets[c] and c != prev] or [c for c in cats if buckets[c]]
        c = max(cand, key=lambda k: len(buckets[k]))
        out.append(buckets[c].pop(0))
        prev = c
    return out


def text_of(it):
    # layout: question, then the answer verbatim, source, credit, page, note
    return "\n".join([
        "❓ " + it["q"], "",
        it["a"], "",
        "📖 מקור: פניני הלכה – גיור, " + it["src"], it["url"], "",
        CREDIT, "",
        "כל השאלות והתשובות: " + PAGE, "",
        NOTE,
    ])


def build(a):
    items = json.load(open(a.src, encoding="utf-8"))
    posts = []
    for i, it in enumerate(order(items), 1):
        posts.append({"day": i, "cat": it["cat"], "code": it["code"], "q": it["q"], "a": it["a"],
                      "src": it["src"], "url": it["url"], "text": text_of(it)})
    os.makedirs(a.out, exist_ok=True)
    json.dump(posts, open(os.path.join(a.out, "posts.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    with open(os.path.join(a.out, "posts.txt"), "w", encoding="utf-8") as f:
        for p in posts:
            f.write(f"===== יום {p['day']} · {p['cat']} =====\n{p['text']}\n\n")
    print("built", len(posts), "posts ->", a.out)


def card_html(p):
    e = html.escape
    return f"""<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><style>
body{{margin:0;width:1080px;height:1350px;background:#f6efe0;font-family:'Segoe UI','Arial',sans-serif;color:#1d2b3a;display:flex}}
.c{{margin:48px;flex:1;background:#fff;border:6px solid #b8892b;border-radius:28px;padding:56px 60px;display:flex;flex-direction:column}}
.k{{color:#b8892b;font-size:34px;font-weight:700;margin-bottom:20px}}
.q{{font-size:58px;font-weight:800;line-height:1.3;margin-bottom:36px}}
.a{{font-size:44px;line-height:1.55;flex:1}}
.s{{font-size:30px;color:#4a5a6a;margin-top:24px}}
.cr{{font-size:26px;color:#6a7a8a;margin-top:12px;line-height:1.4}}
.u{{font-size:32px;font-weight:700;color:#8a5a00;margin-top:18px;direction:ltr;text-align:center}}
</style><body><div class="c"><div class="k">שאלה יומית על גיור · {e(p['cat'])}</div>
<div class="q">{e(p['q'])}</div><div class="a">{e(p['a'])}</div>
<div class="s">מקור: פניני הלכה – גיור, {e(p['src'])}</div>
<div class="cr">{e(CREDIT)}</div><div class="u">hakelim.com/kodesh/giur/shut</div></div></body></html>"""


def images(a):
    posts = json.load(open(os.path.join(a.out, "posts.json"), encoding="utf-8"))
    only = {int(x) for x in a.only.split(",")} if a.only else None
    img = os.path.join(a.out, "images")
    os.makedirs(img, exist_ok=True)
    tmp = tempfile.mkdtemp()
    for p in posts:
        if only and p["day"] not in only:
            continue
        h = os.path.join(tmp, f"{p['day']}.html")
        open(h, "w", encoding="utf-8").write(card_html(p))
        png = os.path.join(img, f"{p['day']:02d}.png")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--window-size=1080,1350", f"--screenshot={png}",
                        "file:///" + h.replace("\\", "/")], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=60)
    print("images ->", img)


def verify(a):
    src = json.load(open(a.src, encoding="utf-8"))
    posts = json.load(open(os.path.join(a.out, "posts.json"), encoding="utf-8"))
    by = {s["q"]: s for s in src}
    bad = 0
    assert len(posts) == len(src) == len({p["q"] for p in posts}) == len({s["q"] for s in src}), "count/dup mismatch"
    for p in posts:
        s = by[p["q"]]
        lines = p["text"].split("\n")
        # answer block = lines between the question blank line and the source line
        body = "\n".join(lines[2:]).split("\n\n📖 מקור:")[0].lstrip("\n")
        ok = (p["a"] == s["a"] and body == s["a"] and lines[0] == "❓ " + s["q"]
              and s["url"] in p["text"] and CREDIT in p["text"] and PAGE in p["text"] and NOTE in p["text"])
        if not ok:
            bad += 1
            print("MISMATCH", p["day"], p["code"])
    # no same category twice in a row
    rep = sum(1 for x, y in zip(posts, posts[1:]) if x["cat"] == y["cat"])
    print(f"checked {len(posts)} posts: mismatches={bad}, adjacent same-category={rep}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["build", "images", "verify"])
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--out", default=os.path.join(HERE, "out"))
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    {"build": build, "images": images, "verify": verify}[a.cmd](a)
