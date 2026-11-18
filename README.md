# Brand Voice Creator

Build a brand's voice the way you build a video game character. Pick the foundation, move the temperament sliders and watch a sample text rewrite itself live. When you're done, export a Markdown voice guide ready to use as an AI system prompt.

The prototype came out of research on brand tone of voice with AI. Its main finding: adjectives ("friendly, innovative") tell a model nothing. Verifiable rules and real examples work. Here, every position of every slider becomes a concrete rule and an example sentence.

## What's in it

**Foundation.** Who speaks (we, I, or the brand in third person), who it talks to (you, you all, formal you, or impersonal) and the role (mentor, peer, expert, host, provocateur). The address options follow Portuguese, which distinguishes "você", "vocês" and "o senhor"; English maps them to "you", group greetings and a formal register.

**Temperament.** Seven axes from 1 to 5: formal ↔ casual, serious ↔ playful, respectful ↔ irreverent, calm ↔ enthusiastic, direct ↔ lyrical, simple ↔ technical, cautious ↔ assertive. The first four come from the Nielsen Norman Group's tone dimensions.

**Finish.** Sentence length, exclamation marks, emoji, preferred and forbidden words. The forbidden list starts with common tics of AI-written text in English and Portuguese. The sample text respects the sentence length limit by splitting long sentences at their natural joints.

**The brand.** What the sliders can't say, all optional: what the brand does and for whom, who reads its texts, what it believes (up to 4 short beliefs), how a text opens and closes, what it never does (up to 6) and the word pairs it uses ("neighbors, not customers", up to 8). The guide puts the business, the reader and the beliefs in a section near the top, the opening, the closing and the "never" lines as concrete house rules, and the pairs in the vocabulary. Empty fields leave no trace in the guide. Each field has a length limit so the guide stays short and the link stays shareable.

**Tone by situation.** The voice stays, the tone shifts. In a service outage, for example, humor and energy drop 2 points from the base voice. The built-in situations can be switched off when the brand doesn't write for them (at least one stays on), and you can add up to 6 of your own with a name, when it applies and an optional shift from -2 to +2 on any axis, the same shape as the built-in ones. Your own situations show up in the preview tabs, in the tags of the examples, in "Test the guide" and in the guide, spelled out like the built-in ones. They have no stock sentences, so their built text is a launch text at the situation's tone, and says so; "Write with Claude" writes the real one.

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

**Approved examples.** The brand's real texts, each tagged with a situation (one of the ones in use, "General", or a label of your own), a language and where it came from: pasted by hand, kept from a diagnosis, or written by Claude and approved. These are the guide's examples, because examples are what a model imitates most. Without any, the guide falls back to the built texts, marked to the model as illustrations of the rules about a fictional product, not as the brand's subject matter.

**Rejected texts.** Every "Approve as example" button (in the preview and in "Test the guide") has a "Reject" next to it, which asks for a short reason in a field right there. The text goes to a separate "Rejected texts" list, where the text, reason, situation and language can be edited or the text removed. A text is either approved or rejected: choosing the other option moves it. Approved examples also have an optional note, for you only. The guide gets a short "Not like this" section with the latest 4 rejected texts in the guide's language that have a reason, each marked with its reason. It tells the model to avoid the pattern the reason names, not the subject, and not to copy the phrases. That way the guide improves with use.

**Export.** Markdown guide, the checker and the skill package (below), settings as JSON, and a link with the voice encoded in the URL. The settings file carries everything. The link carries the voice, the brand fields and the situations (they are capped in length, so it stays shareable), but not the approved and rejected texts, since a few full texts would make it too long. Those stay in the browser, so opening a link keeps the ones you have. Settings files from before the brand fields and situations existed still load, with those left empty and the built-in situations in use.

**The checker and the skill package.** "Download checker" gives `check-voice.mjs`, the meter as one standalone script with this voice's settings inside (the guide's language, the sentence limit, the exclamation and emoji limits, the forbidden words, and the expected levels of the base voice and of each situation in use). It needs only Node 18 or newer, no install. The model writes its draft to a file and runs `node check-voice.mjs draft.txt` (or pipes the text in); `--situation "Service outage"` (the situation's name or id) checks against that situation's shifted levels, and `--lang en|pt` overrides the language. It prints one line per check, `ok` or `FAIL` with a one-line fix, and exits 0 when everything passes, 1 when something needs fixing and 2 on wrong usage, so an agent can loop until it passes. The script is assembled in the browser from the source of `js/meter.js`, so it never drifts from the meter in the app. "Download skill (.zip)" packs a folder `voice-<brand>/` with `SKILL.md` (name and description, then the guide, plus one extra line telling the model to run the checker on each draft and fix the failures before replying) and `check-voice.mjs`, for agents that support skills: unzip it into the agent's skills folder (for Claude Code, `~/.claude/skills/` or a project's `.claude/skills/`). The plain guide has no checker line. Both follow the language picked in the export dialog. The checks are the same word-list and formula checks as the meter, so they catch mechanical slips, not tone: a draft can pass and still sound off.

**The guide is written for the model, not for a person.** It targets one language, chosen in the export dialog (it starts on the language most of the approved texts are in, else the one being previewed), and only carries that language's notes, illustrations and examples. The temperament comes in order of how much each axis defines the voice: an axis pushed to 1 or 5 gets its rule plus a "this, not this" pair taken from the neighbouring levels of its ladder (and a second "nor this" for the middle), an axis at 2 or 4 gets the rule and one pair, and axes left at 3 take one line each. Each situation is spelled out as the rules of the levels it lands on ("Energy drops to 1 of 5: Calm: no exclamation marks…") rather than as "energy −2". Readability is asked for in terms the model can follow while writing (word choice and average sentence length), not as a Flesch score; the meter still checks the score. The stock sentences about the fictional finance report appear only as illustrations, framed as such.

