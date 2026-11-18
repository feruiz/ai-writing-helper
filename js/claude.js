// Optional features that use Claude with the visitor's own API key.
// Requests go straight from the browser to Anthropic; the SDK only loads
// when someone uses one of these features.

import { FOUNDATION, AXES, FINISH } from "./data.js";
import { HABIT_FIELDS } from "./brand.js";

const SDK = "https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.4.0/+esm";
const MODEL = "claude-opus-5-5";

async function client(apiKey) {
  const { default: Anthropic } = await import(SDK);
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

async function ask(apiKey, body) {
  const c = await client(apiKey);
  const response = await c.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // If a request is declined by mistake, Anthropic retries it on another model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    ...body,
  });
  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined this request. Try rewording the text.");
  }
  return response.content.filter((b) => b.type === "text").map((b) => b.text).join("").trim();
}

export function errorMessage(error) {
  const status = error?.status;
  if (status === 401) return "Invalid API key. Check the key and try again.";
  if (status === 429) return "Rate limit reached. Wait a moment and try again.";
  if (status >= 500) return "Anthropic's API is having trouble right now. Try again in a few minutes.";
  if (error instanceof TypeError) return "Couldn't reach Anthropic. Check your connection.";
  return error?.message || "Something went wrong calling Claude.";
}

function writeText(apiKey, guide, request) {
  return ask(apiKey, {
    output_config: { effort: "low" },
    system: guide,
    messages: [{ role: "user", content: `${request}\n\nReply with the text only, with no comment before or after it.` }],
  });
}

// The preview: one situation. With the brand's business in the guide, the text
// is about that business; without it, a built-in situation comes with its
// fictional case (a monthly finance report), so the text has something to be about.
export function write(apiKey, guide, situation, hasBusiness) {
  const topic = hasBusiness
    ? "Write about the brand's real business, as the guide describes it: pick an occasion that fits the situation, and put any specific the guide doesn't give (a price, a date, a number) in [brackets]."
    : situation.summary ? `${situation.summary}.` : "Pick an occasion that fits the situation.";
  return writeText(apiKey, guide, `Write the text for this situation, following the voice guide.\n\nSituation: ${situation.name}${situation.when ? ` (${situation.when})` : ""}. ${topic}`);
}

// The guide test: a request the user wrote, which says what the text is about
// (the guide already tells the model what the brand does). The situation, when
// there is one, is a known one with what it covers, or a label of the user's own.
export function writeBrief(apiKey, guide, brief, situation) {
  return writeText(apiKey, guide, `Write the text this request asks for, following the voice guide.\n\n<request>\n${brief}\n</request>${situation ? `\n\nSituation: ${situation}.` : ""}`);
}

const ids = (group) => group.options.map((o) => o.id);

// One habit the texts show: the habit itself, an excerpt copied from a text as
// evidence, and the numbers of the texts it was seen in. A word pair has the
// brand's word and the usual one instead of a habit.
const list = (item) => ({ type: "array", items: item });
const HABIT = {
  type: "object",
  properties: { habit: { type: "string" }, evidence: { type: "string" }, texts: list({ type: "integer" }) },
  required: ["habit", "evidence", "texts"],
  additionalProperties: false,
};
const PAIR = {
  type: "object",
  properties: { say: { type: "string" }, not: { type: "string" }, evidence: { type: "string" }, texts: list({ type: "integer" }) },
  required: ["say", "not", "evidence", "texts"],
  additionalProperties: false,
};
const HABIT_KINDS = Object.keys(HABIT_FIELDS);
const HABITS = {
  type: "object",
  properties: Object.fromEntries(HABIT_KINDS.map((k) => [k, list(k === "pairs" ? PAIR : HABIT)])),
  required: HABIT_KINDS,
  additionalProperties: false,
};

const SCHEMA = {
  type: "object",
  properties: {
    speaker: { type: "string", enum: ids(FOUNDATION.speaker) },
    address: { type: "string", enum: ids(FOUNDATION.address) },
    role: { type: "string", enum: ids(FOUNDATION.role) },
    axes: {
      type: "object",
      properties: Object.fromEntries(AXES.map((a) => [a.id, { type: "integer", enum: [1, 2, 3, 4, 5] }])),
      required: AXES.map((a) => a.id),
      additionalProperties: false,
    },
    sentenceLength: { type: "string", enum: ids(FINISH.sentenceLength) },
    exclamation: { type: "string", enum: ids(FINISH.exclamation) },
    emoji: { type: "string", enum: ids(FINISH.emoji) },
    reasons: {
      type: "object",
      properties: Object.fromEntries(AXES.map((a) => [a.id, { type: "string" }])),
      required: AXES.map((a) => a.id),
      additionalProperties: false,
    },
    adjectives: { type: "array", items: { type: "string" } },
    note: { type: "string" },
  },
  required: ["speaker", "address", "role", "axes", "sentenceLength", "exclamation", "emoji", "reasons", "adjectives", "note"],
  additionalProperties: false,
};
// Structured output wants every field required, so the habits are a second
// schema rather than an optional field: the blind reading in the guide test
// uses the plain one and doesn't pay for them.
const SCHEMA_WITH_HABITS = {
  ...SCHEMA,
  properties: { ...SCHEMA.properties, habits: HABITS },
  required: [...SCHEMA.required, "habits"],
};

