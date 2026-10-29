---
name: data-keeper
description: "Makes sure nothing Gilad tells Claude is ever lost: a hook saves each of his messages verbatim to a daily log before Claude even reads it; after a compaction his own words from the session are put back into context; at session end and day end a fact sweep checks that every phone, date, time, amount, number and decision he gave is stored in a real place; recall finds anything he ever said. Also backs up ~/.claude and recovers a session that died. TRIGGER on Hebrew: 'מה אמרתי על', 'מתי אמרתי', 'תמצא איפה כתבתי', 'תחפש בכל מה שאמרתי', 'מה סיכמנו על', 'שלא יאבד', 'תשמור את כל הנתונים', 'בדיקת נתונים', 'גיבוי', 'המחשב נכבה באמצע', 'השיחה נתקעה', 'אל תשמור את זה'. English: 'recall', 'what did I say about', 'fact sweep', 'backup claude'. Also used by end-session (fact sweep, backup, recover) and session-retro day mode. NOT for skill ideas (session-retro)."
---

# Data Keeper - שומר הנתונים

## Purpose
Gilad (29.10.2026): "כל נתון שאני אומר הוא קריטי". Claude's context is not a safe place:
it gets compacted, sessions die (the PC battery ran out mid-work that day), and details slip
between sessions. This skill puts his words on disk the moment he sends them, gives them back
when context is lost, checks at every close that each fact landed in a real store, and finds
anything later.

**Language:** Hebrew, short. Never change his words in the log.

## What runs by itself (hooks, installed with the upgrade's `merge_settings.py`)
| Hook | Script | What it does |
|---|---|---|
| UserPromptSubmit | `scripts/log_prompt.py` | appends each message, verbatim, to `~/.claude/user-log/YYYY-MM-DD/<session>.jsonl` before Claude processes it |
| SessionStart (compact) | `scripts/after_compact.py` | right after a compaction, puts this session's messages back into context: the first one plus the newest that fit in ~9,000 chars |

One file per session per day, so parallel sessions never write to the same file. Both
scripts always exit 0 - they can never block a prompt.

## Recall - "מה אמרתי על..."
`python -I ~/.claude/skills/data-keeper/scripts/recall.py <words> [--days N] [--also <folder> ...] --out <scratchpad>/recall.md`
- All words must appear. A Hebrew word also matches after up to two prefix letters
  (ו ה ב ל מ ש כ - so "ועדה" finds "הוועדה"); digits match across dashes and spaces.
- `--also` adds memory folders, journals and primers (.md / .txt) to the search.
- `--day YYYY-MM-DD` shows a whole day; `--session <id>` a whole session.
- Answer with the date, the time and his exact words, and say where it is stored - or that
  it exists only in the log, and offer to save it in its proper place.
- Verify: the report header counts the matches; zero matches -> try fewer or shorter words
  before saying it was never said.

## Fact sweep - every data point lands somewhere
Run at end-session (Step 8b) and in session-retro day mode:
`python -I ~/.claude/skills/data-keeper/scripts/fact_sweep.py --latest --check <memory folder> <project folder> --out <scratchpad>/facts.md`
(`--latest` = this session; `--today`, `--day`, `--days N` for wider sweeps.)
1. Read the report. Literal facts - phones, dates, times, amounts, percentages, long
   numbers, emails, links - are checked against the folders: stored, or **NOT FOUND**.
2. Every NOT FOUND and every decision sentence ("תזכור", "חשוב לי", "מעכשיו", "החלטתי"...)
   -> make sure it lives in its right place: a memory (preference / fact), the primer or
   journal (project state), the project's own file, or - for a future date - a reminder or
   calendar entry (with his OK).
3. Not really a fact (a number inside a command, a version) -> skip it.
4. **Secrets** (passwords, codes, card numbers) are listed separately: never copy them into
   memory or project files - ask Gilad where they belong.
5. Report one line: `נתונים: N נבדקו, M נשמרו עכשיו, 0 חסרים`.

## Backup - off until Gilad picks a folder
`python -I ~/.claude/skills/data-keeper/scripts/backup.py [--dry-run]` copies what cannot be
rebuilt - skills, every memory folder, the user log, plans, CLAUDE.md, settings.json - into
`<target>/claude-backup/YYYY-MM-DD/` and keeps the newest 14 days. The target is
`backup_target` in `config.json` (best: a folder in his personal OneDrive, which syncs to the
cloud). end-session runs it when a target is set. Transcripts are large: `--with-transcripts`
only if he wants them too. Verify: it prints the item list and "Done.".

## Recover a session that died (battery, crash, frozen app)
1. Find it: `python -I ~/.claude/skills/session-retro/scripts/digest_sessions.py --today --out <scratchpad>/day.md`
   - the session whose end has no end-session.
2. Run end-session in **recover** mode for it: primer, journal, memory, the fact sweep
   (`fact_sweep.py --session <id> --check ...`) and the retro, all from its digest and log,
   so the next session continues as if nothing happened.

## Privacy and controls
- The log stays on this PC, next to Claude's own transcripts. It leaves the PC only through
  the backup folder Gilad chose.
- "אל תשמור את ההודעה הזאת" / "תמחק מהיומן" -> show him the line, then remove it from the
  session's log file.
- "תשהה את היומן" -> create the file `~/.claude/skills/data-keeper/OFF`;
  "תחזיר את היומן" -> delete it. While paused, say so once at the start of each session.

## Pitfalls (tested 2026-10-29 in a sandbox, not yet on the PC)
- Hooks read their input first and never fail loudly - an error means a missed log line,
  never a blocked prompt.
- Write the log through Python as UTF-8 only - the Windows console garbles Hebrew.
- A compaction keeps the transcript file whole; what gets lost is Claude's view of it -
  that is what the re-injection repairs.
- The sweep's date pattern also catches decimals like "9.2" - judge each line.

## Files
- `scripts/log_prompt.py`, `scripts/after_compact.py` - the two hooks.
- `scripts/recall.py`, `scripts/fact_sweep.py`, `scripts/backup.py` - see above (`--help`).
- `config.json` - `log_dir` (default `~/.claude/user-log`), `backup_target`, `backup_keep`, `reinject_chars`.
