// The voice checker: the meter, exported as one standalone Node script with this
// voice's settings inside, for an AI to run on its own draft before it delivers.
// The script is assembled in the browser from the source of the meter's files,
// so the checks in the file are the ones in the app, never a copy that drifts.
// Also packs the checker and the guide as a skill folder (SKILL.md + script) in a .zip.

import { activeSituations } from "./data.js";
import { effectiveLevels, effectiveAddress } from "./compose.js";
import { buildGuide } from "./guide.js";
import { zip } from "./zip.js";

export const CHECKER_FILE = "check-voice.mjs";
const LANGUAGE_NAME = { en: "English", pt: "Portuguese" };

export const slugOf = (name) => (name.trim() || "voice").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "voice";

// The files the checks live in, in the order the script needs them. Each may
// import only from the ones before it, so the imports can simply be dropped.
export const METER_FILES = ["text.js", "tics.js", "meter.js"];

let sources;
async function meterSources() {
  sources ||= Promise.all(METER_FILES.map((file) => fetch(new URL(`./${file}`, import.meta.url)).then((r) => {
    if (!r.ok) throw new Error("Couldn't load the meter.");
    return r.text();
  })));
  return sources;
}

// The meter's files as one plain script: their imports of each other and their "export" dropped.
export function meterCode(texts) {
  return texts.map((text, i) => {
    const local = new RegExp(`^import\\s[^;]*from\\s+["']\\./(?:${METER_FILES.slice(0, i).map((f) => f.replace(".", "\\.")).join("|") || "(?!)"})["'];?\\s*$`, "gm");
    const code = text.replace(local, "");
    if (/^import\s/m.test(code)) throw new Error(`${METER_FILES[i]} may only import from the meter's own files.`);
    return code.replace(/^export\s+/gm, "").trim();
  }).join("\n\n");
}

// What the script needs to know: the checks' settings, and the expected levels per situation.
export function checkerConfig(state, lang) {
  const situations = activeSituations(state).map((s) => ({
    id: s.id,
    name: s.name,
    when: s.when || "",
    levels: effectiveLevels({ ...state, applyShift: true }, s.id),
    address: effectiveAddress(state, s.id),
  }));
  return {
    name: state.name.trim() || "Lumen",
    lang,
    state: {
      name: state.name,
      speaker: state.speaker,
      sentenceLength: state.sentenceLength,
      exclamation: state.exclamation,
      emoji: state.emoji,
      forbidden: state.forbidden,
      allowedTics: state.allowedTics,
    },
    base: { levels: { ...state.axes }, address: state.address },
    situations,
  };
}

