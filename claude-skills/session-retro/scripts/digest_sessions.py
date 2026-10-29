#!/usr/bin/env python3
"""Turn Claude sessions into short digests for a retro - instead of reading raw transcripts.

  python -I digest_sessions.py --today [--since HH:MM] --out day-digest.md
        every local Claude Code session (~/.claude/projects/*/*.jsonl) touched today
  python -I digest_sessions.py FILE [FILE ...] --out digest.md
        given transcripts (.jsonl) or saved list_events results (claude-code-remote dumps)

A digest keeps what a retro needs: every user message (the gold), corrections, skills used,
actions repeated by hand, errors, tool counts, and the last assistant words.

Options: --exclude ID (skip a session id, e.g. the current one), --projects DIR,
         --max-user N (default 60), --user-chars N (default 400), --json
"""
import argparse
import datetime as dt
import glob
import json
import os
import re
import sys

CORRECTION = re.compile(
    r'(?<![א-ת])(?:לא נכון|טעית|אמרתי לך|כבר אמרתי|כבר ביקשתי|ביקשתי ש|לא ביקשתי|שוב|למה לא|לא ככה|לא זה)'
    r'(?![א-ת])|\b(?:wrong|i told you|that\'s not|not what i|again)\b', re.I)
REMINDER = re.compile(r'<system-reminder>.*?</system-reminder>', re.S)
COMMAND = re.compile(r'<command-name>\s*(/[^<\s]+)\s*</command-name>')
NOISE_TOOLS = {'ToolSearch', 'TaskCreate', 'TaskUpdate', 'TaskList', 'TaskGet', 'TodoWrite',
               'ReadNotifications', 'mcp__ccd_turn__update_plan', 'mcp__ccd_turn__wrap_up'}
PASSIVE = re.compile(r'action=(?:screenshot|wait|scroll|zoom)', re.I)


def signature(name, inp):
    if not isinstance(inp, dict):
        return name
    if name in ('Bash', 'PowerShell'):
        cmd = str(inp.get('command', '')).strip()
        cmd = re.sub(r'^(?:(?:cd\s+(?:"[^"]*"|\'[^\']*\'|\S+)|\w+=\S*)\s*(?:&&|;)?\s*)+', '', cmd)
        first = cmd.splitlines()[0] if cmd else ''
        return '%s: %s' % (name, ' '.join(first.split()[:3])[:70])
    if name in ('Read', 'Edit', 'Write', 'NotebookEdit'):
        p = str(inp.get('file_path') or inp.get('notebook_path') or '').replace('\\', '/')
        return '%s: %s' % (name, '/'.join(p.split('/')[-2:])[:70])
    if name in ('Grep', 'Glob'):
        return '%s: %s' % (name, str(inp.get('pattern', ''))[:50])
    if name == 'Skill':
        return 'Skill: %s' % inp.get('skill')
    for key in ('url', 'action', 'query', 'command'):
        if key in inp:
            val = str(inp[key])
            if key == 'url':
                m = re.match(r'https?://([^/?#]+)(/[^/?#]*)?', val)
                val = (m.group(1) + (m.group(2) or '')) if m else val
            return '%s: %s=%s' % (name, key, val[:60])
    return name


def clean_user_text(text):
    cmd = COMMAND.search(text)
    if cmd:
        return cmd.group(1)
    text = REMINDER.sub('', text).strip()
    if text.startswith('This session is being continued from a previous conversation'):
        return '(context was compacted)'
    if text.startswith(('<task-notification>', '<local-command', 'Caveat:', '[SYSTEM NOTIFICATION')):
        return ''
    return text


def hhmm(ts):
    if not ts:
        return '     '
    try:
        t = dt.datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
        return t.astimezone().strftime('%d.%m %H:%M')
    except ValueError:
        return str(ts)[:16]


