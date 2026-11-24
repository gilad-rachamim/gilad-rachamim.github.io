# -*- coding: utf-8 -*-
"""שלב עריכה אחרי התמלול (22.11.2026, לבקשת כולל נחלת אבות): פיסוק, תיקון טעויות תמלול ברורות,
כותרות משנה ותקציר קצר בראש הקובץ. Gemini בחינם, מפתח נפרד לכלי הזה (סביבה: YUTUB_GEMINI, אפשר כמה מפתחות).

עקרון: לא משנים את דברי המרצה. כל פסקה נשארת פסקה (אותו מספר, אותו סדר), כדי שהזמנים יישארו נכונים
ושאפשר יהיה לבדוק כל פסקה: אם המודל קיצר או האריך אותה יותר מדי - נשארת הפסקה המקורית.
אין מפתח, או שהמודל לא עונה - הקובץ יוצא כמו קודם, בלי עריכה. הלוג לא מדפיס טקסט מהשיעור."""
import json
import os
import re
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

# 24.11.2026: 3.1-flash-lite עמוס (503) רוב הזמן; הקלים החדשים עונים אבל דוחים thinkingConfig (400)
MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.1-flash-lite"]
CHUNK_WORDS = 900
API = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent"

EDIT_PROMPT = """אתה עורך לשון של תמלול אוטומטי של שיעור תורה בעברית. לפניך פסקאות ממוספרות.
החזר כל פסקה ערוכה, באותו מספר ובאותו סדר. מה מותר:
- לתקן פיסוק ולחלק למשפטים ברורים.
- לתקן מילה שברור שהתמלול שמע לא נכון (למשל שם של פרשה, פסוק ידוע, שם של חכם, מילה בארמית).
- להשמיט גמגומים, חזרות ומילות מילוי ("אה", "כאילו", "נכון?", משפט שנאמר פעמיים).
- להשמיט מילים שברור שאינן קשורות לשיעור: מילים חסרות פשר שהתמלול המציא מרעש, משירה או מדיבור ברקע.
- פסקה שכולה רעש כזה ואין בה תוכן מהשיעור: מחזירים אותה עם drop=true וטקסט ריק.
- לתקן שגיאות כתיב.
- כותבים בלי ניקוד, גם בפסוקים.
מה אסור:
- להוסיף תוכן, הסבר, מקור או פסוק שלא נאמרו.
- לשנות את הדעה, הסדר או הסגנון של המרצה. לשון דיבור נשארת לשון דיבור.
- לאחד, לפצל או לדלג על פסקאות. פסקה שלא הבנת - מחזירים כמו שהיא.
כשמתחיל נושא חדש בשיעור, הוסף לפסקה שבה הוא מתחיל שדה head: כותרת משנה קצרה (2 עד 6 מילים) שמתארת את הנושא, במילים של המרצה. כותרת בערך פעם ב-4 עד 8 פסקאות, לא לכל פסקה.
שם השיעור: %s

הפסקאות:
%s"""

SUM_PROMPT = """לפניך שיעור תורה כתוב. כתוב תקציר נאמן שלו, רק ממה שנאמר בשיעור, בלי להוסיף דבר משלך:
- summary: 2 עד 4 משפטים שאומרים על מה השיעור ומה המסר המרכזי.
- points: 4 עד 7 נקודות עיקריות לפי סדר השיעור, כל אחת משפט אחד קצר.
- sources: המקורות שהמרצה הזכיר במפורש בשיעור (פסוק, גמרא, מדרש, ספר, מפרש), לפי סדר השיעור, כל מקור בשורה קצרה: שם המקור ועל מה הוא הובא. לא מוסיפים מראה מקום (פרק, פסוק, דף) שלא נאמר בשיעור, ולא מקור שלא הוזכר. אין מקורות - רשימה ריקה.
עברית פשוטה וברורה. בלי פתיחות כמו "בשיעור זה".
שם השיעור: %s

השיעור:
%s"""

