# -*- coding: utf-8 -*-
"""דפי מאגר הקריוקי: דף המאגר, דף לכל שיר, דף לכל זמר ודף השירים החדשים.

המקור: tools/data/karaoke-library.json (תמונת מצב של שירי המאגר של בוט הקריוקי).
האתר נבנה רק מהקובץ הזה, ולא תלוי בתור הבנייה שבמחשב.

הרצה:
  python tools/karaoke_library.py                       בונה את הדפים מתמונת המצב
  python tools/karaoke_library.py sync QUEUE [DATES]    מעדכן קודם את תמונת המצב מתור הבנייה (קריאה בלבד),
                                                        DATES = קובץ שורות "vid|YYYYMMDD" (תאריך העלאה ליוטיוב)
  --pages N   כמה שירים (הנצפים ביותר) מקבלים דף משלהם בסך הכול (ברירת מחדל: מי שכבר קיבל).
  --page-ids a,b   מזהי יוטיוב של שירים שמקבלים דף בכל מקרה (שירים חדשים שנכנסו למאגר).

זכויות יוצרים: בדפים אין מילות שירים ואין סרטונים. רק שם השיר, שם הזמר וקישור לשיר המקורי ביוטיוב.
"""
import datetime, html, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "tools" / "data" / "karaoke-library.json"
OUT = ROOT / "src" / "pages" / "kelim" / "shir" / "karaoke"
BASE = "https://hakelim.com"
SITE = " | הכלים של גילעד רחמים"
BOT = "https://t.me/GiladKaraokeBot?start="
U_K, U_LIB, U_NEW, U_Z = "/kelim/shir/karaoke/", "/kelim/shir/karaoke/shirim/", "/kelim/shir/karaoke/chadashim/", "/kelim/shir/karaoke/zamar/"
MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"]

# זמרים שמקבלים דף (כשיש להם 3 שירים ומעלה במאגר) והכתובת שלהם
ARTISTS = {
    "רביד פלוטניק": "ravid-plotnik", "עומר אדם": "omer-adam", "פאר טסי": "peer-tasi", "טונה": "tuna",
    "יסמין מועלם": "yasmin-moallem", "אושר כהן": "osher-cohen", "מאיר אריאל": "meir-ariel", "אייל גולן": "eyal-golan",
    "ברי סחרוף": "berry-sakharof", "דודו טסה": "dudu-tassa", "עדן חסון": "eden-hason", "עידן עמדי": "idan-amedi",
    "אודיה": "odeya", "וייב איש": "vibe-ish", "עברי לידר": "ivri-lider", "אביתר בנאי": "evyatar-banai",
    "הדג נחש": "hadag-nahash", "יושי": "yoshi", "שירי מימון": "shiri-maimon", "איתי לוי": "itay-levi",
    "אריאל זילבר": "ariel-zilber", "אסף אמדורסקי": "assaf-amdursky", "כוורת": "kaveret", "קורין אלאל": "corinne-allal",
    "עדן בן זקן": "eden-ben-zaken",
}
# כתובות קריאות לשירים (שיר שלא כאן מקבל תעתיק אוטומטי). כתובת שנקבעה נשמרת בתמונת המצב ולא משתנה.
SLUGS = {
    "חיים שלי": "chaim-sheli",
    "לזאת שניצחה": "lazot-shenitzcha",
    "לעשות איתך שלום": "laasot-itach-shalom",
    "לבד על המיטה": "levad-al-hamita",
    "עיר נמל": "ir-namal",
    "בניתי עלייך": "baniti-alayich",
    "חמישי שישי": "chamishi-shishi",
    "מי את היום בלעדיי": "mi-at-hayom-biladay",
    "פשוטים": "pshutim",
    "ניצחת איתי הכל": "nitzacht-iti-hakol",
    "שהכאב ימצא לו חברים": "shehakeev-yimtza-lo-chaverim",
    "לך עם האמת שלך": "lech-im-haemet-shelcha",
    "היי בייב": "hey-babe",
    "כפרה שלי": "kapara-sheli",
    "כל הבאז": "kol-habuzz",
    "עושה לי בלאגן": "osa-li-balagan",
    "שימי פס": "simi-pas",
    "איך שאת אוהבת": "eich-sheat-ohevet",
    "כל העיר יודעת": "kol-hair-yodaat",
    "שירים של עומר": "shirim-shel-omer",
    "פרפרים בבטן": "parparim-babeten",
    "בדיוק כמו שאני": "bidiyuk-kmo-sheani",
    "מה אני נראה לך": "ma-ani-nire-lach",
    "יהיה טוב": "yihye-tov",
    "צלצולי פעמונים": "tziltzulei-paamonim",
    "לא חוקי": "lo-chuki",
    "מקשה אחת זהב": "miksha-achat-zahav",
    "טריו בריו": "trio-brio",
    "סוף ידוע": "sof-yadua",
    "התעוררתי עם נמר": "hitorarti-im-namer",
    "שוב אני נשברת": "shuv-ani-nishberet",
    "קשר רציני": "kesher-retzini",
    "עולה על שולחנות": "ola-al-shulchanot",
    "אלירן סבג": "eliran-sabag",
    "עד שנגמר": "ad-shenigmar",
    "ניו יורק סיטי": "new-york-city",
    "כמו בחיים": "kmo-bachaim",
    "רומנטי או סימפטי": "romanti-o-simpati",
    "בסוף נרקוד": "basof-nirkod",
    "מתוך מחשבות": "mitoch-machshavot",
    "מה שנפל מהידיים": "ma-shenafal-mehayadaim",
    "לי ולה": "li-vela",
    "רובינזון קרוזו": "robinson-crusoe",
    "קשר מסוכן": "kesher-mesukan",
    "זה מה שנשאר": "ze-ma-shenishar",
    "לא כואב לי": "lo-koev-li",
    "טאפס וטריפונס": "tapas-vetrifons",
    "בואי נדבר בינינו": "boi-nedaber-beineinu",
    "מבת ים ועד הנצח": "mibat-yam-vead-hanetzach",
    "היין שנשאר": "hayain-shenishar",
    "בואי נישן על זה": "boi-nishan-al-ze",
    "הטוב הרע ועודיה": "hatov-hara-veodeya",
    "אחותך": "achotcha",
    "שאריות מן העבר": "sheeriyot-min-haavar",
    "טיפוס רומנטי": "tipus-romanti",
    "גברת טיקטוק": "gveret-tiktok",
    "לילות יפים": "leilot-yafim",
    "בן 30": "ben-30",
    "נתק אותי": "natek-oti",
    "מכל הלילות": "mikol-haleilot",
}
HEB = {"א": "a", "ב": "b", "ג": "g", "ד": "d", "ה": "h", "ו": "o", "ז": "z", "ח": "ch", "ט": "t", "י": "i", "כ": "k", "ך": "k",
       "ל": "l", "מ": "m", "ם": "m", "נ": "n", "ן": "n", "ס": "s", "ע": "a", "פ": "p", "ף": "f", "צ": "tz", "ץ": "tz", "ק": "k",
       "ר": "r", "ש": "sh", "ת": "t"}


