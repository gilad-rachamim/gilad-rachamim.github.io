---
name: session-retro
description: "Session retrospective and owner of the skill pipeline: scan the finished conversation - in day mode ALL of today's conversations - for new skills, skill upgrades, memories, efficiency fixes and seeds; check against what exists, score, and save ALL right away without asking (standing order 28.10.2026). Small skills are built now via skill-forge, big ones get a brief + a proposed build session. Keeps skill-seeds.md. TRIGGER on Hebrew: 'הפקת לקחים', 'מה לומדים מהשיחה', 'יש מה לשמור כסקיל', 'תובנות מהשיחה', 'חידודים להמשך', 'מה אפשר לייעל', 'תוציא מזה סקילים', 'יש סקילים חדשים מהשיחה', 'להבא להתייעל', 'סיכום שיחה', 'סיכום ביניים', 'באמצע הפרויקט'; day mode: 'בדיקת סוף יום', 'סיכום סוף יום', 'מה פספסנו היום', 'תעבור על כל השיחות של היום'. English: 'retro', 'lessons learned', 'end of day review'. Also step 9-10 of end-session and after work-summary / session-journal. NOT a work summary (work-summary), NOT a journal (session-journal), NOT the mid-session nudge (skill-scout)."
---

# Session Retro - הפקת לקחים

## Purpose
Every good session teaches something. This skill makes sure it is not lost: repeatable
workflows become skills, preferences and environment facts become memories, and time
wasted once is not wasted again. It also owns the skill pipeline (`skill-seeds.md`), so no
idea - from a retro, from skill-scout or from Gilad - falls through.

**Language:** talk to the user in Hebrew, short. Skill files themselves are written in English
(frontmatter description with Hebrew + English triggers), like the existing skills.

## 0. Mode and pipeline
| Mode | Called by | Scope | Focus |
|---|---|---|---|
| **final** | end-session step 9, "הפקת לקחים" | this session | everything |
| **mid-project** | work-summary, session-journal, "סיכום שיחה" / "סיכום ביניים" | this session | seeds + memories; new skills only when already proven |
| **capture** | end-session quick (battery / usage critical) | this session | save ideas, seeds, memories, briefs - build nothing |
| **day** | "בדיקת סוף יום", end-session step 10, a daily work-summary | ALL of today's sessions | what single sessions missed (§6) |

- **Read `skill-seeds.md`** (next to this file) before scanning - it is the pipeline. Statuses:
  🌱 seed · 🌿 ripe · 💡 offered by skill-scout · 🔨 brief written / build session proposed ·
  ✅ built (`skill-name`) · ⛔ declined (never offer again).
  Any item this session advanced gets updated, not re-proposed.
- Briefs live in `briefs/<slug>.md` next to this file.

