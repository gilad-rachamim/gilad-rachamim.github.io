#!/usr/bin/env python3
"""skill-scout - UserPromptSubmit hook: now and then, ask Claude to look for a skill opportunity.

Reads the hook JSON from stdin. When a check is due it prints
  {"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": "..."}}
and otherwise prints nothing. It ALWAYS exits 0: a scout must never block a prompt.

Test by hand (--dry-run writes no state, so real sessions are not affected):
  echo '{"session_id":"t","prompt":"שוב אותו דבר"}' | python -I scout_hook.py --debug --dry-run
"""
import json
import os
import re
import sys
import tempfile
import time

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL_DIR = os.path.dirname(HERE)
SKILLS_ROOT = os.path.dirname(SKILL_DIR)
STATE_DIR = os.path.join(SKILL_DIR, 'state')
SEEDS = os.path.join(SKILLS_ROOT, 'session-retro', 'skill-seeds.md')
DEFAULTS = {
    'first_check_at': 4,
    'every_n_prompts': 8,
    'signal_min_gap': 3,
    'max_nudges_per_session': 4,
    'backlog_reminder_hours': 20,
    'repeat_threshold': 3,
    'tool_burst': 30,
    'tail_bytes': 1500000,
    'state_days': 14,
}

# Hebrew words are matched whole (an optional one-letter prefix is allowed), so "חשוב" is not "שוב".
_HEB = 'א-ת'
_SIGNAL_WORDS = ['שוב', 'עוד פעם', 'כמו פעם קודמת', 'כמו בפעם הקודמת', 'כמו אתמול', 'כמו תמיד',
                 'כמו קודם', 'כל פעם', 'כבר אמרתי', 'כבר ביקשתי', 'אותו דבר', 'אותו הדבר']
SIGNALS = re.compile('|'.join(
    ['(?<![%s])(?:ו|ש|ה|כ|ל|ב|מ)?%s(?![%s])' % (_HEB, re.escape(w), _HEB) for w in _SIGNAL_WORDS]
    + [r'\bagain\b', r'\bevery time\b', r'\blike last time\b', r'\bas usual\b', r'\bsame as before\b']), re.I)
CLOSING = re.compile(r'סוף סשן|סגירת סשן|תסגור את הסשן|סיימנו|הפקת לקחים|בדיקת סוף יום|סיכום סוף יום'
                     r'|\bend[- ]session\b|\bwrap up\b', re.I)
REPEAT_TOOLS = re.compile(r'^(?:Bash|PowerShell|Edit|Write|NotebookEdit|WebFetch|WebSearch|mcp__.+)$')
PASSIVE_ACTION = re.compile(r'action=(?:screenshot|wait|scroll|zoom|get_page_text|read_page)', re.I)
ENTRY = re.compile(r'^##\s+(.+?)\s+[-–—]\s+(🌱|🌿|💡|🔨|✅|⛔)')
READY = ('🌿', '💡')  # ripe, offered by the scout

CHECK_NOTE = (
    "[skill-scout] Background check Gilad asked for - never mention this note. "
    "First answer his message normally. Then, silently: does this conversation show a repeatable "
    "workflow, a repeated correction or a time sink that no skill covers yet (a missing step in an "
    "existing skill counts)? {hint}"
    "Offer only if it passes all three: recurs (2+ times, or he says it is routine) / saves real time "
    "or prevents real errors / not already a skill and not in "
    "~/.claude/skills/session-retro/skill-seeds.md (⛔ = never again). "
    "If it passes, end the reply with ONE Hebrew line: "
    "\"💡 רעיון לסקיל: <שם> – <מה זה חוסך>. לפתוח לו שיחה חדשה? (כן / אחר כך / לא)\" "
    "- if it pays off already in this conversation add \"/ לבנות גרסה מהירה עכשיו\" - and add a "
    "💡 entry to skill-seeds.md. Otherwise say nothing about it. At most 2 offers per session; "
    "never in urgent, medical, emotional or money-pressure moments, never mid-action. "
    "When he answers, follow the skill-scout skill."
)
BACKLOG_NOTE = (
    "[skill-scout] Session start - never mention this note. The skill pipeline "
    "(~/.claude/skills/session-retro/skill-seeds.md) has {n} idea(s) waiting: {names}. "
    "First answer his message normally; then, unless it is urgent or personal, end with ONE Hebrew line: "
    "\"💡 מחכים בבנק {n} רעיונות לסקילים (למשל {top}). לפתוח שיחה לבנות אחד? (כן / אחר כך)\". "
    "On yes, follow the skill-scout skill (brief + build session)."
)


