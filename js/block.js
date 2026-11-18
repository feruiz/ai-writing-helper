// The block of settings that goes between the site and an AI chat, both ways.
// voiceBlock() writes the voice as the block a chat gets (the starting point, or
// the voice as it stands). readReply() finds the block the chat gives back in
// whatever was pasted (its last reply or the whole conversation), repairs the
// usual slips of a model writing JSON, and merges it into the voice: what the
// block leaves out keeps its value, and its texts are added to the ones already
// here. Nothing is dropped in silence: every value left out or adjusted comes
// back as a note.

import { FOUNDATION, AXES, FINISH, SITUATIONS, allSituations, activeSituations } from "./data.js";
import { LIMITS, MAX, MAX_SHIFT, newSituationId, ignoredPairs } from "./fields.js";
import { situationName, situationTag, guessLang, oneLine } from "./examples.js";
import { listOf } from "./meter.js";
import { clone, normalize, migrate } from "./state.js";

// The key that tells the site a JSON object is the block; the old one, from
// when the site was Brand Voice Creator, still counts.
export const MARKER = "aiWritingHelper";
const OLD_MARKER = "brandVoiceCreator";
const isMarked = (o) => MARKER in o || OLD_MARKER in o;

// The fields as the site's labels name them, for the notes and the list of changes.
export const FIELD_LABELS = {
  name: "Name",
  article: "Article in Portuguese",
  essence: "Essence",
  about: "What it's about",
  reader: "Who reads it",
  beliefs: "What it believes",
  opening: "How a text opens",
  closing: "How a text closes",
  never: "Never…",
  pairs: "Say X, not Y",
  preferred: "Preferred words",
  forbidden: "Forbidden words",
};
// Longest text each one-line field takes; the other fields' limits come from fields.js.
const TEXT_LIMITS = { name: 40, essence: 300, about: LIMITS.about, reader: LIMITS.reader, opening: LIMITS.opening, closing: LIMITS.closing };
const LINE_LISTS = ["beliefs", "never", "pairs"]; // one item per line
const WORD_LISTS = ["preferred", "forbidden"]; // comma separated
const CHOICES = { ...FOUNDATION, ...FINISH };
// The site's own view settings: a settings file carries them, and they are skipped here.
const VIEW_KEYS = ["situation", "applyShift"];
const KNOWN = new Set([MARKER, OLD_MARKER, ...Object.keys(TEXT_LIMITS), "article", ...LINE_LISTS, ...WORD_LISTS, ...Object.keys(CHOICES), "axes", "customSituations", "hiddenSituations", "examples", "rejected", "reasons", ...VIEW_KEYS]);

const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const linesIn = (text) => String(text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const flat = (s) => s.replace(/\s+/g, " ").trim();
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
// A value as the notes show it: short, on one line.
const shown = (v) => {
  const s = typeof v === "string" ? v : JSON.stringify(v) ?? String(v);
  return flat(s).length > 60 ? `${flat(s).slice(0, 59)}…` : flat(s);
};

// ---------- From the voice to the block ----------

// The voice as the block: the same keys the chat is asked to give back, lists
// as lists and situations by name, so a model reads it the way it writes it.
// The approved and rejected texts go along when there are any.
export function voiceBlock(state) {
  const situations = allSituations(state);
  const text = (e) => ({ text: e.text.trim(), situation: situationName(e.situation, situations), language: e.lang });
  const examples = state.examples.filter((e) => e.text.trim()).map(text);
  const rejected = state.rejected.filter((e) => e.text.trim()).map((e) => ({ ...text(e), reason: e.reason }));
  return {
    [MARKER]: 1,
    name: state.name,
    article: state.article,
    essence: state.essence,
    about: state.about,
    reader: state.reader,
    beliefs: linesIn(state.beliefs),
    opening: state.opening,
    closing: state.closing,
    never: linesIn(state.never),
    pairs: linesIn(state.pairs),
    preferred: listOf(state.preferred),
    forbidden: listOf(state.forbidden),
    speaker: state.speaker,
    address: state.address,
    role: state.role,
    axes: { ...state.axes },
    sentenceLength: state.sentenceLength,
    exclamation: state.exclamation,
    emoji: state.emoji,
    hiddenSituations: [...state.hiddenSituations],
    customSituations: state.customSituations.filter((s) => s.name.trim()).map(({ name, when, shift }) => ({ name, when, shift })),
    ...(examples.length && { examples }),
    ...(rejected.length && { rejected }),
  };
}

// ---------- Finding the block in what was pasted ----------

// Where the object that opens at "start" closes, counting braces outside strings; -1 if it never does.
function closingBrace(text, start) {
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return i;
  }
  return -1;
}

