#!/usr/bin/env python3
"""מתנה ממותגת לליד מוואטסאפ: מהלוגו שנשלח ועד קישור מוכן + נוסח הודעה עם הצעת המשך.

שלושה מסלולים (להריץ אחרי python build.py, בעץ עבודה נקי מול origin/main):

1) משרד (רו"ח, עו"ד): מחשבון קיים של האתר בלוגו ובצבעי המשרד, עם כפתור "שלחו לי את התוצאה בוואטסאפ"
   python tools/make_gift.py office eran-givati --kind roe --name "ערן גבעתי, רואה חשבון" --phone 052-6399950 \
          --image C:/tmp/gift/screenshot-or-logo.jpg

2) עסק עם תפריט או מחירון (פיצרייה, מסעדה, קפה, מספרה): דף תפריט מעוצב + עגלה + הזמנה בוואטסאפ + QR לשולחן
   python tools/make_gift.py menu pizza-netivot --image C:/tmp/gift/logo.jpg      # פעם ראשונה: יוצר menu.json לדוגמה
   (עורכים את src/pages/kelim/b/<slug>/menu.json לפי התפריט שהלקוח שלח)
   python tools/make_gift.py menu pizza-netivot                                  # בונה

3) לוגו בלבד: חיתוך לוגו מתוך צילום מסך של וואטסאפ (מוריד פסים שחורים ושוליים)
   python tools/make_gift.py logo in.jpg out.png

בכל מסלול מודפסים בסוף: הקישור החי, ונוסח הודעה לליד (לאישור גילעד לפני שליחה) עם סולם ההמשך 290/590/990.
הדפים מסומנים noindex, עם GA4 ובלי פיקסל, ועוברים את הבדיקה של make_brand.py --check.
"""
import argparse, colorsys, datetime, html, json, pathlib, re, shutil, sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import make_brand as mb  # noqa: E402

ROOT, SRC_B, OUT_B, SITE = mb.ROOT, mb.SRC_B, mb.OUT_B, mb.SITE
PAY = {"290": "https://payhip.com/b/M5xC6", "590": "https://payhip.com/b/8utXB", "990": "https://payhip.com/b/bPiCF"}
log = mb.log

# ---------- ערכות לפי סוג משרד ----------
KINDS = {
    "roe": {
        "tools": ["kesef/hechzer"],
        "cta": "רוצים שנבדוק ונגיש בשבילכם את החזר המס? שלחו לנו את התוצאה ונחזור אליכם.",
        "msg": "שלום, בדקתי במחשבון החזר המס שלכם ואשמח שתחזרו אליי.",
        "tool_name": "מחשבון החזר מס",
        "more": "מחשבון מקדמות ומחשבון ברוטו-נטו",
        "client_post": "מגיע לכם החזר מס? בדיקה של חצי דקה, בחינם:",
    },
    "orech-din": {
        "tools": ["kesef/pitzuyim-pitorin"],
        "cta": "רוצים שנבדוק את הזכויות שלכם? שלחו לנו את התוצאה ונחזור אליכם.",
        "msg": "שלום, חישבתי במחשבון שלכם ואשמח שתחזרו אליי.",
        "tool_name": "מחשבון פיצויי פיטורין",
        "more": "מחשבוני הודעה מוקדמת, שעות נוספות ופדיון חופשה",
        "client_post": "פיטרו אתכם? בדיקה של דקה כמה מגיע לכם, בחינם:",
    },
}


# ---------- לוגו מתוך צילום מסך ----------
def crop_logo(src, dst):
    """צילום מסך של תמונה בוואטסאפ = פס תוכן בין שני פסים שחורים. תמונה רגילה = רק חיתוך שוליים."""
    from PIL import Image
    im = Image.open(src).convert("RGBA")
    rgb = im.convert("RGB")
    w, h = rgb.size
    px = rgb.load()

    def dark_edge(y):
        xs = list(range(0, 12)) + list(range(w - 12, w))
        return sum(sum(px[x, y]) for x in xs) / (len(xs) * 3) < 40

    rows = [not dark_edge(y) for y in range(h)]
    if rows.count(False) > h * 0.15:  # יש פסים שחורים: לוקחים את הרצועה הבהירה הארוכה ביותר
        best, s = (0, 0), None
        for i, v in enumerate(rows + [False]):
            if v and s is None:
                s = i
            if not v and s is not None:
                if i - s > best[1] - best[0]:
                    best = (s, i)
                s = None
        im = im.crop((0, best[0], w, best[1]))
        rgb = im.convert("RGB")
    # חיתוך שוליים בצבע הפינה
    bg = rgb.getpixel((2, 2))
    from PIL import ImageChops
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, bg)).convert("L").point(lambda v: 255 if v > 22 else 0)
    box = diff.getbbox()
    if box:
        p = 14
        im = im.crop((max(box[0] - p, 0), max(box[1] - p, 0), min(box[2] + p, im.width), min(box[3] + p, im.height)))
    if im.width > 640:
        im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
    dst = pathlib.Path(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, optimize=True)
    log("לוגו:", dst, im.size)
    return dst