def translit(s):
    out = "".join(HEB.get(c, c.lower() if c.isascii() and c.isalnum() else "-") for c in s)
    return re.sub(r"-+", "-", out).strip("-")[:60].strip("-")


def esc(s):
    return html.escape(s, quote=True)


def views_txt(n):
    if n >= 1_000_000:
        v = n / 1_000_000
        return (f"{v:.1f}".rstrip("0").rstrip(".") if v < 10 else f"{v:.0f}") + " מיליון"
    if n >= 1000:
        return f"{n // 1000} אלף"
    return str(n)


def date_txt(d):
    return f"{MONTHS[int(d[4:6]) - 1]} {d[:4]}" if d and len(d) == 8 else ""


def has_artist(song, name):
    return re.search(r"(?<![א-ת])ו?" + re.escape(name) + r"(?![א-ת])", song["artist"]) is not None


# ---------- תמונת המצב ----------
def sync(queue_path, dates_path=None, pages_n=None, page_ids=()):
    q = json.loads(pathlib.Path(queue_path).read_text(encoding="utf-8"))
    q = q if isinstance(q, list) else q.get("items", [])
    dates = {}
    if dates_path and pathlib.Path(dates_path).exists():
        for line in pathlib.Path(dates_path).read_text(encoding="utf-8", errors="ignore").splitlines():
            p = line.strip().split("|")
            if len(p) > 1 and re.fullmatch(r"\d{8}", p[1]):
                dates[p[0]] = p[1]
    old = {s["id"]: s for s in json.loads(DATA.read_text(encoding="utf-8"))["songs"]} if DATA.exists() else {}
    today = datetime.date.today().isoformat()
    first = not old
    songs, slugs = [], {s["slug"] for s in old.values()}
    for x in q:
        if x.get("status") != "in_lib" or not x.get("vid") or " - " not in x.get("build_query", ""):
            continue
        artist, song = [t.strip() for t in x["build_query"].split(" - ", 1)]
        if "/" in artist + song:  # שם לא נקי (שני שירים או שני שמות) – לא מציגים עד שיתוקן במקור
            continue
        o = old.get(x["vid"])
        if o:
            s = dict(o, views=max(o.get("views", 0), x.get("views") or 0))
        else:
            slug = SLUGS.get(song) or translit(song) or x["vid"].lower()
            if slug in slugs:
                slug = (slug + "-" + translit(artist.split()[0])).strip("-")
            if slug in slugs:
                slug = slug + "-" + re.sub(r"[^a-z0-9]", "", x["vid"].lower())[:5]
            slugs.add(slug)
            s = {"id": x["vid"], "artist": artist, "song": song, "views": x.get("views") or 0, "date": "",
                 "added": "" if first else today, "slug": slug, "page": False}
        if dates.get(x["vid"]):
            s["date"] = dates[x["vid"]]
        songs.append(s)
    songs.sort(key=lambda s: -s["views"])
    if pages_n:
        for s in songs[:pages_n]:
            s["page"] = True
    for s in songs:
        if s["id"] in page_ids:
            s["page"] = True
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(json.dumps({"updated": today, "songs": songs}, ensure_ascii=False, indent=0) + "\n", encoding="utf-8", newline="\n")
    print(f"snapshot: {len(songs)} songs, {sum(1 for s in songs if s['page'])} with a page, {sum(1 for s in songs if s['date'])} with a date")


# ---------- חלקים משותפים ----------
STYLE = """<style>
.ko-hero .btn{font-size:1.15rem;padding:1rem 1.5rem}
.ko-cap{text-align:center;color:var(--muted);font-size:.9rem;margin-top:.6rem}
.ko-steps{list-style:none;padding:0;counter-reset:s;display:grid;gap:.7rem}
.ko-steps li{counter-increment:s;display:flex;gap:.8rem;align-items:flex-start;color:var(--body);font-size:1.05rem}
.ko-steps li::before{content:counter(s);flex:0 0 2rem;height:2rem;border-radius:50%;background:var(--gold);color:var(--ink);font-weight:700;display:flex;align-items:center;justify-content:center}
.ko-sec p{color:var(--body);margin-bottom:.8rem;font-size:1.05rem}
.ko-why ul{list-style:none;padding:0;display:grid;gap:.75rem;margin:.6rem 0 1rem}
.ko-why li{background:var(--card,rgba(255,255,255,.04));border:1px solid var(--line,#333);border-right:4px solid var(--gold);border-radius:.8rem;padding:.8rem .9rem;color:var(--body);font-size:1.03rem;line-height:1.6}
.ko-why li b{display:block;color:var(--cream,var(--gold));font-size:1.08rem;margin-bottom:.2rem}
.ko-list{list-style:none;padding:0;margin:.6rem 0 1rem;display:grid;gap:.4rem}
.ko-list li{display:flex;flex-wrap:wrap;align-items:center;gap:.3rem .6rem;border:1px solid var(--line,#333);border-radius:.7rem;padding:.55rem .8rem;color:var(--body);font-size:1.03rem}
.ko-list li a,.ko-list li b{color:var(--cream,var(--gold));font-weight:700}
.ko-list li span{color:var(--muted);font-size:.95rem}
.ko-get{display:inline-block;border:1px solid var(--gold);border-radius:2rem;padding:.25rem .9rem;font-size:.92rem;font-weight:600;color:var(--gold);text-decoration:none}
.ko-list .ko-get{margin-inline-start:auto;white-space:nowrap}
.ko-find{width:100%;font-size:1.1rem;padding:.8rem 1rem;border-radius:.8rem;border:1px solid var(--gold);background:var(--card,rgba(255,255,255,.04));color:var(--body);margin:.4rem 0}
.ko-chips{display:flex;flex-wrap:wrap;gap:.5rem;list-style:none;padding:0;margin:.6rem 0 1rem}
.ko-chips a{display:inline-block;border:1px solid var(--line,#333);border-radius:2rem;padding:.4rem .9rem;color:var(--body);text-decoration:none;font-size:1rem}
.ko-song h3{margin:1.1rem 0 .3rem;font-size:1.15rem}
.ko-end{text-align:center}
.ko-small p{font-size:.92rem;color:var(--muted)}
</style>"""
COPY_JS = """<script>
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('[data-ko-copy]');if(!a)return;var t=a.getAttribute('data-ko-copy');try{navigator.clipboard.writeText(t)}catch(_){}var h=document.querySelector('[data-ko-hint]');if(h)h.textContent='שם השיר הועתק: '+t+'. בבוט מדביקים ושולחים.';});
</script>"""
LIST_JS = """<script>
(function(){var l=document.getElementById('ko-list'),f=document.getElementById('ko-find'),c=document.getElementById('ko-count');if(!l)return;var li=[].slice.call(l.children);
li.forEach(function(x){var a=document.createElement('a');a.className='ko-get';a.href='%s';a.target='_blank';a.rel='noopener';a.setAttribute('data-ko-copy',x.getAttribute('data-q'));a.setAttribute('data-mv','karaoke_lib_get');a.textContent='לקבל בבוט';x.appendChild(a);});
if(f)f.addEventListener('input',function(){var v=f.value.trim(),n=0;li.forEach(function(x){var ok=!v||x.getAttribute('data-q').indexOf(v)>-1;x.hidden=!ok;if(ok)n++;});c.textContent=v?(n?'נמצאו '+n+' שירים':'השיר עוד לא במאגר. אפשר לבקש אותו מהבוט, והוא יכין אותו.'):'';});})();
</script>"""