// The slips a model makes writing JSON, fixed outside strings: comments and
// trailing commas. Inside strings, raw line breaks and tabs (a pasted text
// written across lines) become escapes.
function repair(raw) {
  let out = "";
  let inString = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (c === "\\") { out += c + (raw[i + 1] ?? ""); i++; }
      else if (c === '"') { out += c; inString = false; }
      else if (c === "\n") out += "\\n";
      else if (c === "\t") out += "\\t";
      else if (c !== "\r") out += c;
    } else if (c === '"') { out += c; inString = true; }
    else if (c === "/" && raw[i + 1] === "/") { while (i < raw.length && raw[i] !== "\n") i++; out += "\n"; }
    else if (c === "/" && raw[i + 1] === "*") { const end = raw.indexOf("*/", i + 2); i = end < 0 ? raw.length : end + 1; }
    else out += c;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

function parseLoose(raw) {
  for (const attempt of [raw, repair(raw), repair(raw.replace(/[“”]/g, '"'))]) {
    try { return JSON.parse(attempt); } catch {}
  }
  return undefined;
}

// Old keys ("brand", "business") count as the new ones.
const voiceKeys = (o) => Object.keys(migrate(o)).filter((k) => KNOWN.has(k) && k !== MARKER && k !== OLD_MARKER).length;

// The block in the pasted text: the last object marked as the block, or, when
// none is marked, the last one that looks like a voice. The last, because a
// pasted conversation may also carry the starting point the site sent.
export function findBlock(text) {
  const s = String(text ?? "");
  if (!s.trim()) return { error: "Paste the AI's reply first." };
  const objects = [];
  let unreadable = 0;
  let cut = false;
  for (let i = s.indexOf("{"); i !== -1;) {
    const end = closingBrace(s, i);
    if (end === -1) {
      cut ||= s.includes(MARKER, i);
      i = s.indexOf("{", i + 1);
      continue;
    }
    const value = parseLoose(s.slice(i, end + 1));
    if (isObject(value)) objects.push(value);
    else unreadable++;
    i = s.indexOf("{", end + 1);
  }
  const marked = objects.filter(isMarked);
  const found = (marked.length ? marked : objects.filter((o) => voiceKeys(o) >= 2)).at(-1);
  if (found) return { value: found };
  if (cut) return { error: "The block looks cut off: it starts but never closes. Ask the AI to give the whole block again, in one code block." };
  if (unreadable) return { error: "There's something like a block here, but it can't be read as JSON. Ask the AI to give the block again as valid JSON, in one code block." };
  return { error: `No block of settings in what you pasted. Paste the AI's reply that ends with the block (it opens with { "${MARKER}": 1 ), or ask the AI for it.` };
}

// ---------- From the block to the voice ----------

const axisFor = (key) => {
  const k = String(key).trim().toLowerCase();
  return AXES.find((a) => a.id.toLowerCase() === k || a.name.toLowerCase() === k);
};
// The Portuguese words the ruler quotes for an option, and the old id of
// third person, which a model may give instead of the id.
const ALIASES = { we: ["nós"], i: ["eu"], byName: ["brand", "the brand", "third person", "name"], you: ["você"], youPlural: ["vocês"], formal: ["o senhor", "o(a) senhor(a)", "senhor"] };
// An option by its id, its label ("We", "You (você)", or just "You") or its Portuguese word.
const optionFor = (group, v) => {
  if (typeof v !== "string") return undefined;
  const k = v.trim().toLowerCase();
  return group.options.find((o) => [o.id, o.label, o.label.split(" (")[0], ...(ALIASES[o.id] || [])].some((name) => name.toLowerCase() === k));
};
const ids = (list) => list.map((x) => `"${x.id}"`).join(", ");
// A level or a shift: a number, or the first number in a text such as "4 of 5".
const numberOf = (v) => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = typeof v === "string" && v.match(/[-−]?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace("−", "-").replace(",", ".")) : null;
};
// Text from a string, a number, or a list of strings; null when it's none of those.
const asText = (v) => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) return v.join(" ");
  return null;
};
const LANGUAGE_NAMES = {
  en: ["en", "english", "inglês", "ingles"],
  pt: ["pt", "pt-br", "pt_br", "portuguese", "brazilian portuguese", "português", "portugues"],
};
const langOf = (v, text) => {
  const k = String(v ?? "").trim().toLowerCase();
  return Object.keys(LANGUAGE_NAMES).find((id) => LANGUAGE_NAMES[id].includes(k)) || guessLang(text);
};

