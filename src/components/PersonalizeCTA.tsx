import { Sparkles, MapPin, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isConfigured } from '@/lib/firebase';

interface PersonalizeCTAProps {
  hasCompletedOnboarding: boolean;
  onOpenPreferences: () => void;
}

export default function PersonalizeCTA({ hasCompletedOnboarding, onOpenPreferences }: PersonalizeCTAProps) {
  const { user, signInWithGoogle } = useAuth();

  // Don't show if Firebase isn't configured
  if (!isConfigured) return null;

  // Don't show if user has already personalized
  if (user && hasCompletedOnboarding) return null;

  const handleAction = async () => {
    if (!user) {
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error('Sign in failed:', error);
      }
    } else {
      onOpenPreferences();
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <div className="relative overflow-hidden bg-gradient-to-r from-navy-800 to-navy-900 border border-amber-500/20 rounded-2xl p-6 md:p-8">
        {/* Background glow */}
        <div
          className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(217,158,43,0.4) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5">
          <div className="flex-1">
            <h3 className="font-display text-lg font-semibold text-ivory-50 mb-2">
              {user ? 'Set up your personalized feed' : 'Make it yours'}
            </h3>
            <p className="font-body text-sm text-ivory-200/50 mb-4 max-w-md">
              {user
                ? 'Pick your topics and locations to see the news that matters most to you on the globe.'
                : 'Sign in to personalize your globe — pick topics and locations, get tailored coverage with 2 free daily refreshes.'
              }
            </p>

            {/* Value props */}
            <div className="flex flex-wrap gap-3 mb-5">
              <span className="flex items-center gap-1.5 font-body text-xs text-amber-400/70">
                <Sparkles className="w-3.5 h-3.5" />
                Personalized articles
              </span>
              <span className="flex items-center gap-1.5 font-body text-xs text-amber-400/70">
                <MapPin className="w-3.5 h-3.5" />
                Your locations on the globe
              </span>
              <span className="flex items-center gap-1.5 font-body text-xs text-amber-400/70">
                <Flame className="w-3.5 h-3.5" />
                2 free daily refreshes
              </span>
            </div>
          </div>

          <button
            onClick={handleAction}
            className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-navy-900 font-body font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
          >
            {user ? 'Pick your interests' : 'Sign in to personalize'}
          </button>
        </div>
      </div>
    </div>
  );
}
