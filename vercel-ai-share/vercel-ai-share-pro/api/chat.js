export const config = { runtime: 'edge' };

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

async function verifyJWT(token, secret) {
  const { default: jwt } = await import('jsonwebtoken');
  try {
    return jwt.verify(token, secret);
  } catch (_) {
    return null;
  }
}

function parseAllowedModels() {
  const raw = (process.env.ALLOWED_MODELS || '').split(',').map(s => s.trim()).filter(Boolean);
  return raw.length ? new Set(raw) : new Set(['gpt-4o-mini']);
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const secret = process.env.JWT_SECRET;
  if (!secret) return json(500, { error: 'SERVER_MISCONFIG', message: 'Missing JWT_SECRET' });

  const payload = await verifyJWT(token, secret);
  if (!payload) return json(401, { error: 'INVALID_TOKEN' });

  // 可选：绑定 IP 校验
  if (process.env.BIND_IP === '1') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    if (payload.ip && payload.ip !== ip) {
      return json(401, { error: 'IP_MISMATCH' });
    }
  }

  const allowedModels = parseAllowedModels();
  const maxTokensCap = Math.max(1, parseInt(process.env.MAX_TOKENS || '1000', 10));

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'INVALID_JSON' });
  }

  const safe = {};
  const allowed = ['model','messages','temperature','top_p','stream','max_tokens','tools','tool_choice','response_format','frequency_penalty','presence_penalty','stop','logit_bias','n','modalities','audio'];
  for (const k of allowed) if (body[k] !== undefined) safe[k] = body[k];

  if (!safe.model || !allowedModels.has(safe.model)) {
    return json(400, { error: 'MODEL_NOT_ALLOWED', allowed: Array.from(allowedModels) });
  }
  if (!Array.isArray(safe.messages)) {
    return json(400, { error: 'MISSING_MESSAGES' });
  }
  if (safe.max_tokens && safe.max_tokens > maxTokensCap) {
    safe.max_tokens = maxTokensCap;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(500, { error: 'SERVER_MISCONFIG', message: 'Missing OPENAI_API_KEY' });

  const upstream = 'https://api.openai.com/v1/chat/completions';

  if (safe.stream) {
    const r = await fetch(upstream, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(safe)
    });
    if (!r.ok) {
      const text = await r.text();
      return json(r.status, { error: 'UPSTREAM_ERROR', detail: text });
    }
    const headers = new Headers(r.headers);
    headers.set('cache-control', 'no-cache');
    headers.set('connection', 'keep-alive');
    return new Response(r.body, { status: 200, headers });
  }

  const r = await fetch(upstream, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(safe)
  });
  const data = await r.json();
  return json(r.status, data);
}