def faq_ld(faq):
    return '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in faq]}, ensure_ascii=False) + "</script>"


def faq_html(faq):
    return ('<section class="k-sec" aria-labelledby="faq-h">\n<h2 id="faq-h">שאלות ותשובות</h2>\n'
            + "\n".join(f"<details><summary>{q}</summary><p>{a}</p></details>" for q, a in faq) + "\n</section>")


def sec(i, title, body, cls="ko-sec"):
    return f'<section class="k-sec {cls}" aria-labelledby="{i}">\n<h2 id="{i}">{title}</h2>\n{body}\n</section>'


def fit(cands, lo=110, hi=160):
    for c in cands:
        if lo <= len(c) <= hi:
            return c
    c = min(cands, key=lambda c: abs(len(c) - 140))
    return c if len(c) <= hi else c[:hi - 1].rsplit(" ", 1)[0] + "."


def fit_title(cands, hi=62):
    for c in cands:
        if len(c) <= hi:
            return c
    return cands[-1][:hi]


def btn(src, q=None, label="🎤 לפתוח את הבוט בטלגרם", mv="karaoke_lib"):
    copy = f' data-ko-copy="{esc(q)}"' if q else ""
    return f'<a class="btn btn-gold" href="{BOT}{src}" target="_blank" rel="noopener" data-mv="{mv}"{copy}>{label}</a>'


def song_li(s, src):
    name = f'<a href="{U_LIB}{s["slug"]}/">{esc(s["song"])}</a>' if s["page"] else f'<b>{esc(s["song"])}</b>'
    return f'<li data-q="{esc(s["artist"] + " - " + s["song"])}">{name}<span>{esc(s["artist"])}</span></li>'


WHAT = """<ul>
<li><b>🎵 המוזיקה בלי הזמר</b>הקול של הזמר יורד, והמוזיקה המקורית נשארת. שרים על הליווי האמיתי של השיר.</li>
<li><b>🟡 המילים נצבעות בזמן השירה</b>המילים מופיעות על המסך ונצבעות בדיוק כשצריך לשיר אותן. המילים של שירי המאגר נבדקו מראש.</li>
<li><b>🎙 גרסה עם קול הזמר</b>מתחת לסרטון יש כפתור "גרסה עם קול הזמר": אותו שיר, עם הזמר בשקט ברקע. ככה קל להיכנס למנגינה ולא ללכת לאיבוד.</li>
<li><b>✏️ תיקון מילים</b>ראיתם מילה לא מדויקת? לוחצים "תיקון מילים", מתקנים, ומקבלים סרטון מתוקן.</li>
<li><b>📺 סרטון רגיל, לכל מסך</b>הסרטון מגיע לשיחה בטלגרם. שרים בטלפון, במחשב, או משדרים לטלוויזיה. אפשר גם לשמור אותו ולשיר שוב בלי אינטרנט.</li>
</ul>"""
ASK = (f'<p>הבוט מכין קריוקי לכל שיר, לא רק לשירים שבמאגר. שולחים לו שם של שיר או קישור מיוטיוב, מחכים כמה דקות, ומקבלים סרטון קריוקי. '
       f'זה נכון גם לשיר שיצא השבוע, וגם לשיר ישן שאף אחד לא הכין לו קריוקי.</p>'
       f'<p>עד 5 שירים חדשים ביום בחינם. שיר שכבר נמצא במאגר מגיע מיד, ולא נספר במכסה. '
       f'כל השירים המוכנים נמצאים ב<a href="{U_LIB}">מאגר שירי הקריוקי</a>, והאחרונים שנכנסו ב<a href="{U_NEW}">קריוקי שירים חדשים</a>.</p>')
RIGHTS = sec("ko-rights", "זכויות יוצרים", '<p>הדף הזה לא מציג את מילות השירים ולא את הסרטונים. הקריוקי הוא כלי קהילתי, בחינם, לשימוש אישי בלבד: לשיר בבית, עם המשפחה ועם חברים. '
             'בעל זכויות ורוצה שנסיר שיר? כתבו לנו בתיבת המשוב שבתחתית הדף, ונסיר מיד.</p>', "ko-sec ko-small")


def write(path, meta, body):
    out = OUT / path / "index.html" if path else OUT / "index.html"
    out.parent.mkdir(parents=True, exist_ok=True)
    txt = "<!--meta " + json.dumps(meta, ensure_ascii=False, indent=2) + " -->\n" + body.strip() + "\n"
    out.write_text(txt.replace("\r\n", "\n").replace("\n", "\r\n"), encoding="utf-8", newline="")
    return "/kelim/shir/karaoke/" + (path + "/" if path else "")


def meta_of(title, desc, og, crumbs, head, foot, priority="0.6", many=True):
    m = {"site": "kelim", "nav": "tchumim", "tool": "shir_karaoke", "title": title + SITE, "description": desc, "og_title": og,
         "priority": priority, "crumbs": crumbs, "head": head, "foot": foot}
    if many:
        m["no_precache"] = True  # הרבה דפים מאותו סוג: נשמרים בטלפון רק כשנכנסים אליהם
    return m


