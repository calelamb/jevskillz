# jevskillz

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757)](#install)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-Codex%20%7C%20Cursor%20%7C%20Gemini%20%7C%20Copilot-6b5bd6)](#codex-cursor-gemini-cli-copilot)
[![Node ≥ 18](https://img.shields.io/badge/node-%E2%89%A518-339933)](package.json)
[![GitHub stars](https://img.shields.io/github/stars/calelamb/jevskillz?style=social)](https://github.com/calelamb/jevskillz/stargazers)

**Stop your coding agent from saying "all tests pass" when they don't.**

jevskillz adds **calibrated confidence checks to every step of coding with Claude Code**: brainstorm, research, write, test, verify, ship, triage. The checks are backed by [TypeSafe](https://typesafe.ai) **Jev**, a System One model that returns typed probabilities instead of generated text.

Coding agents are fluent and often overconfident: "all tests pass", "fixed", "this is the best approach". jevskillz turns those moments into small, measurable judgments. Each check asks Jev several independently phrased yes/no questions over the **evidence you paste** (command output, diffs, test source) and reports `mean [95% interval]` across the phrasings, so you see both the answer and how stable it is.

```text
$ jev claims claims.json
PASS supported   0.77 [0.74, 0.79]
FAIL unsupported 0.06 [0.03, 0.08]
```

9 skills · ~550 tokens of always-on context · zero-dependency Node engine · MIT

## Install

You need a TypeSafe API key (get one at [typesafe.ai](https://typesafe.ai)). Add it to your shell profile:

```bash
export TYPESAFE_API_KEY=...
```

### Claude Code (plugin, recommended)

Inside Claude Code:

```text
/plugin marketplace add calelamb/jevskillz
/plugin install jevskillz@jevskillz
```

Or from a shell: `claude plugin marketplace add calelamb/jevskillz && claude plugin install jevskillz@jevskillz`.

The plugin puts the `jev` engine on the agent's `PATH`, so there's nothing else to install. The skills load automatically in every session.

### Codex, Cursor, Gemini CLI, Copilot

The skills follow the [Agent Skills](https://github.com/vercel-labs/skills) `SKILL.md` format:

```bash
npx skills add calelamb/jevskillz          # installs the 9 skills into your agent(s)
npm install -g github:calelamb/jevskillz   # provides the `jev` command the skills call
```

### Manual (git clone)

```bash
git clone https://github.com/calelamb/jevskillz.git ~/jevskillz
cd ~/jevskillz
./install.sh          # symlinks skills into ~/.claude/skills and `jev` into ~/.local/bin
npm test              # offline checks, no API calls
npm run calibrate     # runs every example against the live API
```

Update with `git pull`: the skills are symlinks, so there's nothing to reinstall.

## What's inside

- `bin/jev.mjs`: a zero-dependency Node engine (Node ≥ 18) with 8 modes.
- `skills/`: 9 skills that tell the agent *when* to run which check and how to read the result.
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

## FAQ

**How do I stop Claude Code (or another coding agent) from claiming tests pass when they don't?**
Install jevskillz. The `jev-verify-claims` skill fires when an agent, subagent, commit message, or PR description says work is done, fixed, or passing. It checks the claim against the raw command output and fails claims the evidence doesn't support (0.06 on the bad calibration example vs. 0.77 on the good one).

**How is this different from asking another LLM to judge?**
An LLM judge generates a verdict in prose, and a single phrasing can swing it. jevskillz asks Jev several independently phrased yes/no questions and reports the mean with a 95% interval, so an unstable answer shows up as a wide interval instead of a confident-sounding sentence. Every mode ships with a good/bad example pair and measured numbers.

**How do I check that a test actually tests the behavior, not just the mocks?**
`jev-test-quality` (mode `tests`) rates whether a test proves the user-visible behavior. In the calibration set, a mock-only test scored 0.06 and a behavior-level test scored 0.64 [0.58, 0.70].

**How do I verify a bug fix or code-review finding is actually resolved?**
`jev-fix-verification` (mode `resolve`) scores the fixed code against the finding and uses the original code as a control, so a fix only passes if it's clearly better than doing nothing.

**Does it work with Codex, Cursor, Gemini CLI, or Copilot?**
Yes. The skills use the standard `SKILL.md` format, so `npx skills add calelamb/jevskillz` installs them into those agents, and `npm install -g github:calelamb/jevskillz` provides the `jev` command. The `jev` CLI also works on its own with any JSON input.

**How much context does it use?**
About 550 tokens always-on across all 9 skills (measured with `claude plugin details jevskillz`). Each skill's full instructions load only when it fires.

**What is TypeSafe Jev?**
A "System One" model from TypeSafe that turns natural language plus application state into typed judgments and probabilities, rather than free text. jevskillz is an independent project built on its API.

**Is my code sent anywhere?**
Yes: the evidence you pass to a check is sent to the TypeSafe API. Don't pass secrets or personal data. See [What this is not](#what-this-is-not).

## What this is not

- **Not a test runner.** A PASS never replaces running your tests. The checks grade the evidence you show them.
- **Not an authority.** Typed output guarantees the *shape* of the answer, not its truth. Treat a FAIL as "look harder", not as an automatic revert.
- **Not private by default.** Evidence is sent to the TypeSafe API. Don't paste secrets or personal data, and check your own data-handling requirements.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). New modes and skills are welcome if they come with a good/bad example pair and measured numbers.

If jevskillz caught an overclaim for you, a ⭐ helps other people find it.

## License

MIT. See [LICENSE](LICENSE). Not affiliated with TypeSafe or Anthropic.
