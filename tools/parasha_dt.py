#!/usr/bin/env python3
"""נושאי הפרשה ודברי תורה לדף /kodesh/parasha/.

python -X utf8 tools/parasha_dt.py            מאמת ציטוטים ומשבץ לדף המקור
python -X utf8 tools/parasha_dt.py --check    אימות בלבד
python -X utf8 tools/parasha_dt.py --fetch    מביא מספריא פרקים שחסרים ב-verses.json
פרשה = קובץ NN-name.json בתיקייה tools/data/parasha-divrei-torah. פרשה בלי קובץ לא מקבלת אזור.
"""
import glob
import html
import json
import os
import re
import subprocess
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'tools', 'data', 'parasha-divrei-torah')
VERSES = os.path.join(DATA, 'verses.json')
PAGE = os.path.join(ROOT, 'src', 'pages', 'kodesh', 'parasha', 'index.html')
BOOKS = {'Genesis': 'בראשית', 'Exodus': 'שמות', 'Leviticus': 'ויקרא', 'Numbers': 'במדבר', 'Deuteronomy': 'דברים'}


def fetch_chapter(book, ch):
    url = 'https://www.sefaria.org/api/texts/%s?context=0&commentary=0&pad=0' % urllib.parse.quote('%s.%d' % (book, ch))
    raw = subprocess.run(['curl', '-s', '--fail', '--max-time', '60', url], capture_output=True, check=True).stdout
    out = []
    for s in json.loads(raw.decode('utf-8'))['he']:
        s = html.unescape(re.sub(r'<sup.*?</sup>|<i class="footnote">.*?</i>|<span class="mam-spi.*?</span>|<[^>]+>', '', s))
        s = re.sub(r'\{[פס]\}', '', s)
        s = re.sub('[֑-ֽ֯׀͏]', '', s)  # טעמים ומתג; הניקוד נשאר
        out.append(re.sub(r'\s+', ' ', s).strip())
    return out


def norm(s):
    s = re.sub('[֑-ׇ͏]', '', s.replace('־', ' '))
    return ' '.join(re.findall('[א-ת]+', s))


def gem(n):
    s = ''
    for v, c in ((100, 'ק'), (90, 'צ'), (80, 'פ'), (70, 'ע'), (60, 'ס'), (50, 'נ'), (40, 'מ'), (30, 'ל'), (20, 'כ')):
        while n >= v:
            s += c
            n -= v
    if n in (15, 16):
        s += 'טו' if n == 15 else 'טז'
    else:
        if n >= 10:
            s += 'י'
            n -= 10
        if n:
            s += 'אבגדהוזחט'[n - 1]
    return s + '׳' if len(s) == 1 else s[:-1] + '״' + s[-1]


def cv(ref):
    c, v = ref.split(':')
    return int(c), int(v)


def he_ref(book, a, b=None):
    c1, v1 = cv(a)
    s = '%s %s, %s' % (BOOKS[book], gem(c1), gem(v1))
    if b and b != a:
        c2, v2 = cv(b)
        s += '–' + (gem(v2) if c2 == c1 else '%s, %s' % (gem(c2), gem(v2)))
    return s


def load():
    files = sorted(glob.glob(os.path.join(DATA, '[0-9][0-9]-*.json')))
    return [json.load(open(f, encoding='utf-8')) for f in files]


def check(parshiot, verses):
    errs = []
    for p in parshiot:
        book = verses.get(p['book'], {})

        def verse(ref):
            c, v = cv(ref)
            ch = book.get(str(c))
            return ch[v - 1] if ch and 0 < v <= len(ch) else None

        first, last = cv(p['topics'][0]['range'][0]), cv(p['topics'][-1]['range'][1])
        whole = ' | '.join(norm(x) for c in range(first[0], last[0] + 1) for i, x in enumerate(book.get(str(c), []))
                           if first <= (c, i + 1) <= last)
        prev = (0, 0)  # הנושאים מסודרים לפי פסוק הפתיחה
        for k, t in enumerate(p['topics'], 1):
            where = 'פרשה %d נושא %d' % (p['n'], k)
            a, b = (cv(x) for x in t['range'])
            if not (prev <= a <= b) or not verse(t['range'][0]) or not verse(t['range'][1]):
                errs.append('%s: טווח פסוקים לא תקין או לא בסדר %s' % (where, t['range']))
            prev = a
            for ref, frag in t['quotes']:
                v = verse(ref)
                if v is None:
                    errs.append('%s: אין פסוק %s' % (where, ref))
                    continue
                if re.search(r'[()\[\]*]', v):
                    errs.append('%s: בפסוק %s יש סימני נוסח (קרי וכתיב), לבחור פסוק אחר או לקצר' % (where, ref))
                if frag and ' %s ' % norm(frag) not in ' %s ' % norm(v):
                    errs.append('%s: הציטוט לא נמצא בפסוק %s: %s' % (where, ref, frag))
            for s in [t['idea'], t['lesson']] + t['dt']:
                for q in re.findall('“([^”]*)”', s):
                    if ' %s ' % norm(q) not in ' %s ' % whole:
                        errs.append('%s: ציטוט בטקסט שלא נמצא בפרשה: %s' % (where, q))
                if s.count('“') != s.count('”') or re.search(r'[A-Za-z<>]', s):
                    errs.append('%s: מרכאות לא סגורות או תווים זרים: %s' % (where, s[:60]))
    return errs


