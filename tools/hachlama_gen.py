#!/usr/bin/env python3
"""ערכת הודעות החלמה להורים: מייצר את הדף /kodesh/hachlama/, את קובץ הוורד ואת חבילת האישור.

כל ההנחיות בהודעות לקוחות רק מהדפים של גילעד: /mohel/hachana/achrei/ (אחרי הברית),
/mohel/hachana/yom/ (יום הברית), /mohel/hachana/kniyot/ (קניות) והמדריך (src/guide/guide.html).
לא מוסיפים כאן הוראה רפואית שאין שם.

    python tools/hachlama_gen.py            # הדף + kodesh/hachlama/hodaot-hachlama.docx
    python tools/hachlama_gen.py pack OUT   # גם קובץ JSON לחבילת אישור (approval-pack)

סימנים בנוסח (הדף ממלא אותם):
  {P}  שם ההורים, עם רווח לפניו ("שלום משה ורחל"), או ריק
  {B}  שם התינוק, ואם לא מולא: "התינוק"
  {LB} "ל" + שם התינוק, ואם לא מולא: "לתינוק"
  {M}  חתימה: שם המוהל (שורה אחרונה; נעלמת אם לא מולא)
  {T}  הטלפון של המוהל
"""
import html, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = ROOT / "src" / "pages" / "kodesh" / "hachlama" / "index.html"
DOCX = ROOT / "kodesh" / "hachlama" / "hodaot-hachlama.docx"

CREDIT_MSG = "ההודעות באדיבות גילעד רחמים, מוהל מוסמך, קולגה שלי וחבר איתי בפורום המוהלים."
CREDIT_DOC = "מתנה באהבה מגילעד רחמים, מוהל מוסמך · 058-404-9049 (ווטסאפ) · עוד כלים חינמיים למוהלים: hakelim.com/kodesh/mohalim"

