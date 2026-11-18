// English sample texts. Same logic as the Portuguese ones: each sentence comes
// from the level of one axis and is adjusted by who speaks and who it talks to.
// English has no "o senhor": the ceremonious address becomes a formal register.

const sentence = (t, exclaimable = false) => ({ t, exclaimable });

// Forms by speaker: [I, we, by name]
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
  [/\bwould not\b/g, "wouldn't"],
];

const YOU = { pron: "you", obj: " you", with: " with you", poss: "your" };
const ADDRESS = {
  you: YOU,
  youPlural: YOU,
  formal: YOU,
  impersonal: { pron: "", obj: "", with: "", poss: "the" },
};

export function contextEn(state, n, scene) {
  const i = { i: 0, we: 1, byName: 2 }[state.speaker];
  const address = scene.individual && state.address === "youPlural" ? "you" : state.address;
  const register = state.address === "formal" || n.formality <= 2 ? "formal" : n.formality >= 4 ? "informal" : "neutral";
  const name = state.name.trim() || "Lumen";
  return {
    n, register, name,
    speaker: state.speaker,
    named: state.speaker === "byName",
    A: ADDRESS[address],
    group: address === "youPlural",
    impersonal: address === "impersonal",
    v: (verb) => VERBS[verb][i],
    S: ["I ", "we ", `${name} `][i],
    subj: ["I", "we", name][i],
    subjBe: ["I am", "we are", `${name} is`][i],
    // the object form: "give me a shout", "give us a shout"
    obj: ["me", "us", name][i],
  };
}

export function greetingEn(c, readerName) {
  if (c.impersonal && !readerName) return null;
  let f = c.register === "formal" ? Math.min(c.n.formality, 2) : c.n.formality;
  if (c.grave) f = Math.min(f, 3);
  if (f === 1) return readerName ? `Dear ${readerName},` : c.group ? "Dear readers," : "Dear reader,";
  if (f === 2) return readerName ? `Hello ${readerName},` : c.group ? "Hello everyone," : "Hello,";
  if (f === 3) return readerName ? `Hi ${readerName},` : c.group ? "Hi everyone," : "Hi,";
  if (f === 4) return readerName ? `Hi ${readerName}, how are you?` : c.group ? "Hi everyone, how's it going?" : "Hi, how's it going?";
  return readerName ? `Hey ${readerName},` : c.group ? "Hey folks," : "Hey there,";
}

