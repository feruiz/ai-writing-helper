// What the site hands over to paste into a chat, and the page for models.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INITIAL_STATE, SITUATIONS, AXES } from "../js/data.js";
import { startPrompt, continueMessage, writeRequest, hasStartingPoint, llmsText, SITE_URL, LLMS_FILE } from "../js/prompts.js";
import { readReply } from "../js/block.js";
import { clone, normalize } from "../js/state.js";

const initial = () => normalize(clone(INITIAL_STATE));

test("the start request stands on its own and points to the page for models", () => {
  const prompt = startPrompt(initial(), { lang: "pt" });
  assert.match(prompt, /Talk with me in Brazilian Portuguese/);
  assert.ok(prompt.includes(`${SITE_URL}${LLMS_FILE}`));
  for (const axis of AXES) assert.ok(prompt.includes(`${axis.id} (1 = ${axis.left}, 5 = ${axis.right})`), axis.id);
  assert.match(prompt, /"aiWritingHelper": 1/);
});

test("the start request has no braces, so a pasted conversation never mistakes it for the block", () => {
  assert.ok(!startPrompt(initial()).includes("{"));
});

test("the starting point goes along only when asked, and reads back as the same voice", () => {
  const voice = normalize({ ...clone(INITIAL_STATE), name: "Flor", axes: { ...INITIAL_STATE.axes, humor: 1 }, examples: [{ text: "Saiu a fornada.", lang: "pt" }] });
  assert.ok(!startPrompt(voice).includes("## Starting point"));
  const prompt = startPrompt(voice, { fromHere: true });
  assert.match(prompt, /## Starting point/);
  assert.match(prompt, /Its examples are real texts in this voice/);
  const back = readReply(prompt, initial());
  assert.equal(back.state.name, "Flor");
  assert.equal(back.state.axes.humor, 1);
  assert.equal(back.state.examples[0].text, "Saiu a fornada.");
});

test("a site left as it opens has no starting point; any change makes one", () => {
  assert.equal(hasStartingPoint(initial()), false);
  assert.equal(hasStartingPoint({ ...initial(), situation: "badNews", applyShift: false }), false, "the view settings aren't the voice");
  assert.equal(hasStartingPoint({ ...initial(), name: "Flor" }), true);
  assert.equal(hasStartingPoint({ ...initial(), examples: [{ text: "x", situation: "general", lang: "en", source: "pasted" }] }), true);
});

test("the message for the same conversation carries the voice as it stands", () => {
  const back = readReply(continueMessage({ ...initial(), name: "Flor" }), initial());
  assert.equal(back.state.name, "Flor");
});

test("the request for one text carries the guide and the situation", () => {
  const bad = SITUATIONS.find((s) => s.id === "badNews");
  const request = writeRequest(initial(), "pt", bad);
  assert.match(request, /<voice-guide>\n# Voice guide: Lumen/);
  assert.match(request, /in Brazilian Portuguese/);
  assert.match(request, /Situation: Bad news \(something went wrong/);
  assert.ok(request.includes(bad.summary), "without what it's about, the fictional case is the subject");
  assert.match(writeRequest({ ...initial(), about: "Uma padaria" }, "pt", bad), /the real subject/);
});

test("llms.txt is up to date with the data", () => {
  const saved = readFileSync(new URL(`../${LLMS_FILE}`, import.meta.url), "utf8");
  assert.equal(saved, llmsText(), "run: node scripts/build-llms.mjs");
});