# key, מתי (ימים מהברית; None = אין תאריך), כותרת, מתי שולחים, מקור (לחבילת האישור), נוסח
MSGS = [
    ("hekerut", None, "אחרי שיחת ההיכרות", "מיד אחרי השיחה הראשונה", "קניות (פרק 1) + המדריך: מכתב השחרור והצהבת",
     """שלום{P}, מזל טוב! 🤍
שמחתי מאוד לדבר איתכם. כמה דברים קטנים לימים הקרובים:

*מבית המרקחת, לקנות כבר עכשיו* (כדי שלא תצטרכו לרוץ אחרי הברית):
• עזרקאין 5%
• נובימול
• שמן טבעי: שקדים או פרפין
• מגבוני אלכוהול, או אלכוהול 70% וצמר גפן, לטבור
• משחת הנקה
• פנטן פלוס

*כשאתם משתחררים* שלחו לי צילום של מכתב השחרור. יש בו את שעת הלידה ואת תוצאות הצהבת.

כל שאלה, גם קטנה, כתבו לי כאן. אין שאלה מיותרת.
{M}"""),
    ("machar", -1, "יום לפני הברית", "ביום שלפני הברית", "יום הברית (פרק 4) + ציר הזמן במדריך: תמונה לפני הברית",
     """שלום{P} 🤍
מחר הברית, בשעה טובה! רשימה קצרה של מה להביא:

• כרית לברית
• כוס קידוש ויין אדום יבש
• 2 טליתות: לאבא ולסנדק
• בשמים, עדיף הדסים (למנהג הספרדים ועדות המזרח)
• סידור לסדר הברכות, אם לא סיכמנו שאני מביא

*לתינוק:* בגד בשני חלקים (מכנס או גטקס, וחולצה נפרדת), כדי שיישאר עם החולצה ולא יהיה לו קר.
*תיק החתלה:* חיתולי בד, טיטולים, מגבונים, בגד להחלפה, מוצץ, משחת החתלה, ותחליף חלב אם אינו יונק.

ואם עוד לא שלחתם, שלחו לי היום תמונה של התינוק, ואוודא שהכול מוכן.
{M}"""),
    ("erev", -1, "ערב הברית", "בערב שלפני הברית", "יום הברית (פרק 4): האכלה ומצב רוח; ציר הזמן: ברית יצחק",
     """ערב טוב{P} 🤍
הערב ברית יצחק, ומחר היום הגדול.

שתי תזכורות למחר:
• *האכלה:* להאכיל את התינוק עד כשעה לפני הברית. בשעה שלפני כבר לא מאכילים, ועד אז שיאכל כמה שאפשר, בכיף.
• *והכי חשוב:* לבוא במצב רוח טוב, ולהשאיר את כל העייפות מאחור.

נתראה מחר בשמחה!
{M}"""),
    ("brit", 0, "אחרי הברית, באותו יום", "כמה שעות אחרי הברית", "אחרי הברית: \"ביום הברית\" + \"מה נורמלי\"",
     """מזל טוב{P}! 🤍
הברית עברה בשעה טובה. בדקתי את {B} אחרי הברית, והכול בסדר.

*להיום:*
• אחרי כל החלפת טיטול, לטפטף שמן טבעי על התחבושת.
• לבדוק שהוא נותן שתן (בטיטול).
• אפשר לשטוף אותו כשמונה שעות אחרי הברית.
• מעט דם בטיטול, אין סיבה לדאגה. אם יש הרבה דם, כתבו לי מיד.
• לשיכוך כאבים אפשר לתת סירופ נובימול, כל חמש או שש שעות.
• בשעות הראשונות הוא יכול להיות חסר מנוחה. עטיפה, החזקה צמודה והנקה מרגיעות.

מחר אגיע להוריד את התחבושת.
{M}"""),
    ("yom1", 1, "יום אחרי: לפני שאני מגיע", "ביום שאחרי הברית, לפני הביקור", "אחרי הברית: \"ביום שאחרי הברית\"",
     """שלום{P} 🤍
היום אגיע להוריד את התחבושת. עד שאגיע:

• רצוי מאוד לעשות {LB} אמבטיה כמה פעמים, כולל מקום הברית. המים מרככים את התחבושת.
• אחרי כל אמבטיה, לטפטף על התחבושת שמן טבעי: שקדים או פרפין (אם אין, שמן זית טוב).

למה זה חשוב? תחבושת רכה ומשומנת יורדת בקלות, וחוסכת לו צער מיותר.
כתבו לי מתי נוח לכם שאגיע.
{M}"""),
    ("yom1b", 1, "יום אחרי: אחרי הורדת התחבושת", "אחרי הביקור", "אחרי הברית: \"אחרי שהמוהל מוריד את התחבושת\"",
     """התחבושת ירדה בשעה טובה 🤍
מעכשיו:

• להתייחס אל {B} כרגיל.
• *משחה:* למרוח פנטן פלוס או מופירוסין סביב מקום הברית, פעמיים ביום, במשך שלושה ימים. לא להגזים, יותר מדי משחה אינו בריא. אם נראה לכם שצריך יותר, רק בתיאום איתי.
• *אמבטיה:* פעמיים ביום, במשך חמישה ימים.
• סביב החתך תופיע הפרשה לבנה־צהבהבה. זה טבעי וחלק מתהליך הריפוי.

לא בטוחים אם משהו תקין? צלמו ושלחו לי, ואחזור אליכם.
{M}"""),
    ("yom2", 2, "יום 2", "יומיים אחרי הברית", "אחרי הברית: המשחה (3 ימים) והאמבטיה (5 ימים)",
     """שלום{P}, מה שלום {B} היום? 🤍
תזכורת קטנה:
• משחה סביב מקום הברית, פעמיים ביום. היום השני מתוך שלושה.
• אמבטיה פעמיים ביום.
• ההפרשה הלבנה־צהבהבה סביב החתך טבעית, וחלק מתהליך הריפוי.

כל שאלה, כתבו לי.
{M}"""),
    ("yom3", 3, "יום 3", "שלושה ימים אחרי הברית", "אחרי הברית: המשחה (3 ימים) והאמבטיה (5 ימים)",
     """שלום{P} 🤍
היום היום האחרון של המשחה, פעמיים ביום. אם נראה לכם שצריך עוד, כתבו לי ונחליט יחד.
ממשיכים אמבטיה פעמיים ביום.

לא בטוחים אם משהו תקין? צלמו ושלחו לי.
{M}"""),
    ("yom4", 4, "יום 4", "ארבעה ימים אחרי הברית", "אחרי הברית: האמבטיה (5 ימים)",
     """שלום{P}, איך {B}? 🤍
ממשיכים אמבטיה פעמיים ביום, היום ומחר.
אם משהו לא נראה לכם, צלמו ושלחו לי.
{M}"""),
    ("yom5", 5, "יום 5", "חמישה ימים אחרי הברית", "אחרי הברית: האמבטיה (5 ימים)",
     """שלום{P} 🤍
היום היום האחרון של האמבטיות פעמיים ביום. מכאן ממשיכים להתייחס אל {B} כרגיל.

ואני כאן לכל שאלה או ספק, עד ההחלמה המלאה.
{M}"""),
    ("yom6", 6, "יום 6", "שישה ימים אחרי הברית", "אחרי הברית: \"בכל שעה, עד ההחלמה המלאה\"",
     """שלום{P}, רציתי לשאול מה שלום {B}, ומה שלומכם 🤍
אם יש משהו שמטריד אתכם, אפילו קטן, צלמו ושלחו לי.
{M}"""),
    ("yom7", 7, "יום 7: שבוע לברית", "שבוע אחרי הברית", "סיום הליווי",
     """שבוע לברית, מזל טוב{P}! 🤍
מקווה ש{B} מחלים יפה ושאתם נחים קצת.
אם יש משהו שמדאיג אתכם, אפילו קטן, אני כאן. צלמו ושלחו לי.

שתזכו לגדל אותו לתורה, לחופה ולמעשים טובים.
{M}"""),
    ("dachuf", 0, "מתי להתקשר אליי מיד", "יחד עם ההודעה של יום הברית, כדי שישמרו", "אחרי הברית: \"מתי להתקשר מיד\" + \"מה נורמלי\" + שורת הרופא",
     """*כדאי לשמור את ההודעה הזאת* 🤍

*מתי להתקשר אליי מיד* ({T}):
• דימום שאינו נעצר, או כתם דם שהולך וגדל.
• התינוק לא הטיל שתן שעות ארוכות אחרי הברית.
• חום, נפיחות או אודם שמתפשט.
• כל דבר שמדאיג אתכם. אין שאלה מיותרת.

*מה נורמלי:* מעט כתמי דם בטיטול, אי־שקט בשעות הראשונות, והפרשה לבנה־צהבהבה סביב החתך אחרי שהתחבושת יורדת.

בכל חשש בריאותי, חום או דימום שלא נעצר, פנו גם לרופא או למיון.
{M}"""),
]
LAST = "yom7"
QUESTIONS = """1. **משחה 3 ימים ואמבטיה 5 ימים:** ספרתי מהיום שאחרי הברית (יום הורדת התחבושת = יום 1). לכן המשחה עד יום 3, והאמבטיות עד יום 5. נכון?

2. **פנטן פלוס או מופירוסין** לא מופיעים ברשימת הקניות של בית המרקחת (רק בדף "אחרי הברית"). להוסיף אותם להודעה הראשונה, לקנות מראש?

3. **ימים 6 ו-7:** אין בהנחיות שלך הוראה חדשה לימים האלה, אז כתבתי רק "מה שלומו" ו"אני כאן". מתאים?

4. **שורת הקרדיט שלך:** רק בסוף ההודעה האחרונה (יום 7), מסומנת מראש, והמוהל יכול להוריד. בדף ובקובץ הוורד יש את השורה "מתנה באהבה מגילעד רחמים, מוהל מוסמך · 058-404-9049". מתאים?

**ההמלצה שלי:** 1 כן, 2 כן להוסיף, 3 כן, 4 כן."""  # שורת הקרדיט (אם מסומנת) נכנסת רק להודעה הזאת


