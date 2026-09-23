// Offline checks for the engine's input validation and CLI contract (no API calls).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const JEV = fileURLToPath(new URL("./jev.mjs", import.meta.url));
const run = (args, env = {}) => {
  try {
    return { code: 0, out: execFileSync("node", [JEV, ...args], { env: { ...process.env, ...env }, encoding: "utf8", stdio: "pipe" }) };
  } catch (err) {
    return { code: err.status, out: `${err.stdout}${err.stderr}` };
  }
};

test("unknown mode prints usage and exits 2", () => {
  const r = run(["bogus", "x.json"]);
  assert.equal(r.code, 2);
  assert.match(r.out, /usage: jev\.mjs/);
});

test("missing API key exits 2 before any network call", () => {
  const r = run(["claims", fileURLToPath(new URL("./examples/claims.json", import.meta.url))], { TYPESAFE_API_KEY: "" });
  assert.equal(r.code, 2);
  assert.match(r.out, /TYPESAFE_API_KEY is not set/);
});
