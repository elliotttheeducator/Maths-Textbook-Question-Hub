# Full-book answer archive

`full_book_answers.json` is the **entire Year 9 answer key**, extracted
once via PyMuPDF's native text layer (not OCR — verbatim characters from
the PDF) from the complete answers PDF the teacher provided. It's an array
of `{ page_index, printed_page, text }` objects, one per PDF page.

`section_index.json` maps a section code (`"7A"`, `"2C"`, `"WWUP"`,
`"Ch4 review"`, `"Semester review 1"`, ...) to the `page_index` where that
section's answers start in `full_book_answers.json`, so a future session
can jump straight to the right page instead of scanning all 95.

## Why this exists

Chapters are added to this app by slicing the *question* PDF into images
(see the root README's "How a chapter is built"). The matching *answers*
PDF is almost always plain text with no diagrams, so instead of cropping
one tiny image per answer for every future chapter (slow, doesn't scale),
the whole book's answer text was extracted once and stored here. When a
new chapter's questions are sliced, look up its section code in
`section_index.json`, read the matching page(s) of `full_book_answers.json`,
and use that text directly as each question's official answer (either as
`aiNotes`/plain answer text, or crop a small confirming image the same way
`7A`'s answers were — see `questions/7A/manifest.json` for both patterns:
`ex2`-`ex12` used image crops of a single-chapter answers PDF, `bu1`-`bu4`
and `ex1` were later filled in from this full-book archive once the
missing page turned up here).

This file is a build-time reference for whoever (human or Claude) is
authoring a new chapter's `manifest.json` — the live app never reads it,
and it is never sent to the AI tutor wholesale (that would waste tokens on
94 irrelevant pages per request). Only the relevant question's extracted
answer text belongs in that question's `aiNotes` field.