# ---------- דף שיר ----------
def song_page(s, songs, artists):
    S, A, Q = s["song"], s["artist"], s["artist"] + " - " + s["song"]
    eS, eA = esc(S), esc(A)
    title = fit_title([f"קריוקי {S} – {A}: בחינם, עם המילים", f"קריוקי {S} – {A}, בחינם", f"קריוקי {S} – {A}", f"קריוקי {S}"])
    desc = fit([
        f"קריוקי {S} של {A} בחינם: סרטון עם המוזיקה בלי הזמר והמילים שנצבעות בזמן השירה, וגם גרסה עם קול הזמר. מקבלים מיד בטלגרם, בלי הרשמה.",
        f"קריוקי {S} של {A} בחינם: המוזיקה בלי הזמר, המילים נצבעות על המסך, וגם גרסה עם קול הזמר. מיד בטלגרם, בלי הרשמה.",
        f"קריוקי {S} בחינם: המוזיקה בלי הזמר, המילים נצבעות על המסך, וגם גרסה עם קול הזמר. מקבלים מיד בטלגרם, בלי הרשמה ובלי פרסומות.",
        f"קריוקי {S} של {A} בחינם: סרטון עם המוזיקה בלי הזמר והמילים שנצבעות על המסך בזמן השירה, וגם גרסה עם קול הזמר ברקע. מקבלים מיד בטלגרם, בלי הרשמה ובלי פרסומות.",
    ])
    mine = [a for a in artists if has_artist(s, a)]
    same = [x for x in songs if x is not s and (x["artist"] == A or any(has_artist(x, a) for a in mine))][:8]
    rank = songs.index(s)
    near = [x for x in songs[max(0, rank - 6):rank + 9] if x is not s and x not in same and x["page"]][:7]
    if len(near) < 5:
        near = [x for x in songs if x is not s and x not in same and x["page"]][:7]
    when = date_txt(s["date"])
    about = (f'<p>"{eS}" הוא שיר של {eA}. הקליפ המקורי שלו נצפה ביוטיוב {views_txt(s["views"])} פעמים'
             + (f', והוא עלה ליוטיוב ב{when}' if when else "") + ". "
             f'<a href="https://www.youtube.com/watch?v={s["id"]}" target="_blank" rel="noopener">לשמוע את השיר המקורי ביוטיוב</a>.</p>'
             f'<p>כדאי לשמוע את המקור פעם אחת לפני ששרים, כדי להיזכר במנגינה ובכניסות. אם קשה להיכנס לשיר, מתחילים עם הגרסה שבה הזמר שר בשקט ברקע, ואחר כך עוברים לגרסה בלי הזמר.</p>'
             f'<p>כשבנינו את המאגר לא מצאנו ל"{eS}" קריוקי ביוטיוב. לכן הכנו אותו מראש, והוא מחכה מוכן לכל מי שמבקש.</p>')
    if same:
        links = "".join(f'<li><a href="{U_Z}{artists[a]}/">כל שירי הקריוקי של {esc(a)}</a></li>' for a in mine)
        more_h = f"עוד שירי קריוקי של {eA}" if len(A) < 28 else "עוד שירי קריוקי של אותם זמרים"
        more = '<ul class="ko-list">' + "".join(song_li(x, "site_shir") for x in same) + "</ul>" + (f'<ul class="ko-chips">{links}</ul>' if links else "")
    else:
        more_h = "עוד שירים שאוהבים לשיר בקריוקי"
        more = '<ul class="ko-list">' + "".join(song_li(x, "site_shir") for x in [x for x in songs if x["page"] and x is not s and x not in near][:6]) + "</ul>"
    faq = [
        (f"הקריוקי של {eS} בחינם?", "כן. השיר נמצא במאגר של הבוט, ולכן מקבלים אותו בחינם ובלי הגבלה. בלי הרשמה ובלי פרסומות. צריך רק טלגרם."),
        (f"איך מקבלים את הקריוקי של {eS}?", "לוחצים על הכפתור שבדף. שם השיר מועתק לבד, והבוט נפתח בטלגרם. מדביקים את השם, שולחים, והסרטון מגיע מיד."),
        (f"יש גרסה עם הקול של {eA}?" if len(A) < 24 else "יש גרסה עם קול הזמר?", 'כן. מתחת לסרטון יש כפתור "גרסה עם קול הזמר": אותו שיר, עם הזמר בשקט ברקע. זה עוזר להיכנס למנגינה. גם זה בחינם.'),
        (f"המילים של {eS} מופיעות על המסך?", 'כן. המילים מופיעות בסרטון ונצבעות בזמן הנכון. אם מצאתם מילה לא מדויקת, לוחצים "תיקון מילים" ומקבלים סרטון מתוקן. התיקון בחינם.'),
        (f"אפשר לשיר את {eS} על הטלוויזיה?", "כן. הסרטון הוא קובץ וידאו רגיל. משדרים אותו מהטלפון לטלוויזיה חכמה, או פותחים את טלגרם במחשב שמחובר לטלוויזיה, ושרים על המסך הגדול."),
        ("צריך להוריד אפליקציית קריוקי?", "לא. צריך רק טלגרם, בטלפון או במחשב. פותחים את הבוט, שולחים את שם השיר, ושרים."),
        ("אפשר לקבל גם שיר שלא נמצא במאגר?", "כן. שולחים לבוט שם של כל שיר או קישור מיוטיוב, והוא מכין סרטון קריוקי בכמה דקות. עד 5 שירים חדשים ביום בחינם."),
    ]
    body = f"""<header class="k-hero ko-hero">
<h1>קריוקי {eS} – {eA}</h1>
<p class="sub">סרטון קריוקי מוכן של "{eS}": המוזיקה בלי הזמר, והמילים נצבעות על המסך בזמן השירה. בחינם, בלי הרשמה ובלי פרסומות.</p>
<div class="actions">{btn("site_shir", Q, "🎤 לקבל את הקריוקי בטלגרם", "karaoke_song")}</div>
<p class="ko-cap" data-ko-hint>בלחיצה שם השיר מועתק לבד. בבוט מדביקים ושולחים, והסרטון מגיע.</p>
</header>
{sec("ko-how", f"איך מקבלים את הקריוקי של {eS}", f'''<ol class="ko-steps">
<li>לוחצים על הכפתור "לקבל את הקריוקי בטלגרם". שם השיר מועתק לבד, והבוט נפתח.</li>
<li>לוחצים "התחל", מדביקים את שם השיר ושולחים. אפשר גם להקליד: {esc(Q)}.</li>
<li>השיר כבר מוכן במאגר, אז הסרטון מגיע מיד. מגבירים ושרים.</li>
</ol>
<p>שיר מהמאגר לא נספר במכסה היומית, ואפשר לבקש אותו כמה פעמים שרוצים. בשבת הבוט נח, ומה שנשלח מחכה למוצאי שבת.</p>''')}
{sec("ko-what", "מה מקבלים בסרטון", WHAT, "ko-sec ko-why")}
{sec("ko-about", f"על השיר {eS}", about)}
{sec("ko-more", more_h, more)}
{sec("ko-near", "עוד שירים מוכנים במאגר", '<ul class="ko-list">' + "".join(song_li(x, "site_shir") for x in near) + f'</ul><p><a href="{U_LIB}">לכל שירי הקריוקי במאגר</a></p>')}
{sec("ko-erev", f"לשיר את {eS} בערב קריוקי", f'<p>מתכננים יום הולדת, מסיבה או ערב חברים? ב<a href="{U_K}erev/">מדריך לערב קריוקי</a> יש הסבר איך מכינים רשימת שירים מראש ואיך מחברים לטלוויזיה. שותפים במיזם מקבלים עד 6 שירים בסרטון אחד, ברצף.</p><p>רוצים להקליט את עצמכם שרים את "{eS}"? שומרים את הסרטון בטלפון ופותחים את <a href="/kelim/shir/ulpan/">אולפן ההקלטות</a>. גם הוא בחינם.</p>')}
{faq_html(faq)}
{sec("ko-ask", "לא מצאתם שיר? מבקשים אותו", ASK)}
<section class="k-sec ko-end" aria-labelledby="ko-go">
<h2 id="ko-go">מוכנים לשיר?</h2>
<div class="actions" style="justify-content:center">{btn("site_shir", Q, "🎤 לקבל את הקריוקי בטלגרם", "karaoke_song")}<button type="button" class="btn btn-ghost" data-share-tool="wa" data-text="קריוקי {eS} – {eA}, בחינם. מקבלים סרטון עם המילים בטלגרם:">לשלוח לחבר</button></div>
</section>
{RIGHTS}"""
    crumbs = [["השיר שלי", "/kelim/shir/"], ["קריוקי", U_K], ["שירי קריוקי", U_LIB], [S, None]]
    return write("shirim/" + s["slug"], meta_of(title, desc, f"קריוקי {S} – {A}, בחינם", crumbs, STYLE + faq_ld(faq), COPY_JS), body)


