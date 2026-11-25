#!/usr/bin/env python3
"""קבצי הוורד של כלי המוהלים ברוסית ובאנגלית (משמאל לימין), באותו עיצוב כמו הקבצים בעברית.

    python tools/lang_docx.py            # שישה קבצים: יומן בריתות, טופס ברית, הודעות החלמה × ru/en

הודעות ההחלמה נלקחות מהדף המתורגם עצמו (src/pages/kodesh/hachlama/<lg>/index.html),
כך שהקובץ תמיד זהה לנוסח שבאתר.
"""
import html
import pathlib
import re
import sys

from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ROW_HEIGHT_RULE
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from britot_docx import shade, vcenter, NAVY, GOLD, GREY  # noqa: E402

FONT = "Arial"
TITLE_FONT = "Georgia"
LIGHT = RGBColor(0xB5, 0xBA, 0xC4)
CREAM = RGBColor(0xF1, 0xDE, 0xA8)
PHONE = "058-404-9049"

T = {
 "ru": {
  "author": "Гилад Рахамим, сертифицированный моэль",
  "yoman_title": "Мой журнал бритов",
  "yoman_head": "Имя моэля: ____________________     Год: ____________     Страница: ____",
  "yoman_cols": [("№", 1.0), ("Дата и время", 2.9), ("Имя малыша", 2.6), ("Имена родителей", 3.4), ("Телефон", 2.6),
                 ("Место брит-милы", 3.4), ("Сандак", 2.4), ("Я осмотрел\nмалыша", 2.1), ("Снял повязку\nна следующий день", 2.6), ("Заметки", 3.7)],
  "yoman_time": "      /      /\nв",
  "yoman_credit": "Журнал бритов · подарок с любовью от Гилада Рахамима, сертифицированного моэля · " + PHONE + " · ещё бесплатные инструменты для моэлей: hakelim.com/kodesh/mohalim/ru/",
  "tofes_title": "Данные для брит-милы",
  "tofes_sub": "Мазаль тов! Эти данные помогают моэлю всё подготовить к брит-миле.",
  "tofes": [
    ("Родители", [("Имена родителей", ""), ("Телефон", "")]),
    ("Роды", [("Дата рождения", "      /      /"), ("Время рождения", "     :"), ("Больница", ""), ("Вес", ""),
              ("Желтуха: результат и когда проверяли", ""), ("Кесарево сечение", "☐ да     ☐ нет")]),
    ("Брит-мила", [("Дата брит-милы", "день ______   еврейская дата ______________   гражданская      /      /"), ("Время брит-милы", "     :"),
                   ("Место брит-милы", ""), ("Обычай (нусах)", "☐ сефардский   ☐ восточные общины   ☐ ашкеназский   ☐ йеменский"), ("Сандак", ""), ("Заметки", "")]),
  ],
  "tofes_note": "Окончательную дату брит-милы назначает моэль, когда малыш полностью здоров и готов.",
  "tofes_credit": "Данные для брит-милы · подарок с любовью от Гилада Рахамима, сертифицированного моэля · " + PHONE + " · ещё бесплатные инструменты для моэлей: hakelim.com/kodesh/mohalim/ru/",
  "hl_title": "Сообщения родителям о заживлении",
  "hl_sub": "От первого разговора до недели после брит-милы · скопируйте, дополните и отправьте в WhatsApp",
  "hl_how": "Как пользоваться: вместо [имя малыша] напишите его имя (после брит-милы), а в последней строке – своё имя. Если у вас принято иначе, измените указания перед отправкой.",
  "hl_when": "Когда отправлять: ",
  "hl_sign": "[моё имя]",
  "hl_credit": "Подарок с любовью от Гилада Рахамима, сертифицированного моэля · " + PHONE + " (WhatsApp) · ещё бесплатные инструменты для моэлей: hakelim.com/kodesh/mohalim/ru/",
 },
 "en": {
  "author": "Gilad Rachamim, certified mohel",
  "yoman_title": "My Brit Milah Log",
  "yoman_head": "Mohel's name: ____________________     Year: ____________     Page: ____",
  "yoman_cols": [("No.", 1.0), ("Date and time", 2.9), ("Baby's name", 2.6), ("Parents' names", 3.4), ("Phone", 2.6),
                 ("Place of the brit", 3.4), ("Sandak", 2.4), ("I saw\nthe baby", 2.1), ("Removed the\ndressing next day", 2.6), ("Notes", 3.7)],
  "yoman_time": "      /      /\nat",
  "yoman_credit": "Brit milah log · a gift with love from Gilad Rachamim, certified mohel · " + PHONE + " · more free tools for mohels: hakelim.com/kodesh/mohalim/en/",
  "tofes_title": "Brit Milah Details",
  "tofes_sub": "Mazal tov! These details help the mohel prepare everything for the brit.",
  "tofes": [
    ("The parents", [("Parents' names", ""), ("Phone", "")]),
    ("The birth", [("Date of birth", "      /      /"), ("Time of birth", "     :"), ("Hospital", ""), ("Weight", ""),
                   ("Jaundice: result, and when it was checked", ""), ("C-section", "☐ yes     ☐ no")]),
    ("The brit", [("Date of the brit", "day ______   Hebrew date ______________   civil date      /      /"), ("Time of the brit", "     :"),
                  ("Place of the brit", ""), ("Custom (nusach)", "☐ Sephardic   ☐ Mizrahi   ☐ Ashkenazi   ☐ Yemenite"), ("Sandak", ""), ("Notes", "")]),
  ],
  "tofes_note": "The mohel sets the final date of the brit, once the baby is completely healthy and ready.",
  "tofes_credit": "Brit milah details · a gift with love from Gilad Rachamim, certified mohel · " + PHONE + " · more free tools for mohels: hakelim.com/kodesh/mohalim/en/",
  "hl_title": "Aftercare Messages for Parents",
  "hl_sub": "From the first call to a week after the brit · copy, fill in and send on WhatsApp",
  "hl_how": "How to use: replace [baby's name] with his name (after the brit), and write your own name on the last line. If your practice is different, change the instructions before sending.",
  "hl_when": "When to send: ",
  "hl_sign": "[my name]",
  "hl_credit": "A gift with love from Gilad Rachamim, certified mohel · " + PHONE + " (WhatsApp) · more free tools for mohels: hakelim.com/kodesh/mohalim/en/",
 },
}


