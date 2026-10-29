#!/usr/bin/env python3
"""Session Guard: pause Claude Code work before the battery or the plan usage runs
out, and pick the work up again in fresh sessions afterwards.

Entry points wired up by install.py:
  hook        Claude Code hook (PreToolUse, UserPromptSubmit, Stop, StopFailure,
              SessionStart). While a pause is on, each busy session is told to
              write a handoff and is then halted; new prompts are held back.
  statusline  Claude Code statusLine command. Records the `rate_limits` numbers
              (5-hour and weekly usage) that Claude Code passes to the status line.
  tick        Watchdog step, run every minute by launchd / Task Scheduler /
              systemd. Reads the batteries, polls the phone channel and, when the
              pause ends, starts one new background session per handoff.

`guard.py --help` lists the maintenance commands (status, pause, resume, ...).
State lives in ~/.claude/session-guard/ (SESSION_GUARD_HOME overrides it).
Standard library only; Python 3.8+.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import platform
import re
import shlex
import shutil
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

VERSION = "1.0.0"
SYSTEM = platform.system()  # Darwin | Windows | Linux
SCRIPT = Path(__file__).resolve()
SKILL_DIR = SCRIPT.parent.parent
UA = f"session-guard/{VERSION}"
WINDOWS = ("five_hour", "seven_day")
WINDOW_LABEL = {"five_hour": "5-hour", "seven_day": "weekly"}


def _guard_home() -> Path:
    if os.environ.get("SESSION_GUARD_HOME"):
        return Path(os.environ["SESSION_GUARD_HOME"]).expanduser()
    base = os.environ.get("CLAUDE_CONFIG_DIR")
    return (Path(base).expanduser() if base else Path.home() / ".claude") / "session-guard"


def set_home(home: Path) -> None:
    """Point every state file at `home` (the watchdog passes --home: schedulers don't
    carry the environment variables a terminal has)."""
    global HOME, CONFIG_FILE, STATE_FILE, USAGE_FILE, BATTERY_FILE, PHONE_FILE, SIM_FILE
    global HANDOFF_DIR, INDEX_FILE, LESSONS_FILE, LOG_FILE, LOCK_FILE
    HOME = Path(home).expanduser()
    CONFIG_FILE, STATE_FILE, USAGE_FILE = HOME / "config.json", HOME / "state.json", HOME / "usage.json"
    BATTERY_FILE, PHONE_FILE, SIM_FILE = HOME / "battery.json", HOME / "phone.json", HOME / "simulate.json"
    HANDOFF_DIR = HOME / "handoffs"
    INDEX_FILE = HANDOFF_DIR / "index.json"
    LESSONS_FILE, LOG_FILE, LOCK_FILE = HOME / "lessons.md", HOME / "guard.log", HOME / ".lock"


set_home(_guard_home())

DEFAULTS = {
    "enabled": True,
    "language": "he",  # notifications: "he" or "en"
    "battery": {"enabled": True, "pause_at": 5, "resume_at": 10, "checkpoint_at": 10,
                "ignore_when_charging": True},
    "phone": {"enabled": False, "pause_at": 5, "resume_at": 10,
              "ntfy_server": "https://ntfy.sh", "ntfy_topic": "", "poll_seconds": 60},
    # The pause ends right at the reset: Claude Code's own autoContinueAtUsageLimit resumes a
    # session that hit the hard limit at that moment, and its prompt must not be held back.
    "usage": {"enabled": True, "pause_at": 95, "checkpoint_at": 90, "windows": list(WINDOWS),
              "resume_delay_minutes": 0, "limit_hit_retry_minutes": 30},
    "handoff": {"tool_budget": 30, "minutes_budget": 8},
    "resume": {"auto": True, "mode": "background", "max_sessions": 5, "permission_mode": "",
               "include_blocked_prompts": True},
    "override_minutes": 60,
    "notify": {"desktop": True, "ntfy_topic": ""},
    "statusline": {"show": True, "chain_command": ""},
    "python": "",
    "claude_bin": "",
    "shell": "",  # how commands are shown to Claude: "bash" or "powershell"
}

# Records (handoff files) move through these states. Only "pending" records that
# belong to an automatic pause are started again by the watchdog.
OPEN_STATES = ("pending", "in_progress", "resumed")


# ---------------------------------------------------------------- small utilities

def now() -> float:
    return time.time()


def log(msg: str) -> None:
    try:
        HOME.mkdir(parents=True, exist_ok=True)
        if LOG_FILE.exists() and LOG_FILE.stat().st_size > 1_000_000:
            os.replace(LOG_FILE, LOG_FILE.with_name("guard.log.1"))
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%Y-%m-%d %H:%M:%S')} {msg}\n")
    except OSError:
        pass


def read_json(path: Path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return default


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    for _ in range(20):
        try:
            os.replace(tmp, path)
            return
        except PermissionError:  # Windows: the target is open in another process
            time.sleep(0.05)
    os.replace(tmp, path)


def read_text(path: Path) -> str:
    try:
        return Path(path).read_text(encoding="utf-8", errors="replace").strip()
    except (OSError, TypeError, ValueError):
        return ""


class Lock:
    """Cross-process lock: a lock file created with O_EXCL. Hooks run in many Claude
    Code processes at once and this keeps their state updates from interleaving.
    If the lock can't be had within `timeout`, carry on without it: a guard that
    stalls Claude Code is worse than one rare lost update."""

    def __init__(self, timeout: float = 3.0, stale: float = 20.0):
        self.timeout, self.stale, self.held = timeout, stale, False

    def __enter__(self):
        HOME.mkdir(parents=True, exist_ok=True)
        deadline = time.time() + self.timeout
        while True:
            try:
                fd = os.open(str(LOCK_FILE), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.write(fd, str(os.getpid()).encode())
                os.close(fd)
                self.held = True
                return self
            except (FileExistsError, PermissionError):
                try:
                    if time.time() - LOCK_FILE.stat().st_mtime > self.stale:
                        LOCK_FILE.unlink()
                        continue
                except OSError:
                    pass
            if time.time() >= deadline:
                log("lock timeout; continuing without it")
                return self
            time.sleep(0.025)

    def __exit__(self, *exc):
        if self.held:
            try:
                LOCK_FILE.unlink()
            except OSError:
                pass
            self.held = False


def deep_merge(base: dict, over: dict) -> dict:
    out = dict(base)
    for k, v in (over or {}).items():
        out[k] = deep_merge(out[k], v) if isinstance(v, dict) and isinstance(out.get(k), dict) else v
    return out


def load_config() -> dict:
    over = read_json(CONFIG_FILE, {})
    return deep_merge(DEFAULTS, over if isinstance(over, dict) else {})


def empty_state() -> dict:
    return {"version": 1, "mode": "running", "reasons": {}, "episode": None, "last_episode": None,
            "sessions": {}, "checkpoints": {}, "paths": {}, "override": None,
            "resume_pending": False, "last_tick": 0}


def load_state() -> dict:
    st = read_json(STATE_FILE)
    base = empty_state()
    if isinstance(st, dict):
        base.update(st)
    return base


def save_state(state: dict) -> None:
    write_json(STATE_FILE, state)


def load_index() -> dict:
    idx = read_json(INDEX_FILE)
    if not isinstance(idx, dict) or not isinstance(idx.get("records"), dict):
        idx = {"records": {}}
    return idx


def save_index(idx: dict) -> None:
    write_json(INDEX_FILE, idx)


def override_active(state: dict, t: float) -> bool:
    o = state.get("override") or {}
    return float(o.get("until", 0)) > t


def git_bash() -> str:
    """Path of Git Bash on Windows (Claude Code runs hook and status line commands
    through it when it is installed), or ""."""
    if SYSTEM != "Windows":
        return ""
    cand = [os.environ.get("CLAUDE_CODE_GIT_BASH_PATH", "")]
    git = shutil.which("git")
    if git:
        root = Path(git).resolve().parent.parent
        cand += [str(root / "bin" / "bash.exe"), str(root.parent / "bin" / "bash.exe")]
    cand += [r"C:\Program Files\Git\bin\bash.exe", r"C:\Program Files (x86)\Git\bin\bash.exe"]
    return next((c for c in cand if c and Path(c).is_file()), "")


def guard_cmd(cfg: dict, *args: str) -> str:
    """The command line Claude should run for `guard.py <args>` on this machine."""
    py = cfg.get("python") or sys.executable or "python3"
    script = str(SCRIPT)
    if SYSTEM == "Windows":
        py, script = py.replace("\\", "/"), script.replace("\\", "/")
    line = " ".join(shlex.quote(p) for p in (py, script, *args))
    style = cfg.get("shell") or ("bash" if SYSTEM != "Windows" or git_bash() else "powershell")
    return "& " + line if style == "powershell" else line


def _no_window() -> dict:
    return {"creationflags": 0x08000000} if SYSTEM == "Windows" else {}  # CREATE_NO_WINDOW


# ------------------------------------------------------------------- formatting

WEEKDAYS = {"en": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "he": ["יום ב׳", "יום ג׳", "יום ד׳", "יום ה׳", "יום ו׳", "שבת", "יום א׳"]}


def fmt_time(ts: float, lang: str = "en") -> str:
    lt, today = time.localtime(ts), time.localtime()
    hm = time.strftime("%H:%M", lt)
    if (lt.tm_year, lt.tm_yday) == (today.tm_year, today.tm_yday):
        return hm
    if abs(ts - time.time()) < 6 * 86400:
        return f"{WEEKDAYS.get(lang, WEEKDAYS['en'])[lt.tm_wday]} {hm}"
    return time.strftime("%Y-%m-%d %H:%M", lt)


def lang_of(cfg: dict) -> str:
    """Language of everything the user sees (and of the notes Claude is asked to write)."""
    return "en" if cfg.get("language") == "en" else "he"


def fmt_ago(seconds: float, lang: str = "en") -> str:
    s = int(max(0, seconds))
    he = lang == "he"
    if s < 90:
        return f"{s} שנ׳" if he else f"{s}s"
    if s < 5400:
        return f"{s // 60} דק׳" if he else f"{s // 60}m"
    if s < 172800:
        return f"{s // 3600} שע׳ {(s % 3600) // 60} דק׳" if he else f"{s // 3600}h{(s % 3600) // 60:02d}m"
    return f"{s // 86400} ימים" if he else f"{s // 86400}d"


def reason_text(key: str, r: dict, cfg: dict, lang: str = "en") -> tuple:
    """(why, until) phrases for one pause reason."""
    he = lang == "he"
    v = r.get("value")
    pct = f"{v:.0f}%" if isinstance(v, (int, float)) else ""
    if key in ("battery", "phone"):
        back = cfg[key]["resume_at"]
        if key == "battery":
            return ((f"סוללת המחשב {pct}", f"כשסוללת המחשב תחזור ל-{back}%") if he else
                    (f"laptop battery {pct}", f"when the laptop battery is back at {back}%"))
        return ((f"סוללת הטלפון {pct}", f"כשסוללת הטלפון תחזור ל-{back}%") if he else
                (f"phone battery {pct}", f"when the phone battery is back at {back}%"))
    if key in ("usage_five_hour", "usage_seven_day"):
        at = fmt_time(float(r.get("resets_at") or 0) + cfg["usage"]["resume_delay_minutes"] * 60, lang)
        if key == "usage_five_hour":
            why = f"מכסת 5 השעות {pct}" if he else f"5-hour usage {pct}"
        else:
            why = f"המכסה השבועית {pct}" if he else f"weekly usage {pct}"
        return why, (f"אחרי איפוס המכסה ({at})" if he else f"after the usage resets ({at})")
    if key == "usage_limit":
        at = fmt_time(float(r.get("retry_at") or 0), lang)
        return (("מכסת השימוש נגמרה", f"בניסיון חוזר ב-{at}") if he else
                ("usage limit reached", f"with a retry at {at}"))
    if key == "manual":
        return (("עצירה ידנית", "אחרי הרצת /session-guard resume") if he else
                ("manual pause", "when you run /session-guard resume"))
    return key, ""


def summarize(state: dict, cfg: dict, lang: str = "") -> tuple:
    lang = lang or lang_of(cfg)
    whys, untils = [], []
    for key, r in sorted((state.get("reasons") or {}).items()):
        why, until = reason_text(key, r, cfg, lang)
        whys.append(why)
        if until:
            untils.append(until)
    return ", ".join(whys), (" וגם " if lang == "he" else " and ").join(untils)


# --------------------------------------------------------------------- readings

def load_sim(t: float) -> dict:
    """Values set with `guard.py simulate`; they override real readings until they expire."""
    sim = read_json(SIM_FILE)
    if not isinstance(sim, dict):
        return {}
    if float(sim.get("expires_at", 0)) < t:
        try:
            SIM_FILE.unlink()
        except OSError:
            pass
        return {}
    return sim


# A battery reading is {"percent", "on_ac", "status"}; NO_BATTERY means the computer has
# none (a desktop); None means it could not be read this time.
NO_BATTERY = {"percent": None, "on_ac": True, "status": "no battery"}


def parse_pmset(out: str):
    """`pmset -g batt` (macOS) -> reading."""
    lines = out.splitlines()
    if not lines:
        return None
    on_ac = "AC Power" in lines[0]
    for line in lines:
        if "InternalBattery" not in line:
            continue
        m = re.search(r"(\d{1,3})%\s*;\s*([^;]*)", line)
        if m:
            status = m.group(2).strip().lower()
            return {"percent": int(m.group(1)), "status": status,
                    "on_ac": on_ac or status in ("charging", "charged", "finishing charge")}
    return dict(NO_BATTERY)


def _battery_windows():
    import ctypes
    from ctypes import wintypes

    class PowerStatus(ctypes.Structure):
        _fields_ = [("ACLineStatus", ctypes.c_ubyte), ("BatteryFlag", ctypes.c_ubyte),
                    ("BatteryLifePercent", ctypes.c_ubyte), ("SystemStatusFlag", ctypes.c_ubyte),
                    ("BatteryLifeTime", wintypes.DWORD), ("BatteryFullLifeTime", wintypes.DWORD)]

    s = PowerStatus()
    if not ctypes.windll.kernel32.GetSystemPowerStatus(ctypes.byref(s)):
        return None
    if s.BatteryFlag == 128:
        return dict(NO_BATTERY)
    if s.BatteryLifePercent > 100:  # unknown right now
        return None
    on_ac = s.ACLineStatus == 1
    charging = s.BatteryFlag != 255 and bool(s.BatteryFlag & 8)
    return {"percent": int(s.BatteryLifePercent), "on_ac": on_ac or charging,
            "status": "charging" if charging else ("on power" if on_ac else "discharging")}


def battery_linux(base: Path):
    if not base.is_dir():
        return dict(NO_BATTERY)
    caps, statuses, mains = [], [], False
    for d in sorted(base.iterdir()):
        kind = read_text(d / "type")
        if kind == "Battery":
            if read_text(d / "scope").lower() == "device":  # mouse, headset, ...
                continue
            cap = read_text(d / "capacity")
            if cap.isdigit():
                caps.append(int(cap))
                statuses.append(read_text(d / "status").lower())
        elif kind == "Mains" and read_text(d / "online") == "1":
            mains = True
    if not caps:
        return dict(NO_BATTERY)
    charging = any(s in ("charging", "full", "not charging") for s in statuses)
    return {"percent": round(sum(caps) / len(caps)), "on_ac": mains or charging,
            "status": ",".join(statuses)}


def read_battery():
    try:
        if SYSTEM == "Darwin":
            out = subprocess.run(["pmset", "-g", "batt"], capture_output=True, text=True, timeout=5).stdout
            return parse_pmset(out)
        if SYSTEM == "Windows":
            return _battery_windows()
        if SYSTEM == "Linux":
            return battery_linux(Path("/sys/class/power_supply"))
    except Exception as e:  # never let a battery quirk break a hook
        log(f"battery read failed: {e!r}")
    return None


def get_battery(t: float, max_age: float = 45.0):
    sim = load_sim(t)
    if "battery" in sim:
        return sim["battery"]
    cache = read_json(BATTERY_FILE)
    if isinstance(cache, dict) and 0 <= t - float(cache.get("at", 0)) <= max_age:
        return cache.get("reading")
    reading = read_battery()
    try:
        write_json(BATTERY_FILE, {"at": t, "reading": reading})
    except OSError:
        pass
    return reading


def parse_phone_message(text: str):
    """Battery level from a phone report: "phone:5", "5", "5%", "0.05" or {"battery": 5}."""
    text = (text or "").strip()
    val = None
    try:
        obj = json.loads(text)
        if isinstance(obj, dict):
            val = next((obj[k] for k in ("battery", "level", "percent", "phone") if k in obj), None)
        elif isinstance(obj, (int, float)):
            val = obj
    except ValueError:
        pass
    if val is None:
        m = re.search(r"(\d{1,3}(?:[.,]\d+)?)", text)
        if not m:
            return None
        val = m.group(1).replace(",", ".")
    try:
        num = float(val)
    except (TypeError, ValueError):
        return None
    if num < 1 and "." in str(val):  # Shortcuts can hand over 0.05 for 5%
        num *= 100
    return int(round(num)) if 0 <= num <= 100 else None


def poll_phone(cfg: dict, t: float) -> dict:
    """Fetch the newest phone battery report from the ntfy topic (tick only)."""
    pc = cfg["phone"]
    cur = read_json(PHONE_FILE, {}) or {}
    if not pc.get("enabled") or not pc.get("ntfy_topic"):
        return cur
    if t - float(cur.get("polled_at", 0)) < max(20, int(pc.get("poll_seconds", 60))) - 5:
        return cur
    since = cur.get("last_id") or "12h"
    url = (f"{pc['ntfy_server'].rstrip('/')}/{urllib.parse.quote(pc['ntfy_topic'])}/json"
           f"?poll=1&since={urllib.parse.quote(str(since))}")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        with urllib.request.urlopen(req, timeout=10) as r:
            body = r.read().decode("utf-8", "replace")
        latest = None
        for line in body.splitlines():
            try:
                msg = json.loads(line)
            except ValueError:
                continue
            if not isinstance(msg, dict) or msg.get("event") != "message":
                continue
            level = parse_phone_message(msg.get("message", ""))
            if level is not None and (latest is None or msg.get("time", 0) >= latest[1]):
                latest = (level, float(msg.get("time") or t), msg.get("id"))
        cur.update({"polled_at": t, "poll_error": None})
        if latest and latest[1] >= float(cur.get("at", 0)):
            cur.update({"percent": latest[0], "at": latest[1], "last_id": latest[2]})
    except Exception as e:
        cur.update({"polled_at": t, "poll_error": str(e)[:200]})
        log(f"phone poll failed: {e!r}")
    write_json(PHONE_FILE, cur)
    return cur


def get_phone(t: float):
    sim = load_sim(t)
    if "phone" in sim:
        return sim["phone"]
    p = read_json(PHONE_FILE)
    return p if isinstance(p, dict) and p.get("percent") is not None else None


def _epoch(v):
    if isinstance(v, (int, float)):
        return float(v) / (1000.0 if v > 1e11 else 1.0)  # tolerate milliseconds
    if isinstance(v, str) and v.strip():
        try:
            return float(v)
        except ValueError:
            pass
        try:
            from datetime import datetime
            return datetime.fromisoformat(v.strip().replace("Z", "+00:00")).timestamp()
        except ValueError:
            return None
    return None


def get_usage(t: float) -> dict:
    """Valid usage windows: {"five_hour": {"used": 42.0, "resets_at": epoch}, ...}.
    A reading whose window has already reset says nothing about the new window."""
    sim = load_sim(t)
    src = sim["usage"] if "usage" in sim else (read_json(USAGE_FILE, {}) or {})
    out = {}
    for w in WINDOWS:
        r = src.get(w)
        if not isinstance(r, dict):
            continue
        used, resets = r.get("used_percentage"), _epoch(r.get("resets_at"))
        if isinstance(used, (int, float)) and resets and t < resets:
            out[w] = {"used": float(used), "resets_at": resets,
                      "captured_at": float(src.get("captured_at") or t)}
    return out


def readings(cfg: dict, t: float, battery_max_age: float = 45.0) -> dict:
    return {
        "battery": get_battery(t, battery_max_age) if cfg["battery"].get("enabled") else None,
        "phone": get_phone(t) if cfg["phone"].get("enabled") else None,
        "usage": get_usage(t) if cfg["usage"].get("enabled") else {},
    }


# ------------------------------------------------------------------- evaluation

def _eval_level(reasons: dict, key: str, c: dict, reading, t: float) -> None:
    """Battery-style reason: starts at <= pause_at, ends only at >= resume_at."""
    if not c.get("enabled"):
        reasons.pop(key, None)
        return
    if not reading:
        return  # couldn't read it this time: keep things as they are
    if reading.get("percent") is None:  # no battery at all (desktop), or the test simulation ended
        reasons.pop(key, None)
        return
    pct = int(reading["percent"])
    cur = reasons.get(key)
    if cur:
        if pct >= c["resume_at"]:
            reasons.pop(key)
        elif cur.get("value") != pct:
            cur["value"] = pct
    elif pct <= c["pause_at"]:
        if key == "battery" and c.get("ignore_when_charging", True) and reading.get("on_ac"):
            return  # plugged in: it is not going to die
        if key == "phone" and t - float(reading.get("at") or t) > 24 * 3600:
            return  # a day-old report is no reason to stop
        reasons[key] = {"since": t, "value": pct}


def evaluate(cfg: dict, state: dict, rd: dict, t: float) -> bool:
    """Update state["reasons"] (and the mode) from the readings. True if anything changed."""
    reasons = state.setdefault("reasons", {})
    before = json.dumps(reasons, sort_keys=True)
    _eval_level(reasons, "battery", cfg["battery"], rd.get("battery"), t)
    _eval_level(reasons, "phone", cfg["phone"], rd.get("phone"), t)
    uc = cfg["usage"]
    usage = rd.get("usage") or {}
    for w in WINDOWS:
        key, r = "usage_" + w, usage.get(w)
        if not uc.get("enabled") or w not in uc.get("windows", WINDOWS):
            reasons.pop(key, None)
            continue
        cur = reasons.get(key)
        if cur:
            resets = float(cur.get("resets_at") or 0)
            if t >= resets + uc.get("resume_delay_minutes", 2) * 60:
                reasons.pop(key)
            elif r and r["resets_at"] > resets + 60 and r["used"] < uc["pause_at"]:
                reasons.pop(key)  # the new window has already reported a low number
            elif r and abs(r["resets_at"] - resets) <= 60 and r["used"] > float(cur.get("value") or 0):
                cur["value"] = r["used"]
        elif r and r["used"] >= uc["pause_at"]:
            reasons[key] = {"since": t, "value": r["used"], "resets_at": r["resets_at"]}
    lim = reasons.get("usage_limit")
    if lim and (not uc.get("enabled") or t >= float(lim.get("retry_at", 0))):
        reasons.pop("usage_limit")
    changed = json.dumps(reasons, sort_keys=True) != before
    return apply_mode(state, t) or changed


def apply_mode(state: dict, t: float) -> bool:
    was = state.get("mode", "running")
    mode = "paused" if state.get("reasons") else "running"
    if mode == was:
        return False
    state["mode"] = mode
    if mode == "paused":
        state["episode"] = {"id": time.strftime("%Y%m%d-%H%M%S", time.localtime(t)),
                            "started_at": t, "notified": False}
        state["sessions"] = {}
        log(f"pause started: {', '.join(sorted(state['reasons']))}")
    else:
        # Sessions stay listed: one still writing its handoff gets it registered (and
        # resumed) when it finishes, even though the pause is already over.
        state["last_episode"] = dict(state.get("episode") or {}, ended_at=t)
        state["episode"] = None
        state["resume_pending"] = True
        log("pause ended")
    return True


def checkpoint_keys(cfg: dict, rd: dict, t: float) -> list:
    """Early warnings: (key, label) pairs; each session is asked once per key to save
    a checkpoint handoff, so a hard stop later still leaves notes behind."""
    out, he = [], lang_of(cfg) == "he"
    bc, b = cfg["battery"], rd.get("battery")
    if (bc.get("enabled") and b and b.get("percent") is not None and not b.get("on_ac")
            and bc["pause_at"] < b["percent"] <= bc.get("checkpoint_at", 0)):
        out.append(("battery@" + time.strftime("%Y%m%d", time.localtime(t)),
                    f"סוללת המחשב {b['percent']}% (העבודה נעצרת ב-{bc['pause_at']}%)" if he else
                    f"laptop battery {b['percent']}% (Claude work pauses at {bc['pause_at']}%)"))
    uc = cfg["usage"]
    if uc.get("enabled") and uc.get("checkpoint_at"):
        for w, r in sorted((rd.get("usage") or {}).items()):
            if uc["checkpoint_at"] <= r["used"] < uc["pause_at"]:
                name = ("מכסת 5 השעות" if w == "five_hour" else "המכסה השבועית") if he else f"{WINDOW_LABEL[w]} usage"
                out.append((f"{w}@{int(r['resets_at'])}",
                            f"{name} {r['used']:.0f}% (העבודה נעצרת ב-{uc['pause_at']}%)" if he else
                            f"{name} {r['used']:.0f}% (Claude work pauses at {uc['pause_at']}%)"))
    return out


# --------------------------------------------------------------------- handoffs

def project_slug(cwd: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(cwd or "project").name).strip("-.")
    return slug[:40] or "project"


def handoff_path_for(state: dict, sid: str, cwd: str, t: float) -> Path:
    """The handoff file for a session: the same one for its checkpoint and its final
    handoff, and a new one once the old one has been picked up. A session that is
    continuing a handoff updates that same file, so a task keeps one record however
    often it is paused."""
    paths = state.setdefault("paths", {})
    HANDOFF_DIR.mkdir(parents=True, exist_ok=True)
    records = load_index()["records"]
    for rec in records.values():
        if rec.get("status") == "in_progress" and rec.get("claimed_by") == sid and rec.get("file"):
            paths[sid] = {"path": rec["file"], "cwd": cwd, "at": t}
            return Path(rec["file"])
    ent = paths.get(sid)
    if ent:
        p = Path(ent["path"])
        rec = records.get(p.stem)
        if not rec or rec.get("status") in ("pending", "checkpoint"):
            ent["at"] = t
            return p
    p = HANDOFF_DIR / f"{time.strftime('%Y%m%d-%H%M', time.localtime(t))}-{project_slug(cwd)}-{sid[:8]}.md"
    paths[sid] = {"path": str(p), "cwd": cwd, "at": t}
    for k in [k for k, v in paths.items() if t - float(v.get("at", t)) > 30 * 86400]:
        paths.pop(k, None)
    return p


LESSONS_HEADING = re.compile(
    r"^(#{2,6})\s*(lessons?\s+learned|lessons|הפקת\s+לקחים|לקחים)\b.*$", re.I | re.M)


def extract_lessons(text: str) -> str:
    m = LESSONS_HEADING.search(text)
    if not m:
        return ""
    rest = text[m.end():]
    nxt = re.search(r"^#{1,%d}\s" % len(m.group(1)), rest, re.M)
    return (rest[:nxt.start()] if nxt else rest).strip()


def append_lessons(text: str, rec: dict, t: float) -> bool:
    body = extract_lessons(text)
    bare = re.sub(r"[\s*.!_-]+", " ", body).strip().lower()
    if len(bare) < 8 or bare in ("none", "nothing", "n/a", "no lessons", "אין", "אין לקחים"):
        return False
    HOME.mkdir(parents=True, exist_ok=True)
    new = not LESSONS_FILE.exists() or LESSONS_FILE.stat().st_size == 0
    with open(LESSONS_FILE, "a", encoding="utf-8") as f:
        if new:
            f.write("# Lessons learned (Session Guard)\n\n")
        f.write(f"## {time.strftime('%Y-%m-%d %H:%M', time.localtime(t))} · "
                f"{project_slug(rec.get('cwd', ''))} · {rec.get('title', '')}\n"
                f"<!-- {rec['id']} | {rec.get('cwd', '')} -->\n{body}\n\n")
    return True


def project_lessons(cwd: str, limit: int = 6) -> list:
    text = read_text(LESSONS_FILE)
    if not text or not cwd:
        return []
    out = []
    for block in re.split(r"^## ", text, flags=re.M)[1:]:
        m = re.search(r"<!-- .*? \| (.*?) -->", block)
        if not m or os.path.normcase(m.group(1).strip()) != os.path.normcase(cwd):
            continue
        for line in block.splitlines():
            s = line.strip()
            if re.match(r"^([-*]|\d+[.)])\s+\S", s):
                out.append(re.sub(r"^([-*]|\d+[.)])\s+", "", s)[:300])
    return out[-limit:]


def register_handoff(path: Path, t: float, *, session_id: str = "", cwd: str = "",
                     transcript: str = "", episode=None, status=None, kind: str = "handoff",
                     auto: bool = False, why: str = "") -> dict:
    """Add or update the index entry for a handoff file. Caller holds the Lock.
    `episode` is the automatic pause it belongs to (None: started only by hand)."""
    text = read_text(path)
    m = re.search(r"^#\s+(.+)$", text, re.M)
    title = (m.group(1).strip() if m else path.stem)[:120]
    if status is None:
        status = "nothing" if re.search(r"NOTHING[ _-]?PENDING", text[:400], re.I) else "pending"
    idx = load_index()
    rec = idx["records"].get(path.stem) or {"id": path.stem, "created_at": t}
    rec.update({"kind": kind, "file": str(path), "title": title, "status": status, "updated_at": t,
                "auto": auto, "episode": episode, "session_id": session_id or rec.get("session_id", ""),
                "cwd": cwd or rec.get("cwd", ""), "transcript": transcript or rec.get("transcript", ""),
                "why": why or rec.get("why", "")})
    idx["records"][rec["id"]] = rec
    lessons = extract_lessons(text)
    digest = hashlib.sha1(lessons.strip().encode("utf-8")).hexdigest()[:16] if lessons else ""
    if status in ("pending", "nothing") and digest and rec.get("lessons_digest") != digest \
            and append_lessons(text, rec, t):
        rec["lessons_digest"] = digest
    save_index(idx)
    return rec


def sync_index(state: dict, t: float) -> None:
    """Handoff files nobody registered (e.g. a checkpoint written before a crash)
    are listed as checkpoints: shown to the user, never started automatically."""
    if not HANDOFF_DIR.is_dir():
        return
    idx = load_index()
    cwd_of = {v.get("path"): v.get("cwd", "") for v in (state.get("paths") or {}).values()}
    changed = False
    for p in HANDOFF_DIR.glob("*.md"):
        if p.stem in idx["records"]:
            continue
        m = re.search(r"^#\s+(.+)$", read_text(p), re.M)
        mt = p.stat().st_mtime
        idx["records"][p.stem] = {"id": p.stem, "kind": "handoff", "file": str(p), "status": "checkpoint",
                                  "title": (m.group(1).strip() if m else p.stem)[:120],
                                  "cwd": cwd_of.get(str(p), ""), "created_at": mt, "updated_at": mt}
        changed = True
    if changed:
        save_index(idx)


def _content_text(content) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return "\n".join(c.get("text", "") for c in content
                         if isinstance(c, dict) and c.get("type") == "text").strip()
    return ""


def transcript_tail(path: str) -> tuple:
    """(last user request, last assistant text) from a Claude Code transcript (JSONL)."""
    user = assistant = ""
    try:
        with open(path, "rb") as f:
            f.seek(0, os.SEEK_END)
            f.seek(max(0, f.tell() - 400_000))
            chunk = f.read().decode("utf-8", "replace")
    except (OSError, TypeError, ValueError):
        return "", ""
    for line in reversed(chunk.splitlines()):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        if not isinstance(e, dict):
            continue
        text = _content_text((e.get("message") or {}).get("content"))
        if not text:
            continue
        if e.get("type") == "assistant" and not assistant:
            assistant = text
        elif e.get("type") == "user" and not user and not e.get("isMeta") and not text.startswith("<"):
            user = text
        if user and assistant:
            break
    return user[:3000], assistant[:3000]


def git_summary(cwd: str) -> str:
    if not cwd or not Path(cwd).is_dir():
        return ""
    try:
        r = subprocess.run(["git", "-C", cwd, "status", "--short", "--branch"], capture_output=True,
                           text=True, encoding="utf-8", errors="replace", timeout=8, **_no_window())
    except (OSError, subprocess.SubprocessError):
        return ""
    if r.returncode != 0:
        return ""
    lines = r.stdout.strip().splitlines()
    if len(lines) > 40:
        lines = lines[:40] + [f"... ({len(lines) - 40} more)"]
    return "\n".join(lines)


def write_auto_handoff(path: Path, sess: dict, data: dict, why: str, t: float, lang: str = "en") -> None:
    """Fallback when a session stopped before writing its own handoff."""
    he = lang == "he"
    cwd = sess.get("cwd") or data.get("cwd") or ""
    transcript = sess.get("transcript") or data.get("transcript_path") or ""
    user, assistant = transcript_tail(transcript)
    assistant = data.get("last_assistant_message") or assistant
    stamp = time.strftime("%Y-%m-%d %H:%M", time.localtime(t))
    unknown = "(לא ידוע)" if he else "(unknown)"
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():  # keep the session's own checkpoint and add what happened since
        with open(path, "a", encoding="utf-8") as f:
            if he:
                f.write(f"\n\n## הערה אוטומטית ({stamp})\nSession Guard עצר את השיחה ({why}) לפני "
                        f"שהמסמך הזה עודכן, אז ייתכן שהוא קצת מאחור.\n"
                        f"- השיחה המלאה: {transcript or unknown}\n"
                        f"- ההודעה האחרונה של Claude:\n\n{assistant or '(לא נמצאה)'}\n")
            else:
                f.write(f"\n\n## Automatic note ({stamp})\nSession Guard stopped this session ({why}) "
                        f"before it updated this handoff, so it may be behind.\n"
                        f"- Full conversation: {transcript or unknown}\n"
                        f"- Claude's last message:\n\n{assistant or '(not found)'}\n")
        return
    git = git_summary(cwd)
    gitblock = f"```\n{git}\n```" if git else ("(אין מאגר git, או שאין שינויים)" if he else
                                                "(no git repository, or no changes)")
    if he:
        lines = [f"# {project_slug(cwd)}: עבודה שלא הסתיימה (מסמך העברה אוטומטי)",
                 f"> נכתב אוטומטית על ידי Session Guard ב-{stamp}: השיחה נעצרה ({why}) לפני שכתבה מסמך העברה בעצמה.",
                 f"> תיקייה: {cwd}", f"> השיחה המלאה: {transcript or unknown}",
                 "", "## מטרה: הבקשה האחרונה", user or "(לא נמצאה; לקרוא את סוף השיחה)",
                 "", "## איפה זה נעצר: ההודעה האחרונה של Claude", assistant or "(לא נמצאה)",
                 "", "## שינויים שלא נשמרו ב-git", gitblock,
                 "", "## הצעדים הבאים",
                 "1. לקרוא את סוף קובץ השיחה שלמעלה כדי להבין את ההקשר.",
                 "2. לבדוק את מצב הקבצים, ואז להמשיך בבקשה.", ""]
    else:
        lines = [f"# {project_slug(cwd)}: unfinished work (automatic handoff)",
                 f"> Written by Session Guard on {stamp}: the session stopped ({why}) before writing its own handoff.",
                 f"> Folder: {cwd}", f"> Full conversation: {transcript or unknown}",
                 "", "## Goal: the user's last request", user or "(not found; read the end of the conversation)",
                 "", "## Where it stopped: Claude's last message", assistant or "(not found)",
                 "", "## Uncommitted changes", gitblock,
                 "", "## Next steps",
                 "1. Read the end of the conversation file above to recover the context.",
                 "2. Check the current state of the files, then carry on with the user's request.", ""]
    path.write_text("\n".join(lines), encoding="utf-8")


def finalize_session(cfg: dict, state: dict, sid: str, sess: dict, data: dict, t: float) -> dict:
    """Make sure a session that was asked to pause ends up with a registered handoff."""
    path = Path(sess["path"])
    fresh = path.exists() and path.stat().st_mtime >= float(sess.get("asked_at", t)) - 2
    if not fresh:
        write_auto_handoff(path, sess, data, sess.get("why", "paused"), t, lang_of(cfg))
    rec = register_handoff(path, t, session_id=sid, cwd=sess.get("cwd", ""),
                           transcript=sess.get("transcript", ""), episode=sess.get("episode"),
                           auto=not fresh, why=sess.get("why", ""))
    sess["status"], sess["record"] = "done", rec["id"]
    if state.get("mode") == "running" and rec["status"] == "pending":
        state["resume_pending"] = True  # the pause ended while this one was still writing
    return rec


def save_request(state: dict, sid: str, cwd: str, prompt: str, transcript: str, t: float,
                 why: str, lang: str = "en") -> dict:
    """A prompt submitted during a pause, kept as a small handoff so it runs later."""
    HANDOFF_DIR.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%d-%H%M%S", time.localtime(t))
    path = HANDOFF_DIR / f"{stamp}-{project_slug(cwd)}-request-{sid[:6]}.md"
    first = " ".join(prompt.split())[:60]
    when = time.strftime("%Y-%m-%d %H:%M", time.localtime(t))
    if lang == "he":
        lines = [f"# בקשה שנשמרה: {first}",
                 f"> נכתבה ב-{when} בזמן שהעבודה של Claude הייתה מושהית ({why}).",
                 f"> תיקייה: {cwd}", f"> השיחה הקודמת: {transcript or '(לא ידוע)'} (session {sid})",
                 "", "## ההודעה", prompt.strip(),
                 "", "## הצעדים הבאים",
                 "1. אם ההודעה מתייחסת להקשר קודם (\"זה\", \"הכפתור\", \"תמשיך\"), לקרוא קודם את סוף "
                 "קובץ השיחה הקודמת.",
                 "2. לבצע את הבקשה.", ""]
    else:
        lines = [f"# Saved request: {first}",
                 f"> Typed by the user on {when} while Claude work was paused ({why}).",
                 f"> Folder: {cwd}", f"> Earlier conversation: {transcript or '(unknown)'} (session {sid})",
                 "", "## The user's message", prompt.strip(),
                 "", "## Next steps",
                 "1. If the message refers to earlier context (\"this\", \"the button\", \"continue\"), "
                 "read the end of the earlier conversation file first.",
                 "2. Do what the user asked.", ""]
    path.write_text("\n".join(lines), encoding="utf-8")
    rec = register_handoff(path, t, session_id=sid, cwd=cwd, transcript=transcript,
                           episode=(state.get("episode") or {}).get("id"), kind="request",
                           status="pending", why=why)
    idx = load_index()
    idx["records"][rec["id"]]["prompt"] = prompt.strip()[:4000]
    save_index(idx)
    return idx["records"][rec["id"]]


def find_record(idx: dict, ref: str):
    recs = idx["records"]
    if ref in recs:
        return recs[ref]
    hits = [r for k, r in recs.items() if ref and (k.startswith(ref) or k.endswith(ref) or ref in k)]
    return hits[0] if len(hits) == 1 else None


def pending_for_cwd(cwd: str) -> list:
    recs = [r for r in load_index()["records"].values()
            if r.get("status") == "pending" and os.path.normcase(r.get("cwd", "")) == os.path.normcase(cwd or "")]
    return sorted(recs, key=lambda r: r.get("created_at", 0))


# --------------------------------------------------------------------- messages

def pause_instructions(cfg: dict, state: dict, path: Path) -> str:
    why, until = summarize(state, cfg)
    if lang_of(cfg) == "he":
        return f"""⏸ Session Guard: עוצרים עכשיו ({why}).