# ---------- דף זמר ----------
def artist_page(a, slug, songs, artists):
    mine = [s for s in songs if has_artist(s, a)]
    eA, n = esc(a), len(mine)
    names = [s["song"] for s in mine[:3]]
    title = fit_title([f"קריוקי {a}: {n} שירים בחינם, עם המילים", f"קריוקי {a}: שירים בחינם, עם המילים", f"קריוקי {a}"])
    desc = fit([
        f"קריוקי {a} בחינם: {n} שירים מוכנים, בהם {names[0]}, {names[1]} ו{names[2]}. המוזיקה בלי הזמר, המילים על המסך, וגם גרסה עם קול הזמר. בטלגרם, בלי הרשמה.",
        f"קריוקי {a} בחינם: {n} שירים מוכנים, בהם {names[0]} ו{names[1]}. המוזיקה בלי הזמר, המילים על המסך, וגם גרסה עם קול הזמר. בלי הרשמה.",
        f"קריוקי {a} בחינם: {n} שירים מוכנים במאגר. המוזיקה בלי הזמר, המילים נצבעות על המסך, וגם גרסה עם קול הזמר. מקבלים בטלגרם, בלי הרשמה ובלי פרסומות.",
    ])
    blocks = []
    for s in mine:
        Q = s["artist"] + " - " + s["song"]
        eS = esc(s["song"])
        when = date_txt(s["date"])
        with_ = f" ({esc(s['artist'])})" if s["artist"] != a else ""
        link = f' <a href="{U_LIB}{s["slug"]}/">לדף הקריוקי של {eS}</a>.' if s["page"] else ""
        blocks.append(f'<h3>קריוקי {eS}</h3><p>"{eS}"{with_}: הקליפ המקורי נצפה ביוטיוב {views_txt(s["views"])} פעמים'
                      + (f", ועלה ב{when}" if when else "") + f'. הקריוקי מוכן במאגר, עם המילים על המסך, בלי הזמר או עם הזמר בשקט ברקע.{link}</p>'
                      f'<p><a class="ko-get" href="{BOT}site_zamar" target="_blank" rel="noopener" data-mv="karaoke_artist_get" data-ko-copy="{esc(Q)}">🎤 לקבל את {eS} בבוט</a></p>')
    others = "".join(f'<li><a href="{U_Z}{sl}/">קריוקי {esc(x)}</a></li>' for x, sl in artists.items() if x != a)
    faq = [
        (f"הקריוקי של {eA} בחינם?", f"כן. {n} השירים שברשימה נמצאים במאגר, ומקבלים אותם בחינם ובלי הגבלה. בלי הרשמה ובלי פרסומות. צריך רק טלגרם."),
        (f"אילו שירים של {eA} יש בקריוקי?", f"כרגע יש במאגר {n} שירים: " + ", ".join(esc(s["song"]) for s in mine) + ". כל שיר אחר אפשר לבקש מהבוט, והוא מכין אותו בכמה דקות."),
        (f"איך מקבלים שיר של {eA}?", "לוחצים על הכפתור שליד השיר. שם השיר מועתק לבד, והבוט נפתח בטלגרם. מדביקים, שולחים, והסרטון מגיע."),
        (f"אפשר לשיר יחד עם הקול של {eA}?", 'כן. מתחת לכל סרטון יש כפתור "גרסה עם קול הזמר": אותו שיר, עם הזמר בשקט ברקע. זה עוזר להיכנס למנגינה, וזה בחינם.'),
        (f"מה עושים אם השיר שאני רוצה של {eA} לא ברשימה?", "שולחים לבוט את שם השיר ושם הזמר, או קישור מיוטיוב. הבוט מכין סרטון קריוקי בכמה דקות. עד 5 שירים חדשים ביום בחינם."),
        ("המילים בקריוקי מדויקות?", 'המילים של שירי המאגר נבדקו מראש. אם בכל זאת מצאתם מילה לא נכונה, לוחצים "תיקון מילים" מתחת לסרטון ומקבלים סרטון מתוקן.'),
        ("אפשר לשיר כמה שירים ברצף?", "כן. מבקשים שיר אחרי שיר, וכל סרטון נשמר בשיחה. שותפים במיזם מקבלים גם עד 6 שירים בסרטון אחד, ברצף."),
    ]
    body = f"""<header class="k-hero ko-hero">
<h1>קריוקי {eA} – {n} שירים, בחינם</h1>
<p class="sub">כל שירי {eA} שמוכנים במאגר הקריוקי: המוזיקה בלי הזמר, והמילים נצבעות על המסך. בחינם, בלי הרשמה ובלי פרסומות.</p>
<div class="actions">{btn("site_zamar", None, "🎤 לפתוח את הבוט בטלגרם", "karaoke_artist")}</div>
<p class="ko-cap" data-ko-hint>בוחרים שיר מהרשימה. בלחיצה שם השיר מועתק, ובבוט מדביקים ושולחים.</p>
</header>
{sec("ko-songs", f"שירי הקריוקי של {eA} במאגר", f"<p>אלה השירים של {eA} שכבר מוכנים. הם מסודרים לפי מספר הצפיות בקליפ המקורי ביוטיוב, מהנצפה ביותר.</p>" + "".join(blocks), "ko-sec ko-song")}
{sec("ko-how", "איך מקבלים שיר", '''<ol class="ko-steps">
<li>בוחרים שיר ולוחצים "לקבל בבוט". שם השיר מועתק לבד, והבוט נפתח בטלגרם.</li>
<li>לוחצים "התחל", מדביקים את שם השיר ושולחים.</li>
<li>השיר כבר מוכן במאגר, אז הסרטון מגיע מיד. מגבירים ושרים.</li>
</ol>
<p>שירים מהמאגר לא נספרים במכסה היומית. אפשר לבקש את כולם, אחד אחרי השני. בשבת הבוט נח, ומה שנשלח מחכה למוצאי שבת.</p>''')}
{sec("ko-what", "מה מקבלים בכל סרטון", WHAT, "ko-sec ko-why")}
{sec("ko-why2", f"למה לשיר את {eA} דווקא כאן", f'''<p>לחלק גדול מהשירים בעברית אין קריוקי ביוטיוב, וגם כשיש, זו בדרך כלל גרסה אחת: בלי הזמר בכלל. כשבנינו את המאגר חיפשנו שירים אהובים ונצפים שלא מצאנו להם קריוקי ביוטיוב, והכנו אותם מראש.</p>
<p>כאן מקבלים כל שיר בשתי דרכים: בלי הזמר, למי שמכיר את השיר היטב, ועם הזמר בשקט ברקע, למי שרוצה עזרה. אין פרסומת שקוטעת את הפזמון, ואין צורך להירשם או להתקין אפליקציה.</p>''')}
{sec("ko-ask", f"שיר של {eA} שלא ברשימה?", ASK)}
{sec("ko-erev", f"ערב קריוקי עם שירי {eA}", f'<p>רוצים ערב שלם של שירי {eA}? מבקשים את השירים מראש, והם נשמרים בשיחה עם הבוט. בערב עצמו רק לוחצים על הסרטון הבא. שותפים במיזם מקבלים עד 6 שירים בסרטון אחד, עם "השיר הבא" בין שיר לשיר.</p><p>ב<a href="{U_K}erev/">מדריך לערב קריוקי</a> יש הסבר איך מחברים לטלוויזיה ומה מכינים מראש. ומי שרוצה להקליט את עצמו שר, פותח את <a href="/kelim/shir/ulpan/">אולפן ההקלטות</a>.</p>')}
{faq_html(faq)}
{sec("ko-others", "קריוקי של זמרים נוספים", f'<ul class="ko-chips">{others}</ul><p><a href="{U_LIB}">לכל שירי הקריוקי במאגר</a> · <a href="{U_NEW}">קריוקי שירים חדשים</a> · <a href="{U_K}">על בוט הקריוקי</a></p>')}
{RIGHTS}"""
    crumbs = [["השיר שלי", "/kelim/shir/"], ["קריוקי", U_K], ["שירי קריוקי", U_LIB], [a, None]]
    return write("zamar/" + slug, meta_of(title, desc, f"קריוקי {a} – {n} שירים בחינם", crumbs, STYLE + faq_ld(faq), COPY_JS), body)


