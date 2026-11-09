# -*- coding: utf-8 -*-
"""מאגר מספרי פקס ציבוריים -> לאן שולחים בחינם (assets/machshev-fax-list.json).

הרצה מתיקיית הריפו:  python -I tools/fax_directory.py
- ביטוח לאומי: מוריד את דף כל סניף מ-btl.gov.il (curl עובד עם User-Agent) ומפרק את טבלת "פרטי מחלקות".
  כל פקס של ביטוח לאומי ממופה לשירות "שליחת מסמכים לפקיד" (בלי קוד ובלי סיסמה).
- שאר הגופים: tools/fax-manual.json, רשומות שנבדקו ידנית בדף הרשמי (gov.il חוסם curl, ולכן נאספו בדפדפן).
  כל רשומה שם חייבת src (הדף הרשמי) ו-checked (תאריך הבדיקה). בלי מקור - לא נכנסת.
מבנה כל רשומה: {n, cat, fax:[ספרות בלבד], email, url, src, checked}.
"""
import datetime
import html
import json
import os
import re
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'machshev-fax-list.json')
MANUAL = os.path.join(ROOT, 'tools', 'fax-manual.json')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
BTL = 'https://www.btl.gov.il'
BTL_DOCS = 'https://b2b.btl.gov.il/BTL.ILG.Payments/DocumentsInfo.aspx'
TODAY = datetime.date.today().isoformat()


def get(url, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'he'})
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.geturl(), r.read().decode('utf-8', 'replace')
        except Exception as e:  # רשת לא יציבה - עוד ניסיון
            print('  retry', i + 1, url, e, file=sys.stderr)
            time.sleep(3 + 3 * i)
    raise RuntimeError('fetch failed: ' + url)


def digits(s):
    d = re.sub(r'\D', '', s or '')
    if d.startswith('972'):
        d = '0' + d[3:]
    return d


def fax_numbers(cell):
    """כל המספרים בתא: 08-8686702 / 088686722 / 02 5393722 / 1-800-222110."""
    toks = re.findall(r'\d[\d\-]*\d|\d', cell or '')
    out, i = [], 0
    while i < len(toks):
        d = digits(toks[i])
        # קידומת לבד ("02 5393722") - מחברים עם הבא
        if len(d) in (2, 3) and d.startswith('0') and i + 1 < len(toks):
            d2 = d + digits(toks[i + 1])
            if len(d2) in (9, 10):
                d = d2
                i += 1
        ok = (d.startswith('0') and len(d) in (9, 10)) or (d.startswith('1') and len(d) == 10)
        if ok and d not in out:
            out.append(d)
        i += 1
    return out


def text(s):
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s)).strip()


def btl():
    _, home = get(BTL + '/snifim/Pages/default.aspx')
    branches = re.findall(r"GoToSnif\(&#39;(\d+)&#39;\s*,\s*&#39;False&#39;\)\">([^<]+)</a>", home)
    seen, recs = set(), []
    for mark, name in branches:
        if mark in seen:
            continue
        seen.add(mark)
        name = name.strip()
        src, page = get(BTL + '/SystemFiles/AjaxFiles/AjaxDataSource.aspx?p=GoToSnif&Mark=' + mark + '&Neguishut=False')
        tbl = re.search(r'GV_SnifeiUnits.*?</table>', page, re.S)
        n0 = len(recs)
        for row in re.findall(r'<tr class="td1-snifim[^"]*">(.*?)</tr>', tbl.group(0) if tbl else '', re.S):
            tds = re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)
            if len(tds) < 4:
                continue
            dept = text(tds[0])
            fx = fax_numbers(text(tds[3]))
            if dept and fx:
                recs.append({'n': 'ביטוח לאומי – סניף ' + name + ' – ' + dept, 'cat': 'btl', 'fax': fx,
                             'email': '', 'url': BTL_DOCS, 'src': src, 'checked': TODAY})
        central = re.search(r'פקס מרכזי:\s*</label>\s*<span[^>]*>([^<]+)</span>', page)
        if central:
            recs.append({'n': 'ביטוח לאומי – סניף ' + name + ' – פקס מרכזי', 'cat': 'btl', 'fax': fax_numbers(central.group(1)),
                         'email': '', 'url': BTL_DOCS, 'src': src, 'checked': TODAY})
        print('btl', name, len(recs) - n0, file=sys.stderr)
    return recs


def ckan(res_id):
    _, body = get('https://data.gov.il/api/3/action/datastore_search?limit=1000&resource_id=' + res_id)
    return json.loads(body)['result']['records']


