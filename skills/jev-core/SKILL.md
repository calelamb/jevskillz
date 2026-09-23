---
name: jev-core
description: Use when any jev-* skill is invoked, when a TypeSafe/Jev call returns surprising numbers, or when deciding which Jev mode, input shape, or threshold fits a judgment — the reference for the shared jev.mjs engine
---

# Jev core (engine reference)

**Engine:** `jev <mode> <input.json> [out.json]` (installed by `install.sh`; or `node <repo>/bin/jev.mjs`) — needs `TYPESAFE_API_KEY`. Exit 0 = every item passed its gate, 1 = at least one failed, 2 = error. Examples for every mode: `bin/examples/` in the pack.

Jev (TypeSafe System One, pinned `jev-1.13.0`) returns calibrated probabilities, not text. The engine asks **several phrasings** of each yes/no question and reports `mean [95% interval]` across them. A narrow interval = a stable judgment, **not** proof of correctness.

| Mode | Input items | Use for |
|---|---|---|
| `claims` | `{id, claim, evidence}` | Is a statement backed by the evidence? |
| `resolve` | `{id, finding, fixed, original}` | Does a fix resolve a finding? `original` is the control |
| `ac` | `{id, criterion, evidence}` | Is one acceptance checkbox met? |
| `tests` | `{id, behavior, test}` | Does a test prove the user-visible behavior? |
| `noul` | `{id, state, question, variants[]}` | Any custom yes/no (give 3+ variants) |
| `score` | `{id, state, dimensions{name:{question, levels[], weight}}}` | Rank options on weighted rubrics |
| `rerank` | `{id, query, candidates[{id,text}]}` | Order sources/tickets/files by relevance |
| `choice` | `{id, state, question, options{k:desc}}` | Route to one of N buckets |

## Calibrated gates (jev-1.13.0, measured on paired good/bad examples)
Evidence gates pass at mean ≥ 0.50 and lower bound ≥ 0.40. Clear good cases land 0.55–0.90, clear bad ones 0.03–0.10. `resolve` also needs separation ≥ 0.30 from its control and regression < 0.50. Anything scoring 0.40–0.55 is **ambiguous**: add evidence or split the item; don't round up.

## Rules
- **Evidence is text you paste**: real command output, diffs, test source. Jev only sees `state` (≤ ~90k chars/item). Summaries of evidence produce summary-grade confidence.
- One narrow judgment per item. Split multi-part claims ("tests pass AND lint clean") when one part might fail.
- Jev output is a signal, never an authority: a FAIL means look harder, not auto-revert; a PASS never replaces running the tests.
- Report numbers as `0.64 [0.58, 0.70]` with the mode and model, never "Jev says it works".
- Keep the key server-side. Never paste secrets or customer PII into `state`.
- `score` levels go low→high desirability, each level a concrete situation; low `min-confidence` means the state lacks the facts to judge that dimension.