def fill_sample(t, parents="", baby="", mohel="", phone="", credit=False):
    """הנוסח כפי שהדף יראה אותו, לחבילת האישור ולוורד."""
    t = t.replace("{P}", (" " + parents) if parents else "")
    t = t.replace("{LB}", ("ל" + baby) if baby else "לתינוק").replace("{B}", baby or "התינוק")
    t = t.replace("{T}", phone or "[הטלפון שלי]")
    t = t.replace("\n{M}", ("\n" + mohel) if mohel else "")
    if credit:
        t += "\n\n_" + CREDIT_MSG + "_"
    return t


STYLE = (
    ".hl-form{max-width:none}"
    ".hl-row{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}"
    "@media(max-width:560px){.hl-row{grid-template-columns:1fr}}"
    ".hl-form h2,.hl-h{font-family:var(--serif);color:var(--cream);font-size:1.3rem;margin:.2rem 0 .5rem}"
    ".hl-saved{color:var(--muted);font-size:.9rem;margin:-.2rem 0 .6rem}"
    ".hl-list{display:grid;gap:1rem;margin-top:1.2rem}"
    ".hl{padding:1rem;border:1px solid var(--line);border-radius:14px;background:rgba(201,165,92,.05)}"
    ".hl.today{border-color:var(--gold);box-shadow:0 0 0 1px var(--gold) inset}"
    ".hl-top{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.3rem .8rem}"
    ".hl h3{font-family:var(--serif);font-weight:500;color:var(--cream);font-size:1.2rem;margin:0}"
    ".hl-when{color:var(--gold);font-size:.92rem}"
    ".hl-when b{background:var(--gold);color:#111;border-radius:99px;padding:.05rem .55rem;margin-inline-start:.3rem;font-weight:600}"
    ".hl textarea{width:100%;margin-top:.6rem;min-height:9rem;padding:.7rem .8rem;border-radius:12px;border:1px solid var(--line);"
    "background:rgba(0,0,0,.25);color:var(--cream);font:inherit;font-size:1rem;line-height:1.55;resize:vertical}"
    ".hl .share-row{justify-content:flex-start;margin:.6rem 0 0}"
    ".hl-jump{text-align:center;margin:1rem 0 0}"
    ".hl-wa{white-space:pre-wrap;padding:.8rem;border-radius:12px;background:rgba(0,0,0,.2);border:1px dashed var(--line);font-size:.95rem}"
)

