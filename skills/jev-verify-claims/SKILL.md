---
name: jev-verify-claims
description: Use when a subagent, workflow agent, PR description, commit message, or ticket close-out comment claims work is done, tests pass, or a bug is fixed — before relaying that claim to the user or moving a ticket
---

# Verify claims with Jev

Agents overclaim. Before you repeat "all tests pass" or "fixed", check each claim against the **raw** evidence.

1. Split the report into atomic claims (one fact each: counts, files, behaviors).
2. For each, gather primary evidence yourself: rerun the command, `git show`, read the test. Never use the agent's own summary as evidence.
3. Build `claims.json` → `jev claims claims.json out.json`.
4. PASS → relay with the number. FAIL/ambiguous → investigate that claim before saying anything about it.

```json
[{"id":"suite","claim":"All 151 extension tests pass.",
  "evidence":"$ npx vitest run\n Test Files 19 passed (19)\n Tests 151 passed (151)"}]
```
Calibration: real test output 0.77 [0.74, 0.79]; "should work now, tests look fine" 0.06.

## Red flags
- Evidence field contains the agent's prose instead of command output → you are grading vibes.
- Batch claim "everything done" → split it.
- Skipping because "the verifier agent already passed it" → verifiers are agents too; spot-check their key claims.

**REQUIRED BACKGROUND:** jev-core. Pairs with superpowers:verification-before-completion (run the commands; Jev checks the story you tell about them).
