#!/usr/bin/env python3
"""בונה את דפי האתר מ-src/pages לתוך שורש המאגר.

כל קובץ ב-src/pages הוא HTML של התוכן בלבד, עם בלוק JSON בראשו בין
<!--meta ... -->. הסקריפט עוטף אותו ב-src/layout.html, מסמן את הדף
הנוכחי בסרגל, מוסיף פירורי לחם ו-CTA, ומייצר sitemap.xml.

הרצה:  python3 build.py
"""
import json, os, re, pathlib, datetime

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src" / "pages"
LAYOUT = (ROOT / "src" / "layout.html").read_text(encoding="utf-8")
SPRITE = (ROOT / "assets" / "icons.svg").read_text(encoding="utf-8")
BASE = "https://gilad-rachamim.github.io"
WA_TEXT = "שלום גילעד, אשמח לשמוע פרטים על ברית מילה"

from urllib.parse import quote
WA = "https://wa.me/972584049049?text=" + quote(WA_TEXT)

CTA = """
<section id="contact" class="contact" aria-labelledby="contact-h">
  <div class="wrap">
    <h2 id="contact-h">לברית מיוחדת ומלאת שמחה</h2>
    <p>מזל טוב! כתבו לי, ונתחיל להתכונן יחד. שיחת ההיכרות בחינם וללא התחייבות.</p>
    <a class="phone" href="tel:+972584049049">058-4049049</a>
    <div class="actions">
      <a class="btn btn-gold" href="{wa}"><svg class="ic"><use href="#wa"/></svg> שליחת הודעה בווטסאפ</a>
    </div>
  </div>
</section>
"""


LEADFORM = """<form class="lead-form" data-lead data-next="/mohel/todah/" action="https://formsubmit.co/gilad4049@gmail.com" method="POST">
  <input type="hidden" name="_subject" value="ליד חדש מהאתר: המדריך לקראת הולדת הבן">
  <input type="hidden" name="_template" value="table">
  <input type="hidden" name="_captcha" value="false">
  <input type="hidden" name="_next" value="https://gilad-rachamim.github.io/mohel/todah/">
  <input type="hidden" name="_autoresponse" value="שלום ומזל טוב מראש! תודה שביקשתם את המדריך המושלם להכנה לקראת הולדת הבן. אפשר להוריד אותו כאן: https://gilad-rachamim.github.io/mohel/madrich/hamadrich-lekrat-huledet-haben.pdf — יש שאלה? אני כאן בשמחה, בווטסאפ או בטלפון: 058-4049049. שלכם, גילעד רחמים אביעד, מוהל מוסמך.">
  <input type="hidden" name="מקור" value="{source}">
  <div class="hp" aria-hidden="true"><label>אל תמלאו שדה זה <input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>
  <div class="field"><label for="{p}-name">שם</label><input id="{p}-name" name="שם" type="text" autocomplete="name" required placeholder="איך קוראים לכם?"></div>
  <div class="field"><label for="{p}-phone">טלפון</label><input id="{p}-phone" name="טלפון" type="tel" inputmode="tel" autocomplete="tel" required placeholder="050-0000000" pattern="[0-9\\-\\+\\s]{{9,15}}" dir="ltr" style="text-align:right"></div>
  <div class="field"><label for="{p}-email">מייל</label><input id="{p}-email" name="email" type="email" autocomplete="email" required placeholder="name@gmail.com" dir="ltr" style="text-align:right"></div>
  <div class="field"><label for="{p}-due">מתי הלידה? <span class="opt">(לא חובה)</span></label>
    <select id="{p}-due" name="מועד הלידה"><option value="">בחרו</option><option>החודש</option><option>בעוד חודש-חודשיים</option><option>בעוד שלושה חודשים ויותר</option><option>הבן כבר נולד – מזל טוב!</option></select></div>
  <div class="field"><label for="{p}-city">עיר <span class="opt">(לא חובה)</span></label><input id="{p}-city" name="עיר" type="text" autocomplete="address-level2" placeholder="ירושלים"></div>
  <label class="check"><input type="checkbox" name="מאשר/ת קבלת עדכונים" value="כן"> <span>אשמח לקבל מגילעד טיפים ועדכונים לקראת הברית</span></label>
  <button class="btn btn-gold btn-block" type="submit">שלחו לי את המדריך</button>
  <p class="privacy">הפרטים מגיעים רק אליי ולא מועברים לאף אחד.</p>
</form>"""

def leadforms(html):
    def rep(m):
        return LEADFORM.format(source=m.group(1), p=m.group(2))
    return re.sub(r"\{\{LEADFORM:([^:]+):([a-z]+)\}\}", rep, html)

def crumbs_html(items):
    if not items:
        return ""
    parts = ['<a href="/mohel/">עמוד המוהל</a>']
    for i, (label, href) in enumerate(items):
        if href:
            parts.append(f'<span><a href="{href}">{label}</a></span>')
        else:
            parts.append(f'<span>{label}</span>')
    return '<nav class="crumbs" aria-label="פירורי לחם">' + "".join(parts) + "</nav>"

def crumbs_ld(items, url):
    if not items:
        return ""
    els = [{"@type": "ListItem", "position": 1, "name": "עמוד המוהל", "item": BASE + "/mohel/"}]
    for i, (label, href) in enumerate(items, start=2):
        els.append({"@type": "ListItem", "position": i, "name": label, "item": BASE + href if href else url})
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": els}, ensure_ascii=False) + "</script>"

pages = []
for path in sorted(SRC.rglob("*.html")):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
    if not m:
        raise SystemExit(f"{path}: חסר בלוק meta")
    meta = json.loads(m.group(1))
    content = leadforms(raw[m.end():])
    rel = path.relative_to(SRC).as_posix()            # e.g. mohel/moed/index.html
    out = ROOT / rel
    url_path = "/" + rel[:-len("index.html")] if rel.endswith("index.html") else "/" + rel
    url = BASE + url_path
    html = LAYOUT
    rep = {
        "title": meta["title"],
        "description": meta["description"],
        "url": url,
        "og_title": meta.get("og_title", meta["title"]),
        "og_image": meta.get("og_image", "og-mohel.jpg"),
        "robots": '<meta name="robots" content="noindex">' if meta.get("noindex") else "",
        "head": meta.get("head", "") + crumbs_ld(meta.get("crumbs"), url),
        "body_class": meta.get("body_class", ""),
        "sprite": SPRITE,
        "wa": WA,
        "crumbs": crumbs_html(meta.get("crumbs")),
        "content": content,
        "cta": "" if meta.get("no_cta") else CTA.format(wa=WA),
        "dock_href": meta.get("dock_href", "/mohel/madrich/"),
        "dock_label": meta.get("dock_label", "מדריך חינם"),
        "foot": meta.get("foot", "") + ('<script src="/assets/lead.js" defer></script>' if "data-lead" in content else "") + ('<script src="/assets/moed.js" defer></script>' if "moed-form" in content else ""),
    }
    for k, v in rep.items():
        html = html.replace("{{" + k + "}}", v)
    for key in ["sipur", "hachana", "moed", "madrich", "kartis"]:
        html = html.replace("{{cur:" + key + "}}", ' aria-current="page"' if meta.get("nav") == key else "")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    if not meta.get("noindex"):
        pages.append((url, meta.get("priority", "0.6")))
    print("built", url_path)

today = datetime.date.today().isoformat()
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for url, pr in pages:
    sm.append(f"  <url><loc>{url}</loc><lastmod>{today}</lastmod><priority>{pr}</priority></url>")
sm.append("</urlset>")
(ROOT / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")
print("sitemap:", len(pages), "pages")
