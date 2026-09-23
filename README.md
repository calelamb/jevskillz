# jevskillz

**Calibrated confidence checks for every step of coding with Claude Code** — brainstorm, research, write, test, verify, ship, triage — backed by [TypeSafe](https://typesafe.ai) **Jev**, a System One model that returns typed probabilities instead of generated text.

Coding agents are fluent and often overconfident: "all tests pass", "fixed", "this is the best approach". jevskillz turns those moments into small, measurable judgments. Each check asks Jev several independently phrased yes/no questions over the **evidence you paste** (command output, diffs, test source) and reports `mean [95% interval]` across the phrasings, so you see both the answer and how stable it is.

```text
$ jev claims claims.json
PASS supported   0.77 [0.74, 0.79]
FAIL unsupported 0.06 [0.03, 0.08]
```

## What's inside

- `bin/jev.mjs`: a zero-dependency Node engine (Node ≥ 18) with 8 modes.
- `skills/`: 9 Claude Code skills that tell the agent *when* to run which check and how to read the result.
- `bin/examples/`: a good and a bad example for every mode. These double as the calibration set.

| Step | Skill | Mode | Question it answers |
|---|---|---|---|
| Brainstorm / decide | `jev-brainstorm-ranking` | `score` | Which option best fits our constraints, dimension by dimension? |
| Research | `jev-research-rerank` | `rerank` + `claims` | Which sources matter most, and does my note say only what they say? |
| Write | `jev-writing-check` | `claims` + `score` | Is this update honest, and does it answer what was asked? |
| Test | `jev-test-quality` | `tests` | Does this test prove the user-visible behavior, or just that mocks were called? |
| Fix | `jev-fix-verification` | `resolve` | Does the fix resolve the finding? (The original code is the control.) |
| Close a ticket | `jev-acceptance-gate` | `ac` | Is each acceptance checkbox actually met? |
| Trust an agent | `jev-verify-claims` | `claims` | Is this "done / passing / fixed" claim backed by raw evidence? |
| Triage | `jev-triage-routing` | `choice` + `rerank` | Where does this report belong, and is it a duplicate? |
| Reference | `jev-core` | — | Modes, input shapes, thresholds, rules |

## Install

```bash
git clone https://github.com/calelamb/jevskillz.git ~/jevskillz
cd ~/jevskillz
export TYPESAFE_API_KEY=...   # get one at typesafe.ai; add it to your shell profile
./install.sh                   # symlinks skills into ~/.claude/skills and `jev` into ~/.local/bin
npm test                       # offline checks, no API calls
npm run calibrate              # runs every example against the live API
```

The skills load automatically in every Claude Code session on the machine. Update with `git pull`: the skills are symlinks, so there's nothing to reinstall.

## Modes

```bash
jev <mode> <input.json> [out.json]   # exit 0 = all items pass their gate, 1 = at least one fails, 2 = error
```

| Mode | Item shape |
|---|---|
| `claims` | `{id, claim, evidence}` |
| `resolve` | `{id, finding, fixed, original}` |
| `ac` | `{id, criterion, evidence}` |
| `tests` | `{id, behavior, test}` |
| `noul` | `{id, state, question, variants[]}` |
| `score` | `{id, state, dimensions: {name: {question, levels[], weight}}}` |
| `rerank` | `{id, query, candidates: [{id, text}]}` |
| `choice` | `{id, state, question, options: {key: description}}` |

## Calibration (jev-1.13.0)

The model is pinned so numbers stay comparable. Paired good and bad examples in `bin/examples`:

| Mode | Good | Bad |
|---|---|---|
| claims | 0.77 [0.74, 0.79] | 0.06 |
| resolve | 0.56 [0.47, 0.66], control 0.10 | — |
| ac | 0.86 [0.79, 0.90] | 0.09 (happy path only) |
| tests | 0.64 [0.58, 0.70] | 0.06 (mock-only) |
| noul | — | 0.03 (overclaiming PR text) |
| rerank | relevant doc 2.89 / 3 | off-topic 0.01 |
| choice | correct bucket, confidence 1.00 | |

**Field result:** on a real app-store resubmission, `resolve` credited 10/10 reviewer findings at 0.74–0.92 (mean 0.86 [0.82, 0.89]) against unfixed controls of 0.06–0.26, and `tests` rated the 4 regression tests 0.71–0.96.

**Gates:** a check passes when the mean is ≥ 0.50 **and** the lower bound is ≥ 0.40. `resolve` also requires separation ≥ 0.30 from its control and a regression score < 0.50. Scores between 0.40 and 0.55 are ambiguous: add evidence rather than rounding up. If you change the model, rerun `npm run calibrate` and update these numbers.

## What this is not

- **Not a test runner.** A PASS never replaces running your tests. The checks grade the evidence you show them.
- **Not an authority.** Typed output guarantees the *shape* of the answer, not its truth. Treat a FAIL as "look harder", not as an automatic revert.
- **Not private by default.** Evidence is sent to the TypeSafe API. Don't paste secrets or personal data, and check your own data-handling requirements.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). New modes and skills are welcome if they come with a good/bad example pair and measured numbers.

## License

MIT. See [LICENSE](LICENSE). Not affiliated with TypeSafe or Anthropic.
