#!/usr/bin/env python3
"""Add (or remove) the skill-scout UserPromptSubmit hook in ~/.claude/settings.json - safely.

  python -I merge_settings.py --dry-run      show what would change, write nothing
  python -I merge_settings.py                apply (a backup is written first)
  python -I merge_settings.py --remove       take the hook out again
  python -I merge_settings.py --shell-form   write a shell command instead of exec form
                                             (only if Claude Code reports a hook error)

Idempotent: a second run adds nothing. Never rewrites a settings file it cannot parse.
The hook runs with the same Python that runs this script.
"""
import argparse
import json
import os
import shutil
import sys
import time

MARK = 'scout_hook.py'


def config_dir():
    return os.environ.get('CLAUDE_CONFIG_DIR') or os.path.join(os.path.expanduser('~'), '.claude')


def is_scout(hook):
    if not isinstance(hook, dict):
        return False
    parts = [str(hook.get('command', ''))] + [str(a) for a in hook.get('args', []) or []]
    return any(MARK in p for p in parts)


def build_entry(python, script, shell_form):
    if shell_form:  # Git Bash eats unquoted backslashes: forward slashes, quoted
        cmd = '"%s" -I "%s"' % (python.replace('\\', '/'), script.replace('\\', '/'))
        return {'type': 'command', 'command': cmd, 'timeout': 10}
    # exec form: no shell, so native paths are the safest for process creation
    return {'type': 'command', 'command': os.path.normpath(python),
            'args': ['-I', os.path.normpath(script)], 'timeout': 10}


def main():
    ap = argparse.ArgumentParser(description='Install the skill-scout hook into settings.json.')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--remove', action='store_true')
    ap.add_argument('--shell-form', action='store_true')
    args = ap.parse_args()
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        pass

    cdir = config_dir()
    settings_path = os.path.join(cdir, 'settings.json')
    script = os.path.join(cdir, 'skills', 'skill-scout', 'scripts', MARK)
    python = sys.executable or 'python'
    if not args.remove and not os.path.isfile(script):
        print('ERROR: %s not found - copy the skill-scout folder first.' % script)
        return 1

    settings = {}
    raw = ''
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

    hooks = settings.get('hooks')
    if hooks is not None and not isinstance(hooks, dict):
        print("ERROR: 'hooks' in settings.json is not an object. Nothing changed.")
        return 1
    groups = (hooks or {}).get('UserPromptSubmit', [])
    if not isinstance(groups, list):
        print("ERROR: 'hooks.UserPromptSubmit' is not a list. Nothing changed.")
        return 1
    found = any(is_scout(h) for g in groups if isinstance(g, dict) for h in g.get('hooks', []) or [])

    if args.remove:
        if not found:
            print('Nothing to remove - the skill-scout hook is not in %s.' % settings_path)
            return 0
        new_groups = []
        for g in groups:
            if isinstance(g, dict) and isinstance(g.get('hooks'), list):
                kept = [h for h in g['hooks'] if not is_scout(h)]
                if kept:
                    new_groups.append(dict(g, hooks=kept))
            else:
                new_groups.append(g)
        action = 'remove the skill-scout hook'
    else:
        if found:
            print('Already installed - the skill-scout hook is in %s. Nothing changed.' % settings_path)
            return 0
        new_groups = groups + [{'hooks': [build_entry(python, script, args.shell_form)]}]
        action = 'add the skill-scout hook'

    new_settings = dict(settings)
    new_hooks = dict(hooks or {})
    if new_groups:
        new_hooks['UserPromptSubmit'] = new_groups
    else:
        new_hooks.pop('UserPromptSubmit', None)
    if new_hooks:
        new_settings['hooks'] = new_hooks
    else:
        new_settings.pop('hooks', None)
    text = json.dumps(new_settings, indent=2, ensure_ascii=False) + '\n'

    print('Will %s in %s:' % (action, settings_path))
    print(json.dumps({'hooks': {'UserPromptSubmit': new_groups}}, indent=2, ensure_ascii=False))
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
        f.write(text)
    json.loads(open(tmp, encoding='utf-8').read())  # re-read before replacing
    os.replace(tmp, settings_path)
    print('Done.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