def wa_digits(phone):
    d = re.sub(r"\D", "", phone or "")
    return "972" + d[1:] if d.startswith("0") else d


def url_of(slug, tool=""):
    return "%s/kelim/b/%s/%s" % (SITE, slug, (tool + "/") if tool else "")


def qr_png(url, dst):
    try:
        import qrcode
    except ImportError:
        log("אין ספריית qrcode (pip install qrcode): מדלג על QR")
        return None
    q = qrcode.QRCode(border=2, box_size=14, error_correction=qrcode.constants.ERROR_CORRECT_M)
    q.add_data(url); q.make(fit=True)
    q.make_image(fill_color="black", back_color="white").save(dst)
    return dst


# ---------- מסלול משרד ----------
def office(a):
    k = KINDS[a.kind]
    d = SRC_B / a.slug
    d.mkdir(parents=True, exist_ok=True)
    cfgp = d / "brand.json"
    cfg = json.loads(cfgp.read_text(encoding="utf-8")) if cfgp.exists() else {}
    if a.image:
        crop_logo(a.image, d / "logo.png")
        cfg["logo"] = "logo.png"
        cfg.pop("color", None); cfg.pop("color2", None)
    if a.name: cfg["name"] = a.name
    if a.phone: cfg["phone"] = a.phone
    cfg["whatsapp"] = a.whatsapp or cfg.get("whatsapp") or wa_digits(cfg.get("phone", ""))
    cfg.setdefault("tools", (a.tools.split(",") if a.tools else k["tools"]))
    cfg.setdefault("cta", k["cta"]); cfg.setdefault("msg", k["msg"])
    cfg.update({"plan": "290", "credit": "gift", "gift": True, "kind": a.kind,
                "gift_date": cfg.get("gift_date") or datetime.date.today().isoformat()})
    if a.color: cfg["color"] = a.color
    if a.color2: cfg["color2"] = a.color2
    cfgp.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    made = mb.build_brand(a.slug)
    link = url_of(a.slug, made[0][0])
    first = (cfg.get("name") or "").split(",")[0].split()[0] if cfg.get("name") else ""
    msg = OFFICE_MSG.format(first=first, tool=k["tool_name"], link=link, post=k["client_post"], more=k["more"], **PAY)
    finish(a.slug, link, msg)


OFFICE_MSG = """היי {first}, המתנה שלך מוכנה 🎁
{tool} בלוגו ובצבעי המשרד שלך:
{link}

איך זה מביא לך לקוחות: מי שמחשב אצלך רואה בסוף כפתור "שלחו לי את התוצאה בוואטסאפ", והפנייה מגיעה ישר אליך לטלפון, עם התוצאה שלו בפנים.

הכי פשוט להתחיל: לשלוח ללקוחות או לשים בסטטוס את השורה הזו:
"{post} {link}"

הקישור שלך בחינם, בלי הגבלת זמן. תגיד לי אם לשנות משהו בצבעים או בנוסח.
ואם תרצה להמשיך: הטמעה בתוך אתר המשרד, ועוד כלים בלוגו שלך ({more}), יש שלוש חבילות קטנות, 290 / 590 / 990 ₪ חד-פעמי. אשלח פרטים רק אם תבקש.

מיזם חסד, בלי כוונת רווח.
גילעד"""


# ---------- מסלול תפריט ----------
MENU_SAMPLE = {
    "name": "שם העסק", "tagline": "", "logo": "logo.png", "whatsapp": "9725XXXXXXXX", "phone": "",
    "address": "", "hours": "", "color": "", "color2": "", "badges": [],
    "sizes": ["אישי", "משפחתי", "ענקית"],
    "sections": [
        {"title": "פיצות", "icon": "🍕", "toppings": True, "hint": "בוחרים גודל, ואפשר להוסיף תוספות.",
         "items": [{"n": "גבינה", "p": [22, 30, 45]}]},
        {"title": "שתייה", "icon": "🥤", "items": [{"n": "פחית", "p": 8, "d": ""}]},
    ],
    "toppings": [{"title": "תוספות רגילות", "p": [3, 5, 10], "items": ["זיתים", "בצל"]}],
}