Session Guard הוגדר לעצור את כל העבודה של Claude בצורה מסודרת כשזה קורה. שיחה חדשה תמשיך אוטומטית ({until}) מתוך מסמך ההעברה שייכתב עכשיו.

לא להמשיך במשימה ולא לנסות שוב את הכלי שנחסם. במקום זה:
1. לכתוב מסמך העברה ממה שכבר ידוע (בלי פקודות חדשות, אלא אם זה הכרחי), בקובץ:
   {path}
   הסעיפים, בעברית:
     # <כותרת קצרה של המשימה>
     ## מטרה: הבקשה המקורית, מצוטטת כלשונה
     ## מה נעשה עד עכשיו
     ## איפה עצרתי: הנקודה המדויקת, ומה נשאר באמצע
     ## הצעדים הבאים: ממוספרים וקונקרטיים, כך ששיחה חדשה תוכל להתחיל מצעד 1
     ## הקשר חשוב: קבצים, פקודות, החלטות ולמה, מלכודות
     ## שאלות פתוחות
     ## הפקת לקחים: מה כדאי שהשיחות הבאות בפרויקט הזה ידעו או יעשו אחרת (או "אין")
   אם לא נשאר שום דבר פתוח, מספיקה שורה אחת: NOTHING PENDING: <מה הושלם>
