// Everything the creator offers: foundation, temperament axes, finish,
// situations and ready-made characters. Each level of each axis carries the
// rule that goes into the guide and an example sentence, always about the same
// message (the launch of a monthly report), so the difference is easy to see.

export const FOUNDATION = {
  speaker: {
    title: "Who speaks",
    options: [
      { id: "we", label: "We", guide: "First person plural (\"we launched\", \"our\"; in Portuguese \"lançamos\", \"nosso\")." },
      { id: "i", label: "I", guide: "First person singular: a real person signs (\"I launched\"; in Portuguese \"lancei\")." },
      { id: "brand", label: "The brand", guide: "Third person: the brand refers to itself by name (\"{brand} launched\")." },
    ],
  },
  address: {
    title: "Who it talks to",
    options: [
      { id: "you", label: "You (você)", guide: "Addresses the reader as \"you\" (\"você\" in Portuguese)." },
      { id: "youPlural", label: "You all (vocês)", guide: "Talks to a group: \"vocês\" in Portuguese, a group greeting such as \"Hi everyone\" in English." },
      { id: "formal", label: "Formal you (o senhor)", guide: "Ceremonious address: \"o(a) senhor(a)\" in Portuguese; in English, a formal register (no contractions, \"Dear\", \"please\")." },
      { id: "impersonal", label: "Impersonal", guide: "Never addresses the reader; uses impersonal constructions (\"the report is available\")." },
    ],
  },
  role: {
    title: "Role",
    options: [
      { id: "mentor", label: "Mentor", guide: "Teaches and anticipates the next question." },
      { id: "peer", label: "Peer", guide: "Talks as an equal, as someone who lives the same problem." },
      { id: "expert", label: "Expert", guide: "Shows command of the subject and backs claims with data." },
      { id: "host", label: "Host", guide: "Welcomes the reader and solves things before being asked." },
      { id: "provocateur", label: "Provocateur", guide: "Questions the usual way of doing things." },
    ],
  },
};

