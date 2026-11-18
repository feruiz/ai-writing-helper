// English sample texts. Same logic as the Portuguese ones: each sentence comes
// from the level of one axis and is adjusted by who speaks and who it talks to.
// English has no "o senhor": the ceremonious address becomes a formal register.

const sentence = (t, exclaimable = false) => ({ t, exclaimable });

// Forms by speaker: [I, we, the brand]
const VERBS = {
  apologize: ["apologize", "apologize", "apologizes"],
  thank: ["thank", "thank", "thanks"],
  appreciate: ["appreciate", "appreciate", "appreciates"],
  see: ["see", "see", "sees"],
  remain: ["remain", "remain", "remains"],
};

// Contractions kick in from formality level 4.
export const CONTRACTIONS = [
  [/\bI am\b/g, "I'm"],
  [/\b([Ww])e are\b/g, "$1e're"],
  [/\b([Yy])ou will\b/g, "$1ou'll"],
  [/\b([Ii])t is\b/g, "$1t's"],
  [/\bdoes not\b/g, "doesn't"],
  [/\bdo not\b/g, "don't"],
  [/\bwill not\b/g, "won't"],
  [/\bis not\b/g, "isn't"],
];

const YOU = { pron: "you", obj: " you", with: " with you", for: " for you", poss: "your" };
const ADDRESS = {
  you: YOU,
  youPlural: YOU,
  formal: YOU,
  impersonal: { pron: "", obj: "", with: "", for: "", poss: "the" },
};

export function contextEn(state, n, scene) {
  const i = { i: 0, we: 1, brand: 2 }[state.speaker];
  const address = scene.individual && state.address === "youPlural" ? "you" : state.address;
  const register = state.address === "formal" || n.formality <= 2 ? "formal" : n.formality >= 4 ? "informal" : "neutral";
  const name = state.brand.trim() || "Lumen";
  return {
    n, register, name,
    speaker: state.speaker,
    isBrand: state.speaker === "brand",
    A: ADDRESS[address],
    group: address === "youPlural",
    impersonal: address === "impersonal",
    v: (verb) => VERBS[verb][i],
    S: ["I ", "we ", `${name} `][i],
    subj: ["I", "we", "the team"][i],
    subjBe: ["I am", "we are", "the team is"][i],
  };
}

export function greetingEn(c, readerName) {
  if (c.impersonal && !readerName) return null;
  let f = c.register === "formal" ? Math.min(c.n.formality, 2) : c.n.formality;
  if (c.grave) f = Math.min(f, 3);
  if (f === 1) return readerName ? `Dear ${readerName},` : c.group ? "Dear customers," : "Dear customer,";
  if (f === 2) return readerName ? `Hello ${readerName},` : c.group ? "Hello everyone," : "Hello,";
  if (f === 3) return readerName ? `Hi ${readerName},` : c.group ? "Hi everyone," : "Hi,";
  if (f === 4) return readerName ? `Hi ${readerName}, how are you?` : c.group ? "Hi everyone, how's it going?" : "Hi, how's it going?";
  return readerName ? `Hey ${readerName},` : c.group ? "Hey folks," : "Hey there,";
}

