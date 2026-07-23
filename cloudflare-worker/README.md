# AI proxy setup (one-time, ~10 minutes)

This lets every student use the tutor chat with zero setup on their end — no
API key to find, no Settings dialog, nothing to paste. Your real API key(s)
are stored here, on Cloudflare, and are never sent to a student's browser.

You only need to do this once. It's free (Cloudflare's free tier is 100,000
requests/day — far more than a classroom will ever use).

## 1. Create a free Cloudflare account

Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) and
sign up (no credit card needed for the free tier).

## 2. Create the Worker

1. In the Cloudflare dashboard, go to **Workers & Pages** → **Create** →
   **Create Worker** (if you land on a "Ship something new" screen instead,
   choose **Start with Hello World!**).
2. Give it a name, e.g. `eduflow-proxy`. Deploy it with the default
   "Hello World" code first.
3. Click **Edit code**. Delete everything in the editor and paste in the
   entire contents of [`worker.js`](./worker.js) from this folder.
4. Click **Deploy** again to publish your real code.
5. Note the URL shown at the top, something like
   `https://eduflow-proxy.<your-subdomain>.workers.dev` — you'll need this
   in step 4.

## 3. Add your API key(s) as secrets

1. Go to your Worker → **Settings** → **Variables and Secrets**.
2. Click **Add** for each provider you want to offer. Set the **type** to
   **Secret** (not plain text) so it's encrypted at rest, and use these
   exact names:
   - `GEMINI_API_KEY` — free at [aistudio.google.com](https://aistudio.google.com)
   - `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com)
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
3. You don't need all three — only add secrets for the providers you
   actually want to work. Save and deploy.

## 4. Point EduFlow at your Worker

Tell me (or whoever's maintaining the app) your Worker's URL from step 2 —
it needs to be pasted into `WORKER_URL` near the top of the `<script>` in
`index.html`, then committed and pushed. This URL isn't sensitive (it's just
an address, and it's already locked to your GitHub Pages site by CORS — see
below), so it's fine for it to live in the public repo.

## 5. Share the app link

Once `WORKER_URL` is set and deployed, any normal EduFlow link just works —
e.g. `https://<your-pages-url>/?book=year7-maths`. Students open it and the
tutor chat works immediately, using whichever provider is selected in
Settings on your own device by default (Gemini, unless changed). No key, no
Settings dialog, no Teacher mode needed on their end.

To point a specific link at a different provider, add `&provider=openai` or
`&provider=claude` to the URL.

## Locking the proxy to your site (already done, worth knowing about)

`worker.js` sets `ALLOWED_ORIGIN` to your GitHub Pages address, so only
requests made from your live site can use it — a browser on some other
website can't ride on your keys. If you ever move the app to a different
URL, update `ALLOWED_ORIGIN` at the top of `worker.js` and redeploy.

This doesn't stop someone who finds your Worker's raw URL from calling it
directly with a script (outside a browser, CORS doesn't apply) — there's no
way to fully prevent that without asking every student to authenticate,
which defeats the "no setup" goal. If you're ever concerned about usage,
check your API usage dashboards for each provider; a sudden spike is the
signal to rotate a key.

## Changing or rotating a key later

Edit the secret's value under **Settings** → **Variables and Secrets** on
the Worker — no code changes, no redeploying the app.

## Fallback path

If the Worker is ever unreachable (Cloudflare outage, or you haven't
deployed it), the app automatically falls back to a personal API key
pasted into Settings on that device — the same as before this proxy
existed. Nothing breaks if you skip this setup entirely; it's a
convenience layer on top of the direct-key flow, not a replacement for it.
