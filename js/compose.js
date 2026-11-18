// Builds the sample text for a situation from the user's choices, then applies
// the finish: word swaps by formality, exclamation marks, emoji and capitals.

import { allSituations } from "./data.js";
import { SCENES_PT, contextPt, greetingPt } from "./scenes-pt.js";
import { SCENES_EN, contextEn, greetingEn, CONTRACTIONS } from "./scenes-en.js";

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// The brand's own situations have no stock sentences: their preview borrows the launch scene.
const sceneKey = (id) => (SCENES_PT[id] ? id : "launch");

// Adds the situation's shift to the base temperament, staying within 1 to 5.
export function effectiveLevels(state, situationId) {
  const situation = allSituations(state).find((s) => s.id === situationId);
  const levels = { ...state.axes };
  if (!state.applyShift) return levels;
  for (const [axis, delta] of Object.entries(situation?.shift || {})) {
    levels[axis] = Math.min(5, Math.max(1, levels[axis] + delta));
  }
  return levels;
}

// The address the text actually uses: a reply to one person never says "you all".
export function effectiveAddress(state, situationId) {
  return SCENES_PT[sceneKey(situationId)].individual && state.address === "youPlural" ? "you" : state.address;
}

const wordCount = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

// Splits a sentence at "; ", ", and", ", but", ": " (in that order) until each
// piece fits the limit, keeping pieces of at least three words.
function splitLong(text, limit, en) {
  if (wordCount(text) <= limit) return [text];
  const joints = en ? ["; ", ", and ", ", but ", ": "] : ["; ", ", e ", ", mas ", ": "];
  for (const joint of joints) {
    const at = text.indexOf(joint);
    if (at < 0) continue;
    const head = text.slice(0, at) + ".";
    const keep = joint.startsWith(", ") ? joint.slice(2) : "";
    const tail = capitalize((keep + text.slice(at + joint.length)).trim());
    if (wordCount(head) >= 3 && wordCount(tail) >= 3) return [head, ...splitLong(tail, limit, en)];
  }
  return [text];
}

export function composeText(state, situationId, lang = "pt") {
  const en = lang === "en";
  const scene = (en ? SCENES_EN : SCENES_PT)[sceneKey(situationId)];
  const n = effectiveLevels(state, situationId);
  const c = { ...(en ? contextEn : contextPt)(state, n, scene), role: state.role, grave: !!scene.grave };
  const blocks = scene.compose(c).filter((b) => b.length);

  // Word swaps by formality
  const formal = en ? c.register === "formal" : n.formality <= 2;
  const swaps = formal
    ? scene.formalSwaps
    : [...(en && n.formality >= 4 ? CONTRACTIONS : []), ...(n.formality === 5 ? scene.looseSwaps : [])];
  for (const block of blocks) {
    for (const s of block) {
      for (const [from, to] of swaps) s.t = s.t.replace(from, to);
    }
  }

  // Sentence length: split long sentences at their natural joints
  const limit = { short: 12, medium: 20, long: null }[state.sentenceLength];
  if (limit) {
    for (const block of blocks) {
      for (let i = 0; i < block.length; i++) {
        const parts = splitLong(block[i].t, limit, en);
        if (parts.length > 1) block.splice(i, 1, ...parts.map((t, k) => ({ t, exclaimable: k === parts.length - 1 && block[i].exclaimable })));
      }
    }
  }

  // Exclamation marks: energy asks for them, the finish limits them
  const allowed = state.exclamation !== "never" && n.energy >= 4;
  let left = !allowed ? 0 : state.exclamation === "one" || n.energy === 4 ? 1 : Infinity;
  for (const s of blocks.flat()) {
    if (s.exclaimable && left > 0 && /\.$/.test(s.t)) {
      s.t = s.t.replace(/\.$/, "!");
      left--;
    }
  }

  // Emoji
  const last = blocks[blocks.length - 1];
  if (state.emoji === "one" && n.energy >= 3) {
    last[last.length - 1].t += ` ${scene.emoji}`;
  } else if (state.emoji === "free" && n.energy >= 2) {
    blocks[0][blocks[0].length - 1].t += ` ${scene.emoji}`;
    if (!scene.grave) last[last.length - 1].t += " ✨";
  }

  const paragraphs = blocks.map((b) => b.map((s) => capitalize(s.t.replace(/\s+/g, " ").trim())).join(" "));
  const hello = (en ? greetingEn : greetingPt)(c, scene.reader);
  return (hello ? [hello, ...paragraphs] : paragraphs).join("\n\n");
}
