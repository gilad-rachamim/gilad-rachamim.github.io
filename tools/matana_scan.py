# סורק לידים מוואטסאפ מדפי /matana/ – קורא את ההתראות בטלפון (adb dumpsys notification), בלי לפתוח צ'אטים
# ובלי וי כחול, בלי לשלוח כלום. מזהה הודעות שמתחילות בנוסחי המתנה (tools/matana_reply.py) ומחזיר
# שורות מוכנות ללשונית "לידים מוואטסאפ" בגיליון "לידים – מוהל".
#
#   python -I -X utf8 tools/matana_scan.py            -> JSON עם שורות חדשות בלבד (ומסמן אותן כנראו)
#   python -I -X utf8 tools/matana_scan.py --peek     -> אותו דבר בלי לסמן כנראו (לבדיקה)
#   python -I -X utf8 tools/matana_scan.py --file dump.txt   -> מקובץ dumpsys במקום מהטלפון (בדיקות)
#
# הרצה מתוזמנת כל 30 דקות: משימה מתוזמנת של Claude מריצה את זה, ואם יש שורות חדשות מוסיפה אותן לגיליון
# דרך מחבר Google Sheets ומתריעה לגילעד (ראו הזיכרון wa-leads-matana-playbook).
# מגבלה: התראה נעלמת כשגילעד פותח את הצ'אט או מנקה אותה; מה שנעלם בין שתי הרצות לא נקלט (חצי שעה).
import datetime, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import matana_reply as mr  # noqa: E402

ADB = r'C:\Users\Admin\Tools\platform-tools\adb.exe'
SERIAL = 'RFGL90Z5J5X'
PORT = '5039'
STATE = os.path.join(os.path.expanduser('~'), '.claude', 'data', 'matana-scan-seen.json')
SHEET_COLS = ['תאריך', 'שם', 'טלפון', 'דף מתנה', 'קמפיין', 'מודעה', 'מה ביקש', 'מה שלחנו', 'סטטוס', 'הצעד הבא', 'הצעת המשך', 'הערות']


def dump_from_phone():
    r = subprocess.run([ADB, '-P', PORT, '-s', SERIAL, 'shell', 'dumpsys', 'notification', '--noredact'],
                       capture_output=True, timeout=60)
    if r.returncode != 0 or len(r.stdout) < 1000:
        raise SystemExit('הטלפון לא מחובר (adb): ' + r.stderr.decode('utf-8', 'ignore')[:200])
    return r.stdout.decode('utf-8', 'ignore')


MSG_RE = re.compile(r'\] Bundle\[\{(?:[^\n]*?)text=(.*?), time=(\d{10,})\}\]', re.S)


def records(txt):
    """התראות וואטסאפ של צ'אט פרטי: (טלפון, כותרת, [(זמן, טקסט)])."""
    out = []
    for blk in re.split(r'\n    NotificationRecord\(', txt)[1:]:
        if 'pkg=com.whatsapp ' not in blk[:200]:
            continue
        m = re.search(r'shortcut=(\d+)@(s\.whatsapp\.net|lid)', blk)
        if not m:  # קבוצות (@g.us), ערוצים וסיכומים – לא לידים
            continue
        t = re.search(r'android\.title=\w+ \((.*?)\)\n', blk)
        title = mr.norm(t.group(1)) if t else ''
        msgs = [(int(tm), mr.norm(tx)) for tx, tm in MSG_RE.findall(blk)]
        if not msgs:
            x = re.search(r'android\.text=\w+ \((.*?)\)\n', blk)
            w = re.search(r'\nwhen=(\d+)|\n\s+when=(\d+)', blk)
            if x:
                msgs = [(int(next(g for g in w.groups() if g)) if w else 0, mr.norm(x.group(1)))]
        ident = m.group(1) if m.group(2) == 's.whatsapp.net' else ''  # @lid = מזהה פנימי, לא טלפון
        if not ident:
            num = re.sub(r'\D', '', title) if re.fullmatch(r'[+\d\s()-]+', title) else ''
            ident = num or 'lid' + m.group(1)
        out.append((ident, title, msgs))
    return out


def local_phone(digits):
    if digits.startswith('lid'):
        return "לא ידוע (מזהה פנימי) – לפתוח את הצ'אט"
    return '0' + digits[3:] if digits.startswith('972') else '+' + digits