// The voice with the block merged in: { state, notes, reasons, added }.
// "reasons" are the chat's evidence per axis, when it gave any.
export function readBlock(input, current) {
  // a block from before the rename uses the old names
  const block = migrate(input);
  const next = clone(current);
  const notes = [];
  const note = (s) => notes.push(s);
  const reasons = {};
  const added = { examples: 0, rejected: 0 };

  for (const key of Object.keys(block)) {
    if (!KNOWN.has(key) && !axisFor(key)) note(`Left out "${key}": the site has no setting by that name.`);
  }

  // One-line fields
  for (const [key, limit] of Object.entries(TEXT_LIMITS)) {
    if (!(key in block)) continue;
    const value = asText(block[key]);
    if (value === null) { note(`${FIELD_LABELS[key]}: not text, so it stays as it was.`); continue; }
    next[key] = flat(value);
    if (next[key].length > limit) {
      note(`${FIELD_LABELS[key]}: cut to ${limit} characters, the field's limit.`);
      next[key] = next[key].slice(0, limit).trim();
    }
  }
  if ("article" in block) {
    const a = flat(asText(block.article) ?? "").toLowerCase();
    const article = a === "" || a === "no article" ? "none" : a;
    if (["a", "o", "none"].includes(article)) next.article = article;
    else note(`${FIELD_LABELS.article}: "${shown(block.article)}" isn't "a", "o" or "none"; kept "${current.article}".`);
  }

  // Lists of lines, each kept whole within the field's limit
  for (const key of LINE_LISTS) {
    if (!(key in block)) continue;
    const raw = block[key];
    const items = Array.isArray(raw) ? raw : raw == null ? [] : typeof raw === "string" ? linesIn(raw) : null;
    if (items === null) { note(`${FIELD_LABELS[key]}: not a list, so it stays as it was.`); continue; }
    const lines = items.map((x) => {
      // a word pair may come as { say, not }
      if (key === "pairs" && isObject(x)) {
        const say = flat(asText(x.say ?? x.use) ?? "");
        const not = flat(asText(x.not ?? x.avoid) ?? "");
        return say && not ? `${say}, not ${not}` : "";
      }
      return flat(asText(x) ?? "");
    }).filter(Boolean);
    if (lines.length < items.length) note(`${FIELD_LABELS[key]}: left out ${plural(items.length - lines.length, "item")} that ${items.length - lines.length === 1 ? "isn't" : "aren't"} text.`);
    const kept = [];
    for (const line of lines) {
      if ([...kept, line].join("\n").length > LIMITS[key]) break;
      kept.push(line);
    }
    if (kept.length < lines.length) note(`${FIELD_LABELS[key]}: left out the last ${plural(lines.length - kept.length, "line")}, past the field's limit of ${LIMITS[key]} characters.`);
    next[key] = kept.join("\n");
    if (kept.length > MAX[key]) note(`${FIELD_LABELS[key]}: ${kept.length} lines; the guide takes the first ${MAX[key]}.`);
    const loose = key === "pairs" ? ignoredPairs(next.pairs) : 0;
    if (loose) note(`${FIELD_LABELS.pairs}: ${plural(loose, "line")} not written as "word to use, not word to avoid", so the guide leaves ${loose === 1 ? "it" : "them"} out.`);
  }
  for (const key of WORD_LISTS) {
    if (!(key in block)) continue;
    const raw = block[key];
    const words = Array.isArray(raw) ? raw.map((w) => flat(asText(w) ?? "")).filter(Boolean) : raw == null ? [] : typeof raw === "string" ? listOf(raw) : null;
    if (words === null) note(`${FIELD_LABELS[key]}: not a list, so it stays as it was.`);
    else next[key] = words.join(", ");
  }

  // Foundation and finish: one option each
  for (const [key, group] of Object.entries(CHOICES)) {
    if (!(key in block)) continue;
    const found = optionFor(group, block[key]);
    if (found) next[key] = found.id;
    else note(`${group.title}: "${shown(block[key])}" isn't one of ${ids(group.options)}; kept "${current[key]}".`);
  }

  // Temperament: the axes under "axes", or loose at the top level
  const axesIn = "axes" in block ? block.axes : Object.fromEntries(Object.keys(block).filter((k) => axisFor(k)).map((k) => [k, block[k]]));
  if (!isObject(axesIn)) note("Temperament: \"axes\" isn't a set of axes with levels, so the sliders stay as they were.");
  else {
    const placed = new Set();
    for (const [key, raw] of Object.entries(axesIn)) {
      const axis = axisFor(key);
      if (!axis) { note(`Left out the axis "${key}": the axes are ${ids(AXES)}.`); continue; }
      // an axis may come as { level, reason }
      const level = numberOf(isObject(raw) ? raw.level ?? raw.value : raw);
      const why = isObject(raw) ? flat(asText(raw.reason ?? raw.evidence) ?? "") : "";
      if (why) reasons[axis.id] = oneLine(why);
      if (level === null) { note(`${axis.name}: "${shown(raw)}" isn't a level from 1 to 5; kept ${current.axes[axis.id]}.`); continue; }
      const n = Math.min(5, Math.max(1, Math.round(level)));
      if (n !== level) note(`${axis.name}: ${level} ${Number.isInteger(level) ? "is outside 1 to 5" : "isn't a whole level"}; set to ${n}.`);
      next.axes[axis.id] = n;
      placed.add(axis.id);
    }
    const missing = AXES.filter((a) => !placed.has(a.id));
    if (placed.size && missing.length) note(`Not in the block, so kept as they were: ${missing.map((a) => a.name).join(", ")}.`);
  }
  if (isObject(block.reasons)) {
    for (const [key, v] of Object.entries(block.reasons)) {
      const axis = axisFor(key);
      const why = flat(asText(v) ?? "");
      if (axis && why) reasons[axis.id] = oneLine(why);
    }
  }

  // Situations: the writer's own replace the ones here (a situation with the
  // same name keeps its id, so the texts tagged with it stay tagged)
  if ("customSituations" in block) {
    const list = block.customSituations;
    if (!Array.isArray(list)) note("Own situations: not a list, so they stay as they were.");
    else {
      const named = list.filter((s) => isObject(s) && flat(asText(s.name) ?? ""));
      if (named.length < list.length) note(`Own situations: left out ${plural(list.length - named.length, "situation")} without a name.`);
      if (named.length > MAX.situations) note(`Own situations: ${named.length} in the block; the site takes up to ${MAX.situations}, so the first ${MAX.situations} are in.`);
      next.customSituations = named.slice(0, MAX.situations).map((s) => {
        const name = flat(asText(s.name)).slice(0, 40);
        const same = current.customSituations.find((c) => c.name.trim().toLowerCase() === name.toLowerCase());
        const shift = {};
        for (const [key, d] of Object.entries(isObject(s.shift) ? s.shift : {})) {
          const axis = axisFor(key);
          const n = numberOf(d);
          if (!axis || n === null) { note(`${name}: left out the shift "${key}: ${shown(d)}".`); continue; }
          const step = Math.min(MAX_SHIFT, Math.max(-MAX_SHIFT, Math.round(n)));
          if (step !== n) note(`${name}: the ${axis.name} shift ${n} became ${step}; shifts go from -${MAX_SHIFT} to +${MAX_SHIFT}.`);
          if (step) shift[axis.id] = step;
        }
        return { id: same?.id || newSituationId(), name, when: flat(asText(s.when) ?? "").slice(0, 120), shift };
      });
    }
  }
  if ("hiddenSituations" in block) {
    const list = block.hiddenSituations;
    if (!Array.isArray(list)) note("Switched-off situations: not a list, so they stay as they were.");
    else {
      next.hiddenSituations = [];
      for (const v of list) {
        const k = flat(asText(v) ?? "").toLowerCase();
        const s = SITUATIONS.find((x) => x.id.toLowerCase() === k || x.name.toLowerCase() === k);
        if (s) next.hiddenSituations.push(s.id);
        else note(`Switched-off situations: "${shown(v)}" isn't a built-in situation (${ids(SITUATIONS)}).`);
      }
    }
  }
  if (!activeSituations(next).length) note("Every situation was switched off. At least one stays in use, so the built-in ones are back on.");

  // Texts: added after the ones here, skipping any already in either list
  const situations = allSituations(next);
  for (const key of ["examples", "rejected"]) {
    if (!(key in block)) continue;
    if (!Array.isArray(block[key])) { note(`${key === "examples" ? "Examples" : "Rejected texts"}: not a list, so none were added.`); continue; }
    for (const raw of block[key]) {
      const tags = isObject(raw) ? raw : {};
      const text = (typeof raw === "string" ? raw : asText(tags.text) ?? "").trim();
      if (!text || [...next.examples, ...next.rejected].some((e) => e.text.trim() === text)) continue;
      const entry = { text, situation: situationTag(flat(asText(tags.situation) ?? ""), situations), lang: langOf(tags.language ?? tags.lang, text) };
      if (key === "examples") next.examples.push({ ...entry, source: "chat" });
      else next.rejected.push({ ...entry, reason: oneLine(asText(tags.reason) ?? ""), source: "ai" });
      added[key]++;
    }
  }

  return { state: normalize(next), notes, reasons, added };
}

