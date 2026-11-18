// What the site gives a person to paste into any AI chat, and llms.txt, the
// page a model can read on the site. The site itself never calls an AI: the
// person copies a request, the chat does the work, and the voice comes back as
// a block of settings (see block.js). Everything here is built from data.js, so
// the ruler in the request, in llms.txt and under the sliders is the same one.

import { FOUNDATION, AXES, FINISH, SITUATIONS, INITIAL_STATE } from "./data.js";
import { LIMITS, MAX, MAX_SHIFT } from "./brand.js";
import { effectiveAddress } from "./compose.js";
import { buildGuide } from "./guide.js";
import { MARKER, voiceBlock } from "./block.js";

export const SITE_URL = "https://feruiz.github.io/brand-voice-creator/";
export const LLMS_FILE = "llms.txt";
// The language the conversation is held in.
export const CHAT_LANGUAGES = { en: "English", pt: "Brazilian Portuguese" };
// Where the site takes the block back, as its buttons name it.
const WHERE_TO_PASTE = "\"Use your AI chat\", step 2";

// An id with its title, when the title says more than the id: "address (who it talks to)".
const titled = (id, group) => (group.title.toLowerCase() === id.toLowerCase() ? id : `${id} (${group.title.toLowerCase()})`);
const json = (value) => ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
const signed = (d) => (d > 0 ? `+${d}` : String(d));

// ---------- The ruler ----------

// The foundation, the seven axes and the finish, with the id of every option.
// With examples, each level of each axis also gets its sentence in English and
// Portuguese, all about the same fictional message so the levels compare.
export function ruler({ examples = false } = {}) {
  const lines = [];
  const add = (...l) => lines.push(...l);
  add("### Foundation", "", "One option in each.", "");
  for (const [id, group] of Object.entries(FOUNDATION)) {
    add(`${titled(id, group)}:`);
    for (const o of group.options) add(`- "${o.id}": ${o.guide.replace("{brand}", "Lumen")}`);
    add("");
  }
  add("### Temperament", "", "Seven axes, each from 1 to 5. 3 is the middle; 1 and 5 are the poles.", "");
  if (examples) add("Every example sentence says the same thing, the launch of a monthly finance report from a fictional company, so the levels can be compared. They show the levels; they say nothing about any brand.", "");
  for (const axis of AXES) {
    add(`${axis.id} (1 = ${axis.left}, 5 = ${axis.right}):`);
    axis.levels.forEach((level, i) => {
      add(`${i + 1}. ${level.rule}`);
      if (examples) add(`   - en: "${level.en}"`, `   - pt: "${level.pt}"`);
    });
    add("");
  }
  add("### Finish", "", "One option in each.", "");
  for (const [id, group] of Object.entries(FINISH)) {
    add(`${titled(id, group)}:`);
    for (const o of group.options) add(`- "${o.id}": ${o.guide}`);
    add("");
  }
  add("### Situations", "");
  add(`The voice stays and the tone shifts with the situation: a shift moves an axis up or down from the base level, staying within 1 to 5. The built-in situations:`, "");
  for (const s of SITUATIONS) {
    const shifts = Object.entries(s.shift).map(([axis, d]) => `${axis} ${signed(d)}`);
    const one = effectiveAddress({ address: "youPlural" }, s.id) === "you";
    add(`- "${s.id}", ${s.name} (${s.when}): ${shifts.length ? shifts.join(", ") : "no shift"}${one ? "; written to one person, so never \"you all\"" : ""}.`);
  }
  add("", `A brand can switch off the built-in situations it never writes for, and add up to ${MAX.situations} of its own, each with a name, when it applies and a shift from -${MAX_SHIFT} to +${MAX_SHIFT} on any axis.`);
  return lines.join("\n");
}

// ---------- The block ----------

