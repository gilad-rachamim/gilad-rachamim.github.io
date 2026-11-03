# Skill quality bar

The checklist behind skill-forge. A skill ships when every box can be ticked or has a
one-line reason why it doesn't apply.

## Trigger
- [ ] The description starts with the job, not with "This skill...".
- [ ] It names when to use it and lists 5-10 trigger phrases in Gilad's real Hebrew, plus English.
- [ ] It has a `NOT for ... (use <neighbor>)` boundary for the nearest neighbor skill.
- [ ] <= 1024 chars (hard cut in the listing: 1,536, description + when_to_use together).
- [ ] `lint_skill.py --similar` shows no skill above 0.35 that wasn't read, and no shared trigger phrase.

## Scope
- [ ] One job. Inputs, outputs and where it runs (PC / phone / cloud) are explicit.
- [ ] It says who calls it, and what it calls ("runs as step 9 of end-session", "uses skill-forge").

## Steps
- [ ] Numbered and imperative ("Open...", "Run..."), not narration.
- [ ] Every step has a check: how Claude knows it worked before moving on.
- [ ] Steps come from what really worked, with dates; untested parts are marked as untested.
- [ ] No fixed waits where a check is possible; retries are bounded (e.g. "once more, then report").

## Determinism
- [ ] Exact, repeated or fragile work lives in `scripts/`, and every script was run.
- [ ] Scripts: `python -I`, UTF-8 in/out, idempotent, `--dry-run` for changes, clear exit codes.
- [ ] Batch work runs as one script/loop, not as dozens of hand-made tool calls.

## Context economy
- [ ] SKILL.md < 200 lines (never > 500); bulky material in `references/`, opened only when needed.
- [ ] Large outputs (transcripts, lists, logs) go to a file and through a script - never raw into context.

## Safety
- [ ] Deleting, moving the user's files, sending, posting, paying, secrets and settings changes need Gilad's OK.
- [ ] No secrets, tokens or passwords in the skill files.
- [ ] Personal data (medical, financial, contacts) stays out of anything pushed, shared or uploaded.

## Fit for Gilad
- [ ] Talks Hebrew, short, phone-friendly.
- [ ] Where Gilad dictated text, his words are kept verbatim.
- [ ] Respects his standing rules (plan first, never change his words, mark Claude's additions, etc.).

## Maintainability
- [ ] `## Pitfalls (tested YYYY-MM-DD)` exists and is dated.
- [ ] Paths use `~` / environment variables; no path that already moved (Desktop/Documents are in OneDrive).
- [ ] Every relative file the skill mentions exists (the lint checks this).

## Lifecycle
- [ ] Pipeline entry set to ✅ in `session-retro/skill-seeds.md`.
- [ ] Added to the first-run watch (`new-skills-first-run.md`).
- [ ] Mentioned in the session journal when there is one.

## Anti-patterns
- A "do everything" skill - split it.
- A vague description ("helps with files") - it will never trigger, or trigger everywhere.
- Pasting the whole conversation into the skill - keep the steps that worked, drop the story.
- Two skills claiming the same trigger phrase.
- Untested scripts, or "should work" steps.
- Fixed `sleep`s instead of checking the result.
- Hardcoded absolute paths of one machine when `~` works.
- Building a big skill at the end of a long session - write the brief and build it fresh.
