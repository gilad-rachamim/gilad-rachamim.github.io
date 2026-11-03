#!/usr/bin/env python3
"""Lint Claude Code skills against the skill-forge quality bar.

  python -I lint_skill.py <skill-dir | SKILL.md> [...]   lint one or more skills
  python -I lint_skill.py --all                           lint every skill under the root
  python -I lint_skill.py --list                          every skill with its description
  python -I lint_skill.py --similar "<draft text>"        rank skills by overlap with a draft
  python -I lint_skill.py --budget                        what the skill listing costs per session

Options:
  --root DIR   skills root (default: $CLAUDE_CONFIG_DIR/skills, else ~/.claude/skills)
  --out FILE   also write the report to FILE as UTF-8 (handy on Windows consoles)

Exit code: 0 = no errors (warnings allowed), 1 = errors found, 2 = bad usage.
"""
import argparse
import os
import re
import sys

HEB = re.compile(r'[֐-׿]')
NAME_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
SECRET_PATTERNS = [
    (r'\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}', 'an API key (sk-...)'),
    (r'\bghp_[A-Za-z0-9]{30,}', 'a GitHub token (ghp_...)'),
    (r'\bgithub_pat_[A-Za-z0-9_]{30,}', 'a GitHub token (github_pat_...)'),
    (r'\bAKIA[0-9A-Z]{16}\b', 'an AWS access key'),
    (r'\bAIza[0-9A-Za-z_-]{35}\b', 'a Google API key'),
    (r'\b\d{8,10}:AA[0-9A-Za-z_-]{30,}\b', 'a Telegram bot token'),
    (r'-----BEGIN [A-Z ]*PRIVATE KEY-----', 'a private key'),
    (r'\bxox[baprs]-[A-Za-z0-9-]{10,}', 'a Slack token'),
]
USER_PATH = re.compile(r'[A-Za-z]:[\\/]+Users[\\/]+[^\\/\s`"\'*<>]+|/c/Users/[^/\s`"\'*<>]+')
FIXED_WAIT = re.compile(r'\bsleep\s+\d|Start-Sleep|\bwait\s*~?\s*\d+\s*(?:s|sec|secs|seconds)\b', re.I)
VERIFY = re.compile(r'\b(?:verify|verified|check|checks|confirm|make sure|validate)\b|לוודא|וידוא|אימות|בדוק', re.I)
LOCAL_REF = re.compile(r'(?<![\w/~.-])((?:scripts|references|templates|assets|examples)/[\w./-]*\w\.\w+)')
SKILL_REF = re.compile(r'~/\.claude/skills/([\w-]+)/([\w./-]*\w\.\w+)')
STOP = set((
    'the a an and or of to in on for with by from as at is are be this that it its use used '
    'when user says skill skills not run runs also any all into via per one each only then '
    'than what how his her their your you can will must after before about over under '
    'trigger hebrew english gilad claude'
).split()) | set('של את על עם זה זו לא גם או אם כל מה כמו יש אין אני אתה הוא היא'.split())


def skills_root(arg):
    if arg:
        return os.path.abspath(os.path.expanduser(arg))
    base = os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')
    return os.path.join(base, 'skills')


def split_frontmatter(text):
    """Return (frontmatter lines or None, body text, number of frontmatter lines)."""
    if text.startswith('﻿'):
        text = text[1:]
    lines = text.splitlines()
    if not lines or lines[0].strip() != '---':
        return None, text, 0
    for i in range(1, len(lines)):
        if lines[i].strip() == '---':
            return lines[1:i], '\n'.join(lines[i + 1:]), i + 1
    return None, text, 0


