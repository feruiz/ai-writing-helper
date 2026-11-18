# AI Writing Helper

Teach any AI to write in a voice: yours, a project's or a brand's. Build it the way you build a video game character. Pick the foundation, move the temperament sliders and watch a sample text rewrite itself live. When you're done, export a Markdown voice guide ready to use as an AI system prompt, with a script that checks drafts against it.

It works with any AI chat and needs no API key: the site never talks to an AI. You build the voice in a conversation with the chat you already use, and carry text between the two by copy and paste.

It started as Brand Voice Creator, out of research on brand tone of voice with AI, and widened to any writing voice. The main finding still holds: adjectives ("friendly, innovative") tell a model nothing. Verifiable rules and real examples work. Here, every position of every slider becomes a concrete rule and an example sentence.

## What's in it

**Foundation.** Who speaks (I, we, or by name in third person), who it talks to (you, you all, formal you, or impersonal) and the role (mentor, peer, expert, host, provocateur). The address options follow Portuguese, which distinguishes "você", "vocês" and "o senhor"; English maps them to "you", group greetings and a formal register.

**Temperament.** Seven axes from 1 to 5: formal ↔ casual, serious ↔ playful, respectful ↔ irreverent, calm ↔ enthusiastic, direct ↔ lyrical, simple ↔ technical, cautious ↔ assertive. The first four come from the Nielsen Norman Group's tone dimensions.

**Finish.** Sentence length, exclamation marks, emoji, preferred and forbidden words, and the AI tics the checker flags (below). The forbidden list is the voice's own; it starts empty. The sample text respects the sentence length limit by splitting long sentences at their natural joints.

**About the writing.** What the sliders can't say, all optional: what it's about and what it's for (a personal site, a newsletter, a product), who reads it, what it believes (up to 4 short beliefs), how a text opens and closes, what it never does (up to 6) and the word pairs it uses ("readers, not users", up to 8). The guide puts what it's about, the reader and the beliefs in a section near the top, the opening, the closing and the "never" lines as concrete house rules, and the pairs in the vocabulary. Empty fields leave no trace in the guide. Each field has a length limit so the guide stays short and the link stays shareable.

**Tone by situation.** The voice stays, the tone shifts. In bad news, for example, humor and energy drop 2 points from the base voice. The built-in situations (good news, bad news, a reply to someone) can be switched off when you don't write in them (at least one stays on), and you can add up to 6 of your own with a name, when it applies and an optional shift from -2 to +2 on any axis, the same shape as the built-in ones. Your own situations show up in the preview tabs, in the tags of the examples and in the guide, spelled out like the built-in ones. They have no stock sentences, so their built text is the good news text at the situation's tone, and says so; your AI writes the real one ("Copy the request for your AI", below).

**Live preview in English and Portuguese.** One tab per situation in use. The built text is about a fictional weekly newsletter (its launch, an issue that went out twice with broken links, a reader asking for past issues), a subject that fits a person and an organization alike. Words that changed are highlighted for a moment.

**Verifiable rules.** Under the text, a meter checks what can be checked without asking anyone:

| Check | What it looks at |
|---|---|
| Who speaks | First-person pronouns and verb forms ("we", "lançamos") and mentions of the name; the most frequent must match the choice |
| Reader | "you", "você", "vocês", "o(a) senhor(a)"; no form other than the chosen one may appear |
| Sentences | Every sentence within the length limit |
| Rhythm | How much sentence length varies; flat rhythm is a common tell of machine-written text, and lyrical voices need more variation |
| Readability | Portuguese: Flesch adapted by Martins et al. (1996). English: Flesch Reading Ease and the Flesch-Kincaid grade level. Target depends on the Simple ↔ Technical axis |
| Certainty | Hedges ("should", "a ideia é") against boosters ("always", "nunca mais"); cautious voices need hedges, assertive voices allow none |
| Informality | Contractions and colloquial words ("we're", "hey", "pra", "a gente"); none allowed in a formal voice |
| Exclamation marks, emoji, forbidden words | Against the finish settings |
| AI tics | Patterns that make a text read as machine-written (below) |

Syllable counting and the word lists are approximations. Treat a failed check as a prompt to look, not as a verdict.

