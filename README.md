# Brand Voice Creator

Build a brand's voice the way you build a video game character. Pick the foundation, move the temperament sliders and watch a sample text rewrite itself live. When you're done, export a Markdown voice guide ready to use as an AI system prompt.

It works with any AI chat and needs no API key: the site never talks to an AI. You build the voice in a conversation with the chat you already use, and carry text between the two by copy and paste.

The prototype came out of research on brand tone of voice with AI. Its main finding: adjectives ("friendly, innovative") tell a model nothing. Verifiable rules and real examples work. Here, every position of every slider becomes a concrete rule and an example sentence.

## What's in it

**Foundation.** Who speaks (we, I, or the brand in third person), who it talks to (you, you all, formal you, or impersonal) and the role (mentor, peer, expert, host, provocateur). The address options follow Portuguese, which distinguishes "você", "vocês" and "o senhor"; English maps them to "you", group greetings and a formal register.

**Temperament.** Seven axes from 1 to 5: formal ↔ casual, serious ↔ playful, respectful ↔ irreverent, calm ↔ enthusiastic, direct ↔ lyrical, simple ↔ technical, cautious ↔ assertive. The first four come from the Nielsen Norman Group's tone dimensions.

**Finish.** Sentence length, exclamation marks, emoji, preferred and forbidden words. The forbidden list starts with common tics of AI-written text in English and Portuguese. The sample text respects the sentence length limit by splitting long sentences at their natural joints.

**The brand.** What the sliders can't say, all optional: what the brand does and for whom, who reads its texts, what it believes (up to 4 short beliefs), how a text opens and closes, what it never does (up to 6) and the word pairs it uses ("neighbors, not customers", up to 8). The guide puts the business, the reader and the beliefs in a section near the top, the opening, the closing and the "never" lines as concrete house rules, and the pairs in the vocabulary. Empty fields leave no trace in the guide. Each field has a length limit so the guide stays short and the link stays shareable.

**Tone by situation.** The voice stays, the tone shifts. In a service outage, for example, humor and energy drop 2 points from the base voice. The built-in situations can be switched off when the brand doesn't write for them (at least one stays on), and you can add up to 6 of your own with a name, when it applies and an optional shift from -2 to +2 on any axis, the same shape as the built-in ones. Your own situations show up in the preview tabs, in the tags of the examples, in "Test the guide" and in the guide, spelled out like the built-in ones. They have no stock sentences, so their built text is a launch text at the situation's tone, and says so; your AI writes the real one ("Copy the request for your AI", below).

**Live preview in English and Portuguese.** One tab per situation in use (by default launch, service outage, customer question). Words that changed are highlighted for a moment.

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

**Approved examples.** The brand's real texts, each tagged with a situation (one of the ones in use, "General", or a label of your own), a language and where it came from: pasted by hand, brought from your AI chat, or written by your AI and approved. These are the guide's examples, because examples are what a model imitates most. Without any, the guide falls back to the built texts, marked to the model as illustrations of the rules about a fictional product, not as the brand's subject matter.

**Rejected texts.** The "Approve as example" button under a text from your AI has a "Reject" next to it, which asks for a short reason in a field right there. The text goes to a separate "Rejected texts" list, where the text, reason, situation and language can be edited or the text removed. A text is either approved or rejected: choosing the other option moves it. Approved examples also have an optional note, for you only. The guide gets a short "Not like this" section with the latest 4 rejected texts in the guide's language that have a reason, each marked with its reason. It tells the model to avoid the pattern the reason names, not the subject, and not to copy the phrases. That way the guide improves with use.

**Export.** Markdown guide, the checker and the skill package (below), settings as JSON, and a link with the voice encoded in the URL. The settings file carries everything. The link carries the voice, the brand fields and the situations (they are capped in length, so it stays shareable), but not the approved and rejected texts, since a few full texts would make it too long. Those stay in the browser, so opening a link keeps the ones you have. Settings files from before the brand fields and situations existed still load, with those left empty and the built-in situations in use.

**The checker and the skill package.** "Download checker" gives `check-voice.mjs`, the meter as one standalone script with this voice's settings inside (the guide's language, the sentence limit, the exclamation and emoji limits, the forbidden words, and the expected levels of the base voice and of each situation in use). It needs only Node 18 or newer, no install. The model writes its draft to a file and runs `node check-voice.mjs draft.txt` (or pipes the text in); `--situation "Service outage"` (the situation's name or id) checks against that situation's shifted levels, and `--lang en|pt` overrides the language. It prints one line per check, `ok` or `FAIL` with a one-line fix, and exits 0 when everything passes, 1 when something needs fixing and 2 on wrong usage, so an agent can loop until it passes. The script is assembled in the browser from the source of `js/meter.js`, so it never drifts from the meter in the app. "Download skill (.zip)" packs a folder `voice-<brand>/` with `SKILL.md` (name and description, then the guide, plus one extra line telling the model to run the checker on each draft and fix the failures before replying) and `check-voice.mjs`, for agents that support skills: unzip it into the agent's skills folder (for Claude Code, `~/.claude/skills/` or a project's `.claude/skills/`). The plain guide has no checker line. Both follow the language picked in the export dialog. The checks are the same word-list and formula checks as the meter, so they catch mechanical slips, not tone: a draft can pass and still sound off.

**The guide is written for the model, not for a person.** It targets one language, chosen in the export dialog (it starts on the language most of the approved texts are in, else the one being previewed), and only carries that language's notes, illustrations and examples. The temperament comes in order of how much each axis defines the voice: an axis pushed to 1 or 5 gets its rule plus a "this, not this" pair taken from the neighbouring levels of its ladder (and a second "nor this" for the middle), an axis at 2 or 4 gets the rule and one pair, and axes left at 3 take one line each. Each situation is spelled out as the rules of the levels it lands on ("Energy drops to 1 of 5: Calm: no exclamation marks…") rather than as "energy −2". Readability is asked for in terms the model can follow while writing (word choice and average sentence length), not as a Flesch score; the meter still checks the score. The stock sentences about the fictional finance report appear only as illustrations, framed as such.

