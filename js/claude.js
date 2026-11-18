// Optional features that use Claude with the visitor's own API key.
// Requests go straight from the browser to Anthropic; the SDK only loads
// when someone uses one of these features.

import { FOUNDATION, AXES, FINISH } from "./data.js";

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

export function write(apiKey, guide, situation) {
  return ask(apiKey, {
    output_config: { effort: "low" },
    system: guide,
    messages: [
      {
        role: "user",
        content: `Write the text for this situation, following the voice guide.\n\nSituation: ${situation.name}. ${situation.summary}.\n\nReply with the text only, with no comment before or after it.`,
      },
    ],
  });
}

const ids = (group) => group.options.map((o) => o.id);

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

export async function diagnose(apiKey, texts) {
  const samples = texts.map((t, i) => `<text number="${i + 1}">\n${t}\n</text>`).join("\n\n");
  const json = await ask(apiKey, {
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SCHEMA },
    },
    system: `You analyze the brand voice of texts, which may be in English or Portuguese. Place the voice the texts share on the ruler below. Describe what is in the texts, not what would be ideal. When the texts disagree, pick the most frequent position and say so in the note.\n\n<ruler>\n${ruler()}\n</ruler>\n\nIn "reasons", quote a short excerpt from the texts as evidence, one sentence per axis. In "adjectives", give three to five adjectives that describe the voice. Write everything in English.`,
    messages: [{ role: "user", content: samples }],
  });
  return JSON.parse(json);
}
