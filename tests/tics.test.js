// AI tics: each kind fires on what it should and stays quiet on ordinary
// writing, in English and Portuguese. A false alarm costs more than a miss.

import { test } from "node:test";
import assert from "node:assert/strict";
import { findTics, TICS, TIC_IDS } from "../js/tics.js";

const kinds = (text, lang, allowed) => findTics(text, lang, allowed).map((t) => t.id);
const fires = (id, text, lang) => assert.ok(kinds(text, lang).includes(id), `${id} should fire on: ${text}`);
const quiet = (id, text, lang) => assert.ok(!kinds(text, lang).includes(id), `${id} should not fire on: ${text}`);

const CASES = {
  chatbot: {
    en: { yes: ["Great question! The archive is on the site.", "Done. I hope this helps.", "Certainly! Here it is."], no: ["The question came in on Friday.", "We hope the change helps you plan."] },
    pt: { yes: ["Ótima pergunta! O arquivo está no site.", "Pronto. Espero ter ajudado."], no: ["A pergunta chegou na sexta.", "Esperamos que a mudança ajude."] },
  },
  stock: {
    en: { yes: ["In today's fast-paced world, email is noise.", "It's worth noting that issues go out on Fridays.", "In conclusion, subscribe."], no: ["Today the world gets a new issue.", "The note is worth reading."] },
    pt: { yes: ["No mundo atual, e-mail é barulho.", "Vale ressaltar que a edição sai na sexta.", "Em suma, assine."], no: ["O mundo recebe hoje uma edição nova.", "Vale a pena ler a nota."] },
  },
  puffery: {
    en: { yes: ["This issue stands as a testament to our readers.", "The archive plays a pivotal role in the site.", "Let us delve into the numbers."], no: ["The archive has 86 issues.", "Readers testified at the hearing."] },
    pt: { yes: ["A edição representa um marco para os leitores.", "O arquivo desempenha um papel fundamental."], no: ["O arquivo tem 86 edições.", "Fundamental é chegar na sexta."] },
  },
  buzzwords: {
    en: { yes: ["Leverage our robust ecosystem to unlock a seamless journey."], no: ["A robust lock keeps the gate shut.", "The issue is crucial reading this week, and it arrives on Friday as always."] },
    pt: { yes: ["Alavanque nosso ecossistema robusto para potencializar sua jornada."], no: ["A jornada de trabalho acaba às seis.", "É fundamental ler a edição de sexta, que chega cedo como sempre."] },
  },
  contrast: {
    en: { yes: ["It's not just a newsletter, it's a movement.", "Our newsletter is not just email, it's a movement.", "This isn't a sale. It's a thank-you.", "We write not only for experts but for anyone curious."], no: ["It's not ready yet; check back on Friday.", "Not everyone reads on Fridays."] },
    pt: { yes: ["Não é apenas uma newsletter, é um movimento.", "Não é uma promoção. É um agradecimento.", "Escrevemos não só para especialistas, mas para qualquer curioso."], no: ["Não deu tempo; volte na sexta.", "Nem todo mundo lê na sexta."] },
  },
  triplets: {
    en: { yes: ["It's fast, simple and cheap. It saves time, money and effort. Subscribe today."], no: ["It arrives on Friday and takes five minutes. Subscribe today.", "It's fast, simple and cheap. Subscribe today. The archive opens without a sign-up. Every issue has a link. Old issues are PDFs."] },
    pt: { yes: ["É rápido, simples e barato. Economiza tempo, dinheiro e esforço. Assine hoje."], no: ["Dá para ler, sim, e estão todas em um lugar só. Em Arquivo > Edições, escolha tema ou mês."] },
  },
  dashes: {
    en: { yes: ["The issue — finally — is here — and it's good."], no: ["The issue is here — and it's good. It arrives every Friday at 7 am and takes about five minutes to read from start to end.", "Pages 10–12 cover it."] },
    pt: { yes: ["A edição — enfim — chegou — e ficou boa."], no: ["— Dá para ler as antigas?\n— Dá, sim.\n— E onde ficam?", "Veja as páginas 10–12."] },
  },
  reveals: {
    en: { yes: ["The result? Five minutes a week.", "Here's the thing: it works."], no: ["The result is five minutes a week.", "Is the archive open? Yes."] },
    pt: { yes: ["O resultado? Cinco minutos por semana.", "A grande sacada é: funciona."], no: ["O resultado são cinco minutos por semana.", "O arquivo está aberto? Está."] },
  },
  participle: {
    en: { yes: ["Issues now arrive on Fridays, highlighting our commitment to readers."], no: ["Issues now arrive on Fridays, starting this week."] },
    pt: { yes: ["As edições agora chegam às sextas, reforçando nosso compromisso."], no: ["As edições agora chegam às sextas, a partir desta semana."] },
  },
  transitions: {
    en: { yes: ["Moreover, it is short. Furthermore, it is free. Additionally, it has an archive."], no: ["Moreover, it is free. It arrives on Fridays. The archive is open."] },
    pt: { yes: ["Além disso, é curta. Ademais, é gratuita. Dessa forma, todos ganham."], no: ["Além disso, é gratuita. Chega na sexta. O arquivo está aberto."] },
  },
  openings: {
    en: { yes: ["We write it. We send it. We read every reply."], no: ["We write it. Then it goes out. We read every reply."] },
    pt: { yes: ["Nós escrevemos. Nós enviamos. Nós respondemos."], no: ["A newsletter chegou. A semana cabe nela. A ideia é simples."] },
  },
  formatting: {
    en: { yes: ["## Key Takeaways\nThe issue is out.", "- **Speed:** fast\n- **Price:** free\n- **Archive:** open"], no: ["Hi Marina,\n\nThe issue is out. The archive is open.\n\nMarta"] },
    pt: { yes: ["## Principais Pontos\nA edição saiu.", "✅ Rápida\n✅ Gratuita\n✅ Com arquivo"], no: ["Oi, Marina,\n\nA edição saiu. O arquivo está aberto.\n\nMarta"] },
  },
  bureaucratese: {
    en: { yes: ["Please be advised that the issue is late.", "Pursuant to your request, here is the archive."], no: ["Heads up: the issue is late.", "As you asked, here is the archive."] },
    pt: { yes: ["Venho por meio deste informar que a edição atrasou.", "Vou estar enviando o arquivo amanhã."], no: ["A edição atrasou.", "Vou enviar o arquivo amanhã."] },
  },
};

