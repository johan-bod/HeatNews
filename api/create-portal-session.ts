// Required environment variables:
// STRIPE_SECRET_KEY        — Stripe secret key (sk_live_... or sk_test_...)
// VITE_APP_URL             — App base URL for redirect URL (e.g. https://heatstory.app)
// FIREBASE_PROJECT_ID      — Firebase project ID
// FIREBASE_CLIENT_EMAIL    — Firebase Admin SDK service account client email
// FIREBASE_PRIVATE_KEY     — Firebase Admin SDK service account private key (with literal \n)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getFirestore();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firebaseUid } = req.body as { firebaseUid: string };

  if (!firebaseUid) {
    return res.status(400).json({ error: 'Missing required field: firebaseUid' });
  }

  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(firebaseUid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    const stripeCustomerId = userData?.stripeCustomerId as string | undefined;

    if (!stripeCustomerId) {
      return res.status(404).json({ error: 'No Stripe customer found for this user. User has not completed a checkout.' });
    }

    const appUrl = process.env.VITE_APP_URL || 'https://heatstory.app';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/app`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error('[create-portal-session] Error:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to create portal session' });
  }
}
