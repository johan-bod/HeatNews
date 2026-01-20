import React, { useEffect } from 'react';

interface AdBannerProps {
  /**
   * Ad slot ID from Google AdSense
   * Format: '1234567890'
   */
  adSlot: string;

  /**
   * Ad format:
   * - 'horizontal': 728x90 leaderboard or responsive
   * - 'rectangle': 300x250 medium rectangle
   * - 'vertical': 160x600 wide skyscraper
   */
  format?: 'horizontal' | 'rectangle' | 'vertical';

  /**
   * Responsive ads adjust to container size
   */
  responsive?: boolean;

  /**
   * Custom className for styling
   */
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

/**
 * Google AdSense Ad Banner Component
 *
 * Usage:
 * 1. Get your AdSense publisher ID and add to .env as VITE_ADSENSE_CLIENT
 * 2. Create ad units in AdSense dashboard
 * 3. Use this component with the ad slot ID
 *
 * Example:
 * <AdBanner
 *   adSlot="1234567890"
 *   format="horizontal"
 *   responsive={true}
 * />
 */
export function AdBanner({
  adSlot,
  format = 'horizontal',
  responsive = true,
  className = '',
}: AdBannerProps) {
  const adClient = import.meta.env.VITE_ADSENSE_CLIENT;

  useEffect(() => {
    // Only load ads in production or when explicitly enabled
    const isDev = import.meta.env.DEV;
    const testAds = import.meta.env.VITE_ADSENSE_TEST_MODE === 'true';

    if (!adClient && !testAds) {
      console.warn('⚠️ AdSense client ID not configured. Set VITE_ADSENSE_CLIENT in .env');
      return;
    }

    try {
      // Push ad to Google's ad queue
      if (window.adsbygoogle && !isDev) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, [adClient]);

  // Don't render ads if client ID is not configured
  if (!adClient && import.meta.env.VITE_ADSENSE_TEST_MODE !== 'true') {
    return null;
  }

  // Format-specific styles
  const formatStyles = {
    horizontal: 'min-h-[90px] max-w-[728px]',
    rectangle: 'min-h-[250px] max-w-[300px]',
    vertical: 'min-h-[600px] max-w-[160px]',
  };

  // Show test placeholder in development mode
  if (import.meta.env.DEV || import.meta.env.VITE_ADSENSE_TEST_MODE === 'true') {
    return (
      <div
        className={`${formatStyles[format]} mx-auto bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center ${className}`}
      >
        <div className="text-center p-4">
          <p className="text-slate-500 font-semibold mb-1">📢 Ad Placement</p>
          <p className="text-xs text-slate-400">
            {format.charAt(0).toUpperCase() + format.slice(1)} ad will appear here
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Slot: {adSlot}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${formatStyles[format]} mx-auto ${className}`}>
      <ins
        className="adsbygoogle"
        style={{
          display: responsive ? 'block' : 'inline-block',
          width: responsive ? '100%' : undefined,
          height: responsive ? 'auto' : undefined,
        }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={responsive ? 'auto' : undefined}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}

/**
 * AdSense Script Loader
 * Add this to your index.html or App.tsx
 */
export function loadAdSenseScript(publisherId: string) {
  if (typeof window === 'undefined') return;

  // Check if script already loaded
  const existingScript = document.querySelector(
    `script[src*="adsbygoogle.js"]`
  );
  if (existingScript) return;

  // Create and inject script
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}
