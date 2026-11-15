"""פרוספקט PDF (A4) מתוך tools/demo_video/prospekt/<id>.html – 14.11.2026.

  python tools/demo_video/pdf.py kita_portal https://hakelim.com/limudim/kita/?utm_source=prospekt&utm_medium=pdf

מכניס QR (SVG, בלי PIL) במקום {{QR}}, בודק שאין גלישה באף עמוד (WARN), ושומר ל-assets/demo/<id>.pdf
ותמונת תצוגה לכל עמוד ל-assets/demo/<id>-pdf-<n>.png (לא נכנס לאתר – רק לבדיקה ולאישור).
"""
import sys
import tempfile
from pathlib import Path

import qrcode
import qrcode.image.svg

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent


def main():
    pid, url = sys.argv[1], sys.argv[2]
    src = HERE / "prospekt" / f"{pid}.html"
    img = qrcode.make(url, image_factory=qrcode.image.svg.SvgPathImage, border=1, error_correction=qrcode.constants.ERROR_CORRECT_M)
    svg = img.to_string(encoding="unicode")
    html = src.read_text(encoding="utf-8").replace("{{QR}}", svg)
    tmp = HERE / "prospekt" / f".{pid}.tmp.html"  # באותה תיקייה, כדי שהנתיבים לגופנים ולצילומים יעבדו
    tmp.write_text(html, encoding="utf-8")
    out = ROOT / "assets" / "demo" / f"{pid}.pdf"
    prev = Path(tempfile.gettempdir()) / f"{pid}-pdf"
    prev.mkdir(exist_ok=True)
    from playwright.sync_api import sync_playwright
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={"width": 794, "height": 1123}, device_scale_factor=2)
            pg.goto(tmp.as_uri())
            pg.evaluate("document.fonts.ready")
            pg.wait_for_timeout(500)
            over = pg.evaluate("""() => [...document.querySelectorAll('.page')].map((p, i) => {
                const b = p.getBoundingClientRect().bottom, f = p.querySelector('.foot');
                let m = 0; p.querySelectorAll('.body > *').forEach(e => { m = Math.max(m, e.getBoundingClientRect().bottom); });
                return {i: i + 1, gap: Math.round((f ? f.getBoundingClientRect().top : b) - m), sh: p.scrollHeight, ch: p.clientHeight};
            })""")
            for o in over:
                bad = o["gap"] < 0 or o["sh"] > o["ch"] + 1
                print(("WARN overflow" if bad else "ok") + f" page {o['i']}: free {o['gap']}px above the footer")
            pg.pdf(path=str(out), format="A4", print_background=True, margin={"top": "0", "bottom": "0", "left": "0", "right": "0"})
            for i, el in enumerate(pg.query_selector_all(".page"), 1):
                el.screenshot(path=str(prev / f"page{i}.png"))
            b.close()
    finally:
        tmp.unlink(missing_ok=True)
    print(f"pdf: {out} {out.stat().st_size/1e3:.0f}KB · previews: {prev}")


if __name__ == "__main__":
    main()
