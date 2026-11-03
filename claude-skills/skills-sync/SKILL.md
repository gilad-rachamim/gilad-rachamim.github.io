---
name: skills-sync
description: "Keeps a private GitHub copy of Gilad's skills (gilad-rachamim/claude-skills, under .claude/skills/) so a session started from the phone or claude.ai/code on that repo has all his skills even when the PC is off. Skills only - no memory, log, seeds or briefs - and every file is scanned for phones, emails and secrets before a push. Runs at every end-session (Step 6c). TRIGGER on Hebrew: 'תסנכרן את הסקילים', 'הסקילים בטלפון', 'תעלה את הסקילים לגיטהאב', 'הסקילים לא מעודכנים בטלפון'. English: 'sync skills', 'skills on my phone'. NOT a backup of memory or the log (data-keeper backup)."
---

# Skills Sync - הסקילים גם בטלפון

## Purpose
Gilad's skills live only on the PC. When it is off (battery, 29.10.2026) the phone has none of
them. A private repo with the skills under `.claude/skills/` fixes that: Claude Code loads
them in any session started on that repo.

**Language:** Hebrew, one line of result.

## Steps
1. **One time - setup** (the upgrade's install does it, with Gilad's OK):
   `python -I ~/.claude/skills/skills-sync/scripts/sync_skills.py --setup`
   Creates the PRIVATE repo with `gh` (or clones it if it exists; refuses a public one) into
   `~/.claude/skills-repo`. Verify: "Set up". Then Gilad gives the Claude GitHub app access to
   the new repo (github.com/apps/claude -> Configure -> add `claude-skills`).
2. **Every end-session (Step 6c):** `python -I ~/.claude/skills/skills-sync/scripts/sync_skills.py`
   Verify: "Pushed and verified." or "No changes". Every "left out" line -> tell Gilad which
   skill holds personal data; move that data into memory, then sync again.
3. **On the phone:** start a new Claude Code session on the repo `claude-skills` - the skills
   are there. Results that change files on the PC still need the PC.

## Safety
- The repo must stay PRIVATE - the script stops if it is not. Never add memory, the user log,
  seeds or briefs to it.
- A private repo is not encryption: personal data stays out (the scan leaves such files out).

## Pitfalls (designed 2026-10-31, not yet run on the PC)
- `gh` must be installed and logged in on the PC (`gh auth status`).
- The sync replaces `.claude/skills/` in the repo with the current skills - edit skills on the
  PC, not in the repo.