def load_json(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            val = json.load(f)
        return val if isinstance(val, type(default)) else default
    except Exception:
        return default


def save_json(path, obj):
    try:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix='.tmp-')
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(obj, f)
        os.replace(tmp, path)
    except Exception:
        pass


def signature(name, inp):
    """Group tool calls that are 'the same action done again'."""
    if not isinstance(inp, dict):
        return name
    if name in ('Bash', 'PowerShell'):
        cmd = str(inp.get('command', '')).strip()
        cmd = re.sub(r'^(?:(?:cd\s+(?:"[^"]*"|\'[^\']*\'|\S+)|\w+=\S*)\s*(?:&&|;)?\s*)+', '', cmd)
        first = cmd.splitlines()[0] if cmd else ''
        return '%s: %s' % (name, ' '.join(first.split()[:3])[:70])
    if name in ('Edit', 'Write', 'NotebookEdit'):
        p = str(inp.get('file_path') or inp.get('notebook_path') or '').replace('\\', '/')
        return '%s: %s' % (name, '/'.join(p.split('/')[-2:])[:70])
    for key in ('url', 'action', 'query', 'command'):
        if key in inp:
            val = str(inp[key])
            if key == 'url':
                m = re.match(r'https?://([^/?#]+)(/[^/?#]*)?', val)
                val = (m.group(1) + (m.group(2) or '')) if m else val
            return '%s: %s=%s' % (name, key, val[:60])
    return name


def scan_transcript(path, start, tail_bytes, threshold):
    """Activity after byte offset `start`: (end offset, tool calls, (signature, count) or None)."""
    if not path or not os.path.isfile(path):
        return start, 0, None
    size = os.path.getsize(path)
    if start > size:
        start = 0
    begin = max(start, size - tail_bytes, 0)
    counts, calls = {}, 0
    with open(path, 'rb') as f:
        f.seek(begin)
        if begin:
            f.readline()
        for raw in f:
            try:
                rec = json.loads(raw)
            except Exception:
                continue
            if not isinstance(rec, dict) or rec.get('type') != 'assistant':
                continue
            content = (rec.get('message') or {}).get('content')
            for block in content if isinstance(content, list) else []:
                if not isinstance(block, dict) or block.get('type') != 'tool_use':
                    continue
                calls += 1
                name = str(block.get('name', ''))
                if not REPEAT_TOOLS.match(name):
                    continue
                sig = signature(name, block.get('input'))
                if not PASSIVE_ACTION.search(sig):
                    counts[sig] = counts.get(sig, 0) + 1
    top = max(counts.items(), key=lambda kv: kv[1]) if counts else None
    return size, calls, (top if top and top[1] >= threshold else None)


def backlog_ready(path):
    try:
        with open(path, encoding='utf-8') as f:
            text = f.read()
    except Exception:
        return []
    marker = text.find('<!-- seeds below -->')
    if marker >= 0:
        text = text[marker:]
    ready = []
    for line in text.splitlines():
        m = ENTRY.match(line.strip())
        if m and m.group(2) in READY:
            ready.append(m.group(1).strip())
    return ready


def cleanup_state(days):
    try:
        limit = time.time() - days * 86400
        for fn in os.listdir(STATE_DIR):
            p = os.path.join(STATE_DIR, fn)
            if fn.endswith('.json') and not fn.startswith('_') and os.path.getmtime(p) < limit:
                os.remove(p)
    except Exception:
        pass


