import { FOUNDATION, AXES, FINISH, SITUATIONS, PRESETS, INITIAL_STATE } from "./data.js";
import { composeText, effectiveLevels, effectiveAddress } from "./compose.js";
import { measure, findForbidden } from "./meter.js";
import { buildGuide, warnings, defaultEssence } from "./guide.js";
import { write, diagnose, errorMessage } from "./claude.js";

const $ = (id) => document.getElementById(id);
const STATE_KEY = "brand-voice-creator:state";
const API_KEY = "brand-voice-creator:api-key";
const LANG_KEY = "brand-voice-creator:lang";

// Local storage can fail (private window, blocked storage); nothing here depends on it.
const store = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
const load = (k) => { try { return localStorage.getItem(k); } catch { return null; } };

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
  if (!SITUATIONS.some((x) => x.id === s.situation)) s.situation = "launch";
  s.applyShift = s.applyShift !== false;
  return s;
}
function initialState() {
  const hash = location.hash.match(/v=([\w-]+)/);
  if (hash) { try { return normalize(decode(hash[1])); } catch {} }
  const saved = load(STATE_KEY);
  if (saved) { try { return normalize(JSON.parse(saved)); } catch {} }
  return clone(INITIAL_STATE);
}

let state = initialState();
let lang = load(LANG_KEY) === "pt" ? "pt" : "en";
let source = "built";
let lastAxis = "style";
let version = 0; // bumps on every choice; tells whether Claude's text is stale
const claudeTexts = {}; // "situation:lang" -> { text, version }
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

  $("situations").innerHTML = SITUATIONS.map((s) => `<button type="button" role="tab" data-situation="${s.id}">${s.name}</button>`).join("");

  const key = load(API_KEY);
  if (key) { $("api-key").value = key; $("remember-key").checked = true; }
}

function syncControls() {
  for (const id of ["brand", "article", "essence", "preferred", "forbidden"]) $(id).value = state[id];
  for (const id of [...Object.keys(FOUNDATION), ...Object.keys(FINISH)]) {
    const radio = document.querySelector(`input[name="${id}"][value="${state[id]}"]`);
    if (radio) radio.checked = true;
  }
  for (const a of AXES) $(`axis-${a.id}`).value = state.axes[a.id];
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
  const situation = SITUATIONS.find((s) => s.id === state.situation);
  const shifts = Object.entries(situation.shift);
  const box = $("shift");
  if (!shifts.length) { box.innerHTML = `<span>${escapeHtml(situation.summary)}. Base voice, no tone shift here.</span>`; return; }
  const levels = effectiveLevels({ ...state, applyShift: true }, situation.id);
  box.innerHTML = `<span>${escapeHtml(situation.summary)}. Here the tone shifts:</span>${shifts
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
      : fromClaude.version !== version ? "Written with earlier choices. Ask again to update it." : "Written by Claude from the exported guide.";
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

function changed() {
  version++;
  store(STATE_KEY, JSON.stringify(state));
  history.replaceState(null, "", `#v=${encode(state)}`);
  draw();
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
    } else if (["brand", "article", "essence", "preferred", "forbidden"].includes(el.id)) {
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
    const situation = SITUATIONS.find((s) => s.id === state.situation);
    const askedAt = version;
    try {
      const k = apiKey();
      button.disabled = true;
      source = "claude";
      $("claude-status").textContent = "Writing…";
      document.querySelectorAll("[data-source]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.source === "claude")));
      const guide = buildGuide(state) + `\n\nAlways write in ${lang === "en" ? "English" : "Brazilian Portuguese"}.`;
      const text = await write(k, guide, situation);
      claudeTexts[`${situation.id}:${lang}`] = { text, version: askedAt };
      draw();
    } catch (error) {
      $("claude-status").textContent = errorMessage(error);
    } finally {
      button.disabled = false;
    }
  });

  // Export
  $("open-export").addEventListener("click", () => {
    $("guide").value = buildGuide(state);
    $("export-status").textContent = "";
    $("export").showModal();
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
  const slug = () => (state.brand.trim() || "brand").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
  $("copy-guide").addEventListener("click", () => copy($("guide").value, "Guide copied."));
  $("download-guide").addEventListener("click", () => download(`voice-guide-${slug()}.md`, $("guide").value, "text/markdown"));
  $("download-config").addEventListener("click", () => download(`voice-${slug()}.json`, JSON.stringify(state, null, 2), "application/json"));
  $("copy-link").addEventListener("click", () => copy(`${location.origin}${location.pathname}#v=${encode(state)}`, "Link copied. Anyone who opens it sees this same voice."));
  $("load-config").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    try {
      state = normalize(JSON.parse(await file.text()));
      syncControls();
      changed();
      $("guide").value = buildGuide(state);
      notify("Settings loaded.");
    } catch {
      notify("This file isn't a Brand Voice Creator settings file.");
    }
    ev.target.value = "";
  });

  // Diagnosis
  $("open-diagnosis").addEventListener("click", () => $("diagnosis").showModal());
  $("diagnose").addEventListener("click", async () => {
    const texts = [1, 2, 3].map((i) => $(`sample-${i}`).value.trim()).filter(Boolean);
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
      syncControls();
      changed();
      status.textContent = "Sliders updated.";
      $("diagnosis-result").innerHTML = `
        <p><b>Voice found:</b> ${escapeHtml(r.adjectives.join(", "))}.</p>
        <ul>${AXES.map((a) => `<li><b>${a.name} ${r.axes[a.id]} of 5.</b> ${escapeHtml(r.reasons[a.id])}</li>`).join("")}</ul>
        ${r.note ? `<p>${escapeHtml(r.note)}</p>` : ""}
        <button type="button" class="button" id="undo-diagnosis">Undo and go back</button>`;
      $("undo-diagnosis").addEventListener("click", () => {
        state = before;
        syncControls();
        changed();
        status.textContent = "Back to where you were.";
      });
    } catch (error) {
      status.textContent = errorMessage(error);
    } finally {
      button.disabled = false;
    }
  });
}

buildControls();
syncControls();
bindEvents();
draw();
