import { RefreshCw } from 'lucide-react';

interface RefreshIndicatorProps {
  remaining: number;
  total: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  isSignedIn: boolean;
}

export default function RefreshIndicator({
  remaining,
  total,
  onRefresh,
  isRefreshing,
  isSignedIn,
}: RefreshIndicatorProps) {
  if (!isSignedIn) return null;

  const exhausted = remaining <= 0;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRefresh}
        disabled={isRefreshing || exhausted}
        className={`
          flex items-center gap-2 font-body text-sm px-4 py-2 rounded-lg border transition-colors
          ${exhausted
            ? 'bg-ivory-200/5 border-ivory-200/10 text-ivory-200/30 cursor-not-allowed'
            : 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
          }
        `}
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Refresh my feed'}
      </button>
      <span className={`font-body text-xs ${exhausted ? 'text-red-400/60' : 'text-ivory-200/40'}`}>
        {remaining}/{total} remaining
      </span>
    </div>
  );
}
