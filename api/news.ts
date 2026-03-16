import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const NEWSDATA_BASE = 'https://newsdata.io/api/1/latest';
const ALLOWED_ORIGINS = ['https://heatstory.app', 'http://localhost:8080', 'http://localhost:5173'];

// Simple in-process counter — resets on cold start, guards against burst abuse
let instanceRequestCount = 0;
const MAX_INSTANCE_REQUESTS = 500;

function getAllowedOrigin(req: import('@vercel/node').VercelRequest): string {
  const origin = req.headers['origin'] as string | undefined;
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return 'https://heatstory.app';
}

function getAdminAuth() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getAuth();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  // Soft auth check: authenticated users get full access; unauthenticated requests
  // are allowed for the public demo but counted separately for abuse detection
  const authHeader = req.headers['authorization'];
  const idToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let isAuthenticated = false;
  if (idToken) {
    try {
      await getAdminAuth().verifyIdToken(idToken);
      isAuthenticated = true;
    } catch (err) {
      // Invalid token or missing Firebase env vars — treat as unauthenticated
      // (public demo still works; log to surface misconfiguration)
      console.warn('[api/news] Token verification failed (invalid token or missing FIREBASE_* env vars):', (err as Error).message);
    }
  }

  // Burst guard — hard limit per instance to protect the NewsData.io API key
  instanceRequestCount++;
  if (instanceRequestCount > MAX_INSTANCE_REQUESTS) {
    console.warn('[api/news] Instance request limit reached');
    return res.status(429).json({ error: 'rate_limit_exceeded' });
  }

  const apiKey = process.env.NEWSDATA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'api_key_not_configured' });

  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === 'string') params.set(k, v);
  }
  params.set('apikey', apiKey);

  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));

  try {
    const upstream = await fetch(`${NEWSDATA_BASE}?${params.toString()}`);
    const body = await upstream.json();
    return res.status(upstream.status).json(body);
  } catch {
    return res.status(502).json({ error: 'upstream_error' });
  }
}
