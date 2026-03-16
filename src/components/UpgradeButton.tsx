import { useState } from 'react';

interface UpgradeButtonProps {
  priceId: string;
  firebaseUid: string;
  userEmail: string;
  label?: string;
  className?: string;
}

/**
 * Initiates a Stripe Checkout session for the given price.
 * On success, redirects the browser to the Stripe-hosted checkout page.
 *
 * Usage:
 * <UpgradeButton
 *   priceId={import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY}
 *   firebaseUid={user.uid}
 *   userEmail={user.email}
 *   label="Upgrade to Pro"
 * />
 */
export default function UpgradeButton({
  priceId,
  firebaseUid,
  userEmail,
  label = 'Upgrade',
  className = '',
}: UpgradeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, firebaseUid, userEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('[UpgradeButton] Checkout session error:', errorData);
        return;
      }

      const { url } = await response.json() as { url: string };

      if (url) {
        window.location.href = url;
      } else {
        console.warn('[UpgradeButton] No URL returned from checkout session');
      }
    } catch (error) {
      console.warn('[UpgradeButton] Failed to start checkout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      aria-busy={isLoading}
      className={className}
    >
      {isLoading ? 'Loading…' : label}
    </button>
  );
}
