# Install the skills upgrade - instructions for Claude on Gilad's PC

> לגילעד: ההוראות האלה מיועדות ל-Claude במחשב. הוא יראה לך קודם תוכנית קצרה, ויתקין רק אחרי שתאשר.

**What this is:** `end-session` and `session-retro` upgraded; three new skills -
`skill-forge` (the professional build standard), `skill-scout` (the background check) and
`data-keeper` (every message saved verbatim, re-injected after compaction, fact sweep,
recall, backup); one paragraph added to `work-summary`; three hooks. Written 29.10.2026 in a
cloud session while the PC was off, on top of snapshots of the PC skills taken 29.10.2026
00:27-00:28 (`install/base/`).

Paths below: `~` = the user folder, `SK` = `~/.claude/skills`, `U` = the `claude-skills`
folder of the clone. Talk to Gilad in Hebrew, short.

## 0. Plan first (Gilad's rule)
Show a plan of at most 6 lines - what changes, what gets backed up, and that the
`settings.json` hooks need his OK - and wait for his approval.

## 1. Get the exact files
Use git, not WebFetch (WebFetch summarizes):
```bash
git clone --depth 1 -b claude/end-session-scale-improvement-95cj98 https://github.com/gilad-rachamim/gilad-rachamim.github.io.git "$TEMP/skills-upgrade"
U="$TEMP/skills-upgrade/claude-skills"
```
Verify: `U/end-session/SKILL.md` and `U/install/merge_settings.py` exist.

## 2. Back up
Copy `SK/end-session`, `SK/session-retro`, `SK/work-summary` and `~/.claude/settings.json` to
`~/.claude/backups/skills-upgrade-<YYYYmmdd-HHMM>/`. Verify the copies are there.

## 3. New skills - copy as they are
`U/skill-forge`, `U/skill-scout` and `U/data-keeper` -> `SK/`.
If any of these folders already exists, stop and show Gilad the difference.

## 4. end-session and session-retro - merge, never a blind overwrite
Anything that changed on the PC after the snapshot must survive.
1. **end-session:** diff `U/install/base/end-session.SKILL.base.md` (body only) against the
   body of the local `SK/end-session/SKILL.md`. Whatever changed locally since the snapshot
   (rules, steps, wording) -> carry it into `U/end-session/SKILL.md` at the matching place.
   Keep every trigger phrase of the local `description:` that the new one lacks. Then write
   the result to `SK/end-session/SKILL.md`.
2. **session-retro:** the base is PARTIAL - lines 1-60 of 92. Treat lines 1-60 as above.
   Then read the local file from line 61 to the end (the rest of section 3 and everything
   after it) and carry over every rule there that the new file does not already cover
   (new sections 3-7 and Rules). Keep every local trigger phrase. Write the result to
   `SK/session-retro/SKILL.md`.
3. Copy `U/session-retro/scripts/digest_sessions.py` to `SK/session-retro/scripts/` and
   create the folder `SK/session-retro/briefs/`.
4. Tell Gilad in 2-5 lines what was carried over from his local versions.

## 5. The pipeline file - keep every entry
`SK/session-retro/skill-seeds.md` gets the new header (statuses 💡 🔨 ⛔, day-review stamp);
every entry below `<!-- seeds below -->` stays byte for byte:
```bash
python -I "$U/install/update_seeds_header.py" --dry-run   # prints the entry count
python -I "$U/install/update_seeds_header.py"             # backup first, then replace
```
Verify: it prints the same number of entries before and after, then "Done.".

## 6. work-summary - day mode after a daily summary
In `SK/work-summary/SKILL.md` replace
```
## After the summary
Run the `session-retro` skill in **mid-project mode** (seeds + memories first; a short
retro table under the summary). Skip only for a trivial session.
```
with
```
## After the summary
Run the `session-retro` skill: **mid-project mode** after a session summary (seeds +
memories first; a short retro table under the summary), and **day mode** after a daily /
end-of-day summary ('סיכום יומי', 'תסכם להיום', 'end of day summary') - it sweeps all of
today's sessions for missed skills and efficiency fixes. Skip only for a trivial session.
```
and in its `description:` add `'תסכם להיום', ` right after `'סיכום יומי', `.
If the local text differs, make the same change by meaning.

