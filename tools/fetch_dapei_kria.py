#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""מוריד מספריא (API v3) את המקורות של דפי הקריאה, בדיוק כפי שהם:
  tools/data/dapei-kria-source.json  – ברכת המזון, מעין שלוש, תפילת הדרך, ברכת הגומל, ומקורות ההלכה שמצוטטים בדפים
  tools/data/tehillim-source.json    – ספר תהילים, 150 פרקים (מקרא על פי המסורה)
אלה המקורות. tools/make_dapei_kria.py ו-tools/tehillim_pages.py בונים מהם את הדפים,
ו-tools/check_dapei_kria.py מוריד שוב מספריא ומשווה את הדפים הבנויים למקור.
מריצים רק כשרוצים לרענן מהמקור:
  python tools/fetch_dapei_kria.py siddur     ואז     python tools/fetch_dapei_kria.py tehillim
"""
import json, sys, time, pathlib, urllib.request, urllib.parse

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "tools" / "data"
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36'}

M = 'The Metsudah siddur, 1981'
D = 'Daat Siddur Ashkenaz'
T = 'Torat Emet 357'
E = None  # ברירת המחדל של ספריא לסידור עדות המזרח (מהדורת שלייסבו)

REFS = {
    # ברכת המזון
    'ash_mazon': ("Siddur Ashkenaz, Berachot, Birkat HaMazon", M),
    'sef_mazon': ("Siddur Sefard, Birchat HaMazon, Birchat HaMazon", M),
    'sef_mazon_te': ("Siddur Sefard, Birchat HaMazon, Birchat HaMazon", T),
    'em_mazon': ("Siddur Edot HaMizrach, Post Meal Blessing", E),
    # מעין שלוש
    'ash_meein': ("Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating, Brachot Achronot, Al Hamichyah", D),
    'sef_meein': ("Siddur Sefard, Blessings After Eating, Me'ein Shalosh", E),
    'em_meein': ("Siddur Edot HaMizrach, Al Hamihya", E),
    'ash_nefashot': ("Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating, Brachot Achronot, Borei Nefashot", D),
    'sef_nefashot': ("Siddur Sefard, Blessings After Eating, Borei Nefashot", E),
    'em_nehenin': ("Siddur Edot HaMizrach, Blessings on Enjoyments", E),
    # תפילת הדרך
    'ash_haderech': ("Siddur Ashkenaz, Berachot, Tefillat HaDerech", D),
    'sef_haderech': ("Siddur Sefard, Blessings After Eating, Traveler's Prayer", E),
    'sef_haderech_air': ("Siddur Sefard, Blessings After Eating, Air Traveler's Prayer", E),
    'em_haderech': ("Siddur Edot HaMizrach, Assorted Blessings and Prayers, Traveler's Prayer", E),
    # ברכת הגומל
    'sef_gomel': ("Siddur Sefard, Shabbat Morning Services, Thanksgiving Blessing", E),
    'em_gomel': ("Siddur Edot HaMizrach, Shabbat Shacharit, HaGomel", E),
    # מקורות ההלכה שמצוטטים (מצטטים ומציינים מקור, לא פוסקים)
    'sa_110': ("Shulchan Arukh, Orach Chayim 110", E),
    'mb_110': ("Mishnah Berurah 110", E),
    'kitzur_68': ("Kitzur Shulchan Arukh 68", E),
    'sa_219': ("Shulchan Arukh, Orach Chayim 219", E),
    'kitzur_44': ("Kitzur Shulchan Arukh 44", E),
    'kitzur_45': ("Kitzur Shulchan Arukh 45", E),
    'kitzur_51': ("Kitzur Shulchan Arukh 51", E),
    'sa_184': ("Shulchan Arukh, Orach Chayim 184", E),
    'sa_186': ("Shulchan Arukh, Orach Chayim 186", E),
    'sa_192': ("Shulchan Arukh, Orach Chayim 192", E),
    'berakhot_29b': ("Berakhot 29b", E),
    'deut_8_10': ("Deuteronomy 8:10", E),
}


def get(u):
    for i in range(8):
        try:
            return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=45))
        except Exception as e:
            print('retry', i, e, file=sys.stderr)
            time.sleep(6)
    raise SystemExit('נכשל: ' + u)


def text(ref, ver=None):
    u = 'https://www.sefaria.org/api/v3/texts/' + urllib.parse.quote(ref) + '?version=' + urllib.parse.quote('hebrew|' + ver if ver else 'hebrew')
    j = get(u)
    if not j.get('versions'):
        return None
    v = j['versions'][0]
    return {'ref': ref, 'heRef': j.get('heRef'), 'versionTitle': v.get('versionTitle'), 'license': v.get('license'),
            'versionSource': v.get('versionSource'), 'text': v['text']}


def siddur(only=None):
    dest = DATA / "dapei-kria-source.json"
    out = json.loads(dest.read_text(encoding="utf-8")) if dest.exists() else {}
    for k, (r, ver) in REFS.items():
        if only and k not in only:
            continue
        if k in out and not only:
            continue
        got = text(r, ver)
        if not got:
            print('אין גרסה:', k, r, file=sys.stderr)
            continue
        out[k] = got
        print(k, got['versionTitle'], got['license'], len(got['text']), file=sys.stderr)
        dest.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
        time.sleep(2)


def tehillim():
    dest = DATA / "tehillim-source.json"
    out = json.loads(dest.read_text(encoding="utf-8")) if dest.exists() else {"chapters": {}}
    for n in range(1, 151):
        if str(n) in out["chapters"]:
            continue
        got = text("Psalms %d" % n)
        out["versionTitle"], out["license"], out["versionSource"] = got['versionTitle'], got['license'], got['versionSource']
        out["chapters"][str(n)] = got['text']
        print(n, len(got['text']), file=sys.stderr)
        if n % 10 == 0 or n == 150:
            dest.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
        time.sleep(1.2)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=0), encoding="utf-8")
    assert len(out["chapters"]) == 150


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    if mode == "siddur":
        siddur(set(sys.argv[2:]) or None)
    elif mode == "tehillim":
        tehillim()
    else:
        print(__doc__)
