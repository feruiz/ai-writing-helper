// Portuguese sample texts. Each sentence is picked by the level of one axis and
// conjugated by the foundation (who speaks and who it talks to).

const sentence = (t, exclaimable = false) => ({ t, exclaimable });

// Forms by speaker: [eu, nós, the brand]
const VERBS = {
  lancar: ["lancei", "lançamos", "lançou"],
  corrigir: ["corrigi", "corrigimos", "corrigiu"],
  trocar: ["troquei", "trocamos", "trocou"],
  ativar: ["ativei", "ativamos", "ativou"],
  reprocessar: ["reprocessei", "reprocessamos", "reprocessou"],
  colocar: ["coloquei", "colocamos", "colocou"],
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
  fazer: ["faço", "fazemos", "faz"],
  ficar: ["fico", "ficamos", "fica"],
  ir: ["vou", "vamos", "vai"],
  poder: ["posso", "podemos", "pode"],
};

// Imperative: [informal, formal, plural]
const IMPERATIVE = {
  abrir: ["abre", "abra", "abram"],
  acessar: ["acessa", "acesse", "acessem"],
  dar: ["dá", "dê", "deem"],
  responder: ["responde", "responda", "respondam"],
  escolher: ["escolhe", "escolha", "escolham"],
};

const POSSESSIVE = { m: "seu", f: "sua", mp: "seus", fp: "suas" };
const ADDRESS = {
  you: { pron: "você", obj: " você", with: " com você", for: " por você", will: "vai", can: "pode", poss: POSSESSIVE },
  youPlural: { pron: "vocês", obj: " vocês", with: " com vocês", for: " por vocês", will: "vão", can: "podem", poss: POSSESSIVE },
  formal: { pron: "o(a) senhor(a)", obj: " o(a) senhor(a)", with: " com o(a) senhor(a)", for: " pelo(a) senhor(a)", will: "vai", can: "pode", poss: POSSESSIVE },
  impersonal: { pron: "", obj: "", with: "", for: "", will: "vai", can: "pode", poss: { m: "o", f: "a", mp: "os", fp: "as" } },
};

