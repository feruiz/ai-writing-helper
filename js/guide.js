// Builds the tone of voice file in Markdown, written for the model that will
// get it as a system prompt: one language; the traits that define the voice
// first, each with a "this, not this" pair from the ladder; situations spelled
// out as the rules of their shifted levels (the brand's own included); what the
// brand does, believes and never does near the top, and the brand's approved texts as
// examples. Without approved texts, built texts stand in, marked as
// illustrations of the rules only.

import { FOUNDATION, AXES, FINISH, SITUATIONS, allSituations, activeSituations } from "./data.js";
import { composeText, effectiveLevels, effectiveAddress } from "./compose.js";
import { listOf } from "./meter.js";
import { LANGUAGES, situationName } from "./examples.js";
import { beliefsOf, neverOf, pairsOf } from "./brand.js";

// How many rejected texts the guide carries: the latest ones, so they stay a footnote.
export const MAX_REJECTED = 4;

const option = (group, id) => group.options.find((o) => o.id === id);
const brandName = (state) => state.brand.trim() || "Lumen";
const pole = (axis, n) => (n < 3 ? axis.left : axis.right);
const distance = (state, axis) => Math.abs(state.axes[axis.id] - 3);
const byDistance = (state) => (a, b) => distance(state, b) - distance(state, a);

// The language the guide targets: the one most approved texts are in, else the fallback.
export function guideLanguage(state, fallback = "en") {
  const counts = { en: 0, pt: 0 };
  for (const e of state.examples || []) if (e.text.trim()) counts[e.lang]++;
  if (counts.pt === counts.en) return fallback;
  return counts.pt > counts.en ? "pt" : "en";
}

export function defaultEssence(state) {
  const role = option(FOUNDATION.role, state.role).label.toLowerCase();
  const traits = AXES.filter((a) => distance(state, a) > 0)
    .sort(byDistance(state))
    .slice(0, 3)
    .map((a) => pole(a, state.axes[a.id]).toLowerCase());
  const article = /^[aeiou]/.test(role) ? "an" : "a";
  return `${brandName(state)} speaks like ${article} ${role}${traits.length ? `: ${traits.join(", ")}` : ", in a balanced tone"}.`;
}

export function warnings(state) {
  const a = state.axes;
  const list = [];
  if (a.formality <= 2 && a.attitude >= 4) list.push("Formal and irreverent at the same time tends to read as irony.");
  if (a.style >= 4 && a.technicality >= 4) list.push("Lyrical and technical together make the text heavy. Pick which one leads.");
  if (state.address === "formal" && a.formality >= 4) list.push("\"O(a) senhor(a)\" in a casual text sounds odd.");
  if (state.sentenceLength === "short" && a.style >= 4) list.push("Short sentences limit the lyrical style: images need room.");
  if (state.emoji === "free" && a.formality <= 2) list.push("Free use of emoji doesn't fit a formal text.");
  if (a.certainty === 5) list.push("Maximum certainty tends to promise what the brand can't guarantee. State in the guide what must never be promised.");
  if (a.humor >= 4 && a.energy <= 1) list.push("High humor with minimum energy becomes deadpan. It works, but it's rare: make sure that's the intent.");
  return list;
}

// What the readability target asks for, said so a writer can follow it while
// writing: word choice and average sentence length, by position on
// Simple ↔ Technical. The meter checks the same thing with a Flesch score.
const READABILITY = {
  1: { words: "Short, everyday words, the ones a customer uses at home; never a long word where a short one exists.", average: 12 },
  2: { words: "Mostly short, common words; a long or technical word only when the short one would be wrong.", average: 15 },
  3: { words: "Common words carry the text; keep long or technical words to a few per paragraph.", average: 18 },
  4: { words: "Technical words are expected; keep the sentences around them short so they don't pile up.", average: 22 },
};

