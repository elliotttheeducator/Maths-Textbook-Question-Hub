# Maths Textbook Question Hub

A single-page classroom app: put it on the big screen, work through a
chapter's questions in the order Cambridge designed them, and get a
Socratic AI tutor to help — using the actual textbook page images, not an
AI recreation of them.

**The textbook is the source of truth.** Every question and worked example
the app displays is a direct image crop of the real Cambridge PDF — nothing
is re-typed, re-drawn, or reinterpreted. The AI never invents a question or
states "the" official answer; it only helps the student reason through the
method, and (once the answer key is added) the official worked answer is
also just a crop from the real Answers PDF.

No backend, no database, no student accounts. It's static HTML/CSS/JS that
runs entirely in the browser.

## Quick start

1. Open `index.html` in a browser (or serve the folder — see Deployment below).
2. Click **⚙️ Settings**, paste in a free Gemini API key, and save.
   - Get one at Google AI Studio (aistudio.google.com) — sign in with any
     Google account, no billing required for the free tier.
   - The key is stored only in that browser's `localStorage`. It is sent
     directly from the browser to Google's API and nowhere else.
   - Optionally set a **Teacher PIN** here too (see Teacher mode below).
3. The home screen lists every chapter — click one to open its cover screen
   (Key Ideas and Worked Examples, scrollable, straight from the textbook).
4. Click **Ready? Start questions →**. Questions run in the exact order
   Cambridge printed them (fluency → problem-solving → reasoning →
   enrichment, increasing difficulty) — sequential by default, never
   shuffled. Each question shows the cropped textbook image (plus a shared
   instruction/context image where relevant); students type into the chat
   box below it and the AI tutor asks guiding questions back rather than
   marking it right/wrong.

## Teacher mode

Answers, jumping around, and picking a custom subset of questions are all
gated behind **Teacher mode** (the 🔒 button in the header) so students
never see a reveal button on the shared screen by default:

- Set a **Teacher PIN** in Settings (optional — if you leave it blank,
  clicking the toggle turns Teacher mode on immediately with no gate; the
  PIN is friction to keep the button off the student-facing screen, not
  real security).
- With Teacher mode on, three things appear:
  - **Show official worked answer** on each question, revealing the actual
    Cambridge answer crop (or an honest "not available yet" note if that
    question's official answer hasn't been wired in).
  - **🗺️ Jump to a question** on the chapter cover — a full map of every
    question, grouped the same way the textbook groups them, click any one
    to go straight there.
  - **☑️ Pick a custom subset** on the chapter cover — check exactly the
    questions/sub-parts you want covered (e.g. "1a, 1c, 1e, 4b, 4d") and
    start a session containing only those, in the order you picked them.
- Teacher mode resets to off on every page load — nothing stays unlocked
  after a refresh.

## Sub-parts, not merged questions

