import { FOUNDATION, AXES, FINISH, SITUATIONS, PRESETS, INITIAL_STATE, allSituations, activeSituations } from "./data.js";
import { composeText, effectiveLevels, effectiveAddress } from "./compose.js";
import { measure, findForbidden } from "./meter.js";
import { buildGuide, guideLanguage, warnings, defaultEssence } from "./guide.js";
import { write, writeBrief, diagnose, errorMessage } from "./claude.js";
import { LANGUAGES, SOURCES, situationName, situationTag, guessLang, normalizeExamples, normalizeRejected, oneLine } from "./examples.js";
import { BRAND_FIELDS, LIMITS, MAX, MAX_SHIFT, HABIT_LABELS, ignoredPairs, newSituationId, normalizeSituations, normalizeHidden, habitList, applyHabits } from "./brand.js";
import { buildChecker, buildSkillZip, slugOf, CHECKER_FILE } from "./checker.js";
import { MAX_BRIEFS, testCalls, compareReading, meterFailures } from "./guide-test.js";

const $ = (id) => document.getElementById(id);
const STATE_KEY = "brand-voice-creator:state";
const API_KEY = "brand-voice-creator:api-key";
const LANG_KEY = "brand-voice-creator:lang";

// Local storage can fail (private window, blocked storage); nothing here depends on it.
const store = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const load = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

// The fields typed straight into the state.
const TEXT_FIELDS = ["brand", "article", "essence", "preferred", "forbidden", ...BRAND_FIELDS];

const clone = (o) => JSON.parse(JSON.stringify(o));
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- State ----------

