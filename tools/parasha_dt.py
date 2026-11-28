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
UPDATED = '2026-11-27'  # לעדכן כשתוכן דפי הפרשה משתנה (dateModified)
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


def topic_html(p, verses, k, t, tag, opened=False):
    e = lambda s: html.escape(s, quote=False)
    body = ['<p>%s</p>' % e(t['dt'][0])]
    body += [quote_html(p, verses, r, f) for r, f in t['quotes']]
    body += ['<p>%s</p>' % e(x) for x in t['dt'][1:]]
    body.append('<p class="pr-les"><b>למעשה:</b> %s</p>' % e(t['lesson']))
    body.append('<button type="button" class="btn btn-line pr-tw">לשלוח את דבר התורה בווטסאפ</button>')
    return topic_shell(p, k, t, tag, ''.join(body), ' open' if opened else '')


def topic_shell(p, k, t, tag, body, attrs='', box=''):
    e = lambda s: html.escape(s, quote=False)
    return ('<details class="pr-t" id="t-%d-%d"%s><summary><%s>%s</%s> <small>%s</small><em>%s</em></summary>'
            '<div class="pr-dt"%s>%s</div></details>') % (
        p['n'], k, attrs, tag, e(t['title']), tag, he_ref(p['book'], *t['range']), e(t['idea']), box, body)


def url_of(p):
    return '/kodesh/parasha/%s/' % p['slug']


def block(p):
    """בדף השבועי: כותרות ומסרים; דבר התורה המלא נטען מדף הפרשה כשפותחים נושא."""
    out = ['<!--dt:%d--><div class="pr-topics"><h3>נושאי פרשת %s: דבר תורה לכל נושא</h3>' % (p['n'], p['name']),
           '<p class="pr-hint">לחצו על נושא כדי לפתוח דבר תורה קצר, או היכנסו ל<a href="%s">דף פרשת %s עם כל דברי התורה</a>.</p>'
           % (url_of(p), p['name'])]
    for k, t in enumerate(p['topics'], 1):
        link = '<p><a href="%s#t-%d-%d">לדבר התורה המלא על “%s”</a></p>' % (
            url_of(p), p['n'], k, html.escape(t['title'], quote=False))
        out.append(topic_shell(p, k, t, 'h4', link, box=' data-src="%s"' % url_of(p)))
    out.append('</div><!--/dt-->')
    return ''.join(out)


