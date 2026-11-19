"""אורז את תוסף הכרום "הכלים של גילעד רחמים" (tools/chatima-ext).
הרצה מתיקיית הריפו:
  python tools/chatima_ext_zip.py                 → assets/machshev-chatima-ext.zip (להורדה מהאתר: הכול בתוך תיקייה hakelim-tosaf/)
  python tools/chatima_ext_zip.py --store OUT.zip → חבילה לחנות של כרום: manifest.json בשורש ה-zip (החנות דוחה zip עם תיקייה מסביב)"""
import pathlib, sys, zipfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "chatima-ext"
OUT = ROOT / "assets" / "machshev-chatima-ext.zip"


def files():
    # כולל תתי-תיקיות (gesher/) – בלעדיהן החנות דחתה את 3.12.0: offscreen/downloads "בלי שימוש" (18.11.2026)
    return [f for f in sorted(SRC.rglob('*')) if f.is_file() and not any(x.startswith('.') for x in f.relative_to(SRC).parts)]


def build(out, prefix):
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files():
            z.write(f, prefix + f.relative_to(SRC).as_posix())
    return out


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--store":
        o = build(pathlib.Path(sys.argv[2]), "")
    else:
        o = build(OUT, "hakelim-tosaf/")
    print(o, o.stat().st_size)
