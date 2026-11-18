// Verifiable rules: what can be checked in the text without asking anyone.

// numbers like "2:10" and "1.312" count as one word
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+|[:.,]\p{N}+)*/gu;
const EMOJI = /\p{Extended_Pictographic}/gu;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole-word match that works with accented letters
const wordRe = (alternatives, flags = "giu") => new RegExp(`(?<![\\p{L}'’])(?:${alternatives.join("|")})(?![\\p{L}'’])`, flags);
const count = (text, re) => (text.match(re) || []).length;

export function sentencesOf(text) {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    // greeting lines ("Hi Marina,") are not sentences
    .filter((l) => l && !/,$/.test(l))
    .flatMap((l) => l.split(/(?<=[.!?…])\s+/))
    .map((s) => s.trim())
    .filter((s) => (s.match(WORD) || []).length > 0);
}

// ---------- Readability ----------

// Approximate Portuguese syllable count: vowel nuclei, with the common
// diphthongs counted as one syllable.
export function syllablesPt(word) {
  const w = word.toLowerCase().replace(/[^a-záàâãéêíóôõúüç]/g, "");
  if (!w) return 0;
  const merged = w
    .replace(/(qu|gu)(?=[eéêiíaáoó])/g, "q") // the "u" in "que", "guia" is not a syllable
    .replace(/ãe|ão|õe|ai|ei|oi|ui|au|eu|ou|iu|éu|éi|ói/g, "a");
  // after merging diphthongs, every remaining vowel is a syllable ("di-a", "po-e-ma")
  return Math.max(1, (merged.match(/[aáàâãeéêiíoóôõuúü]/g) || []).length);
}

// Approximate English syllable count: vowel groups, without the silent final "e".
export function syllablesEn(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (trimmed.match(/[aeiouy]{1,2}/g) || []).length);
}

// Portuguese: Flesch adapted by Martins et al. (1996),
// 248.835 − 1.015 × (words per sentence) − 84.6 × (syllables per word).
// English: the original Flesch Reading Ease (206.835 − …) and the Flesch-Kincaid
// US grade level (0.39 × words per sentence + 11.8 × syllables per word − 15.59).
export function flesch(text, lang = "pt") {
  const sentences = sentencesOf(text);
  const words = sentences.flatMap((s) => s.match(WORD) || []);
  if (!sentences.length || !words.length) return null;
  const syl = lang === "en" ? syllablesEn : syllablesPt;
  const spw = words.reduce((sum, w) => sum + syl(w), 0) / words.length;
  const wps = words.length / sentences.length;
  const base = lang === "en" ? 206.835 : 248.835;
  const score = Math.round(Math.min(100, Math.max(0, base - 1.015 * wps - 84.6 * spw)));
  const band = score >= 75 ? "very easy" : score >= 50 ? "easy" : score >= 25 ? "hard" : "very hard";
  const grade = lang === "en" ? Math.max(0, Math.round(0.39 * wps + 11.8 * spw - 15.59)) : null;
  return { score, band, grade };
}

// Suggested readability target by position on the Simple ↔ Technical axis.
export const READABILITY_TARGET = { 1: 65, 2: 55, 3: 45, 4: 30, 5: null };

// ---------- Who speaks and who it talks to ----------

// First person plural verb forms end in -mos; these common words do too, but are not verbs.
const NOT_VERBS_MOS = ["mesmos", "ânimos", "mínimos", "máximos", "próximos", "últimos", "ótimos", "íntimos", "legítimos", "ramos", "termos", "primos", "anônimos", "sinônimos"];

const SPEAKER_MARKERS = {
  pt: {
    i: wordRe(["eu", "me", "meu", "minha", "meus", "minhas", "comigo", "\\p{L}{3,}ei"]),
    we: wordRe(["nós", "nosso", "nossa", "nossos", "nossas", "conosco", "a gente", `(?!(?:${NOT_VERBS_MOS.join("|")})(?![\\p{L}]))\\p{L}{2,}[aeiáé]mos`]),
    team: wordRe(["a equipe", "o time"]),
  },
  en: {
    i: wordRe(["I", "I'm", "I've", "I'll", "I'd", "[Mm]e", "[Mm]y", "[Mm]ine", "[Mm]yself"], "gu"),
    we: wordRe(["we", "we're", "we've", "we'll", "we'd", "us", "our", "ours", "ourselves"]),
    team: wordRe(["the team"]),
  },
};

export function speakerCounts(text, lang, brand) {
  const m = SPEAKER_MARKERS[lang];
  const name = brand.trim();
  return {
    i: count(text, m.i),
    we: count(text, m.we),
    brand: count(text, m.team) + (name ? count(text, wordRe([escapeRe(name)], "gu")) : 0),
  };
}

