import { useState } from 'react';
import { Flame, Check, Clock } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

const INTENTIONS = [
  'More refreshes per day',
  'Custom alerts',
  'Team/organization use',
  'API access',
  'Other',
];

interface SoftGateProps {
  onDismiss: () => void;
}

export default function SoftGate({ onDismiss }: SoftGateProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const email = user?.email || '';

  const toggle = (intention: string) => {
    setSelected(prev =>
      prev.includes(intention)
        ? prev.filter(i => i !== intention)
        : [...prev, intention]
    );
  };

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const entry = { email, intentions: selected, createdAt: new Date().toISOString() };
      // Always save to localStorage as fallback
      try {
        localStorage.setItem(`heatstory_waitlist_${user.uid}`, JSON.stringify(entry));
      } catch { /* localStorage full — ignore */ }
      // Sync to Firestore if available
      if (db) {
        await setDoc(doc(db, 'waitlist', user.uid), {
          email,
          intentions: selected,
          createdAt: serverTimestamp(),
        });
      }
      setSubmitted(true);
    } catch (error) {
      console.warn('Failed to submit waitlist entry to Firestore:', error);
      // Still show success — the feedback is stored in localStorage
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center py-8 px-6">
        <Check className="w-8 h-8 text-green-400 mx-auto mb-3" />
        <h3 className="font-display text-lg font-semibold text-navy-800 mb-2">
          You're on the list
        </h3>
        <p className="font-body text-sm text-navy-700/50 mb-4">
          We'll let you know when more features are available.
        </p>
        <button
          onClick={onDismiss}
          className="font-body text-xs text-amber-600 hover:text-amber-500 transition-colors"
        >
          Continue browsing
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-8 px-6">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <Clock className="w-8 h-8 text-amber-500/60" />
        </div>
        <h3 className="font-display text-lg font-semibold text-navy-800 mb-2">
          You've used your daily refreshes
        </h3>
        <p className="font-body text-sm text-navy-700/50">
          Your personalized feed will refresh tomorrow. You can still explore the shared globe.
        </p>
      </div>

      {/* Waitlist */}
      <div className="bg-ivory-50 border border-amber-200/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-amber-500" />
          <h4 className="font-display text-sm font-semibold text-navy-800">
            Join the waitlist for unlimited access
          </h4>
        </div>
        <p className="font-body text-xs text-navy-700/40 mb-4">
          We're building something new. Help us grow.
        </p>

        {/* Email (pre-filled) */}
        <div className="mb-4">
          <label className="font-body text-xs text-navy-700/50 block mb-1">Email</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full bg-white border border-amber-200/30 rounded-lg px-3 py-2 font-body text-sm text-navy-800"
          />
        </div>

        {/* Intention checklist */}
        <div className="mb-4">
          <label className="font-body text-xs text-navy-700/50 block mb-2">
            What are you looking for?
          </label>
          <div className="space-y-2">
            {INTENTIONS.map(intention => (
              <button
                key={intention}
                onClick={() => toggle(intention)}
                className={`
                  w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors font-body text-sm
                  ${selected.includes(intention)
                    ? 'border-amber-500/50 bg-amber-50 text-amber-700'
                    : 'border-amber-200/20 bg-white text-navy-700/60 hover:border-amber-300/40'
                  }
                `}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                  ${selected.includes(intention) ? 'border-amber-500 bg-amber-500' : 'border-amber-200/40'}
                `}>
                  {selected.includes(intention) && <Check className="w-3 h-3 text-white" />}
                </div>
                {intention}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || selected.length === 0}
          className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-navy-900 font-body font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors"
        >
          {isSubmitting ? 'Submitting...' : 'Join waitlist'}
        </button>
      </div>
    </div>
  );
}
