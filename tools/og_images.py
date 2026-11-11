# -*- coding: utf-8 -*-
"""תמונת שיתוף (1200x630) לכל כלי בתתי-האתרים: assets/og/<נתיב-עם-מקפים>.jpg

כשמשתפים כלי בפייסבוק או בווטסאפ רואים את השם שלו ו"בחינם · בלי הגבלה · בלי הרשמה", ולא תמונה אחת לכל האתר.
כלי עם מכסה (CHESED_PARTNER ב-build.py, למשל התמלול: 60 דקות בחודש) לא מקבל "בלי הגבלה" בתמונה.
build.py משתמש בתמונה אוטומטית אם הקובץ קיים ואין "og_image" ב-meta של הדף.

הרצה:  python tools/og_images.py            (רק תמונות שחסרות או שהשם השתנה)
        python tools/og_images.py --all      (הכול מחדש)
צריך Pillow. בלי ספריית bidi: העברית מסודרת כאן ידנית (אין בעברית חיבור אותיות, אז היפוך מספיק).
"""
import hashlib, json, pathlib, re, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "pages"
OUT = ROOT / "assets" / "og"
SKIP = {"pratiut", "privacy", "shipurim", "hitkadmut", "negishut"}
SITES = {  # שם התת-אתר וצבע הרקע שלו (כמו theme ב-build.py)
    "kelim": ("מיזם הכלים של גילעד רחמים", "#0f1d1c"), "kodesh": ("כלי קודש", "#0e1628"),
    "nefesh": ("נפש ויום-יום", "#1b1a24"), "esek": ("כלים לעסק קטן", "#1c1712"),
    "bait": ("כלים למשפחה ולבית", "#1f1915"), "kesef": ("כלים לכסף", "#11201a"),
    "limudim": ("כלים ללימודים", "#141c2b"),
}
# כלים עם מכסה בחינם: נקראים מ-CHESED_PARTNER ב-build.py, כדי שלא נכתוב עליהם "בלי הגבלה"
_bp = (ROOT / "build.py").read_text(encoding="utf-8")
LIMITED = re.findall(r'^\s*"(/[^"]+/)":', _bp.split("CHESED_PARTNER = {", 1)[1].split("}", 1)[0], re.M)
GOLD, CREAM, MUTED = "#d8b25a", "#f6f1e4", "#b9b3a2"
FONT_BOLD = [r"C:\Windows\Fonts\arialbd.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]
FONT_REG = [r"C:\Windows\Fonts\arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]


def font(paths, size):
    for p in paths:
        if pathlib.Path(p).exists():
            return ImageFont.truetype(p, size)
    raise SystemExit("לא נמצא גופן עם עברית")


LTR_RUN = re.compile(r"[A-Za-z0-9%][A-Za-z0-9.,:/+%\- ]*[A-Za-z0-9]|[A-Za-z0-9]")  # אחרי ההיפוך: רצף לועזי, כולל רווחים בין מילים לועזיות
MIRROR = str.maketrans("()[]", ")(][")


def visual(line):
    """שורה בעברית בסדר הקריאה -> סדר התצוגה משמאל לימין (מילים באנגלית ומספרים נשארים ישרים)."""
    rev = line[::-1].translate(MIRROR)
    return LTR_RUN.sub(lambda m: m.group(0)[::-1], rev)


def wrap(draw, text, fnt, width):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if draw.textlength(t, font=fnt) <= width or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def pages():
    for p in sorted(SRC.rglob("index.html")):
        raw = p.read_text(encoding="utf-8")
        m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->", raw, re.S)
        if not m:
            continue
        meta = json.loads(m.group(1))
        slug = p.parent.name
        if meta.get("site") not in SITES or meta.get("noindex") or meta.get("og_image") or slug in SKIP:
            continue
        h1 = re.search(r"<h1[^>]*>(.*?)</h1>", raw, re.S)
        name = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h1.group(1))).strip() if h1 else ""
        name = name or re.split(r"\s[–—|-]\s|:\s", meta["title"])[0].strip()
        name = re.sub(r"[^\u0000-\u05ff\u2000-\u206f״׳]", "", name).strip()   # בלי אימוג'י (אין בגופן)
        key = p.parent.relative_to(SRC).as_posix().replace("/", "-")
        if key in SITES:   # דף הבית של תת-אתר נשאר עם התמונה המעוצבת שלו
            continue
        url = "/" + p.parent.relative_to(SRC).as_posix() + "/"
        limited = any(url.startswith(l) for l in LIMITED)
        yield key, name, meta["site"], ("gsi/client" in raw or "accounts.google.com" in raw), limited


