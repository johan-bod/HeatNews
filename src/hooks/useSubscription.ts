import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export interface SubscriptionState {
  plan: 'free' | 'pro' | 'team' | 'newsroom';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';
  currentPeriodEnd: number | null;
  billingInterval: 'month' | 'year' | null;
  cancelAtPeriodEnd: boolean;
  isLoading: boolean;
  /** true when plan is pro, team, or newsroom AND status is active or trialing */
  isPaid: boolean;
  /** plan === 'pro' && isPaid */
  isPro: boolean;
  /** plan === 'team' && isPaid */
  isTeam: boolean;
  /** plan === 'newsroom' && isPaid */
  isNewsroom: boolean;
}

const DEFAULT_STATE: SubscriptionState = {
  plan: 'free',
  status: 'none',
  currentPeriodEnd: null,
  billingInterval: null,
  cancelAtPeriodEnd: false,
  isLoading: false,
  isPaid: false,
  isPro: false,
  isTeam: false,
  isNewsroom: false,
};

function buildState(data: Record<string, unknown> | undefined): SubscriptionState {
  const sub = data?.subscription as Record<string, unknown> | undefined;

  if (!sub) {
    return { ...DEFAULT_STATE, isLoading: false };
  }

  const plan = (sub.plan as SubscriptionState['plan']) ?? 'free';
  const status = (sub.status as SubscriptionState['status']) ?? 'none';
  const isPaid = status === 'active' || status === 'trialing';

  return {
    plan,
    status,
    currentPeriodEnd: (sub.currentPeriodEnd as number) ?? null,
    billingInterval: (sub.billingInterval as 'month' | 'year') ?? null,
    cancelAtPeriodEnd: (sub.cancelAtPeriodEnd as boolean) ?? false,
    isLoading: false,
    isPaid,
    isPro: plan === 'pro' && isPaid,
    isTeam: plan === 'team' && isPaid,
    isNewsroom: plan === 'newsroom' && isPaid,
  };
}

export default function useSubscription(): SubscriptionState {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    ...DEFAULT_STATE,
    isLoading: !!user,
  });

  useEffect(() => {
    if (!user || !db) {
      setState({ ...DEFAULT_STATE, isLoading: false });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true }));

    const userDocRef = doc(db, 'users', user.uid);

    const unsubscribe = onSnapshot(
      userDocRef,
      (snapshot) => {
        const data = snapshot.data() as Record<string, unknown> | undefined;
        setState(buildState(data));
      },
      (error) => {
        console.warn('[useSubscription] Firestore snapshot error:', error);
        setState({ ...DEFAULT_STATE, isLoading: false });
      },
    );

    return () => unsubscribe();
  }, [user]);

  return state;
}
