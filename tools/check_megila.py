"""משווה את טקסט דף המגילה למקור (megila_source.json). הרצה: python -X utf8 tools/check_megila.py"""
import json, os, re, sys, html

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
src = json.load(open(os.path.join(ROOT, 'tools', 'chanuka_plus', 'megila_source.json'), encoding='utf8'))['paragraphs']
exp = [p.replace('י״י', 'ה׳') for p in src]
page = open(os.path.join(ROOT, 'src', 'pages', 'kodesh', 'chanuka', 'megila', 'index.html'), encoding='utf8').read()
m = re.search(r'id="mg-text"[^>]*>(.*?)</div>', page, re.S)
got = [html.unescape(re.sub(r'<b>\d+</b>', '', x)) for x in re.findall(r'<p lang="arc">(.*?)</p>', m.group(1), re.S)]
bad = 0
if len(got) != len(exp):
    print('מספר פסקאות שונה', len(got), len(exp)); bad += 1
for i, (g, e) in enumerate(zip(got, exp)):
    if g != e:
        print('פסקה', i + 1, 'שונה'); bad += 1
if 'י״י' in m.group(1):
    print('נשאר י״י'); bad += 1
print('תקין: %d פסקאות זהות למקור' % len(got) if not bad else 'נמצאו %d הבדלים' % bad)
sys.exit(1 if bad else 0)