def emails(s):
    return re.findall(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+', s or '')


def first_url(s):
    m = re.search(r'https?://[^\s"<>]+', s or '')
    return m.group(0).rstrip('.,') if m else ''


# טבלאות רשמיות ב-data.gov.il שיש בהן גם פקס וגם מייל או אתר.
# (שם מאגר, resource, קטגוריה, פונקציה שמחזירה (שם, פקס, מייל, אתר) משורה)
DATAGOV = [
    ('lishkahebrew', '2c499e31-cc80-4415-a6d0-71003305c5bb', 'avoda',
     lambda r: ('שירות התעסוקה – לשכת ' + (r.get('ישוב') or '').strip(), (r.get('פקס') or '') + ' ' + (r.get('פקס מתאם') or ''),
                (emails(r.get('Email')) or emails(r.get('דואל מתאם')) or [''])[0], 'https://www.taasuka.gov.il/')),
    ('bureaus-of-health', 'e01d86f2-e89f-4305-90e8-74cb88866092', 'briut',
     lambda r: ('משרד הבריאות – ' + (r.get('שם הלשכה') or '').strip(), r.get('פקס'), (emails(r.get('דואר אלקטרוני')) or [''])[0],
                first_url(r.get('הערות')))),
    ('holocaust-survivors-right-bureaus', '1c7024a4-f24f-4ab0-a012-0477aac27925', 'shoa',
     lambda r: ((r.get('Branch name') or '').strip(), r.get('Fax'), '', 'https://www.gov.il/he/departments/holocaust_survivors_rights_authority')),
    ('public-inquiry-officials-in-communications-companies', 'c4a2b0ea-5d31-4849-9bcc-935396625144', 'tikshoret',
     lambda r: ((r.get('חברה') or '').strip() + ' – פניות הציבור', r.get('פקס'), (emails(r.get('דואר אלקטרוני')) or [''])[0],
                first_url(r.get('טופס מקוון')))),
    ('375', 'ebb61778-e34c-4e67-8fcf-0e643d9cf8c2', 'bank',
     lambda r: ((r.get('Bank_Name') or '').strip(), r.get('Fax'), '', ('https://' + r['Internet_Address'].strip()) if (r.get('Internet_Address') or '').strip() and not r['Internet_Address'].strip().startswith('http') else (r.get('Internet_Address') or '').strip())),
]


def datagov():
    recs = []
    for name, res, cat, fn in DATAGOV:
        try:
            rows = ckan(res)
        except Exception as e:
            print('  datagov fail', name, e, file=sys.stderr)
            continue
        n0 = len(recs)
        for r in rows:
            n, fx, em, url = fn(r)
            fx = fax_numbers(fx or '')
            if url and not re.match(r'https?://[^/]+\.[a-z]{2,}(/|$|\?)', url):
                url = ''  # כתובת שבורה במקור
            if n and fx:
                recs.append({'n': n, 'cat': cat, 'fax': fx, 'email': em, 'url': url,
                             'src': 'https://data.gov.il/dataset/' + name, 'checked': TODAY})
        print('datagov', name, len(recs) - n0, file=sys.stderr)
    return recs


def manual():
    if not os.path.exists(MANUAL):
        return []
    out = []
    for r in json.load(open(MANUAL, encoding='utf-8')):
        if not r.get('src') or not r.get('checked') or not r.get('fax'):
            print('  skip (no src/checked/fax):', r.get('n'), file=sys.stderr)
            continue
        r['fax'] = [digits(f) for f in r['fax'] if 9 <= len(digits(f)) <= 10]
        out.append({k: r.get(k, '') for k in ('n', 'cat', 'fax', 'email', 'url', 'src', 'checked')})
    return out


GOVIL = os.path.join(ROOT, 'tools', 'fax-govil.json')


def govil():
    """tools/fax-govil.json: [urlName, כותרת, משרד, פקס, מייל] מכל דפי "קבלת קהל ועמדות שירות" ב-gov.il.
    gov.il חוסם סקריפטים מבחוץ, ולכן את הקובץ אוספים מתוך הדפדפן, בדף https://www.gov.il/he/government-service-branches:
    לכל משרד (GET /he/BureausWebApi/bureaus/GetAggregationForOffices) עוברים על POST /he/BureausWebApi/Bureaus
    עם {officeId, page}, ולכל סניף GET /he/BureausWebApi/Bureaus/<urlName> ולוקחים את contactUs: faxNumber ו-main_mail."""
    if not os.path.exists(GOVIL):
        return []
    rows = json.load(open(GOVIL, encoding='utf-8'))
    checked = rows[0] if rows and isinstance(rows[0], str) else TODAY
    out = []
    for r in rows:
        if not isinstance(r, list) or len(r) < 5:
            continue
        uid, title, office, fx, em = r[:5]
        title, office = (title or '').strip(), (office or '').strip()
        if not title or 'QA' in office or 'בדיק' in office:
            continue
        n = title if not office or office in title else office + ' – ' + title
        em = (emails(em) or [''])[0]
        if em and not re.search(r'\.(il|com|org|net|gov|co)$', em, re.I):
            em = ''  # כתובת עם טעות הקלדה במקור
        out.append({'n': n, 'cat': 'gov', 'fax': fax_numbers(fx), 'email': em, 'url': '',
                    'src': 'https://www.gov.il/he/government-service-branches/' + uid, 'checked': checked})
    print('govil', len(out), file=sys.stderr)
    return out


def main():
    recs = (btl() if "--no-btl" not in sys.argv else []) + datagov() + govil() + manual()
    recs = [r for r in recs if r['fax']]
    seen, uniq = set(), []
    for r in recs:  # אותו גוף ואותו פקס פעמיים (דפים כפולים במקור)
        k = (r['n'], tuple(r['fax']))
        if k not in seen:
            seen.add(k)
            uniq.append(r)
    recs = uniq
    json.dump(recs, open(OUT, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, separators=(',', ':'))
    cats = {}
    for r in recs:
        cats[r['cat']] = cats.get(r['cat'], 0) + 1
    print('records', len(recs), 'with email', sum(1 for r in recs if r['email']), cats)


if __name__ == '__main__':
    main()
