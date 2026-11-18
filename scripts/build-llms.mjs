// Writes llms.txt, the page a model can read on the site, from the same data
// as the sliders, so the two never drift.
//
//   node scripts/build-llms.mjs          writes the file
//   node scripts/build-llms.mjs --check  exits 1 when the file is out of date

import { readFileSync, writeFileSync } from "node:fs";
import { llmsText, LLMS_FILE } from "../js/prompts.js";

const file = new URL(`../${LLMS_FILE}`, import.meta.url);
const text = llmsText();

if (process.argv.includes("--check")) {
  let saved = "";
  try { saved = readFileSync(file, "utf8"); } catch {}
  if (saved !== text) {
    console.error(`${LLMS_FILE} is out of date. Run: node scripts/build-llms.mjs`);
    process.exit(1);
  }
  console.log(`${LLMS_FILE} is up to date.`);
} else {
  writeFileSync(file, text);
  console.log(`Wrote ${LLMS_FILE} (${text.split(/\s+/).length} words).`);
}
