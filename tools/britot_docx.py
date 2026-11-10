#!/usr/bin/env python3
"""מייצר את "יומן הבריתות שלי" כקובץ וורד למילוי (למוהל שלא נכנס לאתרים).

    python tools/britot_docx.py <out.docx>

A4 לרוחב, טבלה מימין לשמאל עם כותרת שחוזרת בכל עמוד, ובתחתית שורת קרדיט קטנה של גילעד.
"""
import sys
from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

NAVY = RGBColor(0x0E, 0x16, 0x28)
GOLD = RGBColor(0xA8, 0x84, 0x3C)
GREY = RGBColor(0x6B, 0x72, 0x80)
FONT = "Arial"
TITLE_FONT = "David"

# (כותרת, רוחב בס"מ). הסדר מימין לשמאל.
COLS = [("מס׳", 1.0), ("תאריך ושעה", 2.9), ("שם התינוק", 2.6), ("שם ההורים", 3.4), ("טלפון", 2.6),
        ("מקום הברית", 3.4), ("סנדק", 2.4), ("ראיתי את\nהתינוק", 2.1), ("הורדתי\nתחבושת למחרת", 2.6), ("הערות", 3.7)]
ROWS_PER_PAGE = 11
PAGES = 3
CREDIT = "יומן הבריתות · מתנה באהבה מגילעד רחמים, מוהל מוסמך · 058-404-9049 · עוד כלים חינמיים למוהלים: hakelim.com/kodesh/mohalim"


def rtl(p):
    ppr = p._p.get_or_add_pPr()
    b = OxmlElement("w:bidi"); ppr.append(b)


def run(p, text, size=11, bold=False, color=None, font=FONT):
    r = p.add_run(text)
    r.font.size = Pt(size); r.font.bold = bold; r.font.name = font
    rpr = r._r.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts"); rpr.append(fonts)
    for a in ("w:ascii", "w:hAnsi", "w:cs"):
        fonts.set(qn(a), font)
    rtl_el = OxmlElement("w:rtl"); rpr.append(rtl_el)
    cs = OxmlElement("w:szCs"); cs.set(qn("w:val"), str(int(size * 2))); rpr.append(cs)
    if bold:
        rpr.append(OxmlElement("w:bCs"))
    if color is not None:
        r.font.color.rgb = color
    return r


def shade(cell, hex_fill):
    tcpr = cell._tc.get_or_add_tcPr()
    s = OxmlElement("w:shd"); s.set(qn("w:val"), "clear"); s.set(qn("w:color"), "auto"); s.set(qn("w:fill"), hex_fill)
    tcpr.append(s)


def borders(table, color="C9B07A"):
    tblpr = table._tbl.tblPr
    b = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{edge}"); e.set(qn("w:val"), "single"); e.set(qn("w:sz"), "6"); e.set(qn("w:color"), color)
        b.append(e)
    tblpr.append(b)
    bidi = OxmlElement("w:bidiVisual"); tblpr.append(bidi)


def vcenter(cell):
    tcpr = cell._tc.get_or_add_tcPr()
    v = OxmlElement("w:vAlign"); v.set(qn("w:val"), "center"); tcpr.append(v)


def main(out):
    doc = Document()
    sec = doc.sections[0]
    sec.orientation = WD_ORIENT.LANDSCAPE
    sec.page_width, sec.page_height = Cm(29.7), Cm(21.0)
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Cm(1.2))
    sec.top_margin, sec.bottom_margin = Cm(1.1), Cm(1.1)
    sec.footer_distance = Cm(0.6)
    st = doc.styles["Normal"]; st.font.name = FONT; st.font.size = Pt(11)
    st.paragraph_format.space_after = Pt(0)

    # כותרת
    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "בס״ד", 9, color=GREY)
    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(p, "יומן הבריתות שלי", 26, bold=True, color=NAVY, font=TITLE_FONT)
    p = doc.add_paragraph(); rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(8)
    run(p, "שם המוהל: ____________________     שנה: ____________     עמוד: ____", 11, color=GREY)

    table = doc.add_table(rows=1 + ROWS_PER_PAGE * PAGES, cols=len(COLS))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    borders(table)
    for i, (title, w) in enumerate(COLS):
        for row in table.rows:
            row.cells[i].width = Cm(w)
    hdr = table.rows[0]
    hdr.height = Cm(1.2); hdr.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
    trpr = hdr._tr.get_or_add_trPr(); h = OxmlElement("w:tblHeader"); trpr.append(h)
    for i, (title, w) in enumerate(COLS):
        c = hdr.cells[i]; shade(c, "0E1628"); vcenter(c)
        p = c.paragraphs[0]; rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run(p, title, 10.5, bold=True, color=RGBColor(0xF1, 0xDE, 0xA8))
    for n, row in enumerate(table.rows[1:], start=1):
        row.height = Cm(1.25); row.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
        if n % 2 == 0:
            for c in row.cells:
                shade(c, "FAF6EC")
        for i, c in enumerate(row.cells):
            vcenter(c)
            p = c.paragraphs[0]; rtl(p); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            if i == 0:
                run(p, str(n), 10, color=GREY)
            elif i == 1:
                run(p, "      /      /\n‏‏בשעה", 8, color=RGBColor(0xB5, 0xBA, 0xC4))
            elif i in (7, 8):
                run(p, "☐", 16, color=GOLD)

    # תחתית: קרדיט קטן ומספר עמוד
    fp = sec.footer.paragraphs[0]; rtl(fp); fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(fp, CREDIT, 8.5, color=GOLD)

    doc.core_properties.title = "יומן הבריתות שלי"
    doc.core_properties.author = "גילעד רחמים, מוהל מוסמך"
    doc.save(out)
    print("OK", out)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "yoman-britot.docx")
