---
name: skill-forge
description: "Gilad's house standard for BUILDING or UPGRADING a skill the professional way: pick the right form (skill / script / hook / memory / upgrade of an existing skill), dedupe, design from what really worked, write, move fragile steps into tested scripts, lint, dry-run on real prompts, then register it and watch its first real run. Use for EVERY skill build or upgrade on this machine, before skill-creator (call skill-creator only for its eval/benchmark loop). TRIGGER on Hebrew: 'תבנה סקיל', 'תבנה לי סקיל', 'בניית סקיל', 'סקיל חדש', 'תהפוך את זה לסקיל', 'תשדרג את הסקיל', 'לשפר את הסקיל', 'לבנות את הסקיל מהבריף'. English: 'build a skill', 'make this a skill', 'upgrade the skill', '/skill-forge <slug>' (builds from a brief in session-retro/briefs/). Also used by session-retro (quick mode) and skill-scout (build session). NOT for finding skill ideas (session-retro, skill-scout) and NOT for running an existing skill."
argument-hint: "[<slug> | quick <slug>]"
---

# Skill Forge - בניית סקילים ברמה מקצועית

## Purpose
A skill is worth building only if it gets used, triggers reliably and works the first time.
This is the one way skills are built or upgraded here, so every skill meets the same bar
(`references/quality-bar.md`). It turns a brief - or the current conversation - into a
tested skill, and records it so its first real run gets checked.

**Language:** talk to Gilad in Hebrew, short (he often reads on the phone). Skill files in
English; descriptions carry Hebrew + English triggers in his real words.

## Modes
| Mode | When | Depth |
|---|---|---|
| **quick** | inside session-retro / end-session; an upgrade or a small skill (effort S) | steps 0-5, one dry-run prompt |
| **full** | a dedicated build session (`/skill-forge <slug>`), effort M/L | all steps, three dry-run prompts, scripts run on real input |

Quick mode never skips the dedupe or the lint. If a quick build grows past ~80 lines or
needs tools nobody has tried yet, stop: write the brief and hand it to a build session
(skill-scout, "When Gilad answers", step 3).

## 0. Inputs
- `/skill-forge <slug>` -> read `~/.claude/skills/session-retro/briefs/<slug>.md`. It holds
  the evidence from the conversation where the idea came up - trust it over guesses.
