---
name: skill-scout
description: "The background skill check Gilad asked for (29.10.2026): a hook nudges Claude every few prompts - and at the start of a session when ideas are waiting - to look quietly for a repeatable workflow, a repeated correction or a time sink that no skill covers yet. When one clears the bar it offers ONE line: build it in a new session (proposed as a card), or right now if it pays off in this very conversation; the idea is saved in the skill pipeline either way. TRIGGER when a [skill-scout] hook note appears, when Gilad answers a skill offer ('כן תפתח', 'תבנה עכשיו', 'אחר כך', 'לא צריך'), or asks: 'יש פה רעיון לסקיל?', 'מה אפשר לייעל עכשיו', 'תכבה את הבדיקה ברקע', 'תדליק את הבדיקה ברקע', 'פחות הצעות'. NOT the end-of-session retro (session-retro) and NOT the build itself (skill-forge)."
---

# Skill Scout - הבדיקה ברקע

## Purpose
Catch the skill while the pain is fresh: in the middle of the work, when Claude can still
see exactly what was done by hand. One short offer, then back to work - the building happens
in a fresh session, "the best way", from a brief written now.

**Language:** Hebrew, one line. Never mention the hook or its notes.

## How it runs
`scripts/scout_hook.py` is a UserPromptSubmit hook (registered in `~/.claude/settings.json`
by the upgrade's `merge_settings.py`). On most prompts it does nothing. It adds a short
`[skill-scout]` note when a check is due:
- **periodic** - first at prompt 4, then every 8 prompts;
- **signals** - sooner when Gilad's message says it again (שוב, עוד פעם, כמו פעם קודמת,
  כל פעם, כבר אמרתי...), when the transcript shows the same action 3+ times, or a burst of
  30+ tool calls since the last check;
- **backlog** - on the first prompt of a session, at most once per 20 hours, when the
  pipeline has 💡 / 🌿 items waiting;
- at most 4 notes per session; never on slash commands or when closing a session.
Tune it in `config.json`; switch it off with a file named `OFF` in this folder.

## When a note appears
1. Answer Gilad's message normally first.
2. Quietly test the best candidate - it must pass all three:
   - **Recurs** - seen 2+ times (here, in memory or in the pipeline), or Gilad said it's routine;
   - **Pays** - saves real time or tokens, or prevents a real error (not cosmetic);
   - **New** - no skill covers it (the skill list in context; when unsure
     `python -I ~/.claude/skills/skill-forge/scripts/lint_skill.py --similar "<one-line job>"`),
     and `~/.claude/skills/session-retro/skill-seeds.md` has no entry for it (⛔ = never again).
   A missing step in an existing skill counts too ("שדרוג ל-<skill>").
3. Passes -> end the reply with ONE line:
   `💡 רעיון לסקיל: <שם> – <מה זה חוסך>. לפתוח לו שיחה חדשה? (כן / אחר כך / לא)`
   If it would pay off already in THIS conversation (the same step is still ahead many
   times), say so in the line and add `/ לבנות גרסה מהירה עכשיו`.
   Then add a 💡 entry to `skill-seeds.md` (template in its header) - saved even if he
   ignores the offer.
4. Nothing passes -> say nothing about it.
- At most 2 offers per session. Never in urgent, medical, emotional or money-pressure
  moments, and never in the middle of a multi-step action - wait for a natural pause.
- Backlog note -> one line:
  `💡 מחכים בבנק <N> רעיונות לסקילים (למשל <שם>). לפתוח שיחה לבנות אחד? (כן / אחר כך)`

## When Gilad answers
- **"כן" / "תפתח"**:
  1. Write the brief `~/.claude/skills/session-retro/briefs/<slug>.md` from
     `~/.claude/skills/skill-forge/templates/brief.template.md`, with the evidence only this
     conversation has: the exact steps that worked, commands, paths, selectors, what failed,
     his words. This is what lets the new session build it right without rediscovering anything.
  2. Set the pipeline entry to 🔨 with the brief path.
  3. Open the build session:
     - Claude desktop app: load the tool with ToolSearch `select:mcp__ccd_session__start_session`
       and propose a session titled `בניית סקיל: <שם>` whose prompt is `/skill-forge <slug>`
       plus one line of context. Gilad gets a card; nothing runs until he starts it.
     - No such tool (phone / cloud) -> give him the opener to paste in a new PC session:
       `/skill-forge <slug>`.
     - Verify: the card was created (the tool answers with a proposal id) or the opener was shown.
     - Usage tight (he said so, or `claude-usage` shows 80%+ of the session or week)? Say the
       card can wait for the reset time - a fresh build uses a lot of usage.
  4. Go straight back to the current work.
- **"תבנה עכשיו"** -> skill-forge **quick** mode right here, then use the new skill for the
  remaining items. If it outgrows quick mode -> brief + build session as above.
- **"אחר כך"** -> keep it 💡; the backlog note brings it back (not before 20 hours).
- **"לא"** -> mark it ⛔ with his reason in one line. Never offer it again.

## Controls
- "תכבה את הבדיקה ברקע" -> create the empty file `~/.claude/skills/skill-scout/OFF`;
  "תדליק את הבדיקה ברקע" -> delete it. Confirm in one line.
- "פחות הצעות" / "יותר הצעות" -> change `every_n_prompts` / `max_nudges_per_session` in
  `config.json` (here) and say the new values.
- Is it installed? `~/.claude/settings.json` has a UserPromptSubmit hook running
  `scout_hook.py`. Test by hand:
  `echo '{"session_id":"t","prompt":"שוב אותו דבר"}' | python -I ~/.claude/skills/skill-scout/scripts/scout_hook.py --debug --dry-run`
  (prints the decision; `--dry-run` writes no state).

## Pitfalls (designed 2026-10-29, not yet run on the PC)
- The hook must never block a prompt: it always exits 0 and stays silent on any error.
- The bar is the product - an offer that isn't clearly worth it trains Gilad to ignore them.
  Two "לא" answers in one day -> raise `every_n_prompts` by 4 and tell him in one line.
- Hebrew "שוב" is matched as a whole word, so "חשוב" does not count as a signal.