2. לא לשנות קוד עכשיו. לרשום במסמך אילו קבצים לא נשמרו ב-git; commit רק אם המשימה כבר כללה commits.
3. לכתוב למשתמש בעברית משפט או שניים: שהעבודה נעצרה, למה, ושהיא תמשיך לבד. ואז לסיים את התור.
(פירוט: הסעיף "Pause" בקובץ {SKILL_DIR / 'SKILL.md'})"""
    return f"""⏸ SESSION GUARD: PAUSE NOW ({why}).
The user set up Session Guard to stop all Claude work in an orderly way when this happens. A fresh session will continue automatically ({until}) from the handoff you write now.

Don't continue the task and don't retry the blocked tool. Instead:
1. Write a handoff file from what you already know (avoid new commands unless essential):
   {path}
   Sections, in the language you use with the user:
     # <short title of the task>
     ## Goal: the user's request, in their words
     ## Done so far
     ## Where I stopped: the exact point, anything half-finished
     ## Next steps: numbered and concrete, so a new session can start at step 1
     ## Key context: files, commands, decisions and why, gotchas
     ## Open questions for the user
     ## Lessons learned: specific things later sessions here should know or do differently (or "none")
   If nothing is left unfinished, the file can be one line: NOTHING PENDING: <what was completed>