class Session:
    def __init__(self, label):
        self.label, self.title, self.cwd = label, '', ''
        self.first = self.last = None
        self.user, self.assistant = [], []
        self.tools, self.sigs, self.errors, self.skills = {}, {}, [], []
        self.tool_names = {}

    def stamp(self, ts):
        if ts:
            self.first = self.first or ts
            self.last = ts

    def add_blocks(self, role, content, ts, synthetic=False):
        if isinstance(content, str):
            content = [{'type': 'text', 'text': content}]
        if not isinstance(content, list):
            return
        for b in content:
            if not isinstance(b, dict):
                continue
            t = b.get('type')
            if t == 'text' and role == 'user' and not synthetic:
                txt = clean_user_text(str(b.get('text', '')))
                if txt:
                    self.user.append((ts, txt))
                    if txt.startswith('/'):
                        self.skills.append(txt.split()[0])
            elif t == 'text' and role == 'assistant':
                txt = str(b.get('text', '')).strip()
                if txt:
                    self.assistant.append((ts, txt))
            elif t == 'tool_use':
                name = str(b.get('name', ''))
                self.tools[name] = self.tools.get(name, 0) + 1
                self.tool_names[b.get('id')] = name
                inp = b.get('input')
                if name == 'Skill' and isinstance(inp, dict):
                    self.skills.append(str(inp.get('skill')))
                if name not in NOISE_TOOLS:
                    sig = signature(name, inp)
                    if not PASSIVE.search(sig):
                        self.sigs[sig] = self.sigs.get(sig, 0) + 1
            elif t == 'tool_result':
                body = b.get('content')
                if isinstance(body, list):
                    body = ' '.join(str(x.get('text', '')) for x in body if isinstance(x, dict))
                body = str(body or '')
                if b.get('is_error') or re.match(r'\s*(?:Error|Exit code [1-9])', body):
                    name = self.tool_names.get(b.get('tool_use_id'), '?')
                    self.errors.append((ts, name, re.sub(r'\s+', ' ', body)[:160]))


def read_jsonl(path):
    s = Session(os.path.splitext(os.path.basename(path))[0])
    with open(path, encoding='utf-8', errors='replace') as f:
        for raw in f:
            try:
                rec = json.loads(raw)
            except ValueError:
                continue
            if not isinstance(rec, dict):
                continue
            typ = rec.get('type')
            if typ == 'ai-title' and rec.get('aiTitle'):
                s.title = rec['aiTitle']
            elif typ == 'summary' and rec.get('summary') and not s.title:
                s.title = rec['summary']
            if typ not in ('user', 'assistant') or rec.get('isSidechain'):
                continue
            ts = rec.get('timestamp')
            s.stamp(ts)
            s.cwd = s.cwd or rec.get('cwd', '')
            msg = rec.get('message') or {}
            s.add_blocks(typ, msg.get('content'), ts, synthetic=bool(rec.get('isMeta')))
    return s


def find_events(obj):
    """The list of events inside a list_events result, whatever the wrapper."""
    if isinstance(obj, list):
        return obj
    if isinstance(obj, dict):
        for key in ('ccr', 'result', 'response'):
            if isinstance(obj.get(key), (dict, list)):
                return find_events(obj[key])
        for key in ('data', 'events', 'items'):
            if isinstance(obj.get(key), list):
                return obj[key]
    return []


def find_message(node, depth=0):
    """(role, content, synthetic) of the innermost {role, content} message in an event."""
    if not isinstance(node, dict) or depth > 6:
        return None
    if node.get('role') in ('user', 'assistant') and 'content' in node:
        return node['role'], node['content'], False
    for key, val in node.items():
        if isinstance(val, dict):
            found = find_message(val, depth + 1)
            if found:
                syn = bool(node.get('isSynthetic') or node.get('isMeta') or found[2])
                return found[0], found[1], syn
    return None


def read_dump(path):
    with open(path, encoding='utf-8', errors='replace') as f:
        text = f.read()
    obj = None
    for line in text.splitlines():
        line = line.strip()
        if line.startswith(('{', '[')):
            try:
                obj = json.loads(line)
                break
            except ValueError:
                continue
    if obj is None:
        try:
            obj = json.loads(text[text.find('{'):text.rfind('}') + 1])
        except ValueError:
            return None
    s = Session(os.path.basename(path))
    for ev in sorted(find_events(obj), key=lambda e: str(e.get('created_at', '')) if isinstance(e, dict) else ''):
        if not isinstance(ev, dict):
            continue
        found = find_message(ev)
        if not found:
            continue
        ts = ev.get('created_at') or ev.get('timestamp')
        s.stamp(ts)
        s.add_blocks(found[0], found[1], ts, synthetic=found[2])
    return s