## With your AI chat

No API key and no account. You use the chat you already have (Claude, ChatGPT, Gemini or another), and the site gives you what to paste there and reads back what comes out.

**Build the voice in a conversation.** "Use your AI chat" has three steps:

1. **Start the conversation.** Copies a request to paste in a new conversation, held in English or Portuguese. The AI asks for real texts from the brand and a few questions, places the voice on the site's ruler with an excerpt as evidence per axis, looks for the brand's habits (how its texts open and close, the words it reaches for, its word pairs, what it never does), shows you the proposal, and when you confirm, gives a block of settings. The request works on its own: it carries the ruler and the format of the block. It also points to [`llms.txt`](llms.txt), a plain-text page with the same ruler plus an example sentence for every level, for chats that can read the web (the site itself is built by JavaScript, so a model that opens it sees an empty page). When something is already set here, the request can carry it as a starting point: the voice, the approved texts, and the rejected ones with their reasons. Untick that to start from scratch.
2. **Bring the result back.** Paste the reply, or the whole conversation: the site finds the latest block in it. The block is JSON in the shape of the settings file, with lists as lists and situations by name. Keys it leaves out keep what the site has; its texts are added to the approved examples, skipping any already there. The reading forgives the slips models make: comments, trailing commas, curly quotes, line breaks inside a text, labels or Portuguese words instead of ids ("Formal you", "você"), levels written as "4 of 5", axes outside "axes". What it can't use, it leaves out and says so, one line per value. What changed is listed, with the AI's evidence next to each axis, and one button undoes it all. A settings file downloaded from the site can be pasted here too.
3. **Keep going.** Copies the voice as it stands, to paste in the same conversation after you change it here, so the AI carries on from your adjustments.

**Hear the voice on one situation.** Under the preview, "Copy the request for your AI" copies the guide plus a request for the situation's text, in the language being previewed. Paste it in any chat and paste the text back: it shows under "From your AI", the meter checks it, and it can be approved into the examples or rejected with a reason. With "What it does, and for whom" filled in, the request asks for a text about the brand's real business (details the guide doesn't give come out in [brackets]); without it, a built-in situation comes with its fictional case. If you change the voice after copying the request, the text is marked as written with earlier choices.

**What the site no longer does.** It used to call Claude with the visitor's own API key, to write, to diagnose texts and to run a blind test of the guide. That's gone, along with any key a browser remembered (it's removed on the next visit). The blind test needs two separate AI contexts, one to write with the guide and one to read the texts without it, which a single copy and paste can't give; its scoring (`js/guide-test.js`) stays in the code for a skill that builds the voice inside an agent.

## Running it

Live at **https://feruiz.github.io/brand-voice-creator/**.

To run it locally there's nothing to install. Serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` straight from disk doesn't work, because JavaScript modules need a server.

`llms.txt` is generated from the same data as the sliders. After changing `js/data.js`, `js/brand.js` or `js/prompts.js`, regenerate it with `node scripts/build-llms.mjs`. `npm test` checks that it's up to date and runs the tests of the block and the requests (Node 22 or newer, nothing to install).

## Layout

| File | What it does |
|---|---|
| `js/data.js` | Foundation, axes (rule and example per level), finish, situations and presets, and the helpers that list the situations in use |
| `js/scenes-pt.js` | Portuguese sample sentences, conjugated by who speaks and who it talks to |
| `js/scenes-en.js` | The same in English |
| `js/compose.js` | Builds the sample text and applies the finish |
| `js/meter.js` | Verifiable rules and readability formulas |
| `js/brand.js` | The brand fields (limits, lists, word pairs) and the cleanup of the brand's own situations |
| `js/examples.js` | Approved and rejected examples: situation tags, language guess and cleanup |
| `js/checker.js` | Builds the standalone checker script from `js/meter.js` and this voice's settings, and the skill package |
| `js/zip.js` | A small zip writer (stored files, no compression) for the skill package |
| `js/guide.js` | Builds the Markdown guide and the combination warnings |
| `js/state.js` | Cleans any voice that comes in (storage, link, settings file, block) into a valid state, and encodes the link |
| `js/block.js` | The block of settings between the site and a chat: writes the voice as a block, finds and reads the block in a pasted reply, lists what changed |
| `js/prompts.js` | What the site hands over to paste into a chat (the request that starts a conversation, the voice as it stands, the request for one text) and the text of `llms.txt` |
| `js/guide-test.js` | The blind test's scoring, kept for the voice-building skill; no screen uses it now |
| `js/app.js` | Interface |
| `llms.txt` | The page for models: what the site is, the ruler with an example sentence per level, and the block's format. Generated, not edited by hand |
| `scripts/build-llms.mjs` | Writes `llms.txt`; with `--check`, fails when it's out of date |
| `tests/` | Tests of the block and the requests, with replies broken the way models break them |

## Known limits

- The built text comes from hand-written sentences. There are thousands of combinations, but it doesn't replace real writing. It shows the direction of the voice.
- Readability formulas only look at sentence and word length. They don't measure clarity or tone.
- The readability targets per technicality level are suggestions, not an industry standard.
- Humor and irreverence have no reliable automatic check.
- How well a chat follows the request varies by model and plan. The site checks the block it gets back and the meter checks the texts, but it can't check the conversation itself.

## License

MIT.
