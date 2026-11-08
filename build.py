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
    # נפש ויום-יום: כלים להלומי קרב, לחרדה ולימים קשים, ולמשפחה שסביבם. כאן לא מרוויחים, תרומה בלבד.
    # כל הכלים עובדים גם בלי אינטרנט (sw.js שומר את כל הדפים), והנתונים נשארים בטלפון (localStorage).
    "nefesh": {
        "name": "נפש ויום-יום", "short": "נפש ויום-יום", "home": "/nefesh/", "theme": "#1b1a24",
        "og": "og-nefesh.jpg", "icon": "nefesh",
        "desc": "כלים שקטים לימים קשים: להלומי קרב, לחרדה, ולמשפחה שסביבם. בחינם.",
        "css": ["/assets/nefesh.css"], "js": ["/assets/nefesh.js"],
        "nav": [("rega", "/nefesh/rega/", "רגע קשה"), ("hayom", "/nefesh/hayom/", "הדבר החשוב"),
                ("koach", "/nefesh/koach/", "מד כוח"), ("yoman", "/nefesh/yoman/", "יומן קול"),
                ("mishpacha", "/nefesh/mishpacha/", "למשפחה"), ("kelim", "/nefesh/#kelim", "כל הכלים")],
    },
    # כלים לכסף: מחשבונים בלבד, לא ייעוץ. הכול בטלפון (localStorage), בלי שרת.
    "kesef": {
        "name": "כלים לכסף", "short": "כלים לכסף", "home": "/kesef/", "theme": "#11201a",
        "og": "og-kelim.jpg", "icon": "kesef",
        "desc": "מחשבונים פשוטים לכסף של הבית: תקציב, הלוואה, מנויים וחיסכון עם הילדים. בחינם.",
        "css": ["/assets/kesef.css"], "js": ["/assets/kesef.js"],
        "nav": [("taktziv", "/kesef/taktziv/", "תקציב"), ("halvaa", "/kesef/halvaa/", "הלוואה"),
                ("minuyim", "/kesef/minuyim/", "מנויים"), ("mivtza", "/kesef/mivtza/", "המבצע המשפחתי"),
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

# ---------- נפש ויום-יום: חלקים קבועים בכל כלי ----------
# הטופס "משפחת הכלים" שולח מייל לצינור הלידים. עד שגרסת הסקריפט שמזהה "כלים:" פרוסה (בלי מדריך הברית
# ובלי סדרת ההריון), ההרשמה נשמרת בטלפון ונשלחת אוטומטית בביקור הבא אחרי שזה True. פרוס: גרסה 9, 07.11.2026.
KELIM_JOIN_READY = True

NEFESH_HELP = """<aside class="help-strip" aria-label="עזרה עכשיו"><div class="in"><span>קשה עכשיו?</span><a class="rega" href="/nefesh/rega/">למסך רגע קשה ←</a><a href="tel:*8944" data-line="8944">נפש אחת <span dir="ltr">*8944</span></a><a href="tel:1201" data-line="1201">ער"ן <span dir="ltr">1201</span></a><a href="tel:*3362" data-line="3362">נט"ל <span dir="ltr">*3362</span></a></div></aside>"""

NEFESH_FOOT = """<div class="tool-foot">
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="{text}" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a></div>
  <div data-install-wrap hidden><button class="btn btn-line btn-sm" type="button" data-install>להתקין בטלפון, כמו אפליקציה</button>
    <p class="ios-tip" id="ios-tip" hidden>באייפון: לוחצים על כפתור השיתוף <b>⬆︎</b> למטה בספארי, ואז "הוספה למסך הבית". מאותו רגע זה נפתח כמו אפליקציה, גם בלי אינטרנט.</p></div>
  <p class="note" style="margin-top:.8rem"><a class="gold" href="/nefesh/">כל הכלים של נפש ויום-יום</a> · חינם · בלי הרשמה · הנתונים נשארים בטלפון שלך</p>
</div>"""

NEFESH_JOIN = """<section class="join" id="join" aria-labelledby="join-h"><div class="in">
  <h2 id="join-h">להישאר בקשר?</h2>
  <p>אם זה עזר לך, אפשר להצטרף למשפחת הכלים: מייל אחד בשבוע לכל היותר, עם כלי חדש, מילה טובה, ולפעמים הטבה. הכלים תמיד יעבדו גם בלי זה.</p>
  <form class="lead-form" id="join-form" data-ready="{ready}" action="{endpoint}" method="POST">
    <div class="hp" aria-hidden="true"><label>אל תמלאו שדה זה <input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>
    <div class="field"><label for="j-name">שם פרטי</label><input id="j-name" name="fname" type="text" autocomplete="given-name" required maxlength="40"></div>
    <div class="field"><label for="j-mail">מייל</label><input id="j-mail" name="mail" type="email" autocomplete="email" required dir="ltr" style="text-align:right" placeholder="name@gmail.com"></div>
    <label class="check"><input type="checkbox" required> <span>אני רוצה לקבל מיילים ממשפחת הכלים (כלים חדשים, עדכונים, ולפעמים הטבות). אפשר להסיר בלחיצה בכל רגע.</span></label>
    <button class="btn btn-gold btn-block" type="submit">להצטרף</button>
    <p class="privacy">נשמרים רק השם הפרטי והמייל, אצל גילעד בלבד, ולא מועברים לאף אחד. מה שכתבת בכלים עצמם לא נשלח לשום מקום. אפשר לבקש למחוק בכל רגע. <a href="/mohel/privacy/">פרטיות</a></p>
  </form>
</div></section>"""

def nefesh_blocks(html):
    html = html.replace("{{N:help}}", NEFESH_HELP)
    join = NEFESH_JOIN.format(ready="1" if KELIM_JOIN_READY else "0", endpoint=LEAD_ENDPOINT)
    html = html.replace("{{N:join:wait}}", join.replace('class="join"', 'class="join wait"', 1))
    html = html.replace("{{N:join}}", join)
    return re.sub(r"\{\{N:foot:([^}]+)\}\}", lambda m: NEFESH_FOOT.format(text=m.group(1)), html)

# ---------- כלים לכסף: פוטר קבוע בכל כלי ----------
KESEF_FOOT = """<div class="tool-foot">
  <div class="share-row"><a class="btn btn-gold btn-sm" href="#" data-share-tool="wa" data-text="{text}" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח לחבר בווטסאפ</a></div>
  <div data-install-wrap hidden><button class="btn btn-line btn-sm" type="button" data-install>להתקין בטלפון, כמו אפליקציה</button>
    <p class="ios-tip" id="ios-tip" hidden>באייפון: לוחצים על כפתור השיתוף <b>⬆︎</b> למטה בספארי, ואז "הוספה למסך הבית".</p></div>
  <p class="note" style="margin-top:.8rem"><a class="gold" href="/kesef/">כל הכלים לכסף</a> · חינם · בלי הרשמה · הנתונים נשארים בטלפון שלך</p>
</div>"""

def kesef_blocks(html):
    return re.sub(r"\{\{K:foot:([^}]+)\}\}", lambda m: KESEF_FOOT.format(text=m.group(1)), html)

pages = []
site_pages = {k: [] for k in SITES}
for path in sorted(SRC.rglob("*.html")):
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
    if not m:
        raise SystemExit(f"{path}: חסר בלוק meta")
    meta = json.loads(m.group(1))
    content = leadforms(raw[m.end():])
    if meta.get("site") == "nefesh":
        content = nefesh_blocks(content)
    if meta.get("site") == "kesef":
        content = kesef_blocks(content)
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
            "site_css": "".join(f'<link rel="stylesheet" href="{c}">' for c in site.get("css", [])),
        })
        rep["foot"] += "".join(f'<script src="{j}" defer></script>' for j in site.get("js", []))
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
                             "/assets/fonts/FrankRuhlLibre-wght.woff", "/assets/fonts/Assistant-wght.woff",
                             f"/assets/icon-{site['icon']}-192.png"] + site.get("css", []) + site.get("js", [])
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
