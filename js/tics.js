// AI tics: patterns that make a text read as machine-written, in English and
// Portuguese, kept to the ones a script can find without many false alarms.
// Patterns of common words fire on density, not on one occurrence. A voice can
// switch any kind off (state.allowedTics): the voice wins over this list.
//
// The lists are our own, short, and informed by blader/humanizer,
// hardikpandya/stop-slop, petergyang/no-ai-slop and tbhb/vale-ai-tells (MIT),
// fabricioctelles/skills "humanizar" (Apache-2.0) and Wikipedia's "Signs of AI
// writing" (CC BY-SA 4.0). Nothing is copied whole.
//
// Import only from text.js: the exported checker puts this file in its script.

import { WORD, escapeRe, wordRe, sentencesOf } from "./text.js";

// A phrase as a pattern: either apostrophe, any run of spaces.
const ticPattern = (p) => escapeRe(p).replace(/'/g, "['’]").replace(/ /g, "\\s+");
const ticWords = (text) => (text.match(WORD) || []).length;
const ticMatches = (text, re) => [...text.matchAll(re)].map((m) => m[0].replace(/\s+/g, " ").trim());
// Letters around a match, for Portuguese, where \b doesn't know accents.
const TIC_L = "\\p{L}";

// A list of phrases, each one enough on its own.
function ticPhrases(lists, extra = {}) {
  const res = {};
  for (const lang of Object.keys(lists)) res[lang] = wordRe(lists[lang].map(ticPattern), "giu");
  return (text, lang) => [...ticMatches(text, res[lang]), ...(extra[lang] ? ticMatches(text, extra[lang]) : [])];
}

// A list of words that are fine alone and tell only when they pile up:
// at least `min` of them, and at least `per100` per hundred words.
function ticDensity(lists, min, per100) {
  const res = {};
  for (const lang of Object.keys(lists)) res[lang] = wordRe(lists[lang], "giu");
  return (text, lang) => {
    const found = ticMatches(text, res[lang]);
    return found.length >= min && (found.length / Math.max(1, ticWords(text))) * 100 >= per100 ? found : [];
  };
}

// A list of exactly three short, parallel items ("fast, simple and cheap",
// "sem cadastro, sem senha e sem espera"): the first list in each sentence,
// read back from its "and" or "or". Strict on purpose: a missed triplet costs
// less than a false alarm.
function ticTriplets(sentence, lang) {
  const conj = lang === "pt" ? /,?\s+(?:e|ou)\s+/u : /,?\s+(?:and|or)\s+/u;
  const m = sentence.match(conj);
  if (!m) return null;
  const c = ticWords(sentence.slice(m.index + m[0].length).split(/[,.;:!?()]/)[0]);
  if (c < 1 || c > 3) return null;
  const parts = sentence.slice(0, m.index).split(/,\s+/);
  const items = [];
  for (let i = parts.length - 1; i >= 0 && ticWords(parts[i]) <= 3; i--) items.unshift(ticWords(parts[i]));
  const head = parts.length > items.length; // a longer clause before the list
  let triplet = false;
  if (items.length === 2) {
    // when the list opens the sentence, its first item may be only the end of the first part
    const a = head ? items[0] : Math.min(items[0], Math.max(items[1], c));
    triplet = Math.max(a, items[1], c) - Math.min(a, items[1], c) <= 1;
  } else if (items.length === 1 && head) {
    // "The newsletter is quick, simple and free": one-word items only
    triplet = items[0] === 1 && c === 1;
  }
  return triplet ? (sentence.length > 70 ? `${sentence.slice(0, 69)}…` : sentence) : null;
}

const TRANSITIONS = {
  en: ["Moreover", "Furthermore", "Additionally", "Consequently", "Subsequently", "Nevertheless", "Nonetheless", "Notably", "Importantly", "Crucially", "Thus", "Hence", "In addition", "As a result", "That said", "Firstly", "Secondly", "Lastly", "Ultimately", "Overall"],
  pt: ["Além disso", "Ademais", "Nesse sentido", "Diante disso", "Dessa forma", "Desta forma", "Sendo assim", "Assim sendo", "Em contrapartida", "Por outro lado", "Não obstante", "Por fim"],
};
// Words skipped when comparing how sentences start: "A newsletter" and "A semana" don't repeat.
const TIC_ARTICLES = new Set(["a", "an", "the", "o", "os", "as", "um", "uma"]);

