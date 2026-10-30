---
name: <kebab-name>
description: "<The job, in one clause>. Use when <situation>. TRIGGER on Hebrew: '<phrase 1>', '<phrase 2>', '<phrase 3>', '<phrase 4>', '<phrase 5>'. English: '<phrase>', '<phrase>'. Also runs <as step N of X / after Y> (only if chained). NOT for <neighbor job> (use <neighbor-skill>)."
# argument-hint: "[<arg>]"            # only if it takes arguments
# disable-model-invocation: true      # only for manual-only or risky skills
---

# <Title> - <כותרת בעברית>

## Purpose
<2-3 lines: what problem it removes, what "done" looks like.>

**Language:** talk to Gilad in Hebrew, short. <Wording rules, e.g. keep his text verbatim.>

## Steps
1. **<Step>** - <what to do: exact command / path / selector / tool>.
   - Verify: <how to know it worked before moving on>.
2. **<Step>** - ...
   - Verify: ...

## Output
<What Gilad gets: format, length, where files land.>

## Safety
- Needs Gilad's OK before: <deleting / moving files / sending / paying / changing settings>.

## Pitfalls (tested YYYY-MM-DD)
- <What broke> -> <the fix>.

## Files
- `scripts/<script>.py` - <what it does> (`python -I scripts/<script>.py --help`).
- `references/<file>.md` - <open only when ...>.