export function contextPt(state, n, scene) {
  const i = { i: 0, we: 1, brand: 2 }[state.speaker];
  // A reply to one person: "vocês" makes no sense.
  const address = scene.individual && state.address === "youPlural" ? "you" : state.address;
  const register = n.formality <= 2 ? "formal" : n.formality >= 4 ? "informal" : "neutral";
  const name = state.brand.trim() || "Lumen";
  const ref = state.article === "none" ? name : `${state.article} ${name}`;
  const ofBrand = state.article === "o" ? `do ${name}` : state.article === "a" ? `da ${name}` : `de ${name}`;
  const isBrand = state.speaker === "brand";
  return {
    n, register, name, ref, ofBrand, isBrand,
    speaker: state.speaker,
    A: ADDRESS[address],
    impersonal: address === "impersonal",
    group: address === "youPlural",
    v: (verb) => VERBS[verb][i],
    // subject before the verb: dropped for "eu" and "nós", the name in third person
    S: isBrand ? `${ref} ` : "",
    // subject for sentences about the team
    team: isBrand ? "a equipe " : "",
    // explicit subject, when the sentence needs one
    subj: state.speaker === "i" ? "eu " : isBrand ? "a equipe " : "",
    already: (verb) => (isBrand ? `${ref} já ${VERBS[verb][i]}` : `já ${VERBS[verb][i]}`),
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
  if (f === 1) return readerName ? `Prezada ${readerName},` : c.group ? "Prezados clientes," : "Prezado(a) cliente,";
  if (f === 2) return readerName ? `Olá, ${readerName},` : c.group ? "Olá a todos," : "Olá,";
  if (f === 3) return readerName ? `Oi, ${readerName},` : c.group ? "Oi, pessoal," : "Oi,";
  if (f === 4) return readerName ? `Oi, ${readerName}, tudo bem?` : c.group ? "Oi, pessoal, tudo bem?" : "Oi, tudo bem?";
  return readerName ? `E aí, ${readerName}?` : c.group ? "E aí, galera?" : "E aí?";
}

export const SCENES_PT = {
  launch: {
    emoji: "📊",
    formalSwaps: [
      [/\bAbre em um clique\b/g, "Pode ser acessado com um único clique"],
      [/ e mostra /g, " e apresenta "],
      [/, separa /g, ", organiza "],
      [/\bchegou\b/g, "está disponível"],
    ],
    looseSwaps: [
      [/\bo dinheiro\b/g, "a grana"],
      [/\bem uma\b/g, "numa"],
      [/\bem um\b/g, "num"],
      [/\bpara\b/g, "pra"],
    ],
    compose(c) {
      const { n, v, S, team, subj, A, imp, poss } = c;
      const opening = [
        [sentence(`${S}${v("lancar")} hoje o relatório mensal.`, true)],
        [sentence(`${S}${v("lancar")} hoje o relatório mensal, para facilitar o fechamento do mês.`, true)],
        [sentence("O relatório mensal chegou, e o fechamento do mês agora cabe em uma tela.", true)],
        [sentence("Todo mês conta uma história."), sentence("Agora ela tem um lugar: o novo relatório mensal.", true)],
        [sentence("Todo mês deixa rastros: o café de segunda, a venda grande de sexta, a conta que chegou sem aviso."), sentence("Agora esses rastros cabem em uma página só, no novo relatório mensal.", true)],
      ][n.style - 1];

      const body = [
        "Abre em um clique e mostra para onde foi o dinheiro do mês.",
        `Abre em um clique e mostra ${poss("mp")} gastos do mês por categoria.`,
        `Abre em um clique, separa ${poss("mp")} gastos por categoria e compara com o mês anterior.`,
        "Os dados são atualizados todo dia, separados por categoria e comparados com os últimos 12 meses, com exportação em CSV.",
        "Os dados são consolidados às 3h, agrupados por centro de custo e comparados com a média móvel de 12 meses; a exportação sai em CSV ou pela API.",
      ][n.technicality - 1];

      const benefit = [
        `A ideia é que isso ajude${A.obj} a enxergar o mês com mais clareza, mas ${team}ainda ${v("estar")} ajustando detalhes.`,
        `Deve ajudar${A.obj} a enxergar o mês com mais clareza.`,
        `Ajuda${A.obj} a enxergar o mês com mais clareza.`,
        c.impersonal ? "O mês fica claro de ponta a ponta." : `${A.pron} ${A.will} enxergar o mês com clareza.`,
        c.impersonal ? "Fechar o mês no escuro fica no passado." : `${A.pron} nunca mais ${A.will} fechar o mês no escuro.`,
      ][n.certainty - 1];

      const humor = {
        3: [sentence("E a planilha pode, enfim, descansar.")],
        4: [sentence("Sem planilha e sem caça ao recibo perdido.")],
        5: [sentence(c.impersonal ? "A planilha de 14 abas já pode se aposentar." : `${A.can} aposentar a planilha de 14 abas.`), sentence("Ela fez o que pôde.")],
      }[n.humor] || [];

      const attitude = {
        1: [sentence(`${S}${v("agradecer")} a confiança.`)],
        3: [sentence(`Ficou do jeito que ${subj}${v("achar")} que devia ser: simples.`)],
        4: [sentence("Relatório bonito que ninguém abre não serve para nada.")],
        5: [sentence("Relatório que parece declaração de imposto?"), sentence("Aqui não.")],
      }[n.attitude] || [];

      const energy = n.energy === 5
        ? [sentence(`${c.isBrand ? "A equipe mal pode" : `Mal ${v("poder")}`} esperar para ver o que ${c.impersonal ? "vai aparecer aí" : `${A.pron} ${A.will} descobrir`}.`, true)]
        : [];

      const role = {
        mentor: `Nas próximas semanas, ${S}${v("ir")} mandar dicas para ler cada gráfico.`,
        peer: c.speaker === "i"
          ? "Eu uso esse relatório no meu próprio fechamento, todo mês."
          : c.isBrand
            ? `O time ${c.ofBrand} usa esse relatório no próprio fechamento, todo mês.`
            : c.register === "informal"
              ? "A gente usa esse relatório no nosso próprio fechamento, todo mês."
              : "Usamos esse relatório no nosso próprio fechamento, todo mês.",
        expert: `${S}${v("montar")} os cálculos a partir de mais de 2 mil fechamentos de pequenas empresas.`,
        host: `${S}${v("preparar")} um tour rápido para o primeiro acesso.`,
        provocateur: c.impersonal
          ? "Relatório que não muda decisão é só decoração."
          : `Se o ${poss("m")} relatório não muda nenhuma decisão, é só decoração.`,
      }[c.role];

      const cta = c.impersonal
        ? sentence("O relatório já está disponível no painel.")
        : c.register === "formal"
          ? sentence(`${imp("acessar")} o painel para conhecer o novo relatório.`)
          : sentence(`${imp("abrir")} o ${c.register === "informal" ? "app" : "painel"} e ${imp("dar")} uma olhada.`, true);

      return [
        [...opening, sentence(body), sentence(benefit, n.certainty === 5)],
        [...humor, ...attitude, ...energy],
        [sentence(role)],
        [cta],
      ];
    },
  },

  outage: {
    emoji: "🛠️",
    grave: true,
    formalSwaps: [
      [/\bficou fora do ar\b/g, "ficou indisponível"],
      [/\bsentiu\b/g, "foi afetado"],
      [/\bparou\b/g, "ficou indisponível"],
    ],
    looseSwaps: [[/\bpara\b/g, "pra"]],
    compose(c) {
      const { n, v, S, team, subj, A, imp, poss, already } = c;
      const opening = [
        "Ontem, entre 14h10 e 14h50, o sistema ficou fora do ar.",
        "Ontem à tarde, o sistema ficou fora do ar por 40 minutos, e alguns pagamentos agendados atrasaram.",
        "Ontem à tarde, por 40 minutos, o sistema parou, e alguns pagamentos agendados ficaram esperando.",
        "Ontem, por 40 minutos, o sistema ficou em silêncio, e quem tinha pagamento agendado sentiu.",
        "Por 40 minutos, ontem à tarde, tudo parou: telas carregando, pagamentos na fila, gente esperando junto.",
      ][n.style - 1];

      const body = [
        "Já está tudo funcionando, e nenhum dado foi perdido.",
        `${already("corrigir")} o problema, e nenhum dado foi perdido.`,
        `A causa foi uma falha no servidor de pagamentos; ${already("corrigir")} e nenhum dado foi perdido.`,
        `A causa foi um banco de dados que parou de responder; ${S}${v("trocar")} para a cópia de reserva, e os pagamentos atrasados já foram processados, sem perda de dados.`,
        `A causa foi o esgotamento de conexões no banco de dados principal após uma atualização; ${S}${v("ativar")} a réplica às 14h48 e ${v("reprocessar")} 1.312 pagamentos até as 16h, sem perder dados.`,
      ][n.technicality - 1];

      const apology = [
        `${S}${v("pedir")} sinceras desculpas pelo transtorno.`,
        `${S}${v("pedir")} desculpas pelo atraso.`,
        `${S}${v("pedir")} desculpas pelo atraso.`,
        "Desculpa pelo susto.",
        "Foi mal, de verdade.",
      ][n.attitude - 1];

      const certainty = [
        `${c.isBrand ? "a equipe ainda" : "ainda"} ${v("estar")} investigando, mas a ideia é reduzir a chance de isso se repetir.`,
        `${team}${v("estar")} reforçando o sistema, o que deve evitar que isso se repita.`,
        `${S}${v("colocar")} um alerta novo para detectar esse tipo de falha mais cedo.`,
        `${S}${v("colocar")} uma proteção para que essa falha não se repita.`,
        `Essa falha não volta: ${S}${v("eliminar")} a causa na raiz.`,
      ][n.certainty - 1];

      const humor = {
        4: [sentence(c.speaker === "i" ? "Não foi o meu melhor dia." : c.isBrand ? `Não foi o melhor dia ${c.ofBrand}.` : "Não foi o nosso melhor dia.")],
        5: [sentence("O servidor tirou uma soneca que ninguém autorizou.")],
      }[n.humor] || [];

      const energy = n.energy === 5 ? [sentence(`${team}${v("estar")} em cima disso até cada pagamento cair.`, true)] : [];

      const role = {
        mentor: `Para conferir se ${poss("mp")} pagamentos caíram, ${S}${v("deixar")} um passo a passo na central de ajuda.`,
        peer: `${subj}${v("sentir")} isso na pele também: ${c.speaker === "i" ? "o meu" : c.isBrand ? "o próprio" : "o nosso"} fechamento de ontem atrasou junto.`,
        expert: "O relatório técnico completo sai até sexta na página de status.",
        host: `Se algum pagamento ainda estiver pendente, ${S}${v("resolver")} com prioridade.`,
        provocateur: "Sistema que nunca cai não existe. Existe quem avisa rápido e conta tudo.",
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

  question: {
    emoji: "🙂",
    reader: "Marina",
    individual: true,
    formalSwaps: [
      [/\bDá para mudar\b/g, "É possível alterar"],
      [/\bDá, sim\b/g, "É possível, sim"],
      [/\bÉ só ir em\b/g, "Basta acessar"],
      [/\be leva menos\b/g, "e o processo leva menos"],
      [/\bé só responder\b/g, "basta responder"],
    ],
    looseSwaps: [[/\bpara\b/g, "pra"]],
    compose(c) {
      const { n, v, S, A, imp, poss } = c;
      const energy = n.energy === 5
        ? [sentence(c.speaker === "i" ? "Adorei a pergunta." : c.isBrand ? "Ótima pergunta." : "Adoramos a pergunta.", true)]
        : [];

      const opening = [
        [sentence("Dá, sim.", true)],
        [sentence("Dá para mudar, sim.", true)],
        [sentence("Dá para mudar, sim, e leva menos de um minuto.", true)],
        [sentence("Dá, sim.", true), sentence("Vencimento bom é aquele que cai depois que o dinheiro entra.")],
        [sentence("Dá, sim.", true), sentence("Conta boa é a que chega quando o caixa já respira.")],
      ][n.style - 1];

      const pick = c.impersonal ? "é possível escolher" : imp("escolher");
      const body = [
        "É só ir em Configurações e escolher a nova data.",
        "É só ir em Configurações > Cobrança e escolher a nova data.",
        "É só ir em Configurações > Cobrança e escolher a nova data; a mudança vale a partir do próximo boleto.",
        `Em Configurações > Cobrança > Vencimento, ${pick} um dia entre 1 e 28; a alteração vale a partir do próximo ciclo e pode ser feita até duas vezes por ano.`,
        `Em Configurações > Cobrança > Vencimento, ${pick} um dia de 1 a 28 (29 a 31 ficam bloqueados pelos meses curtos); a alteração gera um boleto proporcional na transição e vale até duas vezes por ano, contadas da assinatura.`,
      ][n.technicality - 1];

      const certainty = [
        `Em geral a opção aparece na hora, mas, se não aparecer, ${S}${v("conferir")}${A.with}.`,
        `A opção deve aparecer na hora; se não aparecer, ${S}${v("conferir")}${A.with}.`,
        "A mudança aparece na hora no painel.",
        "A mudança aparece na hora, sem precisar falar com ninguém.",
        "Pronto: a mudança aparece na hora, sem fila e sem espera.",
      ][n.certainty - 1];

      const humor = {
        4: [sentence("Nada de formulário em três vias.")],
        5: [sentence("Boleto não precisa vencer no dia em que o salário ainda está no caminho.")],
      }[n.humor] || [];

      const attitude = {
        1: [sentence(`${S}${v("agradecer")} o contato.`)],
        4: [sentence("Burocracia, aqui, só a que a lei obriga.")],
        5: [sentence(c.impersonal ? "Se em outro lugar isso era complicado, o problema era o lugar." : `Se em outro lugar isso era complicado, o problema nunca foi${A.obj}.`)],
      }[n.attitude] || [];

      const role = {
        mentor: c.impersonal
          ? "Dica: uma data uns três dias depois da entrada do dinheiro funciona melhor."
          : `Dica: ${imp("escolher")} uma data uns três dias depois do dia em que o dinheiro entra.`,
        peer: c.speaker === "i"
          ? "Eu uso o dia 10, depois que os recebimentos caem."
          : c.isBrand
            ? `No time ${c.ofBrand}, o favorito é o dia 10, depois que os recebimentos caem.`
            : c.register === "informal"
              ? "Aqui, a gente usa o dia 10, depois dos recebimentos."
              : "Aqui, usamos o dia 10, depois dos recebimentos.",
        expert: `${S}${v("ver")} isso nos dados: quem põe o vencimento logo depois dos recebimentos atrasa bem menos.`,
        host: c.impersonal
          ? "A mudança também pode ser feita a pedido; basta responder com a data."
          : `Se preferir, ${S}${v("fazer")} a mudança${A.for}; é só responder com a data.`,
        provocateur: c.impersonal
          ? "Vencimento que não conversa com o caixa é armadilha, não regra."
          : `Vencimento que não conversa com o ${poss("m")} caixa é armadilha, não regra.`,
      }[c.role];

      const cta = c.register === "formal"
        ? sentence(`${S}${v("ficar")} à disposição.`)
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