# ---------- דף המאגר ----------
def library_page(songs, artists):
    n = len(songs)
    n_art = len({s["artist"] for s in songs})
    paged = [s for s in songs if s["page"]]
    item_ld = '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "ItemList", "name": "שירי קריוקי בעברית",
              "numberOfItems": n, "itemListElement": [{"@type": "ListItem", "position": i, "name": f'קריוקי {s["song"]} – {s["artist"]}',
              "url": f'{BASE}{U_LIB}{s["slug"]}/'} for i, s in enumerate(paged, 1)]}, ensure_ascii=False) + "</script>"
    title = "שירי קריוקי בעברית: המאגר המלא, בחינם ועם המילים"
    desc = fit([f"שירי קריוקי בעברית בחינם: {n} שירים מוכנים עם המילים על המסך, בלי הזמר או עם קול הזמר ברקע. מחפשים שיר, לוחצים, ומקבלים סרטון בטלגרם. בלי הרשמה."])
    chips = "".join(f'<li><a href="{U_Z}{sl}/">קריוקי {esc(a)}</a></li>' for a, sl in artists.items())
    faq = [
        ("שירי הקריוקי כאן באמת בחינם?", "כן. כל שיר שבמאגר מגיע בחינם ובלי הגבלה. שיר שעוד לא במאגר הבוט מכין לפי בקשה, עד 5 שירים חדשים ביום בחינם. בלי הרשמה ובלי פרסומות."),
        ("כמה שירי קריוקי יש במאגר?", f"כרגע יש במאגר {n} שירים בעברית של {n_art} זמרים ולהקות, והמאגר גדל כל הזמן. כל שיר שמישהו מבקש מהבוט נשמר, ומגיע מיד למי שיבקש אותו אחריו."),
        ("איך מקבלים שיר מהרשימה?", 'לוחצים "לקבל בבוט" ליד השיר. שם השיר מועתק לבד, והבוט נפתח בטלגרם. מדביקים את השם, שולחים, והסרטון מגיע מיד.'),
        ("מה עושים אם השיר שלי לא ברשימה?", "שולחים לבוט את שם השיר, או קישור מיוטיוב. הבוט מכין סרטון קריוקי בכמה דקות, גם לשיר שיצא השבוע וגם לשיר ישן."),
        ("יש בקריוקי גם את הקול של הזמר?", 'אפשר לבחור. הסרטון הרגיל הוא בלי הזמר. מתחת לכל סרטון יש כפתור "גרסה עם קול הזמר", שבה הזמר שר בשקט ברקע ועוזר להיכנס למנגינה.'),
        ("אילו שירים נכנסו למאגר?", "שירים בעברית שאנשים אוהבים לשיר: מזרחית, פופ, רוק ישראלי, היפ הופ ושירים ישנים. בחרנו שירים נצפים שלא מצאנו להם קריוקי ביוטיוב."),
        ("אפשר לשיר את שירי הקריוקי בטלוויזיה?", "כן. הסרטון הוא קובץ וידאו רגיל. משדרים אותו מהטלפון לטלוויזיה חכמה, או פותחים את טלגרם במחשב שמחובר לטלוויזיה."),
        ("המילים בשירים מדויקות?", 'המילים של שירי המאגר נבדקו מראש. אם בכל זאת מצאתם מילה לא נכונה, לוחצים "תיקון מילים" מתחת לסרטון ומקבלים סרטון מתוקן, בחינם.'),
    ]
    body = f"""<header class="k-hero ko-hero">
<h1>שירי קריוקי בעברית – {n} שירים מוכנים, בחינם</h1>
<p class="sub">המאגר של בוט הקריוקי: שירים בעברית שמוכנים מראש, עם המילים על המסך. מחפשים שיר, לוחצים, ומקבלים סרטון בטלגרם. בחינם, בלי הרשמה ובלי פרסומות.</p>
<div class="actions">{btn("site_shirim", None, "🎤 לפתוח את הבוט בטלגרם", "karaoke_lib")}</div>
</header>
<section class="k-sec ko-sec" aria-labelledby="ko-all">
<h2 id="ko-all">כל שירי הקריוקי במאגר</h2>
<p>ברשימה {n} שירים של {n_art} זמרים ולהקות, מסודרים לפי מספר הצפיות בקליפ המקורי ביוטיוב. כותבים שם של שיר או של זמר, והרשימה מצטמצמת.</p>
<label for="ko-find" class="sr-only">חיפוש שיר או זמר</label>
<input class="ko-find" id="ko-find" type="search" placeholder="לחפש שיר או זמר..." autocomplete="off">
<p class="ko-cap" id="ko-count" aria-live="polite" data-ko-hint></p>
<ul class="ko-list" id="ko-list">
{chr(10).join(song_li(s, "site_shirim") for s in songs)}
</ul>
</section>
{sec("ko-how", "איך מקבלים שיר מהמאגר", '''<ol class="ko-steps">
<li>מוצאים שיר ברשימה ולוחצים "לקבל בבוט". שם השיר מועתק לבד, והבוט נפתח בטלגרם.</li>
<li>לוחצים "התחל", מדביקים את שם השיר ושולחים.</li>
<li>השיר כבר מוכן, אז הסרטון מגיע מיד. מגבירים ושרים.</li>
</ol>
<p>שירים מהמאגר לא נספרים במכסה היומית, ואפשר לבקש כמה שרוצים. בשבת הבוט נח, ומה שנשלח מחכה למוצאי שבת.</p>''')}
{sec("ko-zamar", "שירי קריוקי לפי זמר", f'<p>לזמרים שיש להם כמה שירים במאגר יש דף משלהם, עם כל השירים במקום אחד:</p><ul class="ko-chips">{chips}</ul>')}
{sec("ko-special", "מה מיוחד בשירי הקריוקי כאן", f'''<p>לחלק גדול מהשירים בעברית אין קריוקי ביוטיוב. כשבנינו את המאגר חיפשנו דווקא אותם: שירים אהובים ונצפים שלא מצאנו להם קריוקי, והכנו אותם מראש. אחרים גובים כסף על כל שיר או דורשים הרשמה. כאן הכול בחינם.</p>''' + WHAT, "ko-sec ko-why")}
{sec("ko-new", "שירים חדשים במאגר", f'<p>לשיר חדש לוקח בדרך כלל הרבה זמן עד שמישהו מכין לו קריוקי. אצלנו שירים חדשים נכנסים למאגר כל הזמן, ואפשר גם לבקש שיר שיצא השבוע ולקבל אותו בכמה דקות. הרשימה המלאה: <a href="{U_NEW}">קריוקי שירים חדשים</a>.</p>')}
{sec("ko-ask", "לא מצאתם שיר? מבקשים אותו", ASK)}
{sec("ko-erev", "שירי קריוקי למסיבה ולערב חברים", f'<p>מארגנים יום הולדת, בר מצווה או ערב חברים? בוחרים מהרשימה את השירים שכולם מכירים, מבקשים אותם מראש, והם נשמרים בשיחה עם הבוט. ב<a href="{U_K}erev/">מדריך לערב קריוקי</a> יש הסבר איך מחברים לטלוויזיה ומה מכינים. מי שרוצה להקליט את עצמו שר, פותח את <a href="/kelim/shir/ulpan/">אולפן ההקלטות</a>, ומי שרוצה לכתוב שיר משלו מתחיל ב<a href="/kelim/shir/">השיר שלי</a>.</p>')}
{faq_html(faq)}
<section class="k-sec ko-end" aria-labelledby="ko-go">
<h2 id="ko-go">מוכנים לשיר?</h2>
<div class="actions" style="justify-content:center">{btn("site_shirim", None, "🎤 לפתוח את הבוט בטלגרם", "karaoke_lib")}<button type="button" class="btn btn-ghost" data-share-tool="wa" data-text="שירי קריוקי בעברית, בחינם: {n} שירים מוכנים עם המילים, וכל שיר אחר לפי בקשה:">לשלוח לחבר</button></div>
<p><a href="{U_K}">עוד על בוט הקריוקי</a></p>
</section>
{RIGHTS}"""
    crumbs = [["השיר שלי", "/kelim/shir/"], ["קריוקי", U_K], ["שירי קריוקי", None]]
    return write("shirim", meta_of(title, desc, f"שירי קריוקי בעברית – {n} שירים מוכנים, בחינם", crumbs, STYLE + faq_ld(faq) + item_ld,
                                   COPY_JS + LIST_JS % (BOT + "site_shirim"), "0.8", many=False), body)