export const AXES = [
  {
    id: "formality",
    name: "Formality",
    left: "Formal",
    right: "Casual",
    levels: [
      { rule: "Full standard grammar, no contractions or slang; ceremonious address.", en: "We are pleased to inform you that the monthly report is now available.", pt: "Informamos que o relatório mensal já está disponível para consulta." },
      { rule: "Correct and courteous; avoids slang and contractions.", en: "The monthly report is now available and can be accessed with one click.", pt: "O relatório mensal já está disponível e pode ser acessado com um clique." },
      { rule: "Workplace conversation: natural sentences, no slang.", en: "The monthly report is live and opens in one click.", pt: "O relatório mensal já está no ar e abre com um clique." },
      { rule: "Colloquial: contractions, direct questions, light informality.", en: "The monthly report's here. Take a look, it opens in one click.", pt: "O relatório mensal chegou. Dá uma olhada, abre com um clique." },
      { rule: "Very loose: light slang, interjections, the rhythm of a text between friends.", en: "Monthly report's out. One click and done, no fuss.", pt: "Saiu o relatório do mês. Um clique e pronto, sem enrolação." },
    ],
  },
  {
    id: "humor",
    name: "Humor",
    left: "Serious",
    right: "Playful",
    levels: [
      { rule: "No jokes, irony or wordplay.", en: "The monthly report is available.", pt: "O relatório mensal está disponível." },
      { rule: "Lightness only in word choice, never a joke.", en: "The monthly report is here to make closing the month easier.", pt: "O relatório mensal chegou para facilitar o fechamento." },
      { rule: "At most one light touch per text; never on sensitive topics.", en: "The monthly report is here, and the spreadsheet can rest.", pt: "O relatório mensal chegou, e a planilha pode descansar." },
      { rule: "One quip per text, tied to the topic; never at the reader's expense.", en: "The monthly report is here. No more hunting for lost receipts.", pt: "O relatório mensal chegou. Sem caça ao recibo perdido." },
      { rule: "Humor is part of the brand: funny comparisons and self-deprecation.", en: "You can retire the 14-tab spreadsheet. It did its best.", pt: "Pode aposentar a planilha de 14 abas. Ela fez o que pôde." },
    ],
  },
  {
    id: "attitude",
    name: "Attitude",
    left: "Respectful",
    right: "Irreverent",
    levels: [
      { rule: "Deferential: thanks the reader, asks permission, never criticizes anything.", en: "We appreciate your trust and are pleased to present the new monthly report.", pt: "Agradecemos a confiança e apresentamos o novo relatório mensal." },
      { rule: "Courteous and neutral; doesn't comment on competitors or the old way.", en: "The new monthly report is available.", pt: "O novo relatório mensal está disponível." },
      { rule: "Gives an opinion when it helps, respectfully.", en: "The monthly report turned out the way we thought it should: simple.", pt: "O relatório mensal ficou do jeito que achamos que devia ser: simples." },
      { rule: "Takes a stand and questions the usual way of doing things.", en: "A beautiful report nobody opens is useless. This one opens in one click.", pt: "Relatório bonito que ninguém abre não serve. Este abre em um clique." },
      { rule: "Provokes on purpose: pokes at the market and its conventions.", en: "A report that looks like a tax return? Not here.", pt: "Relatório que parece declaração de imposto? Aqui não." },
    ],
  },
  {
    id: "energy",
    name: "Energy",
    left: "Calm",
    right: "Enthusiastic",
    levels: [
      { rule: "Calm: no exclamation marks, no intensifiers (\"very\", \"super\").", en: "The monthly report is available.", pt: "O relatório mensal está disponível." },
      { rule: "Restrained: at most one positive adjective.", en: "The new monthly report is available.", pt: "O novo relatório mensal está disponível." },
      { rule: "Positive, without exaggeration.", en: "The monthly report is here, and it turned out well.", pt: "O relatório mensal chegou, e ficou bom." },
      { rule: "Upbeat: one exclamation mark allowed, verbs of motion.", en: "The monthly report has landed!", pt: "Chegou o relatório mensal!" },
      { rule: "Very excited: exclamation marks and explicit enthusiasm.", en: "The monthly report has landed! We can't wait for you to see it!", pt: "Chegou o relatório mensal! Mal podemos esperar para você ver!" },
    ],
  },
  {
    id: "style",
    name: "Style",
    left: "Direct",
    right: "Lyrical",
    levels: [
      { rule: "No metaphors. Verb first, one idea per sentence.", en: "We launched the monthly report. It opens in one click.", pt: "Lançamos o relatório mensal. Abre em um clique." },
      { rule: "Direct, with at most one sentence of context.", en: "We launched the monthly report to make closing the month easier. It opens in one click.", pt: "Lançamos o relatório mensal para facilitar o fechamento. Abre em um clique." },
      { rule: "A concrete image now and then, no ornament.", en: "The monthly report is here, and closing the month fits on one screen.", pt: "O relatório mensal chegou, e o fechamento do mês cabe em uma tela." },
      { rule: "Opens with an image, then explains.", en: "Every month tells a story. Now it has a home: the monthly report.", pt: "Todo mês conta uma história. Agora ela tem um lugar: o relatório mensal." },
      { rule: "Narrative: scene, rhythm and image before information.", en: "Every month leaves traces: Monday's coffee, Friday's big sale. Now they fit on one page.", pt: "Todo mês deixa rastros: o café de segunda, a venda grande de sexta. Agora eles cabem em uma página." },
    ],
  },
  {
    id: "technicality",
    name: "Technicality",
    left: "Simple",
    right: "Technical",
    levels: [
      { rule: "No technical terms; talks about the result for the person.", en: "Shows where the month's money went.", pt: "Mostra para onde foi o dinheiro do mês." },
      { rule: "The customer's everyday words, no jargon.", en: "Shows the month's spending by category.", pt: "Mostra os gastos do mês por categoria." },
      { rule: "Technical terms only when needed, explained in the same sentence.", en: "Compares spending with last month, by category.", pt: "Compara os gastos com o mês anterior, por categoria." },
      { rule: "Details that help decide: numbers, formats, limits.", en: "Daily updates, 12-month comparison and CSV export.", pt: "Atualização diária, comparação de 12 meses e exportação em CSV." },
      { rule: "Field jargon without explanation; the reader is an expert.", en: "Daily consolidation, 12-month moving average and API access.", pt: "Consolidação diária, média móvel de 12 meses e acesso via API." },
    ],
  },
  {
    id: "certainty",
    name: "Certainty",
    left: "Cautious",
    right: "Assertive",
    levels: [
      { rule: "Explicit hedges: \"the idea is\", \"it may\".", en: "The idea is that the report helps you see the month.", pt: "A ideia é que o relatório ajude a enxergar o mês." },
      { rule: "Asserts carefully: \"should\", \"tends to\".", en: "The report should make closing the month clearer.", pt: "O relatório deve deixar o fechamento mais claro." },
      { rule: "States what it knows, without promising.", en: "The report helps you see the month.", pt: "O relatório ajuda a enxergar o mês." },
      { rule: "Assertive: sentences without hedges.", en: "You will see the month clearly.", pt: "Você vai enxergar o mês com clareza." },
      { rule: "Categorical: promises and guarantees.", en: "You will never close the month in the dark again.", pt: "Você nunca mais vai fechar o mês no escuro." },
    ],
  },
];

