---
name: jev-brainstorm-ranking
description: Use when choosing between several approaches, designs, plans, libraries, or ideas — during brainstorming, architecture decisions, or when a user asks "which option is best" and the trade-offs span multiple criteria
---

# Rank options on weighted rubrics

Generate options freely, then let Jev score each option on the same explicit dimensions; weights and the final pick stay in code/your judgment.

1. Write each option as `state` with the **constraints restated** (time, stack, "no backend change", risk tolerance).
2. Define 2–5 dimensions. Each: a question, 3–5 levels ordered **worst → best** describing concrete situations, a weight.
3. `jev score options.json out.json` → composite 0–1 per option + ranking.
4. `min-confidence` LOW on an option = its state lacks facts for some dimension; add them or split the dimension, then rerun. Changing weights needs no rerun (recompute from `out.json`).

```json
{"fit":{"question":"How well does this approach satisfy every stated constraint?",
  "levels":["Violates at least one constraint","Meets some, unclear on others","Meets every stated constraint"],"weight":2}}
```
Measured: targeted router-navigation fix 0.61 vs full rewrite 0.00 under a 2-day/no-backend constraint.

Present the ranking with per-dimension scores so the user can disagree with a weight, not with a black box.

**REQUIRED BACKGROUND:** jev-core. Pairs with superpowers:brainstorming.