JS = r"""(function(){
var D=__DATA__,LAST='__LAST__',CREDIT=__CREDIT__;
var $=function(i){return document.getElementById(i)};
var F=['mohel','mphone','parents','pphone','baby','date','credit'];
var KEY='hachlama-v1';
function ev(n,p){if(window.kelimEv)window.kelimEv(n,Object.assign({tool:'hachlama'},p||{}));}
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
function save(){var s={};F.forEach(function(k){var el=$('hl-'+k);s[k]=el.type==='checkbox'?el.checked:el.value});
  // רק פרטי המוהל נשמרים לפעם הבאה; פרטי המשפחה מתאפסים אחרי חודש
  s.t=Date.now();try{localStorage.setItem(KEY,JSON.stringify(s))}catch(e){}}
function val(k){return ($('hl-'+k).value||'').trim()}
function fill(t,key){var p=val('parents'),b=val('baby'),m=val('mohel'),ph=val('mphone');
  t=t.split('{P}').join(p?' '+p:'');
  t=t.split('{LB}').join(b?'ל'+b:'לתינוק').split('{B}').join(b||'התינוק');
  t=t.split('{T}').join(ph||'[הטלפון שלי]');
  t=t.split('\n{M}').join(m?'\n'+m:'');
  if(key===LAST&&$('hl-credit').checked)t+='\n\n_'+CREDIT+'_';
  return t}
function intl(n){n=(n||'').replace(/\D/g,'');if(!n)return '';if(n.indexOf('972')===0)return n;if(n[0]==='0')return '972'+n.slice(1);return n}
var DAYS=['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];
function when(off){var d=$('hl-date').value;if(off===null||!d)return null;var x=new Date(d+'T12:00:00');x.setDate(x.getDate()+off);return x}
function same(a,b){return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate()}
function render(){var now=new Date(),first=null;
  D.forEach(function(m){var box=$('hl-'+m.k),ta=box.querySelector('textarea');
    if(!ta.dataset.edited)ta.value=fill(m.t,m.k);
    ta.style.height='auto';ta.style.height=(ta.scrollHeight+4)+'px';
    var w=when(m.o),lab=box.querySelector('.hl-when');
    var txt=m.w;if(w){txt+=' · יום '+DAYS[w.getDay()]+', '+w.getDate()+'.'+(w.getMonth()+1);}
    lab.textContent=txt;box.classList.remove('today');
    if(w&&same(w,now)){var b=document.createElement('b');b.textContent='היום';lab.appendChild(b);box.classList.add('today');if(!first)first=box;}
    var a=box.querySelector('[data-wa]'),n=intl(val('pphone'));
    a.href=(n?'https://wa.me/'+n+'?text=':'https://api.whatsapp.com/send?text=')+encodeURIComponent(ta.value);});
  var j=$('hl-jump');j.hidden=!first;if(first)j.querySelector('a').href='#'+first.id;}
F.forEach(function(k){var el=$('hl-'+k);el.addEventListener('input',function(){save();render()});el.addEventListener('change',function(){save();render()})});
var s=load();if(s.t&&Date.now()-s.t>30*864e5){s.parents=s.pphone=s.baby=s.date=''}
F.forEach(function(k){if(s[k]===undefined)return;var el=$('hl-'+k);if(el.type==='checkbox')el.checked=!!s[k];else el.value=s[k]});
if(s.mohel)$('hl-saved').hidden=false;
document.addEventListener('input',function(e){if(e.target.matches('.hl textarea')){e.target.dataset.edited='1';render()}});
document.addEventListener('click',function(e){
  var c=e.target.closest('[data-copy]');
  if(c){var ta=c.closest('.hl').querySelector('textarea');var done=function(){c.textContent='הועתק ✓';setTimeout(function(){c.textContent='להעתיק'},2200)};
    (navigator.clipboard?navigator.clipboard.writeText(ta.value):Promise.reject()).then(done).catch(function(){ta.select();try{document.execCommand('copy');done()}catch(x){c.textContent='סמנו והעתיקו'}});
    ev('hachlama_copy',{msg:c.closest('.hl').id.slice(3)});return}
  var w=e.target.closest('[data-wa]');if(w){ev('hachlama_wa',{msg:w.closest('.hl').id.slice(3),to:val('pphone')?'parents':'pick'});return}
  var r=e.target.closest('[data-reset]');if(r){var box=r.closest('.hl'),ta=box.querySelector('textarea');delete ta.dataset.edited;render();return}
  if(e.target.closest('#hl-new')){['parents','pphone','baby','date'].forEach(function(k){$('hl-'+k).value=''});document.querySelectorAll('.hl textarea').forEach(function(t){delete t.dataset.edited});save();render();$('hl-parents').focus()}
});
render();
})();"""


