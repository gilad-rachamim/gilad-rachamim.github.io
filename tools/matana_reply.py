# מה לענות לליד שכתב בווטסאפ מדף /matana/ – בלי לפתוח את דף הנחיתה.
# קורא את tools/data/matana-pages.json (אותו מקור שבונה את הדפים), מזהה לפי הנוסח המוכן
# של הכפתור מאיזה דף ומאיזה שלב הגיעה ההודעה, ומחזיר: דף, קמפיין, תשובה מוצעת, הצעת המשך.
#
#   python -I -X utf8 tools/matana_reply.py "שלום גילעד, אשמח לקבל את המתנה: ..." [--name מיטל]
#   python -I -X utf8 tools/matana_reply.py --all      (מדריך מלא לכל הדפים)
#
# התשובה היא טיוטה: גילעד מאשר לפני שליחה, כמו תמיד.
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, 'data', 'matana-pages.json')

# הקמפיינים של הסבב השני (24.11.2026) לפי הדף שהם מפנים אליו.
CAMPAIGN = {
    'orchei-din': 'orchei2', 'roe': 'roe2', 'esek': 'esek2', 'claude': 'claude2',
    'kelim': 'kelim2', 'mohel-kurs': 'kurs6',
}

LADDER_BIZ = [
    ('כלי ממותג', '290 ₪', 'https://payhip.com/b/M5xC6'),
    ('ערכת כלים לאתר', '590 ₪', 'https://payhip.com/b/8utXB'),
    ('עסק דיגיטלי', '990 ₪', 'https://payhip.com/b/bPiCF'),
]
LADDER_CLAUDE = [
    ('קבוצת עבודה + 30 בקשות', '18 ₪', 'https://payhip.com/b/kNyeO'),
    ('הקורס המלא', '147 ₪', 'https://payhip.com/b/mXida'),
]


def norm(s):
    s = re.sub(r'[‎‏‪-‮]', '', s or '')
    s = s.replace('׳', "'").replace('״', '"')
    return re.sub(r'\s+', ' ', s).strip()


CODE_RE = re.compile(r'\(\s*קוד\s*:\s*([A-Za-z0-9_-]+)\s*\)')


def split_code(text):
    """מוציא את "(קוד: קמפיין-מודעה)" מסוף ההודעה. מחזיר (טקסט בלי הקוד, קוד או '')."""
    t = norm(text)
    m = CODE_RE.search(t)
    if not m:
        return t, ''
    return norm(t[:m.start()] + ' ' + t[m.end():]), m.group(1)


def load():
    with open(DATA, encoding='utf-8') as f:
        return json.load(f)['pages']


def what_they_want(p):
    # "...אשמח לקבל את המתנה: X" -> X
    t = norm(p.get('wa_text'))
    w = t.split(':', 1)[1].strip(' .') if ':' in t else p.get('wa_bonus', '')
    return re.sub(r'(שלי|לבחירתי)$', lambda m: 'שלך' if m.group(1) == 'שלי' else 'לבחירתך', w)


def obj(w):
    if w.startswith('כלי אחד'):
        return 'כלי אחד לבחירתך במיתוג אישי. תכתוב/תכתבי לי איזה כלי מהרשימה'
    if w.startswith('כלי '):
        return 'את הכלי ' + w[4:]
    return 'את ' + w


LOGO_DEFAULT = norm('אצרף בהודעה הבאה / אין לי (אשמח שתכין)')


def fields(p, extra):
    """25.11.2026: שורות המילוי (wa_form) -> {תווית: ערך}. ערך ריק = הליד לא מילא."""
    labels = [l.split(':', 1)[0].strip() for l in p.get('wa_form') or []]
    pos = [(extra.find(l + ':'), l) for l in labels]
    pos = sorted((i, l) for i, l in pos if i >= 0)
    out = {}
    for k, (i, l) in enumerate(pos):
        end = pos[k + 1][0] if k + 1 < len(pos) else len(extra)
        out[l] = extra[i + len(l) + 1:end].strip()
    return out