export const TICS = [
  {
    id: "chatbot",
    label: "Chatbot phrases",
    rule: "No chatbot phrases: no praise for the question, no offers of more help, no \"I hope this helps\".",
    example: { en: "Great question! I hope this helps.", pt: "Ótima pergunta! Espero ter ajudado." },
    fix: "Cut the chatbot phrase; a person writing this wouldn't say it.",
    find: ticPhrases({
      en: ["I hope this helps", "hope this helps", "hopefully this helps", "happy to help", "I'd be happy to help", "I'm here to help", "is there anything else I can", "let me know if you'd like me to", "great question", "excellent question", "that's a great question", "you're absolutely right", "I'm glad you asked", "I couldn't agree more"],
      pt: ["espero ter ajudado", "espero que isso ajude", "espero que isso te ajude", "fico feliz em ajudar", "fique à vontade para perguntar", "posso ajudar em mais alguma coisa", "ótima pergunta", "excelente pergunta", "excelente observação", "você tem toda razão", "obrigado por compartilhar"],
    }, {
      en: /(?:^|[.!?]\s+)(?:Certainly|Absolutely|Of course)!/gm,
    }),
  },
  {
    id: "stock",
    label: "Stock phrases",
    rule: "No stock openers, signposts or summary closers: start with the point and stop when it's made.",
    example: { en: "In today's fast-paced world, let's dive in. In conclusion, …", pt: "No mundo atual, vale ressaltar que… Em suma, …" },
    fix: "Cut the stock phrase and start (or end) with the point itself.",
    find: ticPhrases({
      en: ["in today's fast-paced world", "in today's digital age", "in today's world", "in an ever-changing world", "in the ever-evolving landscape", "in this day and age", "in a world where", "gone are the days", "look no further", "let's dive in", "let's dive into", "let's delve", "let's unpack", "without further ado", "here's what you need to know", "it's worth noting", "it is worth noting", "it's important to note", "it is important to note", "needless to say", "in conclusion", "in summary", "to sum up", "all in all", "let that sink in", "read that again", "make no mistake", "the future looks bright", "only time will tell", "exciting times ahead"],
      pt: ["no mundo atual", "nos dias atuais", "em um mundo cada vez mais", "num mundo cada vez mais", "no cenário atual", "na contemporaneidade", "é inegável que", "vamos mergulhar", "vamos destrinchar", "sem mais delongas", "eis a questão", "vale ressaltar", "vale destacar", "é importante destacar", "é importante ressaltar", "cabe mencionar", "cumpre salientar", "convém observar", "em suma", "em conclusão", "diante do exposto", "o futuro é promissor", "o melhor ainda está por vir", "as possibilidades são infinitas"],
    }),
  },
  {
    id: "puffery",
    label: "Puffery",
    rule: "No inflated significance: say what the thing does, not that it is a milestone, a testament or a pivotal role.",
    example: { en: "This launch stands as a testament to our commitment and plays a pivotal role.", pt: "Este lançamento representa um marco e desempenha um papel fundamental." },
    fix: "Replace the grand phrase with the plain fact it stands for.",
    find: ticPhrases({
      en: ["a testament to", "stands as a testament", "serves as a reminder", "serves as a", "serve as a", "stands as a", "boasts a", "boasts an", "plays a crucial role", "plays a pivotal role", "plays a vital role", "plays a key role", "marks a pivotal moment", "underscores the importance", "paving the way", "setting the stage for", "rich tapestry", "tapestry of", "paradigm shift", "cannot be overstated", "more important than ever", "nestled in", "indelible mark", "delve", "delves", "delving"],
      pt: ["representa um marco", "é um testemunho de", "papel fundamental", "papel crucial", "papel vital", "ressalta a importância", "reflete uma tendência mais ampla", "preparando o terreno", "moldando o futuro", "em constante evolução", "ponto de inflexão", "marca indelével", "profundamente enraizado", "mudança de paradigma", "rica tapeçaria", "tapeçaria de", "configura-se como", "se configura como", "consolida-se como", "se consolida como", "desponta como", "posiciona-se como", "mergulhar em", "mergulhe em"],
    }),
  },
  {
    id: "buzzwords",
    label: "Buzzwords",
    rule: "Few buzzwords: plain words over \"leverage\", \"robust\", \"seamless\", \"ecosystem\", \"journey\".",
    example: { en: "Leverage our robust, seamless ecosystem to unlock your journey.", pt: "Alavanque nosso ecossistema robusto para potencializar sua jornada." },
    fix: "Swap the buzzwords for plain words that say what actually happens.",
    find: ticDensity({
      en: ["crucial", "robust", "seamless(?:ly)?", "leverag\\p{L}*", "unlock\\p{L}*", "empower\\p{L}*", "foster\\p{L}*", "streamlin\\p{L}*", "elevat\\p{L}*", "landscape", "realm", "holistic", "synergy", "transformative", "cutting-edge", "game-chang\\p{L}*", "groundbreaking", "innovative", "ecosystem", "journey", "navigat\\p{L}*", "pivotal", "vibrant", "intricate", "meticulous(?:ly)?", "multifaceted", "paramount", "unparalleled", "enhanc\\p{L}*", "underscor\\p{L}*", "showcas\\p{L}*"],
      pt: ["crucial", "cruciais", "fundamental", "fundamentais", "cenário", "panorama", "ecossistema", "jornada", "robust[oa]s?", "escalável", "multifacetad[oa]s?", "holístic[oa]s?", "sinergia", "paradigma", "disruptiv[oa]s?", "transformador(?:a|es|as)?", "inovador(?:a|es|as)?", "de ponta", "alavanc\\p{L}*", "potencializ\\p{L}*", "impulsion\\p{L}*", "empoder\\p{L}*", "foment\\p{L}*", "desbloque\\p{L}*", "desvend\\p{L}*", "naveg\\p{L}*", "orquestr\\p{L}*", "endereç\\p{L}*", "perform\\p{L}*", "sem fricção", "inegável", "indubitavelmente"],
    }, 3, 1.5),
  },
  {
    id: "contrast",
    label: "Contrast formulas",
    rule: "No contrast formulas: say what it is, without first saying what it is not (\"not just X, but Y\", \"it's not X, it's Y\").",
    example: { en: "It's not just a newsletter, it's a movement.", pt: "Não é apenas uma newsletter, é um movimento." },
    fix: "Say what it is directly, without the \"not X, but Y\" setup.",
    find: (text, lang) => ticMatches(text, lang === "pt"
      ? new RegExp(`(?<!${TIC_L})n[ãa]o (?:[ée] |s[ãa]o |se trata )?(?:apenas|s[óo]|somente|meramente|simplesmente)(?!${TIC_L})[^.!?]{1,80}?(?<!${TIC_L})(?:mas|e sim)(?!${TIC_L})|(?<!${TIC_L})n[ãa]o (?:[ée]|s[ãa]o|foi|era|se trata de)(?!${TIC_L})[^.!?;:—]{1,60}(?:[,;:—]|\\.\\s+)\\s*(?:[ée]|s[ãa]o|foi|era|trata-se de)(?!${TIC_L})`, "giu")
      : /\bnot (?:just|only|merely|simply)\b[^.!?]{1,80}?(?:\bbut\b|[,;:—]\s*(?:it|this|that|they)(?:['’]s| is|['’]re| are)\b)|\b(?:it|this|that)(?:['’]s| is| was) not\b[^.!?;:—]{1,60}[,;:—]\s*(?:it|this|that|they)(?:['’]s| is| was|['’]re| are)\b|\b(?:isn['’]t|is not|aren['’]t|are not|wasn['’]t)\b[^.!?]{1,60}\.\s+(?:It|They|This|That)(?:['’]s|['’]re| is| are| was)\b|\bnot because\b[^.!?]{1,60}\bbecause\b/gi),
  },
  {
    id: "triplets",
    label: "Lists of three",
    rule: "Lists of three only when there are three things: no reflexive \"fast, simple and powerful\" in sentence after sentence.",
    example: { en: "It's fast, simple and powerful. It saves time, money and effort.", pt: "É rápido, simples e poderoso. Economiza tempo, dinheiro e esforço." },
    fix: "Keep the one or two items that matter; drop the reflexive third.",
    find: (text, lang) => {
      const sentences = sentencesOf(text);
      const found = sentences.map((s) => ticTriplets(s, lang)).filter(Boolean);
      return found.length >= 2 && found.length / sentences.length >= 0.2 ? found : [];
    },
  },
  {
    id: "dashes",
    label: "Dashes",
    rule: "Few dashes: a comma, a colon or a full stop usually does the job of \"—\".",
    example: { en: "The issue — finally — is here — and it's good.", pt: "A edição — enfim — chegou — e ficou boa." },
    fix: "Replace most dashes with commas, colons or full stops.",
    find: (text) => {
      // not dialogue dashes at the start of a line, and not ranges such as "10–12"
      const body = text.replace(/^[ \t]*[—–-]+\s*/gm, "").replace(/\d\s?[–-]\s?\d/g, "");
      const found = ticMatches(body, /—|\s–\s|\s--\s/g);
      return found.length >= 3 && (found.length / Math.max(1, ticWords(text))) * 100 >= 1.5 ? found : [];
    },
  },
  {
    id: "reveals",
    label: "Staged reveals",
    rule: "No staged reveals: no \"The result? …\" and no \"Here's the thing:\"; just say it.",
    example: { en: "The result? Five minutes a week. Here's the thing: it works.", pt: "O resultado? Cinco minutos por semana. A grande sacada é: funciona." },
    fix: "State the point in a plain sentence instead of staging it.",
    // "The result? Five minutes." (case matters: a capital opens the answer), and "Here's the thing:"
    find: (text, lang) => lang === "pt"
      ? [...ticMatches(text, /(?:^|[.!?]\s+)(?:O|A) (?:resultado|resposta|segredo|problema|solução|desafio|impacto|detalhe|lição|verdade|motivo)\?\s+\p{Lu}/gmu),
        ...ticMatches(text, new RegExp(`(?<!${TIC_L})(?:eis a questão|a grande sacada é|o ponto central é|aqui está o detalhe|a verdade é simples|o plot twist é)\\s*:`, "giu"))]
      : [...ticMatches(text, /(?:^|[.!?]\s+)The (?:result|answer|solution|catch|problem|reason|truth|reality|takeaway|lesson|fix|secret|kicker)\?\s+\p{Lu}/gmu),
        ...ticMatches(text, /\b(?:here['’]s (?:the thing|the deal|the kicker|the catch|the truth|the secret)|the (?:kicker|catch|twist|bottom line|takeaway) is|plot twist|spoiler alert)\s*[:?]/gi)],
  },
  {
    id: "participle",
    label: "Tacked-on analysis",
    rule: "No tacked-on analysis: no sentence that ends in \", highlighting…\" or \", reinforcing…\".",
    example: { en: "Issues now arrive on Fridays, highlighting our commitment to readers.", pt: "As edições agora chegam às sextas, reforçando nosso compromisso com os leitores." },
    fix: "End the sentence at the fact, or make the claim a sentence of its own with evidence.",
    find: (text, lang) => ticMatches(text, lang === "pt"
      ? new RegExp(`,\\s+(?:destacando|ressaltando|reforçando|evidenciando|consolidando|refletindo|fomentando|sublinhando|simbolizando)(?!${TIC_L})`, "giu")
      : /,\s+(?:highlighting|underscoring|emphasizing|showcasing|reflecting|symbolizing|fostering|cultivating|solidifying|cementing|reinforcing|paving the way|setting the stage)\b/gi),
  },
  {
    id: "transitions",
    label: "Formal transitions",
    rule: "Few formal transitions: let sentences follow each other without \"Moreover\", \"Furthermore\", \"Além disso\" at every start.",
    example: { en: "Moreover, it is short. Furthermore, it is free. Additionally, it has an archive.", pt: "Além disso, é curta. Ademais, é gratuita. Dessa forma, todos ganham." },
    fix: "Drop most of the transitions at the start of sentences; the order already links them.",
    find: (text, lang) => {
      const sentences = sentencesOf(text);
      const starts = sentences.map((s) => TRANSITIONS[lang].find((t) => s.toLowerCase().startsWith(`${t.toLowerCase()},`) || s.toLowerCase().startsWith(`${t.toLowerCase()} `))).filter(Boolean);
      const repeated = starts.some((t, i) => starts.indexOf(t) !== i);
      return starts.length >= 3 || repeated || (starts.length >= 2 && starts.length / sentences.length > 0.25) ? starts : [];
    },
  },
  {
    id: "openings",
    label: "Repeated openings",
    rule: "Vary how sentences start: never three in a row with the same first word.",
    example: { en: "We write it. We send it. We read every reply.", pt: "Nós escrevemos. Nós enviamos. Nós respondemos." },
    fix: "Rewrite one of the sentences so it starts differently.",
    find: (text) => {
      const firsts = sentencesOf(text).map((s) => {
        const words = s.toLowerCase().match(/[\p{L}'’]+/gu) || [];
        return TIC_ARTICLES.has(words[0]) ? `${words[0]} ${words[1] ?? ""}`.trim() : words[0];
      });
      const runs = [];
      for (let i = 2; i < firsts.length; i++) {
        if (firsts[i] && firsts[i] === firsts[i - 1] && firsts[i] === firsts[i - 2] && !runs.includes(firsts[i])) runs.push(firsts[i]);
      }
      return runs.map((w) => `"${w}…" three times in a row`);
    },
  },
  {
    id: "formatting",
    label: "Heavy formatting",
    rule: "Formatting only when the text needs it: no headings, bold labels or emoji bullets in a short message.",
    example: { en: "## Key Takeaways\n- **Speed:** fast\n- **Price:** free", pt: "## Principais Pontos\n- **Velocidade:** rápida\n- **Preço:** grátis" },
    fix: "Turn the headings, bold labels and bullets back into plain sentences.",
    find: (text) => {
      const words = ticWords(text);
      const lines = text.split("\n").filter((l) => l.trim());
      const found = [];
      if (words < 250) found.push(...ticMatches(text, /^#{1,6}\s+[^\n]+/gm));
      const labels = ticMatches(text, /^\s*(?:[-*•]|\d+[.)])\s+\*\*[^*\n]+?\*\*/gm);
      if (labels.length >= 2) found.push(...labels);
      const bold = ticMatches(text, /\*\*[^*\n]+\*\*|__[^_\n]+__/g);
      if (bold.length >= 3 && bold.length / Math.max(1, words) > 1 / 50 && labels.length < 2) found.push(...bold);
      const emojiBullets = ticMatches(text, /^\s*(?:\p{Extended_Pictographic}|[→➡✔✅▶])️?\s+[^\n]{0,30}/gmu);
      if (emojiBullets.length >= 2) found.push(...emojiBullets);
      const bullets = lines.filter((l) => /^\s*(?:[-*•▪◦]|\d+[.)])\s+/.test(l)).length;
      if (words < 150 && bullets >= 3 && bullets * 2 >= lines.length && !labels.length) found.push(`${bullets} bullet lines in ${words} words`);
      return found;
    },
  },
  {
    id: "bureaucratese",
    label: "Bureaucratese",
    rule: "No bureaucratese: no \"please be advised\", \"venho por meio deste\", \"vou estar enviando\".",
    example: { en: "Please be advised that, pursuant to your request, …", pt: "Venho por meio deste informar que vou estar enviando…" },
    fix: "Say it the way you'd say it out loud to the reader.",
    find: ticPhrases({
      en: ["please be advised", "kindly be informed", "pursuant to", "as per your request", "per your request", "please find attached herewith", "herewith", "do the needful"],
      pt: ["venho por meio deste", "venho por meio desta", "para os devidos fins", "solicito a gentileza", "sirvo-me do presente", "no que tange a", "no que tange ao", "no que tange à", "haja vista", "supracitado", "supracitada", "outrossim", "destarte", "nesse diapasão", "mister se faz", "doravante"],
    }, {
      // "gerundismo": "vou estar enviando"
      pt: new RegExp(`(?<!${TIC_L})(?:vou|vai|vamos|v[ãa]o|irei|iremos|ir[ãa]o)\\s+estar\\s+\\p{L}+ndo(?!${TIC_L})|(?<!${TIC_L})estar(?:ei|á|emos|ão)\\s+\\p{L}+ndo(?!${TIC_L})`, "giu"),
    }),
  },
];

export const TIC_IDS = TICS.map((t) => t.id);

// The kinds found in the text, skipping the ones the voice allows:
// [{ id, label, found: [excerpts], fix }].
export function findTics(text, lang, allowed = []) {
  return TICS.filter((t) => !allowed.includes(t.id))
    .map((t) => ({ id: t.id, label: t.label, found: [...new Set(t.find(text, lang))], fix: t.fix }))
    .filter((t) => t.found.length);
}