def parse_frontmatter(lines):
    """Parse the small YAML subset skills use: scalars, quoted strings, block scalars."""
    data = {}
    i = 0
    while i < len(lines):
        line = lines[i]
        if not line.strip() or line.lstrip().startswith('#') or line[:1] in ' \t':
            i += 1
            continue
        m = re.match(r'^([A-Za-z0-9_-]+)\s*:\s?(.*)$', line)
        i += 1
        if not m:
            continue
        key, val = m.group(1), m.group(2).rstrip()
        if val in ('>', '>-', '>+', '|', '|-', '|+'):
            block = []
            while i < len(lines) and (not lines[i].strip() or lines[i][:1] in ' \t'):
                block.append(lines[i].strip())
                i += 1
            if val.startswith('>'):
                paras, cur = [], []
                for b in block:
                    if b:
                        cur.append(b)
                    elif cur:
                        paras.append(' '.join(cur))
                        cur = []
                if cur:
                    paras.append(' '.join(cur))
                data[key] = '\n'.join(paras)
            else:
                data[key] = '\n'.join(block).strip('\n')
        elif val.startswith('"'):
            buf = val[1:]
            closed = re.compile(r'(?<!\\)(?:\\\\)*"\s*(?:#.*)?$')
            while not closed.search(buf) and i < len(lines):
                buf += ' ' + lines[i].strip()
                i += 1
            m2 = re.match(r'^(.*?(?<!\\)(?:\\\\)*)"\s*(?:#.*)?$', buf, re.S)
            s = m2.group(1) if m2 else buf
            data[key] = s.replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')
        elif val.startswith("'"):
            buf = val[1:]
            while not re.search(r"'\s*$", buf.replace("''", '')) and i < len(lines):
                buf += ' ' + lines[i].strip()
                i += 1
            data[key] = re.sub(r"'\s*$", '', buf).replace("''", "'")
        elif val == '':
            block = []
            while i < len(lines) and (not lines[i].strip() or lines[i][:1] in ' \t'):
                block.append(lines[i])
                i += 1
            data[key] = '\n'.join(block).strip()
        else:
            data[key] = re.sub(r'\s+#.*$', '', val).strip()
    return data


def load_skill(path):
    """Return dict(dir, folder, file, text, fm, body, fm_lines) or None if no SKILL.md."""
    path = os.path.abspath(os.path.expanduser(path))
    if os.path.isdir(path):
        skill_dir, skill_file = path, os.path.join(path, 'SKILL.md')
    else:
        skill_dir, skill_file = os.path.dirname(path), path
    if not os.path.isfile(skill_file):
        return {'dir': skill_dir, 'folder': os.path.basename(skill_dir), 'file': None}
    with open(skill_file, encoding='utf-8', errors='replace') as f:
        text = f.read()
    fm_lines, body, n_fm = split_frontmatter(text)
    fm = parse_frontmatter(fm_lines) if fm_lines is not None else None
    return {'dir': skill_dir, 'folder': os.path.basename(skill_dir), 'file': skill_file,
            'text': text, 'fm': fm, 'body': body, 'fm_lines': n_fm}


def trigger_text(sk):
    fm = sk.get('fm') or {}
    return ' '.join(x for x in (fm.get('description', ''), fm.get('when_to_use', '')) if x)


def tokens(text):
    out = set()
    for t in re.findall(r"[A-Za-z֐-׿][A-Za-z0-9֐-׿'-]+", text.lower()):
        t = t.strip("'-")
        if len(t) >= 3 and t not in STOP:
            out.add(t)
    return out


def phrases(text):
    return {p.strip().lower() for p in re.findall(r"'([^'\n]{3,60})'", text) if not p.strip().startswith(',')}


def est_tokens(text):
    """Rough token estimate: Hebrew ~2 chars/token, Latin ~4, the rest ~3."""
    heb = len(HEB.findall(text))
    latin = len(re.findall(r'[A-Za-z]', text))
    return int(heb / 2 + latin / 4 + (len(text) - heb - latin) / 3)


def overlap(a, b):
    if not a or not b:
        return 0.0
    return len(a & b) / min(len(a), len(b))


def all_skills(root):
    out = []
    if not os.path.isdir(root):
        return out
    for name in sorted(os.listdir(root)):
        d = os.path.join(root, name)
        if os.path.isdir(d) and os.path.isfile(os.path.join(d, 'SKILL.md')):
            out.append(load_skill(d))
    return out