export const FINISH = {
  sentenceLength: {
    title: "Sentence length",
    options: [
      { id: "short", label: "Short", limit: 12, guide: "Sentences of up to 12 words." },
      { id: "medium", label: "Medium", limit: 20, guide: "Sentences of up to 20 words." },
      { id: "long", label: "Free", limit: null, guide: "No length limit; vary the rhythm." },
    ],
  },
  exclamation: {
    title: "Exclamation marks",
    options: [
      { id: "never", label: "Never", guide: "Never uses exclamation marks." },
      { id: "one", label: "One per text", guide: "At most one exclamation mark per text." },
      { id: "free", label: "Free", guide: "Exclamation marks allowed when the energy calls for them." },
    ],
  },
  emoji: {
    title: "Emoji",
    options: [
      { id: "never", label: "Never", guide: "Never uses emoji." },
      { id: "one", label: "One, at the end", guide: "At most one emoji, at the end of the text." },
      { id: "free", label: "Freely", guide: "Emoji allowed to reinforce the tone." },
    ],
  },
};

// Situations: the voice stays, the tone shifts. The shift is added to the base temperament.
export const SITUATIONS = [
  { id: "launch", name: "Launch", summary: "Announcing the new monthly report", shift: { energy: +1 } },
  { id: "outage", name: "Service outage", summary: "The system was down for 40 minutes and payments were delayed", shift: { humor: -2, energy: -2, attitude: -1, style: -1 } },
  { id: "question", name: "Customer question", summary: "A customer asks whether the bill's due date can be changed", shift: {} },
];

const base = { formality: 3, humor: 3, attitude: 3, energy: 3, style: 3, technicality: 3, certainty: 3 };

// Ready-made characters, like the presets on a game's character creation screen.
export const PRESETS = [
  {
    id: "bank",
    name: "Traditional bank",
    state: { speaker: "we", address: "formal", role: "expert", axes: { ...base, formality: 1, humor: 1, attitude: 1, energy: 1, style: 1, technicality: 3, certainty: 2 }, sentenceLength: "medium", exclamation: "never", emoji: "never" },
  },
  {
    id: "app",
    name: "Young finance app",
    state: { speaker: "we", address: "you", role: "peer", axes: { ...base, formality: 4, humor: 4, attitude: 3, energy: 4, style: 2, technicality: 2, certainty: 4 }, sentenceLength: "short", exclamation: "one", emoji: "one" },
  },
  {
    id: "founder",
    name: "Founder who writes",
    state: { speaker: "i", address: "you", role: "mentor", axes: { ...base, formality: 3, humor: 3, attitude: 3, energy: 2, style: 4, technicality: 2, certainty: 3 }, sentenceLength: "long", exclamation: "never", emoji: "never" },
  },
  {
    id: "provocative",
    name: "Provocative brand",
    state: { speaker: "we", address: "youPlural", role: "provocateur", axes: { ...base, formality: 5, humor: 4, attitude: 5, energy: 4, style: 3, technicality: 1, certainty: 5 }, sentenceLength: "short", exclamation: "free", emoji: "free" },
  },
  {
    id: "support",
    name: "Technical support",
    state: { speaker: "brand", address: "you", role: "expert", axes: { ...base, formality: 2, humor: 1, attitude: 2, energy: 1, style: 1, technicality: 5, certainty: 3 }, sentenceLength: "medium", exclamation: "never", emoji: "never" },
  },
];

export const INITIAL_STATE = {
  brand: "Lumen",
  article: "a",
  essence: "",
  speaker: "we",
  address: "you",
  role: "mentor",
  axes: { ...base },
  sentenceLength: "medium",
  exclamation: "one",
  emoji: "never",
  preferred: "",
  // starts with the most common tics of AI-written text, in English and Portuguese
  forbidden: "delve, tapestry, testament, pivotal, seamless, game-changer, solução, inovador, no mundo atual, vale ressaltar, mergulhar, jornada",
  situation: "launch",
  applyShift: true,
};
