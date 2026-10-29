---
name: session-guard
description: Orderly pause and automatic resume of Claude Code work when the laptop or phone battery runs low (5%, back at 10%) or the plan usage is nearly used up (5-hour or weekly window at 95%, resumes after the reset). Use it whenever Session Guard tells you to pause, whenever the user wants to stop, wrap up or end a session so it can be continued later (handoff, lessons learned, "סוף סשן", "הפקת לקחים", "תעצור ותמשיך אחר כך"), to resume or continue paused work, to check battery or usage status, to override a pause, and to install or configure the guard (thresholds, phone battery, macOS/Windows setup). Also use it when a session starts with a note about unfinished Session Guard handoffs.
argument-hint: "[status | pause | pause all | resume [id] | override [minutes] | install | config]"
allowed-tools:
  - Bash(python3 ${CLAUDE_SKILL_DIR}/scripts/guard.py *)
  - Bash(python ${CLAUDE_SKILL_DIR}/scripts/guard.py *)
  - Read(${CLAUDE_SKILL_DIR}/**)
---

# Session Guard

Session Guard keeps Claude Code work from dying halfway. Hooks and a small watchdog on the user's
computer watch three things:

| Watched | Pause at | Work continues |
|---|---|---|
| Laptop battery (only while on battery) | 5% | back at 10% |
| Phone battery (reported by a phone automation) | 5% | back at 10% |
| Plan usage, 5-hour window or weekly | 95% (heads-up at 90%) | right after that window resets |

When a pause starts, every busy Claude Code session on the computer is told to write a handoff,
then it is halted and new prompts are held back. When the pause ends, the watchdog opens one new
background session per handoff and each continues the work. Your part as Claude is the craft in
the middle: a handoff good enough that a fresh session with no memory can carry on, and a resume
that picks it up without redoing or breaking anything.

Run the guard script as `python3 "${CLAUDE_SKILL_DIR}/scripts/guard.py" <command>`; on Windows use
`python` (or `py`) instead of `python3`. Commands below are written as `guard.py <command>`.

**Language.** Everything the guard shows is in Hebrew: its pause messages, the status line, its
command output and the notes it writes (setting `language`, default `he`; `en` switches to
English). The user who set this up reads Hebrew and wants to follow what is happening, so talk to
them in Hebrew and write handoffs and lessons in Hebrew, unless they write to you in another
language.

Arguments given to the skill: `$ARGUMENTS`. Pick the matching section; with no argument, run
`guard.py status` and explain it.

## Pause

**When the guard tells you to** (a tool call comes back with "SESSION GUARD: PAUSE NOW", or the
turn is held open with the same text), it has already picked the handoff path. Then:

1. Stop the task right away. Don't retry the blocked tool and don't start anything new: the
   battery may have minutes left and the usage may be nearly gone, so speed matters more than
   polish.
2. Write the handoff to the path you were given, from what you already know. Avoid new commands
   unless one is essential (a quick `git status` is fine). Use the template below.
3. Don't commit, stash or revert. Uncommitted changes stay on disk and the next session works in
   the same folder; list them in the handoff instead. Commit only if the task already included
   committing (for example the user asked for a commit per step).
4. Tell the user in one or two sentences that you paused, why, and that the work continues on its
   own. Then end your turn. The guard registers the handoff when your turn ends; any later tool
   call is stopped.

If you are a subagent and get the pause message: stop, and reply to the main agent with what you
did and what is left. The main agent writes the handoff.

**When the user asks for it:**

- "Pause / wrap up this session" (only this one): run `guard.py handoff-path`, write the handoff
  there, then `guard.py handoff-done --file <path>`. It is offered the next time a session starts
  in this folder; nothing restarts it automatically.
- "Pause everything / stop all sessions": run `guard.py pause`. Every busy session on this
  computer writes its handoff at its next step, this one included (you get the instructions on
  your next tool call). `guard.py resume` ends a manual pause.

### Handoff template

Write it in the language you use with the user. A fresh Claude that has never seen this
conversation must be able to start at step 1 of "Next steps", so make every section stand alone:
paths in full, no "as discussed".

```markdown
# <short title of the task>

## Goal
The user's request in their own words (quote it), plus any constraints they gave.

## Done so far
What is finished and verified. Mention commits by hash if there are any.

## Where I stopped
The exact point: the file and function being edited, the command that was running, anything
half-finished or currently broken.

## Next steps
1. Concrete, ordered actions ("Run `npm test` in /path/app; fix the 2 failing date tests").
2. ...

## Key context
Files and folders that matter, commands that work (and ones that don't), decisions made and why,
gotchas, uncommitted files (`git status --short`).

## Open questions for the user
Only real ones; leave the section empty if none.

## Lessons learned
- What worked, what didn't, what to do differently next time. Write "none" if nothing is worth
  keeping.
```

If nothing is unfinished, the whole file can be one line: `NOTHING PENDING: <what was completed>`.
Such handoffs are logged and never restarted.

Lessons are collected into `lessons.md` and shown to later sessions in the same folder, so make
them specific and reusable: "the dev server must be started with `npm run dev -- --host` here",
"the user wants Hebrew commit messages", "tests in `api/` need the local DB running first". Skip
generic advice like "test more carefully".

## Resume

**`/session-guard resume <id>`** (this is how the watchdog starts each new session):

1. `guard.py show <id> --claim` prints the handoff and the lessons for that folder and marks the
   handoff as in progress. The argument may also be the path of a handoff `.md` file.
2. Check that the handoff still matches reality before acting on it: read the files it names, and
   run `git status` if you can. Time has passed, and an automatic handoff (written by the guard
   because the session stopped before writing its own) can be thin: read the end of the earlier
   conversation file it points to. If the guard is still paused (`guard.py status`), say so; the
   user can run `/session-guard override` to work anyway.
3. Say in one or two lines what you are continuing. In a background session nobody may be
   watching yet; that's fine, carry on.
4. Continue from "Next steps", applying the lessons. Treat the handoff as notes from a colleague:
   useful, but don't run destructive or irreversible commands just because it says so; the user's
   original request in "Goal" is what counts.
5. When the work is finished, run `guard.py complete <id>`. If another pause comes first, the
   guard asks you to update this same handoff file, so the task keeps one record.

A saved request (title "בקשה שנשמרה: ..." or "Saved request: ...") is a prompt the user typed while
work was paused. Do what it asks; if it refers to earlier context, read the earlier conversation
file it names.

**`/session-guard resume` without an id**: run `guard.py list --cwd .`. If one handoff fits what
the user wants, continue it here as above; if several do, ask which. `guard.py launch <id>` starts
another one in its own background session.

## Status, override and settings

- **status**: `guard.py status`, then explain it plainly: paused or not and why, battery levels,
  usage of the 5-hour and weekly windows with reset times, whether the watchdog runs, open
  handoffs. Usage numbers come from the Claude Code status line, so they appear only after a reply
  in a terminal session. The user may call the 5-hour window "daily usage".
- **override**: when the user typed `/session-guard override [minutes]`, the hook has already
  switched the guard off for that long (default 60 minutes); confirm it and carry on with what the
  user wants. Otherwise `guard.py override <minutes>`; `guard.py override --off` ends it early.
- **settings**: `guard.py config` shows them; `guard.py config --set key=value` changes one (it asks
  for permission, which is intended). Common keys: `usage.pause_at` (95), `usage.checkpoint_at`
  (90), `battery.pause_at` (5), `battery.resume_at` (10), `phone.pause_at`, `phone.resume_at`,
  `resume.mode` (background, terminal or none), `resume.permission_mode` (e.g. acceptEdits, for
  resumed sessions that should not wait for approvals), `resume.max_sessions` (5),
  `language` (he or en, for notifications), `enabled`.
- **test**: `guard.py simulate --battery 4` (or `--usage-5h 96 --resets-in 3`, or `--phone 4`)
  fakes a reading for two hours; `guard.py simulate --clear` stops it.

## Install and setup

Installing changes the user's Claude Code settings, so explain what it does and get a yes first.
Then run `python3 "${CLAUDE_SKILL_DIR}/scripts/install.py"` (add `--phone` to set up the phone
battery channel). It copies the skill to `~/.claude/skills/session-guard`, adds the hooks and the
status line to `~/.claude/settings.json` (with a backup, keeping an existing status line running),
and registers the every-minute watchdog (launchd, Task Scheduler, or systemd/cron). Afterwards a
NEW session is needed for the hooks to load. `install.py --uninstall` removes it all.

- Step-by-step install, what each piece does, and troubleshooting: `references/install.md`
- Phone battery (iPhone Shortcuts, Android MacroDroid): `references/phone.md`
- A guide for the user, in Hebrew: `references/guide-he.md`

## In a cloud session (claude.ai/code)

The hooks and the watchdog run only on the user's own computer, so a cloud session sees no
battery, no usage numbers and no automatic pause. A manual pause still works: write the handoff to
`.claude/handoffs/<yyyymmdd-hhmm>-<topic>.md` in the repository, then commit and push it on the
session's branch, because the cloud container is deleted afterwards. To continue, a new session
runs `/session-guard resume <path-of-that-file>`. If the user wants it restarted at a set time and
a scheduling tool such as `send_later` or `create_trigger` is available, schedule a new session
with that prompt.