def render(s, idx, max_user, user_chars):
    out = []
    head = s.title or (s.user[0][1][:60] if s.user else s.label)
    n_tools = sum(s.tools.values())
    out.append('=== [%d] %s  |  %s -> %s' % (idx, head, hhmm(s.first), hhmm(s.last)))
    out.append('id: %s%s' % (s.label, ('  |  cwd: %s' % s.cwd) if s.cwd else ''))
    out.append('user msgs: %d | assistant texts: %d | tool calls: %d | errors: %d' % (
        len(s.user), len(s.assistant), n_tools, len(s.errors)))
    if s.skills:
        seen = []
        for k in s.skills:
            if k not in seen:
                seen.append(k)
        out.append('skills used: ' + ', '.join(seen))
    users = s.user
    if len(users) > max_user:
        head_n = max_user // 4
        users = users[:head_n] + [(None, '... %d messages omitted ...' % (len(s.user) - max_user))] + users[-(max_user - head_n):]
    out.append('USER:')
    for ts, txt in users:
        one = re.sub(r'\s+', ' ', txt)
        out.append('  %s  %s' % (hhmm(ts), one[:user_chars] + ('...' if len(one) > user_chars else '')))
    fixes = [(ts, t) for ts, t in s.user if CORRECTION.search(t)]
    if fixes:
        out.append('CORRECTIONS / REPEATS (%d): ' % len(fixes) + ' | '.join(
            '%s "%s"' % (hhmm(ts)[-5:], re.sub(r'\s+', ' ', t)[:80]) for ts, t in fixes[:6]))
    reps = sorted(((c, k) for k, c in s.sigs.items() if c >= 3), reverse=True)[:8]
    if reps:
        out.append('DONE 3+ TIMES: ' + ' | '.join('%s x%d' % (k, c) for c, k in reps))
    if s.errors:
        out.append('ERRORS (first 5 of %d): ' % len(s.errors) + ' | '.join(
            '%s %s: %s' % (hhmm(ts)[-5:], n, b[:90]) for ts, n, b in s.errors[:5]))
    top = sorted(((c, k) for k, c in s.tools.items()), reverse=True)[:8]
    if top:
        out.append('TOOLS: ' + ', '.join('%s x%d' % (k, c) for c, k in top))
    if s.assistant:
        last = re.sub(r'\s+', ' ', s.assistant[-1][1])
        out.append('LAST ASSISTANT: ' + last[:300] + ('...' if len(last) > 300 else ''))
    return '\n'.join(out)


def today_files(projects, since):
    now = dt.datetime.now()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    if since:
        h, m = (int(x) for x in since.split(':'))
        start = start.replace(hour=h, minute=m)
    cut = start.timestamp()
    files = [p for p in glob.glob(os.path.join(projects, '*', '*.jsonl')) if os.path.getmtime(p) >= cut]
    return sorted(files, key=os.path.getmtime)


def main():
    ap = argparse.ArgumentParser(description='Digest Claude sessions for a retro.')
    ap.add_argument('files', nargs='*', help='.jsonl transcripts or saved list_events results')
    ap.add_argument('--today', action='store_true', help='all local sessions touched today')
    ap.add_argument('--since', help='with --today: start time HH:MM instead of 00:00')
    ap.add_argument('--projects', help='Claude projects folder (default ~/.claude/projects)')
    ap.add_argument('--exclude', action='append', default=[], help='session id to skip (repeatable)')
    ap.add_argument('--max-user', type=int, default=60)
    ap.add_argument('--user-chars', type=int, default=400)
    ap.add_argument('--json', action='store_true', help='machine-readable output')
    ap.add_argument('--out', help='write the digest to this file (UTF-8)')
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    base = os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')
    files = list(args.files)
    if args.today:
        files += today_files(args.projects or os.path.join(base, 'projects'), args.since)
    if not files:
        ap.print_usage(sys.stderr)
        return 2
    sessions = []
    for p in files:
        if any(x and x in os.path.basename(p) for x in args.exclude):
            continue
        try:
            s = read_jsonl(p) if p.endswith('.jsonl') else read_dump(p)
        except OSError as exc:
            sys.stderr.write('skip %s: %s\n' % (p, exc))
            continue
        if s and (s.user or s.tools):
            sessions.append(s)
    if args.json:
        text = json.dumps([{
            'id': s.label, 'title': s.title, 'cwd': s.cwd, 'first': s.first, 'last': s.last,
            'user': [t for _, t in s.user], 'skills': s.skills, 'tools': s.tools,
            'repeats': {k: c for k, c in s.sigs.items() if c >= 3},
            'errors': [{'tool': n, 'text': b} for _, n, b in s.errors],
        } for s in sessions], ensure_ascii=False, indent=1)
    else:
        parts = ['# Session digests - %d session(s)' % len(sessions)]
        parts += [render(s, i + 1, args.max_user, args.user_chars) for i, s in enumerate(sessions)]
        text = '\n\n'.join(parts)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(text + '\n')
        print('wrote %s - %d session(s), %d chars' % (args.out, len(sessions), len(text)))
    else:
        print(text)
    return 0


if __name__ == '__main__':
    sys.exit(main())
