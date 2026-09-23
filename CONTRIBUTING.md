# Contributing

1. **Every mode or phrasing change ships with evidence.** Add or update a good/bad pair in `bin/examples/<mode>.json`, run `npm run calibrate`, and put the before/after numbers in the PR description.
2. **Keep the engine dependency-free.** Node ≥ 18 built-ins only.
3. **Skills describe *when*, not *how*,** in their `description` frontmatter (start with "Use when…"). Keep each `SKILL.md` short and point to `jev-core` for shared rules.
4. **Offline tests must pass:** `npm test` (no API key needed).
5. Never commit API keys, customer data, or real evidence from private codebases in examples.
