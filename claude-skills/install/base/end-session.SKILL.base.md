<!-- BASE SNAPSHOT of ~/.claude/skills/end-session/SKILL.md as loaded on the PC at 2026-10-29 00:27 (Israel time).
     Body only - the frontmatter was not visible in the transcript. Used by INSTALL.md for a 3-way merge. -->
# End Session - Agreed Close-Out Command

## Purpose
One agreed command (`/end-session`) that runs the complete, ordered end-of-session
routine so **zero context is lost** and every persistent store stays in sync:
state snapshot, journal, changelog, version, git remote, and memory.

**Trigger model:** user-invoked only. The user types the command (or an equivalent
phrase) when *they* decide the session is over. This is NOT a hook and must NOT
fire automatically mid-task.

**Language:** talk to the user in their own language (the summary template at the
bottom is in Hebrew - translate it if the user works in another language). Code and
commit messages in English.

---

## Pre-flight (run first, before any write)

**P0. Confirm scope.** If the session was read-only / research-only with **zero file
changes and zero project work**, skip Steps 1-7 (no journal, changelog or push) but
**still run Step 8 (memory) and Step 9 (retro)** - a session without project files can
still teach a preference, a workflow or a skill. Say which steps were skipped.

**P1. Determine the active project.** Identify which folder this session actually
worked on. A scratch / experiments workspace that is not a git repo normally skips the
changelog, version bump and project push steps.

---

## Ordered routine

> Run the steps **in this order**. After each step, note one line of what was done
> (or why it was skipped). At the end, present the summary in the format at the bottom.

### Step 1 - External-changes safety check
*Goal: never overwrite work done in parallel through another channel (a bot, another
editor or agent, a teammate, manual edits) before the final commit.*

Only if the active project is a git repo with an upstream:
1. `git fetch` (give it a short timeout, ~8s).
2. `git status` - surface any uncommitted local changes.
3. `git rev-list --count HEAD..@{u}` - if > 0, run `git log --oneline HEAD..@{u}`
   and show the user what changed.
4. Resolve before committing:
   - clean local + remote ahead: propose a fast-forward `git pull --ff-only`.
   - diverged (both sides have new commits): show both sides and **ask the user**
     how to proceed (merge / rebase / cherry-pick). Never merge diverged history silently.
5. Only continue once the tree is in a known-good state.

Not a git repo, or no upstream: skip silently.

### Step 2 - Primer (short state snapshot)
File: `<project>/docs/memory/primer.md` (create it if the project keeps none).

A **concise snapshot**, not a copy of the journal:
- **Last updated:** date + one-line headline.
- **Current focus** (1-2 lines).
- **This session:** 3-6 bullets - done / state / next / blockers.
- **Link** to the journal entry from Step 3 instead of repeating its detail.

