// Portuguese sample texts. Each sentence is picked by the level of one axis and
// conjugated by the foundation (who speaks and who it talks to). They are all
// about the same fictional weekly newsletter: its launch, an issue that went
// out twice with broken links, and a reader asking for the past issues.

const sentence = (t, exclaimable = false) => ({ t, exclaimable });

// Forms by speaker: [eu, nós, by name]
const VERBS = {
  lancar: ["lancei", "lançamos", "lançou"],
  corrigir: ["corrigi", "corrigimos", "corrigiu"],
  voltar: ["voltei", "voltamos", "voltou"],
  desativar: ["desativei", "desativamos", "desativou"],
  reenviar: ["reenviei", "reenviamos", "reenviou"],
  eliminar: ["eliminei", "eliminamos", "eliminou"],
  deixar: ["deixei", "deixamos", "deixou"],
  sentir: ["senti", "sentimos", "sentiu"],
  montar: ["montei", "montamos", "montou"],
  preparar: ["preparei", "preparamos", "preparou"],
  achar: ["achava", "achávamos", "achava"],
  estar: ["estou", "estamos", "está"],
  pedir: ["peço", "pedimos", "pede"],
  resolver: ["resolvo", "resolvemos", "resolve"],
  conferir: ["confiro", "conferimos", "confere"],
  agradecer: ["agradeço", "agradecemos", "agradece"],
  ver: ["vejo", "vemos", "vê"],
  ficar: ["fico", "ficamos", "fica"],
  ir: ["vou", "vamos", "vai"],
  mandar: ["mando", "mandamos", "manda"],
};

// Imperative: [informal, formal, plural]
const IMPERATIVE = {
  abrir: ["abre", "abra", "abram"],
  acessar: ["acessa", "acesse", "acessem"],
  assinar: ["assina", "assine", "assinem"],
  responder: ["responde", "responda", "respondam"],
  escolher: ["escolhe", "escolha", "escolham"],
  comecar: ["começa", "comece", "comecem"],
};

const POSSESSIVE = { m: "seu", f: "sua", mp: "seus", fp: "suas" };
const ADDRESS = {
  you: { pron: "você", obj: " você", with: " com você", to: " para você", will: "vai", can: "pode", poss: POSSESSIVE },
  youPlural: { pron: "vocês", obj: " vocês", with: " com vocês", to: " para vocês", will: "vão", can: "podem", poss: POSSESSIVE },
  formal: { pron: "o(a) senhor(a)", obj: " o(a) senhor(a)", with: " com o(a) senhor(a)", to: " para o(a) senhor(a)", will: "vai", can: "pode", poss: POSSESSIVE },
  impersonal: { pron: "", obj: "", with: "", to: "", will: "vai", can: "pode", poss: { m: "o", f: "a", mp: "os", fp: "as" } },
};

export function contextPt(state, n, scene) {
  const i = { i: 0, we: 1, byName: 2 }[state.speaker];
  // A reply to one person: "vocês" makes no sense.
  const address = scene.individual && state.address === "youPlural" ? "you" : state.address;
  const register = n.formality <= 2 ? "formal" : n.formality >= 4 ? "informal" : "neutral";
  const name = state.name.trim() || "Lumen";
  const ref = state.article === "none" ? name : `${state.article} ${name}`;
  const ofName = state.article === "o" ? `do ${name}` : state.article === "a" ? `da ${name}` : `de ${name}`;
  const named = state.speaker === "byName";
  return {
    n, register, name, ref, ofName, named,
    speaker: state.speaker,
    A: ADDRESS[address],
    impersonal: address === "impersonal",
    group: address === "youPlural",
    v: (verb) => VERBS[verb][i],
    // subject before the verb: dropped for "eu" and "nós", the name in third person
    S: named ? `${ref} ` : "",
    // explicit subject, when the sentence needs one
    subj: state.speaker === "i" ? "eu " : named ? `${ref} ` : "",
    already: (verb) => (named ? `${ref} já ${VERBS[verb][i]}` : `já ${VERBS[verb][i]}`),
    imp: (verb) => {
      const forms = IMPERATIVE[verb];
      if (address === "youPlural") return forms[2];
      if (address === "formal" || register !== "informal") return forms[1];
      return forms[0];
    },
    poss: (g) => ADDRESS[address].poss[g],
  };
}