test("every kind has cases in both languages", () => {
  assert.deepEqual(Object.keys(CASES).sort(), [...TIC_IDS].sort());
});

for (const [id, langs] of Object.entries(CASES)) {
  test(`${id}: fires on the tic and stays quiet on ordinary writing`, () => {
    for (const [lang, { yes, no }] of Object.entries(langs)) {
      for (const text of yes) fires(id, text, lang);
      for (const text of no) quiet(id, text, lang);
    }
  });
}

test("a kind the voice allows is not flagged", () => {
  const text = "The issue — finally — is here — and it's good.";
  assert.ok(kinds(text, "en").includes("dashes"));
  assert.ok(!kinds(text, "en", ["dashes"]).includes("dashes"));
});

test("each finding says what was found and how to fix it", () => {
  const [t] = findTics("Great question! The archive is on the site.", "en");
  assert.equal(t.label, "Chatbot phrases");
  assert.deepEqual(t.found, ["Great question"]);
  assert.match(t.fix, /\w/);
});

test("every kind has a rule for the guide and an example in both languages", () => {
  for (const t of TICS) {
    assert.match(t.rule, /\w/, t.id);
    // the example shows the tic it names
    fires(t.id, t.example.en, "en");
    fires(t.id, t.example.pt, "pt");
  }
});
