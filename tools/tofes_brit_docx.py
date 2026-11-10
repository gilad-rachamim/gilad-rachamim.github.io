#!/usr/bin/env python3
"""מייצר את "טופס פרטי הברית" כקובץ וורד להדפסה (למוהל שלא נכנס לאתרים).

    python tools/tofes_brit_docx.py kodesh/tofes-brit/tofes-brit.docx

עמוד A4 אחד לאורך: טבלת שדות בשלושה חלקים (ההורים, הלידה, הברית), מימין לשמאל,
ובתחתית שורת קרדיט קטנה של גילעד. משתמש בעזרים של britot_docx.py.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from britot_docx import rtl, run, shade, borders, vcenter, NAVY, GOLD, GREY, TITLE_FONT, FONT  # noqa: E402

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.shared import Cm, Pt, RGBColor

LIGHT = RGBColor(0xB5, 0xBA, 0xC4)
SECTIONS = [
    ("ההורים", [("שם ההורים", ""), ("טלפון", "")]),
    ("הלידה", [("תאריך הלידה", "      /      /"), ("שעת הלידה", "     :"), ("בית החולים", ""), ("משקל", ""),
               ("צהבת: תוצאה, ומתי נבדקה", ""), ("ניתוח קיסרי", "☐ כן     ☐ לא")]),
    ("הברית", [("מועד הברית", "יום ______   תאריך עברי ______________   לועזי      /      /"), ("שעת הברית", "     :"),
               ("מקום הברית", ""), ("נוסח", "☐ ספרדי   ☐ עדות המזרח   ☐ אשכנז   ☐ תימני"), ("סנדק", ""), ("הערות", "")]),
]
CREDIT = "טופס פרטי הברית · מתנה באהבה מגילעד רחמים, מוהל מוסמך · 058-404-9049 · עוד כלים חינמיים למוהלים: hakelim.com/kodesh/mohalim"


def main(out):
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Cm(1.6))
    sec.top_margin, sec.bottom_margin = Cm(1.3), Cm(1.2)
    sec.footer_distance = Cm(0.6)
    st = doc.styles["Normal"]; st.font.name = FONT; st.font.size = Pt(11)
    st.paragraph_format.space_after = Pt(0)

    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "בס״ד", 9, color=GREY)
    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "פרטי הברית", 28, bold=True, color=NAVY, font=TITLE_FONT)
    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(10)
    run(p, "מזל טוב! הפרטים האלה עוזרים למוהל להכין הכול לברית.", 11, color=GREY)

    rows = sum(1 + len(f) for _, f in SECTIONS)
    table = doc.add_table(rows=rows, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    borders(table)
    widths = (Cm(5.0), Cm(12.8))
    i = 0
    for title, fields in SECTIONS:
        r = table.rows[i]; i += 1
        c = r.cells[0].merge(r.cells[1])
        r.height = Cm(0.9); r.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
        shade(c, "0E1628"); vcenter(c)
        p = c.paragraphs[0]; rtl(p)
        run(p, title, 13, bold=True, color=RGBColor(0xF1, 0xDE, 0xA8), font=TITLE_FONT)
        for label, hint in fields:
            r = table.rows[i]; i += 1
            r.height = Cm(2.4 if label == "הערות" else 1.25); r.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
            for k, w in enumerate(widths):
                r.cells[k].width = w; vcenter(r.cells[k])
            shade(r.cells[0], "FAF6EC")
            p = r.cells[0].paragraphs[0]; rtl(p)
            run(p, label, 11, bold=True, color=NAVY)
            if hint:
                p = r.cells[1].paragraphs[0]; rtl(p)
                run(p, hint, 10.5, color=GOLD if "☐" in hint else LIGHT)

    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(10)
    run(p, "המועד הסופי של הברית לפי הנחיות המוהל, כשהתינוק בריא ומוכן לגמרי.", 9.5, color=GREY)

    fp = sec.footer.paragraphs[0]; rtl(fp); fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(fp, CREDIT, 8.5, color=GOLD)

    doc.core_properties.title = "פרטי הברית"
    doc.core_properties.author = "גילעד רחמים, מוהל מוסמך"
    doc.save(out)
    print("OK", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "tofes-brit.docx")
