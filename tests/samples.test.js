// The built sample texts: they are the guide's illustrations when there are no
// approved texts, so they must keep the rules the meter checks. A model follows
// an example over a rule when the two disagree.

import { test } from "node:test";
import assert from "node:assert/strict";
import { INITIAL_STATE, PRESETS, SITUATIONS, FOUNDATION, AXES } from "../js/data.js";
import { composeText, effectiveLevels, effectiveAddress } from "../js/compose.js";
import { measure } from "../js/meter.js";
import { findTics } from "../js/tics.js";
import { normalize } from "../js/state.js";

const failures = (state, checks) => {
  const out = [];
  for (const s of SITUATIONS) {
    for (const lang of ["en", "pt"]) {
      const text = composeText(state, s.id, lang);
      const rows = measure(text, { state, lang, levels: effectiveLevels(state, s.id), address: effectiveAddress(state, s.id) });
      for (const r of rows) if (!r.ok && (!checks || checks.includes(r.name))) out.push(`${s.id}/${lang} ${r.name}: ${r.value} (${r.detail})`);
    }
  }
  return out;
};

test("the initial voice and every ready-made character pass every check", () => {
  assert.deepEqual(failures(normalize(INITIAL_STATE)), []);
  for (const p of PRESETS) assert.deepEqual(failures(normalize({ ...INITIAL_STATE, ...p.state })), [], p.name);
});

test("every speaker, reader and role conjugates right at every level", () => {
  const ids = (group) => group.options.map((o) => o.id);
  for (const speaker of ids(FOUNDATION.speaker)) {
    for (const address of ids(FOUNDATION.address)) {
      for (const role of ids(FOUNDATION.role)) {
        for (const axis of AXES) {
          for (let n = 1; n <= 5; n++) {
            const state = normalize({ ...INITIAL_STATE, speaker, address, role, sentenceLength: "long", exclamation: "free", axes: { ...INITIAL_STATE.axes, [axis.id]: n } });
            assert.deepEqual(failures(state, ["Who speaks", "Reader", "Forbidden words"]), [], `${speaker}/${address}/${role}/${axis.id}=${n}`);
          }
        }
      }
    }
  }
});

test("no sample text has an AI tic, at the ends of every axis pair", () => {
  const ids = (group) => group.options.map((o) => o.id);
  const found = new Set();
  for (const [i, a] of AXES.entries()) {
    for (const b of AXES.slice(i + 1)) {
      for (const x of [1, 5]) for (const y of [1, 5]) {
        for (const speaker of ids(FOUNDATION.speaker)) for (const address of ids(FOUNDATION.address)) for (const role of ids(FOUNDATION.role)) {
          const state = normalize({ ...INITIAL_STATE, speaker, address, role, sentenceLength: "short", axes: { ...INITIAL_STATE.axes, [a.id]: x, [b.id]: y } });
          for (const s of SITUATIONS) for (const lang of ["en", "pt"]) {
            for (const t of findTics(composeText(state, s.id, lang), lang)) found.add(`${t.id}: ${t.found[0]} (${a.id}=${x}, ${b.id}=${y}, ${speaker}/${address}/${role}, ${s.id}/${lang})`);
          }
        }
      }
    }
  }
  assert.deepEqual([...found], []);
});

test("the samples talk about the fictional newsletter, not a brand's product", () => {
  const all = SITUATIONS.flatMap((s) => ["en", "pt"].map((lang) => composeText(normalize(INITIAL_STATE), s.id, lang))).join("\n");
  assert.doesNotMatch(all, /report|relatório|payment|pagamento|customer|cliente/i);
});