def lint(sk, root, others):
    """Return a list of (level, message)."""
    res = []
    if not sk.get('file'):
        return [('ERROR', 'no SKILL.md in %s' % sk['dir'])]
    fm, text, folder = sk['fm'], sk['text'], sk['folder']
    if fm is None:
        res.append(('ERROR', 'no frontmatter: SKILL.md must start with a --- block holding name + description'))
        fm = {}
    name = fm.get('name')
    if not name:
        res.append(('WARN', "no 'name' field (Claude Code falls back to the folder name; claude.ai uploads need it)"))
    else:
        if not NAME_RE.match(name) or len(name) > 64:
            res.append(('ERROR', "name '%s' must be lowercase letters, digits and hyphens, <= 64 chars" % name))
        if name != folder:
            res.append(('ERROR', "name '%s' differs from the folder '%s'" % (name, folder)))
    desc = fm.get('description', '')
    trig = trigger_text(sk)
    if not desc:
        res.append(('ERROR', 'no description - Claude cannot know when to use the skill'))
    else:
        n = len(trig)
        if n > 1536:
            res.append(('ERROR', 'description is %d chars - the skill listing cuts at 1,536' % n))
        elif n > 1024:
            res.append(('WARN', 'description is %d chars - over the 1,024 claude.ai upload limit' % n))
        if not HEB.search(trig):
            res.append(('WARN', 'no Hebrew trigger phrases in the description (Gilad writes in Hebrew)'))
        if not re.search(r'trigger|use when|use this|use for|when the user|when gilad', trig, re.I):
            res.append(('WARN', "the description never says when to use it ('TRIGGER on...' / 'Use when...')"))
        if not re.search(r"\bnot (?:for|a|an|the)\b|\bdo not use\b|\bdon't use\b", trig, re.I):
            res.append(('WARN', "no 'NOT for ... (use <neighbor>)' boundary in the description"))
    n_lines = len(text.splitlines())
    if n_lines > 500:
        res.append(('ERROR', 'SKILL.md is %d lines - keep it under 500, move detail to references/' % n_lines))
    elif n_lines > 300:
        res.append(('WARN', 'SKILL.md is %d lines - aim for < 200, move detail to references/' % n_lines))
    for rel in sorted(set(LOCAL_REF.findall(text))):
        if not os.path.exists(os.path.join(sk['dir'], rel)):
            res.append(('ERROR', 'mentions %s but the file does not exist' % rel))
    for other, rel in sorted(set(SKILL_REF.findall(text))):
        own = other in (folder, name)
        base = sk['dir'] if own else os.path.join(root, other)
        if not os.path.isdir(base):
            res.append(('WARN', "refers to the skill '%s', which is not in %s" % (other, root)))
        elif not os.path.exists(os.path.join(base, rel)):
            # another skill's file may be runtime data (a seed bank, state) - only own files must ship
            res.append(('ERROR' if own else 'WARN',
                        'mentions ~/.claude/skills/%s/%s but the file does not exist' % (other, rel)))
    for dirpath, _, files in os.walk(sk['dir']):
        for fn in files:
            if not fn.endswith(('.md', '.py', '.json', '.txt', '.ps1', '.sh', '.js', '.yaml', '.yml')):
                continue
            p = os.path.join(dirpath, fn)
            try:
                with open(p, encoding='utf-8', errors='replace') as f:
                    content = f.read()
            except OSError:
                continue
            for pat, what in SECRET_PATTERNS:
                if re.search(pat, content):
                    res.append(('ERROR', '%s looks like it contains %s' % (os.path.relpath(p, sk['dir']), what)))
    paths = sorted(set(USER_PATH.findall(text)))
    if paths:
        res.append(('WARN', 'hardcoded user path(s) %s - prefer ~ or $HOME' % ', '.join(paths[:3])))
    waits = FIXED_WAIT.findall(text)
    if waits:
        res.append(('WARN', "fixed wait(s) like '%s' - check the result instead where possible" % waits[0].strip()))
    if not VERIFY.search(sk['body']):
        res.append(('WARN', 'no step says how to verify it worked'))
    scripts_dir = os.path.join(sk['dir'], 'scripts')
    if os.path.isdir(scripts_dir):
        for fn in sorted(os.listdir(scripts_dir)):
            if fn.endswith(('.py', '.ps1', '.sh', '.js')) and fn not in text:
                res.append(('WARN', 'scripts/%s is never mentioned in SKILL.md' % fn))
    if not re.search(r'^##+\s*Pitfalls', text, re.M):
        res.append(('NOTE', "no '## Pitfalls (tested YYYY-MM-DD)' section yet - add one after the first real run"))
    my_tokens, my_phrases = tokens(trig), phrases(trig)
    for o in others:
        if o.get('dir') == sk['dir'] or not o.get('file'):
            continue
        ot = trigger_text(o)
        score = overlap(my_tokens, tokens(ot))
        shared = my_phrases & phrases(ot)
        if shared:
            res.append(('WARN', "shares trigger phrase(s) %s with '%s'" % (', '.join(sorted(shared)[:4]), o['folder'])))
        elif score >= 0.5:
            res.append(('WARN', "description overlaps %.0f%% with '%s' - check for a duplicate" % (score * 100, o['folder'])))
    return res


