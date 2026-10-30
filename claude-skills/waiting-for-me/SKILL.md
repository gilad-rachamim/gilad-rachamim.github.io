---
name: waiting-for-me
description: "One short list of everything waiting for Gilad - sessions stuck on his answer, what was left open yesterday, skill ideas waiting - so he answers once and each answer is passed to its own session. Runs every morning (a scheduled task, Sunday-Friday) and on request. TRIGGER on Hebrew: 'מה מחכה לי', 'מה פתוח', 'איפה מחכים לי', 'מה צריך ממני', 'על מה לא עניתי'. English: 'what is waiting for me', 'pending answers'. NOT the end-of-day review (session-retro day mode) and NOT a work summary (work-summary)."
---

# Waiting For Me - מה מחכה לי

## Purpose
Gilad runs many sessions at once (PC, Remote Control, phone). Instead of opening each one to
see who waits for him, he gets one short message and answers everything in one reply.

**Language:** Hebrew, very short - one line per item, for the phone.

## Steps
1. **Collect what waits for him:**
   - Sessions: `mcp__claude-code-remote__list_sessions` (mine), and on the PC also
     `mcp__ccd_session_mgmt__list_sessions` when it exists. Waiting = status_bucket
     `BLOCKED`, a `needs_action` in post_turn_summary, or `REVIEW_READY` + unread. Unsure what
     one needs -> read its last assistant message (`list_events`, kinds `["assistant"]`, limit 5).
   - Open items from yesterday: Next Steps in today's / yesterday's project primers and journals
     (PC only), and Claude's promises that are due today.
   - Skill ideas waiting: 💡 / 🌿 entries in `~/.claude/skills/session-retro/skill-seeds.md` (PC only) - one line in total.
   - Verify: each item names its session and exactly what is needed from him.
2. **Send one message**, numbered, at most ~8 lines:
   `1. <session title>: <what it needs, in 5-10 words>`
   and at the end: `אפשר לענות לכולם כאן בהודעה אחת (למשל: "1 - כן, 2 - 14.3.2019").`
   Nothing waits -> `☀️ בוקר טוב - שום דבר לא מחכה לך.` (scheduled run: only that line).
3. **Route his answers:** each numbered answer goes to its session with
   `mcp__claude-code-remote__send_message` (or `SendMessage` to a local session on the PC),
   in his own words. A session that can't be reached (PC off) -> keep the answer in the
   message and say it will be passed on when the PC is on; save it in its primer if reachable.
   Verify: each send answers "delivered"; report in one line which were passed.

## Safety
- Only pass on what he wrote. Never approve, delete, send or pay anything in his name in
  another session unless his answer says so.
- No Shabbat run: the scheduled task runs Sunday-Friday.

## Pitfalls (designed 2026-10-29, not yet run)
- Cloud sessions see only sessions and their messages - not the PC's files; items that need
  the PC say "(במחשב)".
