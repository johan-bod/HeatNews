import { Link, useLocation } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found — HeatStory');
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <Link to="/app" className="flex items-center gap-2 mb-12 group">
        <Flame className="w-5 h-5 text-amber-600 group-hover:text-amber-500 transition-colors" />
        <span className="font-display text-lg font-bold text-ivory-100">
          Heat<span className="text-amber-600">Story</span>
        </span>
      </Link>

      <p className="font-mono text-sm text-amber-500/60 mb-3 uppercase tracking-widest">404</p>
      <h1 className="font-display text-3xl font-bold text-ivory-100 mb-4">Page not found</h1>
      <p className="font-body text-sm text-ivory-200/50 mb-8 max-w-xs leading-relaxed">
        The page <code className="font-mono text-xs bg-ivory-200/10 px-1.5 py-0.5 rounded text-amber-400/80">{location.pathname}</code> doesn't exist.
      </p>

      <Link
        to="/app"
        className="font-body text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-navy-900 px-5 py-2.5 rounded-lg transition-colors"
      >
        Go to the map →
      </Link>
    </div>
  );
}
