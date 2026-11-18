// The brand's approved texts. When there are any, they are the guide's
// examples. Each one is { text, situation, lang, source, note? }; the situation
// is the id of a situation (built-in or the brand's own), "general", or a label the user typed. The
// texts the user turned down are kept the same way, with a reason instead of a
// note, as { text, reason, situation, lang, source }.

import { SITUATIONS } from "./data.js";

export const LANGUAGES = { en: "English", pt: "Portuguese" };
export const SOURCES = { pasted: "Pasted by you", chat: "Brought from your AI chat", ai: "Written by your AI, approved by you", diagnosed: "Pasted for a diagnosis" };
// Texts saved when the site called Claude itself are the same as texts from any AI.
const sourceOf = (s) => (s === "claude" ? "ai" : Object.hasOwn(SOURCES, s) ? s : "pasted");

export function situationName(tag, situations = SITUATIONS) {
  if (tag === "general") return "General";
  return situations.find((s) => s.id === tag)?.name || tag;
}

// What the user typed back to a tag: a situation's name becomes its id. The id
// of an own situation that no longer exists falls back to "general".
export function situationTag(label, situations = SITUATIONS) {
  const t = String(label ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!t || t.toLowerCase() === "general") return "general";
  const found = situations.find((s) => s.id === t || s.name.toLowerCase() === t.toLowerCase())?.id;
  return found || (t.startsWith("custom-") ? "general" : t);
}

// Portuguese or English, by counting short words that only one of them uses.
const PT_WORDS = /(?<!\p{L})(?:não|você|vocês|que|para|pra|com|uma|os|dos|das|na|nas|é|são|está|mais|seu|sua|nós|nosso|nossa|também|já|por|mas)(?!\p{L})/giu;
const EN_WORDS = /(?<!\p{L})(?:the|and|you|your|we|our|is|are|to|of|for|with|this|that|it|will|be|not|can|but)(?!\p{L})/giu;
export function guessLang(text) {
  const pt = (text.match(PT_WORDS) || []).length;
  const en = (text.match(EN_WORDS) || []).length;
  return pt > en ? "pt" : "en";
}

// Cleans examples from storage or a settings file; drops anything unusable.
export function normalizeExamples(list, situations) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.text === "string" && e.text.trim())
    .map((e) => ({
      text: e.text,
      situation: situationTag(e.situation, situations),
      lang: Object.hasOwn(LANGUAGES, e.lang) ? e.lang : guessLang(e.text),
      source: sourceOf(e.source),
      ...(oneLine(e.note) && { note: oneLine(e.note) }),
    }));
}

// A short free note or reason: one line, as the guide puts it in an attribute.
export const oneLine = (v) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 200) : "");

// Cleans rejected texts the same way; the reason may be empty (the guide skips those).
// They only come from texts an AI wrote, so the source is always "ai".
export function normalizeRejected(list, situations) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.text === "string" && e.text.trim())
    .map((e) => ({
      text: e.text,
      reason: oneLine(e.reason),
      situation: situationTag(e.situation, situations),
      lang: Object.hasOwn(LANGUAGES, e.lang) ? e.lang : guessLang(e.text),
      source: "ai",
    }));
}
