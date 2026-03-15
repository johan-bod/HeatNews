import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginButton } from '@/components/LoginButton';

export default function LandingNavbar() {
  const { user } = useAuth();

  return (
    <nav aria-label="Landing navigation" className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-ivory-200/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Flame className="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors" />
              <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-ivory-100">
              Heat<span className="text-amber-500">Story</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/pricing"
              className="font-body text-sm text-ivory-200/60 hover:text-amber-400 transition-colors"
            >
              Pricing
            </Link>
            {user ? (
              <Link
                to="/app"
                className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
              >
                Open the map →
              </Link>
            ) : (
              <LoginButton />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