export const SCENES_EN = {
  launch: {
    emoji: "📊",
    formalSwaps: [
      [/\bIt opens in one click\b/g, "It can be accessed with a single click"],
      [/\bis here\b/g, "is now available"],
    ],
    looseSwaps: [[/\btake a look\b/g, "check it out"]],
    compose(c) {
      const { n, v, S, subj, A } = c;
      const opening = [
        [sentence(`${S}launched the monthly report today.`, true)],
        [sentence(`${S}launched the monthly report today, to make closing the month easier.`, true)],
        [sentence("The monthly report is here, and closing the month now fits on one screen.", true)],
        [sentence("Every month tells a story."), sentence("Now it has a home: the new monthly report.", true)],
        [sentence("Every month leaves traces: Monday's coffee, Friday's big sale, the bill that showed up unannounced."), sentence("Now those traces fit on a single page, in the new monthly report.", true)],
      ][n.style - 1];

      const body = [
        "It opens in one click and shows where the month's money went.",
        `It opens in one click and shows ${A.poss} monthly spending by category.`,
        `It opens in one click, sorts ${A.poss} spending by category and compares it with last month.`,
        "Data updates daily, split by category and compared with the last 12 months, with CSV export.",
        "Data is consolidated daily at 3 am, grouped by cost center and benchmarked against a 12-month moving average; export via CSV or the API.",
      ][n.technicality - 1];

      const benefit = [
        `The idea is that it helps${A.obj} see the month more clearly, but ${c.subjBe} still fine-tuning details.`,
        `It should help${A.obj} see the month more clearly.`,
        `It helps${A.obj} see the month more clearly.`,
        c.impersonal ? "The month becomes clear from start to finish." : "You will see the month clearly.",
        c.impersonal ? "Closing the month in the dark is over." : "You will never close the month in the dark again.",
      ][n.certainty - 1];

      const humor = {
        3: [sentence("And the spreadsheet can finally rest.")],
        4: [sentence("No spreadsheets, no hunting for lost receipts.")],
        5: [sentence(c.impersonal ? "The 14-tab spreadsheet can retire now." : "You can retire the 14-tab spreadsheet."), sentence("It did its best.")],
      }[n.humor] || [];

      const attitude = {
        1: [sentence(`${S}${v("appreciate")} ${c.impersonal ? "the" : "your"} trust.`)],
        3: [sentence(`It turned out the way ${subj} wanted it: simple.`)],
        4: [sentence("A beautiful report nobody opens is useless.")],
        5: [sentence("A report that looks like a tax return?"), sentence("Not here.")],
      }[n.attitude] || [];

      const energy = n.energy === 5
        ? [sentence(`${subj} can hardly wait to see what ${c.impersonal ? "shows up" : "you will discover"}.`, true)]
        : [];

      const role = {
        mentor: `Over the next few weeks, ${S}will send tips on reading each chart.`,
        peer: c.speaker === "i"
          ? "I use this report for my own month-end close, every month."
          : c.isBrand
            ? `The ${c.name} team uses this report for its own month-end close, every month.`
            : "We use this report for our own month-end close, every month.",
        expert: `${S}built the calculations from more than 2,000 small-business closes.`,
        host: `${S}prepared a quick tour for ${A.poss} first visit.`,
        provocateur: c.impersonal
          ? "A report that changes no decision is just decoration."
          : "If your current report changes no decision, it is just decoration.",
      }[c.role];

      const cta = c.impersonal
        ? sentence("The report is already available on the dashboard.")
        : c.register === "formal"
          ? sentence("Visit the dashboard to see the new report.")
          : sentence(`Open the ${c.register === "informal" ? "app" : "dashboard"} and take a look.`, true);

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
      [/\bwas down\b/g, "was unavailable"],
      [/\bfelt it\b/g, "was affected"],
    ],
    looseSwaps: [],
    compose(c) {
      const { n, v, S, A } = c;
      const opening = [
        "Yesterday, from 2:10 to 2:50 pm, the system was down.",
        "Yesterday afternoon, the system was down for 40 minutes, and some scheduled payments were delayed.",
        "Yesterday afternoon, for 40 minutes, the system stopped, and some scheduled payments were left waiting.",
        "Yesterday, for 40 minutes, the system went silent, and anyone with a scheduled payment felt it.",
        "For 40 minutes yesterday afternoon, everything stopped: screens loading, payments queued, people waiting along with them.",
      ][n.style - 1];

      const body = [
        "Everything is working again, and no data was lost.",
        `${S}fixed the problem, and no data was lost.`,
        `The cause was a failure in the payment server; ${S}fixed it, and no data was lost.`,
        `The cause was a database that stopped responding; ${S}switched to the backup copy, and the delayed payments have already been processed, with no data lost.`,
        `The cause was connection exhaustion on the primary database after an update; ${S}activated the replica at 2:48 pm and reprocessed 1,312 payments by 4 pm, with no data lost.`,
      ][n.technicality - 1];

      const apology = [
        `${S}sincerely ${v("apologize")} for the inconvenience.`,
        `${S}${v("apologize")} for the delay.`,
        `${S}${v("apologize")} for the delay.`,
        "Sorry for the scare.",
        c.speaker === "i" ? "My bad, truly." : "Our bad, truly.",
      ][n.attitude - 1];

      const certainty = [
        `${c.subjBe} still investigating, but the idea is to reduce the chance of this happening again.`,
        `${c.subjBe} reinforcing the system, which should keep this from happening again.`,
        `${S}added a new alert to catch this kind of failure earlier.`,
        `${S}put a safeguard in place so this failure does not happen again.`,
        `This failure will not come back: ${S}removed the root cause.`,
      ][n.certainty - 1];

      const humor = {
        4: [sentence(c.speaker === "i" ? "Not my finest day." : c.isBrand ? `Not ${c.name}'s finest day.` : "Not our finest day.")],
        5: [sentence("The server took a nap nobody approved.")],
      }[n.humor] || [];

      const energy = n.energy === 5 ? [sentence(`${c.subjBe} on it until every payment lands.`, true)] : [];

      const role = {
        mentor: `To check whether ${A.poss} payments went through, ${S}left a step-by-step guide in the help center.`,
        peer: c.speaker === "i"
          ? "I felt it too: my own month-end close was delayed yesterday."
          : c.isBrand
            ? `The ${c.name} team felt it too: its own close was delayed yesterday.`
            : "We felt it too: our own month-end close was delayed yesterday.",
        expert: "The full technical report will be on the status page by Friday.",
        host: `If any payment is still pending, ${S}will handle it first.`,
        provocateur: "A system that never goes down does not exist. What exists is a company that warns fast and tells everything.",
      }[c.role];

      const cta = c.impersonal
        ? "Questions can be sent in reply to this message."
        : c.register === "formal"
          ? "If you have any questions, please reply to this message."
          : c.register === "informal"
            ? "Anything else, just reply here."
            : "If you have any questions, just reply to this message.";

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
      [/\bJust go to\b/g, "Please go to"],
      [/\bjust reply\b/g, "simply reply"],
    ],
    looseSwaps: [],
    compose(c) {
      const { n, v, S, A } = c;
      const yes = c.impersonal ? "Yes, it is possible." : "Yes, you can.";
      const energy = n.energy === 5 ? [sentence("Great question.", true)] : [];

      const opening = [
        [sentence(yes, true)],
        [sentence(c.impersonal ? "Yes, the date can be changed." : "Yes, you can change it.", true)],
        [sentence(c.impersonal ? "Yes, the date can be changed, and it takes less than a minute." : "Yes, you can change it, and it takes less than a minute.", true)],
        [sentence(yes, true), sentence("A good due date is one that falls after the money comes in.")],
        [sentence(yes, true), sentence("A good bill is one that arrives when the cash flow can breathe.")],
      ][n.style - 1];

      const pick = c.impersonal ? "it is possible to pick" : "pick";
      const body = [
        "Just go to Settings and pick the new date.",
        "Just go to Settings > Billing and pick the new date.",
        "Just go to Settings > Billing and pick the new date; the change applies from the next bill.",
        `In Settings > Billing > Due date, ${pick} a day between 1 and 28; the change applies from the next cycle and can be made up to twice a year.`,
        `In Settings > Billing > Due date, ${pick} a day from 1 to 28 (short months block 29 to 31); the change creates a prorated bill for the transition and is limited to twice a year from signup.`,
      ][n.technicality - 1];

      const certainty = [
        `It usually shows up right away, but if it does not, ${S}will check it${A.with}.`,
        `The option should show up right away; if it does not, ${S}will check it${A.with}.`,
        "The change shows up right away on the dashboard.",
        "The change shows up right away, no need to talk to anyone.",
        "Done: the change shows up right away, no queue, no waiting.",
      ][n.certainty - 1];

      const humor = {
        4: [sentence("No forms in triplicate.")],
        5: [sentence(`A bill does not have to be due on the day ${A.poss} paycheck is still on its way.`)],
      }[n.humor] || [];

      const attitude = {
        1: [sentence(c.impersonal ? `${S}${v("appreciate")} the message.` : `${S}${v("thank")} you for reaching out.`)],
        4: [sentence("Red tape here is only what the law requires.")],
        5: [sentence(c.impersonal ? "If this was complicated somewhere else, the problem was the place." : "If this was complicated somewhere else, the problem was never you.")],
      }[n.attitude] || [];

      const role = {
        mentor: c.impersonal
          ? "Tip: a date about three days after the money comes in works best."
          : "Tip: pick a date about three days after the money comes in.",
        peer: c.speaker === "i"
          ? "I use the 10th, after payments come in."
          : c.isBrand
            ? `At ${c.name}, the favorite is the 10th, after payments come in.`
            : "Here on the team, we use the 10th, after payments come in.",
        expert: `${S}${v("see")} it in the data: due dates set just after income arrives mean far fewer late payments.`,
        host: c.impersonal
          ? "The change can also be made on request; a reply with the date is enough."
          : `If you prefer, ${S}can make the change${A.for}; just reply with the date.`,
        provocateur: c.impersonal
          ? "Due dates that ignore cash flow are traps, not rules."
          : "Due dates that ignore your cash flow are traps, not rules.",
      }[c.role];

      const cta = c.register === "formal"
        ? sentence(c.impersonal ? `${S}${v("remain")} available for anything else.` : `${S}${v("remain")} available if you need anything else.`)
        : c.register === "informal"
          ? sentence(`Anything else, just give ${["me", "us", "the team"][["i", "we", "brand"].indexOf(c.speaker)]} a shout.`, true)
          : sentence(c.impersonal ? "For anything else, a reply to this message is enough." : "If you need anything else, just reply.");

      return [
        [...energy, ...opening, sentence(body)],
        [sentence(certainty), ...humor, ...attitude],
        [sentence(role)],
        [cta],
      ];
    },
  },
};