# ---------- דף השירים החדשים ----------
def new_page(songs, artists):
    dated = sorted([s for s in songs if s["date"]], key=lambda s: s["date"], reverse=True)
    this_year = datetime.date.today().year
    new = [s for s in dated if int(s["date"][:4]) >= this_year - 1][:60] or dated[:30]
    years = sorted({s["date"][:4] for s in new}, reverse=True)
    lists = "".join(f'<h3>קריוקי שירים חדשים {y}</h3><ul class="ko-list">' + "".join(song_li(s, "site_chadashim") for s in new if s["date"][:4] == y) + "</ul>" for y in years)
    n = len(new)
    title = "קריוקי שירים חדשים בעברית: בחינם, עם המילים"
    desc = fit([f"קריוקי שירים חדשים בעברית, בחינם: {n} שירים מהשנתיים האחרונות מוכנים עם המילים, וכל שיר חדש אחר הבוט מכין לפי בקשה בכמה דקות. בלי הרשמה."])
    faq = [
        ("הקריוקי של השירים החדשים בחינם?", "כן. שיר שכבר במאגר מגיע בחינם ובלי הגבלה. שיר חדש שעוד לא במאגר הבוט מכין לפי בקשה, עד 5 שירים חדשים ביום בחינם. בלי הרשמה ובלי פרסומות."),
        ("יצא שיר חדש השבוע. אפשר לקבל לו קריוקי?", "כן. שולחים לבוט את שם השיר ושם הזמר, או קישור לשיר ביוטיוב. הבוט מכין סרטון קריוקי בכמה דקות."),
        ("למה לשירים חדשים אין קריוקי ביוטיוב?", "כי מישהו צריך לשבת ולהכין אותו, וזה לוקח זמן. לשירים רבים אף אחד לא מכין קריוקי בכלל. הבוט מכין את הקריוקי לבד, ולכן לא צריך לחכות."),
        ("המילים של שיר חדש יהיו מדויקות?", 'ברוב השירים כן. לשיר שיצא ממש עכשיו לפעמים עוד אין מילים מסודרות ברשת, ואז ייתכנו טעויות. לוחצים "תיקון מילים" מתחת לסרטון, מתקנים, ומקבלים סרטון מתוקן.'),
        ("כל כמה זמן נכנסים שירים חדשים למאגר?", "כל הזמן. כל שיר שמישהו מבקש מהבוט נשמר במאגר, ואנחנו מוסיפים שירים חדשים ונצפים מיוזמתנו."),
        ("אפשר לקבל את השיר עם קול הזמר?", 'כן. מתחת לכל סרטון יש כפתור "גרסה עם קול הזמר": אותו שיר, עם הזמר בשקט ברקע. בשיר חדש שעוד לא מכירים היטב זה עוזר מאוד.'),
        ("איך יודעים אילו שירים חדשים כבר מוכנים?", "ברשימה שבדף הזה. השירים מסודרים לפי התאריך שבו הקליפ המקורי עלה ליוטיוב, מהחדש לישן."),
    ]
    body = f"""<header class="k-hero ko-hero">
<h1>קריוקי שירים חדשים בעברית</h1>
<p class="sub">השירים החדשים שכבר מוכנים במאגר, וכל שיר חדש אחר לפי בקשה, בכמה דקות. בחינם, בלי הרשמה ובלי פרסומות.</p>
<div class="actions">{btn("site_chadashim", None, "🎤 לבקש שיר חדש בטלגרם", "karaoke_new")}</div>
<p class="ko-cap" data-ko-hint></p>
</header>
{sec("ko-list-h", "השירים החדשים שמוכנים במאגר", f"<p>{n} שירים מהשנתיים האחרונות, מסודרים לפי התאריך שבו הקליפ המקורי עלה ליוטיוב, מהחדש לישן.</p>" + lists, "ko-sec ko-song")}
{sec("ko-ask", "יצא שיר חדש ואין לו קריוקי? מבקשים", f'''<p>לשיר חדש לוקח בדרך כלל שבועות עד שמישהו מכין לו קריוקי, ולשירים רבים אף אחד לא מכין בכלל. כאן לא מחכים: שולחים לבוט את שם השיר או קישור מיוטיוב, והוא מכין סרטון קריוקי בכמה דקות.</p>
<p>עד 5 שירים חדשים ביום בחינם. השיר שביקשתם נשמר במאגר, ומגיע מיד לכל מי שיבקש אותו אחריכם. ככה כל בקשה עוזרת גם לאחרים.</p>''')}
{sec("ko-how", "איך מקבלים שיר", '''<ol class="ko-steps">
<li>שיר מהרשימה: לוחצים "לקבל בבוט". שם השיר מועתק לבד, והבוט נפתח בטלגרם.</li>
<li>לוחצים "התחל", מדביקים את שם השיר ושולחים. שיר שלא ברשימה פשוט מקלידים, עם שם הזמר.</li>
<li>שיר מהמאגר מגיע מיד. שיר חדש לגמרי מגיע אחרי כמה דקות.</li>
</ol>
<p>בשבת הבוט נח, ומה שנשלח מחכה למוצאי שבת.</p>''')}
{sec("ko-what", "מה מקבלים בסרטון", WHAT, "ko-sec ko-why")}
{faq_html(faq)}
{sec("ko-more", "עוד שירי קריוקי", f'<p><a href="{U_LIB}">כל שירי הקריוקי במאגר</a> · <a href="{U_K}">על בוט הקריוקי</a> · <a href="{U_K}erev/">איך מארגנים ערב קריוקי</a> · <a href="/kelim/shir/ulpan/">אולפן ההקלטות</a> · <a href="/kelim/shir/">השיר שלי</a></p><ul class="ko-chips">' + "".join(f'<li><a href="{U_Z}{sl}/">קריוקי {esc(a)}</a></li>' for a, sl in list(artists.items())[:10]) + "</ul>")}
{RIGHTS}"""
    crumbs = [["השיר שלי", "/kelim/shir/"], ["קריוקי", U_K], ["שירים חדשים", None]]
    return write("chadashim", meta_of(title, desc, "קריוקי שירים חדשים בעברית, בחינם", crumbs, STYLE + faq_ld(faq),
                                      COPY_JS + NEW_JS, "0.7", many=False), body)


