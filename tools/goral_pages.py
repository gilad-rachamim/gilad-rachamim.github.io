# -*- coding: utf-8 -*-
"""יוצר את חמשת דפי ההגרלות בתחום משחקי החשיבה: src/pages/kelim/chashiva/<שם>/index.html
גלגל המזל (galgal), גלגל שמות (galgal-shemot), הגרלה (hagrala), הטלת קוביה (kubiya), הטלת מטבע (matbea).
מנוע אחד לכולם: assets/chashiva-goral.js (המצב ב-data-mode), עיצוב: assets/chashiva-goral.css.
כל דף עונה על חיפוש אחד בגוגל. מילות החיפוש: ~/.claude/state/kelim-seo/keyword-research-2026-11-12.md
(גלגל המזל 10K–100K; גלגל שמות, הגרלה, הטלת קוביה, הטלת מטבע 1K–10K כל אחד).
התוכן כתוב כאן. משנים כאן ומריצים:  python tools/goral_pages.py   ואז  python build.py"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "pages" / "kelim" / "chashiva"
SITE = " | הכלים של גילעד רחמים"
BASE = "/kelim/chashiva/"
ALL = [("galgal", "🎡 גלגל המזל"), ("galgal-shemot", "👥 גלגל שמות"), ("hagrala", "🎟 הגרלה"), ("kubiya", "🎲 הטלת קוביה"), ("matbea", "🌳 הטלת מטבע")]


def links(cur):
    a = "".join(f'<a href="{BASE}{s}/"' + (' aria-current="page"' if s == cur else "") + f">{n}</a>" for s, n in ALL)
    return f'<nav class="gr-links gr-hide" aria-label="עוד דרכים להגריל">{a}</nav>'


SOUND = '<div class="gr-checks"><label><input type="checkbox" id="gr-sound"> צלילים</label></div>'
FAIR = '<p class="gr-fair gr-hide">הבחירה אקראית לגמרי ונעשית במכשיר שלכם. שום דבר לא נשלח לשום מקום, ואין לנו דרך להשפיע על התוצאה.</p>'


def share_tool(text):
    return ('<div class="share-row gr-hide"><a class="btn btn-line btn-sm" href="#" data-share-tool="wa" data-text="' + text
            + '" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח את הכלי לחבר</a></div>')


def wheel(mode, presets):
    chips = "".join(f'<button type="button" data-preset="{k}">{n}</button>' for k, n in presets)
    return f'''<div class="tool" id="gr" data-mode="{mode}">
  <p class="gr-head" id="gr-head"></p>
  <div class="gr-wheel"><span class="gr-pointer" aria-hidden="true"></span><canvas id="gr-canvas" width="640" height="640" role="img" aria-label="גלגל"></canvas><button class="gr-hub" type="button" id="gr-spin">לסובב</button></div>
  <p class="gr-count" id="gr-count"></p>
  <div class="gr-res" id="gr-res" role="status" hidden></div>
  <div class="gr-main"><button class="btn btn-gold btn-block gr-big" type="button" id="gr-spin2">🎡 לסובב את הגלגל</button></div>
  <p class="gr-note gr-hide" id="gr-note" hidden></p>
  <form class="k-form gr-form gr-hide" id="gr-form" novalidate>
    <div class="field"><label for="gr-text">מה בגלגל? <span class="opt">(שורה לכל שם או אפשרות)</span></label><textarea id="gr-text" rows="7" dir="auto"></textarea></div>
    <div class="gr-btns s"><button class="btn btn-line btn-sm" type="button" id="gr-shuffle">🔀 לערבב</button><button class="btn btn-line btn-sm" type="button" id="gr-clear">לרוקן</button></div>
    <div class="field"><label for="gr-title">שם הגלגל <span class="opt">(לא חובה)</span></label><input id="gr-title" type="text" maxlength="60" autocomplete="off"></div>
    <div class="field"><span class="label" id="gr-pre-l">גלגלים מוכנים</span><div class="gr-chips" role="group" aria-labelledby="gr-pre-l">{chips}</div></div>
    <div class="gr-checks"><label><input type="checkbox" id="gr-remove"> להוציא מהגלגל את מי שעלה בגורל</label><label><input type="checkbox" id="gr-sound"> צלילים</label></div>
  </form>
  <div class="gr-sec gr-hide" id="gr-hist-sec" hidden>
    <h2>מי עלה בגורל</h2>
    <ol class="gr-hist" id="gr-hist"></ol>
    <div class="share-row"><a class="btn btn-gold btn-sm" href="#" id="gr-hist-wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח את התוצאות</a><button class="btn btn-line btn-sm" type="button" id="gr-hist-copy">להעתיק</button><button class="btn btn-line btn-sm" type="button" id="gr-hist-clear">למחוק</button></div>
  </div>
  <div class="share-row gr-hide"><a class="btn btn-gold btn-sm" href="#" id="gr-wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח את הגלגל</a><button class="btn btn-line btn-sm" type="button" id="gr-copy">🔗 להעתיק קישור לגלגל</button></div>
  <div class="share-row"><button class="btn btn-line btn-sm" type="button" id="gr-full">מסך מלא</button></div>
  {FAIR}
  {{links}}
</div>'''


P_GENERAL = [("food", "מה אוכלים?"), ("yesno", "כן או לא"), ("nums", "מספר 1–10"), ("chores", "מטלות בבית"), ("prizes", "גלגל פרסים"), ("names", "שמות")]
P_NAMES = [("names", "שמות לדוגמה"), ("nums", "מספרים 1–10"), ("yesno", "כן או לא"), ("chores", "מטלות בבית")]

RAFFLE = f'''<div class="tool" id="gr" data-mode="raffle">
  <form class="k-form" id="gr-form" novalidate>
    <div class="gr-chips" role="group" aria-label="ממה מגרילים"><button type="button" data-src="names" aria-pressed="true">שמות</button><button type="button" data-src="nums" aria-pressed="false">מספרים</button></div>
    <div id="gr-names">
      <div class="field"><label for="gr-text">המשתתפים <span class="opt">(שם בכל שורה)</span></label><textarea id="gr-text" rows="8" dir="auto"></textarea></div>
      <div class="gr-btns s" style="margin-top:.6rem"><button class="btn btn-line btn-sm" type="button" id="gr-shuffle">🔀 לערבב</button><button class="btn btn-line btn-sm" type="button" id="gr-clear">למחוק הכול</button></div>
    </div>
    <div id="gr-nums" hidden>
      <div class="gr-two"><div class="field"><label for="gr-from">ממספר</label><input id="gr-from" type="number" inputmode="numeric"></div><div class="field"><label for="gr-to">עד מספר</label><input id="gr-to" type="number" inputmode="numeric"></div></div>
    </div>
    <div class="field"><label for="gr-n">כמה זוכים?</label><input id="gr-n" type="number" min="1" value="1" inputmode="numeric"></div>
    <p class="gr-count" id="gr-count"></p>
    {SOUND}
  </form>
  <div class="gr-main"><button class="btn btn-gold btn-block gr-big" type="button" id="gr-go">🎟 להגריל</button></div>
  <div class="gr-res" id="gr-res" role="status" hidden></div>
  <div class="share-row" id="gr-share" hidden><a class="btn btn-gold btn-sm" href="#" id="gr-wa" target="_blank" rel="noopener"><svg class="ic"><use href="#wa"/></svg> לשלוח את התוצאות</a><button class="btn btn-line btn-sm" type="button" id="gr-copy">להעתיק</button></div>
  {FAIR}
  {{links}}
</div>'''

DICE = f'''<div class="tool" id="gr" data-mode="dice">
  <div class="gr-dice" id="gr-dice" role="img" aria-label="קוביות"></div>
  <div class="gr-res" id="gr-res" role="status" hidden></div>
  <div class="gr-main"><button class="btn btn-gold btn-block gr-big" type="button" id="gr-go">🎲 להטיל</button></div>
  <div class="k-form gr-form gr-hide">
    <div class="field"><span class="label" id="gr-n-l">כמה קוביות?</span><div class="gr-chips" role="group" aria-labelledby="gr-n-l">{"".join(f'<button type="button" data-n="{i}">{i}</button>' for i in range(1, 7))}</div></div>
    <div class="field"><span class="label" id="gr-s-l">כמה פאות לכל קוביה?</span><div class="gr-chips" role="group" aria-labelledby="gr-s-l">{"".join(f'<button type="button" data-sides="{i}">{i}{" (רגילה)" if i == 6 else ""}</button>' for i in (4, 6, 8, 10, 12, 20))}</div></div>
    {SOUND}
  </div>
  <div class="gr-sec gr-hide" id="gr-hist-sec" hidden>
    <h2>ההטלות האחרונות</h2>
    <ol class="gr-hist one" id="gr-hist" reversed></ol>
    <div class="gr-btns s" style="margin-top:.6rem"><button class="btn btn-line btn-sm" type="button" id="gr-hist-clear">למחוק</button></div>
  </div>
  <div class="share-row"><button class="btn btn-line btn-sm" type="button" id="gr-full">מסך מלא</button></div>
  {FAIR}
  {{links}}
</div>'''

COIN = f'''<div class="tool" id="gr" data-mode="coin">
  <div class="gr-coin-wrap"><button class="gr-coin" type="button" id="gr-coin" aria-label="מטבע. לוחצים כדי להטיל"><span class="a"><em aria-hidden="true">🌳</em><b id="gr-fa">עץ</b></span><span class="b"><em aria-hidden="true">1</em><b id="gr-fb">פלי</b></span></button></div>
  <div class="gr-res" id="gr-res" role="status" hidden></div>
  <div class="gr-main"><button class="btn btn-gold btn-block gr-big" type="button" id="gr-go">להטיל מטבע</button></div>
  <div class="gr-stats" id="gr-stats"></div>
  <div class="gr-btns"><button class="btn btn-line btn-sm" type="button" id="gr-reset" hidden>לאפס את הספירה</button></div>
  <div class="k-form gr-form gr-hide">
    <div class="gr-two">
      <div class="field"><label for="gr-a">במקום "עץ" <span class="opt">(לא חובה)</span></label><input id="gr-a" type="text" maxlength="14" autocomplete="off" placeholder="למשל: אני"></div>
      <div class="field"><label for="gr-b">במקום "פלי" <span class="opt">(לא חובה)</span></label><input id="gr-b" type="text" maxlength="14" autocomplete="off" placeholder="למשל: אתה"></div>
    </div>
    {SOUND}
  </div>
  <div class="share-row"><button class="btn btn-line btn-sm" type="button" id="gr-full">מסך מלא</button></div>
  {FAIR}
  {{links}}
</div>'''

PAGES = [
  dict(slug="galgal", crumb="גלגל המזל", tool="chashiva_galgal", prio="0.8",
    title="גלגל המזל אונליין בחינם: גלגל מסתובב עם שמות או אפשרויות משלכם",
    desc="גלגל המזל אונליין בחינם: כותבים שמות או אפשרויות משלכם, מסובבים, והגלגל בוחר באקראי. לכיתה, למסיבה, להגרלה ולהחלטות קטנות כמו מה אוכלים הערב. אפשר לשלוח את הגלגל בקישור. בלי הרשמה ובלי פרסומות.",
    og="גלגל המזל: כותבים, מסובבים, והגלגל בוחר",
    h1="גלגל המזל", sub="כותבים שמות או אפשרויות, מסובבים, והגלגל בוחר. לכיתה, למשפחה, למסיבה ולכל החלטה קטנה.",
    body=wheel("wheel", P_GENERAL), share="גלגל המזל בחינם: כותבים שמות או אפשרויות, מסובבים, והגלגל בוחר:",
    seo_h="גלגל המזל אונליין: כותבים, מסובבים, והגלגל מחליט",
    seo=[
      (None, "גלגל המזל הוא הדרך הכי כיפית לבחור באקראי. כותבים בכל שורה שם או אפשרות, לוחצים \"לסובב\", והגלגל מסתובב ועוצר על אחת מהן. הוא מתאים לכיתה ולגן, לערב משפחתי, למסיבת יום הולדת, לחלוקת פרסים, להגרלה בין חברים, וגם להחלטות קטנות: מה אוכלים הערב, איזה סרט רואים, ומי שוטף כלים."),
      ("איך משתמשים", "מוחקים את הדוגמה וכותבים את האפשרויות שלכם, שורה לכל אחת. אפשר גם להדביק רשימה שלמה. נותנים לגלגל שם, ולוחצים על הגלגל או על הכפתור. אחרי הסיבוב רואים מי עלה בגורל, ואפשר לסובב שוב או להוציא אותו מהגלגל. יש גם גלגלים מוכנים: כן או לא, מספרים, מטלות בבית וגלגל פרסים."),
      ("שולחים את הגלגל בקישור", "הכפתור \"לשלוח את הגלגל\" יוצר קישור עם כל האפשרויות שכתבתם. מי שפותח אותו מקבל את אותו גלגל ויכול לסובב בעצמו. כך מכינים גלגל אחד לכל הכיתה או לכל המשפחה. \"מסך מלא\" מציג רק את הגלגל, בגדול, למקרן או לטלוויזיה."),
      ("הגרלה הוגנת", "בכל סיבוב לכל אפשרות יש בדיוק אותו סיכוי. הבחירה נעשית במכשיר שלכם, עם מחולל המספרים האקראיים של הדפדפן, ושום דבר לא נשלח לשום מקום. רוצים שאפשרות תופיע יותר? כותבים אותה בכמה שורות. צריכים להגריל כמה זוכים בבת אחת? יש <a href=\"/kelim/chashiva/hagrala/\">הגרלת שמות ומספרים</a>, וגם <a href=\"/kelim/chashiva/kubiya/\">הטלת קוביה</a> ו<a href=\"/kelim/chashiva/matbea/\">הטלת מטבע</a>."),
    ],
    qa=[
      ("איך מוסיפים שמות לגלגל המזל?", "כותבים בתיבה שם או אפשרות בכל שורה, או מדביקים רשימה מוכנה. הגלגל מתעדכן מיד."),
      ("הגלגל באמת אקראי?", "כן. לכל אפשרות יש אותו סיכוי בכל סיבוב, והבחירה נעשית במכשיר שלכם עם מחולל המספרים האקראיים של הדפדפן."),
      ("אפשר להוציא את מי שכבר עלה בגורל?", "כן. מסמנים ״להוציא מהגלגל את מי שעלה בגורל״, או לוחצים ״להוציא מהגלגל״ אחרי הסיבוב. ״להחזיר את כולם״ מחזיר את הרשימה המלאה."),
      ("אפשר לשתף את הגלגל שהכנתי?", "כן. ״לשלוח את הגלגל״ יוצר קישור לווטסאפ. מי שפותח אותו מקבל את אותו גלגל, עם אותן אפשרויות."),
      ("כמה אפשרויות אפשר לשים בגלגל?", "עד 300. כשיש יותר מ-120 אפשרויות, השמות לא נכתבים על הגלגל עצמו, אבל מי שעלה בגורל מוצג בגדול."),
      ("זה בחינם?", "כן. בחינם, בלי הרשמה ובלי פרסומות."),
    ]),
  dict(slug="galgal-shemot", crumb="גלגל שמות", tool="chashiva_galgal_shemot", prio="0.7",
    title="גלגל שמות אונליין בחינם: מי עולה בגורל? לכיתה, לקבוצה ולמשפחה",
    desc="גלגל שמות אונליין בחינם: מדביקים את רשימת השמות של הכיתה או הקבוצה, מסובבים, ורואים מי עלה בגורל. מי שעלה יוצא מהגלגל, כך שכל אחד עולה פעם אחת. עם רשימת התוצאות ומסך מלא למקרן. בלי הרשמה.",
    og="גלגל שמות: מי עולה בגורל?",
    h1="גלגל שמות", sub="מדביקים את רשימת השמות, מסובבים, ורואים מי עלה בגורל. מי שעלה יוצא מהגלגל, וכך כולם מקבלים תור.",
    body=wheel("names", P_NAMES), share="גלגל שמות בחינם: מדביקים רשימה, מסובבים, ורואים מי עלה בגורל:",
    seo_h="גלגל שמות לכיתה, לקבוצה ולמשפחה",
    seo=[
      (None, "גלגל שמות בוחר מישהו מהרשימה, באקראי ובלי ויכוחים. מורה משתמשת בו כדי לבחור מי עונה, מי קורא ומי תורן. מדריך בוחר מי מתחיל במשחק. במשפחה מגרילים מי בוחר את הסרט, ובעבודה מי מביא עוגה ביום שישי."),
      ("איך משתמשים", "מדביקים את רשימת השמות, שם בכל שורה, ולוחצים \"לסובב\". השם שעלה בגורל מוצג בגדול. כברירת מחדל הוא יוצא מהגלגל, כך שבסיבוב הבא עולה מישהו אחר, עד שכולם עלו. \"להחזיר את כולם\" מחזיר את הרשימה המלאה. רוצים שהשמות יישארו? מבטלים את הסימון \"להוציא מהגלגל את מי שעלה בגורל\"."),
      ("רשימת התוצאות", "מתחת לגלגל נשמר הסדר: מי עלה ראשון, שני ושלישי. כך אפשר לקבוע סדר הצגות, סדר תורות או סדר ישיבה, ולשלוח את הרשימה בווטסאפ. הרשימה נשמרת במכשיר גם אם סוגרים את הדף, ולכן אפשר להמשיך באותה כיתה גם מחר."),
      ("למקרן ולכיתה", "\"מסך מלא\" מציג רק את הגלגל, בגדול. אפשר לשלוח את הגלגל בקישור למורה אחרת או להורים, והם יקבלו את אותה רשימה. השמות נשארים במכשיר ולא נשלחים לשום מקום. צריכים כמה זוכים בבת אחת? יש <a href=\"/kelim/chashiva/hagrala/\">הגרלת שמות</a>. רוצים גלגל עם אפשרויות אחרות? יש <a href=\"/kelim/chashiva/galgal/\">גלגל המזל</a>. ולמורים יש גם <a href=\"/kelim/chashiva/kita/\">כיתה משחקת</a>."),
    ],
    qa=[
      ("איך מכניסים את השמות של הכיתה?", "מדביקים את הרשימה בתיבה, שם בכל שורה. אפשר להעתיק אותה מוורד, מאקסל או מקבוצת הווטסאפ."),
      ("איך דואגים שכל תלמיד יעלה רק פעם אחת?", "משאירים מסומן ״להוציא מהגלגל את מי שעלה בגורל״. אחרי כל סיבוב השם יוצא, עד שכולם עלו."),
      ("השמות נשמרים אצלכם?", "לא. הרשימה נשמרת רק במכשיר שלכם, ולא נשלחת לשום מקום."),
      ("אפשר להציג את הגלגל על מקרן?", "כן. ״מסך מלא״ מציג רק את הגלגל ואת מי שעלה בגורל, בגדול."),
      ("הבחירה הוגנת?", "כן. לכל שם יש אותו סיכוי בכל סיבוב, והבחירה אקראית לגמרי."),
      ("זה בחינם?", "כן. בחינם, בלי הרשמה ובלי פרסומות."),
    ]),
  dict(slug="hagrala", crumb="הגרלה", tool="chashiva_hagrala", prio="0.7",
    title="הגרלה אונליין בחינם: הגרלת שמות ומספרים, זוכה אחד או כמה",
    desc="הגרלה אונליין בחינם: מדביקים רשימת שמות או בוחרים טווח מספרים, קובעים כמה זוכים, ולוחצים להגריל. התוצאה מוצגת עם התאריך, השעה ומספר המשתתפים, ואפשר לשלוח אותה בווטסאפ. הגרלה הוגנת, בלי הרשמה.",
    og="הגרלה אונליין: שמות או מספרים, בלחיצה",
    h1="הגרלה אונליין", sub="מדביקים שמות או בוחרים טווח מספרים, קובעים כמה זוכים, ומגרילים. הוגן, מהיר ובחינם.",
    body=RAFFLE, share="הגרלה אונליין בחינם: הגרלת שמות ומספרים, זוכה אחד או כמה:",
    seo_h="הגרלת שמות ומספרים, הוגנת ובלחיצה אחת",
    seo=[
      (None, "צריכים להגריל זוכה? כאן עושים הגרלה בכמה שניות: הגרלת שמות מתוך רשימה, או הגרלת מספרים מתוך טווח. ההגרלה מתאימה לכיתה, לוועד הבית, לקבוצת ווטסאפ, לערב גיבוש, למבצע של עסק קטן, להגרלה בבית הכנסת ולכל מקום שצריך לבחור באקראי ובהגינות."),
      ("הגרלת שמות", "מדביקים את רשימת המשתתפים, שם בכל שורה, וקובעים כמה זוכים רוצים. לוחצים \"להגריל\", והזוכים מוצגים לפי הסדר: ראשון, שני, שלישי. אותו שם לא יכול לזכות פעמיים באותה הגרלה. אם שם מופיע ברשימה פעמיים, יש לו שני כרטיסים. \"להוציא את הזוכים ולהגריל עוד\" ממשיך להגרלה הבאה בלי מי שכבר זכה."),
      ("הגרלת מספרים", "בלשונית \"מספרים\" כותבים מספר התחלה ומספר סוף, למשל מ-1 עד 100, וקובעים כמה מספרים להגריל. זה מתאים להגרלה לפי מספרי כרטיסים, מספרי בתים או מספרים ברשימה."),
      ("הגרלה הוגנת ושקופה", "ההגרלה נעשית במכשיר שלכם, עם מחולל המספרים האקראיים של הדפדפן, ולכל משתתף יש אותו סיכוי. ליד התוצאה מופיעים התאריך, השעה ומספר המשתתפים, ואפשר לשלוח אותה בווטסאפ לכל הקבוצה. רוצים שכולם יראו את ההגרלה מסתובבת? נסו את <a href=\"/kelim/chashiva/galgal/\">גלגל המזל</a> או את <a href=\"/kelim/chashiva/galgal-shemot/\">גלגל השמות</a>."),
    ],
    qa=[
      ("איך עושים הגרלת שמות?", "מדביקים את רשימת השמות, שם בכל שורה, קובעים כמה זוכים, ולוחצים ״להגריל״."),
      ("אפשר להגריל כמה זוכים?", "כן. כותבים כמה זוכים רוצים, והם מוצגים לפי הסדר. אותו שם לא זוכה פעמיים באותה הגרלה."),
      ("איך מגרילים מספר?", "בלשונית ״מספרים״ כותבים מספר התחלה ומספר סוף, ולוחצים ״להגריל״."),
      ("ההגרלה הוגנת?", "כן. לכל משתתף יש אותו סיכוי. ההגרלה נעשית במכשיר שלכם, ואין לנו דרך להשפיע עליה או לראות אותה."),
      ("אפשר להראות לכולם את התוצאה?", "כן. ליד התוצאה מופיעים התאריך, השעה ומספר המשתתפים, ואפשר לשלוח אותה בווטסאפ או להעתיק."),
      ("זה בחינם?", "כן. בחינם, בלי הרשמה ובלי פרסומות."),
    ]),
  dict(slug="kubiya", crumb="הטלת קוביה", tool="chashiva_kubiya", prio="0.7",
    title="הטלת קוביה אונליין: קוביות וירטואליות בחינם, מאחת ועד שש",
    desc="הטלת קוביה אונליין בחינם: מטילים קוביה אחת או עד שש קוביות בלחיצה, ורואים את התוצאה ואת הסכום. גם קוביות של 4, 8, 10, 12 ו-20 פאות. למשחקי קופסה כשהקוביה הלכה לאיבוד, לשש-בש ולכיתה. בלי הרשמה.",
    og="הטלת קוביה: לוחצים, והקוביות מתגלגלות",
    h1="הטלת קוביה", sub="הקוביה הלכה לאיבוד? לוחצים, והקוביות מתגלגלות. מאחת ועד שש קוביות, עם הסכום.",
    body=DICE, share="הטלת קוביה אונליין בחינם, מאחת ועד שש קוביות:",
    seo_h="קוביות וירטואליות למשחקי קופסה, לשש-בש ולכיתה",
    seo=[
      (None, "הקוביה של המשחק נעלמה? כאן מטילים קוביה בלחיצה. הקוביות הווירטואליות מתאימות למונופול ולמשחקי קופסה, לשש-בש, למשחקי תפקידים, לשיעור חשבון ולשיעור הסתברות, ולכל פעם שצריך מספר אקראי בין 1 ל-6."),
      ("איך משתמשים", "בוחרים כמה קוביות להטיל, מאחת ועד שש, ולוחצים \"להטיל\" או על הקוביות עצמן. רואים מה יצא בכל קוביה ואת הסכום של כולן. ההטלות האחרונות נשמרות ברשימה, כדי שלא יהיו ויכוחים על מה יצא."),
      ("קוביות עם יותר פאות", "חוץ מהקוביה הרגילה של שש פאות, יש קוביות של 4, 8, 10, 12 ו-20 פאות, כמו במשחקי תפקידים. בוחרים את מספר הפאות, והקוביה מראה מספר במקום נקודות."),
      ("קוביה וירטואלית לכיתה ולשיעור הסתברות", "בשיעור חשבון אפשר להטיל קוביה 60 פעמים ולבדוק אם כל מספר יוצא בערך עשר פעמים. עם שתי קוביות רואים למה 7 יוצא הכי הרבה, ולמה 2 ו-12 נדירים: יש שש דרכים לקבל 7, ורק דרך אחת לקבל 2. רשימת ההטלות האחרונות עוזרת לרשום תוצאות בלי לפספס. \"מסך מלא\" מציג את הקוביות בגדול על המקרן."),
      ("הטלה הוגנת", "לכל פאה יש בדיוק אותו סיכוי, בכל הטלה. התוצאה נקבעת במכשיר שלכם, עם מחולל המספרים האקראיים של הדפדפן. (הכתיב התקני הוא \"קובייה\", אבל רוב האנשים מחפשים \"קוביה\".) רוצים לשחק שש-בש מלא? יש <a href=\"/kelim/chashiva/shesh-besh/\">שש-בש מול המחשב או מול חבר</a>. צריכים עץ או פלי? יש <a href=\"/kelim/chashiva/matbea/\">הטלת מטבע</a>."),
    ],
    qa=[
      ("איך מטילים קוביה אונליין?", "לוחצים ״להטיל״ או על הקוביה עצמה. הקוביה מתגלגלת ומראה מספר אקראי בין 1 ל-6."),
      ("אפשר להטיל שתי קוביות?", "כן. בוחרים כמה קוביות, מאחת ועד שש, ורואים גם את הסכום של כולן."),
      ("יש קוביה של 20 פאות?", "כן. יש קוביות של 4, 6, 8, 10, 12 ו-20 פאות."),
      ("הקוביה הוגנת?", "כן. לכל פאה יש אותו סיכוי בכל הטלה, והתוצאה נקבעת במכשיר שלכם."),
      ("זה בחינם?", "כן. בחינם, בלי הרשמה ובלי פרסומות."),
    ]),
  dict(slug="matbea", crumb="הטלת מטבע", tool="chashiva_matbea", prio="0.7",
    title="הטלת מטבע אונליין: עץ או פלי, בחינם",
    desc="הטלת מטבע אונליין בחינם: לוחצים, המטבע מסתובב, ויוצא עץ או פלי. עם ספירה של כמה פעמים יצא כל צד, ואפשרות לכתוב שמות במקום עץ ופלי. להחלטה מהירה, למי מתחיל במשחק ולשיעור הסתברות. בלי הרשמה.",
    og="הטלת מטבע: עץ או פלי?",
    h1="הטלת מטבע: עץ או פלי", sub="אין מטבע בכיס? לוחצים, המטבע מסתובב, ויוצא עץ או פלי.",
    body=COIN, share="הטלת מטבע אונליין: עץ או פלי, בחינם:",
    seo_h="עץ או פלי: הטלת מטבע בלי מטבע",
    seo=[
      (None, "לפעמים צריך להחליט מהר: מי מתחיל, מי בוחר, כן או לא. הטלת מטבע היא הדרך הכי פשוטה והכי הוגנת, וכאן עושים אותה גם כשאין מטבע בכיס. לוחצים על המטבע, הוא מסתובב, ויוצא עץ או פלי."),
      ("איך משתמשים", "לוחצים \"להטיל מטבע\" או על המטבע עצמו. אחרי הסיבוב רואים מה יצא. מתחת נספר כמה פעמים יצא עץ, כמה פעמים פלי, וכמה הטלות עשיתם בסך הכול. \"לאפס את הספירה\" מתחיל מחדש."),
      ("שמות במקום עץ ופלי", "רוצים להחליט בין שני אנשים או בין שתי אפשרויות? כותבים אותם במקום \"עץ\" ו\"פלי\", למשל \"אני\" ו\"אתה\", או \"פיצה\" ו\"סושי\". המטבע יראה את מה שכתבתם."),
      ("מי מתחיל? עץ או פלי לפני משחק", "לפני משחק כדורגל, לפני משחק קופסה או לפני ויכוח על מי שוטף כלים: כל צד בוחר עץ או פלי, ומטילים. אין צורך לחפש מטבע בארנק, והמטבע לא מתגלגל מתחת לספה. המטבע מסתובב על המסך, והתוצאה מופיעה בגדול כדי שכולם יראו. במסך מלא אפשר להטיל גם מול כל הכיתה."),
      ("חמישים-חמישים, באמת", "לכל צד יש בדיוק חצי סיכוי בכל הטלה, והתוצאה נקבעת במכשיר שלכם עם מחולל המספרים האקראיים של הדפדפן. בשיעור הסתברות אפשר להטיל הרבה פעמים ולראות איך הספירה מתקרבת לחצי-חצי. יש יותר משתי אפשרויות? נסו את <a href=\"/kelim/chashiva/galgal/\">גלגל המזל</a> או את <a href=\"/kelim/chashiva/kubiya/\">הטלת הקוביה</a>."),
    ],
    qa=[
      ("איך מטילים מטבע אונליין?", "לוחצים ״להטיל מטבע״ או על המטבע עצמו. הוא מסתובב, ויוצא עץ או פלי."),
      ("ההטלה הוגנת?", "כן. לכל צד יש בדיוק חצי סיכוי בכל הטלה, והתוצאה נקבעת במכשיר שלכם."),
      ("אפשר לכתוב שמות במקום עץ ופלי?", "כן. כותבים שתי אפשרויות, למשל שני שמות, והמטבע בוחר ביניהן."),
      ("מה זה עץ ופלי?", "כך קוראים בעברית לשני הצדדים של המטבע בהטלה. בוחרים צד לפני ההטלה, ומי שהצד שלו יצא, זכה."),
      ("זה בחינם?", "כן. בחינם, בלי הרשמה ובלי פרסומות."),
    ]),
]


def faq_ld(qa):
    return ('<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qa]}, ensure_ascii=False) + "</script>")


for p in PAGES:
    meta = {
        "site": "kelim", "nav": "tchumim", "tool": p["tool"],
        "title": p["title"] + SITE, "description": p["desc"], "og_title": p["og"], "priority": p["prio"],
        "crumbs": [["משחקי חשיבה", BASE], [p["crumb"], None]],
        "head": '<link rel="stylesheet" href="/assets/seo-txt.css"><link rel="stylesheet" href="/assets/chashiva-goral.css">' + faq_ld(p["qa"]),
        "foot": '<script src="/assets/chashiva-goral.js" defer></script>',
    }
    seo = "\n".join((f"  <h3>{h}</h3>\n" if h else "") + f"  <p>{t}</p>" for h, t in p["seo"])
    faq = "\n".join(f"  <details><summary>{q}</summary><p>{a.replace('״', chr(34))}</p></details>" for q, a in p["qa"])
    body = p["body"].replace("{links}", links(p["slug"]) + "\n  " + share_tool(p["share"]))
    html = f'''<!--meta {json.dumps(meta, ensure_ascii=False, indent=2)} -->
<header class="k-hero">
  <h1>{p["h1"]}</h1>
  <p class="sub">{p["sub"]}</p>
</header>

{body}

<!--seo-txt-->
<section class="k-sec seo-txt" aria-labelledby="seo-h">
  <h2 id="seo-h">{p["seo_h"]}</h2>
{seo}
</section>
<section class="k-sec seo-faq" aria-labelledby="seo-faq-h">
  <h2 id="seo-faq-h">שאלות ותשובות</h2>
{faq}
</section>
<!--/seo-txt-->
'''
    d = OUT / p["slug"]
    d.mkdir(parents=True, exist_ok=True)
    (d / "index.html").write_text(html, encoding="utf-8", newline="\n")
    print("wrote", p["slug"])