## 1. Scan the conversation - 5 buckets
Go through the whole session, start to end (day mode: every session's digest, §6):

| Bucket | Look for | Example |
|---|---|---|
| **Skill candidates** | A process that worked and will recur - **even a small one that saves only a little** (one avoided search, one fewer question, one fewer retry) | checking and installing an installer someone sent |
| **Memories** | User preferences, corrections ("I told you..."), facts about the environment (paths, accounts, tools) | "Hebrew only", Desktop moved to OneDrive |
| **Efficiency** | Where time was lost: wrong folder searched, repeated attempts, a question the user had to answer twice, a tool that wasn't connected, a huge output pulled into context instead of a file + script | searched the old Desktop folder, but Desktop had moved to OneDrive |
| **Existing-skill upgrades** | A skill that ran but missed a step, had a wrong assumption, or needed manual help | a skill that hardcodes an old path |
| **Seeds** | A workflow taking shape but not proven yet (project unfinished, ran once partially, steps still changing) | a summary format still being refined over several sessions |

**Strongest signals:** the same request in 2+ sessions; the same 3+ tool steps done by hand
again; "שוב / כמו פעם קודמת / כל פעם"; a correction; a long hunt for a path, tool or setting;
fixed waits that failed; a skill that needed a workaround.

A correction from the user always produces at least a memory.

**Seed handling** (cheap, no approval needed - it's a note, not an active skill):
- New seed -> add it to `skill-seeds.md` using the template there; mark "נשמר ✓".
- Existing seed advanced -> append what was learned to "מה כבר ידוע", remove resolved
  items from "מה עוד חסר", bump **שיחות** and **עודכן**.
- **Ripe** (worked end-to-end, or 2+ sessions, or project ended) -> set 🌿 and route it as a
  skill (§3). After it is built, set ✅ with the skill name - keep the entry as history.

## 2. Check what already exists
- Skills: `python -I ~/.claude/skills/skill-forge/scripts/lint_skill.py --list` (every
  description in one call), plus the session's available-skills list (plugin / anthropic
  skills). For a candidate: `lint_skill.py --similar "<one-line job>"`.
- Memories: read `MEMORY.md` in the project's memory folder, open any related file.
- **Update beats create.** If an existing skill or memory covers 70%+ of it, edit that
  one instead of making a new one. **No duplicates:** also check skills built in other
  sessions today (`ls -lt ~/.claude/skills` - newest first); two skills doing one job is
  worse than none.

## 3. Score and route - decides HOW, never WHETHER (everything is saved)
Score each skill candidate 1-3 on **R**ecurrence, **T**ime/tokens saved per use and
**E**rror prevention; effort **S** (about 80 lines or less, tools already proven), **M** or **L**.

| Item | Route |
|---|---|
| memory / correction | save now |
| a fact or preference that holds everywhere (any folder, any project) | one line in `~/.claude/CLAUDE.md` too - the project memory loads only in its own folder |
| upgrade of an existing skill | edit now - skill-forge quick mode (lint after) |
| new skill, effort S | build now - skill-forge quick mode |
| new skill, effort M/L - or this session is long / low on context | brief now (`briefs/<slug>.md`, skill-forge template) -> 🔨 -> propose a build session (skill-scout, "When Gilad answers", step 3) |
| not proven yet | seed 🌱, or advance an existing seed |
| low score (R+T+E of 4 or less) | still saved: as a seed, or one line in the owning skill's Pitfalls |
| capture mode | everything as a seed, 💡 or brief - no builds |

## 4. Save everything - no exceptions, no approval
**Gilad's standing order (28.10.2026):** every idea that would help even a little is
raised AND saved at the end of the conversation - "ללא יוצא מן הכלל". He chose: build
right away, without asking. This is a defined exception to the "always plan first" rule.
**Refinement (29.10.2026):** a big skill is built "the best way" in a fresh session - the
brief written now IS the save, and the build session is proposed as a card (one click).
- **No cap** on the number of items. A one-line improvement to an existing skill counts.
- New skill -> build it now (§5). Existing-skill upgrade -> edit it now.
  Memory -> save now. Seed -> save now. Ripe seed -> make it a skill now (or brief it, §3).
- The only things that still need a question: anything touching secrets, deleting or moving
  the user's files, anything outward (sending, posting, paying), and changes to
  `settings.json` or hooks (show the diff first).

## 5. Build - always through skill-forge
Every new skill or upgrade is built with `skill-forge`: quick mode here, full mode in a build
session. That gives every skill the same bar - right form, dedupe, frontmatter and trigger
rules, scripts for the fragile steps, lint, a dry-run, and a first-run watch. Never write a
skill ad hoc.

## 6. Day mode - the end-of-day sweep
Goal: catch what single sessions missed - above all the needs that came up in **more than
one** session today.
1. **Collect** today's sessions (Israel time, since 00:00 - or since the `Last day review`
   stamp in the header of `skill-seeds.md`):
   - PC (cheapest and complete):
     `python -I ~/.claude/skills/session-retro/scripts/digest_sessions.py --today --out <scratchpad>/day-digest.md`
     then Read that file. Verify: the header line counts the sessions you expect.
   - Phone / cloud sessions, when the tools exist: `mcp__claude-code-remote__list_sessions`
     (mine) -> `list_events` (kinds `["user","assistant"]`, limit 100). A large result is saved
     to a file -> run `digest_sessions.py <that file> --to-log` on it instead of reading the raw
     JSON; `--to-log` also copies his phone messages into the data-keeper log, so recall and
     the fact sweep cover them. Use `--to-log` only for `anthropic_cloud` sessions - `bridge`
     (Remote Control) sessions run on the PC and are logged there already.
   - Not reachable (e.g. claude.ai project chats on the phone) -> say so in one line.
