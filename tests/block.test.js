// The block of settings between the site and an AI chat: written by the site,
// read back from replies the way models actually give them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { INITIAL_STATE, PRESETS } from "../js/data.js";
import { voiceBlock, readReply, findBlock, changesBetween, MARKER } from "../js/block.js";
import { clone, normalize } from "../js/state.js";

const initial = () => normalize(clone(INITIAL_STATE));
// The voice without the view settings and with the texts reduced to what the block carries.
const voiceOf = ({ situation, applyShift, examples, rejected, ...rest }) => ({
  ...rest,
  customSituations: rest.customSituations.map(({ id, ...s }) => s),
  examples: examples.map(({ text, lang }) => ({ text, lang })),
  rejected: rejected.map(({ text, reason, lang }) => ({ text, reason, lang })),
});

const bakery = () => normalize({
  ...clone(INITIAL_STATE),
  ...PRESETS.find((p) => p.id === "founder").state,
  brand: "Padaria Flor",
  article: "a",
  essence: "Fala como a vizinha que acorda cedo para assar.",
  business: "Padaria de bairro que assa pão de fermentação natural todo dia",
  reader: "Vizinhos e pais da escola ao lado",
  beliefs: "Pão bom leva tempo\nQuem entra é vizinho",
  opening: "Com a notícia, sem saudação",
  closing: "Com o nome de quem assina",
  never: "promete horário de entrega\nescreve em caixa alta",
  pairs: "vizinhos, not clientes",
  preferred: "fornada, massa mãe",
  customSituations: [{ id: "custom-abc", name: "Falta de pão", when: "acabou a fornada", shift: { energy: -1 } }],
  hiddenSituations: ["outage"],
  examples: [{ text: "Saiu a fornada das 7.\nAinda quente.", situation: "custom-abc", lang: "pt", source: "pasted" }],
  rejected: [{ text: "Olá, querido cliente!", reason: "abre com saudação", situation: "general", lang: "pt", source: "ai" }],
});

const fenced = (value, before = "Here's the block:", after = "Paste it into the site.") =>
  `${before}\n\n\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\`\n\n${after}`;

test("a voice survives the trip to the chat and back", () => {
  const voice = bakery();
  const r = readReply(fenced(voiceBlock(voice)), initial());
  assert.deepEqual(r.notes, []);
  assert.deepEqual(voiceOf(r.state), voiceOf(voice));
  assert.equal(r.state.examples[0].situation, r.state.customSituations[0].id, "the example stays tagged with the own situation");
  assert.equal(r.state.examples[0].source, "chat");
});

test("reading the same block twice changes nothing and adds no texts twice", () => {
  const voice = bakery();
  const reply = fenced(voiceBlock(voice));
  const once = readReply(reply, initial()).state;
  const twice = readReply(reply, once);
  assert.deepEqual(twice.added, { examples: 0, rejected: 0 });
  assert.deepEqual(changesBetween(once, twice.state), []);
  assert.equal(twice.state.customSituations[0].id, once.customSituations[0].id, "an own situation keeps its id by name");
});

test("keys left out keep what the site has", () => {
  const voice = bakery();
  const r = readReply(fenced({ [MARKER]: 1, axes: { humor: 5 } }), voice);
  assert.equal(r.state.axes.humor, 5);
  assert.equal(r.state.business, voice.business);
  assert.equal(r.state.examples.length, 1);
  assert.match(r.notes.join("\n"), /Not in the block, so kept as they were: Formality/);
});

test("the usual JSON slips are repaired", () => {
  const reply = `Pronto! Aqui está:

\`\`\`json
{
  "brandVoiceCreator": 1, // the marker
  "brand": "Padaria Flor",
  /* the temperament */
  "axes": { "formality": 4, "humor": 2, },
  "examples": [
    { "text": "Saiu a fornada.
Ainda quente.", "situation": "General", "language": "pt" },
  ],
}
\`\`\``;
  const r = readReply(reply, initial());
  assert.ok(!r.error, r.error);
  assert.equal(r.state.brand, "Padaria Flor");
  assert.equal(r.state.axes.formality, 4);
  assert.equal(r.state.examples[0].text, "Saiu a fornada.\nAinda quente.");
});