def hebrew_date(ms):
    if not ms:
        return datetime.date.today().strftime('%d.%m.%Y')
    d = datetime.datetime.fromtimestamp(ms / 1000, tz=datetime.timezone(datetime.timedelta(hours=2)))
    return d.strftime('%d.%m.%Y %H:%M')


def scan(txt):
    pages = mr.load()
    leads = []
    for digits, title, msgs in records(txt):
        for ms, text in msgs:
            clean, code = mr.split_code(text)
            m = mr.match(clean, pages)
            if not m:
                continue
            _, p, stage, extra = m
            name = '' if re.fullmatch(r'[+\d\s()-]+', title) else title.split(':')[0].strip()
            reply, nxt, ladder = mr.reply_for(p, stage, extra, name.split(' ')[0] if name else '')
            camp = mr.CAMPAIGN.get(p['slug'], '')
            ladder_txt = ' | '.join(f'{a} {b} {c}' for a, b, c in ladder)
            notes = ('קוד ' + code + '; ' if code else 'בלי קוד מודעה (נוסח ישן); ') + ('לחץ מדף התודה (כבר קיבל מייל)' if stage == 'thanks' else 'לחיצה ראשונה בדף')
            leads.append({
                'key': f"{digits}|{p['slug']}",
                'row': [hebrew_date(ms), name or 'ללא שם', local_phone(digits), f"/matana/{p['slug']}/ ({p.get('label')})",
                        camp, code, extra or mr.what_they_want(p), 'עוד לא נשלח', 'חדש – מחכה לאישור גילעד',
                        nxt, ladder_txt, notes],
                'reply': reply,
            })
    return leads


def replies(txt, phones, names):
    """הודעות חדשות מלידים שכבר בגיליון (לפי טלפון 05x... או שם), שאינן נוסח מתנה: הם ענו לנו."""
    out = []
    pages = mr.load()
    for digits, title, msgs in records(txt):
        ph = local_phone(digits)
        nm = title.split(':')[0].strip()
        if ph not in phones and nm not in names:
            continue
        for ms, text in msgs:
            if mr.match(mr.split_code(text)[0], pages):
                continue
            out.append({'phone': ph, 'name': nm, 'time': hebrew_date(ms), 'text': text[:400]})
    return out


INBOX_STATE = os.path.join(os.path.expanduser('~'), '.claude', 'data', 'wa-inbox-seen.json')


def inbox(txt, mark):
    """כל הודעה חדשה בצ'אט פרטי שעדיין מחכה (התראה פעילה), פעם אחת בלבד: להתראה לגילעד עם סיכום."""
    try:
        seen = set(json.load(open(INBOX_STATE, encoding='utf-8')))
    except Exception:
        seen = set()
    pages = mr.load()
    out = []
    for digits, title, msgs in records(txt):
        for ms, text in msgs:
            k = f'{digits}|{ms}|{text[:40]}'
            if k in seen:
                continue
            seen.add(k)
            out.append({'chat': title, 'phone': local_phone(digits), 'time': hebrew_date(ms), 'text': text[:500],
                        'matana_lead': bool(mr.match(mr.split_code(text)[0], pages))})
    if mark and out:
        os.makedirs(os.path.dirname(INBOX_STATE), exist_ok=True)
        json.dump(sorted(seen)[-3000:], open(INBOX_STATE, 'w', encoding='utf-8'))
    return out


def main():
    args = sys.argv[1:]
    txt = open(args[args.index('--file') + 1], encoding='utf-8').read() if '--file' in args else dump_from_phone()
    try:
        seen = set(json.load(open(STATE, encoding='utf-8')))
    except Exception:
        seen = set()
    new, dup = [], 0
    for l in scan(txt):
        if l['key'] in seen or any(n['key'] == l['key'] for n in new):
            dup += 1
            continue
        new.append(l)
    if '--peek' not in args and new:
        os.makedirs(os.path.dirname(STATE), exist_ok=True)
        json.dump(sorted(seen | {n['key'] for n in new}), open(STATE, 'w', encoding='utf-8'))
    rep = []
    if '--phones' in args:  # --phones 0545441487,0522454397 [--names מיטל,רביד]
        ph = set(x for x in args[args.index('--phones') + 1].split(',') if x)
        nm = set(x for x in args[args.index('--names') + 1].split(',') if x) if '--names' in args else set()
        rep = replies(txt, ph, nm)
    print(json.dumps({'columns': SHEET_COLS, 'new': new, 'replies': rep, 'inbox': inbox(txt, '--peek' not in args) if '--inbox' in args else [], 'skipped_seen': dup}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