**AI tics.** The meter, the exported checker and the guide also look for what makes a text read as machine-written, in English and Portuguese. Only patterns a script can find without many false alarms are checked:

| Kind | Example | Flags on |
|---|---|---|
| Chatbot phrases | "Great question", "Espero ter ajudado" | One |
| Stock phrases | "In today's fast-paced world", "Vale ressaltar", "Em suma" | One |
| Puffery | "a testament to", "plays a pivotal role", "papel fundamental" | One |
| Buzzwords | "leverage", "robust", "ecossistema", "alavancar" | 3 or more, and 1.5 per 100 words |
| Contrast formulas | "It's not just X, it's Y", "Não é apenas X, é Y" | One |
| Lists of three | "fast, simple and cheap", sentence after sentence | 2 or more, in at least 20% of the sentences |
| Dashes | "—" piling up (no longer a strong sign: recent models avoid them) | 3 or more, and 1.5 per 100 words |
| Staged reveals | "The result? …", "A grande sacada é:" | One |
| Tacked-on analysis | ", highlighting…", ", reforçando…" | One |
| Formal transitions | "Moreover", "Além disso" at the start of sentence after sentence | 3, or the same one twice |
| Repeated openings | Three sentences in a row starting with the same word | One run |
| Heavy formatting | Headings, bold labels or emoji bullets in a short message | Depends on the case |
| Bureaucratese | "Please be advised", "venho por meio deste", "vou estar enviando" | One |

The voice wins. Under Finish, each kind can be unticked when the voice uses it on purpose, and each box says when the approved texts do it ("in 2 of your approved texts"), which is the sign to untick it. The guide gets a short "Not like an AI" section with the kinds still on, plus what no script can check (rotating synonyms, sentences that would fit any subject, closing a paragraph by restating it), and says that an approved example that does one of these wins. The kinds the voice uses go in the chat's block as `allowedTics`. The built sample texts are tested to have none of these tics, at the ends of every pair of axes. Settings from before this check that kept the old default forbidden list, which was all AI tics, get the new empty list.

**Warnings for odd combinations.** For example, formal and irreverent at once, or lyrical and technical together.

**Portrait and ladder.** A radar chart shows the voice's profile. The ladder shows the five levels of the last axis you touched, with the rule and example for each.

**Ready-made characters and randomize.** Six starting voices (academic, columnist, friendly newsletter, technical writer, formal institution, provocative brand) and a dice button.

**Approved examples.** Real texts in this voice, each tagged with a situation (one of the ones in use, "General", or a label of your own), a language and where it came from: pasted by hand, brought from your AI chat, or written by your AI and approved. These are the guide's examples, because examples are what a model imitates most. Without any, the guide falls back to the built texts, marked to the model as illustrations of the rules about a fictional newsletter, not as the writer's subject matter.

**Rejected texts.** The "Approve as example" button under a text from your AI has a "Reject" next to it, which asks for a short reason in a field right there. The text goes to a separate "Rejected texts" list, where the text, reason, situation and language can be edited or the text removed. A text is either approved or rejected: choosing the other option moves it. Approved examples also have an optional note, for you only. The guide gets a short "Not like this" section with the latest 4 rejected texts in the guide's language that have a reason, each marked with its reason. It tells the model to avoid the pattern the reason names, not the subject, and not to copy the phrases. That way the guide improves with use.

**Export.** Markdown guide, the checker and the skill package (below), settings as JSON, and a link with the voice encoded in the URL. The settings file carries everything. The link carries the voice, the fields about the writing and the situations (they are capped in length, so it stays shareable), but not the approved and rejected texts, since a few full texts would make it too long. Those stay in the browser, so opening a link keeps the ones you have. Settings files and links from before these fields existed still load, with those left empty, and so does everything saved when the site was Brand Voice Creator: the old names (`brand`, `business`, the "brand" speaker, the launch, outage and question situations) are read as the new ones, and what the browser kept moves over on the first visit.

