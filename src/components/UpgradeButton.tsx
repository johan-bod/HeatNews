import { useState } from 'react';
import { toast } from '@/components/ui/sonner';

interface UpgradeButtonProps {
  planKey: string; // e.g. 'pro_monthly', 'pro_yearly'
  firebaseUid: string;
  userEmail: string;
  label?: string;
  className?: string;
}

export default function UpgradeButton({
  planKey,
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
        body: JSON.stringify({ planKey, firebaseUid, userEmail }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string };
        console.warn('[UpgradeButton] Checkout session error:', errorData);
        toast.error(errorData.error ?? 'Failed to start checkout. Please try again.', { duration: 6000 });
        return;
      }
      const { url } = await response.json() as { url: string };
      if (url) {
        window.location.href = url;
      } else {
        console.warn('[UpgradeButton] No URL returned from checkout session');
        toast.error('Failed to start checkout. Please try again.', { duration: 6000 });
      }
    } catch (error) {
      console.warn('[UpgradeButton] Failed to start checkout:', error);
      toast.error('Network error. Please check your connection and try again.', { duration: 6000 });
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