2. Leave code changes as they are and list uncommitted files in the handoff; commit only if this task already included committing.
3. Tell the user in one or two sentences that you paused and why, and that the work will continue automatically. Then end your turn.
(Details: the "Pause" section of {SKILL_DIR / 'SKILL.md'})"""


def subagent_instructions(cfg: dict, state: dict) -> str:
    why, _ = summarize(state, cfg)
    if lang_of(cfg) == "he":
        return (f"⏸ Session Guard: השיחה נעצרת ({why}). לעצור עכשיו בלי להפעיל עוד כלים, ולהחזיר "
                "לסוכן הראשי סיכום קצר: מה נעשה ומה נשאר.")
    return (f"⏸ SESSION GUARD: the session is pausing ({why}). Stop now and don't call more tools. "
            "Reply to the main agent with a short summary of what you did and what is left.")


def no_edits_message(cfg: dict, state: dict, path: str) -> str:
    why, _ = summarize(state, cfg)
    if lang_of(cfg) == "he":
        return (f"⏸ Session Guard: עצירה ({why}). לא לערוך עכשיו קבצים של הפרויקט. לכתוב את מסמך "
                f"ההעברה ב-{path} ואז לסיים את התור.")
    return (f"⏸ Session Guard: paused ({why}). Don't edit project files now. Write the handoff at "
            f"{path}, then end your turn.")


def stop_reason(cfg: dict, state: dict) -> str:
    why, until = summarize(state, cfg)
    if lang_of(cfg) == "he":
        return (f"⏸ Session Guard עצר את השיחה הזאת ({why}). העבודה תמשיך לבד {until}. "
                "כדי להמשיך לעבוד עכשיו בכל זאת: /session-guard override")
    return (f"⏸ Session Guard paused this session ({why}). The work continues automatically {until}. "
            "To keep working now: /session-guard override")


def blocked_prompt_message(cfg: dict, state: dict, saved: bool) -> str:
    why, until = summarize(state, cfg)
    if lang_of(cfg) == "he":
        note = " ההודעה נשמרה ותורץ אוטומטית אז." if saved else ""
        return (f"⏸ Session Guard: העבודה של Claude מושהית כרגע ({why}). היא תמשיך לבד {until}.{note} "
                "כדי לעבוד בכל זאת: /session-guard override")
    note = " Your message was saved and will be run then." if saved else ""
    return (f"⏸ Session Guard: Claude work is paused ({why}). It continues automatically {until}.{note} "
            "To work anyway: /session-guard override")


def checkpoint_message(cfg: dict, label: str, path: Path) -> str:
    if lang_of(cfg) == "he":
        return (f"[session-guard] לתשומת לב: {label}. לפני הצעד הבא, לשמור מסמך העברה קצר כנקודת "
                f"ביניים בקובץ {path}: מטרה, מה נעשה, איפה עומדים, הצעדים הבאים והקשר חשוב (באותו "
                "מבנה של מסמך עצירה, בקצרה ובעברית). אחר כך להמשיך במשימה כרגיל; אם תתחיל עצירה, "
                "תגיע הודעה. אין צורך לספר על זה למשתמש.")
    return (f"[session-guard] Heads-up: {label}. Before your next step, save a short checkpoint "
            f"handoff at {path}: goal, done so far, where you are, next steps, key context (the "
            "pause handoff format, kept brief). Then continue the task normally; you will be told "
            "if a pause starts. No need to mention this to the user.")


# ------------------------------------------------------------------------ hooks

def _norm(p) -> str:
    return os.path.normcase(str(p)).replace("\\", "/")


def _under(path: str, root: Path) -> bool:
    return _norm(path).startswith(_norm(root).rstrip("/") + "/")


# Guard subcommands Claude may run without a permission prompt. Not `config`,
# `launch` or `simulate`: they change what the watchdog executes or believes.
AUTO_SUBCOMMANDS = {"status", "list", "show", "complete", "dismiss", "handoff-path", "handoff-done",
                    "pause", "resume", "--version"}


def guard_call(tool: str, tin: dict) -> str:
    """"auto" for the guard's own bookkeeping (approved without a prompt), "pass" for
    other calls that touch the guard (never blocked by a pause, normal permissions),
    "" for everything else."""
    if not isinstance(tin, dict):
        return ""
    if tool in ("Bash", "PowerShell"):
        cmd = str(tin.get("command", ""))
        if "session-guard/scripts/guard.py" not in cmd.replace("\\", "/"):
            return ""
        if re.search(r"[;&|`$<>\r\n]", cmd.strip().lstrip("&").lstrip()):
            return "pass"
        try:
            parts = shlex.split(cmd.strip().lstrip("&").lstrip())
        except ValueError:
            return "pass"
        exe = os.path.basename(parts[0]).lower() if parts else ""
        ok = (len(parts) >= 3 and re.match(r"^(python[\d.]*|pythonw|py)(\.exe)?$", exe)
              and parts[1].replace("\\", "/").endswith("session-guard/scripts/guard.py")
              and parts[2] in AUTO_SUBCOMMANDS)
        return "auto" if ok else "pass"
    if tool == "Skill":
        return "auto" if any("session-guard" in str(tin.get(k, "")) for k in ("skill", "name", "command")) else ""
    if tool in ("Read", "Write", "Edit", "MultiEdit"):
        fp = str(tin.get("file_path", ""))
        if tool == "Read":
            return "auto" if _under(fp, HOME) or _under(fp, SKILL_DIR) else ""
        # Writes: only handoff notes. Never config.json: it names programs the watchdog runs.
        return "auto" if _under(fp, HANDOFF_DIR) and fp.lower().endswith(".md") else ""
    return ""


def _deny(reason: str) -> dict:
    return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                   "permissionDecisionReason": reason}}


def _ask_session(state: dict, sid: str, cwd: str, data: dict, t: float, cfg: dict, path=None) -> dict:
    path = path or handoff_path_for(state, sid, cwd, t)
    why, _ = summarize(state, cfg)
    sess = {"status": "asked", "asked_at": t, "calls": 0, "stop_blocks": 0, "cwd": cwd,
            "transcript": data.get("transcript_path") or "", "path": str(path), "why": why,
            "episode": (state.get("episode") or {}).get("id")}
    state.setdefault("sessions", {})[sid] = sess
    return sess


def on_pre_tool(cfg, state, rd, data, sid, cwd, t):
    tool, tin = data.get("tool_name") or "", data.get("tool_input") or {}
    kind = guard_call(tool, tin)
    if kind:
        dirty = False
        target = str(tin.get("file_path", ""))
        if (kind == "auto" and tool != "Read" and state.get("mode") == "paused" and not data.get("agent_id")
                and sid not in state.get("sessions", {}) and _under(target, HANDOFF_DIR)):
            _ask_session(state, sid, cwd, data, t, cfg, Path(target))  # writing its handoff unprompted
            dirty = True
        if kind == "pass":
            return None, dirty
        return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "allow",
                                       "permissionDecisionReason": "Session Guard bookkeeping"}}, dirty
    if override_active(state, t):
        return None, False
    if state.get("mode") == "paused":
        if data.get("agent_id"):
            return _deny(subagent_instructions(cfg, state)), False
        sess = state.get("sessions", {}).get(sid)
        if sess is None:
            sess = _ask_session(state, sid, cwd, data, t, cfg)
            return _deny(pause_instructions(cfg, state, Path(sess["path"]))), True
        if sess.get("status") == "asked":
            sess["calls"] = int(sess.get("calls", 0)) + 1
            hb = cfg["handoff"]
            if sess["calls"] > hb["tool_budget"] or t - float(sess["asked_at"]) > hb["minutes_budget"] * 60:
                finalize_session(cfg, state, sid, sess, data, t)
                return {"continue": False, "stopReason": stop_reason(cfg, state)}, True
            if tool in ("Edit", "Write", "MultiEdit", "NotebookEdit"):  # no half-done edits now
                return _deny(no_edits_message(cfg, state, sess["path"])), True
            return None, True
        return {"continue": False, "stopReason": stop_reason(cfg, state)}, False
    if data.get("agent_id"):
        return None, False
    for key, label in checkpoint_keys(cfg, rd, t):
        done = state.setdefault("checkpoints", {}).setdefault(sid, [])
        if key in done:
            continue
        done.append(key)
        path = handoff_path_for(state, sid, cwd, t)
        return {"hookSpecificOutput": {"hookEventName": "PreToolUse",
                                       "additionalContext": checkpoint_message(cfg, label, path)}}, True
    return None, False


def on_stop(cfg, state, rd, data, sid, cwd, t):
    sess = state.get("sessions", {}).get(sid)
    if state.get("mode") != "paused" or override_active(state, t):
        if sess and sess.get("status") == "asked":  # the pause ended while it was writing
            finalize_session(cfg, state, sid, sess, data, t)
            return None, True
        return None, False
    if sess and sess.get("status") == "done":
        return None, False
    if sess is None:
        sess = _ask_session(state, sid, cwd, data, t, cfg)
    path = Path(sess["path"])
    if (path.exists() and path.stat().st_mtime >= float(sess["asked_at"]) - 2) \
            or data.get("stop_hook_active") or int(sess.get("stop_blocks", 0)) >= 1:
        finalize_session(cfg, state, sid, sess, data, t)  # registers it, or writes a fallback
        return None, True
    sess["stop_blocks"] = int(sess.get("stop_blocks", 0)) + 1
    return {"decision": "block", "reason": pause_instructions(cfg, state, path)}, True


GUARD_PROMPT = re.compile(r"^/session-guard(?::[\w-]+)?(?:\s+(.*))?$", re.S)


def on_prompt(cfg, state, rd, data, sid, cwd, t):
    prompt = str(data.get("prompt") or "")
    m = GUARD_PROMPT.match(prompt.strip())
    if m:  # the user is talking to the guard itself: always let it through
        rest = (m.group(1) or "").strip()
        mo = re.match(r"^override\b\s*(\d+)?", rest)
        if mo:
            minutes = int(mo.group(1) or cfg["override_minutes"])
            state["override"] = {"until": t + minutes * 60, "set_at": t}
            log(f"override for {minutes} min (prompt in {sid[:8]})")
            return None, True
        mr = re.match(r"^resume\s+(\S+)", rest)
        if mr:
            idx = load_index()
            rec = find_record(idx, mr.group(1))
            if rec and rec.get("status") in ("pending", "resumed", "checkpoint"):
                rec.update({"status": "in_progress", "claimed_at": t, "claimed_by": sid})
                save_index(idx)
        return None, False
    if override_active(state, t) or state.get("mode") != "paused":
        return None, False
    saved = False
    if data.get("source") in (None, "user") and cfg["resume"].get("include_blocked_prompts", True) and prompt.strip():
        why, _ = summarize(state, cfg)
        save_request(state, sid, cwd, prompt, data.get("transcript_path") or "", t, why, lang_of(cfg))
        saved = True
    return {"decision": "block", "reason": blocked_prompt_message(cfg, state, saved)}, False


def auto_continue_on() -> bool:
    """Claude Code's autoContinueAtUsageLimit (on by default): a session stopped by the
    usage limit waits and carries on by itself after the reset."""
    base = Path(os.environ.get("CLAUDE_CONFIG_DIR") or Path.home() / ".claude").expanduser()
    settings = read_json(base / "settings.json", {}) or {}
    return settings.get("autoContinueAtUsageLimit", True) is not False


def on_stop_failure(cfg, state, rd, data, sid, cwd, t):
    """The turn died on an API error. On a usage limit, pause the other sessions and save
    what this one was doing. Claude Code normally continues this session by itself after
    the reset, so its notes are kept as a checkpoint rather than started a second time."""
    uc = cfg["usage"]
    if data.get("error") != "rate_limit" or not uc.get("enabled"):
        return None, False
    usage = rd.get("usage") or {}
    hot = {w: r for w, r in usage.items() if r["used"] >= uc.get("checkpoint_at", 90)}
    reasons = state.setdefault("reasons", {})
    if hot:
        for w, r in hot.items():
            reasons.setdefault("usage_" + w, {"since": t, "value": r["used"], "resets_at": r["resets_at"]})
    elif not usage:  # no numbers (no status line): use a reset time in the error, else retry later
        stamps = [int(s) for s in re.findall(r"\b(1\d{9})\b", str(data.get("error_details") or ""))]
        retry = next((s + 60 for s in stamps if t < s < t + 8 * 86400), t + uc["limit_hit_retry_minutes"] * 60)
        reasons["usage_limit"] = {"since": t, "retry_at": retry}
    else:
        return None, False  # usage is low: a passing API rate limit, not the plan limit
    apply_mode(state, t)
    keeps_going = auto_continue_on()
    idx = load_index()
    claimed = [r for r in idx["records"].values()
               if r.get("status") == "in_progress" and r.get("claimed_by") == sid]
    if claimed:  # a resumed session hit the limit
        rec = claimed[0]
        transcript = data.get("transcript_path") or ""
        stamp = time.strftime("%Y-%m-%d %H:%M", time.localtime(t))
        with open(rec["file"], "a", encoding="utf-8") as f:
            if lang_of(cfg) == "he":
                f.write(f"\n\n## הערה אוטומטית ({stamp})\nשיחה שהמשיכה את מסמך ההעברה הזה הגיעה למגבלת "
                        f"השימוש. מה שהיא הספיקה לעשות נמצא ב-{transcript or 'השיחה שלה'}; לבדוק את "
                        "הקבצים לפני שעושים משהו מחדש.\n")
            else:
                f.write(f"\n\n## Automatic note ({stamp})\nA session continuing this handoff hit the usage "
                        f"limit. What it did is in {transcript or 'its conversation'}; check the files "
                        "before redoing anything.\n")
        if not keeps_going:  # nobody else will pick it up: back in the queue
            rec.update({"status": "pending", "episode": (state.get("episode") or {}).get("id")})
        rec["updated_at"] = t
        save_index(idx)
        state.setdefault("sessions", {})[sid] = {"status": "done", "record": rec["id"], "asked_at": t,
                                                 "cwd": cwd, "path": rec["file"]}
        return None, True
    sess = state.setdefault("sessions", {}).get(sid)
    if not sess or sess.get("status") != "done":
        sess = sess or _ask_session(state, sid, cwd, data, t, cfg)
        rec = finalize_session(cfg, state, sid, sess, data, t)
        if keeps_going and rec.get("status") == "pending":
            idx = load_index()
            idx["records"][rec["id"]].update({"status": "checkpoint", "note": "Claude Code continues this session after the reset"})
            save_index(idx)
    return None, True


def on_session_start(cfg, state, rd, data, sid, cwd, t):
    if data.get("source") == "compact" or data.get("agent_id"):
        return None, False
    parts, lang = [], lang_of(cfg)
    he = lang == "he"
    if state.get("mode") == "paused" and not override_active(state, t):
        why, until = summarize(state, cfg)
        parts.append(f"[session-guard] העבודה של Claude מושהית עכשיו ({why}); היא תמשיך לבד {until}. "
                     "הודעות חדשות נחסמות, אלא אם מריצים /session-guard override." if he else
                     f"[session-guard] Claude work is paused right now ({why}); it continues "
                     f"automatically {until}. New prompts are held back unless the user runs "
                     "/session-guard override.")
    recs = pending_for_cwd(cwd)
    if recs:
        lines = [f"- \"{r.get('title', r['id'])}\" {'נשמר' if he else 'saved'} {fmt_time(r.get('created_at', t), lang)}"
                 f"{' (' + r['why'] + ')' if r.get('why') else ''} -> /session-guard resume {r['id']}"
                 for r in recs[-5:]]
        if he:
            parts.append("[session-guard] עבודה שלא הסתיימה, שנשמרה בשיחות קודמות בתיקייה הזאת:\n"
                         + "\n".join(lines) + "\nאם רוצים להמשיך עבודה קודמת, או שהבקשה מתאימה לאחת "
                         "מאלה, קודם להריץ /session-guard resume <id> (זה טוען את מסמך ההעברה). "
                         "אחרת להתעלם מההערה הזאת.")
        else:
            parts.append("[session-guard] Unfinished work saved by earlier sessions in this folder:\n"
                         + "\n".join(lines) + "\nIf the user wants to continue earlier work, or the "
                         "request matches one of these, run /session-guard resume <id> first (it loads "
                         "the handoff). Otherwise ignore this note.")
    lessons = project_lessons(cwd)
    if lessons:
        parts.append(("[session-guard] לקחים מהעבר בפרויקט הזה (ליישם כשרלוונטי):\n" if he else
                      "[session-guard] Lessons learned earlier in this project (apply them where relevant):\n")
                     + "\n".join(f"- {s}" for s in lessons))
    if not parts:
        return None, False
    return {"hookSpecificOutput": {"hookEventName": "SessionStart",
                                   "additionalContext": "\n\n".join(parts)}}, False


HANDLERS = {"PreToolUse": on_pre_tool, "Stop": on_stop, "UserPromptSubmit": on_prompt,
            "StopFailure": on_stop_failure, "SessionStart": on_session_start}


def handle_hook(data: dict):
    cfg = load_config()
    handler = HANDLERS.get(str(data.get("hook_event_name") or ""))
    if not cfg.get("enabled", True) or not handler or os.environ.get("SESSION_GUARD_DISABLE"):
        return None
    sid = str(data.get("session_id") or "unknown")
    cwd = str(data.get("cwd") or os.getcwd())
    t = now()
    with Lock():
        state = load_state()
        rd = readings(cfg, t)
        dirty = evaluate(cfg, state, rd, t)
        out, d2 = handler(cfg, state, rd, data, sid, cwd, t)
        if dirty or d2:
            save_state(state)
    return out


# ------------------------------------------------------------------- statusline

def save_usage(rl: dict, sid: str, t: float) -> None:
    new = {"captured_at": t, "session_id": sid}
    for w in WINDOWS:
        r = rl.get(w)
        if isinstance(r, dict) and isinstance(r.get("used_percentage"), (int, float)) and _epoch(r.get("resets_at")):
            new[w] = {"used_percentage": float(r["used_percentage"]), "resets_at": _epoch(r["resets_at"])}
    if not any(w in new for w in WINDOWS):
        return
    cur = read_json(USAGE_FILE, {}) or {}
    if all(cur.get(w) == new.get(w) for w in WINDOWS) and t - float(cur.get("captured_at", 0)) < 60:
        return
    write_json(USAGE_FILE, new)


def run_chain(cmd: str, raw: str) -> str:
    """Run the status line command that was configured before Session Guard."""
    if SYSTEM == "Windows":
        bash = git_bash()
        argv = [bash, "-c", cmd] if bash else ["powershell", "-NoProfile", "-Command", cmd]
    else:
        argv = [os.environ.get("SHELL") or "/bin/sh", "-c", cmd]
    try:
        r = subprocess.run(argv, input=raw, capture_output=True, text=True, encoding="utf-8",
                           errors="replace", timeout=5, **_no_window())
        return r.stdout.rstrip("\n")
    except (OSError, subprocess.SubprocessError):
        return ""


def status_segment(cfg: dict, data: dict, t: float) -> str:
    st = read_json(STATE_FILE) or {}
    lang = lang_of(cfg)
    he = lang == "he"
    if override_active(st, t):
        left = fmt_ago(float(st["override"]["until"]) - t, lang)
        return f"⚠ השמירה כבויה עוד {left}" if he else f"⚠ guard override {left}"
    if st.get("mode") == "paused":
        return f"⏸ {'מושהה' if he else 'paused'}: {summarize(st, cfg)[0]}"
    bits = []
    rl = data.get("rate_limits") or {}
    for w, lab in (("five_hour", "5 שעות" if he else "5h"), ("seven_day", "שבועי" if he else "7d")):
        r = rl.get(w) if isinstance(rl, dict) else None
        if isinstance(r, dict) and isinstance(r.get("used_percentage"), (int, float)):
            bits.append(f"{lab} {r['used_percentage']:.0f}%")
    if cfg["battery"].get("enabled"):
        b = get_battery(t, max_age=90)
        if b and b.get("percent") is not None:
            bits.append(f"🔋{b['percent']}%" + ("⚡" if b.get("on_ac") else ""))
    return " · ".join(bits)


def cmd_statusline(args) -> int:
    raw = sys.stdin.read()
    try:
        data = json.loads(raw) if raw.strip() else {}
    except ValueError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    cfg, t = load_config(), now()
    try:
        if isinstance(data.get("rate_limits"), dict):
            save_usage(data["rate_limits"], str(data.get("session_id") or ""), t)
    except Exception as e:
        log(f"statusline usage save failed: {e!r}")
    lines = []
    chain = (cfg.get("statusline") or {}).get("chain_command")
    if chain:
        out = run_chain(chain, raw)
        if out:
            lines.append(out)
    if cfg["statusline"].get("show", True) and cfg.get("enabled", True):
        try:
            seg = status_segment(cfg, data, t)
        except Exception as e:
            log(f"statusline segment failed: {e!r}")
            seg = ""
        if seg:
            lines.append(seg)
    sys.stdout.write("\n".join(lines))
    return 0


# ------------------------------------------------------------------ resume / tick

def launch_env(cfg: dict) -> dict:
    env = dict(os.environ)
    # Started from inside a Claude Code session (`guard.py launch`), these would tie the new
    # session to the current one.
    for k in ("CLAUDECODE", "CLAUDE_CODE_SESSION_ID", "CLAUDE_CODE_CHILD_SESSION",
              "CLAUDE_CODE_MESSAGING_SOCKET", "CLAUDE_PID", "CLAUDE_CODE_ENTRYPOINT"):
        env.pop(k, None)
    extra = [str(Path(cfg["claude_bin"]).parent)] if cfg.get("claude_bin") else []
    if SYSTEM != "Windows":  # launchd and cron start with a bare PATH
        home = Path.home()
        extra += ["/opt/homebrew/bin", "/usr/local/bin", str(home / ".local/bin"),
                  str(home / ".claude/local"), str(home / ".npm-global/bin"), "/usr/bin", "/bin",
                  "/usr/sbin", "/sbin"]
    parts = extra + env.get("PATH", "").split(os.pathsep)
    env["PATH"] = os.pathsep.join(dict.fromkeys(p for p in parts if p))
    env["SESSION_GUARD_LAUNCHED"] = "1"
    return env


def claude_argv(cfg: dict) -> list:
    claude = cfg.get("claude_bin") or shutil.which("claude") or "claude"
    return ["cmd", "/c", claude] if claude.lower().endswith((".cmd", ".bat")) else [claude]


def open_terminal(argv: list, cwd: str, env: dict) -> tuple:
    try:
        if SYSTEM == "Darwin":
            line = f"cd {shlex.quote(cwd)} && " + " ".join(shlex.quote(a) for a in argv)
            esc = line.replace("\\", "\\\\").replace('"', '\\"')
            subprocess.run(["osascript", "-e", f'tell application "Terminal" to do script "{esc}"',
                            "-e", 'tell application "Terminal" to activate'],
                           capture_output=True, timeout=30, env=env)
            return True, "terminal"
        if SYSTEM == "Windows":  # `start` needs its window title quoted, so build the line by hand
            inner = " ".join(f'"{a}"' for a in argv)
            subprocess.Popen(f'start "Claude" /D "{cwd}" cmd /k {inner}', shell=True, env=env)
            return True, "terminal"
        line = " ".join(shlex.quote(a) for a in argv)
        for term, flag in (("x-terminal-emulator", "-e"), ("gnome-terminal", "--"), ("konsole", "-e"),
                           ("xfce4-terminal", "-x"), ("xterm", "-e")):
            if shutil.which(term):
                subprocess.Popen([term, flag, "bash", "-lc", line], cwd=cwd, env=env)
                return True, f"terminal ({term})"
    except (OSError, subprocess.SubprocessError) as e:
        return False, str(e)[:300]
    return False, "no terminal program found"


def launch(cfg: dict, rec: dict) -> tuple:
    """Start a fresh Claude Code session that continues one handoff."""
    cwd = rec.get("cwd") or ""
    if not cwd or not Path(cwd).is_dir():
        return False, f"folder not found: {cwd or '(unknown)'}"
    prompt = f"/session-guard resume {rec['id']}"
    name = ("resume: " + (rec.get("title") or rec["id"]))[:60]
    flags = ["--permission-mode", cfg["resume"]["permission_mode"]] if cfg["resume"].get("permission_mode") else []
    env, mode = launch_env(cfg), cfg["resume"].get("mode", "background")
    if mode == "dry-run":
        log(f"dry-run launch in {cwd}: {claude_argv(cfg) + ['--bg', '-n', name] + flags + [prompt]}")
        return True, "dry-run"
    if mode == "background":
        argv = claude_argv(cfg) + ["--bg", "-n", name] + flags + [prompt]
        try:
            r = subprocess.run(argv, cwd=cwd, env=env, capture_output=True, text=True, encoding="utf-8",
                               errors="replace", timeout=120, stdin=subprocess.DEVNULL, **_no_window())
            if r.returncode == 0:
                return True, (r.stdout or "background session started").strip()[:300]
            err = (r.stderr or r.stdout or "").strip()[:300]
        except (OSError, subprocess.SubprocessError) as e:
            err = str(e)[:300]
        log(f"background launch failed, trying a terminal window: {err}")
        ok, how = open_terminal(claude_argv(cfg) + flags + [prompt], cwd, env)
        return ok, how if ok else f"{err}; {how}"
    if mode == "terminal":
        return open_terminal(claude_argv(cfg) + flags + [prompt], cwd, env)
    return False, f"resume mode is '{mode}'"


def _as(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _toast_script(title: str, body: str) -> str:
    q = lambda s: "'" + s.replace("'", "''") + "'"  # noqa: E731
    return ("[void][Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime]\n"
            "$x = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)\n"
            "$t = $x.GetElementsByTagName('text')\n"
            f"[void]$t.Item(0).AppendChild($x.CreateTextNode({q(title)}))\n"
            f"[void]$t.Item(1).AppendChild($x.CreateTextNode({q(body)}))\n"
            "$n = [Windows.UI.Notifications.ToastNotification]::new($x)\n"
            "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("
            "'{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show($n)\n")


def notify(cfg: dict, title: str, body: str) -> None:
    log(f"notify: {title} | {body}")
    nc = cfg.get("notify") or {}
    if nc.get("desktop", True):
        try:
            if SYSTEM == "Darwin":
                subprocess.run(["osascript", "-e", f"display notification {_as(body)} with title {_as(title)}"],
                               capture_output=True, timeout=15)
            elif SYSTEM == "Windows":
                enc = base64.b64encode(_toast_script(title, body).encode("utf-16-le")).decode()
                subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden",
                                "-EncodedCommand", enc], capture_output=True, timeout=30, **_no_window())
            elif shutil.which("notify-send"):
                subprocess.run(["notify-send", "-a", "Session Guard", title, body], capture_output=True, timeout=15)
        except (OSError, subprocess.SubprocessError) as e:
            log(f"desktop notification failed: {e!r}")
    if nc.get("ntfy_topic"):
        server = (cfg.get("phone") or {}).get("ntfy_server") or "https://ntfy.sh"
        payload = json.dumps({"topic": nc["ntfy_topic"], "title": title, "message": body}).encode("utf-8")
        try:
            req = urllib.request.Request(server.rstrip("/") + "/", data=payload, method="POST",
                                         headers={"Content-Type": "application/json", "User-Agent": UA})
            urllib.request.urlopen(req, timeout=10).read()
        except Exception as e:
            log(f"ntfy notification failed: {e!r}")


def notice_text(cfg: dict, kind: str, state: dict, extra: str = "") -> tuple:
    he = cfg.get("language") == "he"
    if kind == "pause":
        why, until = summarize(state, cfg, "he" if he else "en")
        return (("Claude נעצר ⏸", f"סיבה: {why}. העבודה תמשיך אוטומטית {until}.") if he else
                ("Claude paused ⏸", f"Reason: {why}. Work continues automatically {until}."))
    return (("Claude ממשיך ▶", extra) if he else ("Claude resumed ▶", extra))


def merge_requests(waiting: list, lang: str = "en") -> list:
    """A prompt typed during the pause into a session that also left a handoff belongs after
    that handoff's steps, in the same new session (two sessions would trip over each other)."""
    handoffs = {r.get("session_id"): r for r in waiting if r.get("kind") != "request" and r.get("session_id")}
    out = []
    for r in waiting:
        target = handoffs.get(r.get("session_id")) if r.get("kind") == "request" else None
        if not target:
            out.append(r)
            continue
        prompt = r.get("prompt") or read_text(Path(r["file"]))
        quoted = "\n".join("> " + ln for ln in prompt.splitlines())
        with open(target["file"], "a", encoding="utf-8") as f:
            if lang == "he":
                f.write("\n\n## נוסף בזמן העצירה\nההודעה הזאת נשלחה באותה שיחה בזמן שהעבודה הייתה "
                        "מושהית. לבצע אותה אחרי הצעדים שלמעלה:\n\n" + quoted + "\n")
            else:
                f.write("\n\n## Added while paused\nThe user sent this in the same conversation while work was "
                        "paused. Do it after the steps above:\n\n" + quoted + "\n")
        r["status"], r["merged_into"] = "merged", target["id"]
    return out