DOMAIN = "hakelim.com"
DARK = "#14110a"
# תמונות של דפי הבית של התחומים: assets/og-<תחום>.jpg (python tools/og_images.py --homes)
HOMES = {
    "kelim": ("מיזם הכלים של גילעד רחמים", "כלים דיגיטליים פשוטים לכל מי שצריך הנגשה",
              ["תמלול", "כלי קודש", "בית ומשפחה", "לימודים", "כסף", "עסק קטן"], "kelim/"),
    "kodesh": ("כלי קודש", "כלים דיגיטליים לרבנים, למוהלים ולאנשי קודש",
               ["לוח בריתות", "מחשבון תאריכים", "תמלול שיעורים", "תהילים"], "kodesh/"),
    "bait": ("כלים למשפחה ולבית", "סדר ושקט בבית, בכמה לחיצות",
             ["קניות", "תורנויות", "שבת ואורחים", "מי מביא מה"], "bait/"),
    "esek": ("כלים לעסק קטן", "כל מה שעסק קטן צריך, בלי לשלם על תוכנה",
             ["תפריט ו-QR", "מודעת מבצע", "QR מעוצב", "פתיחת עסק"], "esek/"),
    "kesef": ("כלים לכסף", "מחשבונים פשוטים לכסף של הבית",
              ["תקציב", "הלוואה", "החזר מס", "חיסכון לילדים"], "kesef/"),
    "limudim": ("כלים ללימודים", "ללמוד חכם יותר, להצליח במבחן",
                ["כרטיסיות", "תוכנית למבחן", "טיימר", "לימוד יומי"], "limudim/"),
}


def frame(d, W, H):
    d.rectangle([24, 24, W - 25, H - 25], outline=GOLD, width=3)


def domain_bar(d, W, H, path="", right="בחינם לכולם · בלי הרשמה"):
    """פס זהב בתחתית: הכתובת גדולה ובולטת משמאל, המיזם מימין."""
    top, bot = 520, H - 25
    d.rectangle([25, top, W - 26, bot], fill=GOLD)
    df = font(FONT_BOLD, 56)
    d.text((70, (top + bot) / 2), DOMAIN, font=df, fill=DARK, anchor="lm")
    if path:
        x = 70 + d.textlength(DOMAIN, font=df)
        d.text((x, (top + bot) / 2 + 4), "/" + path, font=font(FONT_REG, 34), fill="#3a2f15", anchor="lm")
    d.text((W - 70, (top + bot) / 2), visual(right), font=font(FONT_BOLD, 34), fill=DARK, anchor="rm")


