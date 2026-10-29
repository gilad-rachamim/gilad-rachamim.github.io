#!/usr/bin/env python3
"""data-keeper - UserPromptSubmit hook: save every message Gilad sends, verbatim, before Claude reads it.

  <log_dir>/YYYY-MM-DD/<session-id>.jsonl   (log_dir default: ~/.claude/user-log)
  one JSON line per message: {"t": "2026-10-29T13:05:12+02:00", "sid": "...", "cwd": "...", "title": "...", "text": "..."}

One file per session per day, so parallel sessions never write to the same file.
Prints nothing and ALWAYS exits 0: the log must never block or slow down a prompt.
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
        fd = os.open(os.path.join(day, safe_id(sid) + '.jsonl'), flags, 0o600)
        try:
            os.write(fd, line)
        finally:
            os.close(fd)
    except Exception:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
