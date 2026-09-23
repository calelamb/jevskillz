---
name: jev-research-rerank
description: Use when researching docs, API references, search results, past tickets, Slack threads, or codebase hits and there are more candidate sources than you can read closely — or when a research note must cite sources that actually support it
---

# Rerank sources, then check citations

**Rerank before reading.** Collect candidates (search results, doc sections, grep hits, tickets) as short text snippets, then:
`jev rerank items.json` with `{id, query, candidates:[{id,text}]}`. Read top-down; stop when scores drop below ~1.0 (0 = irrelevant … 3 = highly relevant). Measured: the directly relevant doc ranked 2.89, a generic one 1.35, an off-topic one 0.01.

**Check citations after writing.** For each factual sentence in your research note, make a `claims` item: `claim` = the sentence, `evidence` = the exact source excerpt you cite. FAIL = the source doesn't say that; fix the sentence or find a better source. This makes "the docs are the source of truth" checkable.

Keep candidate snippets short (a paragraph each); all candidates share one request.

**REQUIRED BACKGROUND:** jev-core.