def page():
    data = [{"k": k, "o": o, "w": w, "t": t} for k, o, _title, w, _src, t in MSGS]
    js = (JS.replace("__DATA__", json.dumps(data, ensure_ascii=False))
            .replace("__LAST__", LAST).replace("__CREDIT__", json.dumps(CREDIT_MSG, ensure_ascii=False)))
    cards = []
    for k, o, title, w, _src, t in MSGS:
        cards.append(f"""    <article class="hl" id="hl-{k}">
      <div class="hl-top"><h3>{html.escape(title)}</h3><span class="hl-when">{html.escape(w)}</span></div>
      <textarea aria-label="{html.escape(title)}" rows="9">{html.escape(fill_sample(t))}</textarea>
      <div class="share-row"><a class="btn btn-gold btn-sm" data-wa href="#" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח בווטסאפ</a><button class="btn btn-line btn-sm" type="button" data-copy>להעתיק</button><button class="btn btn-line btn-sm" type="button" data-reset>לנוסח המקורי</button></div>
    </article>""")
    wa_me = "https://wa.me/972584049049?text=%D7%A9%D7%9C%D7%95%D7%9D%20%D7%92%D7%99%D7%9C%D7%A2%D7%93%2C%20%D7%A8%D7%90%D7%99%D7%AA%D7%99%20%D7%90%D7%AA%20%D7%94%D7%95%D7%93%D7%A2%D7%95%D7%AA%20%D7%94%D7%94%D7%97%D7%9C%D7%9E%D7%94.%20"
    meta = {
        "site": "kodesh",
        "nav": "mohalim",
        "tool": "hachlama",
        "title": "הודעות החלמה להורים אחרי ברית מילה: ערכה מוכנה למוהל, בחינם | כלי קודש",
        "description": "למוהלים: הודעות ווטסאפ מוכנות להורים, כל אחת בזמן שלה. מהשיחה הראשונה, יום לפני הברית וערב הברית, ועד שבוע אחרי, ומתי להתקשר מיד. ממלאים פעם אחת שם וטלפון ושולחים בלחיצה. גם קובץ וורד.",
        "og_title": "הודעות החלמה להורים – ערכה מוכנה למוהל",
        "priority": "0.6",
        "crumbs": [["כלים למוהלים", "/kodesh/mohalim/"], ["הודעות החלמה להורים", None]],
        "head": f"<style>{STYLE}</style>",
        "foot": f"<script>{js}</script>",
    }
    body = f"""<!--meta {json.dumps(meta, ensure_ascii=False, indent=2)} -->
<header class="k-hero">
  <h1>הודעות החלמה להורים</h1>
  <p class="sub">מהשיחה הראשונה ועד שבוע אחרי הברית: הודעה מוכנה לכל יום, עם ההנחיות. ממלאים פעם אחת את השם והטלפון שלכם, ושולחים להורים בלחיצה.</p>
</header>
<div class="tool">
  <form class="k-form hl-form" id="hl-form" novalidate autocomplete="off" onsubmit="return false">
    <h2>הפרטים שלכם</h2>
    <p class="hl-saved" id="hl-saved" hidden>נשמר מהפעם הקודמת ✓</p>
    <div class="hl-row">
      <div class="field"><label for="hl-mohel">השם שלכם, לחתימה</label><input id="hl-mohel" type="text" maxlength="60" placeholder="למשל: יוסף לוי, המוהל"></div>
      <div class="field"><label for="hl-mphone">הטלפון שלכם</label><input id="hl-mphone" type="tel" inputmode="tel" maxlength="20" dir="ltr" style="text-align:right" placeholder="050-0000000"></div>
    </div>
    <h2 style="margin-top:.8rem">המשפחה <span class="opt">(לא חובה)</span></h2>
    <div class="hl-row">
      <div class="field"><label for="hl-parents">שם ההורים</label><input id="hl-parents" type="text" maxlength="60" placeholder="למשל: משה ורחל"></div>
      <div class="field"><label for="hl-pphone">הטלפון של ההורים</label><input id="hl-pphone" type="tel" inputmode="tel" maxlength="20" dir="ltr" style="text-align:right" placeholder="050-0000000"></div>
      <div class="field"><label for="hl-baby">שם התינוק <span class="opt">(אחרי הברית)</span></label><input id="hl-baby" type="text" maxlength="40"></div>
      <div class="field"><label for="hl-date">תאריך הברית</label><input id="hl-date" type="date"></div>
    </div>
    <label class="check"><input type="checkbox" id="hl-credit" checked> <span>להוסיף בהודעה האחרונה שורה קטנה שההודעות באדיבות גילעד רחמים, קולגה וחבר בפורום המוהלים</span></label>
    <div class="share-row" style="justify-content:flex-start;margin:.6rem 0 0"><button class="btn btn-line btn-sm" type="button" id="hl-new">משפחה חדשה</button></div>
  </form>
  <p class="disclaimer">עם טלפון ההורים, הכפתור פותח ישר את הצ'אט שלהם. בלי טלפון, בוחרים למי לשלוח. עם תאריך הברית, ליד כל הודעה כתוב מתי לשלוח, וההודעה של היום מסומנת. הפרטים נשמרים רק בטלפון שלכם.</p>
  <p class="hl-jump" id="hl-jump" hidden><a class="btn btn-gold" href="#">להודעה של היום</a></p>

  <div class="hl-list">
{chr(10).join(cards)}
  </div>

  <div class="tip" style="margin-top:1.4rem"><b>אלה ההנחיות שלי</b><p>ההודעות כתובות לפי ההנחיות שאני משאיר אצל המשפחות שלי, מתוך <a class="gold" href="/mohel/hachana/achrei/">דף ההנחיות אחרי הברית</a>. אם אתם נוהגים אחרת, משנים את ההודעה לפני השליחה, וההנחיות שלכם קודמות.</p></div>
  <div class="tip"><b>מנהלים את הבריתות ביומן?</b><p>ב<a class="gold" href="/kodesh/britot/">יומן הבריתות שלי</a> רושמים כל ברית, ומסמנים שראיתם את התינוק והורדתם תחבושת. שני הכלים עובדים טוב יחד.</p></div>

  <section aria-labelledby="hl-doc-h">
    <h2 class="hl-h" id="hl-doc-h" style="text-align:center;margin-top:1.4rem">בלי אתר: קובץ וורד</h2>
    <div class="tip"><b>כל ההודעות בקובץ אחד</b><p>שלוש־עשרה ההודעות, לפי הסדר, עם מקום לשם התינוק ולחתימה. פותחים בטלפון או במחשב, מעתיקים ושולחים.</p>
      <div class="share-row" style="justify-content:flex-start"><a class="btn btn-gold btn-sm" href="/kodesh/hachlama/hodaot-hachlama.docx" download data-share="hachlama_docx">להוריד את קובץ הוורד</a></div></div>
  </section>
  <p class="disclaimer">חלק מ<a class="gold" href="/kodesh/mohalim/">הכלים למוהלים</a>. ההנחיות אינן תחליף לרופא הילדים. רוצים שאוסיף או אתקן משהו? <a class="gold" href="{wa_me}">כתבו לי</a>.</p>
</div>
"""
    PAGE.parent.mkdir(parents=True, exist_ok=True)
    PAGE.write_text(body, encoding="utf-8")
    print("page:", PAGE)