DIGEST_PROMPT = """לפניך שיעור תורה כתוב. כתוב סיכום שיעור מסודר שלו, למי שרוצה ללמוד את השיעור בכמה דקות.
- אורך כולל: %d עד %d מילים.
- הפרק הראשון הוא פתיחה (head: "פתיחה"): 2 עד 4 משפטים שמציגים את נושא השיעור, את השאלה המרכזית שהוא בא לענות עליה ולמה היא חשובה, כך שגם מי שלא שמע את השיעור מבין לאן הולכים.
- אחריו 4 עד 7 פרקים לפי סדר השיעור. לכל פרק head (כותרת של 2 עד 6 מילים) ו-text (פסקה אחת או שתיים, בלשון ברורה וזורמת). כל אחד מהפרקים האלה באורך 110 עד 170 מילים - לא מקצרים אותם, כי הם עיקר הסיכום.
- הפרק האחרון (head: "המסר למעשה"): 2 עד 3 משפטים עם המסקנה והמסר שהמרצה סיים בהם.
- כל פרק נפתח במשפט שמקשר אותו לפרק הקודם, כדי שהסיכום ייקרא כמאמר אחד רציף ולא כרשימה.
- בכל פרק: השאלה או הנושא, המקורות שהובאו עליו, המהלך של המרצה והמסקנה. משל או סיפור שנאמר - במשפט או שניים.
- רק מה שנאמר בשיעור. לא מוסיפים רעיון, מקור, מראה מקום או פסוק שלא נאמרו, ולא מחווים דעה.
- כותבים בגוף שלישי ענייני ("המרצה מסביר", או פשוט את התוכן עצמו), בלי ניקוד, בלי פתיחות כמו "בשיעור זה", ובלי לחזור על המילה "המרצה" בכל משפט.
שם השיעור: %s

השיעור:
%s"""

DIGEST_SCHEMA = {"type": "OBJECT", "properties": {"parts": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
    "head": {"type": "STRING"}, "text": {"type": "STRING"}}, "required": ["head", "text"]}}}, "required": ["parts"]}
EDIT_SCHEMA = {"type": "OBJECT", "properties": {"paras": {"type": "ARRAY", "items": {"type": "OBJECT", "properties": {
    "i": {"type": "INTEGER"}, "head": {"type": "STRING"}, "text": {"type": "STRING"}, "drop": {"type": "BOOLEAN"}}, "required": ["i", "text"]}}}, "required": ["paras"]}
SUM_SCHEMA = {"type": "OBJECT", "properties": {"summary": {"type": "STRING"}, "points": {"type": "ARRAY", "items": {"type": "STRING"}}, "sources": {"type": "ARRAY", "items": {"type": "STRING"}}},
              "required": ["summary", "points"]}


def keys():
    return [k for k in re.split(r"[\s,]+", os.environ.get("YUTUB_GEMINI", "")) if k]


def ask(prompt, schema, max_out=16000, tries=4):
    """שאלה אחת ל-Gemini, תשובה כ-JSON. מחליף מודל ומפתח כשעמוס או כשהמכסה נגמרה. None אם לא הצליח."""
    ks = keys()
    if not ks:
        return None
    def make(think):
        gen = {"temperature": 0.1, "maxOutputTokens": max_out, "responseMimeType": "application/json", "responseSchema": schema}
        if think:
            gen["thinkingConfig"] = {"thinkingBudget": 0}
        return json.dumps({"contents": [{"parts": [{"text": prompt}]}], "generationConfig": gen}).encode("utf-8")
    body, body_lite = make(True), make(False)
    n = 0
    for attempt in range(tries):
        for model in MODELS:
            key = ks[n % len(ks)]
            n += 1
            lite = "flash-lite" in model and "3.1" not in model
            req = urllib.request.Request(API % model, data=body_lite if lite else body, headers={"Content-Type": "application/json", "x-goog-api-key": key})
            try:
                with urllib.request.urlopen(req, timeout=180) as r:
                    j = json.loads(r.read().decode("utf-8"))
                cand = (j.get("candidates") or [{}])[0]
                if cand.get("finishReason") not in (None, "STOP"):
                    continue
                txt = "".join(p.get("text", "") for p in (cand.get("content") or {}).get("parts", []))
                return json.loads(txt)
            except urllib.error.HTTPError as e:
                if e.code in (400, 403, 404):
                    continue
            except Exception:
                pass
        time.sleep(4 + 6 * attempt)
    return None


def clean(s):
    s = re.sub("[֑-ֽֿ-ׇ]", "", str(s or ""))      # בלי ניקוד וטעמים: ניקוד אוטומטי עלול לטעות
    return re.sub(r"\s+", " ", s).strip()


