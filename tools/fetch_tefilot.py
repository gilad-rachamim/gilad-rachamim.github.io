#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""מוריד מספריא (API v3) את תפילת שחרית של חול בשלושה נוסחים ואת נשמת כל חי, בדיוק כפי שהם.
נשמר ב-tools/data/tefilot-source.json. tools/make_tefilot.py בונה מזה את /kodesh/shacharit/ ואת /kodesh/nishmat-kol-chai/.
הרצה (רק כשרוצים לרענן מהמקור): python tools/fetch_tefilot.py
"""
import json, sys, time, html, pathlib, urllib.request, urllib.parse
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36'}
DEST = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).resolve().parent / "data" / "tefilot-source.json"

def get(u):
    for i in range(4):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=45))
        except Exception as e:
            print('retry', i, e, file=sys.stderr); time.sleep(3)
    print('נכשל: ' + u, file=sys.stderr); return {}

def flat(x):
    if isinstance(x, str): return [x]
    o = []
    for y in x: o += flat(y)
    return o

def text(ref):
    j = get('https://www.sefaria.org/api/v3/texts/' + urllib.parse.quote(ref) + '?version=hebrew')
    if not j.get('versions'): return None
    v = j['versions'][0]
    return {'ref': ref, 'versionTitle': v.get('versionTitle'), 'license': v.get('license'), 'versionSource': v.get('versionSource'), 'text': flat(v['text'])}

def he(n, lang='he'):
    for t in n.get('titles', []):
        if t.get('lang') == lang and t.get('primary'): return t['text']
    return ''

def leaves(n, path, hpath, out):
    k = html.unescape(n.get('key') or '')
    if k != 'default' and he(n, 'en'): k = he(n, 'en')
    if k == 'default': k = ''
    p = path + [k] if k else path
    hp = hpath + [he(n)] if k else hpath
    if n.get('nodes'):
        for c in n['nodes']: leaves(c, p, hp, out)
    else:
        out.append((", ".join(p), hp))

BOOKS = {'em': ("Siddur Edot HaMizrach", ["Weekday Shacharit"]),
         'sef': ("Siddur Sefard", ["Weekday Shacharit"]),
         'ash': ("Siddur Ashkenaz", ["Weekday", "Shacharit"])}
NISHMAT = {'em': "Siddur Edot HaMizrach, Shabbat Shacharit, Pesukei D'Zimra",
           'sef': "Siddur Sefard, Shabbat Morning Services, Pesukei D'Zimrah",
           'ash': "Siddur Ashkenaz, Shabbat, Shacharit, Pesukei Dezimra, Nishmat Kol Chai",
           'ash_shochen': "Siddur Ashkenaz, Shabbat, Shacharit, Pesukei Dezimra, Shochen Ad",
           'ash_yishtabach': "Siddur Ashkenaz, Shabbat, Shacharit, Pesukei Dezimra, Yishtabach"}
out = json.loads(DEST.read_text(encoding='utf-8')) if DEST.exists() else {'shacharit': {}, 'nishmat': {}}
for nus, (book, pre) in BOOKS.items():
    if nus in out['shacharit']: continue
    idx = get("https://www.sefaria.org/api/v2/raw/index/" + urllib.parse.quote(book))
    L = []; leaves(idx['schema'], [], [], L)
    want = ", ".join([book] + pre) + ", "
    nodes = []
    for ref, hp in L:
        if not ref.startswith(want): continue
        g = text(ref)
        if not g: print('אין גרסה', ref, file=sys.stderr); continue
        g['he'] = hp[1 + len(pre):]
        nodes.append(g); print(nus, ref, len(g['text']), file=sys.stderr); time.sleep(.7)
    out['shacharit'][nus] = nodes
    DEST.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
for nus, ref in NISHMAT.items():
    if nus in out['nishmat']: continue
    out['nishmat'][nus] = text(ref); time.sleep(.7)
DEST.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
print('ok', {k: len(v) for k, v in out['shacharit'].items()})