def reply_for(p, stage, extra, name):
    hi = f'היי {name}, איזה כיף שכתבת 😊' if name else 'היי, איזה כיף שכתבת 😊'
    kind = p.get('upsell')
    f = fields(p, extra) if extra else {}
    if kind == 'branded' and any(v and v != LOGO_DEFAULT for v in f.values()):
        # הליד מילא את התבנית: מאשרים ומתחילים לבנות, ושואלים רק מה שחסר
        logo = f.get('לוגו', '')
        no_logo = 'אין לי' in logo and 'אצרף' not in logo
        missing = [l for l, v in f.items() if not v and '(אם יש)' not in l and l != 'לוגו']
        lines = [hi, 'קיבלתי את כל הפרטים, תודה!', f'אני מכין לך {obj(what_they_want(p))}.']
        if no_logo:
            lines.append('ראיתי שאין לוגו, אז אכין לך גם לוגו בשמחה.')
        if missing:
            lines.append('רק חסר לי: ' + ', '.join(missing) + '.')
        lines.append('ואני שולח לך הצצה עוד היום.')
        nxt = ('לבנות הצצה ממותגת לפי /kelim/dugma-mishrad-levi/ ' + ('+ לוגו פשוט שאני מעצב, ' if no_logo else '(לחכות ללוגו אם יגיע), ')
               + 'צילום מסך לגילעד לאישור, ואז לשלוח. הפרטים: ' + '; '.join(f'{l}: {v or "—"}' for l, v in f.items()))
        return '\n'.join(lines), nxt, LADDER_BIZ
    if kind == 'claude' and 'השאלה שלי' in f:
        extra = f['השאלה שלי']
    if kind == 'branded':
        who = p.get('upsell_for') or 'העסק'
        lines = [hi, f'אני מכין לך {obj(what_they_want(p))}.', 'רק תשלח/י לי בבקשה:',
                 f'1. שם {who}, בדיוק כמו שהוא צריך להופיע',
                 '2. הלוגו (תמונה או קובץ)',
                 '3. מספר הטלפון או הוואטסאפ שהפניות של הלקוחות יגיעו אליו',
                 f'ואם יש ל{who[1:] if who.startswith("ה") else who} אתר, גם את הקישור, כדי שאתאים את הצבעים.',
                 'ואני שולח לך הצצה עוד היום.']
        nxt = 'כשמגיעים הפרטים: לבנות הצצה ממותגת לפי /kelim/dugma-mishrad-levi/, צילום מסך לגילעד לאישור, ואז לשלוח.'
        ladder = LADDER_BIZ
    elif kind == 'claude':
        if extra:
            lines = [hi, 'קיבלתי את השאלה, אני עונה לך אישית ממש עוד מעט.',
                     'ואם תשלח/י לי גם את המייל שלך, אשלח לך במתנה את 12 הפרומפטים המוכנים.']
            nxt = f'לנסח תשובה אישית לשאלה: "{extra}" – לגילעד לאישור, ואז לשלוח.'
        else:
            lines = [hi, 'נראה שהשאלה עצמה לא נכנסה להודעה. תכתוב/תכתבי לי פה מה תרצה/י לשאול על Claude, ואני עונה לך אישית.',
                     'ואם תשלח/י לי גם את המייל שלך, אשלח לך במתנה את 12 הפרומפטים המוכנים.']
            nxt = 'לחכות לשאלה ולמייל.'
        ladder = LADDER_CLAUDE
    elif kind == 'mohel':
        # נוסחי המוהל: לקרוא קודם ~/.claude/skills/mohel-deploy/references/taste.md
        lines = [hi, 'שמח מאוד שפנית.', 'מתי נוח לך לשיחת היכרות קצרה של 10 דקות? אפשר גם עכשיו בהודעות.']
        nxt = 'לתאם שיחת היכרות; את הנוסח לבדוק מול taste.md של המוהל לפני שליחה.'
        ladder = [('קורס המוהלים', 'לפי דף הקורס', '/matana/mohel-kurs/')]
    else:
        lines, nxt, ladder = [hi], 'דף בלי תסריט – לבדוק ידנית.', []
    if stage == 'thanks':
        nxt = 'הוא כבר קיבל את המתנות במייל (לחץ מדף התודה) – ליד חם במיוחד. ' + nxt
    return '\n'.join(lines), nxt, ladder