2. **Many sessions (more than 4 digests)** -> fan out: one subagent per 2-3 digests, each
   returns at most 10 findings (bucket, evidence with session + time, suggested route).
   Raw dumps never enter the main context.
3. **Cross-session analysis:**
   - the same request or manual procedure in 2+ sessions -> skill candidate (strong);
   - the same correction twice -> memory, and fix the skill that caused it;
   - the same failure in different sessions -> skill upgrade or a script;
   - sessions that ended **without** end-session -> a mini-retro for each (memories, seeds, skill fixes);
   - 💡 offers from today with no answer -> re-score; still good -> keep 💡 (the backlog note brings them back);
   - skills built or used for the first time today -> did they work (first-run watch)? Fix them.
4. **Route and save** per §3-§4.
5. **Facts of the day:** `python -I ~/.claude/skills/data-keeper/scripts/fact_sweep.py --today --check <memory folders> <project folders> --out <scratchpad>/facts.md`
   -> every NOT FOUND fact and decision gets saved in its right place (data-keeper, "Fact sweep").
6. **Monthly skill audit** (on the 1st of the month, or when Gilad says "בדיקת סקילים"):
   `lint_skill.py --all --budget` (errors, duplicates, what the listing costs per session) and
   `digest_sessions.py --days 30 --json` (which skills really ran). Unused for 30 days -> ask
   whether to retire it (move to `~/.claude/skills-archive/`), merge it, or sharpen its
   description; the biggest descriptions of rarely used skills get shortened.
7. **Stamp** `Last day review: <YYYY-MM-DD HH:MM>` in the header of `skill-seeds.md`.
8. **Report** (§7), adding the top 1-3 improvements for tomorrow.

## 7. Output (Hebrew, short - Gilad often reads on the phone)
| # | סוג | מה | למה זה עוזר | מה נעשה |
|---|---|---|---|---|
| 1 | סקיל חדש | ... | ... | נבנה ✓ |
| 2 | שדרוג סקיל | ... | ... | עודכן ✓ |
| 3 | סקיל גדול | ... | ... | בריף ✓ + שיחה מוצעת |
| 4 | זיכרון | ... | ... | נשמר ✓ |
| 5 | זרע 🌱 | ... (פרויקט ...) | עוד בבנייה | נשמר ✓ |
| 6 | זרע בשל 🌿 | ... | הופיע ב-N שיחות | נבנה ✓ / בריף ✓ |

**תובנות התייעלות:** 1-3 bullets. Day mode adds **בשביל מחר:** the top 1-3 improvements.
At most ~8 rows in chat; the rest goes to the journal and the pipeline.

## Rules
- Everything found is saved (§4); routing decides how, never whether.
- Never a duplicate skill or memory - update beats create.
- Big builds go to a fresh session with a complete brief - never a rushed build at the end of a long session.
- Raw transcripts never go into context: digest them first.
- Every fact Gilad gave lands somewhere real - the data-keeper fact sweep proves it.
- Talk Hebrew, keep it short.

## Pitfalls (tested 2026-10-29)
- Reading other sessions with raw `list_events` floods the context (one day = 500k+ chars);
  `digest_sessions.py` turned 569 KB of dumps into a 3 KB digest that kept every user message.

## Files
- `skill-seeds.md` - the pipeline (header = statuses + templates; entries below the marker).
- `briefs/` - one brief per 🔨 item, read by `/skill-forge <slug>`.
- `scripts/digest_sessions.py` - session digests (`--today`, `--days N`, files, `--json`,
  `--out`; `--to-log` copies his messages into the data-keeper log, skipping duplicates).
