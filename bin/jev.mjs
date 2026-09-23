#!/usr/bin/env node
// jev-gate: calibrated confidence gates backed by TypeSafe Jev (System One).
//
// Every gate asks Jev several independently-phrased Noul (yes/no) questions over the
// same evidence and reports the mean probability with a bootstrap 95% interval across
// phrasings. Phrasing spread is the uncertainty we can measure; a narrow interval
// means the judgment is stable, not that it is correct.
//
// Usage: node jev.mjs <mode> <input.json> [out.json]
//   resolve  [{id, finding, fixed, original}]    fix resolves a reviewer/bug finding (original = control)
//   claims   [{id, claim, evidence}]              evidence supports a claim (agent report, PR text, ticket close-out)
//   ac       [{id, criterion, evidence}]          an acceptance criterion is met
//   tests    [{id, behavior, test}]               a test exercises the user-visible behavior and would catch a regression
//   choice   [{id, state, question, options:{k:desc}}]  typed routing/triage (returns distribution + confidence)
//   noul     [{id, state, question, variants?:[q...]}]  any yes/no judgment; pass 3+ phrasings to get an interval
//   score    [{id, state, dimensions:{name:{question, levels:[low..high], weight}}}]  multi-dimension rubric,
//            weighted composite in code (brainstorm ranking, writing quality, design options)
//   rerank   [{id, query, candidates:[{id, text}]}]   relevance-rank candidates (sources, snippets, tickets, files)
// Env: TYPESAFE_API_KEY (required). Exit code 1 if any item fails its gate.

import { readFile, writeFile } from "node:fs/promises";

const API_URL = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-1.13.0"; // pinned: thresholds below were calibrated on this version
const MAX_STATE_CHARS = 90_000; // ~22k tokens, under the 32k state+question budget
const BOOTSTRAP_SAMPLES = 5000;
const MAX_RETRIES = 5;
const CONCURRENCY = 4;

// Jev is conservative in absolute terms on code evidence: a clearly correct fix scored
// ~0.58 [0.43, 0.66] and its broken original ~0.06. Gates therefore use a moderate
// floor plus (for resolve) separation from a control. Re-calibrate if MODEL changes.
const GATES = {
  resolve: { minMean: 0.5, minLower: 0.4, minSeparation: 0.3, maxRegression: 0.5 },
  claims: { minMean: 0.5, minLower: 0.4 },
  ac: { minMean: 0.5, minLower: 0.4 },
  tests: { minMean: 0.5, minLower: 0.4 },
  choice: { minConfidence: 0.5 },
  noul: { minMean: 0.5, minLower: 0.4 },
  score: { minConfidence: 0.5 },
  rerank: {},
};

