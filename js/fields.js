// What the sliders can't say: what the writing is about, who reads it, what
// the writer believes, how a text opens and closes, what it never does, the
// word pairs it uses, and the writer's own situations. Each field is capped so
// the link to the voice stays short enough to share, with everything in it.

import { AXES, SITUATIONS } from "./data.js";
import { oneLine } from "./examples.js";

// Longest text each field takes. Lists are one item per line.
export const LIMITS = { about: 300, reader: 200, beliefs: 500, opening: 200, closing: 200, never: 600, pairs: 400 };
export const ABOUT_FIELDS = Object.keys(LIMITS);
// How many items a list takes into the guide, and how long each may be.
export const MAX = { beliefs: 4, never: 6, pairs: 8, situations: 6 };
const LINE = 120;

export const linesOf = (text, max, length = LINE) =>
  String(text ?? "").split("\n").map((l) => l.replace(/\s+/g, " ").trim().slice(0, length)).filter(Boolean).slice(0, max);

export const beliefsOf = (text) => linesOf(text, MAX.beliefs);
// "we never ..." is the field's label, so a line may repeat it: "never X" and "X" are the same.
export const neverOf = (text) => linesOf(text, MAX.never).map((l) => l.replace(/^(?:we\s+)?never\s+/i, "")).filter(Boolean);

// "customers, not users" is the word to use and the one to avoid.
const PAIR = /^(.+?)\s*(?:,\s*not\s+|→|->)\s*(.+)$/i;
const pairLines = (text) => linesOf(text, MAX.pairs, 60);
export const pairsOf = (text) => pairLines(text).map((l) => l.match(PAIR)).filter(Boolean).map((m) => ({ say: m[1], not: m[2] }));
export const ignoredPairs = (text) => pairLines(text).length - pairsOf(text).length;

export const newSituationId = () => `custom-${Math.random().toString(36).slice(2, 8)}`;
export const MAX_SHIFT = 2;

// Cleans own situations from storage, a link or a settings file.
export function normalizeSituations(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list.filter((s) => s && typeof s === "object").slice(0, MAX.situations).map((s) => {
    const id = typeof s.id === "string" && /^custom-[\w-]{1,20}$/.test(s.id) && !seen.has(s.id) ? s.id : newSituationId();
    seen.add(id);
    const shift = {};
    for (const a of AXES) {
      const d = Math.round(Number(s.shift?.[a.id]));
      if (Number.isFinite(d) && d) shift[a.id] = Math.min(MAX_SHIFT, Math.max(-MAX_SHIFT, d));
    }
    return { id, name: oneLine(s.name).slice(0, 40), when: oneLine(s.when).slice(0, 120), shift };
  });
}

export const normalizeHidden = (list) => (Array.isArray(list) ? SITUATIONS.filter((s) => list.includes(s.id)).map((s) => s.id) : []);
