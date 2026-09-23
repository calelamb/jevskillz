---
name: jev-test-quality
description: Use when new or changed tests are about to be committed or cited as proof of a fix — especially regression tests for reported bugs, tests heavy on mocks, or tests that passed on the first run
---

# Check that tests prove the behavior

A test that only asserts mocks were called passes whether or not the bug exists. `tests` mode asks whether the test exercises the **user-visible** behavior and would fail if it regressed.

1. `behavior`: the symptom in user terms ("clicking Copy on a CMS page sends zero network writes and shows 'Copied'").
2. `test`: the full test source (setup + assertions).
3. `jev tests items.json out.json`

Measured: behavioral RTL test 0.64 [0.58, 0.70]; mock-only "renders" test 0.06.

FAIL → strengthen assertions on observable output (text, role, network calls, state), then **mutation-check**: revert the fix line, confirm the test goes red, restore. Jev is the cheap first pass; the mutation check is the proof.

**REQUIRED BACKGROUND:** jev-core. Pairs with superpowers:test-driven-development.
