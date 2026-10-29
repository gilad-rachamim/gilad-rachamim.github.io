#!/usr/bin/env python3
"""Install Session Guard for Claude Code on this computer (macOS, Windows, Linux).

    python3 install.py                 install, or update an earlier install
    python3 install.py --phone         also set up the phone battery channel (ntfy)
    python3 install.py --uninstall     remove hooks, status line and watchdog
                                       (handoffs and lessons are kept; --purge deletes them)

What it changes:
  1. copies this skill to ~/.claude/skills/session-guard
  2. adds hooks and the status line to ~/.claude/settings.json; the old file is backed
     up next to it, and a status line you already had keeps running (chained)
  3. registers the watchdog that runs every minute: launchd (macOS), Task Scheduler
     (Windows) or a systemd user timer / cron (Linux)
  4. writes ~/.claude/session-guard/config.json (your own edits there are kept)
On Windows run it with `python` or `py` instead of `python3`.
"""
from __future__ import annotations

import argparse
import json
import os
import plistlib
import re
import secrets
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path
from xml.sax.saxutils import escape

if sys.version_info < (3, 8):
    sys.exit("Session Guard needs Python 3.8 or newer.")

IS_WIN, IS_MAC = os.name == "nt", sys.platform == "darwin"
SRC = Path(__file__).resolve().parent.parent
CLAUDE_DIR = Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude").expanduser()
DEST = CLAUDE_DIR / "skills" / "session-guard"
SETTINGS = CLAUDE_DIR / "settings.json"
HOME = Path(os.environ.get("SESSION_GUARD_HOME") or CLAUDE_DIR / "session-guard").expanduser()
MARK = "session-guard/scripts/guard.py"
LABEL = "com.claude.session-guard"
TASK = "ClaudeSessionGuard"
UNIT = "claude-session-guard"
CRON_TAG = "# claude-session-guard"


LANG = "he"  # language of this installer's messages and of the guard's notifications


def tr(he: str, en: str) -> str:
    return he if LANG == "he" else en


def say(msg: str = "") -> None:
    print(msg, flush=True)


def fwd(p) -> str:
    return str(p).replace("\\", "/") if IS_WIN else str(p)


def git_bash() -> str:
    if not IS_WIN:
        return ""
    cand = [os.environ.get("CLAUDE_CODE_GIT_BASH_PATH", "")]
    git = shutil.which("git")
    if git:
        root = Path(git).resolve().parent.parent
        cand += [str(root / "bin" / "bash.exe"), str(root.parent / "bin" / "bash.exe")]
    cand += [r"C:\Program Files\Git\bin\bash.exe", r"C:\Program Files (x86)\Git\bin\bash.exe"]
    return next((c for c in cand if c and Path(c).is_file()), "")


def shell_style() -> str:
    """Claude Code runs hook and status line commands through bash (Git Bash on
    Windows) or, on Windows without Git Bash, through PowerShell."""
    return "bash" if not IS_WIN or git_bash() else "powershell"


def interpreter() -> str:
    """The Python that hooks and the watchdog run with. Prefer a stable path: Homebrew's
    versioned paths disappear when Python is upgraded."""
    exe = sys.executable
    if not IS_WIN and ("/Cellar/" in exe or "/opt/python@" in exe):
        for cand in ("/opt/homebrew/bin/python3", "/usr/local/bin/python3"):
            if Path(cand).exists():
                return cand
    return exe


def command(*args: str) -> str:
    guard = DEST / "scripts" / "guard.py"
    line = " ".join(shlex.quote(a) for a in (fwd(interpreter()), fwd(guard), *args))
    return "& " + line if shell_style() == "powershell" else line


def is_ours(cmd) -> bool:
    return MARK in str(cmd or "").replace("\\", "/")


