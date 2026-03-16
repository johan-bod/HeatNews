import type { VercelRequest, VercelResponse } from '@vercel/node';

function getDeepLEndpoint(apiKey: string): string {
  return apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/translate'
    : 'https://api.deepl.com/v2/translate';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'translation_not_configured' });

  const { texts, sourceLang } = req.body as { texts: string[]; sourceLang: string };
  if (!Array.isArray(texts) || !sourceLang) {
    return res.status(400).json({ error: 'invalid_body' });
  }

  try {
    const upstream = await fetch(getDeepLEndpoint(apiKey), {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts, source_lang: sourceLang, target_lang: 'EN' }),
    });
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(502).json({ error: 'upstream_error' });
  }
}
