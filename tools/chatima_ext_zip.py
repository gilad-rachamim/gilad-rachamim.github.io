"""אורז את תוסף הכרום "הכלים של גילעד רחמים" (tools/chatima-ext) אל assets/machshev-chatima-ext.zip.
הרצה מתיקיית הריפו: python tools/chatima_ext_zip.py"""
import pathlib, zipfile
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "tools" / "chatima-ext"
OUT = ROOT / "assets" / "machshev-chatima-ext.zip"
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for f in sorted(SRC.iterdir()):
        z.write(f, "hakelim-tosaf/" + f.name)
print(OUT, OUT.stat().st_size)