def docx():
    sys.path.insert(0, str(ROOT / "tools"))
    from britot_docx import rtl, run, NAVY, GOLD, GREY  # אותו עיצוב כמו יומן הבריתות
    from docx import Document
    from docx.enum.text import WD_ALIGN_PARAGRAPH
    from docx.shared import Cm, Pt
    doc = Document()
    sec = doc.sections[0]
    sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
    for side in ("left_margin", "right_margin"):
        setattr(sec, side, Cm(2.0))
    sec.top_margin = sec.bottom_margin = Cm(1.8)
    bidi = sec._sectPr

    def para(text="", size=11, bold=False, color=None, align=WD_ALIGN_PARAGRAPH.RIGHT, after=4, font="Arial"):
        p = doc.add_paragraph(); rtl(p); p.alignment = align
        p.paragraph_format.space_after = Pt(after)
        if text:
            run(p, text, size=size, bold=bold, color=color, font=font)
        return p

    para('בס"ד', 9, color=GREY)
    para("הודעות החלמה להורים", 22, True, NAVY, WD_ALIGN_PARAGRAPH.CENTER, 2, "David")
    para("מהשיחה הראשונה ועד שבוע אחרי הברית · מעתיקים, משלימים ושולחים בווטסאפ", 11, color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER, after=10)
    para("איך משתמשים: במקום [שם התינוק] כותבים את שמו (אחרי הברית), ובשורה האחרונה את השם שלכם. אם אתם נוהגים אחרת, משנים את ההנחיה לפני השליחה.", 10.5, color=GREY, after=12)
    for i, (k, o, title, w, _src, t) in enumerate(MSGS, 1):
        para(f"{i}. {title}", 14, True, NAVY, after=0, font="David")
        para("מתי שולחים: " + w, 10, color=GOLD, after=4)
        body = fill_sample(t, baby="[שם התינוק]", mohel="[השם שלי]", credit=(k == LAST))
        body = body.replace("לתינוק אמבטיה", "ל[שם התינוק] אמבטיה")
        for line in body.split("\n"):
            para(line.replace("*", "").replace("_", ""), 11, after=1)
        para("", after=8)
    para(CREDIT_DOC, 8.5, color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER, after=0)
    DOCX.parent.mkdir(parents=True, exist_ok=True)
    doc.save(DOCX)
    print("docx:", DOCX)


def pack(out):
    items = []
    for i, (k, o, title, w, src, t) in enumerate(MSGS, 1):
        items.append({"no": i, "type": "whatsapp", "when": f"{title} · {w}",
                      "note": "מקור: " + src,
                      "text": fill_sample(t, parents="משה ורחל", baby="נתנאל" if (o or 0) >= 0 and k not in ("hekerut", "machar", "erev") else "",
                                          mohel="יוסף לוי, המוהל", phone="050-1234567", credit=(k == LAST))})
        items[-1]["text"] = re.sub(r"\*([^*\n]+)\*", r"**\1**", items[-1]["text"])  # bold of WhatsApp -> bold on the card
    items.append({"no": len(items) + 1, "type": "text", "when": "4 שאלות קטנות אליך", "title": "מה שלא מצאתי בהנחיות שלך",
                  "body": QUESTIONS})
    data = {"title": "חבילת אישור - הודעות החלמה", "prefix": "ה", "items": items}
    pathlib.Path(out).write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    print("pack:", out)


if __name__ == "__main__":
    page()
    docx()
    if len(sys.argv) > 2 and sys.argv[1] == "pack":
        pack(sys.argv[2])