NEW_JS = """<script>
[].forEach.call(document.querySelectorAll('.ko-list li[data-q]'),function(x){var a=document.createElement('a');a.className='ko-get';a.href='%s';a.target='_blank';a.rel='noopener';a.setAttribute('data-ko-copy',x.getAttribute('data-q'));a.setAttribute('data-mv','karaoke_new_get');a.textContent='לקבל בבוט';x.appendChild(a);});
</script>""" % (BOT + "site_chadashim")


def main():
    args = sys.argv[1:]
    pages_n = None
    if "--pages" in args:
        i = args.index("--pages")
        pages_n = int(args[i + 1])
        del args[i:i + 2]
    page_ids = ()
    if "--page-ids" in args:
        i = args.index("--page-ids")
        page_ids = set(args[i + 1].split(","))
        del args[i:i + 2]
    if args and args[0] == "sync":
        sync(args[1], args[2] if len(args) > 2 else None, pages_n, page_ids)
    data = json.loads(DATA.read_text(encoding="utf-8"))
    songs = sorted(data["songs"], key=lambda s: -s["views"])
    artists = {a: sl for a, sl in ARTISTS.items() if sum(1 for s in songs if has_artist(s, a)) >= 3}
    artists = dict(sorted(artists.items(), key=lambda kv: -sum(1 for s in songs if has_artist(s, kv[0]))))
    made = [library_page(songs, artists), new_page(songs, artists)]
    made += [song_page(s, songs, artists) for s in songs if s["page"]]
    made += [artist_page(a, sl, songs, artists) for a, sl in artists.items()]
    (ROOT / "tools" / "data" / "karaoke-library.urls.txt").write_text("\n".join(made) + "\n", encoding="utf-8", newline="\n")
    print(f"pages: {len(made)} ({sum(1 for s in songs if s['page'])} songs, {len(artists)} artists)")


if __name__ == "__main__":
    main()