// The parts of the guide that depend on the language the texts will be in.
const WORDING = {
  en: {
    name: "English",
    speaker: (state, name) => ({
      we: "\"we\", first person plural (\"we launched\", \"our\").",
      i: "\"I\": a real person signs (\"I launched\", \"my\").",
      brand: `the brand in third person, by name and without an article ("${name} launched").`,
    })[state.speaker],
    address: {
      you: "the reader, as \"you\".",
      youPlural: "a group: \"you\", with group greetings (\"Hi everyone\").",
      formal: "the reader in a formal register, since English has no \"o senhor\": no contractions, \"Dear\" in greetings, \"please\" in requests.",
      impersonal: "nobody directly: impersonal constructions and the passive voice (\"the report is available\").",
    },
    oneReader: "Written to one person: \"you\", never a group greeting.",
    formality: (n) => (n >= 4 ? "Contractions (\"we're\", \"you'll\") are the norm." : n === 3 ? "No contractions (\"we're\", \"you'll\")." : "No contractions or colloquial words (\"we're\", \"hey\", \"folks\")."),
    hedge: "Hedge claims you can't fully back (\"should\", \"the idea is\").",
    noHedge: "No hedges: no \"maybe\", \"should\", \"probably\".",
  },
  pt: {
    name: "Brazilian Portuguese",
    speaker: (state, name) => ({
      we: "\"nós\", usually with the subject dropped (\"lançamos\", \"nosso\").",
      i: "\"eu\", usually with the subject dropped (\"lancei\", \"meu\").",
      brand: `the brand in third person, by name with its article ("${state.article === "none" ? name : `${state.article} ${name}`} lançou").`,
    })[state.speaker],
    address: {
      you: "the reader, as \"você\".",
      youPlural: "a group: \"vocês\".",
      formal: "the reader as \"o(a) senhor(a)\", with the verb in the third person.",
      impersonal: "nobody directly: impersonal constructions (\"é possível\", \"está disponível\").",
    },
    oneReader: "Written to one person: \"você\", never \"vocês\".",
    formality: (n) => (n >= 4 ? "Colloquial forms (\"pra\", \"a gente\", \"tá\") are allowed." : "No colloquial forms (\"pra\", \"a gente\", \"tá\")."),
    hedge: "Hedge claims you can't fully back (\"deve\", \"a ideia é\").",
    noHedge: "No hedges: no \"talvez\", \"deve\", \"provavelmente\".",
  },
};

