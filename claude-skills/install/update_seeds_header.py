#!/usr/bin/env python3
"""Give ~/.claude/skills/session-retro/skill-seeds.md the new pipeline header - every entry stays.

  python -I update_seeds_header.py --dry-run    show the counts, write nothing
  python -I update_seeds_header.py              replace the header (a backup is written first)

The header is everything above the line '<!-- seeds below -->'. Entries below it are kept
byte for byte; the script stops if the number of '## ' entries would change.
"""
import argparse
import os
import shutil
import sys
import time

MARKER = '<!-- seeds below -->'
HERE = os.path.dirname(os.path.abspath(__file__))
NEW_HEADER = os.path.join(os.path.dirname(HERE), 'session-retro', 'skill-seeds.header.md')


def count_entries(text):
    n, fence = 0, False
    for line in text.splitlines():
        if line.strip().startswith('```'):
            fence = not fence
        elif not fence and line.startswith('## '):
            n += 1
    return n


def split_old(text):
    """(old header, entries) - entries start after the marker, or at the first real '## '."""
    i = text.find(MARKER)
    if i >= 0:
        return text[:i], text[i + len(MARKER):]
    fence, pos = False, 0
    for line in text.splitlines(True):
        if line.strip().startswith('```'):
            fence = not fence
        elif not fence and line.startswith('## '):
            return text[:pos], '\n' + text[pos:]
        pos += len(line)
    return text, ''


def main():
    ap = argparse.ArgumentParser(description='Replace the skill-seeds.md header, keep all entries.')
    ap.add_argument('--dry-run', action='store_true')
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass
    cdir = os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')
    seeds = os.path.join(cdir, 'skills', 'session-retro', 'skill-seeds.md')
    with open(NEW_HEADER, encoding='utf-8') as f:
        header = f.read()
    if MARKER not in header:
        print('ERROR: the new header has no marker line - wrong file?')
        return 1
    header = header[:header.find(MARKER)]
    old = ''
    if os.path.isfile(seeds):
        with open(seeds, encoding='utf-8-sig') as f:
            old = f.read()
    _, entries = split_old(old)
    new = header + MARKER + (entries if entries.startswith('\n') else '\n' + entries)
    before, after = count_entries(entries), count_entries(new[new.find(MARKER):])
    print('%s: %d entries before, %d after' % (seeds, before, after))
    if before != after:
        print('ERROR: the entry count would change - nothing written.')
        return 1
    if args.dry_run:
        print('(dry run - nothing written)')
        return 0
    os.makedirs(os.path.dirname(seeds), exist_ok=True)
    if old:
        backup = '%s.bak-%s' % (seeds, time.strftime('%Y%m%d-%H%M%S'))
        shutil.copy2(seeds, backup)
        print('Backup: %s' % backup)
    with open(seeds, 'w', encoding='utf-8', newline='\n') as f:
        f.write(new)
    print('Done.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
