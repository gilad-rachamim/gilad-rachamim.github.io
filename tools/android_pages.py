# -*- coding: utf-8 -*-
"""Generate the /kelim/android/ domain page and the /kelim/android/<slug>/ tool pages from one place.

Each page: meta header (title, description, FAQPage schema built from the same FAQ list
that is shown on the page), tool HTML, SEO text and FAQ. Run:  python -X utf8 tools/android_pages.py
then  python build.py.  Page content lives in tools/android_pages_data/*.py (one file per page;
files starting with "_" are shared snippets, not pages). slug "" = the domain page /kelim/android/.
"""
import importlib.util, io, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "tools", "android_pages_data")
sys.path.insert(0, DATA)
BRAND = " | הכלים של גילעד רחמים"
TESTED = '<p class="ip-test">נבדק בהדמיה של טלפון אנדרואיד בדפדפן ובאמולטור, עדיין לא על כל דגם אמיתי. מצאתם משהו שלא מתאים לטלפון שלכם? <a class="gold" href="/kelim/bakasha/">ספרו לי</a>, ונעדכן את הטבלה.</p>'


def faq_schema(faq):
    return json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq]},
        ensure_ascii=False)


def page(p):
    head = ('<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/iphone.css">'
            '<link rel="stylesheet" href="/assets/android-sicha.css">'
            + p.get("head", "") + '<script type="application/ld+json">' + faq_schema(p["faq"]) + "</script>")
    foot = "".join('<script src="/assets/%s" defer></script>' % s for s in p.get("js", []))
    crumbs = [["כלים לאנדרואיד", "/kelim/android/"], [p["crumb"], None]] if p["slug"] else [["כלים לאנדרואיד", None]]
    meta = {
        "site": "kelim", "nav": "tchumim", "tool": p["tool"],
        "title": p["title"] + BRAND, "description": p["description"], "og_title": p["og_title"],
        "priority": "0.7" if p["slug"] else "0.8", "crumbs": crumbs,
        "head": head, "foot": foot,
    }
    faq_html = "\n".join("  <details><summary>%s</summary><p>%s</p></details>" % (q, a) for q, a in p["faq"])
    return ("<!--meta " + json.dumps(meta, ensure_ascii=False, indent=1) + " -->\n"
            '<header class="k-hero">\n  <h1>' + p["h1"] + '</h1>\n  <p class="sub">' + p["sub"] + "</p>\n</header>\n"
            + p["body"].strip() + "\n" + TESTED + "\n"
            "<!--seo-txt-->\n"
            '<section class="k-sec seo-txt" aria-labelledby="seo-h">\n' + p["seo"].strip() + "\n</section>\n"
            '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">\n  <h2 id="seo-faq-h">שאלות ותשובות</h2>\n'
            + faq_html + "\n</section>\n<!--/seo-txt-->\n")


def load(fn):
    spec = importlib.util.spec_from_file_location(fn[:-3], os.path.join(DATA, fn))
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m.PAGE


def main(only=None):
    for fn in sorted(os.listdir(DATA)):
        if not fn.endswith(".py") or fn.startswith("_"):
            continue
        p = load(fn)
        if only and p["slug"] not in only:
            continue
        parts = ["src", "pages", "kelim", "android"] + ([p["slug"]] if p["slug"] else []) + ["index.html"]
        out = os.path.join(ROOT, *parts)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        io.open(out, "w", encoding="utf-8", newline="\n").write(page(p))
        print("wrote", os.path.relpath(out, ROOT))


if __name__ == "__main__":
    main(sys.argv[1:] or None)