def find_claude() -> str:
    found = shutil.which("claude")
    if found:
        return str(Path(found).resolve()) if not IS_WIN else found
    for p in (Path.home() / ".local/bin/claude", Path.home() / ".claude/local/claude",
              Path("/opt/homebrew/bin/claude"), Path("/usr/local/bin/claude"),
              Path.home() / "AppData/Local/Programs/claude/claude.exe"):
        if p.exists():
            return str(p)
    return ""


def claude_version(claude: str) -> tuple:
    if not claude:
        return ()
    try:
        argv = ["cmd", "/c", claude] if claude.lower().endswith((".cmd", ".bat")) else [claude]
        out = subprocess.run(argv + ["--version"], capture_output=True, text=True, timeout=30).stdout
    except (OSError, subprocess.SubprocessError):
        return ()
    m = re.search(r"(\d+)\.(\d+)\.(\d+)", out or "")
    return tuple(int(x) for x in m.groups()) if m else ()


# ----------------------------------------------------------------- settings.json

def load_settings() -> dict:
    if not SETTINGS.exists() or not SETTINGS.read_text(encoding="utf-8").strip():
        return {}
    try:
        data = json.loads(SETTINGS.read_text(encoding="utf-8"))
    except ValueError as e:
        sys.exit(f"{SETTINGS} is not valid JSON ({e}). Fix it first; nothing was changed.")
    if not isinstance(data, dict):
        sys.exit(f"{SETTINGS} does not hold a JSON object; nothing was changed.")
    return data


