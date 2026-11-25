# -*- coding: utf-8 -*-
"""ניקוי תמלול אחרי Whisper – גרסת המחשב (12.11.2026). אותם כללים בדיוק כמו ב-Worker:
~/.claude/skills/telegram-hub/worker/src/clean.js (שם ההסבר המלא לכל כלל ולמה נבחר כל סף).
נבדק שהפלט זהה לגרסת ה-JS על כל התמלולים האמיתיים של גילעד (tamlul-kit/tparity.py). שינוי כלל = לשנות בשני הקבצים.

  1. "אדוני היושב-ראש, חבריי חברי הכנסת" (הזיה של המודל) – נמחק כשיש 3 שניות שקט מאחד הצדדים, או כשזה כל התמלול.
  2. אותו קטע ברצף: 3 מילים ומעלה 3 פעמים, או מילה-שתיים 5 פעמים -> פעם אחת.
  3. צירוף שחוזר ברצף בתוך קטע (אותן 3 מילים 4 פעמים) -> פעם אחת; מילה בודדת -> פעמיים.
  4. "תודה רבה" / "תודה שצפיתם" / "כתוביות..." רק כשהם לבד בתוך שקט.
  5. קטע בלי אף אות או מספר.

clean_segments(segs, dur=0) -> (segs, log). clean_jsonl(path) מנקה קובץ .jsonl במקום (שורת כותרת + קטע בכל שורה).
"""
import json
import os
import re
import unicodedata

F1 = "תודה( רבה)?( לך| לכם)?|תודה שצפיתם|תודה על הצפייה|תודה לצפייה|תודה על ההקשבה|מוזיקה"
FILLER = re.compile(rf"^(({F1})( ({F1}))*|(כתוביות|תרגום)( [^ ]+){{0,6}})$")
KN_TAIL = re.compile(r"^ו?(חבריי|חברי|חברות|חברותיי|חברים)$")
GAP_KNESSET, GAP_FILLER, GAP_LAST, GAP_FIRST, MAX_PERIOD = 3, 5, 6, 10, 12


def _strip(t):
    return "".join(ch for ch in str(t or "") if unicodedata.category(ch) not in ("Mn", "Cf"))


def _alnum(ch):
    return unicodedata.category(ch)[0] in ("L", "N")


def norm_text(t):
    s = "".join(ch if _alnum(ch) or ch.isspace() else " " for ch in _strip(t))
    return " ".join(s.split())


def _key(w):
    return "".join(ch for ch in _strip(w) if _alnum(ch))