def page_html(p, verses, hub, by_n, m_data):
    import parasha_box as box
    e = lambda s: html.escape(s, quote=False)
    name, n = p['name'], p['n']
    names = dict((int(a), b) for a, b in re.findall(r'<details id="p-(\d+)" data-name="([^"]+)">', hub))
    m = re.search(r'<details id="p-%d" data-name="[^"]+"><summary>[^<]*<span>([^<]+)</span></summary>.*?'
                  r'<p class="pr-short">.*?</p>(.*?)</details>' % n, hub, re.S)
    if not m:
        sys.exit('לא נמצאה בדף פרשה %d %s' % (n, name))
    rng, extra = m.group(1), m.group(2).strip().replace('<h3>', '<h2>').replace('</h3>', '</h2>')
    titles = [t['title'] for t in p['topics']]
    faq = [list(x) for x in p['faq']] + [[
        'אילו נושאים יש לדבר תורה לפרשת %s?' % name,
        'בדף %d נושאים לפי סדר הפרקים: %s. לוחצים על נושא ונפתח דבר תורה קצר עם הפסוקים בניקוד.'
        % (len(titles), ', '.join(titles))]]
    facts, extra_faq = box.box_html(p, m_data)
    faq += extra_faq
    ld = {'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in faq]}
    title = 'פרשת %s – דבר תורה קצר ונושאי הפרשה' % name
    article = {'@context': 'https://schema.org', '@type': 'Article', 'headline': title,
               'dateModified': UPDATED, 'inLanguage': 'he', 'about': {'@type': 'Thing', 'name': 'פרשת %s' % name},
               'mainEntityOfPage': 'https://hakelim.com' + url_of(p),
               'author': {'@type': 'Organization', 'name': 'מיזם הכלים של גילעד רחמים',
                          'url': 'https://hakelim.com/kelim/'}}
    meta = {
        'site': 'kodesh', 'nav': 'taarichim', 'tool': 'parasha',
        'title': title,
        'description': 'פרשת %s: %d דברי תורה קצרים, ובהם “%s”. ההפטרה, העליות ושאלות לילדים. בחינם, בלי הרשמה.'
                       % (name, len(titles), titles[0]),
        'og_title': 'פרשת %s – %d דברי תורה קצרים לשולחן שבת' % (name, len(titles)),
        'priority': '0.7',
        'crumbs': [['פרשת השבוע', '/kodesh/parasha/'], ['פרשת %s' % name, None]],
        'head': '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/kehila.css">'
                '<link rel="stylesheet" href="/assets/kodesh-wave2.css"><script type="application/ld+json">%s</script>'
                '<script type="application/ld+json">%s</script>'
                % tuple(json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in (ld, article)),
        'foot': '<script src="/assets/kodesh-parasha-page.js" defer></script>',
    }

    def near(i, word):
        if i not in names:
            return ''
        q = by_n.get(i)
        href = url_of(q) if q else '/kodesh/parasha/#p-%d' % i
        return '<a class="btn btn-line" href="%s">%s: פרשת %s</a>' % (href, word, names[i])

    out = ['<!--meta %s -->' % json.dumps(meta, ensure_ascii=False, indent=1),
           '<header class="k-hero">', '  <h1>פרשת %s: דבר תורה קצר לכל נושא בפרשה</h1>' % name,
           '  <p class="sub">%d דברי תורה לפרשת %s (%s) לפי סדר הפרקים, תקציר, הפטרה, עליות ושאלות לילדים. בחינם, בלי הרשמה ובלי פרסומות.</p>'
           % (len(titles), name, rng), '</header>',
           '<div class="tool pr-page" id="parasha" data-name="%s">' % name,
           '<p class="pr-hk" id="pr-hk"><span aria-hidden="true">🕯️</span> <span id="pr-hk-t">רוצים שהלימוד של השבוע יהיה לזכות מישהו יקר?</span> <a href="/kodesh/parasha/hakdasha/" id="pr-hk-a" data-mv="hakdasha_line">להקדיש שבוע</a></p>',  # שורת הקדשת השבוע; הנוסח מתחלף ב-kodesh-parasha-page.js
           '<div class="pr-topics"><h2>נושאי פרשת %s</h2>' % name,
           '<p class="pr-hint">הנושא הראשון כבר פתוח. לחצו על כל נושא אחר כדי לקרוא את דבר התורה שלו.</p>']
    out += [topic_html(p, verses, k, t, 'h3', opened=(k == 1)) for k, t in enumerate(p['topics'], 1)]
    out += ['<div class="pr-nav"><button type="button" class="btn btn-gold" id="pr-all-share">לשלוח את נושאי הפרשה למשפחה בווטסאפ</button></div>',
            '</div></div>',
            facts, box.kids_html(p, verses),
            '<section class="k-sec seo-txt" aria-labelledby="pr-short-h">',
            '  <h2 id="pr-short-h">פרשת %s בקצרה</h2>' % name,
            '  <p>%s</p>' % e(p['summary']), extra,
            '  <h2>איך אומרים דבר תורה על פרשת %s</h2>' % name,
            '  <p>בוחרים מתוך הרשימה נושא שמתאים ליושבים סביב השולחן, למשל “%s” או “%s”. קוראים את הפסוקים, מספרים את הרעיון במילים שלכם ומסיימים בשורת המעשה. לדבר תורה ארוך יותר לשמחה או לאירוע אפשר להיעזר ב<a href="/kodesh/dvar-torah/">מחולל דבר התורה</a>.</p>'
            % (e(titles[0]), e(titles[-1])),
            '  <div class="pr-nav">%s<a class="btn btn-line" href="/kodesh/parasha/">פרשת השבוע הזה</a>%s</div>'
            % (near(n - 1, 'הקודמת'), near(n + 1, 'הבאה')),
            box.book_links(p, by_n),
            '  <p>עוד לשבת: <a href="/kodesh/zmanim/">זמני כניסת ויציאת השבת</a> · <a href="/kodesh/birkat-hamazon/">ברכת המזון</a> · <a href="/kodesh/luach-ivri/">הלוח העברי</a>.</p>',
            '  <p class="disclaimer">דברי התורה נכתבו לדף הזה על פי פשט הכתובים, ובמקום שנזכר רש״י הוא נמסר בקצרה ובלשוננו. נוסח הפסוקים מאתר ספריא. מיזם חסד, בלי כוונת רווח.</p>',
            '</section>',
            '<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">',
            '  <h2 id="seo-faq-h">שאלות ותשובות על פרשת %s</h2>' % name]
    out += ['  <details><summary>%s</summary><p>%s</p></details>' % (e(q), e(a)) for q, a in faq]
    out.append('</section>')
    return '\n'.join(out) + '\n'


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
    import parasha_box as box
    errs = check(parshiot, verses) + box.check_kids(parshiot, verses)
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
        page, hits = pat.subn(lambda m: m.group(1) + block(p), page, count=1)
        if hits != 1:
            sys.exit('לא נמצאה בדף פרשה %d %s' % (p['n'], p['name']))
    by_n = {p['n']: p for p in parshiot}
    m_data = box.meta()
    m_data['names'] = {str(p['n']): p['name'] for p in parshiot}
    page = re.sub(r'<!--pr-gen-->.*?<!--/pr-gen-->\r?\n\r?\n', '', page, flags=re.S)
    if '<!--pr-video-->' not in page:
        sys.exit('לא נמצא בדף המקום לאזורים הנוספים')
    page = page.replace('<!--pr-video-->', box.hub_html(by_n, m_data) + '\n\n<!--pr-video-->', 1)
    with open(PAGE, 'w', encoding='utf-8', newline='') as f:
        f.write(page)
    clean = re.sub(r'<!--dt:\d+-->.*?<!--/dt-->', '', page, flags=re.S)
    for p in parshiot:
        d = os.path.join(os.path.dirname(PAGE), p['slug'])
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(page_html(p, verses, clean, by_n, m_data))
    print('שובץ לדף, ונכתבו %d דפי פרשה' % len(parshiot))


if __name__ == '__main__':
    sys.modules.setdefault('parasha_dt', sys.modules['__main__'])
    main()
