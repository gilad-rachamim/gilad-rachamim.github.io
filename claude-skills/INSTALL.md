# Install the skills upgrade - instructions for Claude on Gilad's PC

> לגילעד: ההוראות האלה מיועדות ל-Claude במחשב. הוא יראה לך קודם תוכנית קצרה, ויתקין רק אחרי שתאשר.

**What this is:** `end-session` and `session-retro` upgraded; two new skills, `skill-forge`
(the professional build standard) and `skill-scout` (the background check and its hook);
one paragraph added to `work-summary`. Written 29.10.2026 in a cloud session while the PC was
off, on top of snapshots of the PC skills taken 29.10.2026 00:27-00:28 (`install/base/`).

Paths below: `~` = the user folder, `SK` = `~/.claude/skills`, `U` = the `claude-skills`
folder of the clone. Talk to Gilad in Hebrew, short.

## 0. Plan first (Gilad's rule)
Show a plan of at most 6 lines - what changes, what gets backed up, and that the
`settings.json` hook needs his OK - and wait for his approval.

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
`U/skill-forge` -> `SK/skill-forge` and `U/skill-scout` -> `SK/skill-scout`.
If either folder already exists, stop and show Gilad the difference.

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

## 7. The background hook - needs Gilad's OK (it changes settings.json)
```bash
python -I "$U/install/merge_settings.py" --dry-run   # show Gilad what will be added
python -I "$U/install/merge_settings.py"             # after his OK - writes a backup first
```
Run it with the same `python` the other scripts use. It adds one UserPromptSubmit hook
(exec form: python.exe + args, timeout 10 s) and keeps every other setting and hook.

## 8. Verify
1. Lint (write to a file - the console garbles Hebrew):
   `python -I "SK/skill-forge/scripts/lint_skill.py" SK/end-session SK/session-retro SK/skill-forge SK/skill-scout SK/work-summary --out "$TEMP/lint.txt"`
   Read it and fix every ERROR. Warnings on the older skills are fine.
2. Hook by hand:
   `echo '{"session_id":"install-test","prompt":"שוב"}' | python -I SK/skill-scout/scripts/scout_hook.py --debug --dry-run`
   -> exit code 0 and a `skill-scout: prompt #1 ...` line (`--dry-run` writes no state, so
   Gilad's first real session still gets its backlog reminder).
3. Digest: `python -I SK/session-retro/scripts/digest_sessions.py --today --out "$TEMP/day.md"`
   -> Read it; today's sessions are listed.
4. The four skills show in the skill list (skills reload by themselves; else `/reload-skills`).
5. In a NEW session, the first prompts must not show a "hook error". If one appears:
   `merge_settings.py --remove`, then run it again with `--shell-form`.

## 9. Finish
- Memory `new-skills-first-run.md`: add skill-forge, skill-scout and the day mode - tell Gilad
  how each one did on its first real run.
- Pipeline: add the history entry `## skills-upgrade-2026-10-29 - ✅ נבנה (skill-forge, skill-scout)`.
- Offer once, and only with a yes: a nightly scheduled task (~23:30) that runs "בדיקת סוף יום".
- Delete `$TEMP/skills-upgrade`. Report in Hebrew, short: what was installed, what was
  carried over, and the "איך משתמשים" table from `README.md`.

## Undo
Restore the folders from `~/.claude/backups/skills-upgrade-<date>/`, delete `SK/skill-forge`
and `SK/skill-scout`, and run `merge_settings.py --remove`.
