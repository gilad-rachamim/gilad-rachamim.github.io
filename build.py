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
# תת-אתרים של "הכלים של גילעד רחמים" (meta "site"): תבנית משותפת, ניווט, צבעים ופוטר משלהם.
# דף בלי "site" = אתר המוהל, בדיוק כמו קודם.
LAYOUT_KELIM = (ROOT / "src" / "layout-kelim.html").read_text(encoding="utf-8")
SITES = {
    "kelim": {
        "name": "הכלים של גילעד רחמים", "short": "הכלים", "home": "/kelim/", "theme": "#0f1d1c",
        "og": "og-kelim.jpg", "icon": "kelim",
        "desc": "כלים פשוטים, בחינם, לכל מי שצריך הנגשה",
        "nav": [("tchumim", "/kelim/#tchumim", "התחומים"), ("tamlul", "/kelim/tamlul/", "תמלול"),
                ("kodesh", "/kodesh/", "כלי קודש"), ("rotzim", "/kelim/#rotzim", "רוצים כלי?"),
                ("litmoch", "/kelim/#litmoch", "לתמוך"), ("mi", "/kelim/#mi", "מי אני")],
    },
    "kodesh": {
        "name": "כלי קודש", "short": "כלי קודש", "home": "/kodesh/", "theme": "#0e1628",
        "og": "og-kodesh.jpg", "icon": "kodesh",
        "desc": "כלים דיגיטליים לאנשי קודש, בחינם",
        "nav": [("rabanim", "/kodesh/#rabanim", "לרבנים"), ("taarichim", "/kodesh/taarichim/", "מחשבון תאריכים"),
                ("mohalim", "/kodesh/mohalim/", "למוהלים"), ("tamlul", "/kelim/tamlul/", "תמלול"),
                ("kelim", "/kelim/", "כל הכלים")],
    },
}
SPRITE = (ROOT / "assets" / "icons.svg").read_text(encoding="utf-8")
BASE = "https://gilad-rachamim.github.io"
# מזהה Google Analytics 4 (G-XXXXXXXXXX). ריק = בלי מעקב.
GA_ID = "G-4QR4583VST"
# כתובת ה-Web App של צינור הלידים (tools/leads-apps-script.gs, פריסה כ-Web app).
LEAD_ENDPOINT = "https://script.google.com/macros/s/AKfycbxgWe4xxaclqfzmOD_E0hOg2XDr2genZZyvAcf0hpHw_AHkgvQAqDop-XjdURdARYNx-Q/exec"
GA = "" if not GA_ID else f"""<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA_ID}');</script>
<script src="/assets/track.js" defer></script>
"""
WA_TEXT = "שלום גילעד, אשמח לשמוע פרטים על ברית מילה"

from urllib.parse import quote
WA = "https://wa.me/972584049049?text=" + quote(WA_TEXT)

CTA = """
<section id="contact" class="contact" aria-labelledby="contact-h">
  <div class="wrap">
    <h2 id="contact-h">לברית מיוחדת ומלאת שמחה</h2>
    <p>מזל טוב! כתבו לי, ונתחיל להתכונן יחד. שיחת ההיכרות בחינם וללא התחייבות.</p>
    <a class="phone" href="tel:+972584049049">058-404-9049</a>
    <div class="actions">
      <a class="btn btn-gold" href="{wa}"><svg class="ic"><use href="#wa"/></svg> שליחת הודעה בווטסאפ</a>
    </div>
  </div>
</section>
"""


LEADFORM = """<form class="lead-form" data-lead data-next="/mohel/todah/" action="{endpoint}" method="POST">
  <input type="hidden" name="מקור" value="{source}">
  <input type="hidden" name="_page" value="">
  <input type="hidden" name="utm_source" value=""><input type="hidden" name="utm_medium" value=""><input type="hidden" name="utm_campaign" value=""><input type="hidden" name="ref" value="">
  <div class="hp" aria-hidden="true"><label>אל תמלאו שדה זה <input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>
  <div class="field"><label for="{p}-name">שם</label><input id="{p}-name" name="שם" type="text" autocomplete="name" required placeholder="איך קוראים לכם?"></div>
  <div class="field"><label for="{p}-email">מייל <span class="opt">(לכאן נשלח המדריך)</span></label><input id="{p}-email" name="email" type="email" autocomplete="email" required placeholder="name@gmail.com" dir="ltr" style="text-align:right"></div>
  <div class="field"><label for="{p}-phone">טלפון <span class="opt">(לא חובה, אם תרצו גם בווטסאפ)</span></label><input id="{p}-phone" name="טלפון" type="tel" inputmode="tel" autocomplete="tel" placeholder="050-0000000" pattern="[0-9\\-\\+\\s]{{9,15}}" dir="ltr" style="text-align:right"></div>
  <label class="check"><input type="checkbox" name="מאשר/ת קבלת עדכונים" value="כן"> <span>אשמח לקבל עוד כמה טיפים קצרים במייל. אפשר להפסיק בכל רגע.</span></label>
  <button class="btn btn-gold btn-block" type="submit">שלח לי את המדריך (חינם)</button>
  <p class="privacy">נפתח מיד, נשלח למייל, ואם תרצו – גם לווטסאפ.<br>הפרטים נשמרים אצלי בלבד ולא מועברים לאף אחד. הם משמשים רק כדי לשלוח את המדריך ולענות לכם, ואפשר לבקש לראות, לתקן או למחוק אותם בכל רגע. <a href="/mohel/privacy/">פרטיות</a></p>
</form>"""

