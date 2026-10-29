#!/usr/bin/env python3
"""Back up the irreplaceable parts of ~/.claude into a folder that syncs to the cloud.

  python -I backup.py [--target "<folder>"] [--keep 14] [--with-transcripts] [--dry-run]

The target defaults to `backup_target` in data-keeper/config.json (empty = backup is off).
Copies skills/, every projects/*/memory/, user-log/, plans/, CLAUDE.md and settings.json into
<target>/claude-backup/YYYY-MM-DD/ (a second run on the same day refreshes it), then deletes
dated snapshots beyond the newest --keep. Never touches anything outside <target>/claude-backup.
"""
import argparse
import datetime as dt
import fnmatch
import glob
import json
import os
import re
import shutil
import sys

SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = ('state', '__pycache__', '*.tmp', '.tmp-*', 'OFF')


def claude_dir():
    return os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')


def config():
    try:
        with open(os.path.join(SKILL_DIR, 'config.json'), encoding='utf-8') as f:
            cfg = json.load(f)
        return cfg if isinstance(cfg, dict) else {}
    except Exception:
        return {}


def ignore(_, names):
    return [n for n in names if any(fnmatch.fnmatch(n, p) for p in SKIP)]


def plan(cdir, with_transcripts, log_dir):
    """(source, relative destination) pairs that exist."""
    items = [(os.path.join(cdir, 'skills'), 'skills'), (log_dir, 'user-log'),
             (os.path.join(cdir, 'plans'), 'plans'), (os.path.join(cdir, 'CLAUDE.md'), 'CLAUDE.md'),
             (os.path.join(cdir, 'settings.json'), 'settings.json')]
    for mem in glob.glob(os.path.join(cdir, 'projects', '*', 'memory')):
        items.append((mem, os.path.join('projects', os.path.basename(os.path.dirname(mem)), 'memory')))
    if with_transcripts:
        for tr in glob.glob(os.path.join(cdir, 'projects', '*', '*.jsonl')):
            items.append((tr, os.path.join('projects', os.path.basename(os.path.dirname(tr)), os.path.basename(tr))))
    return [(s, d) for s, d in items if os.path.exists(s)]


def size_of(path):
    if os.path.isfile(path):
        return os.path.getsize(path)
    return sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(path) for f in fs)


def main():
    ap = argparse.ArgumentParser(description='Back up ~/.claude essentials (data-keeper).')
    ap.add_argument('--target', help='backup folder (default: backup_target in config.json)')
    ap.add_argument('--keep', type=int, help='dated snapshots to keep (default 14)')
    ap.add_argument('--with-transcripts', action='store_true', help='also copy session transcripts (big)')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    cfg = config()
    target = os.path.expanduser(args.target or cfg.get('backup_target') or '')
    if not target:
        print('Backup is off - no target. Set backup_target in data-keeper/config.json or pass --target.')
        return 0
    cdir = os.path.abspath(claude_dir())
    base = os.path.abspath(os.path.join(target, 'claude-backup'))
    if base == cdir or base.startswith(cdir + os.sep):
        print('ERROR: the backup folder must be outside %s' % cdir)
        return 1
    log_dir = os.path.expanduser(cfg.get('log_dir') or '') or os.path.join(cdir, 'user-log')
    snap = os.path.join(base, dt.date.today().isoformat())
    items = plan(cdir, args.with_transcripts, log_dir)
    total = sum(size_of(s) for s, _ in items)
    print('Backup %d item(s), %.1f MB -> %s' % (len(items), total / 1e6, snap))
    for s, d in items:
        print('  %s' % d)
    if args.dry_run:
        print('(dry run - nothing copied)')
        return 0
    for s, d in items:
        dst = os.path.join(snap, d)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isdir(s):
            shutil.copytree(s, dst, dirs_exist_ok=True, ignore=ignore)
        else:
            shutil.copy2(s, dst)
    keep = args.keep or int(cfg.get('backup_keep') or 14)
    dated = sorted(d for d in os.listdir(base) if re.match(r'^\d{4}-\d{2}-\d{2}$', d))
    for old in dated[:-keep] if keep > 0 else []:
        shutil.rmtree(os.path.join(base, old))
        print('  removed old snapshot %s' % old)
    print('Done.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