// What was pasted, read into the voice: the same as readBlock, or { error }.
export function readReply(text, current) {
  const found = findBlock(text);
  return found.error ? found : readBlock(found.value, current);
}

// ---------- What changed ----------

// The differences between two voices, in the order of the site's panels, as
// { id, label, change } for the list shown after a block is applied.
export function changesBetween(before, after) {
  const out = [];
  const add = (id, label, change) => out.push({ id, label, change });
  const quote = (s) => `“${s.length > 90 ? `${s.slice(0, 89)}…` : s}”`;
  const optionLabel = (group, id) => group.options.find((o) => o.id === id)?.label ?? id;
  const items = (key, s) => (LINE_LISTS.includes(key) ? linesIn(s) : listOf(s));
  const list = (key) => {
    const was = items(key, before[key]);
    const now = items(key, after[key]);
    const plus = now.filter((x) => !was.includes(x)).length;
    const minus = was.filter((x) => !now.includes(x)).length;
    if (plus || minus) add(key, FIELD_LABELS[key], [plus && `${plus} added`, minus && `${minus} removed`].filter(Boolean).join(", "));
  };
  const text = (key) => {
    if (before[key] !== after[key]) add(key, FIELD_LABELS[key], after[key].trim() ? quote(after[key].trim()) : "emptied");
  };
  const choice = (key, group) => {
    if (before[key] !== after[key]) add(key, group.title, `${optionLabel(group, before[key])} → ${optionLabel(group, after[key])}`);
  };

  ["name", "article", "essence", "about", "reader"].forEach(text);
  list("beliefs");
  ["opening", "closing"].forEach(text);
  list("never");
  list("pairs");

  const builtIn = (id) => SITUATIONS.find((s) => s.id === id).name;
  const off = after.hiddenSituations.filter((id) => !before.hiddenSituations.includes(id)).map(builtIn);
  const on = before.hiddenSituations.filter((id) => !after.hiddenSituations.includes(id)).map(builtIn);
  const own = (state) => new Map(state.customSituations.filter((s) => s.name.trim()).map((s) => [s.name.trim(), JSON.stringify([s.when, s.shift])]));
  const ownBefore = own(before);
  const ownAfter = own(after);
  const newOwn = [...ownAfter.keys()].filter((n) => !ownBefore.has(n));
  const goneOwn = [...ownBefore.keys()].filter((n) => !ownAfter.has(n));
  const editedOwn = [...ownAfter.keys()].filter((n) => ownBefore.has(n) && ownBefore.get(n) !== ownAfter.get(n));
  const situations = [
    off.length && `switched off ${off.join(", ")}`,
    on.length && `switched on ${on.join(", ")}`,
    newOwn.length && `added ${newOwn.join(", ")}`,
    editedOwn.length && `changed ${editedOwn.join(", ")}`,
    goneOwn.length && `removed ${goneOwn.join(", ")}`,
  ].filter(Boolean);
  if (situations.length) add("situations", "Situations", situations.join("; "));

  for (const [key, group] of Object.entries(FOUNDATION)) choice(key, group);
  for (const axis of AXES) {
    const [was, now] = [before.axes[axis.id], after.axes[axis.id]];
    if (was !== now) add(axis.id, axis.name, `${was} → ${now} of 5 (${now < 3 ? axis.left : now > 3 ? axis.right : "the middle"})`);
  }
  for (const [key, group] of Object.entries(FINISH)) choice(key, group);
  list("preferred");
  list("forbidden");

  const more = (key) => after[key].length - before[key].length;
  if (more("examples") > 0) add("examples", "Approved examples", `${plural(more("examples"), "text")} added`);
  if (more("rejected") > 0) add("rejected", "Rejected texts", `${plural(more("rejected"), "text")} added`);
  return out;
}