Every lettered sub-part (a, b, c, ...) is its own question with its own
image, its own chat thread, and its own progress-bar step — a combined
image like "Q4 a-f" (six independent triangle diagrams in one picture) was
genuinely ambiguous for the chat tutor and for tracking which part a
student was answering, so each part is cropped separately. Where several
sub-parts share instructions that only appear once on the page (e.g. "For
each of the following angle sizes, find (i) the supplementary angle (ii)
the complementary angle"), that shared instruction is its own
`contextImage`, shown above the specific sub-part's image so nothing
printed on the page is lost — see the `contextImage` field in the schema
below.

## Deployment (GitHub Pages)

This repo is a static site, so GitHub Pages works with zero config:

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the repo settings, enable **Pages** → source: deploy from branch →
   pick the branch and `/ (root)`.
3. Your class URL will be `https://<user>.github.io/<repo>/`.

## How a chapter is built

Unlike a typical "paste text, AI writes questions" tool, chapters here are
**sliced, not authored**. The pipeline is:

1. You provide the chapter PDF (and, ideally, the matching Answers PDF) to
   a Claude Code session with this repo open.
2. Claude renders the PDF pages, reads exact text-block coordinates
   (`tools/slice_chapter.py`'s `blocks` command) to find each logical
   region precisely rather than guessing from a screenshot, and crops
   every sub-part separately — key ideas, each worked example, and every
   lettered sub-part of every numbered exercise question — straight out of
   the PDF at high resolution. No OCR, no redrawing, pixel crops of the
   real page.
3. Claude also extracts the embedded text under each crop (`get_text`,
   not OCR — these are digitally typeset PDFs) to write private
   `aiNotes` per question: solving notes for the AI tutor's own reasoning.
   These notes are **never shown to students** and are never treated as a
   confirmed answer unless the official Answers PDF backs them up.
4. Claude writes `questions/<chapter>/manifest.json` referencing the
   cropped images, and the app just reads whatever chapters exist there —
   the app code itself never changes per chapter.

To add a new chapter, hand Claude the two PDFs and ask it to run the same
process — see `tools/slice_chapter.py` for the reusable render/inspect/crop
functions (`render` to preview pages, `blocks` to get precise coordinates,
`slice` to execute a region spec and produce the PNGs).

### Chapter manifest schema (`questions/<id>/manifest.json`)

```json
{
  "id": "7A",
  "title": "Angles and triangles",
  "source": "Textbook citation",
  "cover": { "image": "assets/cover.png" },
  "keyIdeas": [ { "image": "assets/keyideas_1.png" } ],
  "workedExamples": [ { "title": "Example 1 - ...", "image": "assets/example1.png" } ],
  "questions": [
    {
      "id": "ex1a",
      "tier": "warmup | fluency | problem-solving | reasoning | enrichment",
      "topic": "short topic label shown as a badge",
      "image": "assets/ex1a.png",
      "contextImage": "assets/ex1_context.png",
      "officialAnswerAvailable": false,
      "answerImage": null,
      "aiNotes": "private solving notes for the tutor's own reasoning, never shown to students, never asserted as ground truth unless officialAnswerAvailable is true",
      "misconceptions": [
        { "wrongAnswer": "what a student who made this mistake would type", "reason": "plain-English description of the mistake, fed to the AI as context" }
      ]
    }
  ]
}
```

`contextImage` is optional — only present when several sub-parts share a
printed instruction/diagram that appears once on the page (see above). The
question map and subset picker group entries by the leading part of their
`id` (e.g. `ex1a`..`ex1f` group under `ex1`), so keep that naming pattern
(`<parentid><letter>`) for multi-part questions.

Each chapter has its own folder (`questions/7A/`, `questions/7B/`, ...) with
a `manifest.json` and an `assets/` folder of cropped PNGs. Add a line to the
top-level `questions/manifest.json` pointing at the new chapter's manifest.

## Wiring in the official answer key

Once you have the chapter's Answers PDF, ask Claude to slice out the answer
region matching each sub-part, set `answerImage` to that crop's path, and
flip `officialAnswerAvailable` to `true`. From then on, "Show official
worked answer" (teacher mode only) shows the real printed answer, and the
AI tutor is told it can confidently confirm correctness for that question.
Until then, the tutor sticks to discussing method and explicitly tells the
student to confirm the final answer with their teacher — it will never
assert an unverified answer as correct. `7A` (all 85 sub-parts) is done
this way and is a working example of the full pattern.

Answer keys are almost always plain typeset text with no diagrams, which
doesn't need per-question image cropping to scale across a whole textbook.
`answers/full_book_answers.json` holds the **entire textbook's** answer
text (extracted once, native PDF text, not OCR), with `answers/section_index.json`
mapping each section code straight to its page — see `answers/README.md`.
When building a new chapter, look its section up there first instead of
asking for that chapter's answers PDF again.

## How the AI tutor works

The chat is a genuine back-and-forth, not a one-shot verdict. On every
question, the tutor is sent the actual cropped question image (and context
image, if any) as real image data — not just a text description — so it
can reason about diagrams, tick marks, and right-angle marks directly
instead of guessing from `aiNotes` alone. Each message sends that image
plus the full conversation history plus a system instruction built from
the question's topic, private `aiNotes`, misconceptions list, and whether
an official answer exists yet. The tutor is told to ask short Socratic
questions ("which rule applies here?"), nudge around known misconceptions
by name, and only get more directive if the student seems stuck — never to
dump the final numeric answer unprompted.

If you'd rather use a different provider (OpenAI, Claude, etc.), the only
place that needs changing is the `callGeminiChat` function in `index.html`.

## Privacy note

Everything runs client-side. The only network call is the direct
browser → Gemini API request carrying the question image, question
context, and the chat messages (no names, no accounts, nothing persisted
server-side).