// The command line around the meter. Plain strings only: no backticks or dollar-brace in here.
const CLI = String.raw`
const HINTS = {
  "Who speaks": "Rewrite it so the text speaks the way the voice does.",
  "Reader": "Address the reader only in the form the voice uses.",
  "Sentences": "Split the long sentences.",
  "Rhythm": "Mix short and long sentences; they should not all be the same length.",
  "Readability": "Use shorter sentences and simpler words.",
  "Certainty": "Hedge a claim you can't fully back, or drop the hedges, as the voice asks.",
  "Informality": "Remove the contractions and colloquial words.",
  "Exclamation marks": "Cut the exclamation marks down to the limit.",
  "Emoji": "Cut the emoji down to the limit.",
  "Forbidden words": "Replace the words this voice never uses.",
  "AI tics": "Rewrite the parts listed above.",
};

const USAGE = [
  "Checks a draft against " + CONFIG.name + "'s voice rules.",
  "",
  "  node check-voice.mjs draft.txt [--situation NAME] [--lang en|pt]",
  "  cat draft.txt | node check-voice.mjs [--situation NAME]",
  "",
  "Situations: " + CONFIG.situations.map((s) => s.name).join(", ") + ". Without one, the base voice is checked.",
  "Exit code: 0 all checks pass, 1 something to fix, 2 wrong usage.",
].join("\n");

const fail = (message) => { console.error(message + "\n\n" + USAGE); process.exit(2); };

const args = process.argv.slice(2);
let file = null, wanted = null, lang = CONFIG.lang;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-h" || a === "--help") { console.log(USAGE); process.exit(0); }
  else if (a === "-s" || a === "--situation") wanted = args[++i] ?? fail("--situation needs a name.");
  else if (a.startsWith("--situation=")) wanted = a.slice(12);
  else if (a === "--lang") lang = args[++i] ?? fail("--lang needs en or pt.");
  else if (a.startsWith("--lang=")) lang = a.slice(7);
  else if (a.startsWith("-") && a !== "-") fail("Unknown option " + a + ".");
  else file = a === "-" ? null : a;
}
if (lang !== "en" && lang !== "pt") fail("--lang must be en or pt.");

let expected = CONFIG.base;
let situationName = "base voice";
if (wanted) {
  const key = wanted.trim().toLowerCase();
  const found = CONFIG.situations.find((s) => s.id.toLowerCase() === key || s.name.toLowerCase() === key);
  if (!found) fail("Unknown situation \"" + wanted + "\".");
  expected = found;
  situationName = found.name;
}

let text = "";
try {
  if (!file && process.stdin.isTTY) fail("Give a file or pipe the draft in.");
  text = readFileSync(file || 0, "utf8");
} catch (error) {
  fail("Couldn't read the draft: " + error.message);
}
if (!text.trim()) fail("The draft is empty.");

const rows = measure(text, { state: CONFIG.state, lang, levels: expected.levels, address: expected.address });
const bad = rows.filter((r) => !r.ok);
console.log("Voice check: " + CONFIG.name + ", " + situationName + ", " + (lang === "en" ? "English" : "Portuguese"));
for (const r of rows) {
  console.log((r.ok ? "ok    " : "FAIL  ") + r.name + ": " + r.value + (r.ok || r.tics ? "" : " (" + r.detail + ")"));
  if (r.ok) continue;
  // AI tics: one line per kind found, with what was found and the fix
  if (r.tics) for (const t of r.tics) console.log("      " + t.label + ": " + t.found.slice(0, 3).map((f) => JSON.stringify(f)).join(", ") + ". Fix: " + t.fix);
  else console.log("      Fix: " + (HINTS[r.name] || "Bring it within the rule."));
}
console.log(bad.length ? bad.length + " to fix. Fix them and run the check again." : "All checks pass.");
process.exit(bad.length ? 1 : 0);
`;

// The whole script as text, from the meter's code (see meterCode).
export function checkerScript(state, lang, code) {
  const config = checkerConfig(state, lang);
  return [
    "#!/usr/bin/env node",
    "// Voice checker for " + config.name.replace(/[\r\n]+/g, " ") + ", made with AI Writing Helper.",
    "// Usage: node check-voice.mjs draft.txt [--situation NAME]   (or pipe the draft in)",
    "// Standalone: Node 18 or newer, no dependencies. The checks below are the app's meter.",
    "",
    'import { readFileSync } from "node:fs";',
    "",
    "// ---------- Meter ----------",
    code,
    "",
    "// ---------- This voice ----------",
    "const CONFIG = " + JSON.stringify(config, null, 2) + ";",
    "",
    "// ---------- Command line ----------",
    CLI.trim(),
    "",
  ].join("\n");
}

export async function buildChecker(state, lang) {
  return checkerScript(state, lang, meterCode(await meterSources()));
}

// SKILL.md: frontmatter, then the guide with the line that tells the model to run the checker.
export function buildSkillMd(state, lang) {
  const name = state.name.trim() || "Lumen";
  const skill = `voice-${slugOf(state.name)}`;
  const description = `Writes in ${name}'s voice, in ${LANGUAGE_NAME[lang]}. Use whenever you draft or edit text for ${name} (posts, emails, replies, announcements), and check each draft with the bundled script before replying.`;
  return { skill, md: ["---", `name: ${skill}`, `description: ${JSON.stringify(description)}`, "---", "", buildGuide(state, lang, { checker: CHECKER_FILE }), ""].join("\n") };
}

// The skill as a .zip: one folder with SKILL.md and the checker.
export async function buildSkillZip(state, lang) {
  const { skill, md } = buildSkillMd(state, lang);
  return zip({ [`${skill}/SKILL.md`]: md, [`${skill}/${CHECKER_FILE}`]: await buildChecker(state, lang) });
}
