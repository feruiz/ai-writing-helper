// Builds the tone of voice file in Markdown, ready to paste as an AI system
// prompt. Follows the structure from the research: essence, foundation, traits
// with rules, verifiable rules, vocabulary, tone by situation and examples to approve.

import { FOUNDATION, AXES, FINISH, SITUATIONS } from "./data.js";
import { composeText, effectiveLevels } from "./compose.js";
import { listOf, READABILITY_TARGET } from "./meter.js";

const option = (group, id) => group.options.find((o) => o.id === id);
const brandName = (state) => state.brand.trim() || "Lumen";

export function defaultEssence(state) {
  const role = option(FOUNDATION.role, state.role).label.toLowerCase();
  const traits = AXES.filter((a) => state.axes[a.id] !== 3)
    .slice(0, 3)
    .map((a) => (state.axes[a.id] < 3 ? a.left : a.right).toLowerCase());
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

export function buildGuide(state) {
  const name = brandName(state);
  const lines = [];
  const add = (...l) => lines.push(...l);

  add(`# Voice guide: ${name}`, "");
  add(`**Essence.** ${state.essence.trim() || defaultEssence(state)}`, "");
  add("Use this guide as a system prompt. Follow the voice, don't copy the sentences from the examples. When you don't know a fact, say so instead of making it up.", "");

  add("## Who speaks and who it talks to", "");
  add(`- **Who speaks:** ${option(FOUNDATION.speaker, state.speaker).guide.replace("{brand}", name)}`);
  add(`- **Who it talks to:** ${option(FOUNDATION.address, state.address).guide}`);
  add(`- **Role:** ${option(FOUNDATION.role, state.role).label}. ${option(FOUNDATION.role, state.role).guide}`, "");

  add("## Temperament", "");
  add("Each axis goes from 1 to 5. The rule is what counts; the example shows how the rule sounds.", "");
  add("| Axis | Position | Rule | Example |", "|---|---|---|---|");
  for (const axis of AXES) {
    const n = state.axes[axis.id];
    const level = axis.levels[n - 1];
    add(`| ${axis.left} ↔ ${axis.right} | ${n} of 5 | ${level.rule} | "${level.en}" |`);
  }
  add("");

  add("## Verifiable rules", "");
  add(`- ${option(FINISH.sentenceLength, state.sentenceLength).guide}`);
  add(`- ${option(FINISH.exclamation, state.exclamation).guide}`);
  add(`- ${option(FINISH.emoji, state.emoji).guide}`);
  const target = READABILITY_TARGET[state.axes.technicality];
  if (target != null) add(`- Readability: Flesch Reading Ease of ${target} or more in English; Flesch adapted for Portuguese (Martins et al., 1996) of ${target} or more in Portuguese.`);
  if (state.axes.certainty <= 2) add("- Hedge claims you can't fully back (\"should\", \"the idea is\").");
  if (state.axes.certainty >= 4) add("- No hedges: no \"maybe\", \"should\", \"probably\".");
  if (state.axes.formality <= 2) add("- No contractions or colloquial words (\"we're\", \"hey\", \"pra\", \"a gente\").");
  if (state.axes.style >= 4) add("- Vary sentence length: mix short sentences with long ones.");
  add("");

  const preferred = listOf(state.preferred);
  const forbidden = listOf(state.forbidden);
  if (preferred.length || forbidden.length) {
    add("## Vocabulary", "");
    if (preferred.length) add(`- **Prefer:** ${preferred.join(", ")}`);
    if (forbidden.length) add(`- **Never use:** ${forbidden.join(", ")}`);
    add("");
  }

  add("## Tone by situation", "");
  add("The voice stays, the tone shifts. The shifts below are added to the temperament.", "");
  for (const s of SITUATIONS) {
    const shifts = Object.entries(s.shift);
    const levels = effectiveLevels({ ...state, applyShift: true }, s.id);
    const text = shifts.length
      ? shifts.map(([id, d]) => `${AXES.find((a) => a.id === id).name.toLowerCase()} ${d > 0 ? "+" : "−"}${Math.abs(d)} (becomes ${levels[id]})`).join(", ")
      : "no shift, base voice";
    add(`- **${s.name}:** ${text}.`);
  }
  add("");

  add("## Writing in Portuguese", "");
  const ptSpeaker = { we: "\"nós\", usually with the subject dropped (\"lançamos\")", i: "\"eu\", usually with the subject dropped (\"lancei\")", brand: `the brand name with its article ("${state.article === "none" ? name : `${state.article} ${name}`} lançou")` }[state.speaker];
  const ptAddress = { you: "\"você\"", youPlural: "\"vocês\"", formal: "\"o(a) senhor(a)\"", impersonal: "impersonal constructions (\"é possível\", \"está disponível\")" }[state.address];
  add(`- **Who speaks:** ${ptSpeaker}.`);
  add(`- **Who it talks to:** ${ptAddress}.`);
  add(`- **Colloquial forms** ("pra", "a gente", "tá"): ${state.axes.formality >= 4 ? "allowed" : "don't use"}.`, "");

  add("## Writing in English", "");
  const enSpeaker = { we: "\"we\"", i: "\"I\"", brand: `the brand name without an article ("${name} launched")` }[state.speaker];
  const enAddress = {
    you: "\"you\".",
    youPlural: "\"you\", with group greetings (\"Hi everyone\").",
    formal: "\"you\" in a formal register, since English has no \"o senhor\": no contractions, \"Dear\" in greetings, \"please\" in requests.",
    impersonal: "impersonal constructions and the passive voice (\"the report is available\").",
  }[state.address];
  add(`- **Who speaks:** ${enSpeaker}.`);
  add(`- **Who it talks to:** ${enAddress}`);
  add(`- **Contractions** ("we're", "you'll"): ${state.axes.formality >= 4 ? "use them" : "don't use them"}.`, "");

  add("## Examples", "");
  add("Drafts built by the creator. Review, fix and approve them before use: only approved text should serve as an example.", "");
  for (const [lang, label] of [["en", "English"], ["pt", "Portuguese"]]) {
    for (const s of SITUATIONS) {
      add(`<example language="${label}" situation="${s.name}" context="${s.summary}">`, composeText({ ...state, applyShift: true }, s.id, lang), "</example>", "");
    }
  }

  return lines.join("\n");
}
