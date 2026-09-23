---
name: jev-fix-verification
description: Use when a bug fix, security fix, or review finding (e.g. an app-store review rejection or a code-review item) has been implemented and you need to decide whether it is actually resolved before marking it fixed, In Review, or ready to resubmit
---

# Verify a fix resolves its finding

`resolve` mode scores the fixed code **and the original code** against the finding's exact text. The original is a control: if both score similarly, Jev can't tell your fix apart from the bug and the evidence is too thin.

1. `finding`: the reporter's verbatim words (reviewer email, bug report). Don't paraphrase it softer.
2. `fixed`: the relevant diff hunks + the regression test source + its passing output.
3. `original`: the same code region before the fix (`git show <base>:<file>`), no tests.
4. `jev resolve items.json out.json`

Credit only when: resolved mean ≥ 0.50, lower ≥ 0.40, separation from control ≥ 0.30, regression < 0.50. Measured: correct fix 0.56 [0.47, 0.66] vs control 0.10.

Multi-part findings (e.g. "status not validated, removal failures hidden, list clears on failure") → one item per part. A part that fails is the part the reviewer will reject.

## Common mistakes
- Evidence = whole files → dilutes; pass only the hunks that matter (≤ ~90k chars).
- Reading a pass as "reviewer will approve" → it means the evidence you showed addresses the words you gave. Still replay the reviewer's scenario for real.

**REQUIRED BACKGROUND:** jev-core.
