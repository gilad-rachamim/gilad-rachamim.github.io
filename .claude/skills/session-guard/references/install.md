# Installing and running Session Guard

## Contents
- Requirements
- Install, update, uninstall
- What gets installed
- How a pause plays out
- Testing without a dying battery
- Troubleshooting
- Limits

## Requirements

- **Claude Code** on the computer, as the `claude` command. Resuming uses background sessions
  (`claude --bg`), so keep Claude Code up to date (`claude update`).
- **Python 3.8 or newer.**
  - macOS: `python3` comes with the Xcode command line tools (`xcode-select --install`) or
    Homebrew (`brew install python`).
  - Windows: install from python.org or with `winget install Python.Python.3.12`, ticking
    "Add python.exe to PATH". Use `py` or `python` where these notes say `python3`.
  - Linux: usually there already.
- A Claude Pro or Max subscription for the usage numbers (Claude Code reports `rate_limits` to the
  status line only for subscribers). Battery protection works without it.

## Install, update, uninstall

From the folder that holds the skill (for example a clone of the repository it lives in):

```sh
python3 .claude/skills/session-guard/scripts/install.py            # computer battery + usage
python3 .claude/skills/session-guard/scripts/install.py --phone    # ... and the phone battery
```

Then open a **new** Claude Code session (running sessions don't reload hooks) and check with
`/session-guard status`.

| Option | Effect |
|---|---|
| `--phone` | Creates a private ntfy topic for the phone battery and prints its address (see `phone.md`). |
| `--alerts` | With `--phone`: also push "paused" / "resumed" alerts to the phone (subscribe in the ntfy app). |
| `--lang he` / `--lang en` | Language of the notifications (default Hebrew). |
| `--resume-mode terminal` | Resume in visible terminal windows instead of background sessions; `none` turns automatic resume off. |
| `--no-scheduler` | Don't register the watchdog (then nothing restarts by itself). |
| `--no-statusline` | Leave the status line alone (then usage is not watched). |
| `--uninstall [--purge]` | Remove hooks, status line, watchdog and the skill copy; `--purge` also deletes handoffs and lessons. |

Running the installer again updates everything in place; your `config.json` edits are kept.

## What gets installed

- **Skill**: `~/.claude/skills/session-guard/` (so `/session-guard` works in every folder).
- **Hooks** in `~/.claude/settings.json`, all running `guard.py hook`:
  `PreToolUse` (every tool), `UserPromptSubmit`, `Stop`, `SessionStart`, and `StopFailure` on
  recent Claude Code versions. A backup `settings.json.session-guard-backup-<time>` is written
  first.
- **Status line** `guard.py statusline`: it saves the `rate_limits` numbers (5-hour and weekly
  usage, with reset times) and shows `5h 42% · 7d 63% · 🔋54%`. A status line you already had keeps
  running; its output is printed first.
- **Watchdog**, `guard.py tick` every minute:
  - macOS: `~/Library/LaunchAgents/com.claude.session-guard.plist` (launchd)
  - Windows: Task Scheduler task `ClaudeSessionGuard` (allowed to run on battery)
  - Linux: `~/.config/systemd/user/claude-session-guard.timer`, or a crontab line
- **Data** in `~/.claude/session-guard/`: `config.json` (settings), `state.json` (mode, reasons,
  sessions), `usage.json`, `handoffs/` (one `.md` per handoff plus `index.json`), `lessons.md`,
  `guard.log`.

## How a pause plays out

1. A reason starts: laptop battery ≤ 5% while unplugged, phone battery ≤ 5%, or 5-hour/weekly usage
   ≥ 95%. Hooks notice at the next tool call or prompt; the watchdog within a minute and shows a
   desktop notification.
2. Each busy session: its next tool call is refused with instructions and a handoff path. Claude
   writes the handoff, tells the user, ends its turn. If it doesn't manage within 30 tool calls or
   8 minutes, or the turn ends without a handoff, the guard writes one from the conversation file.
   Then any further tool call stops the session (`continue: false`).
3. New prompts are blocked with a message. Prompts typed by the user are saved as small handoffs
   and run when the pause ends. `/session-guard ...` prompts always go through.
4. Before that, at 90% usage (or ≤ 10% battery on battery power), each busy session is asked once
   to save a short checkpoint into the same handoff file, so even a hard stop leaves notes.
5. A usage limit that is hit anyway (API `rate_limit` error) pauses the other sessions too. The
   session that was cut off is continued by Claude Code itself after the reset (its
   `autoContinueAtUsageLimit` setting, on by default); the guard keeps notes on it as a checkpoint,
   or queues it for a new session if that setting is off.
6. The pause ends when every reason has cleared: battery back at 10% (even if still charging),
   phone back at 10%, usage window reset (at `resets_at`). The watchdog then starts
   one background session per handoff from that pause (at most 5), each with the prompt
   `/session-guard resume <id>`, and notifies the user. See them with `claude agents`; open one
   with `claude attach <id>`.

## Testing without a dying battery

```sh
G=~/.claude/skills/session-guard/scripts/guard.py
python3 $G simulate --battery 4          # pretend: laptop at 4%, unplugged
python3 $G simulate --usage-5h 96 --resets-in 3   # pretend: 5-hour usage 96%, resets in 3 minutes
python3 $G simulate --phone 4            # pretend: the phone reported 4%
python3 $G status                        # what the guard sees
python3 $G simulate --clear              # back to real readings (simulations also expire after 2 hours)
```

With a simulation on, give Claude a small multi-step task in a new session and watch it write a
handoff and stop. Clear the simulation, wait a minute, and `claude agents` shows the resumed
session. `guard.log` records every decision.

## Troubleshooting

- **"usage: no fresh numbers"**: the numbers come from the status line. They appear after the
  first reply in a terminal session. If they never do, another tool may have replaced the
  `statusLine` setting (run the installer again), or the account is not on a Pro/Max plan.
- **Watchdog not running** (`status` says so):
  macOS `launchctl print gui/$(id -u)/com.claude.session-guard`;
  Windows: Task Scheduler, task `ClaudeSessionGuard`, History tab;
  Linux `systemctl --user status claude-session-guard.timer`. Its output goes to
  `~/.claude/session-guard/watchdog.log`.
- **Resumed sessions are waiting for approvals**: background sessions use your normal permission
  mode. To let them work unattended, set e.g.
  `guard.py config --set resume.permission_mode=acceptEdits`.
- **Seeing resumed sessions on the phone**: turn on Remote Control for all sessions in `/config`
  (the `remoteControlAtStartup` setting); background sessions then show up in the Claude app.
- **macOS asks whether python3 may access Documents/Desktop**: allow it; the watchdog starts
  sessions in your project folders.
- **Windows**: Claude Code runs hook commands through Git Bash when it is installed, otherwise
  through PowerShell. The installer writes the right form; run it again after installing or
  removing Git for Windows.
- **Switch it off quickly**: `guard.py config --set enabled=false` (or the environment variable
  `SESSION_GUARD_DISABLE=1`); `/session-guard override 120` for a two-hour break.
- Hooks fail open: an error inside the guard is written to `guard.log` and never blocks your work.

## Limits

- Only Claude Code sessions running on this computer are paused: terminal sessions, background
  sessions, Remote Control sessions, IDE sessions. Cloud sessions on claude.ai/code and chats in
  the Claude app are not (see the cloud section of `SKILL.md` for a manual pause there).
- A session that is waiting for the user writes no handoff (there is nothing in flight); it just
  can't take new prompts until the pause ends.
- A long command that is already running is not interrupted; the pause happens at the next step.
- Usage numbers refresh only while a terminal session is active, so a pause based on usage can
  only start while Claude is working, which is exactly when it matters.
- If the computer is off when the pause ends, the work resumes once it is on again.