export function greetingPt(c, readerName) {
  if (c.impersonal && !readerName) return null;
  // no "tudo bem?" or "e aí?" in bad news
  const f = c.grave ? Math.min(c.n.formality, 3) : c.n.formality;
  if (f === 1) return readerName ? `Prezada ${readerName},` : c.group ? "Prezados leitores," : "Prezado(a) leitor(a),";
  if (f === 2) return readerName ? `Olá, ${readerName},` : c.group ? "Olá a todos," : "Olá,";
  if (f === 3) return readerName ? `Oi, ${readerName},` : c.group ? "Oi, pessoal," : "Oi,";
  if (f === 4) return readerName ? `Oi, ${readerName}, tudo bem?` : c.group ? "Oi, pessoal, tudo bem?" : "Oi, tudo bem?";
  return readerName ? `E aí, ${readerName}?` : c.group ? "E aí, galera?" : "E aí?";
}

export const SCENES_PT = {
  goodNews: {
    emoji: "📬",
    formalSwaps: [
      [/\bA newsletter chegou\b/g, "A newsletter está disponível"],
      [/\bChega toda sexta\b/g, "É enviada toda sexta"],
      [/\bSai toda sexta\b/g, "É enviada toda sexta"],
    ],
    looseSwaps: [
      [/\bem uma\b/g, "numa"],
      [/\bem um\b/g, "num"],
      [/\bpara\b/g, "pra"],
    ],
    compose(c) {
      const { n, v, S, subj, A, imp, poss } = c;
      const opening = [
        [sentence(`${S}${v("lancar")} hoje a newsletter.`, true)],
        [sentence(`${S}${v("lancar")} hoje a newsletter, para quem não tem tempo de acompanhar tudo.`, true)],
        [sentence("A newsletter chegou, e a semana agora cabe em cinco minutos de leitura.", true)],
        [sentence("Toda semana conta uma história."), sentence("Agora ela tem um lugar: a nova newsletter.", true)],
        [sentence("Toda semana deixa rastros: a ideia de segunda, a dúvida de quarta, a descoberta de sexta."), sentence("Agora esses rastros cabem em um e-mail só, na nova newsletter.", true)],
      ][n.style - 1];

      const body = [
        "Chega toda sexta e traz o melhor da semana.",
        "Chega toda sexta, com os melhores links da semana.",
        "Chega toda sexta com os melhores links por tema, todos guardados em um arquivo no site.",
        "Sai toda sexta às 7h, com cerca de 800 palavras, três seções fixas, arquivo com busca e RSS.",
        "O envio é semanal, às 7h, com cerca de 800 palavras; sai com assinatura DKIM, RSS de texto completo e descadastro em um clique.",
      ][n.technicality - 1];

      const benefit = [
        `A ideia é que isso ajude${A.obj} a acompanhar a semana com menos ruído, mas ${subj}ainda ${v("estar")} ajustando o formato.`,
        `Deve ajudar${A.obj} a acompanhar a semana com menos ruído.`,
        `Ajuda${A.obj} a acompanhar a semana com menos ruído.`,
        c.impersonal ? "A semana fica clara em cinco minutos." : `${A.pron} ${A.will} acompanhar a semana sem esforço.`,
        c.impersonal ? "Perder o que importa fica no passado." : `${A.pron} nunca mais ${A.will} perder o que importa.`,
      ][n.certainty - 1];

      const humor = {
        3: [sentence("E as quarenta abas abertas podem, enfim, descansar.")],
        4: [sentence("Sem quarenta abas abertas e sem caça ao link perdido.")],
        5: [sentence(c.impersonal ? "As quarenta abas abertas já podem se aposentar." : `${A.can} fechar as quarenta abas abertas.`), sentence("Elas fizeram o que puderam.")],
      }[n.humor] || [];

      const attitude = {
        1: [sentence(`${S}${v("agradecer")} o interesse.`)],
        3: [sentence(`Ficou do jeito que ${subj}${v("achar")} que devia ser: curta.`)],
        4: [sentence("Newsletter longa que ninguém termina não serve para nada.")],
        5: [sentence("Newsletter que parece release de assessoria?"), sentence("Aqui não.")],
      }[n.attitude] || [];

      const energy = n.energy === 5
        ? [sentence(`A melhor parte vem agora: saber o que ${c.impersonal ? "os leitores vão" : `${A.pron} ${A.will}`} achar.`, true)]
        : [];

      const role = {
        mentor: `Na primeira edição, ${S}${v("ir")} explicar como aproveitar cada seção.`,
        peer: c.speaker === "i"
          ? "Escrevo a newsletter que eu queria receber."
          : c.named
            ? `${c.ref} escreve a newsletter que faltava.`
            : c.register === "informal"
              ? "A gente escreve a newsletter que queria receber."
              : "Escrevemos a newsletter que queríamos receber.",
        expert: `${S}${v("montar")} a seleção a partir de mais de 200 fontes lidas toda semana.`,
        host: `${S}${v("preparar")} uma edição de boas-vindas para quem chega agora.`,
        provocateur: c.impersonal
          ? "Caixa de entrada que não ensina nada é só barulho."
          : `Se a ${poss("f")} caixa de entrada não ensina nada, é só barulho.`,
      }[c.role];

      const cta = c.impersonal
        ? sentence("A assinatura já está aberta no site.")
        : c.register === "formal"
          ? sentence(`${imp("acessar")} o site para fazer a assinatura.`)
          : sentence(`${imp("abrir")} o ${c.register === "informal" ? "link" : "site"} e ${imp("assinar")}.`, true);

      return [
        [...opening, sentence(body), sentence(benefit, n.certainty === 5)],
        [...humor, ...attitude, ...energy],
        [sentence(role)],
        [cta],
      ];
    },
  },

  badNews: {
    emoji: "🛠️",
    grave: true,
    formalSwaps: [
      [/\bsaiu duas vezes\b/g, "foi enviada duas vezes"],
      [/\bchegou em dobro\b/g, "foi enviada em duplicidade"],
      [/\bnão abriam\b/g, "não funcionavam"],
    ],
    looseSwaps: [[/\bpara\b/g, "pra"]],
    compose(c) {
      const { n, v, S, subj, A, imp, already } = c;
      const opening = [
        "Ontem, às 7h, a edição da semana saiu duas vezes.",
        "Ontem de manhã, a edição da semana saiu duas vezes, e a segunda veio com os links quebrados.",
        "Ontem de manhã, a edição chegou em dobro, e a segunda cópia trouxe links que não abriam.",
        "Ontem, a newsletter falou duas vezes, e na segunda os links não levavam a lugar nenhum.",
        "Ontem de manhã, a mesma edição bateu duas vezes na porta: a segunda com links que davam no vazio, e gente clicando sem chegar a lugar nenhum.",
      ][n.style - 1];

      const body = [
        "A edição certa já está no site, com todos os links funcionando.",
        `${already("corrigir")} os links, e a edição certa está no site.`,
        `A causa foi um erro na automação de envio; ${already("corrigir")} e a edição certa está no site.`,
        `A causa foi uma troca de modelo que disparou o envio duas vezes; ${S}${v("voltar")} ao modelo anterior, e os links da edição no site já estão certos.`,
        `A causa foi um gatilho duplicado na automação depois da troca de template; a segunda leva saiu com links do ambiente de teste; ${S}${v("desativar")} o gatilho às 7h40 e ${v("reenviar")} a versão correta para 1.312 assinantes.`,
      ][n.technicality - 1];

      const apology = [
        `${S}${v("pedir")} sinceras desculpas pelo transtorno.`,
        `${S}${v("pedir")} desculpas pelo e-mail repetido.`,
        `${S}${v("pedir")} desculpas pelo e-mail repetido.`,
        "Desculpa pelo e-mail em dobro.",
        "Foi mal, de verdade.",
      ][n.attitude - 1];

      const certainty = [
        "A causa ainda está em investigação, mas a ideia é reduzir a chance de isso se repetir.",
        "A automação está em revisão, o que deve evitar que isso se repita.",
        "Agora cada envio passa por um teste antes de sair.",
        "Agora cada envio passa por uma revisão, para que isso não se repita.",
        `Isso não volta: ${S}${v("eliminar")} a causa na raiz.`,
      ][n.certainty - 1];

      const humor = {
        4: [sentence(c.speaker === "i" ? "Não foi a minha melhor sexta." : c.named ? `Não foi a melhor sexta ${c.ofName}.` : "Não foi a nossa melhor sexta.")],
        5: [sentence("A newsletter ficou tão empolgada que falou tudo duas vezes.")],
      }[n.humor] || [];

      const energy = n.energy === 5 ? [sentence(`${subj}${v("ficar")} de olho em cada envio até a próxima edição sair certinha.`, true)] : [];

      const role = {
        mentor: `Para achar os links certos, ${S}${v("deixar")} a edição corrigida no topo do site.`,
        peer: `${subj}${v("sentir")} isso também: ${c.speaker === "i" ? "a minha" : c.named ? "a própria" : "a nossa"} caixa de entrada recebeu as duas cópias.`,
        expert: "O relato completo do que aconteceu sai até segunda no site.",
        host: `Se algum link ainda não abrir, ${S}${v("resolver")} na hora; é só responder.`,
        provocateur: "Toda newsletter erra um dia; o que conta é avisar rápido e contar tudo.",
      }[c.role];

      const cta = c.impersonal
        ? "Dúvidas podem ser enviadas em resposta a esta mensagem."
        : c.register === "formal"
          ? `Em caso de dúvida, ${imp("responder")} a esta mensagem.`
          : c.register === "informal"
            ? `Qualquer coisa, ${imp("responder")} aqui.`
            : "Se ficou alguma dúvida, é só responder esta mensagem.";

      return [
        [sentence(opening), sentence(body)],
        [sentence(apology), sentence(certainty), ...humor, ...energy],
        [sentence(role)],
        [sentence(cta)],
      ];
    },
  },

  reply: {
    emoji: "🙂",
    reader: "Marina",
    individual: true,
    formalSwaps: [
      [/\bDá para ler\b/g, "É possível ler"],
      [/\bDá, sim\b/g, "É possível, sim"],
      [/\bÉ só abrir\b/g, "Basta acessar"],
      [/\bé só responder\b/g, "basta responder"],
    ],
    looseSwaps: [[/\bpara\b/g, "pra"]],
    compose(c) {
      const { n, v, S, A, imp, poss } = c;
      const energy = n.energy === 5
        ? [sentence("Essa é fácil.", true)]
        : [];

      const opening = [
        [sentence("Dá, sim.", true)],
        [sentence("Dá para ler, sim.", true)],
        [sentence("Dá para ler, sim, e estão todas em um lugar só.", true)],
        [sentence("Dá, sim.", true), sentence("Edição boa não vence: só espera a hora certa de ser lida.")],
        [sentence("Dá, sim.", true), sentence("Edição antiga é carta que ainda procura leitor.")],
      ][n.style - 1];

      const pick = c.impersonal ? "é possível filtrar" : imp("escolher");
      const body = [
        "É só abrir o site e clicar em Arquivo.",
        "É só abrir o site e clicar em Arquivo > Edições.",
        "É só abrir o site e clicar em Arquivo > Edições; a lista se filtra por tema.",
        `Em Arquivo > Edições, ${pick} ${c.impersonal ? "por" : ""} tema ou mês; são 86 edições desde 2023, cada uma com link permanente.`,
        `Em Arquivo > Edições, ${pick} ${c.impersonal ? "por" : ""} tema ou mês (as edições de antes de 2023 estão em PDF); cada edição tem link permanente, e o RSS traz o texto completo das últimas 20.`,
      ][n.technicality - 1];

      const certainty = [
        `Em geral o arquivo abre direto, mas, se não abrir, ${S}${v("conferir")}${A.with}.`,
        `O arquivo deve abrir direto; se não abrir, ${S}${v("conferir")}${A.with}.`,
        "O arquivo abre direto, sem cadastro.",
        "O arquivo abre direto, sem cadastro e sem senha.",
        "Pronto: tudo abre na hora, sem cadastro nenhum.",
      ][n.certainty - 1];

      const humor = {
        4: [sentence("Nada de pedir edição antiga por e-mail.")],
        5: [sentence("Tem edição antiga com mais leitores hoje do que na semana em que saiu.")],
      }[n.humor] || [];

      const attitude = {
        1: [sentence(`${S}${v("agradecer")} o contato.`)],
        4: [sentence("Conteúdo trancado atrás de cadastro, aqui, não tem.")],
        5: [sentence("Arquivo trancado em outro lugar?"), sentence(c.impersonal ? "O problema era o lugar." : `O problema nunca foi${A.obj}.`)],
      }[n.attitude] || [];

      const role = {
        mentor: c.impersonal
          ? "Dica: as edições marcadas com estrela são as mais lidas e um bom começo."
          : `Dica: ${imp("comecar")} pelas edições marcadas com estrela, as mais lidas.`,
        peer: c.speaker === "i"
          ? "Eu releio as antigas quando falta ideia."
          : c.named
            ? `${c.ref} relê as antigas quando falta ideia.`
            : c.register === "informal"
              ? "A gente relê as antigas quando falta ideia."
              : "Relemos as antigas quando falta ideia.",
        expert: `${S}${v("ver")} isso nos números: quem começa pelo arquivo lê, em média, quatro edições.`,
        host: c.impersonal
          ? "As cinco mais lidas também podem ser enviadas a pedido; basta responder."
          : `Se preferir, ${S}${v("mandar")} as cinco mais lidas${A.to}; é só responder.`,
        provocateur: c.impersonal
          ? "Newsletter sem arquivo é só barulho na caixa de entrada."
          : `Newsletter sem arquivo é só barulho na ${poss("f")} caixa de entrada.`,
      }[c.role];

      const cta = c.register === "formal"
        ? sentence(`Para qualquer outra coisa, ${S}${v("ficar")} à disposição.`)
        : c.register === "informal"
          ? sentence("Qualquer coisa, é só chamar.", true)
          : sentence("Se precisar de mais alguma coisa, é só responder.");

      return [
        [...energy, ...opening, sentence(body)],
        [sentence(certainty), ...humor, ...attitude],
        [sentence(role)],
        [cta],
      ];
    },
  },
};