def main():
    ap = argparse.ArgumentParser(description='Lint Claude Code skills (skill-forge quality bar).')
    ap.add_argument('paths', nargs='*', help='skill folders or SKILL.md files')
    ap.add_argument('--root', help='skills root (default ~/.claude/skills)')
    ap.add_argument('--all', action='store_true', help='lint every skill under the root')
    ap.add_argument('--list', action='store_true', help='list skills with descriptions')
    ap.add_argument('--similar', metavar='TEXT', help='rank skills by overlap with a draft')
    ap.add_argument('--budget', action='store_true', help='token cost of the skill listing')
    ap.add_argument('--out', help='also write the report to this file (UTF-8)')
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    root = skills_root(args.root)
    report = []
    say = report.append
    errors = 0
    if args.list:
        skills = all_skills(root)
        say('%d skills in %s' % (len(skills), root))
        for sk in skills:
            d = re.sub(r'\s+', ' ', trigger_text(sk)).strip()
            say('- %s (%d lines): %s' % (sk['folder'], len(sk['text'].splitlines()), d[:160] + ('...' if len(d) > 160 else '')))
    elif args.budget:
        rows = []
        for sk in all_skills(root):
            fm = sk.get('fm') or {}
            listed = str(fm.get('disable-model-invocation', '')).strip().lower() != 'true'
            t = trigger_text(sk)[:1536]
            rows.append((est_tokens(t) if listed else 0, len(t), sk['folder'], listed))
        shown = [r for r in rows if r[3]]
        say('Skill listing: %d skills, %d listed, ~%d chars, ~%d tokens loaded at every session start' % (
            len(rows), len(shown), sum(r[1] for r in shown), sum(r[0] for r in shown)))
        say('Biggest descriptions - shorten the rarely used ones first, or set disable-model-invocation: true '
            'on manual-only skills (they leave the listing):')
        for tok, n, folder, _ in sorted(shown, reverse=True)[:12]:
            say('  ~%5d tokens  %5d chars  %s' % (tok, n, folder))
        hidden = [r[2] for r in rows if not r[3]]
        if hidden:
            say('Not in the listing (manual only): ' + ', '.join(hidden))
    elif args.similar:
        draft_t, draft_p = tokens(args.similar), phrases(args.similar)
        rows = []
        for sk in all_skills(root):
            st = tokens(trigger_text(sk))
            score = len(draft_t & st) / len(draft_t) if draft_t else 0.0
            shared = draft_p & phrases(trigger_text(sk))
            if score >= 0.2 or shared:
                rows.append((score, sk['folder'], sorted(draft_t & st)[:8], sorted(shared)))
        rows.sort(reverse=True)
        say('Draft words found in existing skills (>= 0.35: read that skill before building):')
        if not rows:
            say('  no close match - looks new')
        for score, folder, words, shared in rows[:10]:
            extra = ('; same trigger: %s' % ', '.join(shared)) if shared else ''
            say('  %.2f  %s  (%s)%s' % (score, folder, ', '.join(words), extra))
    else:
        targets = all_skills(root) if args.all else [load_skill(p) for p in args.paths]
        if not targets:
            ap.print_usage(sys.stderr)
            return 2
        others = all_skills(root)
        n_warn = 0
        for sk in targets:
            res = lint(sk, root, others)
            say('%s  (SKILL.md %s lines, description %d chars)' % (
                sk['folder'], len(sk['text'].splitlines()) if sk.get('file') else '?', len(trigger_text(sk)) if sk.get('file') else 0))
            for level, msg in res:
                say('  %-5s %s' % (level, msg))
            if not [r for r in res if r[0] in ('ERROR', 'WARN')]:
                say('  OK')
            errors += sum(1 for r in res if r[0] == 'ERROR')
            n_warn += sum(1 for r in res if r[0] == 'WARN')
        say('%d skill(s): %d error(s), %d warning(s)' % (len(targets), errors, n_warn))
    text = '\n'.join(report)
    print(text)
    if args.out:
        with open(args.out, 'w', encoding='utf-8') as f:
            f.write(text + '\n')
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
