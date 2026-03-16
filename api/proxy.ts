import type { VercelRequest, VercelResponse } from '@vercel/node';

const BLOCKED_PATTERNS = [
  /^localhost/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
];

function isBlockedUrl(url: string): boolean {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol !== 'http:' && protocol !== 'https:') return true;
    return BLOCKED_PATTERNS.some(p => p.test(hostname));
  } catch {
    return true;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const { url } = req.query;
  if (typeof url !== 'string' || !url) {
    return res.status(400).json({ error: 'missing_url' });
  }

  const decoded = decodeURIComponent(url);
  if (isBlockedUrl(decoded)) {
    return res.status(403).json({ error: 'blocked_url' });
  }

  try {
    const upstream = await fetch(decoded, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
    });
    const body = await upstream.text();
    res.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/xml');
    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({ error: 'upstream_error' });
  }
}
