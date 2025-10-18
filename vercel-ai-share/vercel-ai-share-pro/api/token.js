export const config = { runtime: 'edge' };

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function getCodes() {
  return (process.env.REDEEM_CODES || 'demo123').split(',').map(s => s.trim()).filter(Boolean);
}

async function signJWT(payload, secret) {
  const { default: jwt } = await import('jsonwebtoken');
  return jwt.sign(payload, secret, { expiresIn: '30d' });
}

export default async function handler(req) {
  if (req.method !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' });

  const secret = process.env.JWT_SECRET;
  if (!secret) return json(500, { error: 'SERVER_MISCONFIG', message: 'Missing JWT_SECRET' });

  let body;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'INVALID_JSON' });
  }

  const code = String(body?.code || '').trim();
  const uid = String(body?.uid || '').trim() || 'user_' + Math.random().toString(36).slice(2,8);
  if (!code) return json(400, { error: 'MISSING_CODE' });

  const valid = getCodes();
  if (!valid.includes(code)) return json(401, { error: 'INVALID_CODE' });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

  const bindIp = process.env.BIND_IP === '1';
  const payload = { uid, plan: 'basic' };
  if (bindIp && ip) payload.ip = ip;

  const token = await signJWT(payload, secret);
  return json(200, { token, uid, bind_ip: bindIp ? ip : null, exp_days: 30 });
}