test("curly quotes are read as straight ones", () => {
  const r = readReply("{ “brandVoiceCreator”: 1, “brand”: “Flor” }", initial());
  assert.equal(r.state.brand, "Flor");
});

test("labels, levels in words and loose shapes are understood", () => {
  const r = readReply(fenced({
    [MARKER]: 1,
    speaker: "I",
    address: "Formal you (o senhor)",
    role: "Peer",
    sentenceLength: "short",
    exclamation: "Never",
    axes: { Formality: "2 of 5", humor: { level: 4, reason: "\"Pode aposentar a planilha\"" }, energy: 4.4 },
    pairs: [{ say: "vizinhos", not: "clientes" }, "fornada, not lote"],
    preferred: "fornada, massa mãe",
    beliefs: "Pão bom leva tempo",
  }), initial());
  const s = r.state;
  assert.equal(s.speaker, "i");
  assert.equal(s.address, "formal");
  assert.equal(s.role, "peer");
  assert.equal(s.exclamation, "never");
  assert.equal(s.axes.formality, 2);
  assert.equal(s.axes.humor, 4);
  assert.equal(s.axes.energy, 4);
  assert.equal(s.pairs, "vizinhos, not clientes\nfornada, not lote");
  assert.equal(s.preferred, "fornada, massa mãe");
  assert.equal(r.reasons.humor, "\"Pode aposentar a planilha\"");
  assert.match(r.notes.join("\n"), /Energy: 4.4 isn't a whole level; set to 4/);
});

test("the Portuguese words the ruler quotes count as their ids", () => {
  const r = readReply(fenced({ [MARKER]: 1, speaker: "nós", address: "você" }), { ...initial(), address: "formal" });
  assert.equal(r.state.speaker, "we");
  assert.equal(r.state.address, "you");
  assert.equal(readReply(fenced({ [MARKER]: 1, address: "Vocês" }), initial()).state.address, "youPlural");
  assert.deepEqual(r.notes, []);
});

test("axes may come at the top level", () => {
  const r = readReply(fenced({ [MARKER]: 1, formality: 5, certainty: 1 }), initial());
  assert.equal(r.state.axes.formality, 5);
  assert.equal(r.state.axes.certainty, 1);
});

test("what doesn't fit is left out, with a note for each", () => {
  const before = initial();
  const r = readReply(fenced({
    [MARKER]: 1,
    tone: "warm",
    speaker: "they",
    axes: { humor: 9, warmth: 3, energy: "high" },
    article: "os",
    never: ["a", "b", "c", "d", "e", "f", "g"],
    pairs: ["vizinhos instead of clientes"],
    hiddenSituations: ["launch", "birthday"],
    customSituations: [{ name: "Reclamação", shift: { humor: -5, mood: 1 } }, { when: "no name" }],
  }), before);
  const s = r.state;
  const notes = r.notes.join("\n");
  assert.equal(s.speaker, before.speaker);
  assert.equal(s.axes.humor, 5);
  assert.equal(s.axes.energy, before.axes.energy);
  assert.equal(s.article, before.article);
  assert.deepEqual(s.hiddenSituations, ["launch"]);
  assert.equal(s.customSituations.length, 1);
  assert.deepEqual(s.customSituations[0].shift, { humor: -2 });
  for (const expected of [
    /Left out "tone"/,
    /Who speaks: "they" isn't one of "we", "i", "brand"; kept "we"/,
    /Humor: 9 is outside 1 to 5; set to 5/,
    /Left out the axis "warmth"/,
    /Energy: "high" isn't a level/,
    /Article in Portuguese: "os"/,
    /We never…: 7 lines; the guide takes the first 6/,
    /We say X, not Y: 1 line not written as "word to use, not word to avoid"/,
    /"birthday" isn't a built-in situation/,
    /Reclamação: the Humor shift -5 became -2/,
    /Reclamação: left out the shift "mood: 1"/,
    /without a name/,
  ]) assert.match(notes, expected);
});

test("long fields are cut to their limits, lists at whole lines", () => {
  const r = readReply(fenced({ [MARKER]: 1, business: "x".repeat(400), never: Array.from({ length: 6 }, () => "y".repeat(150)) }), initial());
  assert.equal(r.state.business.length, 300);
  assert.equal(r.state.never.split("\n").length, 3);
  assert.match(r.notes.join("\n"), /cut to 300 characters/);
  assert.match(r.notes.join("\n"), /left out the last 3 lines/);
});

test("switching every situation off keeps the built-in ones on", () => {
  const r = readReply(fenced({ [MARKER]: 1, hiddenSituations: ["launch", "outage", "question"] }), initial());
  assert.deepEqual(r.state.hiddenSituations, []);
  assert.match(r.notes.join("\n"), /Every situation was switched off/);
});

test("in a pasted conversation, the last block wins", () => {
  const start = voiceBlock({ ...initial(), brand: "Old name" });
  const conversation = `${fenced(start, "Starting point:", "")}\n\nAI: ok.\n\n${fenced({ [MARKER]: 1, brand: "New name" })}`;
  assert.equal(readReply(conversation, initial()).state.brand, "New name");
});

test("without the marker, an object that looks like a voice still counts", () => {
  const r = readReply(`Here: {"speaker": "we", "axes": {"humor": 1}} and {"unrelated": true}`, initial());
  assert.equal(r.state.axes.humor, 1);
});

test("a settings file downloaded from the site reads too", () => {
  const file = JSON.stringify({ ...bakery(), examples: [{ text: "Velho texto", situation: "general", lang: "pt", source: "claude" }] });
  const r = readReply(file, initial());
  assert.equal(r.state.brand, "Padaria Flor");
  assert.equal(r.state.never, "promete horário de entrega\nescreve em caixa alta");
  assert.deepEqual(r.notes, []);
});

test("texts saved when the site called Claude become texts from any AI", () => {
  const s = normalize({ examples: [{ text: "a", lang: "en", source: "claude" }], rejected: [{ text: "b", lang: "en", source: "claude" }] });
  assert.equal(s.examples[0].source, "ai");
  assert.equal(s.rejected[0].source, "ai");
});

test("each failure says what to do next", () => {
  assert.match(findBlock("").error, /Paste the AI's reply first/);
  assert.match(findBlock("Sure, here are some thoughts about your voice.").error, /No block of settings/);
  assert.match(findBlock('```json\n{ "brandVoiceCreator": 1, "brand": "Flor", "axes": { "humor": 2').error, /cut off/);
  assert.match(findBlock('{ "brandVoiceCreator": 1, brand: Flor }').error, /can't be read as JSON/);
});

test("the list of changes names what moved", () => {
  const before = initial();
  const after = readReply(fenced({
    [MARKER]: 1,
    brand: "Flor",
    speaker: "brand",
    axes: { humor: 1 },
    never: ["grita"],
    hiddenSituations: ["outage"],
    customSituations: [{ name: "Falta de pão", when: "acabou", shift: {} }],
    examples: ["Saiu a fornada."],
  }), before).state;
  const changes = Object.fromEntries(changesBetween(before, after).map((c) => [c.id, c.change]));
  assert.equal(changes.brand, "“Flor”");
  assert.equal(changes.speaker, "We → The brand");
  assert.equal(changes.humor, "3 → 1 of 5 (Serious)");
  assert.equal(changes.never, "1 added");
  assert.equal(changes.situations, "switched off Service outage; added Falta de pão");
  assert.equal(changes.examples, "1 text added");
});