def cmd_tick(args) -> int:
    cfg, t = load_config(), now()
    if not cfg.get("enabled", True):
        return 0
    poll_phone(cfg, t)  # network: outside the lock
    notices, to_launch = [], []
    with Lock():
        state = load_state()
        rd = readings(cfg, t, battery_max_age=15)
        evaluate(cfg, state, rd, t)
        hb = cfg["handoff"]
        for sid, sess in list((state.get("sessions") or {}).items()):
            if sess.get("status") == "asked" and t - float(sess.get("asked_at", t)) > (hb["minutes_budget"] + 2) * 60:
                finalize_session(cfg, state, sid, sess, {}, t)  # it never came back (crash, closed window)
        ep = state.get("episode")
        if state["mode"] == "paused" and ep and not ep.get("notified"):
            ep["notified"] = True
            notices.append(notice_text(cfg, "pause", state))
        if state["mode"] == "running" and state.get("resume_pending"):
            state["resume_pending"] = False
            if cfg["resume"].get("auto", True) and cfg["resume"].get("mode") != "none":
                sync_index(state, t)
                idx = load_index()
                waiting = sorted((r for r in idx["records"].values()
                                  if r.get("status") == "pending" and r.get("episode")),
                                 key=lambda r: r.get("created_at", 0))
                waiting = merge_requests(waiting, lang_of(cfg))
                to_launch = waiting[:max(0, int(cfg["resume"].get("max_sessions", 5)))]
                for r in to_launch:
                    r["status"] = "resumed"
                    r["resumed_at"] = t
                save_index(idx)
                if len(waiting) > len(to_launch):
                    log(f"{len(waiting) - len(to_launch)} handoffs left for manual resume")
        state["last_tick"] = t
        save_state(state)
    results = [(r, *launch(cfg, r)) for r in to_launch]
    if results:
        with Lock():
            idx = load_index()
            for r, ok, how in results:
                rec = idx["records"].get(r["id"])
                if rec:
                    rec["launch"] = {"at": t, "ok": ok, "detail": how}
                    if not ok:
                        rec["status"] = "pending"
                        rec["episode"] = None  # don't retry forever; it is offered at the next session start
            save_index(idx)
        good = [r for r, ok, _ in results if ok]
        he = cfg.get("language") == "he"
        names = ", ".join(r.get("title", r["id"])[:40] for r in good)
        if good:
            msg = (f"נפתחו {len(good)} שיחות חדשות להמשך העבודה: {names}" if he else
                   f"Started {len(good)} new session(s) to continue: {names}")
        else:
            msg = ("לא הצלחתי לפתוח את השיחות. הריצו /session-guard resume" if he else
                   "Couldn't start the sessions. Run /session-guard resume")
        notices.append(notice_text(cfg, "resume", {}, msg))
    for title, body in notices:
        notify(cfg, title, body)
    return 0