const ADDRESS_MARKERS = {
  pt: {
    you: wordRe(["você"]),
    youPlural: wordRe(["vocês"]),
    formal: wordRe(["senhor", "senhora", "o\\(a\\) senhor\\(a\\)"]),
  },
  en: {
    you: wordRe(["you", "your", "yours", "yourself", "you're", "you'll", "you've", "you'd"]),
    youPlural: wordRe(["everyone", "folks", "you all", "y'all", "guys"]),
    formal: wordRe(["Dear"], "gu"),
  },
};

export function addressCounts(text, lang) {
  const m = ADDRESS_MARKERS[lang];
  return { you: count(text, m.you), youPlural: count(text, m.youPlural), formal: count(text, m.formal) };
}

// ---------- Certainty and informality ----------

const HEDGES = {
  pt: ["talvez", "pode ser que", "possivelmente", "provavelmente", "geralmente", "em geral", "normalmente", "a ideia é", "deve", "devem", "deveria", "tende a", "tendem a", "acho que", "achamos que", "acreditamos que", "em princípio", "a princípio"],
  en: ["maybe", "perhaps", "might", "possibly", "probably", "usually", "generally", "typically", "should", "tends to", "tend to", "the idea is", "I think", "we think", "we believe", "in principle", "seems to"],
};
const BOOSTERS = {
  pt: ["com certeza", "sem dúvida", "certamente", "sempre", "nunca mais", "garantido", "garantimos", "definitivamente", "absolutamente", "de fato", "claramente", "totalmente", "não volta"],
  en: ["definitely", "certainly", "surely", "always", "never", "guaranteed", "we guarantee", "absolutely", "clearly", "in fact", "totally", "undoubtedly", "will not come back", "won't come back"],
};
const INFORMAL = {
  pt: ["pra", "pro", "tá", "tô", "né", "a gente", "galera", "e aí", "rs", "kkk+", "ha(?:ha)+", "num", "numa", "beleza", "valeu", "grana", "foi mal", "desculpa", "tipo assim"],
  en: ["\\p{L}+'(?:re|ll|ve|d|m)", "\\p{L}+n't", "it's", "how's", "that's", "there's", "let's", "gonna", "wanna", "hey", "folks", "guys", "cool", "awesome", "yeah", "check it out", "our bad", "my bad"],
};

export const listOf = (field) => field.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);

export function findForbidden(text, forbidden) {
  return listOf(forbidden).filter((term) => wordRe([escapeRe(term)], "iu").test(text));
}

// ---------- Measuring ----------

const SPEAKER_NAME = { i: "\"I\"", we: "\"we\"", brand: "the brand" };
const ADDRESS_NAME = { you: "you (você)", youPlural: "you all (vocês)", formal: "formal you (o senhor)", impersonal: "impersonal" };

