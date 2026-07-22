# Maths Textbook Question Hub

A single-page classroom app: put it on the big screen, work through a
chapter's questions one at a time, and get a Socratic AI tutor to help —
using the actual textbook page images, not an AI recreation of them.

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
3. Pick a chapter from the dropdown. The cover screen shows the chapter's
   Key Ideas and Worked Examples (scrollable) straight from the textbook.
4. Click **Ready? Start questions →**. Each question shows the cropped
   textbook image; students type into the chat box below it and the AI
   tutor asks guiding questions back rather than just marking it right/wrong.
5. **Show official worked answer** reveals the matching crop from the
   Answers PDF — if that chapter's answer key hasn't been added yet, it
   says so honestly instead of guessing.

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
2. Claude renders the PDF pages, visually identifies the bounding box of
   each logical region (key ideas, each worked example, each numbered
   exercise question), and crops them straight out of the PDF at high
   resolution using `tools/slice_chapter.py` — no OCR, no redrawing, pixel
   crops of the real page.
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
functions (`render` to preview pages, `blocks` to get precise y-coordinates
for crop boxes instead of guessing from a screenshot, `slice` to execute a
region spec and produce the PNGs).

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
      "id": "ex1",
      "tier": "warmup | fluency | problem-solving | reasoning | enrichment",
      "topic": "short topic label shown as a badge",
      "image": "assets/ex1.png",
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

Each chapter has its own folder (`questions/7A/`, `questions/7B/`, ...) with
a `manifest.json` and an `assets/` folder of cropped PNGs. Add a line to the
top-level `questions/manifest.json` pointing at the new chapter's manifest.

## Wiring in the official answer key

Once you have the chapter's Answers PDF, ask Claude to slice out the answer
region matching each question, set `answerImage` to that crop's path, and
flip `officialAnswerAvailable` to `true`. From then on, "Show official
worked answer" shows the real printed answer, and the AI tutor is told it
can confidently confirm correctness for that question. Until then, the tutor
sticks to discussing method and explicitly tells the student to confirm the
final answer with their teacher — it will never assert an unverified answer
as correct.

## How the AI tutor works

The chat is a genuine back-and-forth, not a one-shot verdict. Each message
sends the full conversation history plus a system instruction built from
that question's topic, private `aiNotes`, misconceptions list, and whether
an official answer exists yet. The tutor is told to ask short Socratic
questions ("which rule applies here?"), nudge around known misconceptions
by name, and only get more directive if the student seems stuck — never to
dump the final numeric answer unprompted.

If you'd rather use a different provider (OpenAI, Claude, etc.), the only
place that needs changing is the `callGeminiChat` function in `index.html`.

## Privacy note

Everything runs client-side. The only network call is the direct
browser → Gemini API request carrying the question context and the chat
messages (no names, no accounts, nothing persisted server-side).
