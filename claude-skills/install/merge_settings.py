#!/usr/bin/env python3
"""Add (or remove) the upgrade's hooks in ~/.claude/settings.json - safely.

  python -I merge_settings.py --dry-run      show what would change, write nothing
  python -I merge_settings.py                apply (a backup is written first)
  python -I merge_settings.py --remove       take our hooks out again
  python -I merge_settings.py --only log scout compact   limit to some of them
  python -I merge_settings.py --shell-form   write shell commands instead of exec form
                                             (only if Claude Code reports a hook error)

Hooks: log (data-keeper/log_prompt.py, UserPromptSubmit), scout (skill-scout/scout_hook.py,
UserPromptSubmit), compact (data-keeper/after_compact.py, SessionStart matcher "compact").
A hook is added only when its skill folder is installed. Idempotent: a second run adds
nothing. Never rewrites a settings file it cannot parse. The hooks run with the same Python
that runs this script.
"""
import argparse
import json
import os
import shutil
import sys
import time

HOOKS = [  # name, event, matcher, skill folder, script
    ('log', 'UserPromptSubmit', None, 'data-keeper', 'log_prompt.py'),
    ('scout', 'UserPromptSubmit', None, 'skill-scout', 'scout_hook.py'),
    ('compact', 'SessionStart', 'compact', 'data-keeper', 'after_compact.py'),
]


def config_dir():
    return os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')


def mentions(hook, script):
    if not isinstance(hook, dict):
        return False
    parts = [str(hook.get('command', ''))] + [str(a) for a in hook.get('args', []) or []]
    return any(script in p for p in parts)


def build_entry(python, script, shell_form):
    if shell_form:  # Git Bash eats unquoted backslashes: forward slashes, quoted
        cmd = '"%s" -I "%s"' % (python.replace('\\', '/'), script.replace('\\', '/'))
        return {'type': 'command', 'command': cmd, 'timeout': 10}
    # exec form: no shell, so native paths are the safest for process creation
    return {'type': 'command', 'command': os.path.normpath(python),
            'args': ['-I', os.path.normpath(script)], 'timeout': 10}


def main():
    ap = argparse.ArgumentParser(description="Install the upgrade's hooks into settings.json.")
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--remove', action='store_true')
    ap.add_argument('--shell-form', action='store_true')
    ap.add_argument('--only', nargs='+', choices=[h[0] for h in HOOKS])
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass

    cdir = config_dir()
    settings_path = os.path.join(cdir, 'settings.json')
    python = sys.executable or 'python'
    wanted = [h for h in HOOKS if not args.only or h[0] in args.only]

    settings = {}
    if os.path.isfile(settings_path):
        with open(settings_path, encoding='utf-8-sig') as f:
            raw = f.read()
        if raw.strip():
            try:
                settings = json.loads(raw)
            except ValueError as exc:
                print('ERROR: %s is not valid JSON (%s). Nothing changed - fix it by hand first.' % (settings_path, exc))
                return 1
        if not isinstance(settings, dict):
            print('ERROR: %s is not a JSON object. Nothing changed.' % settings_path)
            return 1
    hooks = settings.get('hooks', {})
    if not isinstance(hooks, dict):
        print("ERROR: 'hooks' in settings.json is not an object. Nothing changed.")
        return 1
    hooks = json.loads(json.dumps(hooks))  # work on a copy
    for _, event, _, _, _ in wanted:
        if not isinstance(hooks.get(event, []), list):
            print("ERROR: 'hooks.%s' is not a list. Nothing changed." % event)
            return 1

    changes = []
    for name, event, matcher, skill, script in wanted:
        groups = hooks.get(event, [])
        present = any(mentions(h, script) for g in groups if isinstance(g, dict) for h in g.get('hooks', []) or [])
        if args.remove:
            if not present:
                continue
            kept_groups = []
            for g in groups:
                if isinstance(g, dict) and isinstance(g.get('hooks'), list):
                    kept = [h for h in g['hooks'] if not mentions(h, script)]
                    if kept:
                        kept_groups.append(dict(g, hooks=kept))
                else:
                    kept_groups.append(g)
            if kept_groups:
                hooks[event] = kept_groups
            else:
                hooks.pop(event, None)
            changes.append('remove %s (%s)' % (name, script))
        else:
            path = os.path.join(cdir, 'skills', skill, 'scripts', script)
            if present:
                print('Already installed: %s' % name)
                continue
            if not os.path.isfile(path):
                print('Skipped %s: %s is not installed' % (name, path))
                continue
            group = {'hooks': [build_entry(python, path, args.shell_form)]}
            if matcher:
                group = dict(matcher=matcher, **group)
            hooks.setdefault(event, []).append(group)
            changes.append('add %s -> %s%s' % (name, event, (' (%s)' % matcher) if matcher else ''))

    if not changes:
        print('Nothing to change in %s.' % settings_path)
        return 0
    new_settings = dict(settings)
    if hooks:
        new_settings['hooks'] = hooks
    else:
        new_settings.pop('hooks', None)
    print('Will change %s:' % settings_path)
    for c in changes:
        print('  - ' + c)
    print(json.dumps({'hooks': hooks}, indent=2, ensure_ascii=False))
    if args.dry_run:
        print('(dry run - nothing written)')
        return 0
    os.makedirs(cdir, exist_ok=True)
    if os.path.isfile(settings_path):
        backup = '%s.bak-%s' % (settings_path, time.strftime('%Y%m%d-%H%M%S'))
        shutil.copy2(settings_path, backup)
        print('Backup: %s' % backup)
    tmp = settings_path + '.tmp'
    with open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(json.dumps(new_settings, indent=2, ensure_ascii=False) + '\n')
    with open(tmp, encoding='utf-8') as f:
        json.load(f)  # re-read before replacing
    os.replace(tmp, settings_path)
    print('Done.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