def save_settings(data: dict) -> None:
    if SETTINGS.exists():
        backup = SETTINGS.with_name(f"settings.json.session-guard-backup-{time.strftime('%Y%m%d-%H%M%S')}")
        shutil.copy2(SETTINGS, backup)
        say(tr(f"  גיבוי של ההגדרות שלך: {backup}", f"  backup of your settings: {backup}"))
    SETTINGS.parent.mkdir(parents=True, exist_ok=True)
    tmp = SETTINGS.with_name(".settings.json.tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, SETTINGS)


def strip_hooks(settings: dict) -> None:
    hooks = settings.get("hooks")
    if not isinstance(hooks, dict):
        return
    for event in list(hooks):
        groups = []
        for g in hooks[event] if isinstance(hooks[event], list) else []:
            kept = [h for h in g.get("hooks", []) if not is_ours(h.get("command"))]
            if kept:
                groups.append(dict(g, hooks=kept))
        if groups:
            hooks[event] = groups
        else:
            hooks.pop(event)
    if not hooks:
        settings.pop("hooks", None)


def add_hooks(settings: dict, with_stop_failure: bool) -> None:
    hooks = settings.setdefault("hooks", {})
    events = ["PreToolUse", "UserPromptSubmit", "Stop", "SessionStart"]
    if with_stop_failure:
        events.append("StopFailure")
    for event in events:
        group = {"hooks": [{"type": "command", "command": command("hook"), "timeout": 15}]}
        if event == "PreToolUse":
            group = {"matcher": "*", **group}
        hooks.setdefault(event, []).append(group)


# --------------------------------------------------------------------- watchdog

def watchdog_python() -> str:
    if IS_WIN:  # pythonw.exe runs without flashing a console window every minute
        pyw = Path(sys.executable).with_name("pythonw.exe")
        return str(pyw if pyw.exists() else Path(sys.executable))
    return interpreter()


def watchdog_args() -> list:
    return [watchdog_python(), str(DEST / "scripts" / "guard.py"), "--home", str(HOME), "tick"]


def launchd_install(claude: str) -> str:
    plist_path = Path.home() / "Library" / "LaunchAgents" / f"{LABEL}.plist"
    plist_path.parent.mkdir(parents=True, exist_ok=True)
    path_dirs = [str(Path(claude).parent)] if claude else []
    path_dirs += ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"]
    with open(plist_path, "wb") as f:
        # AbandonProcessGroup: launchd would otherwise kill the sessions the watchdog starts as
        # soon as the watchdog step exits. Standard (not Background) so they aren't throttled.
        plistlib.dump({"Label": LABEL, "ProgramArguments": watchdog_args(), "StartInterval": 60,
                       "RunAtLoad": True, "ProcessType": "Standard", "AbandonProcessGroup": True,
                       "StandardOutPath": str(HOME / "watchdog.log"),
                       "StandardErrorPath": str(HOME / "watchdog.log"),
                       "EnvironmentVariables": {"PATH": ":".join(dict.fromkeys(path_dirs))}}, f)
    uid = os.getuid()
    subprocess.run(["launchctl", "bootout", f"gui/{uid}/{LABEL}"], capture_output=True)
    r = subprocess.run(["launchctl", "bootstrap", f"gui/{uid}", str(plist_path)], capture_output=True, text=True)
    if r.returncode != 0:
        r = subprocess.run(["launchctl", "load", "-w", str(plist_path)], capture_output=True, text=True)
    return (tr(f"launchd ({LABEL}), רץ כל דקה", f"launchd agent {LABEL}") if r.returncode == 0 else
            tr("launchd נכשל: ", "launchd failed: ") + (r.stderr or r.stdout).strip())


def launchd_remove() -> None:
    plist_path = Path.home() / "Library" / "LaunchAgents" / f"{LABEL}.plist"
    subprocess.run(["launchctl", "bootout", f"gui/{os.getuid()}/{LABEL}"], capture_output=True)
    if plist_path.exists():
        subprocess.run(["launchctl", "unload", str(plist_path)], capture_output=True)
        plist_path.unlink()


TASK_XML = """<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo><Description>Claude Code Session Guard watchdog (runs every minute)</Description></RegistrationInfo>
  <Triggers>
    <TimeTrigger>
      <Repetition><Interval>PT1M</Interval><StopAtDurationEnd>false</StopAtDurationEnd></Repetition>
      <StartBoundary>{start}</StartBoundary>
      <Enabled>true</Enabled>
    </TimeTrigger>
    <LogonTrigger><Enabled>true</Enabled></LogonTrigger>
  </Triggers>
  <Principals><Principal id="Author"><LogonType>InteractiveToken</LogonType><RunLevel>LeastPrivilege</RunLevel></Principal></Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings><StopOnIdleEnd>false</StopOnIdleEnd><RestartOnIdle>false</RestartOnIdle></IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT5M</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>{command}</Command>
      <Arguments>{arguments}</Arguments>
      <WorkingDirectory>{workdir}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>
"""


def schtasks_install() -> str:
    exe, *rest = watchdog_args()
    arguments = subprocess.list2cmdline(rest)
    xml = TASK_XML.format(start=time.strftime("%Y-%m-%dT%H:%M:%S"), command=escape(exe),
                          arguments=escape(arguments), workdir=escape(str(Path.home())))
    HOME.mkdir(parents=True, exist_ok=True)
    xml_path = HOME / "watchdog-task.xml"
    xml_path.write_text(xml, encoding="utf-16")  # schtasks wants UTF-16 with a BOM
    r = subprocess.run(["schtasks", "/Create", "/TN", TASK, "/XML", str(xml_path), "/F"],
                       capture_output=True, text=True)
    return (tr(f"מתזמן המשימות של Windows ({TASK}), רץ כל דקה", f"Task Scheduler task {TASK}") if r.returncode == 0 else
            tr("מתזמן המשימות נכשל: ", "Task Scheduler failed: ") + (r.stderr or r.stdout).strip())


def schtasks_remove() -> None:
    subprocess.run(["schtasks", "/Delete", "/TN", TASK, "/F"], capture_output=True)


def systemd_dir() -> Path:
    return Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config") / "systemd" / "user"


def linux_install() -> str:
    q = lambda s: '"' + str(s).replace('"', '\\"') + '"'  # noqa: E731
    if shutil.which("systemctl") and subprocess.run(["systemctl", "--user", "show-environment"],
                                                     capture_output=True).returncode == 0:
        d = systemd_dir()
        d.mkdir(parents=True, exist_ok=True)
        (d / f"{UNIT}.service").write_text(
            "[Unit]\nDescription=Claude Code Session Guard watchdog\n\n[Service]\nType=oneshot\n"
            # KillMode=process: keep the sessions the watchdog starts alive after it exits
            f"KillMode=process\nExecStart={' '.join(q(a) for a in watchdog_args())}\n", encoding="utf-8")
        (d / f"{UNIT}.timer").write_text(
            "[Unit]\nDescription=Run the Claude Code Session Guard watchdog every minute\n\n"
            "[Timer]\nOnBootSec=60\nOnUnitActiveSec=60\nAccuracySec=15s\n\n[Install]\nWantedBy=timers.target\n",
            encoding="utf-8")
        subprocess.run(["systemctl", "--user", "daemon-reload"], capture_output=True)
        r = subprocess.run(["systemctl", "--user", "enable", "--now", f"{UNIT}.timer"], capture_output=True, text=True)
        if r.returncode == 0:
            return tr(f"טיימר systemd ({UNIT}.timer), רץ כל דקה", f"systemd user timer {UNIT}.timer")
    if shutil.which("crontab"):
        cur = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
        lines = [ln for ln in cur.splitlines() if CRON_TAG not in ln]
        lines.append(f"* * * * * {' '.join(shlex.quote(a) for a in watchdog_args())} >/dev/null 2>&1 {CRON_TAG}")
        r = subprocess.run(["crontab", "-"], input="\n".join(lines) + "\n", capture_output=True, text=True)
        if r.returncode == 0:
            return tr("משימת cron, כל דקה", "cron job (every minute)")
    return tr("לא נמצא מתזמן (אין systemd למשתמש ואין crontab): ההמשך האוטומטי צריך אחד",
              "no scheduler found (no systemd user session, no crontab): auto-resume needs one")


def linux_remove() -> None:
    if shutil.which("systemctl"):
        subprocess.run(["systemctl", "--user", "disable", "--now", f"{UNIT}.timer"], capture_output=True)
        for ext in ("service", "timer"):
            p = systemd_dir() / f"{UNIT}.{ext}"
            if p.exists():
                p.unlink()
        subprocess.run(["systemctl", "--user", "daemon-reload"], capture_output=True)
    if shutil.which("crontab"):
        cur = subprocess.run(["crontab", "-l"], capture_output=True, text=True).stdout
        if CRON_TAG in cur:
            kept = [ln for ln in cur.splitlines() if CRON_TAG not in ln]
            subprocess.run(["crontab", "-"], input="\n".join(kept) + "\n", capture_output=True, text=True)


def install_watchdog(claude: str) -> str:
    if IS_MAC:
        return launchd_install(claude)
    if IS_WIN:
        return schtasks_install()
    return linux_install()


def remove_watchdog() -> None:
    if IS_MAC:
        launchd_remove()
    elif IS_WIN:
        schtasks_remove()
    else:
        linux_remove()


# ------------------------------------------------------------------ main steps

def copy_skill() -> None:
    if SRC.resolve() == DEST.resolve():
        return
    if DEST.exists():
        shutil.rmtree(DEST)
    shutil.copytree(SRC, DEST, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "evals", "*-workspace"))


