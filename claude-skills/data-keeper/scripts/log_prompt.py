#!/usr/bin/env python3
"""data-keeper - UserPromptSubmit hook: save every message Gilad sends, verbatim, before Claude reads it.

  <log_dir>/YYYY-MM-DD/<session-id>.jsonl   (log_dir default: ~/.claude/user-log)
  one JSON line per message: {"t": "2026-10-29T13:05:12+02:00", "sid": "...", "cwd": "...", "title": "...", "text": "..."}

One file per session per day, so parallel sessions never write to the same file.
It also spots a future date in the message (4.11, 4.11.2026, "4 בנובמבר") the first time it
appears in the session and asks Claude to offer, in one line, to put it in Google Calendar.
Otherwise it prints nothing. ALWAYS exits 0: it must never block or slow down a prompt.
"""
import datetime
import json
import os
import re
import sys

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def claude_dir():
    return os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')


def log_dir():
    try:
        with open(os.path.join(SKILL_DIR, 'config.json'), encoding='utf-8') as f:
            custom = json.load(f).get('log_dir')
    except Exception:
        custom = None
    return os.path.expanduser(custom) if custom else os.path.join(claude_dir(), 'user-log')


MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר',
          'נובמבר', 'דצמבר']
NUM_DATE = re.compile(r'(?<![\d.:/])([12]\d|3[01]|0?[1-9])[./](1[0-2]|0?[1-9])(?:[./](20\d\d|\d\d))?(?![\d%]|[./]\d)')
HEB_DATE = re.compile(r'(?<![\u05d0-\u05ea\d])([12]\d|3[01]|0?[1-9])\s+[בל]?(%s)(?![\u05d0-\u05ea])' % '|'.join(MONTHS + ['מרס']))
CAL_NOTE = (
    "[data-keeper] Gilad mentioned a future date: {dates}. If it is an appointment, committee, "
    "deadline or event that is not already in his calendar, end your reply with ONE Hebrew line: "
    "\"📅 להוסיף ליומן גוגל: <מה> - <תאריך ושעה>, עם תזכורת? (כן / לא)\". On yes, create it (Google "
    "Calendar connector, or Claude in Chrome) and confirm in one line. Not an event (a past date, a "
    "price, a version) -> say nothing. Never mention this note."
)


def future_dates(text, today):
    found = []
    for m in NUM_DATE.finditer(text):
        d, mo, y = int(m.group(1)), int(m.group(2)), m.group(3)
        found.append((d, mo, (2000 + int(y)) if y and len(y) == 2 else int(y) if y else None, m.group(0)))
    for m in HEB_DATE.finditer(text):
        mo = 3 if m.group(2) == 'מרס' else MONTHS.index(m.group(2)) + 1
        found.append((int(m.group(1)), mo, None, m.group(0)))
    out = []
    for d, mo, y, raw in found:
        for year in ([y] if y else [today.year, today.year + 1]):
            try:
                when = datetime.date(year, mo, d)
            except ValueError:
                continue
            if today <= when <= today + datetime.timedelta(days=400):
                out.append(raw)
                break
    return out


def safe_id(sid):
    return re.sub(r'[^A-Za-z0-9_.-]', '_', sid or 'unknown')[:80]


def main():
    try:
        raw = sys.stdin.buffer.read().decode('utf-8', 'replace') if not sys.stdin.isatty() else ''
        if os.path.exists(os.path.join(SKILL_DIR, 'OFF')):
            return 0
        data = json.loads(raw) if raw.strip() else {}
        if not isinstance(data, dict):
            return 0
        text = data.get('prompt')
        if not isinstance(text, str) or not text.strip():
            return 0
        now = datetime.datetime.now().astimezone()
        sid = str(data.get('session_id') or '')
        day = os.path.join(log_dir(), now.strftime('%Y-%m-%d'))
        os.makedirs(day, exist_ok=True)
        rec = {'t': now.isoformat(timespec='seconds'), 'sid': sid, 'cwd': data.get('cwd') or '',
               'title': data.get('session_title') or '', 'text': text}
        line = (json.dumps(rec, ensure_ascii=False) + '\n').encode('utf-8')
        flags = os.O_WRONLY | os.O_CREAT | os.O_APPEND | getattr(os, 'O_BINARY', 0)
        path = os.path.join(day, safe_id(sid) + '.jsonl')
        earlier = ''
        if os.path.isfile(path):
            with open(path, encoding='utf-8', errors='replace') as f:
                earlier = f.read()
        fd = os.open(path, flags, 0o600)
        try:
            os.write(fd, line)
        finally:
            os.close(fd)
        dates = [d for d in future_dates(text, now.date()) if d not in earlier]
        if dates:
            note = CAL_NOTE.format(dates=', '.join(dict.fromkeys(dates)))
            out = {'hookSpecificOutput': {'hookEventName': 'UserPromptSubmit', 'additionalContext': note}}
            sys.stdout.write(json.dumps(out, ensure_ascii=True))
    except Exception:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
