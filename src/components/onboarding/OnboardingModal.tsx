import { useState } from 'react';
import { Flame, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import TopicPicker from './TopicPicker';
import LocationPicker from './LocationPicker';
import type { Topic } from '@/data/keywords/taxonomy';
import type { PreferenceLocation } from '@/types/preferences';

interface OnboardingModalProps {
  onComplete: (topics: Topic[], locations: PreferenceLocation[]) => void;
  onSkip: () => void;
  /** Pre-populate with existing preferences when re-opening via gear icon */
  initialTopics?: Topic[];
  initialLocations?: PreferenceLocation[];
}

type Step = 'welcome' | 'topics' | 'locations';

export default function OnboardingModal({
  onComplete,
  onSkip,
  initialTopics = [],
  initialLocations = [],
}: OnboardingModalProps) {
  // If pre-populated, skip welcome and go straight to topics
  const hasExisting = initialTopics.length > 0 || initialLocations.length > 0;
  const [step, setStep] = useState<Step>(hasExisting ? 'topics' : 'welcome');
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [locations, setLocations] = useState<PreferenceLocation[]>(initialLocations);

  const handleFinish = () => {
    onComplete(topics, locations);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 bg-navy-800 border border-ivory-200/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6">
          {(['welcome', 'topics', 'locations'] as Step[]).map(s => (
            <div
              key={s}
              className={`w-2 h-2 rounded-full transition-colors ${
                s === step ? 'bg-amber-500' : 'bg-ivory-200/20'
              }`}
            />
          ))}
        </div>

        <div className="p-8">
          {/* Welcome */}
          {step === 'welcome' && (
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Flame className="w-12 h-12 text-amber-500" />
                  <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full" />
                </div>
              </div>
              <h2 className="font-display text-2xl font-bold text-ivory-50 mb-3">
                Welcome to HeatStory
              </h2>
              <p className="font-body text-sm text-ivory-200/60 mb-8 max-w-sm mx-auto">
                Tell us what you care about and we'll focus the globe on stories that matter to you.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setStep('topics')}
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-navy-900 font-body font-semibold text-sm px-6 py-3 rounded-lg transition-colors"
                >
                  Personalize my feed <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={onSkip}
                  className="font-body text-xs text-ivory-200/40 hover:text-ivory-200/60 transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Topics */}
          {step === 'topics' && (
            <div>
              <h2 className="font-display text-xl font-bold text-ivory-50 mb-1">
                Your Topics
              </h2>
              <p className="font-body text-xs text-ivory-200/40 mb-6">
                We'll highlight stories in these categories
              </p>
              <TopicPicker selected={topics} onChange={setTopics} />
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex items-center gap-1 font-body text-xs text-ivory-200/40 hover:text-ivory-200/60 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <button
                  onClick={() => setStep('locations')}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-navy-900 font-body font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Locations */}
          {step === 'locations' && (
            <div>
              <h2 className="font-display text-xl font-bold text-ivory-50 mb-1">
                Your Locations
              </h2>
              <p className="font-body text-xs text-ivory-200/40 mb-6">
                The globe will auto-focus on your first location
              </p>
              <LocationPicker selected={locations} onChange={setLocations} />
              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => setStep('topics')}
                  className="flex items-center gap-1 font-body text-xs text-ivory-200/40 hover:text-ivory-200/60 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={topics.length === 0 && locations.length === 0}
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-ivory-200/10 disabled:text-ivory-200/30 text-navy-900 font-body font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" /> Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
