// Required environment variables:
// STRIPE_SECRET_KEY        — Stripe secret key (sk_live_... or sk_test_...)
// STRIPE_WEBHOOK_SECRET    — Stripe webhook signing secret (whsec_...)
// FIREBASE_PROJECT_ID      — Firebase project ID
// FIREBASE_CLIENT_EMAIL    — Firebase Admin SDK service account client email
// FIREBASE_PRIVATE_KEY     — Firebase Admin SDK service account private key (with literal \n)
//
// Price ID env vars used for plan derivation:
// STRIPE_PRICE_PRO_MONTHLY / STRIPE_PRICE_PRO_YEARLY
// STRIPE_PRICE_TEAM_MONTHLY / STRIPE_PRICE_TEAM_YEARLY
// STRIPE_PRICE_NEWSROOM_MONTHLY / STRIPE_PRICE_NEWSROOM_YEARLY

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

// Collect raw body chunks — required for Stripe signature verification.
// Do NOT use req.body or JSON.parse before this step.
async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

type PlanName = 'pro' | 'team' | 'newsroom' | 'unknown';

function derivePlan(subscription: Stripe.Subscription): PlanName {
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return 'unknown';

  const proPrices = [
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_YEARLY,
  ];
  const teamPrices = [
    process.env.STRIPE_PRICE_TEAM_MONTHLY,
    process.env.STRIPE_PRICE_TEAM_YEARLY,
  ];
  const newsroomPrices = [
    process.env.STRIPE_PRICE_NEWSROOM_MONTHLY,
    process.env.STRIPE_PRICE_NEWSROOM_YEARLY,
  ];

  if (proPrices.includes(priceId)) return 'pro';
  if (teamPrices.includes(priceId)) return 'team';
  if (newsroomPrices.includes(priceId)) return 'newsroom';

  return 'unknown';
}

async function upsertSubscription(
  db: ReturnType<typeof getFirestore>,
  firebaseUid: string,
  subscription: Stripe.Subscription,
) {
  await db
    .collection('users')
    .doc(firebaseUid)
    .set(
      {
        stripeCustomerId: subscription.customer as string,
        stripeSubscriptionId: subscription.id,
        subscription: {
          plan: derivePlan(subscription),
          status: subscription.status,
          currentPeriodEnd: subscription.current_period_end,
          billingInterval: subscription.items.data[0]?.plan.interval ?? null,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      },
      { merge: true },
    );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let rawBody: Buffer;
  try {
    rawBody = await getRawBody(req);
  } catch (error) {
    console.error('[stripe-webhook] Failed to read raw body:', error);
    return res.status(500).json({ error: 'Failed to read request body' });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    console.error('[stripe-webhook] Signature verification failed:', error);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  const db = getAdminDb();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const firebaseUid = session.metadata?.firebaseUid;

        if (!firebaseUid) {
          console.warn('[stripe-webhook] checkout.session.completed: no firebaseUid in session metadata');
          break;
        }

        // If a subscription was created, fetch it to write the full record.
        // The subscription.created event will follow, but writing here ensures
        // the user doc is updated as quickly as possible after checkout.
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string,
          );
          await upsertSubscription(db, firebaseUid, subscription);
        } else {
          // Fallback: write the customer ID at minimum so portal access works.
          if (session.customer) {
            await db
              .collection('users')
              .doc(firebaseUid)
              .set({ stripeCustomerId: session.customer as string }, { merge: true });
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const firebaseUid = subscription.metadata?.firebaseUid;

        if (!firebaseUid) {
          console.warn(`[stripe-webhook] ${event.type}: no firebaseUid in subscription metadata`);
          break;
        }

        await upsertSubscription(db, firebaseUid, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const firebaseUid = subscription.metadata?.firebaseUid;

        if (!firebaseUid) {
          console.warn('[stripe-webhook] customer.subscription.deleted: no firebaseUid in subscription metadata');
          break;
        }

        await db
          .collection('users')
          .doc(firebaseUid)
          .set(
            {
              subscription: {
                plan: derivePlan(subscription),
                status: 'canceled',
                currentPeriodEnd: subscription.current_period_end,
                billingInterval: subscription.items.data[0]?.plan.interval ?? null,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
              },
            },
            { merge: true },
          );
        break;
      }

      default:
        // Ignore all other event types
        break;
    }
  } catch (error) {
    // Always return 200 to Stripe even on Firestore errors to avoid
    // Stripe flooding the logs with retries for non-Stripe failures.
    console.error(`[stripe-webhook] Firestore error handling ${event.type}:`, error);
  }

  return res.status(200).json({ received: true });
}