## With Claude (optional)

With an Anthropic API key you can:

- **Write with Claude:** generate the situation's text from the guide, in the language being previewed, to compare with the built text. One click approves it into the examples, or rejects it with a reason. It's a preview, not a test. With "What it does, and for whom" filled in, the text is about the brand's real business (details the guide doesn't give, like prices and dates, come out in [brackets]). Without it, a built-in situation is about the fictional product, a monthly finance report.
- **Test the guide:** write one to three short requests of your own, the texts the brand would really need (a post about something new, an email about a change customers won't like, a reply to a late order), each with an optional situation. Claude writes each one with the guide as its only instructions. A second call then reads the texts blind: it gets the texts and the ruler of levels, never the guide, the requests or your settings, and places the sliders. The result is a score ("the guide carried 5 of 7 axes"), a table of set against read with the reader's reason per axis, the foundation and finish that didn't match, and the meter's failed checks on each text. Any of the texts can be approved into the examples or rejected with a reason. A test costs one call per request plus one for the reading, shown on the button before you run it.

How the test scores:

| What | Counts as carried |
|---|---|
| Each of the 7 axes | The blind reading lands within one level of the setting (✓ same level, ≈ one off, ! two or more) |
| Who speaks, role | Exact match |
| Who it talks to | Exact match, or the form the situation calls for (a reply to one person never says "you all") |
| Sentence length, exclamation marks, emoji | The texts stay within the limit: no exclamation mark under "one per text" is fine, more than allowed is not |

One reading covers all the texts together, so when a request is tagged with a situation (built-in or your own) the expected level is the one the guide asks for there (an outage drops humor and energy), and with several texts it's the median of theirs. Untagged requests and free labels use the base voice. The guide already tells the model what the brand does, so the test requests only need to say what each text is about. A reading on fewer than 150 words in total is rough; the result says so.
- **Diagnose my texts:** paste one to three real texts from the brand and Claude places the sliders, with a reason per axis. The texts are kept as approved examples, tagged with the situation you pick for each (untick the box to skip that). Undo puts the sliders back and leaves the examples.

  The same reading also extracts the brand's **habits**: what the sliders can't say and what makes the voice recognisable. It looks for how the texts open and close, the words and expressions the brand reaches for, the words it uses where others use another ("neighbors", not "customers"), signature moves in punctuation, formatting and sentence shape, and what the texts never do. Each habit comes as something checkable rather than an adjective, with an excerpt copied from the texts as evidence and the numbers of the texts it was seen in; habits that rest on a single text are marked as such, and when the evidence is thin the list is empty rather than invented. The habits are written in the texts' language, the rest of the diagnosis in English. Nothing is applied on its own: the habits are listed with boxes (those seen in more than one text start ticked) and one button adds the ticked ones to the brand fields: openings and closings to "How a text opens/closes", avoided things to "We never…", pairs to "We say X, not Y" and recurring words to the preferred words. Nothing already in a field is replaced: a one-line field gets the habit after what's there, a list gets new lines, duplicates are skipped and each field keeps its limit. The same button then undoes it, putting those fields back; "Undo and go back" reverts the sliders and the fields together. Signature moves have no field yet, so they are shown with their evidence but not applied. The blind reading in "Test the guide" skips the habits, since it only needs the sliders.

The key goes straight from the browser to Anthropic, with no server in between. It's only stored in the browser if you tick "remember". Use a test key with a spending limit. The model is `claude-opus-5-5`, with Anthropic's server-side fallback in case a request is declined by mistake.

## Running it

Live at **https://feruiz.github.io/brand-voice-creator/**.

To run it locally there's nothing to install. Serve the folder with any static server:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` straight from disk doesn't work, because JavaScript modules need a server.

## Layout

| File | What it does |
|---|---|
| `js/data.js` | Foundation, axes (rule and example per level), finish, situations and presets, and the helpers that list the situations in use |
| `js/scenes-pt.js` | Portuguese sample sentences, conjugated by who speaks and who it talks to |
| `js/scenes-en.js` | The same in English |
| `js/compose.js` | Builds the sample text and applies the finish |
| `js/meter.js` | Verifiable rules and readability formulas |
| `js/brand.js` | The brand fields (limits, lists, word pairs), the cleanup of the brand's own situations, and the habits the diagnosis found: cleanup and applying them to the fields |
| `js/examples.js` | Approved and rejected examples: situation tags, language guess and cleanup |
| `js/checker.js` | Builds the standalone checker script from `js/meter.js` and this voice's settings, and the skill package |
| `js/zip.js` | A small zip writer (stored files, no compression) for the skill package |
| `js/guide.js` | Builds the Markdown guide and the combination warnings |
| `js/guide-test.js` | The guide test's scoring: compares the blind reading with the settings and runs the meter on each text |
| `js/claude.js` | Optional Claude calls: writing, and the diagnosis with its ruler and habits prompt |
| `js/app.js` | Interface |

## Known limits

- The built text comes from hand-written sentences. There are thousands of combinations, but it doesn't replace real writing. It shows the direction of the voice.
- Readability formulas only look at sentence and word length. They don't measure clarity or tone.
- The readability targets per technicality level are suggestions, not an industry standard.
- Humor and irreverence have no reliable automatic check.

## License

MIT.