const VARIANTS = {
  resolve: [
    "Does the code in `evidence` resolve the problem described in `subject`, so that repeating the described scenario would now behave correctly?",
    "If the person who reported `subject` re-tested the same scenario against `evidence`, would they consider it fixed?",
    "Is every defect described in `subject` corrected by `evidence`, with no part left unaddressed?",
    "If a user ran the scenario in `subject` against `evidence`, would they now see correct, honest behavior instead of the reported problem?",
    "Does `evidence` remove the cause of the problem in `subject`, rather than only hiding its symptom?",
  ],
  claims: [
    "Is the claim in `subject` fully supported by `evidence`?",
    "Would a skeptical auditor reading only `evidence` agree that `subject` is true?",
    "Does `evidence` contain concrete proof (output, code, counts) for every part of `subject`, rather than restating it?",
    "Is `subject` accurate given `evidence`, with nothing overstated?",
  ],
  ac: [
    "Is the acceptance criterion in `subject` satisfied by `evidence`?",
    "Would a QA reviewer checking only `evidence` tick the checkbox in `subject`?",
    "Does `evidence` demonstrate every condition in `subject`, including edge cases it names?",
    "Is `subject` met in full, not partially or only on the happy path, according to `evidence`?",
  ],
  tests: [
    "Does the test in `evidence` exercise the user-visible behavior described in `subject`?",
    "Would the test in `evidence` fail if the behavior in `subject` regressed?",
    "Does the test in `evidence` assert on observable outcomes (what a user or caller sees) rather than only on mocks being called?",
    "Does the test in `evidence` check the specific outcome named in `subject`, not merely that code runs or renders?",
  ],
};
const REGRESSION_VARIANTS = [
  "Does the code in `evidence` introduce a new defect, security weakness, or broken user flow that a careful reviewer would flag?",
  "Would a strict code reviewer find a bug or regression introduced by the changes in `evidence`?",
  "Does `evidence` show a change that could break existing working behavior or weaken security?",
];
const CRITERIA = {
  true: "Yes: the evidence demonstrates it fully.",
  false: "No: it is not met, only partly met, or the evidence does not demonstrate it.",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clip = (t) =>
  t.length <= MAX_STATE_CHARS ? t : `${t.slice(0, MAX_STATE_CHARS)}\n…[truncated ${t.length - MAX_STATE_CHARS} chars]`;

async function ask(state, questions) {
  const body = JSON.stringify({ state, model: MODEL, questions });
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, "Content-Type": "application/json" },
      body,
    });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status === 529) {
      await sleep((Number(res.headers.get("retry-after")) || 2 ** attempt) * 1000);
      continue;
    }
    throw new Error(`TypeSafe ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  throw new Error("TypeSafe: retries exhausted");
}

// Deterministic PRNG so intervals are reproducible run to run.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function interval(xs, seed) {
  const rand = mulberry32(seed);
  const means = Array.from({ length: BOOTSTRAP_SAMPLES }, () =>
    mean(Array.from({ length: xs.length }, () => xs[Math.floor(rand() * xs.length)])),
  ).sort((a, b) => a - b);
  return [means[Math.floor(0.025 * BOOTSTRAP_SAMPLES)], means[Math.floor(0.975 * BOOTSTRAP_SAMPLES)]];
}

function nouls(prefix, subject, variants) {
  return Object.fromEntries(
    variants.map((q, i) => [`${prefix}_${i}`, { type: "noul", instructions: { subject, question: q }, criteria: CRITERIA }]),
  );
}

function summarize(answers, prefix, seed) {
  const xs = Object.entries(answers)
    .filter(([k]) => k.startsWith(`${prefix}_`))
    .map(([, a]) => a.noul);
  return { mean: mean(xs), ci95: interval(xs, seed), samples: xs };
}

const passesFloor = (s, g) => s.mean >= g.minMean && s.ci95[0] >= g.minLower;

async function evalResolve(item, i) {
  const q = { ...nouls("ok", item.finding, VARIANTS.resolve), ...nouls("reg", item.finding, REGRESSION_VARIANTS) };
  const [fixed, original] = await Promise.all([
    ask({ evidence: clip(item.fixed) }, q),
    ask({ evidence: clip(item.original) }, q),
  ]);
  const ok = summarize(fixed.answers, "ok", 1000 + i);
  const control = summarize(original.answers, "ok", 2000 + i);
  const regression = summarize(fixed.answers, "reg", 3000 + i);
  const g = GATES.resolve;
  const pass = passesFloor(ok, g) && ok.mean - control.mean >= g.minSeparation && regression.mean < g.maxRegression;
  return { id: item.id, pass, ok, control, regression, model: fixed.model };
}

async function evalEvidence(mode, item, i) {
  const subject = item.claim ?? item.criterion ?? item.behavior;
  const evidence = item.evidence ?? item.test;
  if (!subject || !evidence) throw new Error(`${item.id}: missing subject/evidence for mode ${mode}`);
  const res = await ask({ evidence: clip(evidence) }, nouls("ok", subject, VARIANTS[mode]));
  const ok = summarize(res.answers, "ok", 1000 + i);
  return { id: item.id, pass: passesFloor(ok, GATES[mode]), ok, model: res.model };
}

async function evalChoice(item) {
  const res = await ask(item.state, {
    pick: { type: "choice", instructions: item.question, criteria: item.options },
  });
  const a = res.answers.pick;
  return { id: item.id, pass: a.confidence >= GATES.choice.minConfidence, choice: a.choice, probabilities: a.probabilities, confidence: a.confidence, model: res.model };
}

async function evalNoul(item, i) {
  const variants = item.variants?.length ? item.variants : [item.question];
  const questions = Object.fromEntries(
    variants.map((q, k) => [`ok_${k}`, { type: "noul", instructions: q, ...(item.criteria ? { criteria: item.criteria } : {}) }]),
  );
  const res = await ask(typeof item.state === "string" ? clip(item.state) : item.state, questions);
  const ok = summarize(res.answers, "ok", 1000 + i);
  return { id: item.id, pass: passesFloor(ok, GATES.noul), ok, model: res.model };
}

// Score levels are 0-indexed low→high; normalize each dimension to 0..1 so weights are comparable.
async function evalScore(item) {
  const dims = Object.entries(item.dimensions || {});
  if (!dims.length) throw new Error(`${item.id}: score needs dimensions`);
  const questions = Object.fromEntries(
    dims.map(([name, d]) => [name, { type: "score", instructions: d.question, criteria: d.levels }]),
  );
  const res = await ask(typeof item.state === "string" ? clip(item.state) : item.state, questions);
  let weighted = 0;
  let totalWeight = 0;
  const perDimension = {};
  for (const [name, d] of dims) {
    const a = res.answers[name];
    const norm = d.levels.length > 1 ? a.score / (d.levels.length - 1) : a.score;
    const w = d.weight ?? 1;
    weighted += w * norm;
    totalWeight += w;
    perDimension[name] = { score: a.score, normalized: norm, confidence: a.confidence, level: d.levels[Math.round(a.score)] };
  }
  const minConfidence = Math.min(...Object.values(perDimension).map((p) => p.confidence));
  return { id: item.id, pass: true, lowConfidence: minConfidence < GATES.score.minConfidence, composite: weighted / totalWeight, minConfidence, perDimension, model: res.model };
}

const RELEVANCE_LEVELS = [
  "Irrelevant: does not address the query",
  "Tangential: related topic but does not help answer the query",
  "Partially relevant: answers part of the query or gives useful context",
  "Highly relevant: directly and substantially answers the query",
];

// All candidates share one state so Jev reads it once; one Score question per candidate.
async function evalRerank(item) {
  const questions = Object.fromEntries(
    item.candidates.map((c, k) => [
      `c_${k}`,
      { type: "score", instructions: `How relevant is \`candidates[${k}].text\` to \`query\`?`, criteria: RELEVANCE_LEVELS },
    ]),
  );
  const res = await ask({ query: item.query, candidates: item.candidates.map((c) => ({ text: clip(c.text) })) }, questions);
  const ranked = item.candidates
    .map((c, k) => ({ id: c.id, score: res.answers[`c_${k}`].score, confidence: res.answers[`c_${k}`].confidence }))
    .sort((a, b) => b.score - a.score);
  return { id: item.id, pass: true, ranked, model: res.model };
}

