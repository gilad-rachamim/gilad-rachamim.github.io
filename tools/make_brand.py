#!/usr/bin/env python3
"""כלי ממותג לעסק: יוצר את הדפים הממותגים מתוך הכלים הבנויים באתר.

שימוש (אחרי python build.py, כי הוא קורא את הדפים הבנויים בשורש המאגר):
  python tools/make_brand.py <slug> --name "שם העסק" --phone 050-0000000 --whatsapp 972500000000 \
         --logo path/to/logo.png --tools kesef/hechzer,kelim/cheshbon/mikdamot --plan 290
  python tools/make_brand.py <slug>        # בונה מחדש מ-brand.json הקיים
  python tools/make_brand.py --all         # בונה מחדש את כל העסקים (כולל free = הטמעה חינם)
  python tools/make_brand.py --check       # בדיקות: noindex, canonical, GA, בלי פיקסל, בלי קישורי ניווט

מקור האמת: src/pages/kelim/b/<slug>/brand.json (+ logo.png). הפלט: kelim/b/<slug>/<כלי>/index.html (מסומן noindex,
canonical לכלי המקורי), kelim/b/<slug>/index.html (דף מרכז), embed.txt (קוד הטבעה) לצד brand.json.
בלי לוגו או בלי צבע ב-brand.json: הצבעים מחולצים מהלוגו לבד וחוזרים ל-brand.json.
slug בשם free = הטמעה חינם של הכלים הרגילים עם שורת קרדיט (בלי לוגו, בלי וואטסאפ).
"""
import argparse, colorsys, datetime, html, json, pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC_B = ROOT / "src" / "pages" / "kelim" / "b"
OUT_B = ROOT / "kelim" / "b"
SITE = "https://hakelim.com"
DISCLAIMER = "החישוב הוא הערכה כללית ואינו ייעוץ מקצועי. לפני החלטה כדאי להתייעץ עם איש מקצוע."


sys.stdout.reconfigure(encoding="utf-8")


def log(*a):
    print(*a, flush=True)


