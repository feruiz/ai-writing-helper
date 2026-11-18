// The state: whatever comes in (storage, a link, a settings file, a block from
// an AI chat) is cleaned into a full, valid voice here, and the link carries it.

import { FOUNDATION, AXES, FINISH, INITIAL_STATE, allSituations, activeSituations } from "./data.js";
import { ABOUT_FIELDS, LIMITS, normalizeSituations, normalizeHidden } from "./fields.js";
import { normalizeExamples, normalizeRejected } from "./examples.js";

export const clone = (o) => JSON.parse(JSON.stringify(o));

export function encode(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export function decode(text) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

// ---------- From Brand Voice Creator ----------

// The site was about a brand's voice before it was about anyone's. Settings
// saved then (in the browser, a link, a file or a block) use the old names;
// they are read as the new ones.
const RENAMED_KEYS = { brand: "name", business: "about" };
const RENAMED_SITUATIONS = {
  launch: "goodNews",
  outage: "badNews", "service outage": "badNews",
  question: "reply", "customer question": "reply",
};
// A situation tag, by its old id or its old name.
export const renamedSituation = (v) => (typeof v === "string" ? RENAMED_SITUATIONS[v.trim().toLowerCase()] || v : v);

export function migrate(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const s = { ...raw };
  for (const [old, now] of Object.entries(RENAMED_KEYS)) {
    if (!(old in s)) continue;
    if (!(now in s)) s[now] = s[old];
    delete s[old];
  }
  if (typeof s.speaker === "string" && s.speaker.trim().toLowerCase() === "brand") s.speaker = "byName";
  if ("situation" in s) s.situation = renamedSituation(s.situation);
  if (Array.isArray(s.hiddenSituations)) s.hiddenSituations = s.hiddenSituations.map(renamedSituation);
  for (const k of ["examples", "rejected"]) {
    if (Array.isArray(s[k])) s[k] = s[k].map((e) => (e && typeof e === "object" ? { ...e, situation: renamedSituation(e.situation) } : e));
  }
  return s;
}

// ---------- Cleaning ----------

export function normalize(input) {
  const raw = migrate(input);
  const s = { ...clone(INITIAL_STATE), ...raw, axes: { ...INITIAL_STATE.axes, ...(raw?.axes || {}) } };
  for (const axis of AXES) s.axes[axis.id] = Math.min(5, Math.max(1, Math.round(Number(s.axes[axis.id]) || 3)));
  const valid = (group, v, fallback) => (group.options.some((o) => o.id === v) ? v : fallback);
  s.speaker = valid(FOUNDATION.speaker, s.speaker, "we");
  s.address = valid(FOUNDATION.address, s.address, "you");
  s.role = valid(FOUNDATION.role, s.role, "mentor");
  s.sentenceLength = valid(FINISH.sentenceLength, s.sentenceLength, "medium");
  s.exclamation = valid(FINISH.exclamation, s.exclamation, "one");
  s.emoji = valid(FINISH.emoji, s.emoji, "never");
  if (!["a", "o", "none"].includes(s.article)) s.article = "a";
  for (const k of ["name", "essence", "preferred", "forbidden"]) if (typeof s[k] !== "string") s[k] = INITIAL_STATE[k];
  // Files and links from before these fields existed leave them empty.
  for (const k of ABOUT_FIELDS) s[k] = typeof s[k] === "string" ? s[k].slice(0, LIMITS[k]) : "";
  s.customSituations = normalizeSituations(s.customSituations);
  s.hiddenSituations = normalizeHidden(s.hiddenSituations);
  if (!activeSituations(s).length) s.hiddenSituations = [];
  if (!activeSituations(s).some((x) => x.id === s.situation)) s.situation = activeSituations(s)[0].id;
  s.applyShift = s.applyShift !== false;
  const known = allSituations(s);
  s.examples = normalizeExamples(s.examples, known);
  s.rejected = normalizeRejected(s.rejected, known);
  return s;
}

// The link carries the voice, not the approved or rejected texts: a URL with a
// few full texts in it gets too long to share. The settings file carries them.
export const linkState = ({ examples, rejected, ...rest }) => rest;
