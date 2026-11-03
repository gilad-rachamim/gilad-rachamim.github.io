<!-- BASE SNAPSHOT (PARTIAL) of ~/.claude/skills/session-retro/SKILL.md as read on the PC at 2026-10-29 00:28:
     lines 1-60 of 92 only. Lines 61-92 (rest of section 3 and everything after) were NOT seen -
     INSTALL.md carries them over from the local file. -->
---
description: "Session retrospective: scan the finished conversation and turn it into lasting improvements - new skill candidates, memory facts/preferences, efficiency lessons, and upgrades to existing skills - checked against what already exists (no duplicates), then ALL built and saved right away without asking, even ones that help only a little (user's standing order, 2026-10-28). Goes beyond a summary. Keeps a seed bank (skill-seeds.md) of half-formed workflows from unfinished projects and grows them across sessions until they are ripe to become skills. TRIGGER on Hebrew: 'הפקת לקחים', 'מה לומדים מהשיחה', 'יש מה לשמור כסקיל', 'תובנות מהשיחה', 'חידודים להמשך', 'מה אפשר לייעל', 'תוציא מזה סקילים', 'יש סקילים חדשים מהשיחה', 'מה אפשר להוציא מהשיחה', 'להבא להתייעל', 'סיכום שיחה', 'סיכום ביניים', 'באמצע הפרויקט'. English: 'retro', 'lessons learned', 'anything to save as a skill', 'what should we remember', 'mid-project summary'. Also runs as step 9 of end-session and after work-summary / session-journal (mid-project mode). NOT a work summary (use work-summary) and NOT a journal (use session-journal)."
---

# Session Retro - הפקת לקחים

## Purpose
Every good session teaches something. This skill makes sure it is not lost: repeatable
workflows become skills, preferences and environment facts become memories, and time
wasted once is not wasted again.

**Language:** talk to the user in Hebrew. Skill files themselves are written in English
(frontmatter description with Hebrew + English triggers), like the existing skills.

## 0. Mode and seed bank
- **Mode:** *final* (project done / end-session) or *mid-project* (the user summarizes
  before the project is finished - via work-summary, session-journal, or "סיכום שיחה").
  In mid-project mode focus on seeds and memories; keep new-skill proposals to what is
  clearly proven already.
- **Read `skill-seeds.md`** (next to this file) before scanning. Any seed this session
  advanced gets updated, not re-proposed.

## 1. Scan the conversation - 5 buckets
Go through the whole session, start to end:

| Bucket | Look for | Example |
|---|---|---|
| **Skill candidates** | A process that worked and will recur - **even a small one that saves only a little** (one avoided search, one fewer question, one fewer retry) | checking and installing an installer someone sent |
| **Memories** | User preferences, corrections ("I told you..."), facts about the environment (paths, accounts, tools) | "Hebrew only", Desktop moved to OneDrive |
| **Efficiency** | Where time was lost: wrong folder searched, repeated attempts, a question the user had to answer twice, a tool that wasn't connected | searched `C:\Users\Admin\Desktop` but it moved |
| **Existing-skill upgrades** | A skill that ran but missed a step or had a wrong assumption | a skill that hardcodes an old path |
| **Seeds** | A workflow taking shape but not proven yet (project unfinished, ran once partially, steps still changing) | a summary format still being refined over several sessions |

A correction from the user always produces at least a memory.

**Seed handling** (cheap, no approval needed - it's a note, not an active skill):
- New seed -> add it to `skill-seeds.md` using the template there; mark "נשמר ✓".
- Existing seed advanced -> append what was learned to "מה כבר ידוע", remove resolved
  items from "מה עוד חסר", bump **שיחות** and **עודכן**.
- **Ripe** (worked end-to-end, or 2+ sessions, or project ended) -> set 🌿 and turn it
  into a skill right away (no approval - see section 3). After creating it, set ✅ with
  the skill name - keep the entry as history.

## 2. Check what already exists
- Skills: list `~/.claude/skills/*/SKILL.md` and read the `description` of anything
  close. Also check the session's available-skills list (plugin/anthropic skills).
- Memories: read `MEMORY.md` in the project's memory folder, open any related file.
- **Update beats create.** If an existing skill or memory covers 70%+ of it, edit that
  one instead of making a new one. **No duplicates:** also check skills built in other
  sessions today (`ls -lt ~/.claude/skills` - newest first); two skills doing one job is
  worse than none.

## 3. Save everything - no exceptions, no approval
**Gilad's standing order (28.10.2026):** every idea that would help even a little is
raised AND saved at the end of the conversation - "ללא יוצא מן הכלל". He chose: build
right away, without asking. This is a defined exception to the "always plan first" rule.
- **No cap** on the number of items. A one-line improvement to an existing skill counts.
- New skill -> build it now (section 4). Existing-skill upgrade -> edit it now.
  Memory -> save now. Seed -> save now. Ripe seed -> make it a skill now.
- The only things that still need a question: anything touching secrets, deleting or
