#!/usr/bin/env python3
"""Find anything Gilad ever said - search the data-keeper log, and optionally .md/.txt folders.

  python -I recall.py "<words>" [--days N] [--also DIR ...] [--limit 30] [--out FILE]
  python -I recall.py --day YYYY-MM-DD [--out FILE]        a whole day, in order
  python -I recall.py --session <id> [--out FILE]          a whole session, in order

All words must appear (in any order). A Hebrew word also matches with a one-letter prefix
(ו ה ב ל מ ש כ), and digits match across dashes and spaces (0501234567 = 050-123-4567).
Newest first. Write to --out on Windows - the console garbles Hebrew.
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


def claude_dir():
    return os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')


def log_root():
    try:
        with open(os.path.join(SKILL_DIR, 'config.json'), encoding='utf-8') as f:
            custom = json.load(f).get('log_dir')
    except Exception:
        custom = None
    return os.path.expanduser(custom) if custom else os.path.join(claude_dir(), 'user-log')


def matcher(words):
    """Return a function text -> bool that is true when every word matches."""
    tests = []
    for w in words:
        digits = re.sub(r'[\s-]', '', w)
        if digits.isdigit() and len(digits) >= 4:
            tests.append(lambda text, d=digits: d in re.sub(r'[\s-]', '', text))
        elif re.search('[%s]' % HEB, w):
            pat = re.compile('(?<![%s])(?:[והבלמשכ]{0,2})%s' % (HEB, re.escape(w)))
            tests.append(lambda text, p=pat: bool(p.search(text)))
        else:
            tests.append(lambda text, lw=w.lower(): lw in text.lower())
    return lambda text: all(t(text) for t in tests)


def read_log(days=None):
    root = log_root()
    cut = None
    if days:
        cut = (dt.date.today() - dt.timedelta(days=days - 1)).isoformat()
    out = []
    for path in glob.glob(os.path.join(root, '*', '*.jsonl')):
        day = os.path.basename(os.path.dirname(path))
        if cut and day < cut:
            continue
        with open(path, encoding='utf-8', errors='replace') as f:
            for line in f:
                try:
                    rec = json.loads(line)
                except ValueError:
                    continue
                if isinstance(rec, dict) and rec.get('text'):
                    out.append(rec)
    return out


def snippet(text, words, width=320):
    flat = re.sub(r'\s+', ' ', text).strip()
    if len(flat) <= width:
        return flat
    pos = 0
    for w in words:
        i = flat.find(w)
        if i >= 0:
            pos = i
            break
    start = max(0, pos - width // 3)
    return ('...' if start else '') + flat[start:start + width] + '...'


def where(rec):
    folder = os.path.basename(str(rec.get('cwd', '')).rstrip('/\\')) or '-'
    return '%s %s | %s | %s' % (str(rec.get('t', ''))[:10], str(rec.get('t', ''))[11:16],
                                rec.get('title') or folder, str(rec.get('sid', ''))[:8])


def search_files(dirs, ok, words, limit):
    hits = []
    for d in dirs:
        for dirpath, _, files in os.walk(os.path.expanduser(d)):
            if 'user-log' in dirpath:
                continue
            for fn in files:
                if not fn.endswith(('.md', '.txt')):
                    continue
                p = os.path.join(dirpath, fn)
                try:
                    with open(p, encoding='utf-8', errors='replace') as f:
                        paras = re.split(r'\n\s*\n', f.read())
                except OSError:
                    continue
                for para in paras:
                    if ok(para):
                        hits.append((os.path.getmtime(p), p, snippet(para, words)))
    hits.sort(reverse=True)
    return hits[:limit]


def main():
    ap = argparse.ArgumentParser(description="Search everything Gilad said (data-keeper log).")
    ap.add_argument('words', nargs='*')
    ap.add_argument('--days', type=int, help='only the last N days')
    ap.add_argument('--also', nargs='+', default=[], metavar='DIR', help='also search .md/.txt files here')
    ap.add_argument('--day', help='print one whole day (YYYY-MM-DD)')
    ap.add_argument('--session', help='print one whole session (id or its start)')
    ap.add_argument('--limit', type=int, default=30)
    ap.add_argument('--out', help='write the result to this file (UTF-8)')
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    lines = []
    if args.day or args.session:
        recs = read_log()
        if args.day:
            recs = [r for r in recs if str(r.get('t', '')).startswith(args.day)]
        if args.session:
            recs = [r for r in recs if str(r.get('sid', '')).startswith(args.session)]
        recs.sort(key=lambda r: str(r.get('t', '')))
        lines.append('# %d message(s)' % len(recs))
        for r in recs:
            lines.append('\n## %s\n%s' % (where(r), r['text']))
    elif args.words:
        ok = matcher(args.words)
        recs = sorted((r for r in read_log(args.days) if ok(r['text'])), key=lambda r: str(r.get('t', '')), reverse=True)
        lines.append('# "%s" - %d message(s) in the log%s' % (' '.join(args.words), len(recs),
                                                           ' (showing %d)' % args.limit if len(recs) > args.limit else ''))
        for r in recs[:args.limit]:
            lines.append('- %s\n  %s' % (where(r), snippet(r['text'], args.words)))
        if args.also:
            hits = search_files(args.also, ok, args.words, args.limit)
            lines.append('\n# In files: %d match(es)' % len(hits))
            for _, p, snip in hits:
                lines.append('- %s\n  %s' % (p, snip))
    else:
        ap.print_usage(sys.stderr)
        return 2
    text = '\n'.join(lines)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(text + '\n')
        print('wrote %s (%d lines)' % (args.out, len(lines)))
    else:
        print(text)
    return 0


if __name__ == '__main__':
    sys.exit(main())
