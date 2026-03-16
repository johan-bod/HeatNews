// Required environment variables:
// STRIPE_SECRET_KEY          — Stripe secret key (sk_live_... or sk_test_...)
// VITE_APP_URL               — App base URL for redirect URLs (e.g. https://heatstory.app)
// STRIPE_PRICE_PRO_MONTHLY   — Stripe Price ID for Pro monthly
// STRIPE_PRICE_PRO_YEARLY    — Stripe Price ID for Pro yearly
// STRIPE_PRICE_TEAM_MONTHLY  — Stripe Price ID for Team monthly
// STRIPE_PRICE_TEAM_YEARLY   — Stripe Price ID for Team yearly
// STRIPE_PRICE_NEWSROOM_MONTHLY — Stripe Price ID for Newsroom monthly
// STRIPE_PRICE_NEWSROOM_YEARLY  — Stripe Price ID for Newsroom yearly

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { planKey, firebaseUid, userEmail, billingInterval } = req.body as {
    planKey: string;
    firebaseUid: string;
    userEmail: string;
    billingInterval?: 'monthly' | 'yearly';
  };

  // Server-side plan → price ID mapping (price IDs never exposed to client)
  const PLAN_PRICE_MAP: Record<string, string | undefined> = {
    pro_monthly:        process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_yearly:         process.env.STRIPE_PRICE_PRO_YEARLY,
    team_monthly:       process.env.STRIPE_PRICE_TEAM_MONTHLY,
    team_yearly:        process.env.STRIPE_PRICE_TEAM_YEARLY,
    newsroom_monthly:   process.env.STRIPE_PRICE_NEWSROOM_MONTHLY,
    newsroom_yearly:    process.env.STRIPE_PRICE_NEWSROOM_YEARLY,
  };
  const priceId = PLAN_PRICE_MAP[planKey] ?? '';

  if (!planKey || !priceId || !firebaseUid || !userEmail) {
    return res.status(400).json({ error: 'Missing or invalid fields: planKey, firebaseUid, userEmail' });
  }

  const appUrl = process.env.VITE_APP_URL || 'https://heatstory.app';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      metadata: {
        firebaseUid,
      },
      subscription_data: {
        metadata: {
          firebaseUid,
        },
      },
      success_url: `${appUrl}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout=canceled`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      tax_id_collection: {
        enabled: true,
      },
      automatic_tax: {
        enabled: true,
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('[create-checkout-session] Stripe error:', error);

    if (error instanceof Stripe.errors.StripeInvalidRequestError) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