function ruler() {
  const foundation = Object.values(FOUNDATION)
    .map((g) => `${g.title}: ${g.options.map((o) => `${o.id} (${o.guide})`).join("; ")}`)
    .join("\n");
  const axes = AXES.map((a) => `${a.id} (1 = ${a.left}, 5 = ${a.right}):\n${a.levels.map((l, i) => `  ${i + 1}. ${l.rule}`).join("\n")}`).join("\n\n");
  const finish = Object.entries(FINISH)
    .map(([id, g]) => `${id}: ${g.options.map((o) => `${o.id} (${o.guide})`).join("; ")}`)
    .join("\n");
  return `${foundation}\n\n${axes}\n\n${finish}`;
}

// The sliders give every brand the same seven numbers; what makes a voice
// recognisable is in its habits. This asks for them as checkable rules with
// an excerpt as proof, in the texts' own language, and nothing the texts
// don't show. Each list says which brand field it feeds.
const HABITS_PROMPT = `The ruler places the voice on seven scales that every brand shares. What makes this voice recognisable is what these texts do in particular, and that goes in "habits": specific, checkable habits that another writer could copy and a reader could check a draft against.

<habits>
Report only what you can point to in the texts. For each habit, "evidence" is an excerpt copied exactly from one of the texts, the shortest that shows the habit, and "texts" is the list of the numbers of the texts that show it. Prefer habits that appear in more than one text. A habit seen in one text only is worth reporting when it is distinctive; list that one text number, so the reader knows it rests on a single text. When there is only one text, every habit rests on it.

When the evidence is thin, leave the list empty. An empty list is a correct answer; a habit the texts don't show is a wrong one. Don't infer a habit from what a brand like this would probably do.

State each habit as something that can be checked, not as a quality. "Opens with the news itself, no greeting" can be checked; "warm, inviting opening" cannot. Name the actual words, punctuation marks or pattern.

- "openings": how the texts begin. The shape of the first sentence: a greeting or none, a question, the news first, the reader's name, a date.
- "closings": how the texts end. A sign-off, a first name, a next step, a question, an invitation, or nothing after the last fact.
- "words": words and expressions the brand reaches for again and again, that another brand would not. Each "habit" is the word or expression itself, as written in the texts. Leave out common function words.
- "pairs": a word the brand uses where most texts of this kind use another one. "say" is the brand's word, "not" is the usual word it replaces, such as "neighbors" where others say "customers". Include a pair only when the texts show the brand's word; give the usual word only when the texts show the brand avoiding it or when the replacement is unmistakable.
- "moves": signature moves in punctuation, formatting and sentence construction: a colon before the key fact, one-sentence paragraphs, sentences without a verb, a list where others would write prose, a question answered in the next sentence, a structure repeated across texts.
- "never": things the texts consistently avoid that most texts of this kind do: an exclamation mark, a question, a greeting, naming a competitor, a discount. Phrase each one as what completes "never ...", for example "uses an exclamation mark", not as a full sentence. Only when all the texts show the absence and the occasion would normally call for it.
</habits>

Write the habits (every "habit", "say", "not" and "evidence") in the language the texts are written in; when they mix languages, use the language most of them are in. Write everything else in English.`;

export async function diagnose(apiKey, texts, { habits = true } = {}) {
  const samples = texts.map((t, i) => `<text number="${i + 1}">\n${t}\n</text>`).join("\n\n");
  const json = await ask(apiKey, {
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: habits ? SCHEMA_WITH_HABITS : SCHEMA },
    },
    system: `You analyze the brand voice of texts, which may be in English or Portuguese. Place the voice the texts share on the ruler below. Describe what is in the texts, not what would be ideal. When the texts disagree, pick the most frequent position and say so in the note.\n\n<ruler>\n${ruler()}\n</ruler>\n\nIn "reasons", quote a short excerpt from the texts as evidence, one sentence per axis. In "adjectives", give three to five adjectives that describe the voice. Write everything in English.${habits ? `\n\n${HABITS_PROMPT}` : ""}`,
    messages: [{ role: "user", content: samples }],
  });
  return JSON.parse(json);
}
