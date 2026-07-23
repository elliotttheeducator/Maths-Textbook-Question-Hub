// EduFlow AI proxy.
//
// Purpose: lets the whole class use the tutor chat without any student ever
// needing an API key. The real keys live only here, as Worker secrets, and
// are never sent to a browser. The app tries this Worker first for every
// chat message; only if it's unreachable does it fall back to a personal
// key pasted into Settings on that device.
//
// Request shape expected from the app (POST /, JSON body):
//   {
//     provider: "gemini" | "openai" | "claude",
//     model: "...",
//     systemInstruction: "...",
//     imageParts: [{ mimeType, data }],   // data = base64, no data: prefix
//     history: [{ role: "user" | "model", text: "..." }]
//   }
//
// The Worker translates that into the shape the chosen vendor expects, calls
// it with the real key, and returns the vendor's response body and status
// completely unchanged - success or error. The app already knows how to
// parse each vendor's native response shape, so there's nothing to
// translate on the way back.
//
// Configure real keys as Worker secrets (Settings -> Variables and Secrets
// in the Cloudflare dashboard, or `wrangler secret put`), naming them
// exactly:
//   GEMINI_API_KEY
//   OPENAI_API_KEY
//   ANTHROPIC_API_KEY
// You only need to set the ones you actually want to offer - a provider
// with no key configured just returns a clear error instead of working.

// Tighten this to your GitHub Pages origin so other websites can't ride on
// your keys via a browser request. '*' works everywhere but removes that
// protection - only use it for local testing.
const ALLOWED_ORIGIN = 'https://elliotttheeducator.github.io';

const IMAGE_INTRO_TEXT = 'This is the question the student is working on. Look at it carefully before responding.';
const IMAGE_ACK_TEXT = 'Got it, I can see the question clearly.';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

async function passThrough(vendorRes) {
  const text = await vendorRes.text();
  return new Response(text, {
    status: vendorRes.status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

async function callGemini(env, { model, systemInstruction, imageParts, history }) {
  if (!env.GEMINI_API_KEY) return jsonError('Gemini is not configured on this server yet.', 501);

  const contents = [];
  if (imageParts.length) {
    contents.push({ role: 'user', parts: [...imageParts.map(p => ({ inlineData: { mimeType: p.mimeType, data: p.data } })), { text: IMAGE_INTRO_TEXT }] });
    contents.push({ role: 'model', parts: [{ text: IMAGE_ACK_TEXT }] });
  }
  history.forEach(m => contents.push({ role: m.role, parts: [{ text: m.text }] }));

  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { temperature: 0.5 },
  };

  const vendorRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-3.5-flash-lite')}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify(body),
  });
  return passThrough(vendorRes);
}

async function callOpenAI(env, { model, systemInstruction, imageParts, history }) {
  if (!env.OPENAI_API_KEY) return jsonError('OpenAI is not configured on this server yet.', 501);

  const messages = [{ role: 'system', content: systemInstruction }];
  if (imageParts.length) {
    messages.push({ role: 'user', content: [
      ...imageParts.map(p => ({ type: 'image_url', image_url: { url: `data:${p.mimeType};base64,${p.data}` } })),
      { type: 'text', text: IMAGE_INTRO_TEXT },
    ] });
    messages.push({ role: 'assistant', content: IMAGE_ACK_TEXT });
  }
  history.forEach(m => messages.push({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }));

  const vendorRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: model || 'gpt-5-mini', messages }),
  });
  return passThrough(vendorRes);
}

async function callClaude(env, { model, systemInstruction, imageParts, history }) {
  if (!env.ANTHROPIC_API_KEY) return jsonError('Claude is not configured on this server yet.', 501);

  const messages = [];
  if (imageParts.length) {
    messages.push({ role: 'user', content: [
      ...imageParts.map(p => ({ type: 'image', source: { type: 'base64', media_type: p.mimeType, data: p.data } })),
      { type: 'text', text: IMAGE_INTRO_TEXT },
    ] });
    messages.push({ role: 'assistant', content: IMAGE_ACK_TEXT });
  }
  history.forEach(m => messages.push({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text }));

  const vendorRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: model || 'claude-haiku-4-5-20251001', max_tokens: 1024, system: systemInstruction, messages }),
  });
  return passThrough(vendorRes);
}

const HANDLERS = { gemini: callGemini, openai: callOpenAI, claude: callClaude };

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return jsonError('Invalid request body.', 400);
    }

    const provider = payload.provider || 'gemini';
    const handler = HANDLERS[provider];
    if (!handler) {
      return jsonError(`Unknown provider "${provider}".`, 400);
    }

    try {
      return await handler(env, {
        model: payload.model,
        systemInstruction: payload.systemInstruction || '',
        imageParts: payload.imageParts || [],
        history: payload.history || [],
      });
    } catch (e) {
      return jsonError('Could not reach the AI provider right now. Please try again.', 502);
    }
  },
};
