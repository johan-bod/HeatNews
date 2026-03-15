import { useState, useEffect } from 'react';
import { X, FlaskConical } from 'lucide-react';

export default function BetaNudge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up">
      <div className="flex items-center gap-3 bg-[#13131a] border border-ivory-200/10 rounded-full px-5 py-3 shadow-xl shadow-black/40">
        <FlaskConical className="w-4 h-4 text-amber-500/70 shrink-0" />
        <span className="font-body text-sm text-ivory-200/60">
          We're in beta —{' '}
          <a
            href="mailto:contact@heatstory.app?subject=HeatStory feedback"
            className="text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-2"
          >
            we'd love to hear from you
          </a>
        </span>
        <button
          onClick={() => setVisible(false)}
          aria-label="Dismiss"
          className="ml-1 text-ivory-200/30 hover:text-ivory-200/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
