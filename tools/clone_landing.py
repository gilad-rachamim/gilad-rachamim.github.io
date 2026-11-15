# -*- coding: utf-8 -*-
"""דף נחיתה = אותו כלי בכתובת משלו, עם כותרת, H1, טקסט ושאלות של הביטוי שמחפשים.

נבנה 15.11.2026 לבדיקת ה-SEO של כל האתר (מחקר מילות מפתח): "שער היורו היום", "המרת דולר לשקל",
"מחשבון הנחה" – כל אחד 1K–100K חיפושים בחודש, והכלי כבר קיים בדף אחר.

הרצה:  python tools/clone_landing.py tools/data/landing-pages.json   ואז   python build.py
המפרט: רשימה של {src, dst, title, description, og_title, crumbs, tool, h1, sub, seo (HTML), faq: [[q, a_html]], edits: [[old, new]]}
src/dst = נתיב תחת src/pages (בלי index.html). כותרת: בלי הסיומת – הסיומת של דף המקור נשמרת.
"""
import html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "src" / "pages"
META = re.compile(r"<!--meta\s*(\{.*?\})\s*-->", re.S)
LD = re.compile(r'<script type="application/ld\+json">\{"@context": "https://schema.org", "@type": "FAQPage".*?</script>', re.S)


def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", s)).strip()


def faq_ld(qa):
    return '<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": plain(a)}} for q, a in qa]},
        ensure_ascii=False) + "</script>"


def build(s):
    t = (PAGES / s["src"] / "index.html").read_text(encoding="utf-8")
    m = json.loads(META.search(t).group(1))
    suffix = m["title"].rsplit(" | ", 1)[1]
    m["title"] = s["title"] + " | " + suffix
    m["description"] = s["description"]
    m["og_title"] = s["og_title"]
    m["crumbs"] = s["crumbs"]
    m["tool"] = s["tool"]
    m.pop("og_image", None)
    m["priority"] = "0.7"
    head = m.get("head", "")
    head = LD.sub("", head) + faq_ld(s["faq"])
    m["head"] = head
    body = t[META.search(t).end():]
    body = re.sub(r"<h1([^>]*)>.*?</h1>", lambda x: f"<h1{x.group(1)}>{s['h1']}</h1>", body, count=1, flags=re.S)
    body = re.sub(r'(<header class="k-hero">.*?<p class="sub">).*?(</p>)', lambda x: x.group(1) + s["sub"] + x.group(2), body, count=1, flags=re.S)
    for o, n in s.get("edits", []):
        assert body.count(o) == 1, ("edit", o[:50], body.count(o))
        body = body.replace(o, n)
    faq = ('<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n'
           + "\n".join(f"  <details><summary>{q}</summary><p>{a}</p></details>" for q, a in s["faq"]) + "\n</section>")
    seo = f'<!--seo-txt-->\n<section class="k-sec seo-txt" aria-labelledby="seo-h">\n{s["seo"]}\n</section>\n{faq}\n<!--/seo-txt-->'
    assert body.count("<!--seo-txt-->") == 1 and body.count("<!--/seo-txt-->") == 1, "seo markers"
    body = re.sub(r"<!--seo-txt-->.*?<!--/seo-txt-->", lambda x: seo, body, count=1, flags=re.S)
    out = "<!--meta " + json.dumps(m, ensure_ascii=False, indent=1) + " -->" + body
    p = PAGES / s["dst"] / "index.html"
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(out, encoding="utf-8", newline="")
    words = len(re.findall(r"[֐-׿A-Za-z0-9]+", plain(s["seo"])))
    print(f"ok {s['dst']}: seo words {words}, faq {len(s['faq'])}")


if __name__ == "__main__":
    for s in json.loads(Path(sys.argv[1]).read_text(encoding="utf-8")):
        build(s)
