---
name: jev-triage-routing
description: Use when a bug report, customer complaint, Slack ask, or email arrives and must be routed to a product area, repo, severity, or owner — or checked against existing tickets for duplicates before filing a new one
---

# Triage and route with Jev

**Route (choice mode):** `{id, state:<report text>, question, options:{area: description}}`. Options must be mutually exclusive with one-line definitions; include an `other/unclear` option. Confidence ≥ 0.5 → route; lower → ask the reporter or read more. Measured: "spinner keeps spinning after Update on meta description" → `metadata`, confidence 1.00.

Run separate choice items for independent axes (area, severity, which repo) — same state, one question each.

**Find duplicates (rerank mode):** query = the new report, candidates = open ticket titles + first lines (from your tracker). Score ≥ ~2.0 → likely duplicate: comment on the existing ticket instead of filing. Then confirm with `noul`: "Do `report` and `ticket` describe the same underlying defect?" with 3 variants.

Routing is a suggestion for you to act on, not an automatic assignment.

**REQUIRED BACKGROUND:** jev-core.