async function mapLimit(items, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    }),
  );
  return out;
}

const f = (x) => x.toFixed(2);
const fmt = (s) => `${f(s.mean)} [${f(s.ci95[0])}, ${f(s.ci95[1])}]`;

function line(mode, r) {
  const tag = ["score", "rerank"].includes(mode) ? "RANK" : r.pass ? "PASS" : "FAIL";
  const head = `${tag} ${String(r.id).padEnd(10)}`;
  if (mode === "choice") return `${head} ${r.choice} (confidence ${f(r.confidence)})`;
  if (mode === "score")
    return `${head} composite ${f(r.composite)}  min-confidence ${f(r.minConfidence)}${r.lowConfidence ? " (LOW: add evidence or split the dimension)" : ""}  ` +
      Object.entries(r.perDimension).map(([k, v]) => `${k}=${f(v.normalized)}`).join(" ");
  if (mode === "rerank") return `${head}\n` + r.ranked.map((c, k) => `   ${k + 1}. ${c.id}  ${f(c.score)} (conf ${f(c.confidence)})`).join("\n");
  if (mode === "resolve") return `${head} resolved ${fmt(r.ok)}  control ${f(r.control.mean)}  regression ${f(r.regression.mean)}`;
  return `${head} ${fmt(r.ok)}`;
}

async function main() {
  const [, , mode, inPath, outPath] = process.argv;
  const modes = ["resolve", "claims", "ac", "tests", "choice", "noul", "score", "rerank"];
  if (!modes.includes(mode) || !inPath) throw new Error(`usage: jev.mjs <${modes.join("|")}> <input.json> [out.json]`);
  if (!process.env.TYPESAFE_API_KEY) throw new Error("TYPESAFE_API_KEY is not set");
  const items = JSON.parse(await readFile(inPath, "utf8"));
  if (!Array.isArray(items) || !items.length) throw new Error("input must be a non-empty JSON array");
  const runners = { resolve: evalResolve, choice: evalChoice, noul: evalNoul, score: evalScore, rerank: evalRerank };
  const run = runners[mode] ?? ((it, i) => evalEvidence(mode, it, i));
  const results = await mapLimit(items, run);
  results.forEach((r) => console.log(line(mode, r)));
  const passed = results.filter((r) => r.pass).length;
  if (mode === "score") {
    const ranked = [...results].sort((a, b) => b.composite - a.composite).map((r) => r.id);
    console.log(`\nranking: ${ranked.join(" > ")}`);
  } else if (["choice", "rerank"].includes(mode)) {
    console.log(`\npassed ${passed}/${results.length}`);
  } else {
    const means = results.map((r) => r.ok.mean);
    console.log(`\nmean ${f(mean(means))} [${interval(means, 42).map(f).join(", ")}] across items   passed ${passed}/${results.length}`);
  }
  if (outPath) await writeFile(outPath, JSON.stringify({ mode, model: results[0]?.model, gates: GATES[mode], results }, null, 2));
  process.exitCode = passed === results.length ? 0 : 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 2;
});