def leadforms(html):
    def rep(m):
        return LEADFORM.format(source=m.group(1), p=m.group(2), endpoint=LEAD_ENDPOINT)
    return re.sub(r"\{\{LEADFORM:([^:]+):([a-z]+)\}\}", rep, html)

def crumbs_html(items, root=("עמוד המוהל", "/mohel/")):
    if not items:
        return ""
    parts = [f'<a href="{root[1]}">{root[0]}</a>']
    for i, (label, href) in enumerate(items):
        if href:
            parts.append(f'<span><a href="{href}">{label}</a></span>')
        else:
            parts.append(f'<span>{label}</span>')
    return '<nav class="crumbs" aria-label="פירורי לחם">' + "".join(parts) + "</nav>"

def crumbs_ld(items, url, root=("עמוד המוהל", "/mohel/")):
    if not items:
        return ""
    els = [{"@type": "ListItem", "position": 1, "name": root[0], "item": BASE + root[1]}]
    for i, (label, href) in enumerate(items, start=2):
        els.append({"@type": "ListItem", "position": i, "name": label, "item": BASE + href if href else url})
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": els}, ensure_ascii=False) + "</script>"

pages = []
site_pages = {k: [] for k in SITES}
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
    site = SITES.get(meta.get("site", ""))
    root = (site["name"], site["home"]) if site else ("עמוד המוהל", "/mohel/")
    html = LAYOUT_KELIM if site else LAYOUT
    rep = {
        "title": meta["title"],
        "description": meta["description"],
        "url": url,
        "og_title": meta.get("og_title", meta["title"]),
        "og_image": meta.get("og_image", site["og"] if site else "og-mohel.jpg"),
        "robots": '<meta name="robots" content="noindex">' if meta.get("noindex") else "",
        "head": GA + meta.get("head", "") + crumbs_ld(meta.get("crumbs"), url, root),
        "body_class": meta.get("body_class", ""),
        "sprite": SPRITE,
        "wa": WA,
        "crumbs": crumbs_html(meta.get("crumbs"), root),
        "content": content,
        "cta": "" if (meta.get("no_cta") or site) else CTA.format(wa=WA),
        "dock_href": meta.get("dock_href", "/mohel/madrich/"),
        "dock_label": meta.get("dock_label", "מדריך חינם"),
        "foot": meta.get("foot", "") + ('<script src="/assets/lead.js" defer></script>' if "data-lead" in content else "") + ('<script src="/assets/moed.js" defer></script>' if "moed-form" in content else "") + ('<script src="/assets/yt.js" defer></script>' if 'class="yt"' in content else ""),
    }
    if site:
        key = meta["site"]
        # גרשיים בתוך מאפיין HTML (content="...") שוברים אותו: בתת-האתרים הופכים " ל-״ (שו"ת → שו״ת)
        for k in ("title", "description", "og_title"):
            rep[k] = rep[k].replace('"', "״")
        rep.update({
            "site": key, "site_name": site["name"], "site_short": site["short"], "site_home": site["home"],
            "theme": site["theme"], "site_desc": site["desc"],
            "nav": "".join(f'<a href="{h}"' + (' aria-current="page"' if meta.get("nav") == k else "") + f'>{l}</a>' for k, h, l in site["nav"]),
            "tool": meta.get("tool", ""),
            "lead_endpoint": LEAD_ENDPOINT,
        })
        site_pages[key].append(url_path)
    for k, v in rep.items():
        html = html.replace("{{" + k + "}}", v)
    for key in ["yerushalaim", "sipur", "hachana", "moed", "madrich", "kartis"]:
        html = html.replace("{{cur:" + key + "}}", ' aria-current="page"' if meta.get("nav") == key else "")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    if not meta.get("noindex"):
        pages.append((url, meta.get("priority", "0.6")))
    print("built", url_path)

# PWA לכל תת-אתר: manifest + service worker בתיקייה של התת-אתר (הטווח שלו = התיקייה).
SW_SRC = (ROOT / "src" / "sw.js").read_text(encoding="utf-8")
for key, site in SITES.items():
    d = ROOT / key
    d.mkdir(exist_ok=True)
    man = {
        "name": site["name"], "short_name": site["short"], "description": site["desc"],
        "id": site["home"], "start_url": site["home"] + "?utm_source=pwa", "scope": site["home"],
        "display": "standalone", "background_color": site["theme"], "theme_color": site["theme"],
        "dir": "rtl", "lang": "he",
        "icons": [{"src": f"/assets/icon-{site['icon']}-192.png", "sizes": "192x192", "type": "image/png"},
                  {"src": f"/assets/icon-{site['icon']}-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}],
    }
    (d / "manifest.webmanifest").write_text(json.dumps(man, ensure_ascii=False, indent=1), encoding="utf-8")
    pre = site_pages[key] + ["/assets/site.css", "/assets/kelim.css", "/assets/kelim.js", "/assets/track.js",
                             "/assets/fonts/FrankRuhlLibre-wght.woff", "/assets/fonts/Assistant-wght.woff"]
    ver = datetime.datetime.now().strftime("%Y%m%d%H%M")
    (d / "sw.js").write_text(SW_SRC.replace("__CACHE__", f"{key}-{ver}").replace("__PRECACHE__", json.dumps(pre)), encoding="utf-8")
    print(f"pwa {key}: {len(site_pages[key])} pages")

today = datetime.date.today().isoformat()
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for url, pr in pages:
    sm.append(f"  <url><loc>{url}</loc><lastmod>{today}</lastmod><priority>{pr}</priority></url>")
sm.append("</urlset>")
(ROOT / "sitemap.xml").write_text("\n".join(sm) + "\n", encoding="utf-8")
print("sitemap:", len(pages), "pages")