def write_config(args, claude: str, chain: dict | None) -> dict:
    path = HOME / "config.json"
    cfg = {}
    if path.exists():
        try:
            cfg = json.loads(path.read_text(encoding="utf-8"))
        except ValueError:
            say(tr(f"  לתשומת לב: {path} לא היה JSON תקין; הוא נכתב מחדש", f"  note: {path} was not valid JSON; starting it again"))
    cfg["python"], cfg["claude_bin"], cfg["shell"] = fwd(interpreter()), claude, shell_style()
    if args.lang:
        cfg["language"] = args.lang
    if args.resume_mode:
        cfg.setdefault("resume", {})["mode"] = args.resume_mode
    if chain is not None:
        cfg.setdefault("statusline", {})["chain_command"] = chain.get("command", "")
        if "padding" in chain:
            cfg["statusline"]["chain_padding"] = chain["padding"]
    if args.phone:
        ph = cfg.setdefault("phone", {})
        ph["enabled"] = True
        ph["ntfy_topic"] = ph.get("ntfy_topic") or f"claude-guard-{secrets.token_hex(8)}"
        ph.setdefault("ntfy_server", "https://ntfy.sh")
        if args.alerts:
            cfg.setdefault("notify", {})["ntfy_topic"] = ph["ntfy_topic"] + "-alerts"
    HOME.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cfg, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return cfg