**The checker and the skill package.** "Download checker" gives `check-voice.mjs`, the meter as one standalone script with this voice's settings inside (the guide's language, the sentence limit, the exclamation and emoji limits, the forbidden words, and the expected levels of the base voice and of each situation in use). It needs only Node 18 or newer, no install. The model writes its draft to a file and runs `node check-voice.mjs draft.txt` (or pipes the text in); `--situation "Bad news"` (the situation's name or id) checks against that situation's shifted levels, and `--lang en|pt` overrides the language. It prints one line per check, `ok` or `FAIL` with a one-line fix (for AI tics, one line per kind found, with the excerpt), and exits 0 when everything passes, 1 when something needs fixing and 2 on wrong usage, so an agent can loop until it passes. The script is assembled in the browser from the source of the meter's files (`js/text.js`, `js/tics.js`, `js/meter.js`), so it never drifts from the meter in the app. "Download skill (.zip)" packs a folder `voice-<name>/` with `SKILL.md` (name and description, then the guide, plus one extra line telling the model to run the checker on each draft and fix the failures before replying) and `check-voice.mjs`, for agents that support skills: unzip it into the agent's skills folder (for Claude Code, `~/.claude/skills/` or a project's `.claude/skills/`). The plain guide has no checker line. Both follow the language picked in the export dialog. The checks are the same word-list and formula checks as the meter, so they catch mechanical slips, not tone: a draft can pass and still sound off.

**The guide is written for the model, not for a person.** It targets one language, chosen in the export dialog (it starts on the language most of the approved texts are in, else the one being previewed), and only carries that language's notes, illustrations and examples. The temperament comes in order of how much each axis defines the voice: an axis pushed to 1 or 5 gets its rule plus a "this, not this" pair taken from the neighbouring levels of its ladder (and a second "nor this" for the middle), an axis at 2 or 4 gets the rule and one pair, and axes left at 3 take one line each. Each situation is spelled out as the rules of the levels it lands on ("Energy drops to 1 of 5: Calm: no exclamation marks…") rather than as "energy −2". Readability is asked for in terms the model can follow while writing (word choice and average sentence length), not as a Flesch score; the meter still checks the score. The stock sentences about the fictional newsletter appear only as illustrations, framed as such.

## With your AI chat

No API key and no account. You use the chat you already have (Claude, ChatGPT, Gemini or another), and the site gives you what to paste there and reads back what comes out.

**Build the voice in a conversation.** "Use your AI chat" has three steps:

1. **Start the conversation.** Copies a request to paste in a new conversation, held in English or Portuguese. The AI asks whose voice it is, for real texts written in it and a few questions, places the voice on the site's ruler with an excerpt as evidence per axis, looks for the voice's habits (how its texts open and close, the words it reaches for, its word pairs, what it never does), shows you the proposal, and when you confirm, gives a block of settings. The request works on its own: it carries the ruler and the format of the block. It also points to [`llms.txt`](llms.txt), a plain-text page with the same ruler plus an example sentence for every level, for chats that can read the web (the site itself is built by JavaScript, so a model that opens it sees an empty page). When something is already set here, the request can carry it as a starting point: the voice, the approved texts, and the rejected ones with their reasons. Untick that to start from scratch.
2. **Bring the result back.** Paste the reply, or the whole conversation: the site finds the latest block in it. The block is JSON in the shape of the settings file, with lists as lists and situations by name. Keys it leaves out keep what the site has; its texts are added to the approved examples, skipping any already there. The reading forgives the slips models make: comments, trailing commas, curly quotes, line breaks inside a text, labels or Portuguese words instead of ids ("Formal you", "você"), levels written as "4 of 5", axes outside "axes". What it can't use, it leaves out and says so, one line per value. What changed is listed, with the AI's evidence next to each axis, and one button undoes it all. A settings file downloaded from the site can be pasted here too.
3. **Keep going.** Copies the voice as it stands, to paste in the same conversation after you change it here, so the AI carries on from your adjustments.

**Hear the voice on one situation.** Under the preview, "Copy the request for your AI" copies the guide plus a request for the situation's text, in the language being previewed. Paste it in any chat and paste the text back: it shows under "From your AI", the meter checks it, and it can be approved into the examples or rejected with a reason. With "What it's about" filled in, the request asks for a text about that real subject (details the guide doesn't give come out in [brackets]); without it, a built-in situation comes with its fictional case. If you change the voice after copying the request, the text is marked as written with earlier choices.

**What the site no longer does.** It used to call Claude with the visitor's own API key, to write, to diagnose texts and to run a blind test of the guide. That's gone, along with any key a browser remembered (it's removed on the next visit). The blind test needs two separate AI contexts, one to write with the guide and one to read the texts without it, which a single copy and paste can't give; its scoring (`js/guide-test.js`) stays in the code for a skill that builds the voice inside an agent.

## Running it

Live at **https://feruiz.github.io/ai-writing-helper/**.

To run it locally there's nothing to install. Serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` straight from disk doesn't work, because JavaScript modules need a server.

`llms.txt` is generated from the same data as the sliders. After changing `js/data.js`, `js/fields.js`, `js/tics.js` or `js/prompts.js`, regenerate it with `node scripts/build-llms.mjs`. `npm test` checks that it's up to date and runs the tests (Node 22 or newer, nothing to install): the block and the requests, the migration from the old names, and the sample texts, which must pass the meter for the initial voice and every ready-made character, and conjugate right for every speaker, reader and role.

## Layout

| File | What it does |
|---|---|
| `js/data.js` | Foundation, axes (rule and example per level), finish, situations and presets, and the helpers that list the situations in use |
| `js/scenes-pt.js` | Portuguese sample sentences, conjugated by who speaks and who it talks to |
| `js/scenes-en.js` | The same in English |
| `js/compose.js` | Builds the sample text and applies the finish |
| `js/text.js` | Plain text helpers shared by the meter and the AI tics: words, sentences, whole-word patterns |
| `js/tics.js` | The AI tics: each kind's patterns, rule for the guide, example and fix |
| `js/meter.js` | Verifiable rules and readability formulas |
| `js/fields.js` | The fields about the writing (limits, lists, word pairs) and the cleanup of the writer's own situations |
| `js/examples.js` | Approved and rejected examples: situation tags, language guess and cleanup |
| `js/checker.js` | Builds the standalone checker script from `js/meter.js` and this voice's settings, and the skill package |
| `js/zip.js` | A small zip writer (stored files, no compression) for the skill package |
| `js/guide.js` | Builds the Markdown guide and the combination warnings |
| `js/state.js` | Cleans any voice that comes in (storage, link, settings file, block) into a valid state, reads the old names, and encodes the link |
| `js/block.js` | The block of settings between the site and a chat: writes the voice as a block, finds and reads the block in a pasted reply, lists what changed |
| `js/prompts.js` | What the site hands over to paste into a chat (the request that starts a conversation, the voice as it stands, the request for one text) and the text of `llms.txt` |
| `js/guide-test.js` | The blind test's scoring, kept for the voice-building skill; no screen uses it now |
| `js/app.js` | Interface |
| `llms.txt` | The page for models: what the site is, the ruler with an example sentence per level, and the block's format. Generated, not edited by hand |
| `scripts/build-llms.mjs` | Writes `llms.txt`; with `--check`, fails when it's out of date |
| `tests/` | Tests of the block (with replies broken the way models break them), the requests, the migration, the sample texts, the AI tics and the exported checker run end to end |

## Known limits

- The built text comes from hand-written sentences. There are thousands of combinations, but it doesn't replace real writing. It shows the direction of the voice.
- Readability formulas only look at sentence and word length. They don't measure clarity or tone.
- The readability targets per technicality level are suggestions, not an industry standard.
- Humor and irreverence have no reliable automatic check.
- How well a chat follows the request varies by model and plan. The site checks the block it gets back and the meter checks the texts, but it can't check the conversation itself.

## Credits

The AI tic lists are our own, short, and informed by [blader/humanizer](https://github.com/blader/humanizer), [hardikpandya/stop-slop](https://github.com/hardikpandya/stop-slop), [petergyang/no-ai-slop](https://github.com/petergyang/no-ai-slop) and [tbhb/vale-ai-tells](https://github.com/tbhb/vale-ai-tells) (MIT), the "humanizar" skill in [fabricioctelles/skills](https://github.com/fabricioctelles/skills) (Apache-2.0) and Wikipedia's [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) (CC BY-SA 4.0). Nothing from them is copied whole.

## License

MIT.