### Step 3 - Session journal (full detail)
File: `docs/journal/YYYY-MM-DD.md` in the project (or your existing journal location;
append if today's entry already exists).

Sections: Completed, Current State, **Next Steps (priority order)**, Open Issues,
Key Decisions (with the WHY), Files Changed, Notes.

**Pending-tasks sweep:** before writing Next Steps, scan the whole session for
*anything the user mentioned or that was planned but not finished*, and make sure each
item appears there. This section is tomorrow's todo list - nothing planned may
silently drop.

### Step 4 - CHANGELOG (user-visible changes)
File: `<project>/CHANGELOG.md`, under `[Unreleased]`, grouped as Added / Changed /
Fixed / Removed / Security / Performance (Keep a Changelog style), in the project's
language. One line per change.

Skip rules:
- Docs-only commits, internal refactors with no user-visible change, and dependency
  bumps with no behavior change: skip.
- Experiment / scratch workspaces: skip without deliberation.
- The project should have a changelog but none exists: bootstrap one from `git log`.

### Step 5 - Version bump (SemVer)
File: `package.json` (or the ecosystem's equivalent) - **only if the project was
deployed or released this session**.
- PATCH = fixes / copy / small UI; MINOR = features, fields, pages; MAJOR = breaking.
- Several changes in one release: the highest level wins.
- Move the `[Unreleased]` changelog entries under the new version heading.
- Commit message includes it: `chore: bump version to X.Y.Z`.
- Not deployed: skip.

### Step 6 - Project commit + push (VERIFIED)
The active project's own repo. Skip only if it is not a git repo, or if
`git status --porcelain` is empty **and** there is nothing unpushed.

*Why this exists:* a commit that never leaves the machine is not a backup, and a
project with no remote exists in exactly one physical place.

1. **Ensure a remote exists.** `git remote get-url origin` - if missing, offer to create
   a **private** GitHub repo (requires the `gh` CLI, logged in):
   ```bash
   gh repo create <owner>/<name> --private --source=. --push --description "<short description>"
   ```
   **Mandatory scan BEFORE the first push** - a push publishes the *entire history*,
   and a `.gitignore` added later does not clean old commits:
   - File names across all history:
     `git log --all --pretty=format: --name-only | sort -u` against `.env`,
     `credentials.json`, `token.json`, `*.pem`, `*.key`, `*.db`, `*.sqlite`.
   - Contents across all history:
     `git grep -I -E '<secret patterns>' $(git rev-list --all)` - e.g. `sk-`,
     `ghp_`, `AKIA`, `AIza`, bot-token shapes like `\d{8,10}:AA`,
     `BEGIN .* PRIVATE KEY`.
   - Personal data by content, not just by path (medical, financial, private names):
     it leaks into changelogs and docs even when the data file is ignored.
   - **A finding = stop.** Show the user what was found and where, and let them decide
     (clean history / stay local / push knowingly). A private repo is not encryption.
2. **Commit whatever remains**, split into atomic conventional commits
   (`feat:`, `fix:`, `docs:`, `chore:`) - never one `wip`. The files written in
   Steps 2-5 (primer, journal if in the repo, changelog, version) belong here.
3. **Push, then verify** - never report success on the push command's exit code alone:
   ```bash
   git push
   git rev-list --count @{u}..HEAD     # must print 0
   test -z "$(git status --porcelain)" # tree must be clean
   ```
   If the push failed (auth, conflict, rejected), surface the exact error. Do **not**
   report success.
4. If the project auto-deploys or is deployed manually and this session changed
   runtime code, say plainly whether the deploy ran. A pushed commit is not a
   deployed one.

### Step 7 - Projects registry (OPTIONAL)
Only if the user keeps a central projects registry / work log file (for example a
`PROJECTS.md` in its own repo). Otherwise skip.
1. Open the registry and find **this project's section** - edit only inside it,
   never with a whole-file regex (a global replace can silently change another
   project's entry). Match the file's existing line endings (CRLF vs LF).
2. Append one work-log row (date + one-line summary); bump that section's
   "last updated" date and, if present, the file-level one.
3. Commit, push, and verify exactly as in Step 6.3 (do not assume the branch is
   `main` - use `@{u}`).
4. A second run on the same session must not add a duplicate row.

### Step 8 - Behavioral memory
Only if this session produced a **correction or a confirmed reusable pattern** (a
preference the user stated, a mistake to avoid, a workflow that worked):
- Add or update a memory file in Claude Code's memory directory for the project (one
  fact per file) and a one-line pointer in its `MEMORY.md` index.
- Check for an existing file that already covers it - update rather than duplicate.
- Nothing new behaviorally: skip.

### Step 9 - Retro: skills and insights
Run the `session-retro` skill on the whole session: skill candidates, memories,
efficiency lessons, and upgrades to existing skills, checked against what already
exists. Memories it saves count toward Step 8 (don't save twice). Every candidate -
even one that helps only a little - is built and saved right away, without asking
(Gilad's standing order, 28.10.2026; see session-retro section 3). List them in the
summary as done. Nothing worth keeping: one line saying so.

---

## Final delivery

Present a compact checklist of what ran vs. was skipped, then a 1-2 sentence summary:

```
✅ סוף סשן - <project>

1. בדיקה חיצונית ........ <בוצע / N/A - לא git repo>
2. Primer ............... <עודכן / N/A>
3. יומן ................. <נכתב: <שם הקובץ>>
4. CHANGELOG ............ <עודכן / דולג - <סיבה>>
5. גרסה ................. <X.Y.Z / לא נפרס>
6. Push לפרויקט ......... <commit+push אומת ✓ / N/A - לא git repo / נכשל - <שגיאה>>
7. רישום מרכזי .......... <עודכן ואומת ✓ / דולג - אין רישום>
8. זיכרון ............... <נשמר: <slug> / אין חדש>
9. לקחים ................ <הוצעו: <סקילים> / נשמרו: <תובנות> / אין חדש>

סיכום: <משפט-שניים>
פתוחים למחר: <הפריט הכי קריטי מ-Next Steps>
```

---

## Rules
- **User-invoked only** - never run as part of mid-task work.
- **Order matters** - the safety check (Step 1) is always first; the project push
  (Step 6) comes after every project file is written; an optional registry push
  (Step 7) comes last among writes so it captures everything.
- **No session ends with unpushed project work** - local-only commits are not a backup.
- **Never report a push as successful without verifying it** (`@{u}..HEAD` is 0 and
  the tree is clean).
- **Never push past a secrets/PII finding** - stop and ask.
- **Per-step skip is allowed and expected** - note the reason; don't force a step
  that doesn't apply.
- **Never drop a planned/pending task** - it must land in Next Steps (Step 3).
- **No changelog/version churn** for experiments, docs-only, or no-UX-change work.