// The keys of the block, said once for the request and for llms.txt.
export function blockFormat() {
  const forbidden = INITIAL_STATE.forbidden;
  return [
    `One JSON code block: valid JSON, with double quotes, no comments and no trailing commas. Any key may be left out, and a field may be "" or [] when nothing supports it; an empty field is better than an invented one. Choices use the ids in quotes in the ruler.`,
    "",
    `- "${MARKER}": 1. Always the first key: it is how the site finds the block.`,
    `- "brand": the brand's name.`,
    `- "article": the article Portuguese puts before the name: "a", "o" or "none".`,
    `- "essence": the voice in one sentence.`,
    `- "business": what the brand does, and for whom. Up to ${LIMITS.business} characters.`,
    `- "reader": who reads its texts. Up to ${LIMITS.reader} characters.`,
    `- "beliefs": up to ${MAX.beliefs} short beliefs the voice comes from, as a list of strings.`,
    `- "opening": how a text opens, as something a draft can be checked against ("with the news itself, no greeting"). Up to ${LIMITS.opening} characters.`,
    `- "closing": how a text closes, the same way. Up to ${LIMITS.closing} characters.`,
    `- "never": up to ${MAX.never} things the brand's texts never do, each one completing "never …" ("uses an exclamation mark"), as a list of strings.`,
    `- "pairs": up to ${MAX.pairs} words the brand uses where others use another, each written as "word to use, not word to avoid" ("neighbors, not customers"), as a list of strings.`,
    `- "preferred": words and expressions the brand reaches for, as a list of strings.`,
    `- "forbidden": words the brand never uses, as a list of strings. Keep the ones already there, common tics of AI-written text (${forbidden}), and add the brand's own.`,
    `- "speaker", "address", "role": one id each, from the foundation.`,
    `- "axes": each of the seven axis ids with its level, from 1 to 5.`,
    `- "sentenceLength", "exclamation", "emoji": one id each, from the finish.`,
    `- "hiddenSituations": the ids of the built-in situations the brand never writes for, as a list.`,
    `- "customSituations": the brand's own situations, up to ${MAX.situations}, each an object with "name", "when" (when it applies) and "shift" (axis ids with a step from -${MAX_SHIFT} to +${MAX_SHIFT}; leave out the axes that don't move).`,
    `- "examples": the brand's real texts that came up in the conversation, each an object with "text", "situation" (the name of a situation, or "General") and "language" ("en" or "pt"). Only texts the brand published or approved; a text written in the conversation goes in only when the person approves it as the brand's.`,
    `- "reasons": each axis id with one short sentence quoting the excerpt that placed it at that level.`,
    "",
    "The brand's own fields (essence, business, reader, beliefs, opening, closing, never, pairs, preferred and the situations) are written in the language the brand writes in. The site merges the block into what it has: a key left out keeps its value there, and the examples are added to the ones already there.",
  ].join("\n");
}

// ---------- The request that starts a conversation ----------

// Whether the site holds anything of the person's own: a voice moved from the
// initial one, or texts.
export function hasStartingPoint(state) {
  const voice = ({ examples, rejected, ...rest }) => JSON.stringify(rest);
  return voice(voiceBlock(state)) !== voice(voiceBlock(INITIAL_STATE)) || state.examples.length > 0 || state.rejected.length > 0;
}

// The request a person pastes into a new conversation, in any chat. It works on
// its own; llms.txt only adds the example sentences, for a chat that can read
// the web. With fromHere, it carries what the site already holds.
export function startPrompt(state, { lang = "en", fromHere = false } = {}) {
  const lines = [
    `I want to build my brand's voice with you, using Brand Voice Creator (${SITE_URL}), a free site that turns a brand's voice into a guide an AI can write with. You'll talk with me, read real texts from the brand and place the voice on the site's ruler, below. At the end you'll give me a block of settings that I paste into the site, where I fine-tune it and export the guide.`,
    "",
    `Talk with me in ${CHAT_LANGUAGES[lang]}, in plain words, and keep each message short.`,
    "",
    `If you can open web pages, read ${SITE_URL}${LLMS_FILE}: it has the same ruler with an example sentence for every level, which helps tell neighbouring levels apart. If you can't, everything you need is here.`,
    "",
    "## How to go about it",
    "",
    `1. ${fromHere ? "Start from the starting point at the end: it's what I already set in the site. Confirm it with me instead of asking everything again, and change only what my texts or answers support. Then ask" : "Ask"} me for real texts from the brand${fromHere && state.examples.length ? ", beyond the ones already there" : ""}: two to five, ideally of different kinds (a post, an email, a reply to a customer, a page of the site). They are the best evidence of a voice. If I have none, say the result will rest on my answers alone, and carry on.`,
    "2. Ask what the texts can't show, two or three questions at a time: what the brand does and for whom, who reads its texts, what it believes, what it would never do or say, the situations it writes for. Skip what the texts already answer.",
    "3. Place the voice on the ruler. Describe what the texts do, not what would be ideal. When they disagree, go with what most of them do, and tell me.",
    "4. Look for what makes this voice its own beyond the ruler: how the texts open and close, the words they reach for, words used where others use another (\"neighbors\", not \"customers\"), and what they consistently avoid that texts of this kind usually do. Report only what you can point to in the texts, each as something a draft can be checked against (\"opens with the news, no greeting\"), never as a quality (\"a warm opening\"). When the evidence is thin, leave it out: a habit the texts don't show is worse than none.",
    "5. Show me the proposal in plain words: each level with a short excerpt as evidence, then the habits. Ask what I'd change. Offer to write a short text for a real occasion of mine in this voice, so I can hear it before I settle.",
    `6. When I confirm, give me the block described under "The block". Then tell me, in one line, to paste it into the site under ${WHERE_TO_PASTE}.`,
    "",
    "Whenever we change anything after that, give me the whole block again.",
    "",
    "## The ruler",
    "",
    ruler(),
    "",
    "## The block",
    "",
    blockFormat(),
  ];
  if (fromHere) {
    lines.push(
      "",
      "## Starting point",
      "",
      `What I already set in the site, in the same format.${state.examples.length ? " Its examples are real texts of the brand." : ""}${state.rejected.length ? " Its rejected texts are texts I turned down, each with the reason: avoid the pattern the reason names." : ""}`,
      "",
      json(voiceBlock(state)),
    );
  }
  return lines.join("\n");
}