export function measure(text, { state, lang = "pt", levels, address }) {
  const sentences = sentencesOf(text);
  const lengths = sentences.map((s) => (s.match(WORD) || []).length);
  const words = lengths.reduce((a, b) => a + b, 0);
  const mean = lengths.length ? words / lengths.length : 0;
  const limit = { short: 12, medium: 20, long: null }[state.sentenceLength];
  const tooLong = limit ? lengths.filter((t) => t > limit).length : 0;
  const rows = [];

  // Who speaks: the dominant marker must match the choice (nothing detected is fine)
  const sp = speakerCounts(text, lang, state.brand);
  const top = Object.entries(sp).sort((a, b) => b[1] - a[1])[0];
  const detected = top[1] > 0 ? top[0] : null;
  rows.push({
    name: "Who speaks",
    value: detected ? `mostly ${SPEAKER_NAME[detected]}` : "not detected",
    ok: !detected || detected === state.speaker,
    detail: `expected ${SPEAKER_NAME[state.speaker]}; I ${sp.i}, we ${sp.we}, brand ${sp.brand}`,
    help: "Counts first-person pronouns and verb forms (\"I\", \"we\", \"lançamos\") and mentions of the brand name. Passes when the most frequent one matches the choice.",
  });

  // Who it talks to: no marker of a different address may appear
  const body = text.replace(/^[^\n]{0,40}[,?]\s*\n\n/, "");
  const ad = addressCounts(body, lang);
  let conflicts;
  if (address === "impersonal") conflicts = ad.you + ad.youPlural + (lang === "pt" ? ad.formal : 0);
  else if (lang === "en") conflicts = address === "youPlural" ? 0 : ad.youPlural;
  else conflicts = Object.entries(ad).filter(([k]) => k !== address).reduce((s, [, v]) => s + v, 0);
  const found = Object.entries(ad).filter(([, v]) => v).map(([k, v]) => `${ADDRESS_NAME[k]} ${v}`);
  rows.push({
    name: "Reader",
    value: found.length ? found.join(", ") : "no direct address",
    ok: conflicts === 0,
    detail: `expected ${ADDRESS_NAME[address]}`,
    help: lang === "en"
      ? "Looks for \"you\" and group greetings. English has one \"you\", so the check mostly catches an impersonal voice that slips into addressing the reader."
      : "Looks for \"você\", \"vocês\" and \"o(a) senhor(a)\". Passes when no form other than the chosen one appears.",
  });

  rows.push({
    name: "Sentences",
    value: `${sentences.length}, average ${mean.toFixed(0)} words`,
    ok: tooLong === 0,
    detail: limit ? (tooLong ? `${tooLong} over ${limit} words` : `all within ${limit} words`) : "no limit",
  });

  // Rhythm: coefficient of variation of sentence length
  let cv = null;
  if (lengths.length >= 3) {
    const sd = Math.sqrt(lengths.reduce((s, l) => s + (l - mean) ** 2, 0) / lengths.length);
    cv = sd / mean;
  }
  const lyrical = levels.style >= 4;
  rows.push({
    name: "Rhythm",
    value: cv == null ? "too few sentences" : `${cv.toFixed(2)}, ${cv < 0.2 ? "flat" : cv < 0.45 ? "moderate" : "varied"}`,
    ok: cv == null || (cv >= 0.2 && (!lyrical || cv >= 0.25)),
    detail: lyrical ? "lyrical style: target 0.25 or more" : "below 0.20 reads monotonous",
    help: "How much sentence length varies (standard deviation divided by the average). Sentences that are all the same length read flat, a common tell of machine-written text.",
  });

  const r = flesch(text, lang);
  const target = READABILITY_TARGET[levels.technicality];
  rows.push({
    name: "Readability",
    value: !r ? "no text" : `${r.score}, ${r.band}${r.grade != null ? ` (US grade ${r.grade})` : ""}`,
    ok: !r || target == null || r.score >= target,
    detail: target == null ? "no target for technical text" : `target: ${target} or more`,
    help: lang === "en"
      ? "Flesch Reading Ease, 0 to 100: higher is easier. In brackets, Flesch-Kincaid: the US school grade that can read the text. Only looks at sentence and word length; syllable counting is approximate."
      : "Flesch adapted for Portuguese (Martins et al., 1996), 0 to 100: higher is easier. Only looks at sentence and word length; syllable counting is approximate.",
  });

  // Certainty: hedges against boosters
  const hedges = count(text, wordRe(HEDGES[lang]));
  const boosters = count(text, wordRe(BOOSTERS[lang]));
  const c = levels.certainty;
  rows.push({
    name: "Certainty",
    value: `${hedges} hedge${hedges === 1 ? "" : "s"}, ${boosters} booster${boosters === 1 ? "" : "s"}`,
    ok: c <= 2 ? hedges > 0 : c >= 4 ? hedges === 0 : true,
    detail: c <= 2 ? "cautious voice: needs at least one hedge" : c >= 4 ? "assertive voice: no hedges" : "balanced: no rule",
    help: "Hedges soften a claim (\"maybe\", \"should\", \"a ideia é\"); boosters harden it (\"always\", \"definitely\", \"nunca mais\"). Word lists, so expect the odd false hit.",
  });

  // Informality markers
  const informal = count(text, wordRe(INFORMAL[lang]));
  const formalVoice = levels.formality <= 2;
  rows.push({
    name: "Informality",
    value: `${informal} marker${informal === 1 ? "" : "s"}`,
    ok: !formalVoice || informal === 0,
    detail: formalVoice ? "formal voice: none allowed" : "allowed",
    help: lang === "en"
      ? "Contractions and colloquial words (\"we're\", \"hey\", \"folks\", \"check it out\")."
      : "Colloquial words and contractions (\"pra\", \"tá\", \"a gente\", \"galera\", \"foi mal\").",
  });

  const exclamations = count(text, /!/g);
  const maxExc = { never: 0, one: 1, free: Infinity }[state.exclamation];
  rows.push({ name: "Exclamation marks", value: String(exclamations), ok: exclamations <= maxExc, detail: maxExc === Infinity ? "free" : `limit: ${maxExc}` });

  const emojis = count(text, EMOJI);
  const maxEmoji = { never: 0, one: 1, free: Infinity }[state.emoji];
  rows.push({ name: "Emoji", value: String(emojis), ok: emojis <= maxEmoji, detail: maxEmoji === Infinity ? "free" : `limit: ${maxEmoji}` });

  const forbidden = findForbidden(text, state.forbidden);
  rows.push({
    name: "Forbidden words",
    value: forbidden.length ? forbidden.join(", ") : "none",
    ok: forbidden.length === 0,
    detail: listOf(state.forbidden).length ? `${listOf(state.forbidden).length} on the list` : "empty list",
  });

  return rows;
}