# ---------- צבעים מהלוגו ----------
def colors_from_logo(path):
    from PIL import Image
    im = Image.open(path).convert("RGBA")
    im.thumbnail((96, 96))
    buckets = {}
    for r, g, b, a in im.getdata():
        if a < 128:
            continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if s < 0.25 or v < 0.2 or v > 0.97:  # אפור, שחור או לבן: לא צבע מותג
            continue
        key = (int(h * 24) % 24, int(s * 3), int(v * 3))
        w = buckets.setdefault(key, [0, 0, 0, 0])
        w[0] += 1; w[1] += r; w[2] += g; w[3] += b
    if not buckets:
        return "#1d4e89", "#f2b705"
    ranked = sorted(buckets.items(), key=lambda kv: -kv[1][0])

    def hexof(w):
        n = w[0]
        return "#%02x%02x%02x" % (w[1] // n, w[2] // n, w[3] // n)

    main = ranked[0]
    c1 = hexof(main[1])
    c2 = None
    for key, w in ranked[1:]:
        dh = min(abs(key[0] - main[0][0]), 24 - abs(key[0] - main[0][0]))
        if dh >= 3 and w[0] >= 0.05 * main[1][0]:
            c2 = hexof(w); break
    if not c2:  # אין צבע שני בלוגו: משלים בגוון הפוך
        h, s, v = colorsys.rgb_to_hsv(*[int(c1[i:i + 2], 16) / 255 for i in (1, 3, 5)])
        r, g, b = colorsys.hsv_to_rgb((h + 0.5) % 1, max(s, 0.6), 0.95)
        c2 = "#%02x%02x%02x" % (int(r * 255), int(g * 255), int(b * 255))
    return darken_for_text(c1), c2


def _lum(hexc):
    n = int(hexc[1:], 16)
    c = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
    c = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def darken_for_text(hexc):
    """צבע ראשי שישמש גם לכותרות על רקע לבן: מכהים עד ניגודיות 4.5 לפחות."""
    n = int(hexc[1:], 16)
    r, g, b = n >> 16 & 255, n >> 8 & 255, n & 255
    for _ in range(30):
        if (1.05) / (_lum("#%02x%02x%02x" % (r, g, b)) + 0.05) >= 4.5:
            break
        r, g, b = int(r * 0.92), int(g * 0.92), int(b * 0.92)
    return "#%02x%02x%02x" % (r, g, b)


# ---------- שינוי הדף הבנוי ----------
def strip_page(h, brand, tool_path, tool_slug):
    h = re.sub(r"<header class=\"topbar\">.*?</header>", "", h, flags=re.S)
    h = re.sub(r"<div id=\"hk-search\"[^>]*></div>", "", h)
    h = re.sub(r"<nav class=\"crumbs\".*?</nav>", "", h, flags=re.S)
    h = re.sub(r"<div class=\"chesed[^\"]*\"[^>]*>.*?</div>", "", h, flags=re.S)
    h = re.sub(r"<section class=\"k-sec dv-sec.*?</section>", "", h, flags=re.S)  # סרטון הדגמה של האתר
    # מהסוף של הכלי עד סוף main: וידאו, טקסט SEO, שאלות ותשובות, כלים קשורים
    end = h.find("</main>")
    cuts = [i for i in (h.find("<style>.dv-sec"), h.find('<section class="k-sec seo-txt"')) if 0 < i < end]
    if not cuts:
        raise SystemExit("לא נמצא סוף הכלי ב-" + tool_path)
    h = h[:min(cuts)] + h[end:]
    h = re.sub(r"<section class=\"fb no-print\".*?</footer>", "", h, flags=re.S)
    h = re.sub(r"<div class=\"install-bar\".*?</div>\s*", "", h, flags=re.S)
    h = re.sub(r"<script>document\.addEventListener\('click',function\(e\)\{var a=e\.target\.closest\('\[data-ft\]'\).*?</script>", "", h, flags=re.S)
    for js in ("hakraa-daf", "search", "discover", "discover2", "helper"):
        h = re.sub(r"<script src=\"/assets/%s\.js[^\"]*\" defer></script>\s*" % js, "", h)
    h = re.sub(r"<script>!function\(f,b,e,v,n,t,s\)\{if\(f\.fbq\).*?</script>", "", h, flags=re.S)  # בלי פיקסל מטא אצל לקוחות העסק
    h = re.sub(r"<noscript><img[^>]*facebook\.com/tr[^>]*></noscript>", "", h)
    h = re.sub(r"<script type=\"application/ld\+json\">.*?</script>", "", h, flags=re.S)
    h = re.sub(r"<link rel=\"(manifest|apple-touch-icon|icon)\"[^>]*>", "", h)
    h = re.sub(r"<meta name=\"robots\"[^>]*>", "", h)
    h = re.sub(r"<link rel=\"stylesheet\" href=\"/assets/search\.css[^\"]*\">", "", h)
    return h


def inject(h, brand, tool_slug):
    mode = brand["mode"]
    name = brand.get("name", "")
    h = re.sub(r"<title>(.*?)</title>", lambda m: "<title>%s</title>" % html.escape(
        (m.group(1).split(" | ")[0] + (" – " + name if name else "")), quote=False), h, count=1, flags=re.S)
    h = h.replace("<body ", '<body data-brand="%s" ' % html.escape(brand["slug"]), 1)
    head = ('<meta name="robots" content="noindex,follow">'
            '<link rel="stylesheet" href="/assets/brand.css?v=%s">'
            "<script>if(/[?&]embed=1/.test(location.search))document.documentElement.className+=' hk-embed';</script>"
            '<script type="application/json" id="hk-brand">%s</script>'
            % (brand["_v"], json.dumps(brand["_pub"], ensure_ascii=False).replace("</", "<\\/")))
    h = h.replace("</head>", head + "</head>", 1)
    h = h.replace("</body>", '<script src="/assets/brand.js?v=%s" defer></script>\n</body>' % brand["_v"], 1)
    # GA4: תג העסק על כל אירוע בדף
    h = h.replace("gtag('config','G-4QR4583VST');",
                  "gtag('config','G-4QR4583VST',{brand:'%s'});gtag('set',{brand:'%s'});" % (brand["slug"], brand["slug"]), 1)
    return h


def asset_v():
    return datetime.date.today().strftime("%Y%m%d")


def tool_slug(tool_path):
    return tool_path.rstrip("/").rsplit("/", 1)[-1]


def build_brand(slug):
    src = SRC_B / slug
    cfg_path = src / "brand.json"
    if not cfg_path.exists():
        raise SystemExit("אין brand.json ב-" + str(src))
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    free = slug == "free"
    plan = str(cfg.get("plan", "free" if free else "290"))
    mode = "free" if free else ("gift" if plan == "0" else "brand")
    logo = src / cfg["logo"] if cfg.get("logo") else None
    changed = False
    if mode == "brand" and logo and logo.exists() and (not cfg.get("color") or not cfg.get("color2")):
        c1, c2 = colors_from_logo(logo)
        cfg.setdefault("color", c1); cfg.setdefault("color2", c2); changed = True
        log("צבעים מהלוגו:", cfg["color"], cfg["color2"])
    if mode == "brand" and not cfg.get("color"):
        cfg["color"], cfg["color2"] = "#1d4e89", "#f2b705"; changed = True
    if changed:
        cfg_path.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    out = OUT_B / slug
    out.mkdir(parents=True, exist_ok=True)
    logo_url = ""
    if logo and logo.exists():
        shutil.copyfile(logo, out / logo.name)
        logo_url = "/kelim/b/%s/%s" % (slug, logo.name)
    tools = cfg.get("tools", [])
    seen = {}
    for t in tools:
        s = tool_slug(t)
        if s in seen:
            raise SystemExit("שני כלים עם אותו שם בקישור: %s ו-%s" % (seen[s], t))
        seen[s] = t
    v = asset_v()
    made = []
    for t in tools:
        built = ROOT / t.strip("/") / "index.html"
        if not built.exists():
            raise SystemExit("הכלי לא בנוי (להריץ build.py): " + str(built))
        h = built.read_text(encoding="utf-8")
        s = tool_slug(t)
        pub = {"slug": slug, "mode": mode, "name": cfg.get("name", ""), "phone": cfg.get("phone", ""),
               "whatsapp": cfg.get("whatsapp", ""), "color": cfg.get("color", ""), "color2": cfg.get("color2", ""),
               "cta": cfg.get("cta", ""), "msg": cfg.get("msg", ""), "logo_url": logo_url, "plan": plan,
               "credit": cfg.get("credit", "small"), "demo": bool(cfg.get("demo")), "canonical": "%s/%s/" % (SITE, t.strip("/")),
               "disclaimer": cfg.get("disclaimer", DISCLAIMER if t.split("/")[0] in ("kesef", "kelim") and mode != "free" else "")}
        brand = {"slug": slug, "mode": mode, "name": cfg.get("name", ""), "_v": v, "_pub": pub}
        h = strip_page(h, brand, t, s)
        h = inject(h, brand, s)
        d = out / s
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(h, encoding="utf-8")
        made.append((s, t))
        log("נבנה:", "/kelim/b/%s/%s/" % (slug, s))
    if mode != "free":
        write_hub(out, slug, cfg, made, mode, logo_url, v)
    write_embed(src, slug, cfg, made)
    return made


def write_hub(out, slug, cfg, made, mode, logo_url, v):
    pub = {"slug": slug, "mode": "hub", "name": cfg.get("name", ""), "phone": cfg.get("phone", ""), "color": cfg.get("color", "#1d4e89"),
           "color2": cfg.get("color2", "#f2b705"), "logo_url": logo_url, "credit": cfg.get("credit", "small"), "demo": bool(cfg.get("demo")),
           "canonical": SITE + "/kelim/"}
    cards = "".join('<a href="/kelim/b/%s/%s/">%s</a>' % (slug, s, html.escape(LABELS.get(t, s))) for s, t in made)
    h = ('<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
         "<title>%s: הכלים שלנו</title><meta name=\"robots\" content=\"noindex,follow\"><link rel=\"canonical\" href=\"%s/kelim/\">"
         '<link rel="stylesheet" href="/assets/site.css"><link rel="stylesheet" href="/assets/kelim.css"><link rel="stylesheet" href="/assets/brand.css?v=%s">'
         "<script async src=\"https://www.googletagmanager.com/gtag/js?id=G-4QR4583VST\"></script>"
         "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-4QR4583VST',{brand:'%s'});</script>"
         "<script>if(/[?&]embed=1/.test(location.search))document.documentElement.className+=' hk-embed';</script>"
         '<script type="application/json" id="hk-brand">%s</script></head>'
         '<body class="site-kelim" data-brand="%s" data-tool="brand_hub"><main id="main"><header class="k-hero"><h1>%s: הכלים שלנו</h1>'
         '<p class="sub">כלים חינמיים לחישוב, בלי הרשמה. בוחרים כלי ומתחילים.</p></header><div class="hk-hub">%s</div></main>'
         '<script src="/assets/brand.js?v=%s" defer></script></body></html>'
         % (html.escape(cfg.get("name", "")), SITE, v, slug, json.dumps(pub, ensure_ascii=False).replace("</", "<\\/"), slug,
            html.escape(cfg.get("name", "")), cards, v))
    (out / "index.html").write_text(h, encoding="utf-8")


LABELS = {"esek/tafrit": "תפריט דיגיטלי עם QR", "esek/tmchur-mana": "מחשבון תמחור מנה", "esek/hazmana-vatsap": "קישור הזמנה בוואטסאפ", "kesef/hechzer": "בדיקת החזר מס", "kelim/cheshbon/mikdamot": "מחשבון מקדמות מס הכנסה"}


def write_embed(src, slug, cfg, made):
    lines = ["קוד הטמעה לאתר של " + (cfg.get("name") or slug) + " (מדביקים במקום שרוצים שהכלי יופיע; וורדפרס: בלוק HTML מותאם, וויקס: הטמעת קוד):", ""]
    for s, t in made:
        lines.append("--- %s ---" % LABELS.get(t, s))
        lines.append('<iframe src="%s/kelim/b/%s/%s/?embed=1" data-hk-embed title="%s" loading="lazy" '
                     'style="width:100%%;max-width:720px;height:640px;border:0;display:block;margin:0 auto"></iframe>'
                     % (SITE, slug, s, html.escape(LABELS.get(t, s))))
        lines.append("")
    lines.append('<script src="%s/assets/hk-embed.js" defer></script>   <!-- פעם אחת בדף: מתאים את הגובה לבד -->' % SITE)
    (src / "embed.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def check():
    bad = 0
    for p in sorted(OUT_B.rglob("index.html")):
        h = p.read_text(encoding="utf-8")
        rel = p.relative_to(ROOT).as_posix()
        probs = []
        if 'name="robots" content="noindex' not in h: probs.append("אין noindex")
        if not re.search(r'<link rel="canonical" href="https://hakelim\.com/', h): probs.append("אין canonical")
        if "G-4QR4583VST" not in h: probs.append("אין GA4")
        if "fbq(" in h: probs.append("פיקסל מטא")
        if "github.io" in h.replace("O=\"gilad-rachamim.github.io\"", ""): probs.append("קישור github.io")
        if 'class="topbar"' in h or 'class="site-foot' in h: probs.append("נשאר ניווט של האתר")
        if "hk-brand" not in h: probs.append("אין שכבת מיתוג")
        for pr in probs:
            bad += 1; log("❌", rel, pr)
    log("בדיקה:", "תקין" if not bad else "%d בעיות" % bad)
    return 1 if bad else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--name"); ap.add_argument("--phone"); ap.add_argument("--whatsapp"); ap.add_argument("--logo")
    ap.add_argument("--tools"); ap.add_argument("--plan"); ap.add_argument("--cta")
    a = ap.parse_args()
    if a.check:
        sys.exit(check())
    if a.all:
        for d in sorted(SRC_B.iterdir()):
            if (d / "brand.json").exists():
                build_brand(d.name)
        sys.exit(check())
    if not a.slug:
        ap.error("חסר slug")
    d = SRC_B / a.slug
    d.mkdir(parents=True, exist_ok=True)
    cfgp = d / "brand.json"
    cfg = json.loads(cfgp.read_text(encoding="utf-8")) if cfgp.exists() else {}
    for k in ("name", "phone", "whatsapp", "plan", "cta"):
        if getattr(a, k):
            cfg[k] = getattr(a, k)
    if a.tools:
        cfg["tools"] = [t.strip() for t in a.tools.split(",") if t.strip()]
    if a.logo:
        lp = pathlib.Path(a.logo)
        shutil.copyfile(lp, d / ("logo" + lp.suffix.lower()))
        cfg["logo"] = "logo" + lp.suffix.lower()
        cfg.pop("color", None); cfg.pop("color2", None)  # חילוץ מחדש מהלוגו החדש
    cfgp.write_text(json.dumps(cfg, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    build_brand(a.slug)
    sys.exit(check())


if __name__ == "__main__":
    main()