def vivid_colors(logo):
    """צבע ראשי ומשני חיים מהלוגו (לרקע כהה)."""
    from PIL import Image
    im = Image.open(logo).convert("RGBA"); im.thumbnail((120, 120))
    b = {}
    for r, g, bl, al in im.getdata():
        if al < 128: continue
        hh, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, bl / 255)
        if s < 0.5 or v < 0.45: continue
        w = b.setdefault(int(hh * 18) % 18, [0, 0, 0, 0]); w[0] += 1; w[1] += r; w[2] += g; w[3] += bl
    if not b:
        return "#e3151a", "#ffd400"
    rk = sorted(b.items(), key=lambda kv: -kv[1][0])
    hx = lambda w: "#%02x%02x%02x" % (w[1] // w[0], w[2] // w[0], w[3] // w[0])
    c1 = hx(rk[0][1])
    c2 = next((hx(w) for k, w in rk[1:] if min(abs(k - rk[0][0]), 18 - abs(k - rk[0][0])) >= 2), "#ffd400")
    return c1, c2


def menu(a):
    d = SRC_B / a.slug
    d.mkdir(parents=True, exist_ok=True)
    mp = d / "menu.json"
    if a.image:
        crop_logo(a.image, d / "logo.png")
    if not mp.exists():
        mp.write_text(json.dumps(MENU_SAMPLE, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        log("נוצר קובץ לדוגמה. ממלאים אותו לפי התפריט של הלקוח ומריצים שוב:", mp)
        return
    build_menu(a.slug)
    cfg = json.loads(mp.read_text(encoding="utf-8"))
    link = url_of(a.slug)
    finish(a.slug, link, MENU_MSG.format(name=cfg["name"], link=link, **PAY))


def build_menu(slug):
    d = SRC_B / slug
    mp = d / "menu.json"
    cfg = json.loads(mp.read_text(encoding="utf-8"))
    logo = d / cfg.get("logo", "logo.png")
    if logo.exists() and (not cfg.get("color") or not cfg.get("color2")):
        c1, c2 = vivid_colors(logo)
        cfg["color"] = cfg.get("color") or c1; cfg["color2"] = cfg.get("color2") or c2
        mp.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for sec in cfg["sections"]:
        for it in sec["items"]:
            if not it.get("n") or (it.get("p") in (None, "", []) and not cfg.get("quote")):
                raise SystemExit("מנה בלי שם או מחיר ב-" + sec["title"])
    out = OUT_B / slug
    out.mkdir(parents=True, exist_ok=True)
    logo_url = ""
    if logo.exists():
        shutil.copyfile(logo, out / logo.name)
        logo_url = "/kelim/b/%s/%s" % (slug, logo.name)
    link = url_of(slug)
    qr_png(link + "?utm_source=qr", out / "qr.png")
    v = mb.asset_v()
    e = lambda s: html.escape(s or "", quote=True)
    name, tag = cfg["name"], cfg.get("tagline", "")
    pub = {"slug": slug, "name": name, "whatsapp": cfg["whatsapp"], "sizes": cfg.get("sizes", []),
           "sections": cfg["sections"], "toppings": cfg.get("toppings", []),
           "ask_date": bool(cfg.get("ask_date")), "note_ph": cfg.get("note_ph", ""), "toppings_title": cfg.get("toppings_title", "")}
    acts = '<a class="bm-btn wa" data-bm="wa_click" href="https://wa.me/%s" target="_blank" rel="noopener">💬 וואטסאפ</a>' % e(cfg["whatsapp"])
    if cfg.get("phone"):
        acts += '<a class="bm-btn tel" data-bm="tel_click" href="tel:%s">📞 %s</a>' % (re.sub(r"[^\d+]", "", cfg["phone"]), e(cfg["phone"]))
    if cfg.get("address"):
        acts += ('<a class="bm-btn nav" data-bm="nav_click" href="https://www.google.com/maps/search/?api=1&query=%s" target="_blank" rel="noopener">📍 ניווט</a>'
                 % e(cfg["address"]).replace(" ", "+"))
    info = " · ".join(x for x in (cfg.get("address"), cfg.get("hours")) if x)
    desc = cfg.get("desc") or "התפריט של %s: מחירים מעודכנים והזמנה בוואטסאפ בלחיצה." % name
    h = f"""<!doctype html>
<html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(name)} – {e(cfg.get('title', 'תפריט והזמנה בוואטסאפ'))}</title><meta name="description" content="{e(desc)}">
<meta name="robots" content="noindex,follow"><link rel="canonical" href="{SITE}/esek/tafrit/">
<meta property="og:title" content="{e(name)} – תפריט והזמנות"><meta property="og:description" content="{e(tag or desc)}">
{'<meta property="og:image" content="%s%s">' % (SITE, logo_url) if logo_url else ''}
<meta name="theme-color" content="{'#fff4f8' if cfg.get('theme') == 'light' else '#0d0705'}"><link rel="icon" href="{logo_url or '/assets/icon-esek-192.png'}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/brand-menu.css?v={v}">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-4QR4583VST"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','G-4QR4583VST',{{brand:'{slug}'}});gtag('set',{{brand:'{slug}'}});</script>
<script type="application/json" id="hk-menu">{json.dumps(pub, ensure_ascii=False).replace("</", "<\\/")}</script>
</head>
<body class="bm hk-brand-menu{' bm-light' if cfg.get('theme') == 'light' else ''}" data-brand="{slug}" data-tool="brand_menu" style="--c:{e(cfg.get('color') or '#e3151a')};--c2:{e(cfg.get('color2') or '#ffd400')}">
<header class="bm-hero bm-wrap">
{'<div class="bm-logo"><img src="%s" alt="%s" width="440" height="190"></div><h1 class="sr">%s</h1>' % (logo_url, e(name), e(name)) if logo_url else '<h1>%s</h1>' % e(name)}
{'<div><span class="bm-tag">%s</span></div>' % e(tag) if tag else ''}
<div class="bm-badges">{''.join('<span>%s</span>' % e(b) for b in cfg.get('badges', []))}</div>
<div class="bm-acts">{acts}</div>
{'<p class="bm-info">%s</p>' % e(info) if info else ''}
</header>
<nav class="bm-nav" aria-label="חלקי התפריט"><div id="bm-nav"></div></nav>
<main id="main" class="bm-wrap"><div id="bm-menu"></div>
<footer class="bm-foot"><p>{e(cfg.get('foot', 'המחירים בשקלים וכוללים מע"מ. ייתכנו שינויים; המחיר הקובע הוא בעסק.'))}</p>
<p>נבנה באהבה במיזם הכלים · <a href="{SITE}/esek/tafrit/?utm_source=brand&utm_medium=credit&utm_campaign={slug}" target="_blank" rel="noopener" data-bm="credit_click">רוצים תפריט כזה לעסק שלכם? hakelim.com</a></p></footer>
</main>
<div class="bm-bar" id="bm-bar"><button type="button" disabled>בחרו מהתפריט</button></div>
<div class="bm-ov" id="bm-ov" role="dialog" aria-modal="true" aria-label="הזמנה"><div class="bm-sh" id="bm-sh"></div></div>
<script src="/assets/brand-menu.js?v={v}" defer></script>
</body></html>
"""
    (out / "index.html").write_text(h, encoding="utf-8")
    log("נבנה:", "/kelim/b/%s/" % slug, "+ qr.png")


MENU_MSG = """היי, המתנה של {name} מוכנה 🎁
התפריט המלא שלכם בקישור אחד, עם הזמנה בוואטסאפ:
{link}

איך זה עובד: הלקוח בוחר מנות, גודל ותוספות, רואה סכום, ולוחץ "לשלוח את ההזמנה בוואטסאפ". ההזמנה מגיעה אליכם מסודרת, בלי טעויות ובלי טלפונים.

איך מתחילים להרוויח מזה כבר היום:
1. שמים את הקישור בפרופיל הוואטסאפ, בסטטוס ובאינסטגרם.
2. מדפיסים את קוד ה-QR ששלחתי ושמים על הדלפק ועל קרטוני הפיצה.

הקישור שלכם בחינם, בלי הגבלת זמן. מחיר השתנה או נוספה מנה? כותבים לי ואני מעדכן.
ואם תרצו להמשיך (שלט QR מעוצב להדפסה, דף מבצעים, כלים נוספים בלוגו שלכם), יש שלוש חבילות קטנות, 290 / 590 / 990 ₪ חד-פעמי. אשלח פרטים רק אם תבקשו.

מיזם חסד, בלי כוונת רווח.
גילעד"""


def finish(slug, link, msg):
    mp = SRC_B / slug / "message.txt"
    mp.write_text(msg + "\n", encoding="utf-8")
    log("\nקישור:", link)
    log("נוסח ההודעה (לאישור גילעד לפני שליחה) נשמר ב-", mp)
    log("המשך: git add, PR, מיזוג; אחרי שהדף חי (200) שולחים. קישורי החבילות:", json.dumps(PAY))
    rc = mb.check()
    if rc:
        sys.exit(rc)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    o = sub.add_parser("office"); o.add_argument("slug"); o.add_argument("--kind", choices=sorted(KINDS), required=True)
    for f in ("name", "phone", "whatsapp", "image", "tools", "color", "color2"):
        o.add_argument("--" + f)
    m = sub.add_parser("menu"); m.add_argument("slug"); m.add_argument("--image")
    lg = sub.add_parser("logo"); lg.add_argument("src"); lg.add_argument("dst")
    sub.add_parser("all-menus")
    a = ap.parse_args()
    if a.cmd == "office": office(a)
    elif a.cmd == "menu": menu(a)
    elif a.cmd == "logo": crop_logo(a.src, a.dst)
    else:
        for d in sorted(SRC_B.iterdir()):
            if (d / "menu.json").exists():
                build_menu(d.name)
        sys.exit(mb.check())


if __name__ == "__main__":
    main()
