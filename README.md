# Brand Voice Creator

Build a brand's voice the way you build a video game character. Pick the foundation, move the temperament sliders and watch a sample text rewrite itself live. When you're done, export a Markdown voice guide ready to use as an AI system prompt.

The prototype came out of research on brand tone of voice with AI. Its main finding: adjectives ("friendly, innovative") tell a model nothing. Verifiable rules and real examples work. Here, every position of every slider becomes a concrete rule and an example sentence.

## What's in it

**Foundation.** Who speaks (we, I, or the brand in third person), who it talks to (you, you all, formal you, or impersonal) and the role (mentor, peer, expert, host, provocateur). The address options follow Portuguese, which distinguishes "você", "vocês" and "o senhor"; English maps them to "you", group greetings and a formal register.

**Temperament.** Seven axes from 1 to 5: formal ↔ casual, serious ↔ playful, respectful ↔ irreverent, calm ↔ enthusiastic, direct ↔ lyrical, simple ↔ technical, cautious ↔ assertive. The first four come from the Nielsen Norman Group's tone dimensions.

**Finish.** Sentence length, exclamation marks, emoji, preferred and forbidden words. The forbidden list starts with common tics of AI-written text in English and Portuguese. The sample text respects the sentence length limit by splitting long sentences at their natural joints.

**Tone by situation.** The voice stays, the tone shifts. In a service outage, for example, humor and energy drop 2 points from the base voice.

**Live preview in English and Portuguese.** Three situations (launch, service outage, customer question). Words that changed are highlighted for a moment.

**Verifiable rules.** Under the text, a meter checks what can be checked without asking anyone:

| Check | What it looks at |
|---|---|
| Who speaks | First-person pronouns and verb forms ("we", "lançamos") and mentions of the brand; the most frequent must match the choice |
| Reader | "you", "você", "vocês", "o(a) senhor(a)"; no form other than the chosen one may appear |
| Sentences | Every sentence within the length limit |
| Rhythm | How much sentence length varies; flat rhythm is a common tell of machine-written text, and lyrical voices need more variation |
| Readability | Portuguese: Flesch adapted by Martins et al. (1996). English: Flesch Reading Ease and the Flesch-Kincaid grade level. Target depends on the Simple ↔ Technical axis |
| Certainty | Hedges ("should", "a ideia é") against boosters ("always", "nunca mais"); cautious voices need hedges, assertive voices allow none |
| Informality | Contractions and colloquial words ("we're", "hey", "pra", "a gente"); none allowed in a formal voice |
| Exclamation marks, emoji, forbidden words | Against the finish settings |

Syllable counting and the word lists are approximations. Treat a failed check as a prompt to look, not as a verdict.

**Warnings for odd combinations.** For example, formal and irreverent at once, or lyrical and technical together.

**Portrait and ladder.** A radar chart shows the voice's profile. The ladder shows the five levels of the last axis you touched, with the rule and example for each.

**Ready-made characters and randomize.** Five starting voices and a dice button.

**Export.** Markdown guide (with notes on writing in each language and examples in both), settings as JSON, and a link with the voice encoded in the URL.

## With Claude (optional)

With an Anthropic API key you can:

- **Write with Claude:** generate the situation's text from the exported guide, to compare with the built text.
- **Diagnose my texts:** paste one to three real texts from the brand and Claude places the sliders, with a reason per axis. You can undo it.

The key goes straight from the browser to Anthropic, with no server in between. It's only stored in the browser if you tick "remember". Use a test key with a spending limit. The model is `claude-opus-5-5`, with Anthropic's server-side fallback in case a request is declined by mistake.

## Running it

Nothing to install. Serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` straight from disk doesn't work, because JavaScript modules need a server.

## Layout

| File | What it does |
|---|---|
| `js/data.js` | Foundation, axes (rule and example per level), finish, situations and presets |
| `js/scenes-pt.js` | Portuguese sample sentences, conjugated by who speaks and who it talks to |
| `js/scenes-en.js` | The same in English |
| `js/compose.js` | Builds the sample text and applies the finish |
| `js/meter.js` | Verifiable rules and readability formulas |
| `js/guide.js` | Builds the Markdown guide and the combination warnings |
| `js/claude.js` | Optional Claude calls |
| `js/app.js` | Interface |

## Known limits

- The built text comes from hand-written sentences. There are thousands of combinations, but it doesn't replace real writing. It shows the direction of the voice.
- Readability formulas only look at sentence and word length. They don't measure clarity or tone.
- The readability targets per technicality level are suggestions, not an industry standard.
- Humor and irreverence have no reliable automatic check.

## License

MIT.