// What a person pastes into the same conversation after changing the voice in the site.
export function continueMessage(state) {
  return [
    "I adjusted the voice in Brand Voice Creator. This is how it stands now: carry on from it, and when we change anything, give me the whole block again in the same format.",
    "",
    json(voiceBlock(state)),
  ].join("\n");
}

// ---------- The request for one text ----------

// The guide and a request for the text of one situation, for the preview: the
// person pastes it into a chat and brings the text back. With the brand's
// business in the guide, the text is about that business; without it, a
// built-in situation comes with its fictional case, so the text has a subject.
export function writeRequest(state, lang, situation) {
  const topic = state.business.trim()
    ? "Write about the brand's real business, as the guide describes it: pick an occasion that fits the situation, and put any specific the guide doesn't give (a price, a date, a number) in [brackets]."
    : situation.summary ? `${situation.summary}.` : "Pick an occasion that fits the situation.";
  return [
    "The voice guide below is your instructions for one text.",
    "",
    "<voice-guide>",
    buildGuide(state, lang),
    "</voice-guide>",
    "",
    `Write the text for this situation, following the voice guide. Situation: ${situation.name}${situation.when ? ` (${situation.when})` : ""}. ${topic}`,
    "",
    "Reply with the text only, with no comment before or after it.",
  ].join("\n");
}

// ---------- llms.txt ----------

// The page for models: what the site is, the full ruler and the block. Written
// as reference, not as instructions: the person's own request carries those.
export function llmsText() {
  return [
    "# Brand Voice Creator",
    "",
    "> A free site that turns a brand's voice into a guide an AI can write with. This page is the reference for an AI helping someone build a voice in a chat: the ruler the site uses, with an example sentence for every level, and the block of settings the site reads back.",
    "",
    `Site: ${SITE_URL}`,
    "",
    "## How the site and a chat work together",
    "",
    "The site never calls an AI. The person copies a request from the site into any chat. In the conversation, the AI reads real texts from the brand, asks what the texts can't show, and places the voice on the ruler below. The conversation ends with the block, which the person pastes back into the site. There the voice shows up on sliders, with a sample text and checks of the verifiable rules, and the person fine-tunes it and exports the guide.",
    "",
    "A voice has a foundation (who speaks, who it talks to, the role), seven temperament axes, a finish (sentence length, exclamation marks, emoji), the brand's own fields (what it does, who reads it, what it believes, how a text opens and closes, what it never does, its word pairs and words), its situations and its approved texts.",
    "",
    "## The ruler",
    "",
    ruler({ examples: true }),
    "",
    "## The block",
    "",
    blockFormat(),
    "",
    "## What the site makes from it",
    "",
    "- A voice guide in Markdown, written for a model: the brand first, the traits that define the voice with a \"this, not that\" pair each, the verifiable rules, the tone by situation, and the approved texts as examples.",
    "- A checker script (Node 18 or newer, no dependencies) that runs the same verifiable rules on a draft.",
    "- A skill package with the guide and the checker, for agents that support skills.",
    "",
  ].join("\n");
}