## 7. The hooks - need Gilad's OK (they change settings.json)
```bash
python -I "$U/install/merge_settings.py" --dry-run   # show Gilad what will be added
python -I "$U/install/merge_settings.py"             # after his OK - writes a backup first
```
Run it with the same `python` the other scripts use. It adds three hooks (exec form:
python.exe + args, timeout 10 s) and keeps every other setting and hook:
- `log` - UserPromptSubmit, `data-keeper/scripts/log_prompt.py` (saves each message verbatim);
- `scout` - UserPromptSubmit, `skill-scout/scripts/scout_hook.py` (the background check);
- `compact` - SessionStart, matcher `compact`, `data-keeper/scripts/after_compact.py`.
He may want only some: `--only log compact` (for example). `--remove` takes ours out.

## 8. Backfill the log from past conversations
So recall works on everything said before today too (it stays on this PC):
```bash
python -I SK/session-retro/scripts/digest_sessions.py --days 3650 --to-log --out "$TEMP/backfill.md"
```
It prints `to-log: N new message(s) written`. Running it twice adds nothing.

## 9. Verify
1. Lint (write to a file - the console garbles Hebrew):
   `python -I SK/skill-forge/scripts/lint_skill.py SK/end-session SK/session-retro SK/skill-forge SK/skill-scout SK/data-keeper SK/work-summary --out "$TEMP/lint.txt"`
   Read it and fix every ERROR. Warnings on the older skills are fine.
2. Scout by hand:
   `echo '{"session_id":"install-test","prompt":"שוב"}' | python -I SK/skill-scout/scripts/scout_hook.py --debug --dry-run`
   -> exit code 0 and a `skill-scout: prompt #1 ...` line (`--dry-run` writes no state).
3. Recall: `python -I SK/data-keeper/scripts/recall.py <a word Gilad used this week> --out "$TEMP/recall.md"` -> Read it.
4. Digest: `python -I SK/session-retro/scripts/digest_sessions.py --today --out "$TEMP/day.md"` -> today's sessions listed.
5. The five skills show in the skill list (skills reload by themselves; else `/reload-skills`).
6. In a NEW session: the first prompts show no "hook error", and
   `~/.claude/user-log/<today>/<that session id>.jsonl` exists after the first prompt.
   A hook error -> `merge_settings.py --remove`, then again with `--shell-form`.

## 10. Finish
- Backup is decided (Gilad, 29.10.2026): his personal OneDrive, never the college one -
  `SK/data-keeper/config.json` already says `onedrive-personal`. Run
  `python -I SK/data-keeper/scripts/backup.py --dry-run` and check the folder it shows is his
  personal OneDrive (not "OneDrive - <organization>"), then run it without `--dry-run` -> "Done.".
  Tell him the folder `Claude-backup` now appears in his OneDrive (also in the OneDrive app on
  his phone). "Backup skipped: no personal OneDrive" -> tell him; with his OK pick another folder.
- Memory `new-skills-first-run.md`: add skill-forge, skill-scout, data-keeper and the day
  mode - tell Gilad how each one did on its first real run.
- Pipeline: add the history entry `## skills-upgrade-2026-10-29 - ✅ נבנה (skill-forge, skill-scout, data-keeper)`.
- Offer once, and only with a yes: a nightly scheduled task (~23:30) that runs "בדיקת סוף יום".
- Delete `$TEMP/skills-upgrade`. Report in Hebrew, short: what was installed, what was
  carried over, and the "איך משתמשים" table from `README.md`.

## Undo
Restore the folders from `~/.claude/backups/skills-upgrade-<date>/`, delete `SK/skill-forge`,
`SK/skill-scout` and `SK/data-keeper`, and run `merge_settings.py --remove`. The log in
`~/.claude/user-log/` stays until Gilad asks to delete it.
