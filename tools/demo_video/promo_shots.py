"""צילומי טלפון אמיתיים של הכלים המרכזיים לסרטוני התדמית (15.11.2026).

  python tools/demo_video/promo_shots.py [--base https://hakelim.com]

יוצא ל-tools/demo_video/shots/promo/<name>.jpg (רוחב 780 = טלפון 390 ב-x2, עד 2400 גובה).
סצנת montage/shot במנוע מציגה אותם בתוך מסגרת טלפון וגוללת למטה לאט.
"""
import argparse
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "shots" / "promo"

PAGES = {
    "home": "/kelim/",
    "tamlul": "/kelim/tamlul/",
    "karaoke": "/kelim/shir/karaoke/",
    "pdf": "/kelim/machshev/pdf/",
    "video": "/kelim/machshev/video/",
    "korot": "/kelim/avoda/korot/",
    "taktziv": "/kesef/taktziv/",
    "tizkorot": "/kelim/briut/tizkorot/",
    "tosaf": "/kelim/machshev/chatima/tosaf/",
}

HIDE = """
  [id*=cookie],.install-bar,#install-bar,.a11y-fab,.hk-toast{display:none!important}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://hakelim.com")
    ap.add_argument("--only")
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b = pw.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 1200}, device_scale_factor=2, locale="he-IL",
                            is_mobile=True, has_touch=True)
        page = ctx.new_page()
        for name, path in PAGES.items():
            if a.only and name not in a.only.split(","):
                continue
            page.goto(a.base + path + "?utm_source=promo_shot", wait_until="networkidle", timeout=60000)
            page.add_style_tag(content=HIDE)
            page.wait_for_timeout(1200)
            png = OUT / f"{name}.png"
            page.screenshot(path=str(png), clip={"x": 0, "y": 0, "width": 390, "height": 1200}, full_page=True)
            jpg = OUT / f"{name}.jpg"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(png), "-q:v", "4", str(jpg)], check=True)
            png.unlink()
            print(name, jpg.stat().st_size // 1000, "KB")
        b.close()


if __name__ == "__main__":
    main()