def run(p, text, size=11, bold=False, color=None, font=FONT):
    r = p.add_run(text)
    r.font.size = Pt(size); r.font.bold = bold; r.font.name = font
    rpr = r._r.get_or_add_rPr()
    fonts = rpr.find(qn("w:rFonts"))
    if fonts is None:
        fonts = OxmlElement("w:rFonts"); rpr.append(fonts)
    for a in ("w:ascii", "w:hAnsi", "w:cs"):
        fonts.set(qn(a), font)
    if color is not None:
        r.font.color.rgb = color
    return r


def borders(table, color="C9B07A"):
    b = OxmlElement("w:tblBorders")
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        e = OxmlElement(f"w:{edge}"); e.set(qn("w:val"), "single"); e.set(qn("w:sz"), "6"); e.set(qn("w:color"), color)
        b.append(e)
    table._tbl.tblPr.append(b)


def base(landscape=False):
    doc = Document()
    sec = doc.sections[0]
    if landscape:
        sec.orientation = WD_ORIENT.LANDSCAPE
        sec.page_width, sec.page_height = Cm(29.7), Cm(21.0)
    else:
        sec.page_width, sec.page_height = Cm(21.0), Cm(29.7)
    st = doc.styles["Normal"]; st.font.name = FONT; st.font.size = Pt(11)
    st.paragraph_format.space_after = Pt(0)
    return doc, sec


def center(doc, text, size, bold=False, color=None, font=FONT, after=0):
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_after = Pt(after)
    run(p, text, size, bold=bold, color=color, font=font)
    return p


def yoman(lg, out):
    t = T[lg]
    doc, sec = base(landscape=True)
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Cm(1.2))
    sec.top_margin, sec.bottom_margin = Cm(1.1), Cm(1.1)
    sec.footer_distance = Cm(0.6)
    center(doc, "בס״ד", 9, color=GREY)
    center(doc, t["yoman_title"], 24, True, NAVY, TITLE_FONT)
    center(doc, t["yoman_head"], 11, color=GREY, after=8)
    cols, rows = t["yoman_cols"], 11 * 3
    table = doc.add_table(rows=1 + rows, cols=len(cols))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER; table.autofit = False
    borders(table)
    for i, (_, w) in enumerate(cols):
        for row in table.rows:
            row.cells[i].width = Cm(w)
    hdr = table.rows[0]
    hdr.height = Cm(1.2); hdr.height_rule = WD_ROW_HEIGHT_RULE.AT_LEAST
    hdr._tr.get_or_add_trPr().append(OxmlElement("w:tblHeader"))
    for i, (title, _) in enumerate(cols):
        c = hdr.cells[i]; shade(c, "0E1628"); vcenter(c)
        p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run(p, title, 10, bold=True, color=CREAM)
    for n, row in enumerate(table.rows[1:], start=1):
        row.height = Cm(1.25); row.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
        for i, c in enumerate(row.cells):
            if n % 2 == 0:
                shade(c, "FAF6EC")
            vcenter(c)
            p = c.paragraphs[0]; p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            if i == 0:
                run(p, str(n), 10, color=GREY)
            elif i == 1:
                run(p, t["yoman_time"], 8, color=LIGHT)
            elif i in (7, 8):
                run(p, "☐", 16, color=GOLD)
    fp = sec.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(fp, t["yoman_credit"], 8.5, color=GOLD)
    doc.core_properties.title = t["yoman_title"]; doc.core_properties.author = t["author"]
    doc.save(out); print("OK", out)