# --------------------------------------------------------------------- commands

def _locked_state(cfg: dict, t: float, battery_max_age: float = 10.0) -> tuple:
    state = load_state()
    rd = readings(cfg, t, battery_max_age)
    if evaluate(cfg, state, rd, t):
        save_state(state)
    return state, rd


def cmd_hook(args) -> int:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
    except (OSError, ValueError):
        return 0
    if not isinstance(data, dict):
        return 0
    try:
        out = handle_hook(data)
    except Exception as e:  # fail open: a broken guard must never block the user's work
        log(f"hook error ({data.get('hook_event_name')}): {e!r}")
        out = None
    if out:
        sys.stdout.write(json.dumps(out, ensure_ascii=False))
    return 0


STATUS_HE = {"pending": "ממתין", "in_progress": "בעבודה", "resumed": "הופעל מחדש", "done": "הושלם",
             "dismissed": "בוטל", "checkpoint": "נקודת ביניים", "nothing": "אין מה להמשיך", "merged": "צורף"}


def T(cfg: dict, he: str, en: str) -> str:
    return he if lang_of(cfg) == "he" else en


def status_word(cfg: dict, status: str) -> str:
    return STATUS_HE.get(status, status) if lang_of(cfg) == "he" else status


def cmd_status(args) -> int:
    cfg, t = load_config(), now()
    lang = lang_of(cfg)
    with Lock():
        state, rd = _locked_state(cfg, t)
        sync_index(state, t)
    idx = load_index()
    if args.json:
        print(json.dumps({"state": state, "readings": rd, "records": idx["records"]}, ensure_ascii=False, indent=2))
        return 0
    paused = state.get("mode") == "paused"
    head = T(cfg, "מושהה" if paused else "פועל", "PAUSED" if paused else "running")
    if override_active(state, t):
        left = fmt_ago(float(state["override"]["until"]) - t, lang)
        head += T(cfg, f" (עקיפה: השמירה לא פעילה עוד {left})", f" (override: guard ignored for {left})")
    out = [f"Session Guard {VERSION}: {head}" +
           ("" if cfg.get("enabled", True) else T(cfg, " [כבוי בהגדרות]", " [disabled in config]"))]
    if paused:
        why, until = summarize(state, cfg)
        out += [T(cfg, f"  סיבה: {why}", f"  reason:    {why}"), T(cfg, f"  ממשיך: {until}", f"  continues: {until}")]
    b, bc = rd.get("battery"), cfg["battery"]
    limits = T(cfg, f"  · עצירה ב-{bc['pause_at']}%, המשך ב-{bc['resume_at']}%",
               f"  · pauses at {bc['pause_at']}%, resumes at {bc['resume_at']}%")
    if not bc.get("enabled"):
        out.append(T(cfg, "  סוללת המחשב: לא במעקב", "  laptop battery: not watched"))
    elif b and b.get("percent") is not None:
        plug = T(cfg, "בטעינה" if b.get("on_ac") else "על סוללה", "plugged in" if b.get("on_ac") else "on battery")
        sim = T(cfg, "  [הדמיה]", "  [simulated]") if "battery" in load_sim(t) else ""
        out.append(T(cfg, f"  סוללת המחשב: {b['percent']}% ({plug})", f"  laptop battery: {b['percent']}% ({plug})") + limits + sim)
    else:
        out.append(T(cfg, "  סוללת המחשב: לא נמצאה (מחשב נייח?) או שלא ניתן לקרוא אותה כרגע",
                     "  laptop battery: none found (desktop computer?) or not readable right now"))
    pc, p = cfg["phone"], rd.get("phone")
    if not pc.get("enabled"):
        out.append(T(cfg, "  סוללת הטלפון: לא הוגדרה (ראו references/phone.md)",
                     "  phone battery: not set up (see references/phone.md)"))
    else:
        ph = read_json(PHONE_FILE, {}) or {}
        ago = fmt_ago(t - float(p.get("at") or t), lang) if p else ""
        seen = (T(cfg, f"{p['percent']}% (דווח לפני {ago})", f"{p['percent']}% (reported {ago} ago)") if p
                else T(cfg, "עדיין לא התקבל דיווח", "no report yet"))
        err = T(cfg, f"  [הבדיקה האחרונה נכשלה: {ph['poll_error']}]",
                f"  [last poll failed: {ph['poll_error']}]") if ph.get("poll_error") else ""
        out.append(T(cfg, f"  סוללת הטלפון: {seen}  · עצירה ב-{pc['pause_at']}%, המשך ב-{pc['resume_at']}%{err}",
                     f"  phone battery: {seen}  · pauses at {pc['pause_at']}%, resumes at {pc['resume_at']}%{err}"))
    uc, usage = cfg["usage"], rd.get("usage") or {}
    if not uc.get("enabled"):
        out.append(T(cfg, "  שימוש: לא במעקב", "  usage: not watched"))
    elif usage:
        for w, r in usage.items():
            name = T(cfg, "מכסת 5 השעות" if w == "five_hour" else "המכסה השבועית", f"{WINDOW_LABEL[w]} usage")
            reset, read = fmt_time(r["resets_at"], lang), fmt_ago(t - r["captured_at"], lang)
            out.append(T(cfg, f"  {name}: {r['used']:.0f}% (מתאפסת {reset}, נקרא לפני {read})  · "
                              f"נקודת ביניים ב-{uc['checkpoint_at']}%, עצירה ב-{uc['pause_at']}%",
                         f"  {name}: {r['used']:.0f}% (resets {reset}, read {read} ago)  · "
                         f"checkpoint at {uc['checkpoint_at']}%, pauses at {uc['pause_at']}%"))
    else:
        out.append(T(cfg, "  שימוש: אין עדיין מספרים עדכניים (הם מגיעים משורת הסטטוס של Claude Code ומופיעים "
                          "אחרי התשובה הראשונה בשיחה)",
                     "  usage: no fresh numbers (they come from the Claude Code status line; they appear "
                     "after the first reply in a session)"))
    last = float(state.get("last_tick") or 0)
    if last and t - last < 300:
        out.append(T(cfg, f"  שומר הרקע: רץ לאחרונה לפני {fmt_ago(t - last, lang)}",
                     f"  watchdog: last run {fmt_ago(t - last)} ago"))
    else:
        out.append(T(cfg, "  שומר הרקע: לא פועל, ולכן שום דבר לא ימשיך לבד (להריץ scripts/install.py)",
                     "  watchdog: not running, so nothing resumes by itself (run scripts/install.py)"))
    recs = sorted((r for r in idx["records"].values() if r.get("status") in OPEN_STATES),
                  key=lambda r: r.get("created_at", 0))
    out.append(T(cfg, f"  עבודות פתוחות: {len(recs)}", f"  open handoffs: {len(recs)}"))
    for r in recs[-8:]:
        out.append(f"    [{status_word(cfg, r['status'])}] {r['id']}: {r.get('title', '')[:70]}")
    print("\n".join(out))
    return 0


