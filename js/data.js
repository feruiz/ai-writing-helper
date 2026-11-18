// Everything the helper offers: foundation, temperament axes, finish,
// situations and ready-made characters. Each level of each axis carries the
// rule that goes into the guide and an example sentence, always about the same
// message (the launch of a weekly newsletter), so the difference is easy to see.

export const FOUNDATION = {
  speaker: {
    title: "Who speaks",
    options: [
      { id: "i", label: "I", guide: "First person singular: a real person signs (\"I launched\"; in Portuguese \"lancei\")." },
      { id: "we", label: "We", guide: "First person plural (\"we launched\", \"our\"; in Portuguese \"lançamos\", \"nosso\")." },
      { id: "byName", label: "By name", guide: "Third person: the text calls whoever signs by name (\"{name} launched\")." },
    ],
  },
  address: {
    title: "Who it talks to",
    options: [
      { id: "you", label: "You (você)", guide: "Addresses the reader as \"you\" (\"você\" in Portuguese)." },
      { id: "youPlural", label: "You all (vocês)", guide: "Talks to a group: \"vocês\" in Portuguese, a group greeting such as \"Hi everyone\" in English." },
      { id: "formal", label: "Formal you (o senhor)", guide: "Ceremonious address: \"o(a) senhor(a)\" in Portuguese; in English, a formal register (no contractions, \"Dear\", \"please\")." },
      { id: "impersonal", label: "Impersonal", guide: "Never addresses the reader; uses impersonal constructions (\"the new issue is out\")." },
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
      { rule: "Full standard grammar, no contractions or slang; ceremonious address.", en: "We are pleased to announce that our newsletter is now open for subscription.", pt: "Informamos que a nossa newsletter já está disponível para assinatura." },
      { rule: "Correct and courteous; avoids slang and contractions.", en: "Our newsletter is now available, and subscribing takes one click.", pt: "A nossa newsletter já está disponível, e a assinatura leva um clique." },
      { rule: "Workplace conversation: natural sentences, no slang.", en: "The newsletter is live, and you can subscribe in one click.", pt: "A newsletter já está no ar, e dá para assinar com um clique." },
      { rule: "Colloquial: contractions, direct questions, light informality.", en: "The newsletter's out. Take a look, subscribing's one click.", pt: "A newsletter saiu. Dá uma olhada, assinar é um clique." },
      { rule: "Very loose: light slang, interjections, the rhythm of a text between friends.", en: "Newsletter's out. One click and you're in, no fuss.", pt: "Saiu a newsletter. Um clique e pronto, sem enrolação." },
    ],
  },
  {
    id: "humor",
    name: "Humor",
    left: "Serious",
    right: "Playful",
    levels: [
      { rule: "No jokes, irony or wordplay.", en: "The newsletter is available.", pt: "A newsletter está disponível." },
      { rule: "Lightness only in word choice, never a joke.", en: "The newsletter is here to keep you company on Fridays.", pt: "A newsletter chegou para fazer companhia às sextas." },
      { rule: "At most one light touch per text; never on sensitive topics.", en: "The newsletter is here, and your inbox finally gets something worth opening.", pt: "A newsletter chegou, e a caixa de entrada ganhou algo que vale abrir." },
      { rule: "One quip per text, tied to the topic; never at the reader's expense.", en: "The newsletter is here. No more forty open tabs to keep up.", pt: "A newsletter chegou. Chega de quarenta abas abertas para acompanhar tudo." },
      { rule: "Humor is part of the voice: funny comparisons and self-deprecation.", en: "You can close those forty tabs. They did their best.", pt: "Pode fechar as quarenta abas. Elas fizeram o que puderam." },
    ],
  },
  {
    id: "attitude",
    name: "Attitude",
    left: "Respectful",
    right: "Irreverent",
    levels: [
      { rule: "Deferential: thanks the reader, asks permission, never criticizes anything.", en: "Thank you for your interest; we are pleased to present our new newsletter.", pt: "Agradecemos o interesse e apresentamos a nossa nova newsletter." },
      { rule: "Courteous and neutral; doesn't comment on others or the old way.", en: "The new newsletter is available.", pt: "A nova newsletter está disponível." },
      { rule: "Gives an opinion when it helps, respectfully.", en: "The newsletter turned out the way we thought it should: short.", pt: "A newsletter ficou do jeito que achamos que devia ser: curta." },
      { rule: "Takes a stand and questions the usual way of doing things.", en: "A long newsletter nobody finishes is useless. This one takes five minutes.", pt: "Newsletter longa que ninguém termina não serve. Esta se lê em cinco minutos." },
      { rule: "Provokes on purpose: pokes at conventions and at how everyone else does it.", en: "A newsletter that reads like a press release? Not here.", pt: "Newsletter que parece release de assessoria? Aqui não." },
    ],
  },
  {
    id: "energy",
    name: "Energy",
    left: "Calm",
    right: "Enthusiastic",
    levels: [
      { rule: "Calm: no exclamation marks, no intensifiers (\"very\", \"super\").", en: "The newsletter is available.", pt: "A newsletter está disponível." },
      { rule: "Restrained: at most one positive adjective.", en: "The new newsletter is available.", pt: "A nova newsletter está disponível." },
      { rule: "Positive, without exaggeration.", en: "The newsletter is here, and it turned out well.", pt: "A newsletter chegou, e ficou boa." },
      { rule: "Upbeat: one exclamation mark allowed, verbs of motion.", en: "The newsletter has landed!", pt: "Chegou a newsletter!" },
      { rule: "Very excited: exclamation marks and explicit enthusiasm.", en: "The newsletter has landed! We can't wait for you to read it!", pt: "Chegou a newsletter! Mal podemos esperar para você ler!" },
    ],
  },
  {
    id: "style",
    name: "Style",
    left: "Direct",
    right: "Lyrical",
    levels: [
      { rule: "No metaphors. Verb first, one idea per sentence.", en: "We launched the newsletter. It arrives every Friday.", pt: "Lançamos a newsletter. Chega toda sexta." },
      { rule: "Direct, with at most one sentence of context.", en: "We launched the newsletter to make the week easier to follow. It arrives every Friday.", pt: "Lançamos a newsletter para ajudar a acompanhar a semana. Chega toda sexta." },
      { rule: "A concrete image now and then, no ornament.", en: "The newsletter is here, and the week now fits in five minutes of reading.", pt: "A newsletter chegou, e a semana agora cabe em cinco minutos de leitura." },
      { rule: "Opens with an image, then explains.", en: "Every week tells a story. Now it has a home: the newsletter.", pt: "Toda semana conta uma história. Agora ela tem um lugar: a newsletter." },
      { rule: "Narrative: scene, rhythm and image before information.", en: "Every week leaves traces: Monday's idea, Wednesday's doubt, Friday's discovery. Now they fit in one email.", pt: "Toda semana deixa rastros: a ideia de segunda, a dúvida de quarta, a descoberta de sexta. Agora eles cabem em um e-mail." },
    ],
  },
  {
    id: "technicality",
    name: "Technicality",
    left: "Simple",
    right: "Technical",
    levels: [
      { rule: "No technical terms; talks about the result for the person.", en: "Brings you the best of the week in five minutes.", pt: "Traz o melhor da semana em cinco minutos." },
      { rule: "The reader's everyday words, no jargon.", en: "Arrives every Friday with the week's best links.", pt: "Chega toda sexta com os melhores links da semana." },
      { rule: "Technical terms only when needed, explained in the same sentence.", en: "Arrives every Friday, with an archive on the site you can search by topic.", pt: "Chega toda sexta, com um arquivo no site que dá para buscar por tema." },
      { rule: "Details that help decide: numbers, formats, limits.", en: "Every Friday at 7 am, about 800 words, with an archive and RSS.", pt: "Toda sexta às 7h, cerca de 800 palavras, com arquivo e RSS." },
      { rule: "Field jargon without explanation; the reader is an expert.", en: "Weekly send at 7 am, ~800 words, full-text RSS, DKIM-signed, one-click unsubscribe.", pt: "Envio semanal às 7h, ~800 palavras, RSS completo, assinatura DKIM e descadastro em um clique." },
    ],
  },
  {
    id: "certainty",
    name: "Certainty",
    left: "Cautious",
    right: "Assertive",
    levels: [
      { rule: "Explicit hedges: \"the idea is\", \"it may\".", en: "The idea is that the newsletter helps you keep up with the week.", pt: "A ideia é que a newsletter ajude a acompanhar a semana." },
      { rule: "Asserts carefully: \"should\", \"tends to\".", en: "The newsletter should make the week easier to follow.", pt: "A newsletter deve deixar a semana mais fácil de acompanhar." },
      { rule: "States what it knows, without promising.", en: "The newsletter helps you keep up with the week.", pt: "A newsletter ajuda a acompanhar a semana." },
      { rule: "Assertive: sentences without hedges.", en: "You will keep up with the week.", pt: "Você vai acompanhar a semana." },
      { rule: "Categorical: promises and guarantees.", en: "You will never miss what matters again.", pt: "Você nunca mais vai perder o que importa." },
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

// Situations: the voice stays, the tone shifts. The shift is added to the base
// temperament. "summary" is the fictional case the sample text is about;
// "when" tells the guide's reader which real cases the situation covers.
export const SITUATIONS = [
  { id: "goodNews", name: "Good news", summary: "Launching a weekly newsletter", when: "sharing something new or good", shift: { energy: +1 } },
  { id: "badNews", name: "Bad news", summary: "Yesterday's issue went out twice, the second time with broken links", when: "something went wrong on the writer's side and the reader was affected", shift: { humor: -2, energy: -2, attitude: -1, style: -1 } },
  { id: "reply", name: "Reply", summary: "A reader asks whether past issues can be read", when: "answering one person who asked something", shift: {} },
];

// Every situation the writer knows: the built-in ones plus their own (see fields.js).
// The active ones are what the pickers, the tabs and the guide offer: built-ins
// the user hid, and own situations without a name yet, are left out.
export const allSituations = (state) => [...SITUATIONS, ...(state.customSituations || [])];
export const activeSituations = (state) => [
  ...SITUATIONS.filter((s) => !state.hiddenSituations?.includes(s.id)),
  ...(state.customSituations || []).filter((s) => s.name.trim()),
];

const base = { formality: 3, humor: 3, attitude: 3, energy: 3, style: 3, technicality: 3, certainty: 3 };

// Ready-made characters, like the presets on a game's character creation screen.
export const PRESETS = [
  {
    id: "academic",
    name: "Academic",
    state: { speaker: "we", address: "impersonal", role: "expert", axes: { ...base, formality: 1, humor: 1, attitude: 2, energy: 1, style: 2, technicality: 4, certainty: 2 }, sentenceLength: "long", exclamation: "never", emoji: "never" },
  },
  {
    id: "columnist",
    name: "Columnist",
    state: { speaker: "i", address: "you", role: "provocateur", axes: { ...base, formality: 3, humor: 3, attitude: 4, energy: 3, style: 4, technicality: 2, certainty: 4 }, sentenceLength: "long", exclamation: "never", emoji: "never" },
  },
  {
    id: "newsletter",
    name: "Friendly newsletter",
    state: { speaker: "i", address: "you", role: "peer", axes: { ...base, formality: 4, humor: 4, attitude: 3, energy: 4, style: 3, technicality: 2, certainty: 3 }, sentenceLength: "short", exclamation: "one", emoji: "one" },
  },
  {
    id: "technical",
    name: "Technical writer",
    state: { speaker: "we", address: "you", role: "mentor", axes: { ...base, formality: 2, humor: 1, attitude: 2, energy: 1, style: 1, technicality: 5, certainty: 3 }, sentenceLength: "medium", exclamation: "never", emoji: "never" },
  },
  {
    id: "institution",
    name: "Formal institution",
    state: { speaker: "byName", address: "formal", role: "host", axes: { ...base, formality: 1, humor: 1, attitude: 1, energy: 1, style: 1, technicality: 3, certainty: 2 }, sentenceLength: "medium", exclamation: "never", emoji: "never" },
  },
  {
    id: "provocative",
    name: "Provocative brand",
    state: { speaker: "we", address: "youPlural", role: "provocateur", axes: { ...base, formality: 5, humor: 4, attitude: 5, energy: 4, style: 3, technicality: 1, certainty: 5 }, sentenceLength: "short", exclamation: "free", emoji: "free" },
  },
];

export const INITIAL_STATE = {
  name: "Lumen",
  article: "a",
  essence: "",
  // where the voice lives, beyond the sliders (see fields.js): short text, or one item per line
  about: "",
  reader: "",
  beliefs: "",
  opening: "",
  closing: "",
  never: "",
  pairs: "",
  // the writer's own situations: { id, name, when, shift }, and the ids of built-ins they don't use
  customSituations: [],
  hiddenSituations: [],
  speaker: "we",
  address: "you",
  role: "mentor",
  axes: { ...base },
  sentenceLength: "medium",
  exclamation: "one",
  emoji: "never",
  preferred: "",
  // the writer's own words to avoid; common tics of AI-written text are checked apart (see tics.js)
  forbidden: "",
  // kinds of AI tic this voice uses on purpose, which the checker doesn't flag (ids from tics.js)
  allowedTics: [],
  situation: "goodNews",
  applyShift: true,
  // the writer's approved texts (see examples.js); left out of the shareable link
  examples: [],
  // texts the user turned down, each with the reason: { text, reason, situation, lang, source }
  rejected: [],
};
