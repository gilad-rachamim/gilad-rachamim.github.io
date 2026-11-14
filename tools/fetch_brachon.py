#!/usr/bin/env python3
"""מוריד מספריא (API v3) את נוסחי הברכונים, בדיוק כפי שהם, אל tools/brachon-source.json.
זה המקור. tools/gen_brachon.py בונה ממנו את assets/brachon-data.js, ו-tools/check_brachon.js בודק שהפלט זהה לו.
מריצים רק כשרוצים לרענן מהמקור:  python tools/fetch_brachon.py tools/brachon-source.json
"""
import json,sys,time,urllib.request,urllib.parse
UA={'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36'}
def get(u):
    for i in range(6):
        try: return json.load(urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=40))
        except Exception as e: print('retry',e,file=sys.stderr); time.sleep(6)
M='The Metsudah siddur, 1981'; D='Daat Siddur Ashkenaz'; T='Torat Emet 357'
E=None
refs={'ash_shema':("Siddur Ashkenaz, Weekday, Maariv, Keri'at Shema al Hamita",M),
'ash_mazon':("Siddur Ashkenaz, Berachot, Birkat HaMazon",M),
'ash_meein':("Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating, Brachot Achronot, Al Hamichyah",D),
'ash_nefashot':("Siddur Ashkenaz, Berachot, Birkat Hanehenin, Eating, Brachot Achronot, Borei Nefashot",D),
'sef_shema':("Siddur Sefard, Bedtime Shema",T),
# ברכת המזון ספרד: ב"תורת אמת" שבספריא מקטעים 79–90 ריקים (מ"הרחמן הוא ינחילנו" ועד "יראו את ה'").
# לכן סוף הברכה בלבד (אותם מקטעים, אותה הפניה) לקוח מסידור "מצודה". כך גם כתוב בדף ובשורת המקור בברכון.
'sef_mazon':("Siddur Sefard, Birchat HaMazon, Birchat HaMazon",T,(0,79)),
'sef_mazon_end':("Siddur Sefard, Birchat HaMazon, Birchat HaMazon",M,(79,91)),
'sef_mazon_shichecha':("Siddur Sefard, Birchat HaMazon, Birchat HaMazon",T,(91,None)),
'sef_foods':("Siddur Sefard, Birchat HaMazon, Blessing on Foods",T),
'em_shema':("Siddur Edot HaMizrach, Bedtime Shema",E),
'em_mazon':("Siddur Edot HaMizrach, Post Meal Blessing",E),
'em_meein':("Siddur Edot HaMizrach, Al Hamihya",E),
'sef_brit':("Siddur Sefard, Birchat HaMazon, Brit Milah",T),
'ash_haderech':("Siddur Ashkenaz, Berachot, Tefillat HaDerech",D),
'em_haderech':("Siddur Edot HaMizrach, Assorted Blessings and Prayers, Traveler's Prayer",E),
}
out={}
for k,(r,ver,*cut) in refs.items():
    j=get('https://www.sefaria.org/api/v3/texts/'+urllib.parse.quote(r)+'?version='+urllib.parse.quote('hebrew|'+ver if ver else 'hebrew'))
    v=j['versions'][0]
    out[k]={'ref':r,'heRef':j.get('heRef'),'versionTitle':v.get('versionTitle'),'license':v.get('license'),'versionSource':v.get('versionSource'),'text':v['text'][cut[0][0]:cut[0][1]] if cut else v['text']}
    if cut: out[k]['segments']=[cut[0][0],cut[0][1] if cut[0][1] is not None else len(v['text'])]
    print(k,v.get('versionTitle'),v.get('license'),len(v['text']),file=sys.stderr)
    time.sleep(3)
json.dump(out,open(sys.argv[1],'w',encoding='utf-8'),ensure_ascii=False,indent=1)
