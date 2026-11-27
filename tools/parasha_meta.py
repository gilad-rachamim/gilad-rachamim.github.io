#!/usr/bin/env python3
"""נתוני "הפרשה במספרים": טווח, פסוקים, עליות, הפטרה ומועדי קריאה בארץ.

python -X utf8 tools/parasha_meta.py --fetch   מושך מהמקורות וכותב tools/data/parasha-meta/meta.json
python -X utf8 tools/parasha_meta.py           מאמת את הקובץ הקיים ומדפיס סיכום

מקורות: ספריא (חלוקת עליות ומספר פסוקים), Hebcal (טבלת הפטרות ולוח השבתות בארץ).
חלוקת העליות מאומתת מול לוח Hebcal בשבתות שבהן הפרשה נקראת לבדה.
"""
import datetime
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META = os.path.join(ROOT, 'tools', 'data', 'parasha-meta', 'meta.json')
BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']
TABLE = 'https://raw.githubusercontent.com/hebcal/hebcal-leyning/main/src/aliyot.json'
CAL = 'https://www.hebcal.com/hebcal?v=1&cfg=json&s=on&i=on&leyning=on&start=%s&end=%s'
NEVIIM = {'Joshua': 'יהושע', 'Judges': 'שופטים', 'I Samuel': 'שמואל א׳', 'II Samuel': 'שמואל ב׳',
          'I Kings': 'מלכים א׳', 'II Kings': 'מלכים ב׳', 'Isaiah': 'ישעיהו', 'Jeremiah': 'ירמיהו',
          'Ezekiel': 'יחזקאל', 'Hosea': 'הושע', 'Joel': 'יואל', 'Amos': 'עמוס', 'Obadiah': 'עובדיה',
          'Jonah': 'יונה', 'Micah': 'מיכה', 'Nachum': 'נחום', 'Habakkuk': 'חבקוק', 'Zephaniah': 'צפניה',
          'Haggai': 'חגי', 'Zechariah': 'זכריה', 'Malachi': 'מלאכי'}
MONTHS = {'Tishrei': 'תשרי', 'Cheshvan': 'חשוון', 'Kislev': 'כסלו', 'Tevet': 'טבת', 'Sh\'vat': 'שבט',
          'Shvat': 'שבט', 'Adar': 'אדר', 'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳', 'Nisan': 'ניסן', 'Iyyar': 'אייר',
          'Sivan': 'סיוון', 'Tamuz': 'תמוז', 'Av': 'אב', 'Elul': 'אלול'}


def get(url):
    raw = subprocess.run(['curl', '-s', '--fail', '--max-time', '90', url], capture_output=True, check=True).stdout
    return json.loads(raw.decode('utf-8'))


def segs(h):
    if not h:
        return []
    return [[x['k'], x['b'], x['e']] for x in (h if isinstance(h, list) else [h])]


def hdate(s):
    """'25 Kislev 5787' -> (25, 'כסלו', 787)"""
    day, rest = s.split(' ', 1)
    month, year = rest.rsplit(' ', 1)
    return [int(day), MONTHS[month], int(year) % 1000]


def fetch():
    table = get(TABLE)
    by_num = {v['num']: (k, v) for k, v in table.items() if isinstance(v.get('num'), int)}
    assert sorted(by_num) == list(range(1, 55)), 'טבלת ההפטרות לא מכסה 54 פרשות'
    names = {k: n for n, (k, _) in by_num.items()}
    out = {}
    n = 0
    for bi, book in enumerate(BOOKS):
        shape = get('https://www.sefaria.org/api/shape/%s' % book)[0]['chapters']
        for node in get('https://www.sefaria.org/api/index/%s' % book)['alts']['Parasha']['nodes']:
            n += 1
            first, last = node['wholeRef'].split(' ', 1)[1].split('-')
            c1, v1 = map(int, first.split(':'))
            c2, v2 = map(int, last.split(':')) if ':' in last else (c1, int(last))
            count = sum(shape[c1 - 1:c2 - 1]) - (v1 - 1) + v2
            row = by_num[n][1]
            out[n] = {'book': book, 'range': [[c1, v1], [c2, v2]], 'verses': count,
                      'aliyot': [r.split(' ', 1)[1] for r in node['refs']],
                      'haft': segs(row.get('haft')), 'seph': segs(row.get('seph')) or segs(row.get('haft')),
                      'reads': []}
        print('ספריא', book, 'עד פרשה', n)
    assert n == 54

    # לוח השבתות בארץ לשלוש שנים קדימה
    start = datetime.date.today()
    items = []
    for y in range(3):
        a = start + datetime.timedelta(days=364 * y)
        b = a + datetime.timedelta(days=363)
        items += get(CAL % (a.isoformat(), b.isoformat()))['items']
    seen, mismatch = set(), []
    for it in items:
        if it.get('category') != 'parashat' or it['date'] in seen:
            continue
        seen.add(it['date'])
        title = it.get('title_orig', it['title']).replace('Parashat ', '')
        if title in names:
            nums = [names[title]]
        else:
            parts = title.split('-')
            nums = next([names['-'.join(parts[:i])], names['-'.join(parts[i:])]]
                        for i in range(1, len(parts))
                        if '-'.join(parts[:i]) in names and '-'.join(parts[i:]) in names)
        ley = it['leyning']
        if len(nums) == 1:
            cal = [ley[str(i)].split(' ', 1)[1] for i in range(1, 8)]
            ours = out[nums[0]]['aliyot'][:7]

            def span(r):
                a, b = r.split('-')
                return a, b if ':' in b else a.split(':')[0] + ':' + b
            # המפטיר והשביעי משתנים בראש חודש וחגים; משווים את שש העליות הראשונות ואת פתיחת השביעית
            if [span(x) for x in cal[:6]] != [span(x) for x in ours[:6]]:
                mismatch.append((it['date'], title, cal, ours))
        for k in nums:
            if len(out[k]['reads']) < 3:
                out[k]['reads'].append({
                    'date': it['date'], 'hdate': hdate(it['hdate']),
                    'with': [x for x in nums if x != k],
                    'haft': ley.get('haftarah', ''), 'seph': ley.get('haftarah_sephardic', ''),
                    'reason': ley.get('reason', {})})
    for m in mismatch:
        print('פער בעליות:', m)
    print('שבתות בלוח: %d, פערים בחלוקת העליות: %d' % (len(seen), len(mismatch)))
    os.makedirs(os.path.dirname(META), exist_ok=True)
    with open(META, 'w', encoding='utf-8', newline='\n') as f:
        json.dump({'fetched': start.isoformat(), 'mismatch': [[m[0], m[1]] for m in mismatch],
                   'parashot': out}, f, ensure_ascii=False, indent=0)


def main():
    if '--fetch' in sys.argv:
        fetch()
    d = json.load(open(META, encoding='utf-8'))
    p = d['parashot']
    total = sum(x['verses'] for x in p.values())
    print('פרשות: %d, פסוקים: %d, בלי הפטרה: %s, בלי מועד: %s' % (
        len(p), total, [k for k, x in p.items() if not x['haft']], [k for k, x in p.items() if not x['reads']]))


if __name__ == '__main__':
    main()
