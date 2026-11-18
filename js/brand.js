// What the sliders can't say: what the brand does and for whom, what it
// believes, how it opens and closes a text, what it never does, the word pairs
// it uses, and its own situations. Each field is capped so the link to the
// voice stays short enough to share, with everything in it.

import { AXES, SITUATIONS } from "./data.js";
import { oneLine } from "./examples.js";
import { listOf } from "./meter.js";

// Longest text each field takes. Lists are one item per line.
export const LIMITS = { business: 300, reader: 200, beliefs: 500, opening: 200, closing: 200, never: 600, pairs: 400 };
export const BRAND_FIELDS = Object.keys(LIMITS);
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

// ---------- Habits found by the diagnosis ----------

// Each kind of habit the diagnosis extracts, with the brand field it feeds.
// Signature moves have no field yet, so they are shown and not applied.
export const HABIT_FIELDS = { openings: "opening", closings: "closing", words: "preferred", pairs: "pairs", never: "never", moves: null };
export const HABIT_LABELS = { openings: "Opening", closings: "Closing", words: "Word", pairs: "Says", never: "Never", moves: "Move" };
const MAX_HABITS = 6; // per kind

// The diagnosis's habits as one flat list, cleaned: { kind, field, habit,
// evidence, texts, say?, not? }. "texts" keeps the numbers of the texts
// (1 to count) the habit was seen in, so the list can say which rest on one text.
export function habitList(habits, count) {
  if (!habits || typeof habits !== "object") return [];
  const out = [];
  for (const [kind, field] of Object.entries(HABIT_FIELDS)) {
    const items = Array.isArray(habits[kind]) ? habits[kind] : [];
    for (const raw of items.slice(0, MAX_HABITS)) {
      if (!raw || typeof raw !== "object") continue;
      const say = oneLine(raw.say).slice(0, 60);
      const not = oneLine(raw.not).slice(0, 60);
      // a "never" line is stored without the "never" the field's label already says
      const habit = kind === "pairs" ? (say && not ? `${say}, not ${not}` : "") : kind === "never" ? neverOf(oneLine(raw.habit))[0] || "" : oneLine(raw.habit).slice(0, 120);
      if (!habit) continue;
      const texts = [...new Set((Array.isArray(raw.texts) ? raw.texts : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= count))].sort((a, b) => a - b);
      out.push({ kind, field, habit, evidence: oneLine(raw.evidence), texts, ...(kind === "pairs" && { say, not }) });
    }
  }
  return out;
}

// The brand fields with the picked habits added, as new values for the fields
// that change (the caller merges them into the state). Nothing is replaced:
// a one-line field gets the habit after what is there, a list gets new lines,
// and a habit already in the field is skipped. Each field keeps its limit.
export function applyHabits(state, picked) {
  const fields = {};
  const current = (f) => (f in fields ? fields[f] : String(state[f] ?? ""));
  const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
  for (const h of picked) {
    const f = h.field;
    if (!f) continue;
    const value = current(f);
    let next;
    if (f === "opening" || f === "closing") {
      if (same(value, h.habit) || value.toLowerCase().includes(h.habit.toLowerCase())) continue;
      next = value.trim() ? `${value.trim().replace(/[.;]\s*$/, "")}; ${h.habit}` : h.habit;
    } else if (f === "never") {
      if (neverOf(value).some((l) => same(l, h.habit))) continue;
      next = value.trim() ? `${value.trimEnd()}\n${h.habit}` : h.habit;
    } else if (f === "pairs") {
      if (pairsOf(value).some((p) => same(p.say, h.say) && same(p.not, h.not))) continue;
      next = value.trim() ? `${value.trimEnd()}\n${h.habit}` : h.habit;
    } else if (f === "preferred") {
      if (listOf(value).some((w) => same(w, h.habit))) continue;
      next = value.trim() ? `${value.trim().replace(/,\s*$/, "")}, ${h.habit}` : h.habit;
    } else continue;
    fields[f] = f in LIMITS ? next.slice(0, LIMITS[f]) : next;
  }
  return fields;
}