def cmd_list(args) -> int:
    cfg = load_config()
    with Lock():
        sync_index(load_state(), now())
    recs = sorted(load_index()["records"].values(), key=lambda r: r.get("created_at", 0), reverse=True)
    cwd = os.path.normcase(os.path.abspath(args.cwd)) if args.cwd else None
    shown = 0
    for r in recs:
        if not args.all and r.get("status") not in OPEN_STATES + ("checkpoint",):
            continue
        if cwd and os.path.normcase(r.get("cwd", "")) != cwd:
            continue
        saved = fmt_time(r.get("created_at", 0), lang_of(cfg))
        why = "  · " + r["why"] if r.get("why") else ""
        print(f"[{status_word(cfg, r.get('status', ''))}] {r['id']}\n    {r.get('title', '')}\n"
              + T(cfg, f"    תיקייה: {r.get('cwd') or '?'}  · נשמר {saved}{why}",
                  f"    folder: {r.get('cwd') or '?'}  · saved {saved}{why}"))
        shown += 1
    if not shown:
        print(T(cfg, "אין עבודות פתוחות." + ("" if args.all else " (עם --all מוצגות גם עבודות שהסתיימו)"),
                "No open handoffs." + ("" if args.all else " (--all shows finished ones too)")))
    return 0


def cmd_show(args) -> int:
    cfg, t = load_config(), now()
    as_file = Path(args.id).expanduser()
    if as_file.suffix == ".md" and as_file.is_file():  # a handoff outside the index (e.g. in a repo)
        print(read_text(as_file))
        return 0
    with Lock():
        idx = load_index()
        rec = find_record(idx, args.id)
        if rec and args.claim and rec.get("status") in ("pending", "resumed", "checkpoint"):
            rec.update({"status": "in_progress", "claimed_at": t,
                        "claimed_by": os.environ.get("CLAUDE_CODE_SESSION_ID", "")})
            save_index(idx)
    if not rec:
        print(T(cfg, f"לא נמצא מסמך העברה בשם '{args.id}'. הפתוחים:", f"No handoff matches '{args.id}'. Open ones:"))
        return cmd_list(argparse.Namespace(all=False, cwd=None)) or 1
    why = f"  ({rec['why']})" if rec.get("why") else ""
    saved = fmt_time(rec.get("created_at", 0), lang_of(cfg))
    print(T(cfg, f"מזהה: {rec['id']}\nמצב: {status_word(cfg, rec.get('status', ''))}\nתיקייה: {rec.get('cwd') or '?'}\n"
                 f"נשמר: {saved}{why}\nהשיחה הקודמת: {rec.get('transcript') or '?'}\n",
            f"id: {rec['id']}\nstatus: {rec.get('status')}\nfolder: {rec.get('cwd') or '?'}\n"
            f"saved: {saved}{why}\nearlier conversation: {rec.get('transcript') or '?'}\n") + "-" * 60)
    print(read_text(Path(rec["file"])) or T(cfg, "(קובץ מסמך ההעברה חסר)", "(the handoff file is missing)"))
    lessons = project_lessons(rec.get("cwd", ""))
    if lessons:
        print("-" * 60 + "\n" + T(cfg, "לקחים מהעבר בפרויקט הזה:", "Lessons learned earlier in this project:"))
        print("\n".join(f"- {s}" for s in lessons))
    done = guard_cmd(cfg, "complete", rec["id"])
    print("-" * 60 + "\n" + T(cfg, f"כשהעבודה הזאת מסתיימת, להריץ: {done}", f"When this work is finished, run: {done}"))
    return 0


