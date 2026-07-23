# Class-code proxy setup (one-time, ~15 minutes)

This lets you share EduFlow with a whole class using a memorable class code
(e.g. `MrHallsYear7`) instead of every student having to find and paste in
your Gemini API key themselves. Your real API key is stored here, on
Cloudflare, and is never sent to a student's browser — only the class code
is, and the class code alone can't be used to get the key back out.

You only need to do this once per API key you want to share. It's free
(Cloudflare's free tier is 100,000 requests/day — far more than a classroom
will ever use).

## 1. Create a free Cloudflare account

Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and
sign up (no credit card needed for the free tier).

## 2. Create the Worker

1. In the Cloudflare dashboard, go to **Workers & Pages** → **Create** →
   **Create Worker**.
2. Give it a name, e.g. `eduflow-proxy`. Click **Deploy** to create it with
   the default "Hello World" code first.
3. Click **Edit code**. Delete everything in the editor and paste in the
   entire contents of [`worker.js`](./worker.js) from this folder.
4. Click **Deploy** again to publish your real code.
5. Note the URL shown at the top, something like
   `https://eduflow-proxy.<your-subdomain>.workers.dev` — you'll need this
   in step 4.

## 3. Create the KV namespace (where class codes and keys live)

1. In the dashboard, go to **Workers & Pages** → **KV**.
2. Click **Create a namespace**, name it `CLASS_KEYS`, and create it.
3. Go back to your Worker → **Settings** → **Variables** → **KV Namespace
   Bindings** → **Add binding**.
   - Variable name: `CLASS_KEYS` (must match exactly — this is what
     `worker.js` refers to).
   - KV namespace: pick the `CLASS_KEYS` namespace you just created.
4. Save and deploy.

## 4. Add your first class code

1. Go to **Workers & Pages** → **KV** → your `CLASS_KEYS` namespace →
   **Add entry**.
2. **Key**: the class code you'll give students, e.g. `MrHallsYear7`
   (anything memorable — it doesn't need to be secret-looking, just unique
   per class/roster).
3. **Value**: your real Gemini API key (the same kind you'd otherwise paste
   into EduFlow's Settings dialog — get one free at
   [aistudio.google.com](https://aistudio.google.com) if you don't have one).
4. Save. Repeat for as many classes/keys as you want — each class code can
   point at the same key or a different one (e.g. to keep each class's
   usage/quota separate).

## 5. Point EduFlow at your Worker

Tell me (or whoever's maintaining the app) your Worker's URL from step 2 —
it needs to be pasted into `WORKER_URL` near the top of the `<script>` in
`index.html`, then committed and pushed. This URL isn't sensitive (it's just
an address), so it's fine for it to live in the public repo — the actual
secret (your API key) only ever lives in Cloudflare KV.

## 6. Share the class link

Once `WORKER_URL` is set, give each class a link like:

```
https://<your-pages-url>/?book=year7-maths&class=MrHallsYear7
```

Students open it, it lands straight on the right textbook with no picker,
no Settings dialog, no Teacher mode toggle, no API key to find — the app
talks to Gemini through your Worker automatically using the class code in
the link.

## Changing or rotating a key later

Just edit the KV entry's value in the Cloudflare dashboard (step 4) — no
code changes, no redeploying the app. Old requests using a class code you
delete will start failing with "Unknown class code" until you re-add it.

## Adjusting the daily limit

Each class code defaults to a soft cap of 300 questions/day (see
`DEFAULT_DAILY_LIMIT` in `worker.js`) to protect your quota from a leaked
link or a runaway loop. To change it without touching code, add an
environment variable on the Worker: **Settings** → **Variables** →
**Environment Variables** → add `DAILY_LIMIT_PER_CLASS` with whatever
number you want.
