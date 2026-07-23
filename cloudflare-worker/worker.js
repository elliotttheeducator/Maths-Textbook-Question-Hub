// EduFlow class-code proxy.
//
// Purpose: lets a whole class share one Gemini API key via a memorable class
// code (e.g. "MrHallsYear7") without that key ever reaching a student's
// browser. The real key lives only in this Worker's CLASS_KEYS KV namespace.
//
// Request shape expected from the app:
//   POST /
//   Header: X-Class-Code: MrHallsYear7
//   Body:   { model: "gemini-2.5-flash-lite", systemInstruction, contents, generationConfig }
//
// The Worker looks up the class code in KV, forwards the body (minus the
// "model" field, which goes in the URL) to Gemini's generateContent endpoint
// with the real key, and streams the response straight back.

// Tighten this to your GitHub Pages origin once deployed, e.g.
// 'https://elliotttheeducator.github.io' - '*' works everywhere but allows
// any website to use your proxy (still gated by class code + daily cap).
const ALLOWED_ORIGIN = '*';

// Soft cap per class code per day, so one leaked code or a runaway loop
// can't silently burn through your whole Gemini quota. Raise/lower via the
// DAILY_LIMIT_PER_CLASS environment variable in the Worker settings if you
// don't want to edit code, or just change the default below.
const DEFAULT_DAILY_LIMIT = 300;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Class-Code',
  };
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ error: { message } }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== 'POST') {
      return jsonError('Method not allowed.', 405);
    }

    const classCode = request.headers.get('X-Class-Code');
    if (!classCode) {
      return jsonError('Missing class code.', 400);
    }

    const apiKey = await env.CLASS_KEYS.get(classCode);
    if (!apiKey) {
      return jsonError(`Unknown class code "${classCode}". Ask your teacher to check the link.`, 404);
    }

    const dailyLimit = parseInt(env.DAILY_LIMIT_PER_CLASS || '', 10) || DEFAULT_DAILY_LIMIT;
    const today = new Date().toISOString().slice(0, 10);
    const usageKey = `usage:${classCode}:${today}`;
    const currentUsage = parseInt((await env.CLASS_KEYS.get(usageKey)) || '0', 10);
    if (currentUsage >= dailyLimit) {
      return jsonError('This class has reached its daily question limit. Try again tomorrow, or ask your teacher.', 429);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (e) {
      return jsonError('Invalid request body.', 400);
    }

    const { model, ...geminiBody } = payload;
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.5-flash-lite')}:generateContent?key=${apiKey}`;

    let geminiRes;
    try {
      geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });
    } catch (e) {
      return jsonError('Could not reach Gemini right now. Please try again.', 502);
    }

    const responseText = await geminiRes.text();

    if (geminiRes.ok) {
      // Best-effort counter - a lost increment under a race just means the
      // cap is slightly soft, which is fine for this purpose.
      await env.CLASS_KEYS.put(usageKey, String(currentUsage + 1), { expirationTtl: 60 * 60 * 24 * 2 });
    }

    return new Response(responseText, {
      status: geminiRes.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  },
};