def tofes(lg, out):
    t = T[lg]
    doc, sec = base()
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Cm(1.6))
    sec.top_margin, sec.bottom_margin = Cm(1.3), Cm(1.2)
    sec.footer_distance = Cm(0.6)
    center(doc, "בס״ד", 9, color=GREY)
    center(doc, t["tofes_title"], 26, True, NAVY, TITLE_FONT)
    center(doc, t["tofes_sub"], 11, color=GREY, after=10)
    sections = t["tofes"]
    table = doc.add_table(rows=sum(1 + len(f) for _, f in sections), cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER; table.autofit = False
    borders(table)
    widths = (Cm(5.4), Cm(12.4))
    i = 0
    for title, fields in sections:
        r = table.rows[i]; i += 1
        c = r.cells[0].merge(r.cells[1])
        r.height = Cm(0.9); r.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
        shade(c, "0E1628"); vcenter(c)
        run(c.paragraphs[0], title, 13, bold=True, color=CREAM, font=TITLE_FONT)
        for k_, (label, hint) in enumerate(fields):
            r = table.rows[i]; i += 1
            last = (title == sections[-1][0] and k_ == len(fields) - 1)
            r.height = Cm(2.4 if last else 1.25); r.height_rule = WD_ROW_HEIGHT_RULE.EXACTLY
            for k, w in enumerate(widths):
                r.cells[k].width = w; vcenter(r.cells[k])
            shade(r.cells[0], "FAF6EC")
            run(r.cells[0].paragraphs[0], label, 10.5, bold=True, color=NAVY)
            if hint:
                run(r.cells[1].paragraphs[0], hint, 10, color=GOLD if "☐" in hint else LIGHT)
    p = center(doc, t["tofes_note"], 9.5, color=GREY)
    p.paragraph_format.space_before = Pt(10)
    fp = sec.footer.paragraphs[0]; fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run(fp, t["tofes_credit"], 8.5, color=GOLD)
    doc.core_properties.title = t["tofes_title"]; doc.core_properties.author = t["author"]
    doc.save(out); print("OK", out)


def hl_messages(lg):
    s = (ROOT / "src" / "pages" / "kodesh" / "hachlama" / lg / "index.html").read_text(encoding="utf-8")
    out = []
    for m in re.finditer(r'<article class="hl" id="hl-[^"]+">(.*?)</article>', s, re.S):
        a = m.group(1)
        h3 = re.search(r"<h3>(.*?)</h3>", a, re.S).group(1)
        when = re.search(r'<span class="hl-when">(.*?)</span>', a, re.S).group(1)
        body = re.search(r"<textarea[^>]*>(.*?)</textarea>", a, re.S).group(1)
        out.append((html.unescape(h3), html.unescape(when), html.unescape(body).replace("\r\n", "\n")))
    assert len(out) >= 10, len(out)
    return out


def hachlama(lg, out):
    t = T[lg]
    doc, sec = base()
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Cm(2.0))
    sec.top_margin = sec.bottom_margin = Cm(1.8)

    def para(text="", size=11, bold=False, color=None, align=WD_ALIGN_PARAGRAPH.LEFT, after=4, font=FONT):
        p = doc.add_paragraph(); p.alignment = align
        p.paragraph_format.space_after = Pt(after)
        if text:
            run(p, text, size=size, bold=bold, color=color, font=font)
        return p

    para("בס״ד", 9, color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER)
    para(t["hl_title"], 22, True, NAVY, WD_ALIGN_PARAGRAPH.CENTER, 2, TITLE_FONT)
    para(t["hl_sub"], 11, color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER, after=10)
    para(t["hl_how"], 10.5, color=GREY, after=12)
    for i, (title, when, body) in enumerate(hl_messages(lg), 1):
        para(f"{i}. {title}", 14, True, NAVY, after=0, font=TITLE_FONT)
        para(t["hl_when"] + when, 10, color=GOLD, after=4)
        for line in (body.rstrip() + "\n" + t["hl_sign"]).split("\n"):
            para(line.replace("*", "").replace("_", ""), 11, after=1)
        para("", after=8)
    para(t["hl_credit"], 8.5, color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER, after=0)
    doc.core_properties.title = t["hl_title"]; doc.core_properties.author = t["author"]
    doc.save(out); print("OK", out)


if __name__ == "__main__":
    for lg in ("ru", "en"):
        yoman(lg, ROOT / "kodesh" / "britot" / f"yoman-britot-{lg}.docx")
        tofes(lg, ROOT / "kodesh" / "tofes-brit" / f"tofes-brit-{lg}.docx")
        hachlama(lg, ROOT / "kodesh" / "hachlama" / f"hodaot-hachlama-{lg}.docx")
