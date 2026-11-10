# -*- coding: utf-8 -*-
"""תמונת שיתוף (1200x630) לכל כלי בתתי-האתרים: assets/og/<נתיב-עם-מקפים>.jpg

כשמשתפים כלי בפייסבוק או בווטסאפ רואים את השם שלו ו"בחינם · בלי הרשמה", ולא תמונה אחת לכל האתר.
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
    "kelim": ("הכלים של גילעד רחמים", "#0f1d1c"), "kodesh": ("כלי קודש", "#0e1628"),
    "nefesh": ("נפש ויום-יום", "#1b1a24"), "esek": ("כלים לעסק קטן", "#1c1712"),
    "bait": ("כלים למשפחה ולבית", "#1f1915"), "kesef": ("כלים לכסף", "#11201a"),
    "limudim": ("כלים ללימודים", "#141c2b"),
}
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
        yield key, name, meta["site"], ("gsi/client" in raw or "accounts.google.com" in raw)


def draw_one(key, name, site, login=False):
    site_name, bg = SITES[site]
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(im)
    d.rectangle([24, 24, W - 25, H - 25], outline=GOLD, width=3)
    d.text((W - 80, 70), visual(site_name), font=font(FONT_REG, 34), fill=GOLD, anchor="ra")
    d.text((80, 70), 'בס"ד'[::-1], font=font(FONT_REG, 26), fill=MUTED, anchor="la")
    for size in (96, 84, 72, 62, 54):
        f = font(FONT_BOLD, size)
        lines = wrap(d, name, f, W - 180)
        if len(lines) <= 3:
            break
    lh = int(size * 1.22)
    y = 300 - (len(lines) * lh) // 2
    for ln in lines:
        d.text((W / 2, y), visual(ln), font=f, fill=CREAM, anchor="ma")
        y += lh
    tag = "בחינם  ·  בלי פרסומות  ·  עובד בטלפון" if login else "בחינם  ·  בלי הרשמה  ·  עובד בטלפון"
    tf = font(FONT_BOLD, 40)
    tw = d.textlength(tag, font=tf)
    d.rounded_rectangle([W / 2 - tw / 2 - 36, 468, W / 2 + tw / 2 + 36, 544], radius=38, fill=GOLD)
    d.text((W / 2, 484), visual(tag), font=tf, fill="#14110a", anchor="ma")
    im.save(OUT / f"{key}.jpg", quality=82, optimize=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    stamp = OUT / "names.json"   # שם שכבר צויר לכל קובץ: מציירים שוב רק כשהשם השתנה
    done = json.loads(stamp.read_text(encoding="utf-8")) if stamp.exists() and "--all" not in sys.argv else {}
    n = 0
    seen = {}
    for key, name, site, login in pages():
        sig = hashlib.md5((name + site + str(login)).encode("utf-8")).hexdigest()[:10]
        seen[key] = sig
        if done.get(key) == sig and (OUT / f"{key}.jpg").exists():
            continue
        draw_one(key, name, site, login)
        n += 1
    stamp.write_text(json.dumps(seen, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")
    print("og images:", n, "new,", len(seen), "total")


if __name__ == "__main__":
    main()