def _set_status(ref: str, status: str) -> int:
    cfg = load_config()
    with Lock():
        idx = load_index()
        rec = find_record(idx, ref)
        if not rec:
            print(T(cfg, f"לא נמצא מסמך העברה בשם '{ref}'.", f"No handoff matches '{ref}'."))
            return 1
        rec.update({"status": status, "updated_at": now()})
        save_index(idx)
    print(f"{rec['id']}: {status_word(cfg, status)}")
    return 0


def cmd_complete(args) -> int:
    return _set_status(args.id, "done")


def cmd_dismiss(args) -> int:
    return _set_status(args.id, "dismissed")


def cmd_handoff_path(args) -> int:
    cfg, t = load_config(), now()
    sid = args.session or os.environ.get("CLAUDE_CODE_SESSION_ID") or f"manual{int(t) % 100000}"
    cwd = os.path.abspath(args.cwd or os.getcwd())
    with Lock():
        state = load_state()
        path = handoff_path_for(state, sid, cwd, t)
        save_state(state)
    print(path)
    return 0


def cmd_handoff_done(args) -> int:
    cfg, t = load_config(), now()
    path = Path(args.file).expanduser()
    if args.nothing_pending and not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("NOTHING PENDING\n", encoding="utf-8")
    if not path.exists():
        print(T(cfg, f"הקובץ לא קיים: {path}", f"No such file: {path}"))
        return 1
    sid = args.session or os.environ.get("CLAUDE_CODE_SESSION_ID", "")
    with Lock():
        state = load_state()
        sess = (state.get("sessions") or {}).get(sid) or {}
        rec = register_handoff(path, t, session_id=sid, cwd=os.path.abspath(args.cwd or sess.get("cwd") or os.getcwd()),
                               transcript=sess.get("transcript", ""), episode=sess.get("episode"),
                               status="nothing" if args.nothing_pending else None,
                               why=sess.get("why") or T(cfg, "עצירה ידנית", "manual"))
        if sess:
            sess.update({"status": "done", "record": rec["id"]})
            save_state(state)
    print(T(cfg, f"מסמך ההעברה נשמר: {rec['id']} ({status_word(cfg, rec['status'])}): {rec['title']}",
            f"Saved handoff {rec['id']} ({rec['status']}): {rec['title']}"))
    if rec["status"] == "pending" and not rec.get("episode"):
        print(T(cfg, "הוא יוצע כשתיפתח שיחה חדשה בתיקייה הזאת (/session-guard resume).",
                "It will be offered when a new session starts in this folder (/session-guard resume)."))
    return 0


def cmd_pause(args) -> int:
    cfg, t = load_config(), now()
    with Lock():
        state = load_state()
        state.setdefault("reasons", {})["manual"] = {"since": t, "note": args.note or ""}
        apply_mode(state, t)
        state["override"] = None
        save_state(state)
    print(T(cfg, "כל שיחות Claude Code במחשב הזה הושהו. כל שיחה שבאמצע עבודה תכתוב מסמך העברה בצעד "
                 "הבא שלה. כדי לסיים את העצירה: resume",
            "Paused all Claude Code sessions on this computer. Each busy session writes a handoff at its "
            "next step. Run `resume` to end the pause."))
    return 0


def cmd_resume(args) -> int:
    cfg, t = load_config(), now()
    with Lock():
        state = load_state()
        state.setdefault("reasons", {}).pop("manual", None)
        if args.force:
            state["reasons"] = {}
        evaluate(cfg, state, readings(cfg, t, 5), t)  # reasons that still hold come straight back
        save_state(state)
    if state.get("mode") == "paused":
        why, until = summarize(state, cfg)
        print(T(cfg, f"עדיין מושהה: {why}. ימשיך {until}. כדי לעבוד בכל זאת: override",
                f"Still paused: {why}. It continues {until}. To work anyway: override"))
        return 0
    print(T(cfg, "לא מושהה." + (" עבודות שממתינות יופעלו על ידי שומר הרקע תוך דקה." if state.get("resume_pending") else ""),
            "Not paused." + (" Pending handoffs will be started by the watchdog within a minute."
                             if state.get("resume_pending") else "")))
    if args.now:
        return cmd_tick(args)
    return 0


def cmd_override(args) -> int:
    cfg, t = load_config(), now()
    with Lock():
        state = load_state()
        if args.off:
            state["override"] = None
            msg = T(cfg, "העקיפה בוטלה: השמירה פעילה שוב.", "Override off: the guard is active again.")
        else:
            minutes = args.minutes or cfg["override_minutes"]
            state["override"] = {"until": t + minutes * 60, "set_at": t}
            until = fmt_time(t + minutes * 60, lang_of(cfg))
            msg = T(cfg, f"עקיפה ל-{minutes} דקות: שום דבר לא נעצר או נחסם עד {until}.",
                    f"Override on for {minutes} minutes: nothing is paused or blocked until {until}.")
        save_state(state)
    print(msg)
    return 0


def cmd_launch(args) -> int:
    cfg = load_config()
    with Lock():
        idx = load_index()
        rec = find_record(idx, args.id)
    if not rec:
        print(T(cfg, f"לא נמצא מסמך העברה בשם '{args.id}'.", f"No handoff matches '{args.id}'."))
        return 1
    ok, how = launch(cfg, rec)
    with Lock():
        idx = load_index()
        r = idx["records"].get(rec["id"], rec)
        r["launch"] = {"at": now(), "ok": ok, "detail": how}
        if ok:
            r["status"] = "resumed"
        save_index(idx)
    print((T(cfg, "נפתחה שיחה חדשה: ", "Started: ") if ok else T(cfg, "לא הצלחתי לפתוח: ", "Could not start: ")) + how)
    return 0 if ok else 1


def cmd_simulate(args) -> int:
    cfg, t = load_config(), now()
    if args.clear:
        try:
            SIM_FILE.unlink()
        except OSError:
            pass
        print(T(cfg, "ההדמיה בוטלה; חוזרים לקריאות האמיתיות.", "Simulation cleared; real readings are used again."))
    else:
        sim = load_sim(t)
        sim["expires_at"] = t + args.hours * 3600
        if args.battery is not None:
            sim["battery"] = {"percent": args.battery, "on_ac": args.charging, "status": "simulated"}
        if args.phone is not None:
            sim["phone"] = {"percent": args.phone, "at": t}
        if args.usage_5h is not None or args.usage_7d is not None:
            u = sim.get("usage") or {"captured_at": t}
            resets = t + args.resets_in * 60
            if args.usage_5h is not None:
                u["five_hour"] = {"used_percentage": args.usage_5h, "resets_at": resets}
            if args.usage_7d is not None:
                u["seven_day"] = {"used_percentage": args.usage_7d, "resets_at": resets}
            sim["usage"] = u
        write_json(SIM_FILE, sim)
        what = json.dumps({k: v for k, v in sim.items() if k != "expires_at"}, ensure_ascii=False)
        until = fmt_time(sim["expires_at"], lang_of(cfg))
        print(T(cfg, f"הדמיה פעילה עד {until}: {what}", f"Simulating {what} until {until}."))
    return cmd_status(argparse.Namespace(json=False))


def cmd_phone_report(args) -> int:
    cfg = load_config()
    level = parse_phone_message(args.level)
    if level is None:
        print(T(cfg, "צריך לתת אחוז סוללה, למשל 5 או 5%.", "Give a battery level such as 5 or 5%."))
        return 1
    with Lock():
        cur = read_json(PHONE_FILE, {}) or {}
        cur.update({"percent": level, "at": now()})
        write_json(PHONE_FILE, cur)
    print(T(cfg, f"סוללת הטלפון נרשמה: {level}%", f"Phone battery recorded: {level}%"))
    return 0


def _parse_value(v: str):
    try:
        return json.loads(v)
    except ValueError:
        return v


def cmd_config(args) -> int:
    over = read_json(CONFIG_FILE, {}) or {}
    for item in args.set or []:
        if "=" not in item:
            print(T(load_config(), f"צריך מפתח=ערך, למשל usage.pause_at=90 (התקבל {item!r})",
                    f"Use key=value, e.g. usage.pause_at=90 (got {item!r})"))
            return 1
        key, val = item.split("=", 1)
        node = over
        parts = key.strip().split(".")
        for p in parts[:-1]:
            node = node.setdefault(p, {})
        node[parts[-1]] = _parse_value(val.strip())
    if args.set:
        write_json(CONFIG_FILE, over)
    print(json.dumps(deep_merge(DEFAULTS, over), ensure_ascii=False, indent=2))
    return 0


def main(argv=None) -> int:
    for stream in (sys.stdin, sys.stdout, sys.stderr):  # Windows consoles default to a code page
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError, OSError):
            pass
    ap = argparse.ArgumentParser(prog="guard.py", description="Session Guard for Claude Code")
    ap.add_argument("--version", action="version", version=VERSION)
    ap.add_argument("--home", help="state folder (default ~/.claude/session-guard)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("hook", help="Claude Code hook entry point (JSON on stdin)").set_defaults(fn=cmd_hook)
    sub.add_parser("statusline", help="Claude Code statusLine entry point").set_defaults(fn=cmd_statusline)
    sub.add_parser("tick", help="watchdog step (run every minute)").set_defaults(fn=cmd_tick)
    p = sub.add_parser("status", help="readings, mode and open handoffs")
    p.add_argument("--json", action="store_true")
    p.set_defaults(fn=cmd_status)
    p = sub.add_parser("list", help="list handoffs")
    p.add_argument("--all", action="store_true")
    p.add_argument("--cwd")
    p.set_defaults(fn=cmd_list)
    p = sub.add_parser("show", help="print a handoff (and lessons) to continue it")
    p.add_argument("id")
    p.add_argument("--claim", action="store_true", help="mark it as being worked on")
    p.set_defaults(fn=cmd_show)
    p = sub.add_parser("complete", help="mark a handoff as finished")
    p.add_argument("id")
    p.set_defaults(fn=cmd_complete)
    p = sub.add_parser("dismiss", help="drop a handoff without doing it")
    p.add_argument("id")
    p.set_defaults(fn=cmd_dismiss)
    p = sub.add_parser("handoff-path", help="where this session should write its handoff")
    p.add_argument("--session")
    p.add_argument("--cwd")
    p.set_defaults(fn=cmd_handoff_path)
    p = sub.add_parser("handoff-done", help="register a handoff written by hand")
    p.add_argument("--file", required=True)
    p.add_argument("--session")
    p.add_argument("--cwd")
    p.add_argument("--nothing-pending", action="store_true")
    p.set_defaults(fn=cmd_handoff_done)
    p = sub.add_parser("pause", help="pause all sessions on this computer now")
    p.add_argument("--note")
    p.set_defaults(fn=cmd_pause)
    p = sub.add_parser("resume", help="end a manual pause")
    p.add_argument("--force", action="store_true", help="clear every reason (they come back if still true)")
    p.add_argument("--now", action="store_true", help="start pending handoffs right away")
    p.set_defaults(fn=cmd_resume)
    p = sub.add_parser("override", help="let Claude work despite the guard for a while")
    p.add_argument("minutes", nargs="?", type=int)
    p.add_argument("--off", action="store_true")
    p.set_defaults(fn=cmd_override)
    p = sub.add_parser("launch", help="start a new session for one handoff")
    p.add_argument("id")
    p.set_defaults(fn=cmd_launch)
    p = sub.add_parser("simulate", help="pretend readings, to test the setup")
    p.add_argument("--battery", type=int)
    p.add_argument("--charging", action="store_true")
    p.add_argument("--phone", type=int)
    p.add_argument("--usage-5h", type=float)
    p.add_argument("--usage-7d", type=float)
    p.add_argument("--resets-in", type=float, default=60, help="minutes until the simulated usage resets")
    p.add_argument("--hours", type=float, default=2, help="how long the simulation lasts")
    p.add_argument("--clear", action="store_true")
    p.set_defaults(fn=cmd_simulate)
    p = sub.add_parser("phone-report", help="record a phone battery level by hand")
    p.add_argument("level")
    p.set_defaults(fn=cmd_phone_report)
    p = sub.add_parser("config", help="show or change settings, e.g. --set usage.pause_at=90")
    p.add_argument("--set", action="append", metavar="KEY=VALUE")
    p.set_defaults(fn=cmd_config)
    args = ap.parse_args(argv)
    if args.home:
        set_home(Path(args.home))
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
