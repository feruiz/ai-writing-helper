// The exported checker, end to end: the script is assembled from the meter's
// files, written to disk and run with Node on drafts, the way an agent runs it.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { INITIAL_STATE } from "../js/data.js";
import { composeText } from "../js/compose.js";
import { normalize } from "../js/state.js";
import { METER_FILES, meterCode, checkerScript, CHECKER_FILE } from "../js/checker.js";

const dir = mkdtempSync(join(tmpdir(), "checker-"));
const sources = METER_FILES.map((f) => readFileSync(new URL(`../js/${f}`, import.meta.url), "utf8"));
const state = normalize({ ...INITIAL_STATE, name: "Flor", exclamation: "never", forbidden: "cheap" });
const script = join(dir, CHECKER_FILE);
writeFileSync(script, checkerScript(state, "en", meterCode(sources)));

const run = (args, input) => spawnSync(process.execPath, [script, ...args], { input, encoding: "utf8" });
const draft = (name, text) => {
  const path = join(dir, name);
  writeFileSync(path, text);
  return path;
};

test("a draft that keeps the voice passes, exit 0", () => {
  const r = run([draft("good.txt", composeText(state, "goodNews", "en")), "--situation", "Good news"]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Voice check: Flor, Good news, English/);
  assert.match(r.stdout, /All checks pass\./);
});

test("a draft that breaks the rules fails, exit 1, with a fix per line", () => {
  const r = run([draft("bad.txt", "Great question! Our cheap newsletter is not just email, it's a movement. It will change everything you know about reading email forever and ever, trust us on this one.")]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL {2}Exclamation marks/);
  assert.match(r.stdout, /FAIL {2}Forbidden words: cheap/);
  assert.match(r.stdout, /Fix: /);
});

test("the AI tics come one per line, with what was found and the fix", () => {
  const r = run([draft("tics.txt", "Great question! Our newsletter is not just email, it's a movement.")]);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAIL {2}AI tics: chatbot phrases, contrast formulas/);
  assert.match(r.stdout, /Chatbot phrases: "Great question"\. Fix: Cut the chatbot phrase/);
  assert.match(r.stdout, /Contrast formulas: "not just email, it's"/);
});

test("a kind the voice allows stays quiet in the script too", () => {
  const allowing = normalize({ ...state, allowedTics: ["chatbot", "contrast"] });
  const path = join(dir, "allowing.mjs");
  writeFileSync(path, checkerScript(allowing, "en", meterCode(sources)));
  const r = spawnSync(process.execPath, [path, draft("tics2.txt", "Great question. Our newsletter is not just email, it's a movement.")], { encoding: "utf8" });
  assert.match(r.stdout, /ok {4}AI tics: none/);
});

test("the draft can be piped in", () => {
  const r = run([], composeText(state, "reply", "en"));
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("wrong usage exits 2 and says how to use it", () => {
  const r = run(["--situation", "Birthday", draft("x.txt", "Hello.")]);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /Unknown situation "Birthday"/);
  assert.match(r.stderr, /node check-voice\.mjs draft\.txt/);
});
