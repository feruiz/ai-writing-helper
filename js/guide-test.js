// The guide test's scoring: an AI writes texts for new requests with the guide
// as its only instructions, then a second, separate reading places the sliders
// from those texts blind, with the ruler but without the guide or the settings.
// This module compares that reading with the settings and runs the meter on
// each text. It makes no calls itself. The site no longer runs the test, since
// it needs two separate AI contexts; it is kept for the voice-building skill.

import { FOUNDATION, AXES, FINISH, allSituations } from "./data.js";
import { effectiveLevels, effectiveAddress } from "./compose.js";
import { measure } from "./meter.js";

export const MAX_BRIEFS = 3;

// How many levels a blind reading may land from the setting and still count as
// carried. One text, read once, can't place a voice more finely than that; the
// ladder's neighbouring levels are close by design.
export const TOLERANCE = 1;

// Calls one test makes: one text per request, then one reading of them all.
export const testCalls = (briefs) => (briefs > 0 ? briefs + 1 : 0);

// What a text for this situation tag should show. A known situation (built-in or the brand's own) moves
// the tone the way the guide tells it to (the guide always spells the shifts
// out, whatever the preview's "Apply shift" box says); "general" or a free label uses the base voice.
export function expectedFor(state, tag) {
  if (!allSituations(state).some((s) => s.id === tag)) return { levels: { ...state.axes }, address: state.address };
  return { levels: effectiveLevels({ ...state, applyShift: true }, tag), address: effectiveAddress(state, tag) };
}

const median = (values) => {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};
const optionOf = (group, id) => group.options.find((o) => o.id === id);
const rank = (group, id) => group.options.findIndex((o) => o.id === id);

// Compares one blind reading of all the texts with what the settings ask for.
// The reading gives one position per axis for the texts together, so what is
// expected is the median of each text's level: with every text in the base
// voice, that's simply the slider. With two texts that disagree, it's the
// range between them ({ lo, hi }).
export function compareReading(state, tags, reading) {
  const expected = tags.map((tag) => expectedFor(state, tag));
  const axes = AXES.map((axis) => {
    const m = median(expected.map((e) => e.levels[axis.id]));
    const lo = Math.floor(m), hi = Math.ceil(m);
    const read = Math.round(Number(reading.axes?.[axis.id]));
    const off = !Number.isFinite(read) ? Infinity : read < lo ? lo - read : read > hi ? read - hi : 0;
    return {
      id: axis.id,
      name: axis.name,
      left: axis.left,
      right: axis.right,
      base: state.axes[axis.id],
      lo,
      hi,
      read: Number.isFinite(read) ? read : null,
      off,
      // a reading below the setting leans to the left pole, above it to the right
      toward: !off ? null : read < lo ? axis.left : axis.right,
      verdict: off === 0 ? "exact" : off <= TOLERANCE ? "close" : "missed",
      reason: String(reading.reasons?.[axis.id] ?? ""),
    };
  });

  // Foundation: who speaks and the role must match; the address may be any the
  // texts' situations call for (a reply to one person never says "you all").
  const addresses = [...new Set(expected.map((e) => e.address))];
  const foundation = Object.entries(FOUNDATION).map(([id, group]) => {
    const allowed = id === "address" ? addresses : [state[id]];
    return {
      id,
      title: group.title,
      set: allowed.map((a) => optionOf(group, a)?.label).join(" or "),
      read: optionOf(group, reading[id])?.label ?? "not given",
      ok: allowed.includes(reading[id]),
    };
  });

  // Finish: the settings are limits ("at most one exclamation mark"), so texts
  // that stay under the limit keep them. Only a reading past the limit misses.
  const finish = Object.entries(FINISH).map(([id, group]) => {
    const read = rank(group, reading[id]);
    return {
      id,
      title: group.title,
      set: optionOf(group, state[id]).label,
      read: optionOf(group, reading[id])?.label ?? "not given",
      ok: read >= 0 && read <= rank(group, state[id]),
    };
  });

  const carried = axes.filter((a) => a.verdict !== "missed").length;
  return {
    axes,
    carried,
    exact: axes.filter((a) => a.verdict === "exact").length,
    total: axes.length,
    foundation,
    finish,
    mismatches: [...foundation, ...finish].filter((f) => !f.ok),
  };
}

// The meter's failed checks for a text written for this situation tag.
export function meterFailures(state, tag, lang, text) {
  const { levels, address } = expectedFor(state, tag);
  return measure(text, { state, lang, levels, address }).filter((row) => !row.ok);
}