def quote_html(p, verses, ref, frag):
    c, v = cv(ref)
    words = verses[p['book']][str(c)][v - 1]
    if frag:
        # חיתוך הקטע מתוך הפסוק המנוקד לפי מניין המילים
        toks = re.findall('[^ ־]+[ ־]?', words)
        heb = [i for i, t in enumerate(toks) if norm(t)]
        plain = [norm(toks[i]) for i in heb]
        want = norm(frag).split()
        for s in range(len(plain) - len(want) + 1):
            if plain[s:s + len(want)] == want:
                words = ''.join(toks[heb[s]:heb[s + len(want) - 1] + 1]).rstrip(' ־׃')
                break
    return '<blockquote class="pr-v"><p>%s <small>(%s)</small></p></blockquote>' % (html.escape(words), he_ref(p['book'], ref))


def block(p, verses):
    e = lambda s: html.escape(s, quote=False)
    out = ['<!--dt:%d--><div class="pr-topics"><h3>נושאי פרשת %s: דבר תורה לכל נושא</h3>' % (p['n'], p['name']),
           '<p class="pr-hint">לחצו על נושא כדי לפתוח דבר תורה קצר.</p>']
    for k, t in enumerate(p['topics'], 1):
        out.append('<details class="pr-t" id="t-%d-%d"><summary><h4>%s</h4> <small>%s</small><em>%s</em></summary><div class="pr-dt">'
                   % (p['n'], k, e(t['title']), he_ref(p['book'], *t['range']), e(t['idea'])))
        out.append('<p>%s</p>' % e(t['dt'][0]))
        out += [quote_html(p, verses, r, f) for r, f in t['quotes']]
        out += ['<p>%s</p>' % e(x) for x in t['dt'][1:]]
        out.append('<p class="pr-les"><b>למעשה:</b> %s</p>' % e(t['lesson']))
        out.append('<button type="button" class="btn btn-line pr-tw">לשלוח את דבר התורה בווטסאפ</button></div></details>')
    out.append('</div><!--/dt-->')
    return ''.join(out)


def main():
    parshiot = load()
    verses = json.load(open(VERSES, encoding='utf-8')) if os.path.exists(VERSES) else {}
    if '--fetch' in sys.argv:
        for p in parshiot:
            for c in range(cv(p['topics'][0]['range'][0])[0], cv(p['topics'][-1]['range'][1])[0] + 1):
                if str(c) not in verses.setdefault(p['book'], {}):
                    verses[p['book']][str(c)] = fetch_chapter(p['book'], c)
                    print('הובא', p['book'], c)
        with open(VERSES, 'w', encoding='utf-8', newline='\n') as f:
            json.dump(verses, f, ensure_ascii=False, indent=0)
    errs = check(parshiot, verses)
    print('פרשות: %d, נושאים: %d, ציטוטים: %d, שגיאות: %d' % (
        len(parshiot), sum(len(p['topics']) for p in parshiot),
        sum(len(t['quotes']) for p in parshiot for t in p['topics']), len(errs)))
    print('\n'.join(errs))
    if errs:
        sys.exit(1)
    if '--check' in sys.argv:
        return
    page = open(PAGE, encoding='utf-8', newline='').read()
    page = re.sub(r'<!--dt:\d+-->.*?<!--/dt-->', '', page)
    for p in parshiot:
        pat = re.compile(r'(<details id="p-%d" data-name="%s">.*?<p class="pr-short">.*?</p>)' % (p['n'], re.escape(p['name'])), re.S)
        page, hits = pat.subn(lambda m: m.group(1) + block(p, verses), page, count=1)
        if hits != 1:
            sys.exit('לא נמצאה בדף פרשה %d %s' % (p['n'], p['name']))
    with open(PAGE, 'w', encoding='utf-8', newline='') as f:
        f.write(page)
    print('שובץ לדף')


if __name__ == '__main__':
    main()
