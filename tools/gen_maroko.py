# -*- coding: utf-8 -*-
"""בונה את assets/misheberach-maroko.js מתוך tools/maroko-misheberach-source.txt.

הטקסט נשאר כפי שהוא. רק ההערות שבסוגריים הופכות לסימונים:
  (שם ...)              -> {N||(שם ...)|}          כאן נכנס השם
  (בשבת שובה: X)        -> {rh| (בשבת שובה: |X|)}  נכנס רק כשמסמנים "שבת שובה"
  (בשבת: X) / (ליולדת: X) / (ביו"ט: X) באותה צורה (sh / yol / yt).
מריצים: python -I tools/gen_maroko.py
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'tools' / 'maroko-misheberach-source.txt'
OUT = ROOT / 'assets' / 'misheberach-maroko.js'
KEYS = {'בשבת שובה': 'rh', 'ביו"ט': 'yt', 'ליולדת': 'yol', 'בשבת': 'sh'}


def parse():
    secs, cur = {}, None
    for line in SRC.read_text(encoding='utf-8').splitlines():
        if line.startswith('## '):
            cur = line[3:].strip(); secs[cur] = []
        elif cur and line.strip():
            secs[cur].append(line.strip())
    return {k: '\n'.join(v) for k, v in secs.items()}


def mark(t):
    t = re.sub(r'\((שם [^)]*)\)', r'{N||(\1)|}', t)
    t = re.sub(r'^\((לאדם גדול[^:]*): ([^)]*)\)$', lambda m: '{gadol|(%s: |%s|)}' % (m.group(1), m.group(2)), t, flags=re.M)
    t = re.sub(r' \((בשבת שובה|ביו"ט|ליולדת|בשבת): ([^)]*)\)(,?)',
               lambda m: '{%s| (%s: |%s|)%s}' % (KEYS[m.group(1)], m.group(1), m.group(2), m.group(3)), t)
    t = t.replace(' (הַיּוֹלֶדֶת)', '{yol| (|הַיּוֹלֶדֶת|)}')
    t = t.replace(' וְלִכְבוֹד הַשַּׁבָּת{yt|', '{!yt|| וְלִכְבוֹד הַשַּׁבָּת|}{yt|')
    left = re.sub(r'\{[^}]*\}', '', t)
    if re.search(r'\((?!שם)', left):
        sys.exit('נשארה הערה בסוגריים שלא סומנה: ' + left)
    return t


TPL = r"""// ממלא סימונים: src=true מחזיר את נוסח הסידור כפי שהוא (עם ההערות), אחרת: שם במקום (שם...), ותוספות רק כשהן מסומנות.
window.MB_MAROKO_TPL = function (t, src, get, name) {
  return t.replace(/\{(!?\w+)\|([^|}]*)\|([^|}]*)\|([^|}]*)\}/g, function (m, key, pre, body, suf) {
    if (src) return pre + body + suf;
    if (key === 'N') return name(body);
    var on = key.charAt(0) === '!' ? !get(key.slice(1)) : get(key);
    return on ? pre.replace(/\(.*$/, '') + body + suf.replace(')', '') : '';
  });
};
"""


def main():
    data = {k: mark(v) for k, v in parse().items()}
    js = ('// נוצר אוטומטית מ-tools/maroko-misheberach-source.txt על ידי tools/gen_maroko.py. לא לערוך ידנית.\n'
          '// נוסח מרוקאי של מי שברך, מילה במילה מהסידור ששלח גילעד ("שער הגבאי", עמ\' 1247–1258).\n'
          'window.MB_MAROKO = ' + json.dumps(data, ensure_ascii=False, indent=1) + ';\n' + TPL)
    OUT.write_text(js, encoding='utf-8', newline='\n')
    print('נכתב', OUT.name, len(data), 'נוסחים')


main()