def edit_chunk(title, chunk):
    """chunk = [(index, para)] -> {index: (text, head)} רק לפסקאות שעברו את הבדיקה."""
    src = "\n\n".join("[%d] %s" % (i, p["text"]) for i, p in chunk)
    j = ask(EDIT_PROMPT % (title, src), EDIT_SCHEMA)
    out = {}
    if not j:
        return out
    orig = dict(chunk)
    for row in j.get("paras") or []:
        try:
            i = int(row.get("i"))
        except (TypeError, ValueError):
            continue
        if i not in orig:
            continue
        text, before = clean(row.get("text")), len(orig[i]["text"].split())
        if row.get("drop") is True and before <= 120:
            out[i] = (None, "")
            continue
        after = len(text.split())
        # עריכה אמורה לקצר מעט. קיצור חד או הארכה = המודל סיכם או הוסיף, ולכן נשארים עם המקור.
        if not text or after < before * 0.55 or after > before * 1.15 + 5:
            continue
        head = clean(row.get("head"))[:60]
        out[i] = (text, head if 0 < len(head.split()) <= 8 else "")
    return out


def polish(paras, title, progress=lambda m, pct: None):
    """מחזיר (פסקאות ערוכות, תקציר או None, כמה פסקאות נערכו). בלי מפתח - מחזיר את הקלט כמו שהוא."""
    if not keys() or not paras:
        return paras, None, 0
    chunks, cur, words = [], [], 0
    for i, p in enumerate(paras):
        cur.append((i, p))
        words += len(p["text"].split())
        if words >= CHUNK_WORDS:
            chunks.append(cur)
            cur, words = [], 0
    if cur:
        chunks.append(cur)
    progress("עורך את השיעור: פיסוק, כותרות ותקציר", 90)
    edited = {}
    with ThreadPoolExecutor(max_workers=3) as ex:
        for res in ex.map(lambda c: edit_chunk(title, c), chunks):
            edited.update(res)
    drops = [i for i, v in edited.items() if v[0] is None]
    if len(drops) > max(2, len(paras) * 0.1):                 # המודל רוצה למחוק יותר מדי - לא מוחקים כלום
        for i in drops:
            del edited[i]
        drops = []
    out, had_heads, carry = [], any(p.get("head") for p in paras), ""
    for i, p in enumerate(paras):
        q = dict(p)
        if i in drops:
            carry = carry or p.get("head") or ""       # כותרת פרק של פסקה שנמחקה עוברת לבאה
            continue
        if carry and not q.get("head"):
            q["head"] = carry
        carry = ""
        if i in edited:
            q["text"] = edited[i][0]
            if edited[i][1] and not had_heads and out:      # פרקים של יוטיוב גוברים על כותרות של המודל
                q["head"] = edited[i][1]
        out.append(q)
    summary = None
    if len(edited) >= len(paras) * 0.5:
        full = "\n\n".join(p["text"] for p in out)
        j = ask(SUM_PROMPT % (title, full[:120000]), SUM_SCHEMA, max_out=4000)
        if j and clean(j.get("summary")):
            pts = [clean(x) for x in (j.get("points") or []) if clean(x)][:7]
            src = [clean(x)[:200] for x in (j.get("sources") or []) if clean(x)][:25]
            summary = {"summary": clean(j["summary"])[:900], "points": [x[:260] for x in pts], "sources": src}
    if summary:
        total = len(full.split())
        lo, hi = max(250, min(700, total // 10)), max(450, min(1100, total // 6))
        j = ask(DIGEST_PROMPT % (lo, hi, title, full[:120000]), DIGEST_SCHEMA, max_out=8000)
        parts = [{"head": clean(x.get("head"))[:60], "text": clean(x.get("text"))} for x in ((j or {}).get("parts") or []) if clean(x.get("text"))]
        words = sum(len(x["text"].split()) for x in parts)
        if len(parts) >= 2 and lo * 0.5 <= words <= max(hi * 1.6, total * 0.4) and total >= 600:
            summary["digest"] = parts
    print("polish: %d/%d paras edited, summary %s, digest %s" % (len(edited), len(paras), "yes" if summary else "no",
                                                              "yes" if summary and summary.get("digest") else "no"), flush=True)
    return out, summary, len(edited)
