import { FOUNDATION, AXES, FINISH, SITUATIONS, PRESETS, INITIAL_STATE, allSituations, activeSituations } from "./data.js";
import { composeText, effectiveLevels, effectiveAddress } from "./compose.js";
import { measure, findForbidden } from "./meter.js";
import { buildGuide, guideLanguage, warnings, defaultEssence } from "./guide.js";
import { LANGUAGES, SOURCES, situationName, situationTag, guessLang, oneLine } from "./examples.js";
import { BRAND_FIELDS, MAX, MAX_SHIFT, ignoredPairs, newSituationId } from "./brand.js";
import { buildChecker, buildSkillZip, slugOf, CHECKER_FILE } from "./checker.js";
import { clone, encode, decode, normalize, linkState } from "./state.js";
import { readReply, changesBetween } from "./block.js";
import { startPrompt, continueMessage, writeRequest, hasStartingPoint } from "./prompts.js";

const $ = (id) => document.getElementById(id);
const STATE_KEY = "brand-voice-creator:state";
const LANG_KEY = "brand-voice-creator:lang";
// Where the site used to keep an Anthropic API key, when it called Claude itself.
// It no longer needs one, so a key left there is removed on load.
const OLD_API_KEY = "brand-voice-creator:api-key";

// Local storage can fail (private window, blocked storage); nothing here depends on it.
const store = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const load = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

// The fields typed straight into the state.
const TEXT_FIELDS = ["brand", "article", "essence", "preferred", "forbidden", ...BRAND_FIELDS];

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---------- State ----------

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
let source = "built"; // the preview's text: "built" from stock sentences, or "ai" when pasted from a chat
let lastAxis = "style";
let version = 0; // bumps on every choice; tells whether a text from the AI is stale
const aiTexts = {}; // "situation:lang" -> { text, version }: the texts pasted back from an AI chat
const requestedAt = {}; // "situation:lang" -> the version when its request was copied
let pasting = false; // the box for the AI's text is open over a text already there
let rejecting = null; // the AI text whose reason is being asked for
let chatLang = null; // the language of the conversation; set when the chat dialog first opens
let lastReply = null; // { before, notes, reasons, changes, undone }: the last block applied, for its undo
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

// The tabs follow the situations in use.
function refreshSituations() {
  const active = activeSituations(state);
  if (!active.some((s) => s.id === state.situation)) state.situation = active[0].id;
  $("situations").innerHTML = active.map((s) => `<button type="button" role="tab" data-situation="${s.id}">${escapeHtml(s.name)}</button>`).join("");
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
        <div class="example-foot"><span class="note">Written by your AI, rejected by you</span><button type="button" class="button small" data-remove>Remove</button></div>
      </div>`).join("")
    : '<p class="note">None yet. Use "Reject" on a text your AI wrote, under "From your AI" in the preview.</p>';
}

const sameText = (a) => (e) => e.text.trim() !== a.trim();
const isApproved = (text) => state.examples.some((e) => !sameText(text)(e));
const isRejected = (text) => state.rejected.some((e) => !sameText(text)(e));
// A text is either approved or rejected: choosing again moves it.
function approveExample(text, situation, exampleLang, note = "") {
  if (isApproved(text)) return;
  state.rejected = state.rejected.filter(sameText(text));
  state.examples.push({ text, situation, lang: exampleLang, source: "ai", ...(oneLine(note) && { note: oneLine(note) }) });
  renderExamples();
  renderRejected();
  save(); // not changed(): the text on screen doesn't go stale by being approved
}
function rejectExample(text, reason, situation, exampleLang) {
  if (isRejected(text)) return;
  state.examples = state.examples.filter(sameText(text));
  state.rejected.push({ text, reason: oneLine(reason), situation, lang: exampleLang, source: "ai" });
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
  const summary = situation.summary || `${situation.when || "Your own situation"}. The built text is a stock illustration at this tone, not about this situation; your AI writes the real one ("Copy the request for your AI")`;
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
  const fromAi = aiTexts[textKey];
  let text;
  if (source === "ai") {
    text = fromAi?.text || "";
    $("ai-status").textContent = !fromAi
      ? "Copy the request, paste it in any AI chat, then paste here the text it writes."
      : fromAi.version !== version ? "Written with earlier choices. Copy the request again to update it." : "Written by your AI with the guide. The rules below check it.";
  } else {
    text = composeText(state, state.situation, lang);
    $("ai-status").textContent = "";
  }
  const sample = $("sample");
  sample.lang = lang;
  if (text) {
    const prevKey = `${source}:${textKey}`;
    sample.innerHTML = sampleHtml(text, newWords(previous[prevKey], text));
    previous[prevKey] = text;
  } else {
    sample.innerHTML = '<p class="empty">No text from your AI for this situation in this language yet.</p>';
  }

  const approve = $("approve-ai");
  approve.hidden = source !== "ai" || !fromAi;
  if (fromAi) {
    approve.disabled = isApproved(fromAi.text);
    approve.textContent = approve.disabled ? "In your examples" : "Approve as example";
  }
  const reject = $("reject-ai");
  reject.hidden = approve.hidden;
  const form = $("reject-form");
  form.hidden = !fromAi || approve.hidden || rejecting !== fromAi.text;
  if (fromAi) {
    reject.disabled = isRejected(fromAi.text);
    reject.textContent = reject.disabled ? "Rejected" : "Reject";
  }
  // the box for the AI's text: open while there's none, or when asked for another
  $("paste-form").hidden = source !== "ai" || (!!fromAi && !pasting);
  $("paste-cancel").hidden = !fromAi;
  $("paste-ai").hidden = approve.hidden || pasting;
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

// ---------- Your AI chat ----------

// The request for a new conversation follows the language picked and whether
// it starts from what's set here (offered only when something is).
function drawChat() {
  document.querySelectorAll("[data-chat-lang]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.chatLang === chatLang)));
  const any = hasStartingPoint(state);
  const box = $("from-here");
  $("from-here-box").hidden = !any;
  if (!any) box.checked = false;
  const texts = state.examples.filter((e) => e.text.trim()).length;
  $("from-here-label").textContent = `Start from what's set here: the voice${texts ? ` and ${texts} approved text${texts === 1 ? "" : "s"}` : ""}. Untick to start from scratch.`;
  $("start-preview").value = startPrompt(state, { lang: chatLang, fromHere: box.checked });
}