def pill(d, cx, y, text, fnt, fill=None, outline=GOLD, color=GOLD, pad=26, h=60):
    tw = d.textlength(text, font=fnt)
    d.rounded_rectangle([cx - tw / 2 - pad, y, cx + tw / 2 + pad, y + h], radius=h // 2, fill=fill, outline=outline, width=3)
    d.text((cx, y + h / 2), visual(text), font=fnt, fill=color, anchor="mm")
    return tw + 2 * pad


def draw_one(key, name, site, login=False, limited=False):
    site_name, bg = SITES[site]
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(im)
    frame(d, W, H)
    d.text((W - 70, 62), visual(site_name), font=font(FONT_REG, 32), fill=GOLD, anchor="ra")
    d.text((70, 62), 'בס"ד'[::-1], font=font(FONT_REG, 26), fill=MUTED, anchor="la")
    for size in (92, 80, 70, 60, 52):
        f = font(FONT_BOLD, size)
        lines = wrap(d, name, f, W - 180)
        if len(lines) <= 2 or size == 52:
            break
    lh = int(size * 1.2)
    y = 255 - (len(lines) * lh) // 2
    for ln in lines:
        d.text((W / 2, y), visual(ln), font=f, fill=CREAM, anchor="ma")
        y += lh
    # גילעד (11.11.2026): "בתצוגה המקדימה של האתר יכנס גם בלי הגבלה ובלי הרשמה ובחינם"
    words = ["בחינם"] + ([] if limited else ["בלי הגבלה"]) + ([] if login else ["בלי הרשמה"])
    words += ["בלי פרסומות", "עובד בטלפון"][: 3 - len(words)]
    pill(d, W / 2, 410, "  ·  ".join(words), font(FONT_BOLD, 36), h=66)
    domain_bar(d, W, H, right="בחינם לכולם" if login else "בחינם לכולם · בלי הרשמה")
    im.save(OUT / f"{key}.jpg", quality=84, optimize=True)


def draw_home(site):
    title, sub, chips, path = HOMES[site]
    bg = SITES[site][1]
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(im)
    frame(d, W, H)
    d.text((70, 62), 'בס"ד'[::-1], font=font(FONT_REG, 26), fill=MUTED, anchor="la")
    if site != "kelim":
        d.text((W - 70, 62), visual(SITES["kelim"][0]), font=font(FONT_REG, 30), fill=GOLD, anchor="ra")
    for size in (96, 84, 74, 64):
        f = font(FONT_BOLD, size)
        if d.textlength(title, font=f) <= W - 160:
            break
    d.text((W / 2, 175), visual(title), font=f, fill=CREAM, anchor="mm")
    d.text((W / 2, 268), visual(sub), font=font(FONT_BOLD, 40), fill=GOLD, anchor="mm")
    # שורת דוגמאות לכלים, מימין לשמאל
    cf = font(FONT_BOLD, 30)
    widths = [d.textlength(c, font=cf) + 44 for c in chips]
    gap = 16
    while sum(widths) + gap * (len(widths) - 1) > W - 140:
        chips, widths = chips[:-1], widths[:-1]
    total = sum(widths) + gap * (len(widths) - 1)
    x = W / 2 + total / 2
    for c, w in zip(chips, widths):
        pill(d, x - w / 2, 330, c, cf, outline="#6d5d36", color=CREAM, pad=22, h=54)
        x -= w + gap
    pill(d, W / 2, 418, "בחינם  ·  בלי הגבלה  ·  בלי הרשמה", font(FONT_BOLD, 38), fill=GOLD, color=DARK, h=68)
    domain_bar(d, W, H, path, right="בלי פרסומות · עובד בטלפון")
    im.save(ROOT / "assets" / f"og-{site}.jpg", quality=86, optimize=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    if "--homes" in sys.argv:
        for site in HOMES:
            draw_home(site)
        print("home images:", len(HOMES))
    stamp = OUT / "names.json"   # שם שכבר צויר לכל קובץ: מציירים שוב רק כשהשם השתנה
    done = json.loads(stamp.read_text(encoding="utf-8")) if stamp.exists() and "--all" not in sys.argv else {}
    n = 0
    seen = {}
    for key, name, site, login, limited in pages():
        sig = hashlib.md5((name + site + str(login) + str(limited) + "v4").encode("utf-8")).hexdigest()[:10]
        seen[key] = sig
        if done.get(key) == sig and (OUT / f"{key}.jpg").exists():
            continue
        draw_one(key, name, site, login, limited)
        n += 1
    stamp.write_text(json.dumps(seen, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
    print("og images:", n, "new,", len(seen), "total")


if __name__ == "__main__":
    main()
