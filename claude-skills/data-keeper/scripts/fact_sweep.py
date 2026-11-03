#!/usr/bin/env python3
"""Check that every data point Gilad gave is stored somewhere - not only in the chat.

  python -I fact_sweep.py --latest [--check DIR ...] [--out FILE]      this session (newest log file)
  python -I fact_sweep.py --session <id> | --today | --day YYYY-MM-DD | --days N   [...]

From each of his messages it pulls literal facts - phone numbers, dates, times, amounts,
percentages, long numbers (accounts, ids), emails, links - and flags sentences that carry a
decision or a standing request ("החלטתי", "תזכור", "חשוב לי", "מעכשיו"...). With --check,
each literal is searched in those folders (.md .txt .json .csv .yaml) and marked found or
NOT FOUND; NOT FOUND comes first. Secrets (passwords, card numbers) are flagged so they are
NOT copied into plain files. Always exits 0 - it is a report, not a gate.
"""
import argparse
import datetime as dt
import glob
import json
import os
import re
import sys

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HEB = 'א-ת'
MONTHS = 'ינואר|פברואר|מרץ|מרס|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר'
KINDS = [  # order matters: an earlier kind claims its span first
    ('link', r'https?://[^\s<>"\')\]]+'),
    ('email', r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+'),
    ('phone', r'(?<![\d+])(?:\+?972[-\s]?|0)(?:5\d|7\d|[2-489])[-\s]?\d{3}[-\s]?\d{4}(?!\d)'),
    ('date', r'(?<![\d.:/])(?:[12]\d|3[01]|0?[1-9])[./](?:1[0-2]|0?[1-9])(?:[./](?:20\d\d|\d\d))?(?![\d%]|[./]\d)'),
    ('date', r'(?<![%s])(?:(?:[12]\d|3[01]|0?[1-9])\s+)?[בל]?(?:%s)(?:\s+20\d\d)?(?![%s])' % (HEB, MONTHS, HEB)),
    ('time', r'(?<![\d:.])(?:[01]?\d|2[0-3]):[0-5]\d(?![\d:])'),
    ('amount', r'(?:₪\s?\d[\d,.]*|\$\s?\d[\d,.]*|\d[\d,.]*\s?(?:₪|ש"ח|שקלים|שקל|דולר|\$|אלף|מיליון))'),
    ('percent', r'(?<![\d.])\d+(?:\.\d+)?\s?%'),
    ('number', r'(?<![\d.,/:-])\d{5,}(?![\d.,/:-])'),
]
KINDS = [(k, re.compile(p)) for k, p in KINDS]
DECISION = re.compile(
    r'(?<![%s])(?:ו|ש|ה)?(?:החלטתי|החלטנו|סיכמנו|תזכור|תזכרי|תזכיר לי|אל תשכח|לא לשכוח|שלא תשכח|חשוב לי|'
    r'שים לב|מעכשיו|מהיום|מעתה|תמיד|אף פעם|בשום אופן|אני רוצה ש|תשמור|קבעתי|קבענו|נקבע|יש לי תור|'
    r'הפגישה|הוועדה|הדיון|עד ה|המספר של|הכתובת של)(?![%s])'
    r"|\b(?:remember|always|never|from now on|i decided|don't forget|keep in mind)\b" % (HEB, HEB), re.I)
SECRET = re.compile(r'(?<![%s])(?:ה)?(?:סיסמה|סיסמא|קוד אימות|קוד סודי|מספר כרטיס|תוקף הכרטיס)(?![%s])'
                    r'|\b(?:password|passcode|cvv|pin code)\b' % (HEB, HEB), re.I)
TEXT_EXT = ('.md', '.txt', '.json', '.csv', '.yaml', '.yml')


def claude_dir():
    return os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')


def log_root():
    try:
        with open(os.path.join(SKILL_DIR, 'config.json'), encoding='utf-8') as f:
            custom = json.load(f).get('log_dir')
    except Exception:
        custom = None
    return os.path.expanduser(custom) if custom else os.path.join(claude_dir(), 'user-log')


def pick_files(args):
    root = log_root()
    files = glob.glob(os.path.join(root, '*', '*.jsonl'))
    if args.latest:
        return sorted(files, key=os.path.getmtime)[-1:]
    if args.session:
        return [f for f in files if os.path.basename(f).startswith(re.sub(r'[^A-Za-z0-9_.-]', '_', args.session))]
    days = None
    if args.today:
        days = {dt.date.today().isoformat()}
    elif args.day:
        days = {args.day}
    elif args.days:
        days = {(dt.date.today() - dt.timedelta(days=i)).isoformat() for i in range(args.days)}
    return [f for f in files if days is None or os.path.basename(os.path.dirname(f)) in days]


def messages(files):
    out = []
    for path in files:
        with open(path, encoding='utf-8', errors='replace') as f:
            for line in f:
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                if isinstance(rec, dict) and str(rec.get('text', '')).strip():
                    out.append(rec)
    return sorted(out, key=lambda r: str(r.get('t', '')))


def extract(text):
    facts, taken = [], []
    for kind, pat in KINDS:
        for m in pat.finditer(text):
            a, b = m.span()
            if any(a < y and b > x for x, y in taken):
                continue
            val = m.group(0).strip().rstrip('.,;:')
            if kind == 'number' and 13 <= len(val) <= 19:
                kind = 'card?'
            taken.append((a, b))
            facts.append((kind, val))
    return facts


def sentences(text, pat):
    parts = re.split(r'(?<=[.!?])\s+|\n+', text)  # "4.11.2026" stays whole
    return [s.strip()[:220] for s in parts if s.strip() and pat.search(s)]


def load_corpus(dirs):
    corpus = []
    for d in dirs:
        d = os.path.expanduser(d)
        paths = [d] if os.path.isfile(d) else [os.path.join(dp, fn) for dp, _, fns in os.walk(d) for fn in fns]
        for p in paths:
            if 'user-log' in p.replace('\\', '/').split('/') or not p.lower().endswith(TEXT_EXT):
                continue
            try:
                with open(p, encoding='utf-8', errors='replace') as f:
                    text = f.read()
            except OSError:
                continue
            digits = '|'.join(re.sub(r'\D', '', ln) for ln in text.splitlines())
            corpus.append((p, text, digits))
    return corpus


def finder(kind, val):
    """A function (text, digits) -> bool for where this fact would be written down."""
    if kind in ('phone', 'number', 'card?'):
        d = re.sub(r'\D', '', val)
        forms = {d, '0' + d[3:] if d.startswith('972') else d}
        return lambda text, digits: any(f and f in digits for f in forms)
    if kind == 'date':
        m = re.match(r'(\d{1,2})[./](\d{1,2})', val)
        if m:
            pat = re.compile(r'(?<!\d)0?%d[./]0?%d(?!\d)' % (int(m.group(1)), int(m.group(2))))
            return lambda text, digits: bool(pat.search(text))
        core = re.sub('^[בל]', '', val)
        return lambda text, digits: core in text
    if kind == 'time':
        h, mi = val.split(':')
        pat = re.compile(r'(?<!\d)0?%d[:.]%s(?!\d)' % (int(h), mi))
        return lambda text, digits: bool(pat.search(text))
    if kind in ('amount', 'percent'):
        num = re.search(r'\d[\d,.]*\d|\d', val).group(0)
        alts = {num, num.replace(',', '')}
        pats = [re.compile(r'(?<![\d.,])%s(?![\d])' % re.escape(a)) for a in alts]
        return lambda text, digits: any(p.search(text) for p in pats)
    low = val.lower()
    return lambda text, digits: low in text.lower()


def main():
    ap = argparse.ArgumentParser(description='Check that every fact Gilad gave is stored somewhere.')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--latest', action='store_true', help='this session = the newest log file')
    g.add_argument('--session', help='a session id (or its start)')
    g.add_argument('--today', action='store_true')
    g.add_argument('--day', help='YYYY-MM-DD')
    g.add_argument('--days', type=int, help='the last N days')
    ap.add_argument('--check', nargs='+', default=[], metavar='DIR', help='folders/files to look for each fact in')
    ap.add_argument('--out', help='write the report to this file (UTF-8)')
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    msgs = messages(pick_files(args))
    corpus = load_corpus(args.check) if args.check else None
    missing, found, unchecked, decisions, secrets = [], [], [], [], []
    seen = set()
    for rec in msgs:
        text, t = str(rec['text']), str(rec.get('t', ''))[5:16].replace('T', ' ')
        for s in sentences(text, SECRET):
            secrets.append('%s  "%s"' % (t, s))
        for kind, val in extract(text):
            key = (kind, re.sub(r'\D', '', val) if kind in ('phone', 'number', 'card?') else val)
            if key in seen:
                continue
            seen.add(key)
            if kind == 'card?':
                secrets.append('%s  a %d-digit number (card?) - "%s"' % (t, len(val), text[:80].strip()))
                continue
            ctx = re.sub(r'\s+', ' ', text)[:110]
            if corpus is None:
                unchecked.append('%s  %s %s - "%s"' % (t, kind, val, ctx))
                continue
            hit = finder(kind, val)
            where = next((p for p, tx, dg in corpus if hit(tx, dg)), None)
            if where:
                found.append('%s %s -> %s' % (kind, val, where))
            else:
                missing.append('%s  %s %s - "%s"' % (t, kind, val, ctx))
        for s in sentences(text, DECISION):
            decisions.append('%s  "%s"' % (t, s))
    total = len(missing) + len(found) + len(unchecked)
    out = ['# Fact sweep - %d message(s), %d fact(s): %d NOT FOUND, %d stored%s, %d decision sentence(s)' % (
        len(msgs), total, len(missing), len(found), (', %d unchecked' % len(unchecked)) if unchecked else '', len(decisions))]
    if secrets:
        out.append('\n## Secrets - do NOT copy into plain files; ask Gilad where they belong')
        out += ['- ' + s for s in secrets]
    if missing:
        out.append('\n## NOT FOUND - save each one in its right place (or skip it if it is not a fact)')
        out += ['- ' + s for s in missing]
    if decisions:
        out.append('\n## Decisions / standing requests - check each is saved')
        out += ['- ' + s for s in decisions]
    if unchecked:
        out.append('\n## Facts (not checked - pass --check <folders>)')
        out += ['- ' + s for s in unchecked]
    if found:
        out.append('\n## Stored')
        out += ['- ' + s for s in found]
    text = '\n'.join(out)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(text + '\n')
        print('wrote %s - %s' % (args.out, out[0][2:]))
    else:
        print(text)
    return 0


if __name__ == '__main__':
    sys.exit(main())
