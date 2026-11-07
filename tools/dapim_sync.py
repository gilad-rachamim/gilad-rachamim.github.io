#!/usr/bin/env python3
"""מעתיק את דפי הברית הסופיים מהתיקייה של גילעד אל mohel/dapim/ ומפיק תמונות תצוגה.

הרצה (בלי -I, כי Pillow יושב בתיקיית המשתמש):  python tools/dapim_sync.py
דף חדש שאושר: מוסיפים שורה ל-SHEETS וכרטיס ל-src/pages/mohel/dapim/index.html.
דף שתוקן: מריצים שוב, ומפרסמים.
"""
import pathlib, shutil
from PIL import Image

SRC = pathlib.Path.home() / "OneDrive - Michlelet Orot Israel/Documents/12. ברית מילה ומוהלות/סדר הברית ופיוטים/העיצוב שלי 2026"
OUT = pathlib.Path(__file__).resolve().parent.parent / "mohel" / "dapim"

SHEETS = {
    "seder-sefaradi": "סדר ברית מילה - נוסח ספרדי",
    "seder-edot-hamizrach": "סדר ברית מילה - נוסח עדות המזרח",
    "seder-ashkenaz": "סדר ברית מילה - נוסח אשכנז",
    "shiron": "שירון ופיוטים לברית",
    "shiron-ashkenaz": "שירון לברית - נוסח אשכנז",
    "tefila-sandak": "תפילה לסנדק",
    "tefila-bechi": "תפילה בשעת בכי התינוק",
    "seudat-brit": "סעודת ברית מילה",
    "kibudim": "כיבודים בברית",
    "hachanot": "הכנות ליום הברית",
    "acharei": "אחרי הברית",
}

OUT.mkdir(parents=True, exist_ok=True)
for slug, name in SHEETS.items():
    shutil.copyfile(SRC / f"{name}.pdf", OUT / f"{slug}.pdf")
    im = Image.open(SRC / f"{name}.png").convert("RGB")
    im.thumbnail((360, 520), Image.LANCZOS)
    im.save(OUT / f"{slug}.jpg", quality=82, optimize=True)
    print(slug, im.size)