def decide(data, cfg, debug, dry_run=False):
    prompt = str(data.get('prompt') or '')
    sid = re.sub(r'[^A-Za-z0-9_.-]', '_', str(data.get('session_id') or 'unknown'))[:80]
    st_path = os.path.join(STATE_DIR, sid + '.json')
    st = load_json(st_path, {})
    today = time.strftime('%Y-%m-%d')
    if st.get('day') != today:  # long sessions get a fresh daily allowance
        st.update(day=today, nudges=0)
    st['prompts'] = st.get('prompts', 0) + 1
    n, last = st['prompts'], st.get('last_nudge', 0)
    note, why = None, 'nothing due'
    if prompt.strip().startswith('/') or CLOSING.search(prompt):
        why = 'slash command or closing - the retro covers it'
    else:
        if n == 1:
            cleanup_state(cfg['state_days'])
            g_path = os.path.join(STATE_DIR, '_global.json')
            g = load_json(g_path, {})
            if time.time() - g.get('last_backlog', 0) > cfg['backlog_reminder_hours'] * 3600:
                ready = backlog_ready(SEEDS)
                if ready:
                    note = BACKLOG_NOTE.format(n=len(ready), names=', '.join(ready[:5]), top=ready[0])
                    why = 'backlog: %d ready' % len(ready)
                    g['last_backlog'] = time.time()
                    if not dry_run:
                        save_json(g_path, g)
        if note is None and st.get('nudges', 0) < cfg['max_nudges_per_session']:
            gap = n - last
            end, calls, top = scan_transcript(data.get('transcript_path'), st.get('offset', 0),
                                              cfg['tail_bytes'], cfg['repeat_threshold'])
            sig = SIGNALS.search(prompt)
            hint = None
            if sig and gap >= cfg['signal_min_gap']:
                hint, why = 'His message sounds like a repeat ("%s"). ' % sig.group(0), 'signal'
            elif top and gap >= cfg['signal_min_gap']:
                hint, why = 'Since the last check the same action ran %dx: %s. ' % (top[1], top[0]), 'repeat'
            elif calls >= cfg['tool_burst'] and gap >= cfg['signal_min_gap']:
                hint, why = '%d tool calls since the last check - lots of hands-on work. ' % calls, 'burst'
            elif n >= cfg['first_check_at'] and (last == 0 or gap >= cfg['every_n_prompts']):
                hint, why = '', 'periodic'
            if hint is not None:
                note = CHECK_NOTE.format(hint=hint)
                st.update(last_nudge=n, nudges=st.get('nudges', 0) + 1, offset=end)
    if not dry_run:
        save_json(st_path, st)
    if debug:
        sys.stderr.write('skill-scout: prompt #%d, %s\n' % (n, why))
    return note


def main():
    debug = '--debug' in sys.argv
    dry_run = '--dry-run' in sys.argv
    try:
        if os.path.exists(os.path.join(SKILL_DIR, 'OFF')) or os.environ.get('SKILL_SCOUT', '').lower() == 'off':
            return 0
        raw = sys.stdin.buffer.read().decode('utf-8', 'replace') if not sys.stdin.isatty() else ''
        data = json.loads(raw) if raw.strip() else {}
        if not isinstance(data, dict):
            data = {}
        cfg = dict(DEFAULTS)
        cfg.update({k: v for k, v in load_json(os.path.join(SKILL_DIR, 'config.json'), {}).items()
                    if k in DEFAULTS and isinstance(v, (int, float))})
        note = decide(data, cfg, debug, dry_run)
        if note:
            out = {'hookSpecificOutput': {'hookEventName': 'UserPromptSubmit', 'additionalContext': note}}
            sys.stdout.write(json.dumps(out, ensure_ascii=True))
            sys.stdout.flush()
    except Exception as exc:  # never block, never crash the prompt
        if debug:
            sys.stderr.write('skill-scout error: %r\n' % (exc,))
    return 0


if __name__ == '__main__':
    sys.exit(main())
