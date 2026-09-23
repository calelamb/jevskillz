---
name: jev-writing-check
description: Use before sending client-facing or team-facing writing — status updates, emails to a reviewer or client, PR descriptions, release notes, ticket comments, docs — especially when it summarizes work, makes promises, or reports results
---

# Check writing for honesty and fit

Writing fails in two ways: it overstates the evidence, or it doesn't answer what the reader asked. Check both before sending.

**Honesty (claims mode):** one item per factual/promissory sentence, `evidence` = the proof. Any FAIL is an overclaim — soften it to what's shown or add the proof. Measured: "fixes all accessibility issues" vs a diff touching 3 of 61 controls → 0.03.

**Fit (score mode):** state = `{request, draft}`; dimensions such as:
- `answers`: "How completely does the draft answer every question in `request`?"
- `clarity`: "How easily can the intended reader act on this without follow-up questions?"
- `tone`: levels from "defensive or vague" → "direct, specific, courteous".
Revise the lowest dimension first; rerun.

For a reviewer reply (e.g. an app-store resubmission), make one `claims` item per finding you say is resolved, with the evidence you'll attach.

**REQUIRED BACKGROUND:** jev-core.
