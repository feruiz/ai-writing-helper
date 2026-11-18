// What was saved when the site was Brand Voice Creator (the browser, a link, a
// settings file, a block from a chat) opens with the new names.

import { test } from "node:test";
import assert from "node:assert/strict";
import { INITIAL_STATE } from "../js/data.js";
import { clone, normalize, encode, decode, migrate } from "../js/state.js";
import { readReply } from "../js/block.js";

const old = {
  brand: "Padaria Flor",
  business: "Padaria de bairro",
  speaker: "brand",
  situation: "outage",
  hiddenSituations: ["question"],
  customSituations: [{ id: "custom-abc", name: "Falta de pão", when: "", shift: {} }],
  examples: [
    { text: "Saiu a fornada.", situation: "launch", lang: "pt", source: "claude" },
    { text: "Acabou o pão.", situation: "custom-abc", lang: "pt", source: "pasted" },
  ],
  rejected: [{ text: "Olá!!", reason: "saudação", situation: "outage", lang: "pt" }],
};

test("a saved state from before the rename opens with the new names", () => {
  const s = normalize(clone(old));
  assert.equal(s.name, "Padaria Flor");
  assert.equal(s.about, "Padaria de bairro");
  assert.equal(s.speaker, "byName");
  assert.equal(s.situation, "badNews");
  assert.deepEqual(s.hiddenSituations, ["reply"]);
  assert.deepEqual(s.examples.map((e) => e.situation), ["goodNews", "custom-abc"]);
  assert.equal(s.examples[0].source, "ai");
  assert.equal(s.rejected[0].situation, "badNews");
  assert.ok(!("brand" in s) && !("business" in s));
});

test("a link from before the rename opens too", () => {
  const { examples, rejected, ...voice } = old;
  const s = normalize(decode(encode(voice)));
  assert.equal(s.name, "Padaria Flor");
  assert.equal(s.speaker, "byName");
});

test("the old default forbidden list, all AI tics, becomes the new empty one", () => {
  const OLD = "delve, tapestry, testament, pivotal, seamless, game-changer, solução, inovador, no mundo atual, vale ressaltar, mergulhar, jornada";
  assert.equal(normalize({ forbidden: OLD }).forbidden, "");
  assert.equal(normalize({ forbidden: `${OLD}, barato` }).forbidden, `${OLD}, barato`, "a list the writer changed stays");
});

test("a new name wins over an old one when both are there", () => {
  assert.equal(migrate({ brand: "Old", name: "New" }).name, "New");
});

test("a block from before the rename is read with the new names", () => {
  const reply = `\`\`\`json
{
  "brandVoiceCreator": 1,
  "brand": "Flor",
  "business": "Padaria",
  "speaker": "brand",
  "hiddenSituations": ["Service outage"],
  "examples": [{ "text": "Saiu a fornada.", "situation": "Launch", "language": "pt" }]
}
\`\`\``;
  const r = readReply(reply, normalize(clone(INITIAL_STATE)));
  assert.deepEqual(r.notes, []);
  assert.equal(r.state.name, "Flor");
  assert.equal(r.state.about, "Padaria");
  assert.equal(r.state.speaker, "byName");
  assert.deepEqual(r.state.hiddenSituations, ["badNews"]);
  assert.equal(r.state.examples[0].situation, "goodNews");
});