def fold_repeats(keys):
    """קיפול חזרות ברצף בתוך קטע. מחזיר את האינדקסים של המילים שנשארות, או None כשאין מה לקפל."""
    keep, folded, i = [], False, 0
    while i < len(keys):
        hit = run = 0
        if keys[i] and not keys[i].isdigit():
            p = 1
            while p <= MAX_PERIOD and i + p < len(keys) and not hit:
                n = p
                while i + n < len(keys) and keys[i + n] and keys[i + n] == keys[i + n - p]:
                    n += 1
                if n >= 3 * p + 3 and n >= 4 * p:
                    hit, run = p, n
                p += 1
        if not hit:
            keep.append(i)
            i += 1
            continue
        full = (run // hit) * hit
        if hit == 1:
            keep += [i, i + full - 1]
        else:
            keep += list(range(i + full - hit, i + full))
        i += full
        folded = True
    return keep if folded else None


def _fold_inside(sg):
    words = sg["text"].split()
    keep = fold_repeats([_key(w) for w in words])
    if not keep:
        return None
    out = dict(sg, text=" ".join(words[i] for i in keep))
    if isinstance(sg.get("words"), list):
        if len(sg["words"]) != len(words):
            return None
        out["words"] = [sg["words"][i] for i in keep]
    return out


def _cut_knesset(text):
    words = text.split()
    keys = [_key(w) for w in words]
    for i, k in enumerate(keys):
        if k != "אדוני":
            continue
        nxt = keys[i + 1] if i + 1 < len(keys) else None
        j = i + 2 if nxt == "היושבראש" else (i + 3 if nxt == "היושב" and i + 2 < len(keys) and keys[i + 2] == "ראש" else 0)
        if not j:
            continue
        tail = False
        while j < len(keys) and KN_TAIL.match(keys[j]):
            j += 1
            tail = True
        if tail and j < len(keys):
            j += 1
        rest = words[:i] + words[j:]
        return {"rest": re.sub(r"[\s,\-–]+$", "", " ".join(rest)), "keys": [x for x in (_key(w) for w in rest) if x],
                "cut": j - i, "at": i}
    return None


def clean_segments(segs, dur=0):
    log = []

    def note(why, s, text=None):
        log.append({"why": why, "start": s.get("start"), "end": s.get("end"), "text": s["text"] if text is None else text})

    work = []
    for s in segs or []:
        if not s or not str(s.get("text") or "").strip():
            continue
        s = dict(s, text=str(s["text"]).strip())
        if norm_text(s["text"]):
            work.append(s)
        else:
            note("empty", s)

    def gaps(lst, i, j=None):
        j = i if j is None else j
        before = lst[i]["start"] - lst[i - 1]["end"] if i else lst[i]["start"]
        if j + 1 < len(lst):
            after = lst[j + 1]["start"] - lst[j]["end"]
        else:
            after = max(0, dur - lst[j]["end"]) if dur and dur > 0 else 0
        return before, after, j + 1 == len(lst)

    # 1. "אדוני היושב-ראש"
    kept = []
    for i, s in enumerate(work):
        c = _cut_knesset(s["text"])
        if not c:
            kept.append(s)
            continue
        before, after, _ = gaps(work, i)
        if not (before >= GAP_KNESSET or after >= GAP_KNESSET or len(work) == 1):
            kept.append(s)
            continue
        if len(c["keys"]) > 6:
            t = dict(s, text=c["rest"])
            if isinstance(s.get("words"), list):
                if len(s["words"]) != len(s["text"].split()):
                    kept.append(s)
                    continue
                t["words"] = s["words"][:c["at"]] + s["words"][c["at"] + c["cut"]:]
            kept.append(t)
        note("knesset", s)
    work = kept

    # 2. אותו קטע ברצף
    out, i = [], 0
    while i < len(work):
        k = norm_text(work[i]["text"])
        j = i
        while k and j + 1 < len(work) and norm_text(work[j + 1]["text"]) == k:
            j += 1
        n, w = j - i + 1, (len(k.split(" ")) if k else 0)
        if n >= 5 or (n >= 3 and w >= 3):
            out.append(work[i])
            for x in range(i + 1, j + 1):
                note("loop", work[x])
        else:
            out += work[i:j + 1]
        i = j + 1
    work = out

    # 3. חזרות בתוך קטע
    folded = []
    for s in work:
        f = _fold_inside(s)
        if f:
            note("inner", s, f"{s['text']}  =>  {f['text']}")
        folded.append(f or s)
    work = folded

    # 4. מילות מילוי לבד בתוך שקט
    fin, i = [], 0
    while i < len(work):
        if not FILLER.match(norm_text(work[i]["text"])):
            fin.append(work[i])
            i += 1
            continue
        j = i
        while j + 1 < len(work) and FILLER.match(norm_text(work[j + 1]["text"])) and work[j + 1]["start"] - work[j]["end"] < GAP_FILLER:
            j += 1
        before, after, last = gaps(work, i, j)
        alone = (before >= GAP_FILLER and after >= GAP_FILLER) or (last and before >= GAP_LAST) or (i == 0 and after >= GAP_FIRST)
        for x in range(i, j + 1):
            if alone:
                note("filler", work[x])
            else:
                fin.append(work[x])
        i = j + 1
    return fin, log


# ---- 6. סינון לפי השמע (12.11.2026, גילעד: "למה רק בסבב הבא? תטפל בזה") ----
# הזיה על מוזיקת המתנה נשמעת כמו טקסט אמיתי ("הנך מועבר לנציג שירותי דרך 24-7, הקישו 2" שחוזר בזמן המוזיקה), ואי אפשר
# לזהות אותה מהטקסט. כאן מקשיבים לשמע: Silero VAD (מגיע עם faster-whisper, כבר מותקן; 4 שניות מעבד ל-28 דקות) מסמן איפה
# יש דיבור, וקטע תמלול שאין מתחתיו דיבור בכלל (גם עם שוליים של שנייה לכל צד) נמחק. בדיקה: tamlul-kit/tvad.py.
VAD_PAD = 1.0          # שוליים לכל צד: חותמות הזמן של Whisper זזות לפעמים בשנייה
VAD_MIN_SPEECH = 0.3   # פחות מזה דיבור מתחת לקטע = לא דיבור


def speech_regions(audio_path):
    """[(start, end)] בשניות, איפה Silero VAD שומע דיבור. זורק שגיאה כשאין faster-whisper / ffmpeg."""
    import transcribe_calls as tc
    from faster_whisper.vad import get_speech_timestamps, VadOptions
    a = tc.load_audio(audio_path)
    # רגישות 0.25 (לא ברירת המחדל 0.5): בשיחת טלפון הצד השני שקט, וב-0.5 "מה קורה, גלעדי?" ו"אין לנו מפתח" נחשבו בלי דיבור.
    # ב-0.25 מוזיקת ההמתנה והשקט עדיין 0 שניות דיבור (נבדק 12.11.2026 על הקטעים האמיתיים; ב-0.15 מוזיקה כבר נחשבת דיבור).
    ts = get_speech_timestamps(a, VadOptions(threshold=0.25, min_speech_duration_ms=150,
                                             min_silence_duration_ms=300, speech_pad_ms=200))
    return [(x["start"] / 16000, x["end"] / 16000) for x in ts]


def vad_drop(segs, speech):
    """(segs, log): קטעים שאין מתחתיהם לפחות VAD_MIN_SPEECH שניות דיבור (בתוך הקטע + שוליים) נמחקים."""
    kept, log = [], []
    for s in segs:
        lo, hi = float(s["start"]) - VAD_PAD, float(s["end"]) + VAD_PAD
        ov = sum(max(0.0, min(hi, e) - max(lo, b)) for b, e in speech)
        if ov >= VAD_MIN_SPEECH:
            kept.append(s)
        else:
            log.append({"why": "no-speech", "start": s["start"], "end": s["end"], "text": s["text"], "speech": ov})
    return kept, log


def vad_segments(segs, audio_path):
    """(segs, n_dropped) - סינון לפי השמע; כל תקלה (אין faster-whisper, קובץ שלא נקרא) = בלי שינוי."""
    if not audio_path or not segs:
        return segs, 0
    try:
        speech = speech_regions(audio_path)
    except Exception:  # noqa: BLE001 - never lose a transcript because the check failed
        return segs, -1
    kept, log = vad_drop(segs, speech)
    return kept, len(log)


def clean_jsonl(path, audio=None):
    """מנקה קובץ .jsonl במקום. מחזיר את מספר הקטעים שנמחקו או קופלו (0 = לא השתנה כלום). שורת הכותרת נשמרת,
    ונוסף לה "cleaned": מספר השינויים (סינון הטקסט), ו-"vad": מה שנמחק לפי השמע כשיש `audio` (-1 = הבדיקה נכשלה),
    כדי שלא ינקו פעמיים."""
    with open(path, encoding="utf-8") as f:
        rows = [json.loads(l) for l in f if l.strip()]
    head = rows[0] if rows and "start" not in rows[0] else {}
    todo_text, todo_vad = "cleaned" not in head, bool(audio) and "vad" not in head
    if not todo_text and not todo_vad:
        return 0
    segs = [r for r in rows if "start" in r]
    for s in segs:
        s["start"], s["end"] = float(s.get("start") or 0), float(s.get("end") or 0)
    log = []
    cleaned = segs
    if todo_text:
        cleaned, log = clean_segments(segs, float(head.get("duration") or 0))
        head = dict(head, cleaned=len(log))
    if todo_vad:
        cleaned, nv = vad_segments(cleaned, audio)
        head = dict(head, vad=nv)
        log += [None] * max(0, nv)
    tmp = path + ".clean"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(json.dumps(head, ensure_ascii=False) + "\n")
        for s in cleaned:
            s["start"], s["end"] = round(s["start"], 2), round(s["end"], 2)
            f.write(json.dumps(s, ensure_ascii=False) + "\n")
    os.replace(tmp, path)
    return len(log)


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    for p in sys.argv[1:]:
        print(p, clean_jsonl(p))