- No brief -> write one now from the conversation (`templates/brief.template.md`).
  A missing fact that changes the design -> ask ONE question (Gilad's rule: plan first).
- Set the pipeline entry in `~/.claude/skills/session-retro/skill-seeds.md` to 🔨.

## 1. Pick the right form - most lessons are NOT new skills
| The lesson is... | Build this |
|---|---|
| a fact, preference or correction | a memory (one fact per file + a line in `MEMORY.md`) |
| a missing step or wrong assumption in a skill that exists | an edit to that skill - update beats create |
| a recurring multi-step procedure that needs judgment | a new skill |
| an exact, repeatable action (parse, convert, batch, check) | a script in the owning skill's `scripts/` |
| something that must happen every time at an event (each prompt, before a tool, at stop) | a hook in `settings.json` - deterministic; show Gilad the diff first |
| something that must happen at a set time | a scheduled task |
| a workflow still taking shape | a seed 🌱 in `skill-seeds.md` |

## 2. Dedupe - two skills for one job is worse than none
1. All skills with their descriptions, in one call:
   `python -I ~/.claude/skills/skill-forge/scripts/lint_skill.py --list`
   Also scan the session's available-skills list (plugin and anthropic skills).
2. Draft the one-line job, then `lint_skill.py --similar "<draft>"`. Read every skill it
   flags. 70%+ overlap -> upgrade that skill instead. A shared trigger phrase -> one of the
   two descriptions must give it up.
3. Effort L -> look in the community registry first (`codeguilds-finder`): adapting a proven
   skill beats writing one from zero.

## 3. Design before writing (in the plan - shown to Gilad in full mode)
- **Job** in one sentence. **Trigger** = the words Gilad actually uses. **Output** = what he gets.
- **Steps that really worked**, in order, with the exact commands, paths, selectors and
  waits that succeeded (from the brief / conversation). Never write a step you didn't see work;
  mark untested parts as untested.
- **Split:** judgment -> SKILL.md; exact, repeated or fragile -> `scripts/`; bulky reference
  (tables, schemas, long examples) -> `references/`, opened only when needed.
- **Failure modes seen**, and how each step proves it worked (check the result - not a fixed wait).
- **Where it runs** (PC / phone / cloud), which tools it needs, and what needs Gilad's OK
  (deleting, sending, paying, secrets, anything outward, settings changes).

## 4. Write
Start from `templates/SKILL.template.md`.
- **Folder** `~/.claude/skills/<name>/`; `name` = the folder name, lowercase-hyphen, <= 64 chars.
- **Description** - the trigger; most skill failures start here:
  - the job first, then when to use it, then `TRIGGER on Hebrew: '...'` with 5-10 of Gilad's
    real phrasings, then English triggers, then `NOT for ... (use <neighbor>)`;
  - <= 1024 chars (claude.ai upload limit; the skill listing cuts at 1,536);
  - say who calls it ("also runs as step N of ...") so chains stay wired.
- **Body:** imperative, numbered steps; each step says how to verify it; real input and
  output examples; a `## Pitfalls (tested YYYY-MM-DD)` section with what broke and the fix.
  Aim for < 200 lines; never > 500.
- **Frontmatter extras only when needed:** `argument-hint` (it takes arguments),
  `disable-model-invocation: true` (manual-only or risky), `allowed-tools` (a narrow,
  read-only set it always needs).
- **Scripts:** Python run with `-I`; UTF-8 in and out (the Windows console garbles Hebrew -
  write results to a file and Read it); idempotent; `--dry-run` for anything that changes
  files or accounts; a one-line summary at the end; non-zero exit on failure.
  **Run every script now** on real or sample input - an untested script is a bug.
- **Upgrading a skill:** edit in place, keep its voice and structure, put the lesson at the
  step where it happens (not at the bottom), date it, and keep every existing trigger.

## 5. Lint
`python -I ~/.claude/skills/skill-forge/scripts/lint_skill.py ~/.claude/skills/<name>`
Fix every ERROR. A WARN may stay only with a reason you can say in one line.

## 6. Dry-run (full mode: 3 prompts; quick mode: 1)
Use realistic prompts in Hebrew, phrased the way Gilad writes - include one that must NOT
trigger it:
1. Would the description make Claude pick this skill, and not its neighbor? Unsure -> sharpen it.
2. Walk the steps against a real input and run the scripts. Anything you had to improvise -> add it.
3. High-traffic skill or a fuzzy trigger -> optionally run skill-creator's description/eval loop.

## 7. Register and watch
- Pipeline: set the entry in `skill-seeds.md` to `✅ נבנה (<skill-name>)` and keep it as history.
- First-run watch: add the skill to the memory `new-skills-first-run.md` (create it if
  missing). Its first real run ends with a short Hebrew note - worked / what broke - and a fix.
- Mention it in the session journal when the session keeps one.

## 8. Report (Hebrew, <= 6 lines)
What it does, the exact phrase that triggers it, what was tested and what is still untested.

## Rules
- No skill without step 2 (dedupe), step 5 (lint) and step 6 (dry-run).
- Build from evidence: the brief and the conversation are the spec.
- One skill = one job. Two jobs -> two skills, or a skill plus a script.
- Never weaken a safety rule from Gilad's existing skills or memory while upgrading.

## Files
- `scripts/lint_skill.py` - lint, `--list`, `--similar`, `--all` (`python -I lint_skill.py --help`).
- `templates/SKILL.template.md` - skeleton for a new skill.
- `templates/brief.template.md` - the brief a build session starts from.
- `references/quality-bar.md` - the full checklist and anti-patterns (open when in doubt).
