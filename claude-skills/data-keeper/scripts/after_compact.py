#!/usr/bin/env python3
"""data-keeper - SessionStart hook (matcher "compact"): after a compaction, give Claude back
Gilad's own words from this session, verbatim, so no fact he gave is lost to the summary.

Prints {"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "..."}} or
nothing, and ALWAYS exits 0. Keeps the first message (the task) plus the newest ones that fit
in `reinject_chars` (config.json, default 9000 - Claude Code caps hook context at 10,000).
"""
import glob
import json
import os
import re
import sys

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PER_MESSAGE = 1200
HEADER = (
    "[data-keeper] This conversation was just compacted. Below are Gilad's own messages from this "
    "session, verbatim (oldest first; the first one is the task). Every fact, number, name, date and "
    "decision in them is critical: keep using them and never ask him again for something stated here. "
    "Do not mention this note."
)


def claude_dir():
    return os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')


def config():
    try:
        with open(os.path.join(SKILL_DIR, 'config.json'), encoding='utf-8') as f:
            cfg = json.load(f)
        return cfg if isinstance(cfg, dict) else {}
    except Exception:
        return {}


def fmt(rec):
    t = str(rec.get('t', ''))[11:16]
    text = str(rec.get('text', '')).strip()
    if len(text) > PER_MESSAGE:
        text = text[:PER_MESSAGE] + ' ...(cut here - the full text is in the log)'
    return '[%s] %s' % (t, text)


def main():
    try:
        raw = sys.stdin.buffer.read().decode('utf-8', 'replace') if not sys.stdin.isatty() else ''
        if os.path.exists(os.path.join(SKILL_DIR, 'OFF')):
            return 0
        data = json.loads(raw) if raw.strip() else {}
        if not isinstance(data, dict) or data.get('source', 'compact') != 'compact':
            return 0
        sid = str(data.get('session_id') or '')
        if not sid:
            return 0
        cfg = config()
        root = os.path.expanduser(cfg.get('log_dir') or '') or os.path.join(claude_dir(), 'user-log')
        budget = int(cfg.get('reinject_chars') or 9000)
        safe = re.sub(r'[^A-Za-z0-9_.-]', '_', sid)[:80]
        msgs = []
        for path in sorted(glob.glob(os.path.join(root, '*', safe + '.jsonl'))):
            with open(path, encoding='utf-8', errors='replace') as f:
                for line in f:
                    try:
                        rec = json.loads(line)
                    except ValueError:
                        continue
                    if isinstance(rec, dict) and str(rec.get('text', '')).strip():
                        msgs.append(rec)
        if not msgs:
            return 0
        msgs.sort(key=lambda r: str(r.get('t', '')))
        first, rest = fmt(msgs[0]), [fmt(r) for r in msgs[1:]]
        used = len(HEADER) + len(first) + 200
        chosen = []
        for s in reversed(rest):
            if used + len(s) + 1 > budget:
                break
            chosen.append(s)
            used += len(s) + 1
        chosen.reverse()
        lines = [HEADER, first]
        skipped = len(rest) - len(chosen)
        if skipped:
            lines.append('... %d earlier message(s) not shown here - read them with: '
                         'python -I ~/.claude/skills/data-keeper/scripts/recall.py --session %s' % (skipped, sid))
        lines += chosen
        out = {'hookSpecificOutput': {'hookEventName': 'SessionStart', 'additionalContext': '\n'.join(lines)}}
        sys.stdout.write(json.dumps(out, ensure_ascii=True))
        sys.stdout.flush()
    except Exception:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main())