def install(args) -> int:
    say(tr(f"Session Guard: מתקין עבור {CLAUDE_DIR}", f"Session Guard: installing for {CLAUDE_DIR}"))
    copy_skill()
    say(tr(f"  הסקיל: {DEST}", f"  skill: {DEST}"))
    claude = find_claude()
    version = claude_version(claude)
    if not claude:
        say(tr("  אזהרה: הפקודה claude לא נמצאה, וההמשך האוטומטי צריך אותה. להתקין את Claude Code ולהריץ את ההתקנה שוב.",
               "  warning: the `claude` command was not found; automatic resume needs it. Install Claude Code, then run this again."))
    settings = load_settings()
    if settings.get("disableAllHooks"):
        say(tr("  אזהרה: בהגדרות שלך מופעל \"disableAllHooks\", ולכן ה-hooks של השמירה לא ירוצו עד שיכבו אותו",
               "  warning: \"disableAllHooks\" is on in your settings, so the guard's hooks won't run until you turn it off"))
    old_sl = settings.get("statusLine")
    chain = None
    if args.statusline and isinstance(old_sl, dict) and old_sl.get("command") and not is_ours(old_sl.get("command")):
        chain = old_sl  # keep the user's own status line running in front of ours
    strip_hooks(settings)
    add_hooks(settings, with_stop_failure=bool(version) and version >= (2, 1, 200))
    if args.statusline:
        sl = {"type": "command", "command": command("statusline")}
        if isinstance(old_sl, dict) and "padding" in old_sl:
            sl["padding"] = old_sl["padding"]
        settings["statusLine"] = sl
    cfg = write_config(args, claude, chain)
    save_settings(settings)
    say(tr(f"  hooks{' ושורת סטטוס' if args.statusline else ''}: {SETTINGS}",
           f"  hooks{' and status line' if args.statusline else ''}: {SETTINGS}"))
    if chain:
        say(tr(f"  שורת הסטטוס הקודמת שלך ממשיכה לפעול לפני השמירה: {chain.get('command')}",
               f"  your status line keeps running in front of the guard: {chain.get('command')}"))
    if args.statusline is False:
        say(tr("  לתשומת לב: בלי שורת הסטטוס השמירה לא רואה את אחוזי השימוש",
               "  note: without the status line the guard cannot see your usage numbers"))
    say(tr("  שומר הרקע: ", "  watchdog: ") + (install_watchdog(claude) if args.scheduler else
                                              tr("דולג (--no-scheduler)", "skipped (--no-scheduler)")))
    say(tr(f"  נתונים: {HOME}", f"  data: {HOME}"))
    subprocess.run([sys.executable, str(DEST / "scripts" / "guard.py"), "--home", str(HOME), "status"])
    if cfg.get("phone", {}).get("enabled"):
        url = f"{cfg['phone']['ntfy_server'].rstrip('/')}/{cfg['phone']['ntfy_topic']}"
        say(tr("\nסוללת הטלפון: שתי אוטומציות בטלפון (כשהסוללה יורדת ל-5% וכשהיא עולה ל-10%) פותחות את הכתובת הזאת,",
               "\nPhone battery: two phone automations (battery drops to 5%, rises to 10%) open this address,"))
        say(tr("עם אחוז הסוללה בסוף:", "with the battery level at the end:"))
        say(f"    {url}/publish?message=<{tr('אחוז הסוללה', 'battery level')}>")
        say(tr(f"  צעד אחר צעד: {DEST / 'references' / 'phone.md'}", f"  Step by step: {DEST / 'references' / 'phone.md'}"))
        if cfg.get("notify", {}).get("ntfy_topic"):
            say(tr(f"  התראות לטלפון: להירשם לנושא {cfg['notify']['ntfy_topic']} באפליקציית ntfy.",
                   f"  Alerts on the phone: subscribe to the topic {cfg['notify']['ntfy_topic']} in the ntfy app."))
    say(tr("\nסיימתי. צריך לפתוח שיחה חדשה של Claude Code כדי שה-hooks ייטענו.",
           "\nDone. Open a NEW Claude Code session so it loads the hooks."))
    sim = " ".join(shlex.quote(a) for a in (sys.executable, str(DEST / 'scripts' / 'guard.py'), 'simulate', '--battery', '4'))
    say(tr("בדיקה בטוחה:  ", "Try it safely:  ") + sim)
    say(tr("ואז לבקש מ-Claude משימה קטנה כלשהי; לביטול הבדיקה: simulate --clear",
           "then ask Claude for any small task; clear the test with `... simulate --clear`."))
    return 0