// What the last block changed, with the AI's evidence where it gave any, and what it left out.
function drawReply() {
  const r = lastReply;
  if (!r) { $("reply-result").innerHTML = ""; return; }
  $("reply-result").innerHTML = `
    ${r.changes.length ? `<ul class="changes">${r.changes.map((c) => `
      <li><b>${escapeHtml(c.label)}:</b> ${escapeHtml(c.change)}${r.reasons[c.id] ? ` <span class="detail">${escapeHtml(r.reasons[c.id])}</span>` : ""}</li>`).join("")}
    </ul>` : ""}
    ${r.notes.length ? `<p class="notes-title">Left out or adjusted:</p><ul class="notes">${r.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>` : ""}
    ${r.changes.length ? `<button type="button" class="button small" id="undo-reply"${r.undone ? " disabled" : ""}>${r.undone ? "Undone" : "Undo"}</button>` : ""}`;
}

// The clipboard, with the old way as a fallback for browsers that block it.
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  const area = Object.assign(document.createElement("textarea"), { value: text, readOnly: true });
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  // inside an open dialog, since a modal one makes the rest of the page inert
  (document.querySelector("dialog[open]") || document.body).append(area);
  area.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch {}
  area.remove();
  return ok;
}

// The whole state changed at once (a block, a file, an undo): every control follows.
function reload() {
  syncControls();
  renderExamples();
  renderRejected();
  changed();
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
    if (id) { state.situation = id; pasting = false; changed(); }
  });
  $("languages").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-lang]")?.dataset.lang;
    if (id) { lang = id; pasting = false; store(LANG_KEY, id); draw(); }
  });
  $("sources").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-source]")?.dataset.source;
    if (id) { source = id; pasting = false; draw(); }
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
  // The preview's text from an AI chat: copy the request, paste the text back
  const aiText = () => aiTexts[`${state.situation}:${lang}`];
  $("copy-request").addEventListener("click", async () => {
    const situation = allSituations(state).find((s) => s.id === state.situation);
    const ok = await copyText(writeRequest(state, lang, situation));
    requestedAt[`${situation.id}:${lang}`] = version;
    source = "ai";
    pasting = true;
    draw();
    $("ai-status").textContent = ok
      ? "Request copied, with the guide in it. Paste it in any AI chat, then paste the text it writes below."
      : "Couldn't copy the request: this browser blocked the clipboard.";
    $("paste-text").focus();
  });
  $("paste-ai").addEventListener("click", () => {
    pasting = true;
    draw();
    $("paste-text").focus();
  });
  $("paste-cancel").addEventListener("click", () => {
    pasting = false;
    $("paste-text").value = "";
    draw();
  });
  $("paste-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const text = $("paste-text").value.trim();
    if (!text) { $("paste-text").focus(); return; }
    const key = `${state.situation}:${lang}`;
    // stale when the voice changed after the request was copied
    aiTexts[key] = { text, version: requestedAt[key] ?? version };
    $("paste-text").value = "";
    pasting = false;
    rejecting = null;
    draw();
  });
  $("approve-ai").addEventListener("click", () => {
    const fromAi = aiText();
    if (fromAi) approveExample(fromAi.text, state.situation, lang);
  });
  $("reject-ai").addEventListener("click", () => {
    const fromAi = aiText();
    if (!fromAi) return;
    rejecting = fromAi.text;
    draw();
    $("reject-reason").focus();
  });
  $("reject-cancel").addEventListener("click", () => { rejecting = null; $("reject-reason").value = ""; draw(); });
  $("reject-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fromAi = aiText();
    const reason = $("reject-reason").value;
    if (!fromAi) return;
    if (!oneLine(reason)) { $("reject-reason").focus(); return; }
    rejectExample(fromAi.text, reason, state.situation, lang);
    $("reject-reason").value = "";
    draw();
  });

  // Export
  const showGuide = () => {
    $("guide").value = buildGuide(state, guideLang);
    document.querySelectorAll("[data-guide-lang]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.guideLang === guideLang)));
    const own = state.examples.filter((e) => e.text.trim() && e.lang === guideLang).length;
    const other = state.examples.filter((e) => e.text.trim()).length - own;
    $("export-note").textContent = "Paste this text as the instructions of a project or a custom assistant in your AI chat, or at the start of a conversation. " + (own
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
  const copy = async (text, msg) => notify(await copyText(text) ? msg : "Couldn't copy automatically. Select the text and copy it by hand.");
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
      reload();
      guideLang = guideLanguage(state, lang);
      showGuide();
      notify("Settings loaded.");
    } catch {
      notify("This file isn't a Brand Voice Creator settings file.");
    }
    ev.target.value = "";
  });

  // Your AI chat: the request that starts a conversation, the block it gives
  // back, and the voice as it stands for the same conversation
  $("open-chat").addEventListener("click", () => {
    chatLang ??= lang;
    $("from-here").checked = hasStartingPoint(state);
    $("start-status").textContent = "";
    $("current-status").textContent = "";
    drawChat();
    $("chat").showModal();
  });
  $("chat-languages").addEventListener("click", (ev) => {
    const id = ev.target.closest("[data-chat-lang]")?.dataset.chatLang;
    if (id) { chatLang = id; drawChat(); }
  });
  $("from-here").addEventListener("change", drawChat);
  $("copy-start").addEventListener("click", async () => {
    const ok = await copyText($("start-preview").value);
    $("start-status").textContent = ok
      ? "Copied. Paste it in a new conversation in your AI chat."
      : "Couldn't copy automatically. Open \"See the request\" below and copy it by hand.";
    if (!ok) $("start-preview").closest("details").open = true;
  });
  $("apply-reply").addEventListener("click", () => {
    const status = $("reply-status");
    const result = readReply($("reply").value, state);
    if (result.error) { status.textContent = result.error; return; }
    const before = clone(state);
    state = result.state;
    const changes = changesBetween(before, state);
    lastReply = { before, notes: result.notes, reasons: result.reasons, changes, undone: false };
    reload();
    drawReply();
    drawChat();
    status.textContent = changes.length
      ? `Applied: ${changes.length} change${changes.length === 1 ? "" : "s"}, listed below. Fine-tune them on the sliders and fields.`
      : "Nothing to change: the block matches the voice already here.";
  });
  $("reply-result").addEventListener("click", (ev) => {
    if (!ev.target.closest("#undo-reply") || !lastReply || lastReply.undone) return;
    state = clone(lastReply.before);
    lastReply.undone = true;
    reload();
    drawReply();
    drawChat();
    $("reply-status").textContent = "Back to the voice you had before this block.";
  });
  $("copy-current").addEventListener("click", async () => {
    const ok = await copyText(continueMessage(state));
    $("current-status").textContent = ok
      ? "Copied. Paste it in the same conversation."
      : "Couldn't copy automatically. Download the settings under \"Export guide\" and attach the file in the conversation.";
  });
}

store(OLD_API_KEY, null);
buildControls();
syncControls();
renderExamples();
renderRejected();
bindEvents();
draw();
