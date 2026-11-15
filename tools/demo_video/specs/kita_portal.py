"""בונה את specs/kita_portal.json (הכיתה הווירטואלית למתמטיקה, /limudim/kita/) – 14.11.2026.

  python -I tools/demo_video/specs/kita_portal.py && python -I tools/demo_video/render.py tools/demo_video/specs/kita_portal.json

הצילומים ב-shots/kita/ צולמו מהפורטל האמיתי, על שרת הכיתה המקומי (wrangler dev) עם כיתה לדוגמה
(כינויים בלבד, בלי שמות אמיתיים), והכתובת המקומית הוחלפה ב-hakelim.com.
הצילום נגלל בתוך הטלפון בזמן הסצנה (animation-duration לפי אורך הסצנה, ונשאר בסוף הגלילה).
"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def rich(s):
    import re
    return re.sub(r"\*([^*]+)\*", r"<em>\1</em>", esc(s))


def shot(img, title, dur, scroll=0, cap=None, h=None):
    """טלפון עם צילום מסך שנגלל. scroll בפיקסלים של הסרטון (הצילום ברוחב 500)."""
    h = h or (800 if cap else 880)
    move = max(0.8, dur - 1.6)
    html = (f'<div class="h a-up">{rich(title)}</div>'
            f'<div class="shot a-pop" style="animation-delay:.15s;height:{h}px">'
            f'<img src="shots/kita/{img}.jpg" style="--sy:{-abs(scroll)}px;animation-delay:.7s;animation-duration:{move:.1f}s;animation-fill-mode:both"></div>'
            + (f'<div class="cap2 a-up" style="animation-delay:.5s">{rich(cap)}</div>' if cap else ""))
    return {"type": "html", "dur": dur, "html": html}


scenes = [
    {"type": "title", "dur": 3.6, "icon": "🏫", "kicker": "מיזם הכלים · לימודים",
     "title": "כיתה וירטואלית\n*למתמטיקה*", "sub": "כל הכיתות, כל התרגילים, וכל שורה שהתלמידה כותבת",
     "chips": ["חינם לכל מורה", "בלי הרשמה", "קוד וכינוי בלבד"]},
    shot("k1-classes", "כל הכיתות וההקבצות *בקישור אחד*", 3.4, 0),
    shot("k2-newhw", "לכל תרגיל: *מחשבון, סרטון ושיעור*", 3.6, 90, cap="מעלים דף עבודה או כותבים תרגילים"),
    shot("k5-machberet", "מחברת שבודקת *כל שורה*", 3.8, 0, cap="נתקעה? 🙋 המורה רואה מיד ושולחת רמז"),
    shot("k4-bank", "הכנה לשיעור מתוך *48 שיעורים*", 3.2, 0, cap="מלוח הכפל ועד הבגרות"),
    shot("k6-forum", "שאלות לכיתה: *לומדות אחת מהשנייה*", 3.6, 300),
    shot("k8-talmid", "פרגון, נקודות *ותגים*", 3.6, 330),
    shot("k3-hwlist", "מרתון חזרה עם *בונוס כיתתי*", 3.2, 80, cap="ובונוס זריזות לשלוש הראשונות"),
    shot("k9-fun", "הפסקת חשיבה *ותחרות בין הכיתות*", 3.6, 420),
    {"type": "html", "dur": 3.2, "html": (
        '<div class="h a-up">מצב מקרן *לשיעור*</div>'.replace("*לשיעור*", "<em>לשיעור</em>")
        + '<div class="a-pop" style="animation-delay:.15s"><img src="shots/kita/k10-makren.jpg" style="width:620px;border-radius:26px;border:10px solid #232c3d;box-shadow:0 30px 80px rgba(0,0,0,.55);display:block;margin:0 auto"></div>'
        + '<div class="cap2 a-up" style="animation-delay:.5s">לוח הנקודות, המטלות והשעון – על הלוח בכיתה</div>')},
    shot("k11-horim", "דף להורים – *בלי פרטי תלמידות*", 3.2, 150),
    {"type": "cards", "cls": "gold", "dur": 4.6, "badge": "💛 לבית הספר", "title": "שותפות *במיזם*", "gap": 0.6, "items": [
        ["👩‍🏫", "לכל מורה – חינם", "כמה כיתות, מטלות, מחברת ושאלות"],
        ["🏫", "לכל צוות המתמטיקה", "הדרכה לצוות, דפים בלי הגבלה ותמיכה"],
        ["📚", "גם לאנגלית ולמקצועות נוספים", "פורטל כזה לכל מקצוע שצריך"]],
        "foot": "עשר פעמים חי (180 ₪) לשנה לכל בית הספר"},
    {"type": "cta", "dur": 4.6, "icon": "🏫", "title": "חינם *לכל מורה*",
     "sub": "לבית ספר – שותפות במיזם, עשר פעמים חי (180 ₪) לשנה", "button": "לפתוח כיתה", "gold": True,
     "url": "hakelim.com/limudim/kita", "small": "בלי שמות מלאים, טלפון או מייל של תלמידים"},
]

spec = {
    "id": "kita_portal",
    "page": "/limudim/kita/",
    "name": "הכיתה הווירטואלית למתמטיקה – ככה זה עובד",
    "description": "סרטון הסבר קצר על הכיתה הווירטואלית למתמטיקה: כמה כיתות והקבצות בקישור אחד, דף עבודה עם מחשבון וסרטון לכל תרגיל, מחברת שבודקת כל שורה, הכנה לשיעור מתוך 48 שיעורים, שאלות לכיתה, פרגון ונקודות, מרתון חזרה, הפסקת חשיבה, מצב מקרן ודף הורים. חינם לכל מורה; לבית ספר – שותפות במיזם.",
    "mood": "calm",
    "poster_t": 2.4,
    "scenes": scenes,
    "flyer": {
        "icon": "🏫",
        "kicker": "כיתה וירטואלית למתמטיקה",
        "title": "כל שורה נבדקת, *כל תלמידה מקבלת עזרה*",
        "sub": "לכל תרגיל – *מחשבון, סרטון ושיעור*.",
        "chips": ["חינם לכל מורה", "בלי הרשמה", "קוד וכינוי בלבד"],
        "steps": ["פותחים כיתה או הקבצה", "שולחים לבנות את הקישור בווטסאפ", "נותנים מטלה ורואים מי פתרה ומי נתקעה"],
        "features_title": "מה יש בכיתה",
        "features": [["📓", "מחברת שבודקת כל שורה"], ["🎬", "הכנה לשיעור מ-48 שיעורים"], ["💬", "שאלות לכיתה, עם חסימות"], ["🏆", "נקודות, 14 תגים ומרתון"]],
        "partner": {"title": "💛 לבית הספר · שותפות במיזם", "items": [["🏫", "כל הצוות, *עם הדרכה*"], ["📄", "דפים *בלי הגבלה*"], ["📚", "גם *לאנגלית ולמקצועות*"]],
                    "note": "עשר פעמים חי (180 ₪) לשנה לכל בית הספר. לכל מורה – בחינם."},
        "cta": "סורקים ופותחים כיתה",
        "button": "לפתוח כיתה",
        "url": "https://hakelim.com/limudim/kita/?utm_source=flyer&utm_medium=share",
        "url_text": "hakelim.com/limudim/kita",
    },
}
total = sum(s["dur"] for s in scenes)
(HERE / "kita_portal.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"kita_portal.json: {len(scenes)} scenes, {total:.1f}s")