def uninstall(args) -> int:
    say(tr("Session Guard: מסיר", "Session Guard: removing"))
    settings = load_settings()
    sl = settings.get("statusLine")
    if isinstance(sl, dict) and is_ours(sl.get("command")):
        cfg = {}
        try:
            cfg = json.loads((HOME / "config.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            pass
        chain = (cfg.get("statusline") or {}).get("chain_command")
        if chain:
            restored = {"type": "command", "command": chain}
            if "chain_padding" in cfg.get("statusline", {}):
                restored["padding"] = cfg["statusline"]["chain_padding"]
            settings["statusLine"] = restored
            say(tr(f"  שורת הסטטוס הקודמת שוחזרה: {chain}", f"  status line restored: {chain}"))
        else:
            settings.pop("statusLine", None)
    strip_hooks(settings)
    save_settings(settings)
    remove_watchdog()
    say(tr("  ה-hooks, שורת הסטטוס ושומר הרקע הוסרו", "  hooks, status line and watchdog removed"))
    if SRC.resolve() != DEST.resolve() and DEST.exists():
        shutil.rmtree(DEST)
        say(tr(f"  נמחק: {DEST}", f"  removed {DEST}"))
    if args.purge and HOME.exists():
        shutil.rmtree(HOME)
        say(tr(f"  נמחק: {HOME}", f"  deleted {HOME}"))
    else:
        say(tr(f"  מסמכי ההעברה והלקחים נשארו ב-{HOME}", f"  kept your handoffs and lessons in {HOME}"))
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Install Session Guard for Claude Code")
    ap.add_argument("--uninstall", action="store_true")
    ap.add_argument("--purge", action="store_true", help="with --uninstall: also delete handoffs and lessons")
    ap.add_argument("--phone", action="store_true", help="set up the phone battery channel (ntfy)")
    ap.add_argument("--alerts", action="store_true", help="with --phone: also push pause/resume alerts to the phone")
    ap.add_argument("--lang", choices=["he", "en"], help="language of the notifications (default: he)")
    ap.add_argument("--resume-mode", choices=["background", "terminal", "none"],
                    help="how paused work is started again (default: background)")
    ap.add_argument("--no-scheduler", dest="scheduler", action="store_false", help="don't register the watchdog")
    ap.add_argument("--no-statusline", dest="statusline", action="store_false",
                    help="don't touch the status line (usage numbers then stay unknown)")
    args = ap.parse_args()
    global LANG
    LANG = args.lang or "he"
    return uninstall(args) if args.uninstall else install(args)


if __name__ == "__main__":
    sys.exit(main())
