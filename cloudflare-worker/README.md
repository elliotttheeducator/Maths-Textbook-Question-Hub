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
requests made *from a browser on your live site* can use it — some other
website can't embed a call to your proxy. This does **not** stop someone
who simply opens your actual public GitHub Pages link and uses the chat —
that's a legitimate visit from your allowed origin as far as CORS is
concerned, even if that visitor isn't one of your students. That's what
the access code below is for.

## Stopping random visitors from using your proxy for free (access code)

Because the whole point of the proxy is that no student needs a key, your
public site link works for *anyone* who finds it, not just your class —
unless you set a shared access code.

1. Add one more secret on your Worker: **Settings** → **Variables and
   Secrets** → `ACCESS_CODE`, value = any password you choose (it doesn't
   need to look random, just be something only your class knows).
2. That's it — deploy, and every chat request now needs a matching code.
   The first time a student without one tries to chat, the app
   automatically shows a small "ask your teacher for the access code"
   prompt, and remembers it in their browser afterwards so they're never
   asked twice.
3. To skip that prompt entirely, add `&access=YourCode` to the link you
   share — same auto-save-on-first-visit pattern as `&key=`.

Leave `ACCESS_CODE` unset if you don't want this at all — the proxy works
exactly as before, no prompt, no code needed by anyone.

This still doesn't stop someone who finds your Worker's raw URL from
calling it directly with a script that also happens to know the access
code (outside a browser, CORS doesn't apply) — there's no way to fully
prevent that without asking every student to authenticate individually,
which defeats the "no setup" goal. But it closes the much more likely
scenario of a random visitor casually finding your GitHub Pages link. If
you're ever concerned about usage, check your API usage dashboards for
each provider; a sudden spike is the signal to rotate both the access
code and the affected API key.

## Changing or rotating a key later

Edit the secret's value under **Settings** → **Variables and Secrets** on
the Worker — no code changes, no redeploying the app.

## Fallback path

If the Worker is ever unreachable (Cloudflare outage, or you haven't
deployed it), the app automatically falls back to a personal API key
pasted into Settings on that device — the same as before this proxy
existed. Nothing breaks if you skip this setup entirely; it's a
convenience layer on top of the direct-key flow, not a replacement for it.
