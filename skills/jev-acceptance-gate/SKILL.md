---
name: jev-acceptance-gate
description: Use when moving a ticket (Linear, Jira, GitHub Issues) to In Review or Done, opening a PR against a plan, or closing a phase — whenever acceptance criteria checkboxes must each be shown satisfied
---

# Gate acceptance criteria one checkbox at a time

"Mostly done" hides the unchecked box. Score **every** checkbox separately against concrete evidence.

1. Copy each criterion verbatim from the ticket/plan.
2. For each, paste the evidence that proves it: test name + output, diff hunk, screenshot description, curl output.
3. `jev ac items.json out.json`
4. Put the per-criterion numbers in the ticket comment: `AC2 0.86 [0.79, 0.90] — test "list refresh 500 keeps records"`.

Measured: fully evidenced criterion 0.86 [0.79, 0.90]; happy-path-only evidence for a two-part criterion 0.09.

A FAIL usually means the evidence covers only part of the checkbox (e.g. error shown but no Retry). Add the missing test, don't reword the criterion.

**REQUIRED BACKGROUND:** jev-core.