function encode(state) {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function decode(text) {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}
function normalize(raw) {
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
  for (const k of ["brand", "essence", "preferred", "forbidden"]) if (typeof s[k] !== "string") s[k] = INITIAL_STATE[k];
  // Files and links from before the brand fields existed leave them empty.
  for (const k of BRAND_FIELDS) s[k] = typeof s[k] === "string" ? s[k].slice(0, LIMITS[k]) : "";
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
const linkState = ({ examples, rejected, ...rest }) => rest;
function initialState() {
  let saved = null;
  const raw = load(STATE_KEY);
  if (raw) { try { saved = normalize(JSON.parse(raw)); } catch {} }
  const hash = location.hash.match(/v=([\w-]+)/);
  // Examples and rejected texts stay in this browser, whatever voice the link brings.
  if (hash) { try { return normalize({ ...decode(hash[1]), examples: saved?.examples, rejected: saved?.rejected }); } catch {} }
  return saved || clone(INITIAL_STATE);
}

let state = initialState();
let lang = load(LANG_KEY) === "pt" ? "pt" : "en";
let guideLang = lang; // the language the exported guide tells the model to write in
let source = "built";
let lastAxis = "style";
let version = 0; // bumps on every choice; tells whether Claude's text is stale
const claudeTexts = {}; // "situation:lang" -> { text, version }
let rejecting = null; // the Claude text whose reason is being asked for, in the preview or the test dialog
let testLang = null; // the language the guide test writes in; set when the dialog first opens
let lastTest = null; // { version, state, lang, texts: [{ brief, situation, text }], reading, result }
const previous = {}; // last text shown per source, situation and language, to highlight what changed

// ---------- Building the controls ----------

function pillGroup(name, title, options, value, withHint) {
  const fs = document.createElement("fieldset");
  fs.className = "choice";
  fs.innerHTML = `<legend>${title}</legend><div class="pills">${options
    .map((o) => `<label><input type="radio" name="${name}" value="${o.id}"${o.id === value ? " checked" : ""}><span>${escapeHtml(o.label)}</span></label>`)
    .join("")}</div>${withHint ? `<p class="choice-hint" data-hint="${name}"></p>` : ""}`;
  return fs;
}

function buildControls() {
  $("presets").innerHTML = PRESETS.map((p) => `<button type="button" class="button" data-preset="${p.id}">${escapeHtml(p.name)}</button>`).join("");

  for (const [id, g] of Object.entries(FOUNDATION)) $("foundation").append(pillGroup(id, g.title, g.options, state[id], true));

  $("axes").innerHTML = AXES.map((a) => `
    <div class="axis" data-axis="${a.id}">
      <div class="axis-name">${a.name}</div>
      <div class="axis-ends"><span class="end" data-end="left">${a.left}</span><span class="end" data-end="right">${a.right}</span></div>
      <input type="range" min="1" max="5" step="1" id="axis-${a.id}" aria-label="${a.name}: ${a.left} to ${a.right}">
      <div class="axis-ticks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <p class="rule" id="rule-${a.id}"></p>
    </div>`).join("");

  for (const [id, g] of Object.entries(FINISH)) $("finish").append(pillGroup(id, g.title, g.options, state[id], false));


  const key = load(API_KEY);
  if (key) { $("api-key").value = key; $("remember-key").checked = true; }
}

function syncControls() {
  for (const id of TEXT_FIELDS) $(id).value = state[id];
  for (const id of [...Object.keys(FOUNDATION), ...Object.keys(FINISH)]) {
    const radio = document.querySelector(`input[name="${id}"][value="${state[id]}"]`);
    if (radio) radio.checked = true;
  }
  for (const a of AXES) $(`axis-${a.id}`).value = state.axes[a.id];
  renderSituations();
  refreshSituations();
}

// ---------- Situations ----------

// The tabs, and the pickers in the dialogs, follow the situations in use.
function refreshSituations() {
  const active = activeSituations(state);
  if (!active.some((s) => s.id === state.situation)) state.situation = active[0].id;
  $("situations").innerHTML = active.map((s) => `<button type="button" role="tab" data-situation="${s.id}">${escapeHtml(s.name)}</button>`).join("");
  document.querySelectorAll("dialog [data-picker]").forEach((box) => {
    const tag = box.parentElement.querySelector('[data-field="situation"]') ? pickedSituation(box.parentElement) : "general";
    box.querySelectorAll("select, input").forEach((el) => el.remove());
    box.insertAdjacentHTML("beforeend", situationPicker(tag));
  });
}

const SHIFTS = Array.from({ length: 2 * MAX_SHIFT + 1 }, (_, i) => i - MAX_SHIFT);
const shiftLabel = (d) => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "0");

// Built-in situations can be switched off; the brand's own ones are edited here.
function renderSituations() {
  const lastActive = activeSituations(state).length <= 1;
  $("situation-list").innerHTML = `
    <div class="situation-builtins">${SITUATIONS.map((s) => {
      const on = !state.hiddenSituations.includes(s.id);
      return `<label class="check"><input type="checkbox" data-builtin="${s.id}"${on ? " checked" : ""}${on && lastActive ? " disabled" : ""}><span>${s.name} <small>${escapeHtml(s.when)}</small></span></label>`;
    }).join("")}</div>
    ${state.customSituations.map((s, i) => `
      <div class="example" data-index="${i}">
        <div class="example-meta even">
          <label class="field"><span>Name</span><input type="text" data-field="name" maxlength="40" autocomplete="off" placeholder="Complaint, Event invitation…" value="${escapeHtml(s.name)}"></label>
          <label class="field"><span>When it applies</span><input type="text" data-field="when" maxlength="120" autocomplete="off" placeholder="a reply to someone unhappy with an order" value="${escapeHtml(s.when)}"></label>
        </div>
        <details>
          <summary>Tone shifts <small>(optional, from the base voice)</small></summary>
          <div class="shift-grid">${AXES.map((a) => `
            <label class="field"><span>${a.name}</span><select data-shift-axis="${a.id}" aria-label="${a.name} shift">${SHIFTS
              .map((d) => `<option value="${d}"${d === (s.shift[a.id] || 0) ? " selected" : ""}>${shiftLabel(d)}</option>`).join("")}</select></label>`).join("")}
          </div>
        </details>
        <div class="example-foot"><span class="note">Your own situation</span><button type="button" class="button small" data-remove-situation>Remove</button></div>
      </div>`).join("")}`;
  $("add-situation").disabled = state.customSituations.length >= MAX.situations;
}

// A situation changed: the tabs, the pickers and the lists tagged with it follow.
function situationsChanged() {
  refreshSituations();
  renderExamples();
  renderRejected();
  changed();
}

// ---------- Approved examples ----------

const OTHER = "__other";

// A situation tag as a select of the built-in ones, plus "Other…" with a free label.
function situationPicker(tag) {
  const all = allSituations(state);
  // a situation the user switched off stays on the texts already tagged with it
  const known = ["general", ...activeSituations(state).map((s) => s.id), ...(all.some((s) => s.id === tag) ? [tag] : [])].filter((id, i, ids) => ids.indexOf(id) === i);
  const custom = !known.includes(tag);
  return `<select data-field="situation" aria-label="Situation">${known
    .map((id) => `<option value="${id}"${id === tag ? " selected" : ""}>${escapeHtml(situationName(id, all))}</option>`)
    .join("")}<option value="${OTHER}"${custom ? " selected" : ""}>Other…</option></select>
    <input type="text" data-field="label" maxlength="40" autocomplete="off" placeholder="Name the situation" aria-label="Situation name" value="${custom ? escapeHtml(tag) : ""}"${custom ? "" : " hidden"}>`;
}
function pickedSituation(box) {
  const value = box.querySelector('[data-field="situation"]').value;
  return value === OTHER ? situationTag(box.querySelector('[data-field="label"]').value, allSituations(state)) : value;
}
function togglePicker(select) {
  const label = select.parentElement.querySelector('[data-field="label"]');
  label.hidden = select.value !== OTHER;
  if (!label.hidden) label.focus();
}

// Redrawn only when the list itself changes, so typing keeps its focus.
function renderExamples() {
  $("examples").innerHTML = state.examples.length
    ? state.examples.map((e, i) => `
      <div class="example" data-index="${i}">
        <label class="field"><span>Text ${i + 1}</span><textarea rows="4" data-field="text" lang="${e.lang}">${escapeHtml(e.text)}</textarea></label>
        <div class="example-meta">
          <div class="field situation-field"><span>Situation</span>${situationPicker(e.situation)}</div>
          <label class="field"><span>Language</span><select data-field="lang">${Object.entries(LANGUAGES)
            .map(([id, name]) => `<option value="${id}"${id === e.lang ? " selected" : ""}>${name}</option>`)
            .join("")}</select></label>
        </div>
        <label class="field"><span>Note (optional, only for you)</span><input type="text" data-field="note" maxlength="200" autocomplete="off" value="${escapeHtml(e.note || "")}"></label>
        <div class="example-foot"><span class="note">${SOURCES[e.source]}</span><button type="button" class="button small" data-remove>Remove</button></div>
      </div>`).join("")
    : '<p class="note">No texts yet. Until there are some, the guide shows stock texts about a fictional product, marked as illustrations of the rules only.</p>';
}

// The same list as the approved examples, for what the user turned down.
function renderRejected() {
  $("rejected").innerHTML = state.rejected.length
    ? state.rejected.map((e, i) => `
      <div class="example" data-index="${i}">
        <label class="field"><span>Rejected text ${i + 1}</span><textarea rows="4" data-field="text" lang="${e.lang}">${escapeHtml(e.text)}</textarea></label>
        <label class="field"><span>Reason</span><input type="text" data-field="reason" maxlength="200" autocomplete="off" placeholder="Name the pattern to avoid" value="${escapeHtml(e.reason)}"></label>
        <div class="example-meta">
          <div class="field situation-field"><span>Situation</span>${situationPicker(e.situation)}</div>
          <label class="field"><span>Language</span><select data-field="lang">${Object.entries(LANGUAGES)
            .map(([id, name]) => `<option value="${id}"${id === e.lang ? " selected" : ""}>${name}</option>`)
            .join("")}</select></label>
        </div>
        <div class="example-foot"><span class="note">Written by Claude, rejected by you</span><button type="button" class="button small" data-remove>Remove</button></div>
      </div>`).join("")
    : '<p class="note">None yet. Use "Reject" on a text Claude wrote, in the preview or in "Test the guide".</p>';
}

const sameText = (a) => (e) => e.text.trim() !== a.trim();
const isApproved = (text) => state.examples.some((e) => !sameText(text)(e));
const isRejected = (text) => state.rejected.some((e) => !sameText(text)(e));
// A text is either approved or rejected: choosing again moves it.
function approveExample(text, situation, exampleLang, note = "") {
  if (isApproved(text)) return;
  state.rejected = state.rejected.filter(sameText(text));
  state.examples.push({ text, situation, lang: exampleLang, source: "claude", ...(oneLine(note) && { note: oneLine(note) }) });
  renderExamples();
  renderRejected();
  save(); // not changed(): the text on screen doesn't go stale by being approved
}
function rejectExample(text, reason, situation, exampleLang) {
  if (isRejected(text)) return;
  state.examples = state.examples.filter(sameText(text));
  state.rejected.push({ text, reason: oneLine(reason), situation, lang: exampleLang, source: "claude" });
  rejecting = null;
  renderExamples();
  renderRejected();
  save();
}

// ---------- Highlighting what changed ----------

const tokens = (text) => text.split(/(\s+)/).filter((t) => t.length);
const isSpace = (t) => /^\s+$/.test(t);

// Marks the words that are new compared with the previous text (longest common subsequence).
function newWords(before, after) {
  if (!before) return new Set();
  const a = tokens(before).filter((t) => !isSpace(t));
  const words = tokens(after).map((t, i) => [t, i]).filter(([t]) => !isSpace(t));
  const fresh = new Set(words.map(([, i]) => i));
  const m = a.length, n = words.length;
  const table = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      table[i][j] = a[i] === words[j][0] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  let i = 0, j = 0;
  while (i < m && j < n) {
    if (a[i] === words[j][0]) { fresh.delete(words[j][1]); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return fresh;
}

function sampleHtml(text, fresh) {
  const ranges = [];
  for (const term of findForbidden(text, state.forbidden)) {
    const re = new RegExp(`(?<![\\p{L}'’])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}'’])`, "giu");
    for (const m of text.matchAll(re)) ranges.push([m.index, m.index + m[0].length]);
  }
  let pos = 0;
  let html = "<p>";
  tokens(text).forEach((t, i) => {
    const start = pos;
    pos += t.length;
    if (isSpace(t)) {
      html += /\n\s*\n/.test(t) ? "</p><p>" : t.includes("\n") ? "<br>" : " ";
      return;
    }
    let piece = escapeHtml(t);
    if (ranges.some(([a, b]) => start < b && pos > a)) piece = `<span class="forbidden" title="Forbidden word">${piece}</span>`;
    if (fresh.has(i)) piece = `<mark>${piece}</mark>`;
    html += piece;
  });
  return html + "</p>";
}

// ---------- Drawing ----------

function drawRadar() {
  const svg = $("radar");
  const cx = 110, cy = 110, r = 72;
  const point = (i, v) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / AXES.length;
    return [cx + Math.cos(angle) * r * v, cy + Math.sin(angle) * r * v];
  };
  const ring = (v) => AXES.map((_, i) => point(i, v).join(",")).join(" ");
  const levels = effectiveLevels(state, state.situation);
  const shape = AXES.map((a, i) => point(i, levels[a.id] / 5).join(",")).join(" ");
  const labels = AXES.map((a, i) => {
    const [x, y] = point(i, 1.28);
    const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
    return `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="${anchor}">${levels[a.id] >= 3 ? a.right : a.left}</text>`;
  }).join("");
  svg.innerHTML = `${[0.2, 0.4, 0.6, 0.8, 1].map((v) => `<polygon class="grid-line" points="${ring(v)}"/>`).join("")}
    <polygon class="shape" points="${shape}"/>${labels}`;
  svg.setAttribute("aria-label", `Voice portrait: ${AXES.map((a) => `${a.name} ${levels[a.id]} of 5`).join(", ")}`);
}

function drawLadder() {
  const axis = AXES.find((a) => a.id === lastAxis);
  const current = state.axes[axis.id];
  $("ladder-title").textContent = `Ladder for ${axis.name.toLowerCase()}: ${axis.left} ↔ ${axis.right}`;
  $("ladder").innerHTML = axis.levels.map((l, i) => `
    <li class="${i + 1 === current ? "current" : ""}"${i + 1 === current ? ' aria-current="true"' : ""}>
      <span class="n">${i + 1}</span><span>${escapeHtml(l.rule)}</span><span class="ex" lang="${lang}">"${escapeHtml(l[lang])}"</span>
    </li>`).join("");
}

function drawShift() {
  const situation = allSituations(state).find((s) => s.id === state.situation);
  const shifts = Object.entries(situation.shift);
  const box = $("shift");
  // the brand's own situations have no stock case: the built text borrows a launch scene
  const summary = situation.summary || `${situation.when || "Your own situation"}. The built text is a stock illustration at this tone, not about this situation; "Write with Claude" writes the real one`;
  if (!shifts.length) { box.innerHTML = `<span>${escapeHtml(summary)}. Base voice, no tone shift here.</span>`; return; }
  const levels = effectiveLevels({ ...state, applyShift: true }, situation.id);
  box.innerHTML = `<span>${escapeHtml(summary)}. Here the tone shifts:</span>${shifts
    .map(([id, d]) => `<span class="chip">${AXES.find((a) => a.id === id).name} ${d > 0 ? "+" : "−"}${Math.abs(d)}, becomes ${levels[id]}</span>`)
    .join("")}<label class="check" style="margin:0"><input type="checkbox" id="apply-shift"${state.applyShift ? " checked" : ""}><span>Apply shift</span></label>`;
  $("apply-shift").addEventListener("change", (ev) => { state.applyShift = ev.target.checked; changed(); });
}

function draw() {
  for (const a of AXES) {
    const v = state.axes[a.id];
    $(`rule-${a.id}`).innerHTML = `<b>${v} of 5.</b> ${escapeHtml(a.levels[v - 1].rule)}`;
    const box = document.querySelector(`[data-axis="${a.id}"]`);
    box.querySelector('[data-end="left"]').classList.toggle("active", v < 3);
    box.querySelector('[data-end="right"]').classList.toggle("active", v > 3);
  }
  for (const id of Object.keys(FOUNDATION)) {
    const hint = document.querySelector(`[data-hint="${id}"]`);
    if (hint) hint.textContent = FOUNDATION[id].options.find((o) => o.id === state[id]).guide.replace("{brand}", state.brand || "Lumen");
  }
  $("essence").placeholder = defaultEssence(state);
  const ignored = ignoredPairs(state.pairs);
  $("pairs-note").textContent = ignored
    ? `${ignored} line${ignored === 1 ? "" : "s"} left out of the guide. Write each as: word to use, not word to avoid.`
    : "One pair per line: the word to use, a comma, \"not\", the word to avoid.";

  document.querySelectorAll("[data-situation]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.situation === state.situation)));
  document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.lang === lang)));
  document.querySelectorAll("[data-source]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.source === source)));

  drawShift();

  const textKey = `${state.situation}:${lang}`;
  const fromClaude = claudeTexts[textKey];
  let text;
  if (source === "claude") {
    text = fromClaude?.text || "";
    $("claude-status").textContent = !fromClaude
      ? "No text from Claude for this situation yet."
      : fromClaude.version !== version ? "Written with earlier choices. Ask again to update it." : "Written by Claude from the exported guide. To see whether the guide holds on requests of your own, use \"Test the guide\".";
  } else {
    text = composeText(state, state.situation, lang);
    $("claude-status").textContent = "";
  }
  const sample = $("sample");
  sample.lang = lang;
  if (text) {
    const prevKey = `${source}:${textKey}`;
    sample.innerHTML = sampleHtml(text, newWords(previous[prevKey], text));
    previous[prevKey] = text;
  } else {
    sample.innerHTML = '<p class="empty">Use "Write with Claude" to compare with the built text.</p>';
  }

  const approve = $("approve-claude");
  approve.hidden = source !== "claude" || !fromClaude;
  if (fromClaude) {
    approve.disabled = isApproved(fromClaude.text);
    approve.textContent = approve.disabled ? "In your examples" : "Approve as example";
  }
  const reject = $("reject-claude");
  reject.hidden = approve.hidden;
  const form = $("reject-form");
  form.hidden = !fromClaude || approve.hidden || rejecting !== fromClaude.text;
  if (fromClaude) {
    reject.disabled = isRejected(fromClaude.text);
    reject.textContent = reject.disabled ? "Rejected" : "Reject";
  }
  const approvedCount = state.examples.filter((e) => e.text.trim()).length;
  $("examples-count").textContent = approvedCount ? `(${approvedCount})` : "";
  $("rejected-count").textContent = state.rejected.length ? `(${state.rejected.length})` : "";

  $("meter").innerHTML = text
    ? measure(text, { state, lang, levels: effectiveLevels(state, state.situation), address: effectiveAddress(state, state.situation) }).map((m) => `
      <li class="${m.ok ? "pass" : "fail"}">
        <span class="sign" aria-label="${m.ok ? "within the rule" : "breaks the rule"}">${m.ok ? "✓" : "!"}</span>
        <span class="metric-name">${m.help ? `<abbr title="${escapeHtml(m.help)}">${m.name}</abbr>` : m.name}</span>
        <span>${escapeHtml(m.value)} <span class="detail">(${escapeHtml(m.detail)})</span></span>
      </li>`).join("")
    : "";

  $("warnings").innerHTML = warnings(state).map((w) => `<li>${escapeHtml(w)}</li>`).join("");
  drawRadar();
  drawLadder();
}

// ---------- Guide test ----------

const briefsOf = () => Array.from({ length: MAX_BRIEFS }, (_, i) => i + 1)
  .map((i) => ({ brief: $(`brief-${i}`).value.trim(), situation: pickedSituation($(`brief-box-${i}`)) }))
  .filter((b) => b.brief);

// What the request tells the model about the situation: a built-in one with
// what it covers, so the guide's tone shift applies; a label of the user's own as is.
function briefSituation(tag) {
  const s = allSituations(state).find((x) => x.id === tag);
  return s ? `${s.name}${s.when ? ` (${s.when})` : ""}` : tag === "general" ? "" : tag;
}

function drawTestBar() {
  document.querySelectorAll("[data-test-lang]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.testLang === testLang)));
  const n = briefsOf().length;
  $("test-cost").textContent = n
    ? `${testCalls(n)} calls to Claude: ${n === 1 ? "one text" : `${n} texts`}, then one blind reading of ${n === 1 ? "it" : "them together"}.`
    : "Nothing is sent until you run it.";
  $("run-test").textContent = n ? `Run the test (${testCalls(n)} calls)` : "Run the test";
}

const SIGN = { exact: ["✓", "same level"], close: ["≈", "one level off"], missed: ["!", "two or more levels off"] };

function scoreHtml(test) {
  const r = test.result;
  const level = (a) => (a.lo === a.hi ? String(a.lo) : `${a.lo}–${a.hi}`);
  const moved = (a) => a.lo !== a.base || a.hi !== a.base;
  const missed = r.axes.filter((a) => a.verdict === "missed");
  const words = test.texts.map((t) => t.text).join(" ").split(/\s+/).filter(Boolean).length;
  return `
    <p class="test-score"><b>The guide carried ${r.carried} of ${r.total} axes</b> <span>(${r.exact} on the same level, ${r.carried - r.exact} one level off)</span></p>
    <p>${r.mismatches.length
      ? `<b>Didn't match:</b> ${r.mismatches.map((m) => `${m.title.toLowerCase()} (set ${escapeHtml(m.set)}, read ${escapeHtml(m.read)})`).join("; ")}.`
      : "Who speaks, who it talks to, the role and the finish all match."}</p>
    ${missed.length ? `<p>Where an axis missed, the guide's rule for it isn't coming through. Look at the approved examples first: the model imitates them more than the rules, so an example that leans the other way pulls the text with it.</p>` : ""}
    <div class="table-scroll">
      <table class="test-table">
        <thead><tr><th scope="col">Axis</th><th scope="col">Set</th><th scope="col">Read</th><th scope="col">Why the reader placed it there</th></tr></thead>
        <tbody>${r.axes.map((a) => `
          <tr class="${a.verdict}">
            <th scope="row"><span class="sign" title="${SIGN[a.verdict][1]}">${SIGN[a.verdict][0]}</span> ${a.name}<span class="visually-hidden">, ${SIGN[a.verdict][1]}</span></th>
            <td>${level(a)}${moved(a) ? ` <span class="detail">(base ${a.base}, moved by the situation)</span>` : ""}</td>
            <td>${a.read ?? "–"}${a.toward ? ` <span class="detail">(more ${a.toward.toLowerCase()})</span>` : ""}</td>
            <td>${escapeHtml(a.reason)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
    ${test.reading.adjectives?.length ? `<p><b>Voice the reader found:</b> ${escapeHtml(test.reading.adjectives.join(", "))}.${test.reading.note ? ` ${escapeHtml(test.reading.note)}` : ""}</p>` : ""}
    <p class="note">How it's scored: an axis counts as carried when the blind reading lands within one level of the setting (✓ same level, ≈ one level off, ! two or more). Who speaks, who it talks to and the role must match. The finish counts as kept when the texts stay within its limits: no exclamation mark at all under "one per text" is fine.${words < 150 ? ` The texts add up to ${words} words; a reading on fewer than 150 is rough, so take one level either way as noise.` : ""}</p>`;
}

function testTextsHtml(test) {
  return test.texts.map((t, i) => {
    const fails = meterFailures(test.state, t.situation, test.lang, t.text);
    const approved = isApproved(t.text);
    const rejected = isRejected(t.text);
    return `
      <article class="test-text">
        <p class="test-brief"><b>Request ${i + 1}</b>${t.situation === "general" ? "" : ` · ${escapeHtml(situationName(t.situation, allSituations(state)))}`}: ${escapeHtml(t.brief)}</p>
        <div class="test-sample" lang="${test.lang}">${sampleHtml(t.text, new Set())}</div>
        ${fails.length
          ? `<ul class="test-meter" aria-label="Verifiable rules this text breaks">${fails.map((m) => `
            <li><span class="sign" aria-hidden="true">!</span><span><b>${m.name}:</b> ${escapeHtml(m.value)} <span class="detail">(${escapeHtml(m.detail)})</span></span></li>`).join("")}</ul>`
          : '<p class="test-pass"><span class="sign" aria-hidden="true">✓</span> Passes every verifiable rule.</p>'}
        <div class="reject-actions">
          <button type="button" class="button small" data-approve-test="${i}"${approved ? " disabled" : ""}>${approved ? "In your examples" : "Approve as example"}</button>
          <button type="button" class="button small" data-reject-test="${i}"${rejected ? " disabled" : ""}>${rejected ? "Rejected" : "Reject"}</button>
        </div>
        ${rejecting === t.text && !rejected ? `
        <form class="reject-form" data-reject-form="${i}">
          <label class="field"><span>Why not? A short reason, naming what is wrong with the way it's written</span>
            <input type="text" data-field="reason" maxlength="200" autocomplete="off" placeholder="For example: opens with a greeting and a question">
          </label>
          <div class="reject-actions"><button type="submit" class="button small">Reject this text</button><button type="button" class="button small" data-reject-cancel>Cancel</button></div>
        </form>` : ""}
      </article>`;
  }).join("");
}

function drawTest() {
  const test = lastTest;
  $("test-result").innerHTML = !test ? "" : `
    ${test.result ? scoreHtml(test) : ""}
    <h3 class="test-heading">Texts Claude wrote with the guide</h3>
    ${testTextsHtml(test)}`;
}

// ---------- Diagnosis ----------

// The habits the diagnosis found, each with its evidence and the texts it was
// seen in. The ones that feed a brand field get a box, ticked when more than
// one text shows the habit (or when there was only one text to read).
function habitsHtml(habits, count, textLang) {
  if (!habits.length) return '<p class="note">No habits specific enough to report: the texts don\'t share an opening, a closing, a word or a pattern the diagnosis could point to. More texts, of different kinds, help.</p>';
  const numbers = (list) => (list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list.at(-1)}` : String(list[0]));
  const seen = (h) => (!h.texts.length || count === 1 ? "" : h.texts.length === 1 ? `one text only, text ${h.texts[0]}` : `texts ${numbers(h.texts)}`);
  const row = (h, i) => `
    <li>
      <label class="check">
        ${h.field ? `<input type="checkbox" data-habit="${i}"${h.texts.length > 1 || count === 1 ? " checked" : ""}>` : ""}
        <span><b>${HABIT_LABELS[h.kind]}:</b> ${escapeHtml(h.habit)}${h.evidence ? ` <q lang="${textLang}">${escapeHtml(h.evidence)}</q>` : ""}${seen(h) ? ` <small>(${seen(h)})</small>` : ""}</span>
      </label>
    </li>`;
  const applicable = habits.map((h, i) => [h, i]).filter(([h]) => h.field);
  const moves = habits.map((h, i) => [h, i]).filter(([h]) => !h.field);
  return `
    <h3 class="habits-title">Habits found in the texts</h3>
    ${applicable.length ? `
    <p>What makes this voice its own, beyond the sliders. Tick the ones to add to the brand fields (opening, closing, "we never", word pairs and preferred words); the ones seen in more than one text start ticked.</p>
    <ul class="habits">${applicable.map(([h, i]) => row(h, i)).join("")}</ul>
    <button type="button" class="button" id="apply-habits">Add the ticked habits to the brand fields</button>` : ""}
    ${moves.length ? `
    <p>${applicable.length ? "Also noticed, in" : "In"} punctuation, formatting and sentence shape. There's no field for these yet: put the ones that matter into the essence or "we never" by hand.</p>
    <ul class="habits">${moves.map(([h, i]) => row(h, i)).join("")}</ul>` : ""}`;
}

function save() {
  store(STATE_KEY, JSON.stringify(state));
  history.replaceState(null, "", `#v=${encode(linkState(state))}`);
  draw();
}
function changed() {
  version++;
  save();
}

// ---------- Events ----------

function bindEvents() {
  document.querySelector(".controls").addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.type === "range") {
      const id = el.id.replace("axis-", "");
      state.axes[id] = Number(el.value);
      lastAxis = id;
    } else if (el.type === "radio") {
      state[el.name] = el.value;
    } else if (TEXT_FIELDS.includes(el.id)) {
      state[el.id] = el.value;
    } else return;
    changed();
  });
  document.querySelector(".controls").addEventListener("focusin", (ev) => {
    if (ev.target.type === "range") { lastAxis = ev.target.id.replace("axis-", ""); drawLadder(); }
  });

  $("presets").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-preset]")?.dataset.preset;
    if (!id) return;
    state = normalize({ ...state, ...clone(PRESETS.find((p) => p.id === id).state) });
    syncControls();
    changed();
  });

  $("randomize").addEventListener("click", () => {
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    for (const [id, g] of Object.entries({ ...FOUNDATION, ...FINISH })) state[id] = pick(g.options).id;
    for (const a of AXES) state.axes[a.id] = 1 + Math.floor(Math.random() * 5);
    syncControls();
    changed();
  });

  $("situations").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-situation]")?.dataset.situation;
    if (id) { state.situation = id; changed(); }
  });
  $("languages").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-lang]")?.dataset.lang;
    if (id) { lang = id; store(LANG_KEY, id); draw(); }
  });
  $("sources").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-source]")?.dataset.source;
    if (id) { source = id; draw(); }
  });

  // Situations: switch built-ins on and off, add and edit the brand's own
  $("situation-list").addEventListener("change", (ev) => {
    const el = ev.target;
    if (el.dataset.builtin) {
      const hidden = new Set(state.hiddenSituations);
      el.checked ? hidden.delete(el.dataset.builtin) : hidden.add(el.dataset.builtin);
      state.hiddenSituations = SITUATIONS.filter((s) => hidden.has(s.id)).map((s) => s.id);
      renderSituations();
      situationsChanged();
    } else if (el.dataset.shiftAxis) {
      const own = state.customSituations[el.closest(".example").dataset.index];
      Number(el.value) ? (own.shift[el.dataset.shiftAxis] = Number(el.value)) : delete own.shift[el.dataset.shiftAxis];
      changed();
    }
  });
  $("situation-list").addEventListener("input", (ev) => {
    const el = ev.target;
    if (el.dataset.field !== "name" && el.dataset.field !== "when") return;
    state.customSituations[el.closest(".example").dataset.index][el.dataset.field] = el.value;
    situationsChanged();
  });
  $("situation-list").addEventListener("click", (ev) => {
    const box = ev.target.closest("[data-remove-situation]")?.closest(".example");
    if (!box) return;
    const own = state.customSituations[box.dataset.index];
    if ((own.name.trim() || own.when.trim()) && !confirm("Remove this situation? Texts tagged with it become General.")) return;
    state.customSituations.splice(Number(box.dataset.index), 1);
    // the texts tagged with the removed one become General
    for (const e of [...state.examples, ...state.rejected]) e.situation = situationTag(e.situation, allSituations(state));
    renderSituations();
    situationsChanged();
  });
  $("add-situation").addEventListener("click", () => {
    state.customSituations.push({ id: newSituationId(), name: "", when: "", shift: {} });
    renderSituations();
    changed();
    $("situation-list").querySelector(".example:last-child input").focus();
  });

  // Approved examples
  $("add-example").addEventListener("click", () => {
    state.examples.push({ text: "", situation: "general", lang, source: "pasted" });
    renderExamples();
    changed();
    $("examples").querySelector(".example:last-child textarea").focus();
  });
  // Both lists (approved and rejected) are edited the same way.
  const bindList = (id, list, render) => {
    $(id).addEventListener("input", (ev) => {
      const el = ev.target;
      const box = el.closest(".example");
      if (!box) return;
      const example = state[list][box.dataset.index];
      const field = el.dataset.field;
      if (field === "text") {
        // a text pasted into an empty example picks its own language
        if (ev.inputType === "insertFromPaste" && !example.text.trim()) {
          example.lang = guessLang(el.value);
          box.querySelector('[data-field="lang"]').value = el.lang = example.lang;
        }
        example.text = el.value;
      } else if (field === "situation" || field === "label") {
        if (field === "situation") togglePicker(el);
        example.situation = pickedSituation(box);
      } else if (field === "lang") {
        example.lang = box.querySelector("textarea").lang = el.value;
      } else if (field === "note" || field === "reason") {
        example[field] = el.value;
      } else return;
      changed();
    });
    $(id).addEventListener("click", (ev) => {
      const box = ev.target.closest("[data-remove]")?.closest(".example");
      if (!box) return;
      if (state[list][box.dataset.index].text.trim() && !confirm(`Remove this text from the ${list === "examples" ? "approved examples" : "rejected texts"}?`)) return;
      state[list].splice(Number(box.dataset.index), 1);
      render();
      changed();
    });
  };
  bindList("examples", "examples", renderExamples);
  bindList("rejected", "rejected", renderRejected);
  $("approve-claude").addEventListener("click", () => {
    const fromClaude = claudeTexts[`${state.situation}:${lang}`];
    if (fromClaude) approveExample(fromClaude.text, state.situation, lang);
  });
  $("reject-claude").addEventListener("click", () => {
    const fromClaude = claudeTexts[`${state.situation}:${lang}`];
    if (!fromClaude) return;
    rejecting = fromClaude.text;
    draw();
    $("reject-reason").focus();
  });
  $("reject-cancel").addEventListener("click", () => { rejecting = null; $("reject-reason").value = ""; draw(); });
  $("reject-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fromClaude = claudeTexts[`${state.situation}:${lang}`];
    const reason = $("reject-reason").value;
    if (!fromClaude) return;
    if (!oneLine(reason)) { $("reject-reason").focus(); return; }
    rejectExample(fromClaude.text, reason, state.situation, lang);
    $("reject-reason").value = "";
    draw();
  });

  // API key
  const saveKey = () => store(API_KEY, $("remember-key").checked && $("api-key").value.trim() ? $("api-key").value.trim() : null);
  $("api-key").addEventListener("change", saveKey);
  $("remember-key").addEventListener("change", saveKey);
  const apiKey = () => {
    const k = $("api-key").value.trim();
    if (!k) { $("api-key").focus(); throw new Error("Paste your Anthropic API key in the \"With Claude\" panel."); }
    return k;
  };

  $("write-with-claude").addEventListener("click", async () => {
    const button = $("write-with-claude");
    const situation = allSituations(state).find((s) => s.id === state.situation);
    const askedAt = version;
    try {
      const k = apiKey();
      button.disabled = true;
      source = "claude";
      $("claude-status").textContent = "Writing…";
      document.querySelectorAll("[data-source]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.source === "claude")));
      const text = await write(k, buildGuide(state, lang), situation, !!state.business.trim());
      claudeTexts[`${situation.id}:${lang}`] = { text, version: askedAt };
      draw();
    } catch (error) {
      $("claude-status").textContent = errorMessage(error);
    } finally {
      button.disabled = false;
    }
  });

  // Export
  const showGuide = () => {
    $("guide").value = buildGuide(state, guideLang);
    document.querySelectorAll("[data-guide-lang]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.guideLang === guideLang)));
    const own = state.examples.filter((e) => e.text.trim() && e.lang === guideLang).length;
    const other = state.examples.filter((e) => e.text.trim()).length - own;
    $("export-note").textContent = "Paste this text as a system prompt (in Claude, under Projects or Styles). " + (own
      ? `Its examples are your ${own} approved text${own === 1 ? "" : "s"} in this language${other ? `; the ${other} in the other language stay${other === 1 ? "s" : ""} out` : ""}. The link to this voice carries the settings but not the examples; download the settings to keep those.`
      : other
        ? `Its examples are your ${other} approved text${other === 1 ? "" : "s"}, which are in the other language; the guide asks the model to carry their voice over.`
        : "There are no approved texts yet, so the examples are stock illustrations about a fictional product. Add the brand's real texts under \"Approved examples\" to make the guide its own.");
  };
  $("open-export").addEventListener("click", () => {
    // the examples' language, else the one being previewed
    guideLang = guideLanguage(state, lang);
    showGuide();
    $("export-status").textContent = "";
    $("export").showModal();
  });
  $("guide-languages").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-guide-lang]")?.dataset.guideLang;
    if (id) { guideLang = id; showGuide(); }
  });
  const notify = (msg) => { $("export-status").textContent = msg; };
  const copy = async (text, msg) => {
    try { await navigator.clipboard.writeText(text); notify(msg); }
    catch { notify("Couldn't copy automatically. Select the text and copy it by hand."); }
  };
  const download = (name, content, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const slug = () => slugOf(state.brand);
  $("copy-guide").addEventListener("click", () => copy($("guide").value, "Guide copied."));
  $("download-guide").addEventListener("click", () => download(`voice-guide-${slug()}-${guideLang}.md`, $("guide").value, "text/markdown"));
  const build = async (make, name, type) => {
    try { download(name, await make(), type); notify("Downloaded."); }
    catch (error) { notify(`Couldn't build the file: ${error.message}`); }
  };
  $("download-checker").addEventListener("click", () => build(() => buildChecker(state, guideLang), CHECKER_FILE, "text/javascript"));
  $("download-skill").addEventListener("click", () => build(() => buildSkillZip(state, guideLang), `voice-${slug()}-${guideLang}-skill.zip`, "application/zip"));
  $("download-config").addEventListener("click", () => download(`voice-${slug()}.json`, JSON.stringify(state, null, 2), "application/json"));
  $("copy-link").addEventListener("click", () => copy(
    `${location.origin}${location.pathname}#v=${encode(linkState(state))}`,
    state.examples.length || state.rejected.length
      ? "Link copied. Anyone who opens it sees this same voice, without the approved or rejected texts."
      : "Link copied. Anyone who opens it sees this same voice.",
  ));
  $("load-config").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      // Files saved before examples or rejected texts existed keep the ones already here.
      state = normalize({
        ...raw,
        examples: Array.isArray(raw.examples) ? raw.examples : state.examples,
        rejected: Array.isArray(raw.rejected) ? raw.rejected : state.rejected,
      });
      syncControls();
      renderExamples();
      renderRejected();
      changed();
      guideLang = guideLanguage(state, lang);
      showGuide();
      notify("Settings loaded.");
    } catch {
      notify("This file isn't a Brand Voice Creator settings file.");
    }
    ev.target.value = "";
  });

  // Diagnosis
  $("open-diagnosis").addEventListener("click", () => $("diagnosis").showModal());
  $("diagnosis").addEventListener("input", (ev) => { if (ev.target.dataset.field === "situation") togglePicker(ev.target); });
  $("diagnose").addEventListener("click", async () => {
    const pasted = [1, 2, 3]
      .map((i) => ({ text: $(`sample-${i}`).value.trim(), situation: pickedSituation($(`sample-box-${i}`)) }))
      .filter((p) => p.text);
    const texts = pasted.map((p) => p.text);
    const status = $("diagnosis-status");
    if (!texts.length) { status.textContent = "Paste at least one text."; return; }
    const button = $("diagnose");
    try {
      const k = apiKey();
      button.disabled = true;
      status.textContent = texts.join(" ").split(/\s+/).length < 150
        ? "Analyzing… With fewer than 150 words in total, the result tends to be rough."
        : "Analyzing…";
      const r = await diagnose(k, texts);
      const before = clone(state);
      state = normalize({ ...state, speaker: r.speaker, address: r.address, role: r.role, axes: r.axes, sentenceLength: r.sentenceLength, exclamation: r.exclamation, emoji: r.emoji });
      // The texts themselves are the best examples the guide can have.
      const kept = $("keep-samples").checked ? pasted.filter((p) => !isApproved(p.text)) : [];
      for (const p of kept) state.examples.push({ ...p, lang: guessLang(p.text), source: "diagnosed" });
      syncControls();
      renderExamples();
      changed();
      // The habits are not applied on their own: the user ticks the ones to keep.
      const habits = habitList(r.habits, texts.length);
      status.textContent = (kept.length
        ? `Sliders updated. ${kept.length} text${kept.length === 1 ? "" : "s"} added to the approved examples.`
        : "Sliders updated.") + (habits.some((h) => h.field) ? " The habits found are listed below: tick the ones to keep." : "");
      $("diagnosis-result").innerHTML = `
        <p><b>Voice found:</b> ${escapeHtml(r.adjectives.join(", "))}.</p>
        <ul>${AXES.map((a) => `<li><b>${a.name} ${r.axes[a.id]} of 5.</b> ${escapeHtml(r.reasons[a.id])}</li>`).join("")}</ul>
        ${r.note ? `<p>${escapeHtml(r.note)}</p>` : ""}
        ${habitsHtml(habits, texts.length, guessLang(texts.join(" ")))}
        <button type="button" class="button" id="undo-diagnosis">Undo and go back</button>`;
      // Applying the ticked habits adds to the brand fields; undoing puts those fields back.
      let fieldsBefore = null;
      const drawHabits = () => {
        const button = $("apply-habits");
        if (!button) return;
        const applied = fieldsBefore !== null;
        button.textContent = applied ? "Undo: take the habits out of the fields" : "Add the ticked habits to the brand fields";
        $("diagnosis-result").querySelectorAll("[data-habit]").forEach((box) => { box.disabled = applied; });
      };
      $("apply-habits")?.addEventListener("click", () => {
        if (fieldsBefore) {
          Object.assign(state, fieldsBefore);
          fieldsBefore = null;
          status.textContent = "The brand fields are back as they were. The sliders keep the diagnosis.";
        } else {
          const picked = habits.filter((h, i) => $("diagnosis-result").querySelector(`[data-habit="${i}"]`)?.checked);
          if (!picked.length) { status.textContent = "Tick at least one habit to add."; return; }
          const changes = applyHabits(state, picked);
          fieldsBefore = Object.fromEntries(Object.keys(changes).map((f) => [f, state[f]]));
          Object.assign(state, changes);
          const n = Object.keys(changes).length;
          status.textContent = n
            ? `${picked.length} habit${picked.length === 1 ? "" : "s"} added to ${n} brand field${n === 1 ? "" : "s"}. Edit the wording there if it needs it.`
            : "Those habits were already in the brand fields.";
        }
        syncControls();
        changed();
        drawHabits();
      });
      $("undo-diagnosis").addEventListener("click", () => {
        // the sliders and the brand fields go back; the texts stay as examples until removed by hand
        state = { ...before, examples: state.examples, rejected: state.rejected };
        fieldsBefore = null;
        syncControls();
        changed();
        drawHabits();
        status.textContent = kept.length
          ? "Sliders back where they were. The texts stay in the approved examples; remove them there if you don't want them."
          : "Back to where you were.";
      });
    } catch (error) {
      status.textContent = errorMessage(error);
    } finally {
      button.disabled = false;
    }
  });

  // Guide test
  $("open-test").addEventListener("click", () => {
    testLang ??= guideLanguage(state, lang);
    drawTestBar();
    const status = $("test-status");
    if (lastTest && !$("run-test").disabled) {
      status.textContent = lastTest.version !== version
        ? "These results are from earlier settings. Run the test again to check the current guide."
        : "";
    }
    $("test").showModal();
  });
  $("test").addEventListener("input", (ev) => {
    if (ev.target.dataset.field === "situation") togglePicker(ev.target);
    drawTestBar();
  });
  $("test-languages").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-test-lang]")?.dataset.testLang;
    if (id) { testLang = id; drawTestBar(); }
  });
  $("test-result").addEventListener("click", (ev) => {
    const i = ev.target.closest("[data-approve-test]")?.dataset.approveTest;
    if (i == null || !lastTest) return;
    const t = lastTest.texts[i];
    approveExample(t.text, t.situation, lastTest.lang);
    drawTest();
  });
  $("test-result").addEventListener("click", (ev) => {
    const button = ev.target.closest("[data-reject-test], [data-reject-cancel]");
    if (!button || !lastTest) return;
    rejecting = button.dataset.rejectTest != null ? lastTest.texts[button.dataset.rejectTest].text : null;
    drawTest();
    $("test-result").querySelector("[data-reject-form] input")?.focus();
  });
  $("test-result").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const form = ev.target.closest("[data-reject-form]");
    const reason = form?.querySelector("input").value;
    if (!form || !lastTest) return;
    if (!oneLine(reason)) { form.querySelector("input").focus(); return; }
    const t = lastTest.texts[form.dataset.rejectForm];
    rejectExample(t.text, reason, t.situation, lastTest.lang);
    drawTest();
    draw();
  });
  $("run-test").addEventListener("click", async () => {
    const briefs = briefsOf();
    const status = $("test-status");
    if (!briefs.length) { status.textContent = "Write at least one request."; return; }
    const button = $("run-test");
    // The settings at the moment of asking: the reading is compared with these.
    const asked = { version, state: clone(state), lang: testLang };
    try {
      const k = apiKey();
      button.disabled = true;
      lastTest = null;
      rejecting = null;
      drawTest();
      status.textContent = briefs.length === 1 ? "Writing the text…" : `Writing ${briefs.length} texts…`;
      const guide = buildGuide(asked.state, asked.lang);
      const texts = await Promise.all(briefs.map((b) => writeBrief(k, guide, b.brief, briefSituation(b.situation))));
      lastTest = { ...asked, texts: briefs.map((b, i) => ({ ...b, text: texts[i] })), reading: null, result: null };
      drawTest();
      // Blind: the reader gets the texts and the ruler, never the guide, the requests or the settings.
      status.textContent = "Reading the texts blind…";
      const reading = await diagnose(k, texts, { habits: false }); // the sliders only; the habits would cost more and go unused here
      lastTest.reading = reading;
      lastTest.result = compareReading(asked.state, briefs.map((b) => b.situation), reading);
      drawTest();
      status.textContent = "";
    } catch (error) {
      status.textContent = errorMessage(error) + (lastTest && !lastTest.result ? " The texts below were written, but the blind reading didn't run. Run the test again to retry." : "");
    } finally {
      button.disabled = false;
    }
  });
}

buildControls();
syncControls();
renderExamples();
renderRejected();
bindEvents();
draw();
