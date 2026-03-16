import type { VercelRequest, VercelResponse } from '@vercel/node';

const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'api_key_not_configured' });

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === 'string') params.set(k, v);
  }
  params.set('apikey', apiKey);

  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const upstream = await fetch(`${NEWSDATA_BASE}?${params.toString()}`);
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(502).json({ error: 'upstream_error' });
  }
}
