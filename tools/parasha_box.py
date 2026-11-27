#!/usr/bin/env python3
"""אזורי "הפרשה במספרים", "לילדים" וטבלת ההפטרות, עבור tools/parasha_dt.py.

הנתונים: tools/data/parasha-meta/meta.json (parasha_meta.py) ו-kids/NN.json.
"""
import html
import json
import os
import re

import parasha_dt as dt

DIR = os.path.join(dt.ROOT, 'tools', 'data', 'parasha-meta')
ALIYOT = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי']
REASONS = {
    'Shabbat Machar Chodesh': 'שבת מחר חודש', 'Shabbat Rosh Chodesh': 'שבת ראש חודש',
    'Chanukah Day 1 (on Shabbat)': 'שבת חנוכה', 'Chanukah Day 4 (on Shabbat)': 'שבת חנוכה',
    'Chanukah Day 8 (on Shabbat)': 'שבת חנוכה', 'Shabbat Shekalim': 'שבת שקלים', 'Shabbat Zachor': 'שבת זכור',
    'Shabbat Parah': 'שבת פרה', 'Shabbat HaChodesh': 'שבת החודש',
    'Shabbat HaChodesh (on Rosh Chodesh)': 'שבת החודש וראש חודש', 'Shabbat HaGadol': 'שבת הגדול',
    'Pinchas occurring after 17 Tammuz': 'פינחס שאחרי י״ז בתמוז',
    'Ki Teitzei with 3rd Haftarah of Consolation': 'בתוספת ההפטרה השלישית משבע דנחמתא',
    'Shabbat Shuva (with Vayeilech)': 'שבת שובה', "Shabbat Shuva (with Ha'azinu)": 'שבת שובה',
}
# הערות לפרשות שבהן יש הבדל בין מקורות או בין מנהגים
NOTES = {
    19: 'יש חומשים שמחלקים אחרת את העליות שני ושלישי בפרשת תרומה. החלוקה כאן לפי ספריא.',
    29: 'בהפטרות של אחרי מות וקדושים יש מנהגים שונים. כדאי לבדוק בלוח של בית הכנסת.',
    30: 'בהפטרות של אחרי מות וקדושים יש מנהגים שונים. כדאי לבדוק בלוח של בית הכנסת.',
}
e = lambda s: html.escape(s, quote=False)


def meta():
    return json.load(open(os.path.join(DIR, 'meta.json'), encoding='utf-8'))


def kids(n):
    return json.load(open(os.path.join(DIR, 'kids', '%02d.json' % n), encoding='utf-8'))


def check_kids(parshiot, verses):
    errs = []
    for p in parshiot:
        w0 = 'שאלות ילדים %d' % p['n']
        try:
            k = kids(p['n'])
        except (OSError, ValueError) as x:
            errs.append('%s: אין קובץ תקין (%s)' % (w0, x))
            continue
        if k.get('n') != p['n'] or len(k.get('q', [])) != 3 or 'riddle' not in k:
            errs.append('%s: מבנה שגוי' % w0)
            continue
        first, last = dt.cv(p['topics'][0]['range'][0]), dt.cv(p['topics'][-1]['range'][1])
        for i, x in enumerate(k['q'] + [k['riddle']]):
            w = '%s/%d' % (w0, i + 1)
            c, v = dt.cv(x['ref'])
            ch = verses[p['book']].get(str(c))
            if not (first <= (c, v) <= last) or not ch or v > len(ch):
                errs.append('%s: פסוק מחוץ לפרשה %s' % (w, x['ref']))
                continue
            q = dt.norm(x['quote'])
            if len(q.split()) < 2 or ' %s ' % q not in ' %s ' % dt.norm(ch[v - 1]):
                errs.append('%s: הציטוט לא בפסוק %s: %s' % (w, x['ref'], x['quote']))
            if len(x['q']) > (220 if i == 3 else 90) or len(x['a']) > 180:
                errs.append('%s: ארוך מדי' % w)
            if re.search(r'[A-Za-z<>]', x['q'] + x['a']):
                errs.append('%s: תווים זרים' % w)
    return errs


