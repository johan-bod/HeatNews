import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface UpgradePromptProps {
  feature: string;
  limitReached: string;
  className?: string;
}

export default function UpgradePrompt({ limitReached, className }: UpgradePromptProps) {
  return (
    <div
      className={`border border-amber-500/20 bg-amber-500/5 rounded-lg px-3 py-2 text-xs text-ivory-200/60 flex items-center gap-2${className ? ` ${className}` : ''}`}
    >
      <Lock className="w-3.5 h-3.5 flex-shrink-0 text-amber-400/60" />
      <span>{limitReached}</span>
      <Link
        to="/pricing"
        className="ml-auto flex-shrink-0 text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap"
      >
        Upgrade to Pro →
      </Link>
    </div>
  );
}
