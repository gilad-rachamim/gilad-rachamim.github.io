"""PDF של שו"ת הגרים: בונה HTML להדפסה מ-qa-sorted.json ומדפיס ל-PDF בעזרת Chrome headless.
הרצה: python -I -X utf8 tools/gen_giur_shut_pdf.py <qa-sorted.json> <out.pdf>"""
import json, sys, os, html, subprocess, tempfile

CATS = [
    ('לפני שמתחילים', 'לפני הגיור'),
    ('יום הגיור', 'יום הגיור'),
    ('אחרי הגיור', 'אחרי הגיור'),
    ('משפחה', 'משפחה'),
    ('בני זוג וילדים', 'בן או בת זוג וילדים'),
    ('היחס לגר', 'היחס לגר'),
    ('גרים בתולדות ישראל', 'גרים בתולדות ישראל'),
]
CREDIT = 'ההלכות מתוך הספר "פניני הלכה – גיור" מאת הרב אליעזר מלמד. ערך כשאלות ותשובות: גילעד רחמים, ברשות הרב.'
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
e = lambda s: html.escape(s, quote=True)


def main(src, out):
    items = json.load(open(src, encoding='utf-8'))
    n = len(items)
    o = ['<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><title>שאלות ותשובות על גיור</title><style>',
         '@page{size:A4;margin:18mm 16mm 20mm}',
         'body{font-family:"David","Arial","Segoe UI",sans-serif;font-size:12.5pt;line-height:1.7;color:#111;margin:0}',
         '.cover{height:255mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;page-break-after:always}',
         '.cover h1{font-size:34pt;margin:0 0 .4em;color:#6b4e00}.cover .sub{font-size:16pt;margin:.2em 0}.cover .credit{margin-top:2.2em;font-size:13pt;border:2px solid #b08a2e;border-radius:10px;padding:1em 1.3em;max-width:150mm}',
         '.cover .note{margin-top:1.4em;font-size:11pt;color:#444;max-width:150mm}',
         'h2{font-size:18pt;color:#6b4e00;border-bottom:2px solid #b08a2e;padding-bottom:.2em;margin:1.4em 0 .6em;page-break-after:avoid}',
         '.toc{page-break-after:always}.toc li{margin:.25em 0}.toc a{color:#111;text-decoration:none}',
         '.q{break-inside:avoid;margin:0 0 1em}.q h3{font-size:13.5pt;margin:0 0 .2em}.q p{margin:.1em 0}.src{font-size:10pt;color:#555}',
         '</style></head><body>']
    o.append('<section class="cover"><h1>שאלות ותשובות על גיור</h1><div class="sub">לפי הספר "פניני הלכה – גיור"</div><div class="sub">%d שאלות ותשובות</div><div class="credit">%s</div><div class="note">הקובץ ללימוד ולהכרה. בכל שאלה מעשית פונים לבית הדין או לרב המלווה.</div><div class="note">hakelim.com/kodesh/giur/shut</div></section>' % (n, e(CREDIT)))
    o.append('<section class="toc"><h2>תוכן עניינים</h2><ol>')
    num = 0
    body = []
    for ck, cl in CATS:
        its = [i for i in items if i['cat'] == ck]
        if not its:
            continue
        o.append('<li>%s (%d)</li>' % (e(cl), len(its)))
        body.append('<h2>%s</h2>' % e(cl))
        for it in its:
            num += 1
            body.append('<div class="q"><h3>%d. %s</h3><p>%s</p><p class="src">מקור: ספר "פניני הלכה – גיור", %s · %s</p></div>' % (num, e(it['q']), e(it['a']), e(it['src']), e(it['url'])))
    o.append('</ol></section>')
    o.extend(body)
    o.append('</body></html>')
    tmp = os.path.join(tempfile.gettempdir(), 'shut-giur-print.html')
    open(tmp, 'w', encoding='utf-8').write('\n'.join(o))
    prof = tempfile.mkdtemp(prefix='shut-pdf-')
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-sandbox', '--user-data-dir=' + prof,
           '--no-pdf-header-footer', '--print-to-pdf=' + os.path.abspath(out), 'file:///' + tmp.replace('\\', '/')]
    subprocess.run(cmd, check=True, timeout=120)
    print('OK', num, 'questions ->', out, os.path.getsize(out))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