def hyear(y):
    """787 -> תשפ״ז"""
    s = ''
    while y >= 400:
        s += 'ת'
        y -= 400
    if y >= 100:
        s += 'קרש'[y // 100 - 1]
        y %= 100
    s += dt.gem(y).replace('׳', '').replace('״', '') if y else ''
    return s[:-1] + '״' + s[-1]


def when(r):
    d, month, y = r['hdate']
    yy, mm, dd = r['date'].split('-')
    return '%s ב%s %s (<span dir="ltr">%d.%d.%s</span>)' % (dt.gem(d), month, hyear(y), int(dd), int(mm), yy)


def span(a, b):
    c1, v1 = dt.cv(a)
    c2, v2 = dt.cv(b)
    s = '%s, %s' % (dt.gem(c1), dt.gem(v1))
    if (c1, v1) != (c2, v2):
        s += '–' + (dt.gem(v2) if c1 == c2 else '%s, %s' % (dt.gem(c2), dt.gem(v2)))
    return s


def segs_he(segs, names):
    out, prev = [], None
    for book, a, b in segs:
        out.append(('' if book == prev else names[book] + ' ') + span(a, b))
        prev = book
    return '; '.join(out)


def parse_ref(s):
    """'Isaiah 27:6-28:13, 29:22-23' -> [[Isaiah,27:6,28:13],[Isaiah,29:22,29:23]]"""
    out, book = [], None
    for part in re.split(r'[;,]\s*', s):
        m = re.fullmatch(r'(?:([A-Za-z ]+?) )?(\d+):(\d+)(?:-(?:(\d+):)?(\d+))?', part.strip())
        if not m:
            raise ValueError('הפניה לא מוכרת: %s' % s)
        book = m.group(1) or book
        c1, v1, c2, v2 = m.group(2), m.group(3), m.group(4), m.group(5)
        out.append([book, '%s:%s' % (c1, v1), '%s:%s' % (c2 or c1, v2 or v1)])
    return out


def customs(ash, seph):
    if ash == seph:
        return e(ash)
    return 'אשכנזים: %s · ספרדים: %s' % (e(ash), e(seph))


def read_haft(r, names):
    """ההפטרה בשבת מסוימת, כולל סיבה לשבת מיוחדת."""
    full, _, why = r['haft'].partition(' | ')
    ash = segs_he(parse_ref(full), names)
    seph = segs_he(parse_ref(r['seph'].split(' | ')[0]), names) if r['seph'] else ash
    why = why or r['seph'].partition(' | ')[2]
    return customs(ash, seph), REASONS[why] if why else ''


def names_map():
    import parasha_meta
    return parasha_meta.NEVIIM


def box_html(p, m):
    """תיבת הנתונים בדף פרשה. מחזירה (html, שתי שאלות ותשובות)."""
    names, name, n = names_map(), p['name'], p['n']
    x = m['parashot'][str(n)]
    book = dt.BOOKS[x['book']]
    whole = span('%d:%d' % tuple(x['range'][0]), '%d:%d' % tuple(x['range'][1]))
    ash, seph = segs_he(x['haft'], names), segs_he(x['seph'], names)
    out = ['<section class="k-sec seo-txt pr-box" aria-labelledby="pr-box-h">',
           '  <h2 id="pr-box-h">הפטרת פרשת %s, %sמספר פסוקים</h2>' % (name, 'עליות ו' if n < 54 else ''),
           '  <ul class="pr-facts"><li><b>ספר:</b> %s, %s</li><li><b>מספר פסוקים:</b> %d</li>'
           '<li><b>ההפטרה:</b> %s</li></ul>' % (book, whole, x['verses'], customs(ash, seph)),
           ]
    if n < 54:  # את וזאת הברכה קוראים בשמחת תורה בחלוקה לפי המנהג, ולכן אין לה רשימת שבע עליות
        out += ['  <h3>חלוקת העליות בפרשת %s</h3>' % name, '  <ol class="pr-aliyot">']
        for label, r in zip(ALIYOT, x['aliyot']):
            a, _, b = r.partition('-')
            b = b or a
            if ':' not in b:
                b = a.split(':')[0] + ':' + b
            out.append('    <li><b>%s:</b> %s</li>' % (label, span(a, b)))
        out.append('  </ol>')
    out.append('  <h3>מתי קוראים את פרשת %s</h3>' % name)
    if x['reads']:
        out.append('  <ul class="pr-reads">')
        for r in x['reads']:
            haft, why = read_haft(r, names)
            extra = ' יחד עם פרשת %s.' % ' ו'.join(m['names'][str(k)] for k in r['with']) if r['with'] else ''
            out.append('    <li data-date="%s"><b>שבת %s</b>%s<br>הפטרה באותה שבת%s: %s</li>'
                       % (r['date'], when(r), extra, ' (%s)' % why if why else '', haft))
        out.append('  </ul>')
        out.append('  <p>התאריכים לפי לוח ארץ ישראל. בשבת מיוחדת (ראש חודש, חנוכה, ארבע פרשיות ועוד) '
                   'מחליפה לפעמים הפטרה אחרת את ההפטרה הקבועה.</p>')
        a2 = 'ההפטרה הקבועה של פרשת %s היא %s. בשבת מיוחדת קוראים לפעמים הפטרה אחרת.' % (name, customs(ash, seph))
    else:
        out.append('  <p>את פרשת %s קוראים בשמחת תורה, בארץ ישראל בכ״ב בתשרי, ולא בשבת רגילה. '
                   'מפטירים בספר יהושע, בהפטרה שמופיעה למעלה.</p>' % name)
        a2 = 'בשמחת תורה, שבו קוראים את פרשת %s, ההפטרה היא %s.' % (name, customs(ash, seph))
    if n in NOTES:
        out.append('  <p>%s</p>' % NOTES[n])
    out.append('  <p class="disclaimer">מקורות הנתונים: ספריא (עליות ופסוקים) ו-Hebcal (הפטרות ולוח השבתות).</p>')
    out.append('</section>')
    faq = [['מה ההפטרה של פרשת %s?' % name, html.unescape(a2)],
           ['כמה פסוקים יש בפרשת %s?' % name,
            'בפרשת %s יש %d פסוקים, בספר %s %s.' % (name, x['verses'], book, whole)]]
    return '\n'.join(out), faq


def kids_html(p, verses):
    k, name = kids(p['n']), p['name']
    out = ['<section class="k-sec seo-txt pr-kids" id="kids" aria-labelledby="pr-kids-h">',
           '  <h2 id="pr-kids-h">פרשת %s לילדים</h2>' % name,
           '  <p>שלוש שאלות וחידה על פרשת %s לשולחן שבת. עונים, ואז לוחצים כדי לבדוק בפסוק.</p>' % name]
    for i, x in enumerate(k['q'] + [k['riddle']]):
        if i == 3:
            out.append('  <h3>חידה לפרשת %s</h3>' % name)
        out.append('  <details><summary>%s</summary><p>%s</p>%s</details>'
                   % (e(x['q']), e(x['a']), dt.quote_html(p, verses, x['ref'], x['quote'])))
    out.append('</section>')
    return '\n'.join(out)


def hub_html(by_n, m):
    """אזורים בעמוד המרכז: איזה פרשה השבוע והפטרת השבוע, ופרשת השבוע לילדים."""
    names = names_map()
    shabbat = {}
    for k, x in m['parashot'].items():
        for r in x['reads']:
            shabbat.setdefault(r['date'], (r, sorted([int(k)] + r['with'])))
    rows = []
    for date in sorted(shabbat)[:30]:
        r, nums = shabbat[date]
        haft, why = read_haft(r, names)
        links = ' – '.join('<a href="%s">%s</a>' % (dt.url_of(by_n[i]), by_n[i]['name']) for i in nums)
        rows.append('      <tr data-date="%s"><td>%s</td><td>%s%s</td><td>%s</td></tr>'
                    % (date, when(r), links, ' <small>%s</small>' % why if why else '', haft))
    out = ['<!--pr-gen--><section class="k-sec seo-txt" aria-labelledby="pr-which-h">',
           '  <h2 id="pr-which-h">איזה פרשה השבוע? מה פרשת השבוע והפטרת השבוע</h2>',
           '  <p>בטבלה מופיעות השבתות הקרובות לפי לוח ארץ ישראל: מה פרשת השבוע בכל שבת, ומה הפטרת השבוע '
           'לאשכנזים ולספרדים, כולל שבתות מיוחדות. לוחצים על שם הפרשה ומקבלים דבר תורה לפרשת השבוע, '
           'את חלוקת העליות ואת מספר הפסוקים.</p>',
           '  <div class="pr-tbl"><table><thead><tr><th>שבת</th><th>הפרשה</th><th>ההפטרה</th></tr></thead><tbody>']
    out += rows
    out += ['  </tbody></table></div>', '</section>',
            '<section class="k-sec seo-txt" id="kids" aria-labelledby="pr-hubkids-h">',
            '  <h2 id="pr-hubkids-h">פרשת השבוע לילדים</h2>',
            '  <p>לכל פרשה יש שלוש שאלות וחידה לילדים, והתשובה עם הפסוק נפתחת בלחיצה. '
            'אפשר לשאול בשולחן שבת, בגן, בכיתה או לפני השינה. בוחרים פרשה:</p>']
    for bi, (en, he) in enumerate(dt.BOOKS.items(), 1):
        links = ' · '.join('<a href="%s#kids">%s</a>' % (dt.url_of(q), q['name'])
                           for q in sorted(by_n.values(), key=lambda q: q['n']) if q['book'] == en)
        out.append('  <p><b>%s:</b> %s</p>' % (he, links))
    out.append('</section><!--/pr-gen-->')
    return '\n'.join(out)


def book_links(p, by_n):
    """כל פרשות אותו חומש, וקיצורי דרך לשאר החומשים בעמוד המרכז."""
    same = sorted((q for q in by_n.values() if q['book'] == p['book']), key=lambda q: q['n'])
    items = ''.join('<li><a href="%s"%s>פרשת %s</a></li>'
                    % (dt.url_of(q), ' aria-current="page"' if q['n'] == p['n'] else '', q['name']) for q in same)
    others = ' · '.join('<a href="/kodesh/parasha/#sefer-%d">%s</a>' % (i, he)
                        for i, (en, he) in enumerate(dt.BOOKS.items(), 1) if en != p['book'])
    return ('  <h2>כל פרשות ספר %s</h2>\n  <ul class="pr-book-links">%s</ul>\n  <p>לשאר החומשים: %s.</p>'
            % (dt.BOOKS[p['book']], items, others))
