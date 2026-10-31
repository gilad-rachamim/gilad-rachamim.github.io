#!/usr/bin/env python3
"""Copy ~/.claude/skills into a private GitHub repo, so phone/cloud sessions on that repo get them.

  python -I sync_skills.py --setup [--repo gilad-rachamim/claude-skills]   one time: create/clone the repo
  python -I sync_skills.py [--dry-run]                                      every end-session: copy, check, push

The repo keeps the skills under .claude/skills/ - Claude Code loads them as project skills in
any session started on that repo (claude.ai/code, the phone). Skills only, by default: no
memory, no user log, no skill-seeds.md, no briefs, no state - those hold personal data.
Before every push each file is scanned; a file with a secret, a phone number or an email is
left out and listed. Exit 0 = pushed or nothing to do; 1 = a problem it reports.
"""
import argparse
import fnmatch
import json
import os
import re
import shutil
import subprocess
import sys

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCLUDE = ['state', '__pycache__', 'briefs', 'skill-seeds.md', 'skill-seeds.md.bak-*', '*.bak-*', 'OFF',
           '*.tmp', '.tmp-*', 'node_modules', '.git', '*.log', '*.jsonl']
PERSONAL = [
    (re.compile(r'(?<![\d+])(?:\+?972[-\s]?|0)(?:5\d|7\d|[2-489])[-\s]?\d{3}[-\s]?\d{4}(?!\d)'), 'a phone number'),
    (re.compile(r'[\w.+-]+@[\w-]+\.(?:com|co\.il|net|org|gov\.il|ac\.il)\b', re.I), 'an email address'),
    (re.compile(r'\bsk-(?:ant-)?[A-Za-z0-9_-]{24,}|\bghp_[A-Za-z0-9]{30,}|\bAKIA[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z_-]{35}\b'
                r'|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b\d{8,10}:AA[0-9A-Za-z_-]{30,}'), 'a secret / token'),
]
TEXT_EXT = ('.md', '.py', '.json', '.txt', '.ps1', '.sh', '.js', '.yaml', '.yml', '.csv')


def claude_dir():
    return os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')


def config():
    try:
        with open(os.path.join(SKILL_DIR, 'config.json'), encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def run(cmd, cwd=None):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    return p.returncode, (p.stdout + p.stderr).strip()


def excluded(name):
    return any(fnmatch.fnmatch(name, pat) for pat in EXCLUDE)


def personal_hit(path):
    if not path.lower().endswith(TEXT_EXT):
        return None
    try:
        with open(path, encoding='utf-8', errors='replace') as f:
            text = f.read()
    except OSError:
        return None
    text = text.replace('050-123-4567', '').replace('0501234567', '')  # documented fake examples
    for pat, what in PERSONAL:
        if pat.search(text):
            return what
    return None


def main():
    ap = argparse.ArgumentParser(description='Sync ~/.claude/skills to a private GitHub repo.')
    ap.add_argument('--setup', action='store_true', help='create (private) or clone the repo once')
    ap.add_argument('--repo', help='owner/name (default from config.json)')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    cfg = config()
    repo = args.repo or cfg.get('repo') or ''
    mirror = os.path.expanduser(cfg.get('mirror_dir') or '') or os.path.join(claude_dir(), 'skills-repo')
    if not repo:
        print('Sync is off - no repo in skills-sync/config.json.')
        return 0
    if args.setup:
        if os.path.isdir(os.path.join(mirror, '.git')):
            print('Already set up: %s' % mirror)
            return 0
        code, out = run(['gh', 'repo', 'view', repo, '--json', 'visibility', '-q', '.visibility'])
        if code != 0:
            code, out = run(['gh', 'repo', 'create', repo, '--private', '--description',
                             "Gilad's Claude Code skills (synced by skills-sync)"])
            if code != 0:
                print('ERROR: could not create %s with gh: %s' % (repo, out[-300:]))
                return 1
        elif out.strip().upper() != 'PRIVATE':
            print('ERROR: %s exists and is %s - it must be PRIVATE. Nothing done.' % (repo, out.strip()))
            return 1
        code, out = run(['gh', 'repo', 'clone', repo, mirror])
        if code != 0:
            print('ERROR: clone failed: %s' % out[-300:])
            return 1
        print('Set up: %s -> %s' % (repo, mirror))
        return 0
    if not os.path.isdir(os.path.join(mirror, '.git')):
        print('Sync skipped: %s is not set up yet (run with --setup once).' % mirror)
        return 0
    code, vis = run(['gh', 'repo', 'view', repo, '--json', 'visibility', '-q', '.visibility'])
    if code == 0 and vis.strip().upper() != 'PRIVATE':
        print('STOP: %s is %s, not private - nothing pushed.' % (repo, vis.strip()))
        return 1
    src = os.path.join(claude_dir(), 'skills')
    dst = os.path.join(mirror, '.claude', 'skills')
    left_out, copied = [], 0
    if not args.dry_run and os.path.isdir(dst):
        shutil.rmtree(dst)
    for dirpath, dirnames, files in os.walk(src):
        dirnames[:] = [d for d in dirnames if not excluded(d)]
        for fn in files:
            if excluded(fn):
                continue
            p = os.path.join(dirpath, fn)
            rel = os.path.relpath(p, src)
            hit = personal_hit(p)
            if hit:
                left_out.append('%s (%s)' % (rel, hit))
                continue
            copied += 1
            if not args.dry_run:
                os.makedirs(os.path.dirname(os.path.join(dst, rel)), exist_ok=True)
                shutil.copy2(p, os.path.join(dst, rel))
    print('%d file(s) to sync, %d left out for privacy' % (copied, len(left_out)))
    for x in left_out:
        print('  left out: ' + x)
    if args.dry_run:
        print('(dry run - nothing copied or pushed)')
        return 0
    run(['git', 'add', '-A'], cwd=mirror)
    code, _ = run(['git', 'diff', '--cached', '--quiet'], cwd=mirror)
    if code == 0:
        print('No changes - repo already up to date.')
        return 0
    code, out = run(['git', 'commit', '-m', 'Sync skills from the PC'], cwd=mirror)
    if code != 0:
        print('ERROR: commit failed: %s' % out[-300:])
        return 1
    code, out = run(['git', 'push'], cwd=mirror)
    if code != 0:
        print('ERROR: push failed: %s' % out[-300:])
        return 1
    code, ahead = run(['git', 'rev-list', '--count', '@{u}..HEAD'], cwd=mirror)
    print('Pushed and verified.' if ahead.strip() == '0' else 'WARNING: %s commit(s) still unpushed' % ahead)
    return 0


if __name__ == '__main__':
    sys.exit(main())
