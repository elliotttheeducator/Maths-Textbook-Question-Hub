# Maths Textbook Question Hub

A single-page classroom app: put it on the big screen, reveal one textbook
question at a time, students answer, and an AI tutor gives instant feedback —
including calling out the *specific* common mistake if the student's answer
matches a known misconception for that question.

No backend, no database, no student accounts. It's static HTML/CSS/JS that
runs entirely in the browser.

## Quick start

1. Open `index.html` in a browser (or serve the folder — see Deployment below).
2. Click **⚙️ Settings**, paste in a free Gemini API key, and save.
   - Get one at Google AI Studio (aistudio.google.com) — sign in with any
     Google account, no billing required for the free tier.
   - The key is stored only in that browser's `localStorage`. It is sent
     directly from the browser to Google's API and nowhere else.
3. Pick a section from the dropdown and click **Start**.
4. A student types their answer and hits **Submit** — feedback appears below.
   **Next question** advances (questions are shuffled and loop); **Show
   worked answer** reveals the answer for the teacher if needed.

## Deployment (GitHub Pages)

This repo is a static site, so GitHub Pages works with zero config:

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the repo settings, enable **Pages** → source: deploy from branch →
   pick the branch and `/ (root)`.
3. Your class URL will be `https://<user>.github.io/<repo>/`.

## Adding another chapter/section

1. Digitize the questions into a new file, e.g. `questions/7B.json`, following
   the schema below (see `questions/7A.json` for a full example).
2. Add an entry to `questions/manifest.json` pointing at the new file.
3. **Verify every answer yourself before using it with students.** The
   included `7A.json` only contains questions whose answers could be
   computed unambiguously from the textbook text (numeric angle/clock
   problems, angle-sum triangles, conceptual fill-ins). Diagram-only
   questions (where the answer depends on reading tick marks, right-angle
   boxes, or exact figure layout from an image) were intentionally left out
   rather than guessed — add those by hand once you've checked them against
   the answer key.

### Question schema

```json
{
  "section": "7A",
  "title": "Angles and triangles",
  "source": "Textbook citation",
  "keyIdeas": ["optional array of reference facts, not shown in the UI yet"],
  "questions": [
    {
      "id": "unique-string-id",
      "tier": "warmup | fluency | problem-solving | reasoning | enrichment",
      "topic": "short topic label shown as a badge",
      "prompt": "the question text shown on screen",
      "answer": "the correct answer, shown via 'Show worked answer'",
      "workedExample": "optional textbook cross-reference, e.g. 'Example 2'",
      "misconceptions": [
        { "wrongAnswer": "what a student who made this mistake would type", "reason": "plain-English description of the mistake, fed to the AI as context" }
      ]
    }
  ]
}
```

The `misconceptions` list isn't used for exact string matching — it's handed
to the AI as context so it can recognise *patterns* of mistakes (e.g. mixing
up complementary/supplementary, only subtracting one angle from 180°) even
if the student's wrong answer isn't a verbatim match.

## How the AI feedback works

On submit, the app sends the Gemini API a short system instruction (be an
encouraging tutor, keep it to 2-3 sentences, give a Socratic nudge rather
than the answer, use the misconception list if it matches) plus the
question, correct answer, misconception list, and the student's answer. The
model is asked to reply with strict JSON (`{"correct": bool, "feedback":
string}`) so the UI can colour the panel green/red.

If you'd rather use a different provider (OpenAI, Claude, etc.), the only
place that needs changing is the `callGemini` function in `index.html` —
swap the fetch URL/body/response parsing for your provider's API shape.

## Privacy note

Everything runs client-side. The only network call is the direct
browser → Gemini API request carrying the question text and the student's
typed answer (no names, no accounts, nothing persisted server-side).