export const SCENES_EN = {
  goodNews: {
    emoji: "📬",
    formalSwaps: [
      [/\bis here\b/g, "is now available"],
      [/\bIt arrives\b/g, "It is delivered"],
      [/\bIt goes out\b/g, "It is sent"],
    ],
    looseSwaps: [],
    compose(c) {
      const { n, v, S, subj, A } = c;
      const opening = [
        [sentence(`${S}launched the newsletter today.`, true)],
        [sentence(`${S}launched the newsletter today, for anyone with no time to follow everything.`, true)],
        [sentence("The newsletter is here, and the week now fits in five minutes of reading.", true)],
        [sentence("Every week tells a story."), sentence("Now it has a home: the new newsletter.", true)],
        [sentence("Every week leaves traces: Monday's idea, Wednesday's doubt, Friday's discovery."), sentence("Now those traces fit in a single email, in the new newsletter.", true)],
      ][n.style - 1];

      const body = [
        "It arrives every Friday with the best of the week.",
        `It arrives in ${A.poss} inbox every Friday with the week's best links.`,
        "It arrives every Friday with the best links by topic, all kept in an archive on the site.",
        "It goes out every Friday at 7 am, about 800 words, with three fixed sections, a searchable archive and RSS.",
        "It sends weekly at 7 am, about 800 words, DKIM-signed, with full-text RSS and one-click unsubscribe.",
      ][n.technicality - 1];

      const benefit = [
        `The idea is that it helps${A.obj} follow the week with less noise, but ${c.subjBe} still fine-tuning the format.`,
        `It should help${A.obj} follow the week with less noise.`,
        `It helps${A.obj} follow the week with less noise.`,
        c.impersonal ? "The week becomes clear in five minutes." : "You will follow the week without effort.",
        c.impersonal ? "Missing what matters is over." : "You will never miss what matters again.",
      ][n.certainty - 1];

      const humor = {
        3: [sentence("And those forty open tabs can finally rest.")],
        4: [sentence("No forty open tabs, no hunting for the lost link.")],
        5: [sentence(c.impersonal ? "The forty open tabs can retire now." : "You can close those forty open tabs."), sentence("They did their best.")],
      }[n.humor] || [];

      const attitude = {
        1: [sentence(`${S}${v("appreciate")} ${c.impersonal ? "the" : "your"} interest.`)],
        3: [sentence(`It turned out the way ${subj} wanted it: short.`)],
        4: [sentence("A long newsletter nobody finishes is useless.")],
        5: [sentence("A newsletter that reads like a press release?"), sentence("Not here.")],
      }[n.attitude] || [];

      const energy = n.energy === 5
        ? [sentence(`${subj} can hardly wait to hear what ${c.impersonal ? "readers think" : "you think"}.`, true)]
        : [];

      const role = {
        mentor: `In the first issue, ${S}will explain how to get the most from each section.`,
        peer: c.speaker === "i"
          ? "I write the newsletter I wanted to get."
          : c.named
            ? `${c.name} writes the newsletter that was missing.`
            : "We write the newsletter we wanted to get.",
        expert: `${S}built the selection from more than 200 sources read every week.`,
        host: `${S}prepared a welcome issue for ${A.poss} first week.`,
        provocateur: c.impersonal
          ? "An inbox that teaches nothing is just noise."
          : "If your inbox teaches you nothing, it is just noise.",
      }[c.role];

      const cta = c.impersonal
        ? sentence("Subscriptions are already open on the site.")
        : c.register === "formal"
          ? sentence("Please visit the site to subscribe.")
          : sentence(`Open the ${c.register === "informal" ? "link" : "site"} and subscribe.`, true);

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
      [/\bwent out twice\b/g, "was sent twice"],
      [/\barrived twice\b/g, "was delivered twice"],
      [/\bwould not open\b/g, "did not work"],
    ],
    looseSwaps: [],
    compose(c) {
      const { n, v, S, A } = c;
      const opening = [
        "Yesterday at 7 am, this week's issue went out twice.",
        "Yesterday morning, this week's issue went out twice, and the second copy had broken links.",
        "Yesterday morning, the issue arrived twice, and the second copy brought links that would not open.",
        "Yesterday, the newsletter spoke twice, and the second time its links led nowhere.",
        "Yesterday morning, the same issue knocked twice: the second time with links that opened onto nothing, and people clicking without getting anywhere.",
      ][n.style - 1];

      const body = [
        "The right issue is on the site, with every link working.",
        `${S}fixed the links, and the right issue is on the site.`,
        `The cause was an error in the sending automation; ${S}fixed it, and the right issue is on the site.`,
        `The cause was a template change that triggered the send twice; ${S}rolled back to the previous template, and the links in the issue on the site are fixed.`,
        `The cause was a duplicated trigger in the automation after a template change; the second batch went out with links to the staging environment; ${S}disabled the trigger at 7:40 am and resent the correct version to 1,312 subscribers.`,
      ][n.technicality - 1];

      const apology = [
        `${S}sincerely ${v("apologize")} for the inconvenience.`,
        `${S}${v("apologize")} for the duplicate email.`,
        `${S}${v("apologize")} for the duplicate email.`,
        "Sorry for the double email.",
        c.speaker === "i" ? "My bad, truly." : c.named ? "A real slip, truly." : "Our bad, truly.",
      ][n.attitude - 1];

      const certainty = [
        `${c.subjBe} still investigating, but the idea is to reduce the chance of this happening again.`,
        `${c.subjBe} reviewing the automation, which should keep this from happening again.`,
        `${S}added a test before every send to catch this earlier.`,
        `${S}put a review in place before every send so this does not happen again.`,
        `This will not come back: ${S}removed the root cause.`,
      ][n.certainty - 1];

      const humor = {
        4: [sentence(c.speaker === "i" ? "Not my finest Friday." : c.named ? `Not ${c.name}'s finest Friday.` : "Not our finest Friday.")],
        5: [sentence("The newsletter got so excited it said everything twice.")],
      }[n.humor] || [];

      const energy = n.energy === 5 ? [sentence(`${c.subjBe} watching every send until the next issue goes out right.`, true)] : [];

      const role = {
        mentor: `To find the right links, ${S}left the corrected issue at the top of the site.`,
        peer: c.speaker === "i"
          ? "I felt it too: my own inbox got both copies."
          : c.named
            ? `${c.name} felt it too: both copies landed in ${c.name}'s own inbox.`
            : "We felt it too: our own inbox got both copies.",
        expert: "The full account of what happened will be on the site by Monday.",
        host: `If any link still does not open, ${S}will fix it right away; just reply.`,
        provocateur: "A newsletter that never slips does not exist. What exists is someone who warns fast and tells everything.",
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

  reply: {
    emoji: "🙂",
    reader: "Marina",
    individual: true,
    formalSwaps: [
      [/\bJust open\b/g, "Please open"],
      [/\bjust reply\b/g, "simply reply"],
    ],
    looseSwaps: [],
    compose(c) {
      const { n, v, S, A } = c;
      const yes = c.impersonal ? "Yes, it is possible." : "Yes, you can.";
      const energy = n.energy === 5 ? [sentence("Great question.", true)] : [];

      const opening = [
        [sentence(yes, true)],
        [sentence(c.impersonal ? "Yes, past issues can be read." : "Yes, you can read them.", true)],
        [sentence(c.impersonal ? "Yes, past issues can be read, and they are all in one place." : "Yes, you can read them, and they are all in one place.", true)],
        [sentence(yes, true), sentence("A good issue does not expire: it just waits for the right time to be read.")],
        [sentence(yes, true), sentence("An old issue is a letter still looking for its reader.")],
      ][n.style - 1];

      const filter = c.impersonal ? "it is possible to filter" : "filter";
      const body = [
        "Just open the site and click Archive.",
        "Just open the site and go to Archive > Issues.",
        "Just open the site and go to Archive > Issues; the list filters by topic.",
        `In Archive > Issues, ${filter} by topic or month; there are 86 issues since 2023, each with a permanent link.`,
        `In Archive > Issues, ${filter} by topic or month (issues from before 2023 are PDFs); each issue has a permanent link, and the RSS feed carries the full text of the last 20.`,
      ][n.technicality - 1];

      const certainty = [
        `It usually opens right away, but if it does not, ${S}will check it${A.with}.`,
        `The archive should open right away; if it does not, ${S}will check it${A.with}.`,
        "The archive opens right away, no sign-up.",
        "The archive opens right away, no sign-up, no password.",
        "Done: it all opens right away, no sign-up, no password, no waiting.",
      ][n.certainty - 1];

      const humor = {
        4: [sentence("No emailing anyone to ask for an old issue.")],
        5: [sentence("The old issues are not in a drawer: they are just waiting for visitors.")],
      }[n.humor] || [];

      const attitude = {
        1: [sentence(c.impersonal ? `${S}${v("appreciate")} the message.` : `${S}${v("thank")} you for reaching out.`)],
        4: [sentence("Nothing here is locked behind a sign-up.")],
        5: [sentence("An archive locked somewhere else?"), sentence(c.impersonal ? "The problem was the place." : "The problem was never you.")],
      }[n.attitude] || [];

      const role = {
        mentor: c.impersonal
          ? "Tip: the starred issues are the most read and a good place to start."
          : "Tip: start with the starred issues, the most read.",
        peer: c.speaker === "i"
          ? "I reread the old ones when I run out of ideas."
          : c.named
            ? `${c.name} rereads the old ones when ideas run out.`
            : "We reread the old ones when we run out of ideas.",
        expert: `${S}${v("see")} it in the numbers: readers who start from the archive read four issues on average.`,
        host: c.impersonal
          ? "The five most read can also be sent on request; a reply is enough."
          : `If you prefer, ${S}can send you the five most read; just reply.`,
        provocateur: c.impersonal
          ? "A newsletter without an archive is just inbox noise."
          : "A newsletter without an archive is just noise in your inbox.",
      }[c.role];

      const cta = c.register === "formal"
        ? sentence(c.impersonal ? `${S}${v("remain")} available for anything else.` : `${S}${v("remain")} available if you need anything else.`)
        : c.register === "informal"
          ? sentence(`Anything else, just give ${c.obj} a shout.`, true)
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