def match(text, pages):
    t = norm(text)
    best = None
    for p in pages:
        for stage, key in (('first', 'wa_text'), ('thanks', 'wa_thanks')):
            tpl = norm(p.get(key))
            if not tpl:
                continue
            # תבנית מלאה, או 30 התווים הראשונים שלה (אנשים מקצרים/עורכים)
            if t.startswith(tpl) or (len(tpl) > 30 and tpl[:30] in t):
                score = len(tpl) if t.startswith(tpl) else 30
                if not best or score > best[0]:
                    extra = t[len(tpl):].strip() if t.startswith(tpl) else ''
                    best = (score, p, stage, extra)
    return best


def show(p, stage, extra, name, code=''):
    reply, nxt, ladder = reply_for(p, stage, extra, name)
    print(f"דף: /matana/{p['slug']}/  ({p.get('label')})")
    print(f"קמפיין: {CAMPAIGN.get(p['slug'], 'לא ידוע')}  |  שלב: {'לחץ מדף התודה (כבר קיבל מייל)' if stage == 'thanks' else 'לחיצה ראשונה בדף'}")
    if code:
        print(f'קוד מודעה: {code}')
    if extra:
        print(f'מה שהוסיף להודעה: {extra}')
    print('--- תשובה מוצעת ---')
    print(reply)
    print('--- הצעד הבא ---')
    print(nxt)
    if ladder:
        print('--- הצעת המשך (רק אחרי שהוא מרוצה) ---')
        for a, b, c in ladder:
            print(f'{a} {b}  {c}')


def main():
    args = sys.argv[1:]
    name = ''
    if '--name' in args:
        i = args.index('--name')
        name = args[i + 1]
        del args[i:i + 2]
    pages = load()
    if args and args[0] == '--all':
        for p in pages:
            print('=' * 50)
            show(p, 'first', '', '')
        return
    if not args:
        print(__doc__ or 'שימוש: matana_reply.py "<ההודעה>"')
        sys.exit(2)
    as_json = '--json' in args
    if as_json:
        args.remove('--json')
    clean, code = split_code(' '.join(args))
    m = match(clean, pages)
    if as_json:
        # לסורק האוטומטי (tools/matana_scan.py): שורה אחת בפורמט הגיליון
        if not m:
            print(json.dumps({'matched': False}, ensure_ascii=False))
            sys.exit(1)
        _, p, stage, extra = m
        reply, nxt, ladder = reply_for(p, stage, extra, name)
        print(json.dumps({'matched': True, 'slug': p['slug'], 'page': f"/matana/{p['slug']}/", 'label': p.get('label'),
                          'campaign': CAMPAIGN.get(p['slug'], ''), 'code': code, 'stage': stage, 'extra': extra,
                          'want': what_they_want(p), 'reply': reply, 'next': nxt,
                          'ladder': ' | '.join(f'{a} {b} {c}' for a, b, c in ladder)}, ensure_ascii=False))
        return
    if not m:
        print('לא זוהה: ההודעה לא מתחילה באף נוסח מוכן מדפי /matana/. כנראה לא הגיע מהממומן או שנערך – לבדוק ידנית.')
        sys.exit(1)
    _, p, stage, extra = m
    show(p, stage, extra, name, code)


if __name__ == '__main__':
    main()