// checker: the file name of the voice checker, when the guide ships with one (the skill package).
export function buildGuide(state, lang = guideLanguage(state), { checker = "" } = {}) {
  const name = brandName(state);
  const w = WORDING[lang];
  const lines = [];
  const add = (...l) => lines.push(...l);
  const quote = (axis, n) => `"${axis.levels[n - 1][lang]}"`;

  add(`# Voice guide: ${name}`, "");
  add(`You write ${name}'s texts, in ${w.name}. Keep this voice whatever the subject you are asked to write about. When you don't know a fact, say so instead of making it up.`, "");
  if (checker) add(`Before you deliver a draft, save it to a file and run \`node ${checker} draft.txt\` from this folder (add \`--situation "Name"\` for a situation listed under "Tone by situation"). Fix every line marked FAIL and run it again; reply only once it passes.`, "");
  add(`**Essence.** ${state.essence.trim() || defaultEssence(state)}`, "");

  // What the brand is, from the brand fields; each one is left out when empty.
  const business = state.business?.trim();
  const reader = state.reader?.trim();
  const beliefs = beliefsOf(state.beliefs);
  if (business || reader || beliefs.length) {
    add(`## About ${name}`, "");
    if (business) add(`- **What it does:** ${business}`);
    if (reader) add(`- **Who it writes for:** ${reader}`);
    if (beliefs.length) {
      add("- **What it believes:** the voice comes from these. Let them show in what you choose to say, without stating them outright.");
      for (const b of beliefs) add(`  - ${b}`);
    }
    add("");
  }

  const role = option(FOUNDATION.role, state.role);
  add("## Who speaks and who it talks to", "");
  add(`- **Who speaks:** ${w.speaker(state, name)}`);
  add(`- **Who it talks to:** ${w.address[state.address]}`);
  add(`- **Role:** ${role.label.toLowerCase()}. ${role.guide}`, "");

  // Temperament: the axes pushed furthest from the middle come first and get
  // the most room; the ones left in the middle take one line each.
  add("## Temperament", "");
  const sorted = [...AXES].sort(byDistance(state));
  const defining = sorted.filter((a) => distance(state, a) > 0);
  const neutral = sorted.filter((a) => distance(state, a) === 0);
  add(`Seven axes, each from 1 to 5. ${defining.length ? "They come in order of how much they define the voice: the first ones matter most." : "None is pushed to either side: the voice is balanced on all seven."} The quoted sentences are illustrations of the voice only. All of them are about a fictional product, a monthly finance report, so the levels can be compared on the same message; they say nothing about ${name}.`, "");
  for (const axis of defining) {
    const n = state.axes[axis.id];
    const step = n < 3 ? n + 1 : n - 1; // one level toward the opposite pole
    const away = n < 3 ? axis.right : axis.left;
    add(`### ${pole(axis, n)}: ${n} of 5 on ${axis.left} ↔ ${axis.right}`, "");
    add(axis.levels[n - 1].rule, "");
    add(`- This: ${quote(axis, n)}`);
    add(`- Not this: ${quote(axis, step)} (${step} of 5: already too ${away.toLowerCase()} for ${name})`);
    if (distance(state, axis) === 2) add(`- Nor this: ${quote(axis, 3)} (3 of 5, the middle: further still)`);
    add("");
  }
  if (neutral.length) {
    add(`${defining.length ? "Kept in the middle, 3 of 5" : "All at 3 of 5"}:`, "");
    for (const axis of neutral) add(`- **${axis.name}** (${axis.left} ↔ ${axis.right}): ${axis.levels[2].rule}`);
    add("");
  }

  add("## Verifiable rules", "");
  const limit = option(FINISH.sentenceLength, state.sentenceLength).limit;
  add(`- ${option(FINISH.sentenceLength, state.sentenceLength).guide}`);
  add(`- ${option(FINISH.exclamation, state.exclamation).guide}`);
  add(`- ${option(FINISH.emoji, state.emoji).guide}`);
  const readability = READABILITY[state.axes.technicality];
  if (readability) add(`- ${readability.words}${!limit || limit > readability.average ? ` Sentences average ${readability.average} words or fewer.` : ""}`);
  add(`- ${state.axes.style >= 4 ? "Vary sentence length a lot: short sentences against long ones." : "Vary sentence length: a text where every sentence is the same length reads flat."}`);
  add(`- ${w.formality(state.axes.formality)}`);
  if (state.axes.certainty <= 2) add(`- ${w.hedge}`);
  if (state.axes.certainty >= 4) add(`- ${w.noHedge}`);
  add("");

  // How a text opens and closes, and what the brand never does: rules to check a draft against.
  const opening = state.opening?.trim();
  const closing = state.closing?.trim();
  const never = neverOf(state.never);
  if (opening || closing || never.length) {
    add(`## House rules`, "");
    if (opening) add(`- **Opening:** ${opening}`);
    if (closing) add(`- **Closing:** ${closing}`);
    for (const n of never) add(`- Never ${n}.`.replace(/\.\.$/, "."));
    add("");
  }

  const preferred = listOf(state.preferred);
  const forbidden = listOf(state.forbidden);
  const pairs = pairsOf(state.pairs);
  if (preferred.length || forbidden.length || pairs.length) {
    add("## Vocabulary", "");
    if (preferred.length) add(`- **Prefer:** ${preferred.join(", ")}`);
    if (forbidden.length) add(`- **Never use:** ${forbidden.join(", ")}`);
    if (pairs.length) {
      add("- **Say this, not that:**");
      for (const p of pairs) add(`  - "${p.say}", not "${p.not}"`);
    }
    add("");
  }

  // Situations: each shift spelled out as the rule of the level it lands on.
  add("## Tone by situation", "");
  add("The voice stays; a few axes move with the situation. Where an axis moves, the rule of its new level replaces the base rule above. A situation not listed here uses the base voice.", "");
  for (const s of activeSituations(state)) {
    const levels = effectiveLevels({ ...state, applyShift: true }, s.id);
    const moved = AXES.filter((a) => levels[a.id] !== state.axes[a.id]);
    const notes = moved.map((a) => `${a.name} ${levels[a.id] > state.axes[a.id] ? "rises" : "drops"} to ${levels[a.id]} of 5: ${a.levels[levels[a.id] - 1].rule}`);
    if (effectiveAddress(state, s.id) !== state.address) notes.push(w.oneReader);
    add(`- **${s.name}**${s.when ? ` (${s.when})` : ""}:${notes.length ? "" : " base voice, nothing moves."}`);
    for (const note of notes) add(`  - ${note}`);
  }
  add("");

  add("## Examples", "");
  const approved = (state.examples || []).filter((e) => e.text.trim());
  if (approved.length) {
    const own = approved.filter((e) => e.lang === lang);
    const shown = own.length ? own : approved;
    add(`Real texts ${name} has approved${own.length ? "" : `, in ${LANGUAGES[approved[0].lang]}; carry their voice into ${w.name}`}. They are the best evidence of the voice: match their word choice, rhythm and the way they open and close, whatever the subject you're asked to write about. Don't copy their sentences or reuse their facts.`, "");
    for (const e of shown) {
      add(`<example language="${LANGUAGES[e.lang]}" situation="${situationName(e.situation, allSituations(state)).replace(/"/g, "'")}">`, e.text.trim(), "</example>", "");
    }
  } else {
    add(`${name} has no approved texts here yet. The texts below are assembled from stock sentences about the same fictional product, a monthly finance report, only to show how the rules above sound together. They say nothing about ${name}'s business: take the voice from them, never the subject, the facts or the structure.`, "");
    const stock = SITUATIONS.filter((s) => !state.hiddenSituations?.includes(s.id));
    for (const s of stock.length ? stock : SITUATIONS) {
      add(`<illustration situation="${s.name}" context="${s.summary}">`, composeText({ ...state, applyShift: true }, s.id, lang), "</illustration>", "");
    }
  }

  // Rejected texts: only those with a reason, in the guide's language, the latest few.
  const rejected = (state.rejected || []).filter((e) => e.text.trim() && e.reason?.trim() && e.lang === lang).slice(-MAX_REJECTED);
  if (rejected.length) {
    add("## Not like this", "");
    add(`Texts ${name} turned down, each with the reason. The reason names the pattern to avoid. The subject of a rejected text is fine to write about; just don't copy their phrases. Check your draft against each reason before you answer.`, "");
    for (const e of rejected) {
      add(`<rejected situation="${situationName(e.situation, allSituations(state)).replace(/"/g, "'")}" reason="${e.reason.trim().replace(/"/g, "'")}">`, e.text.trim(), "</rejected>", "");
    }
  }

  return lines.join("\n");
}
