import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame, Menu, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LoginButton } from '@/components/LoginButton';

const navLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Who it\'s for', href: '/#who-its-for' },
  { label: 'Pricing', href: '/pricing' },
];

function NavLink({ label, href, onClick }: { label: string; href: string; onClick?: () => void }) {
  const location = useLocation();
  const isAnchor = href.startsWith('/#');

  if (isAnchor) {
    const anchor = href.slice(1); // strip leading /
    const isOnLanding = location.pathname === '/';

    if (isOnLanding) {
      return (
        <a
          href={anchor}
          onClick={onClick}
          className="font-body text-sm text-ivory-200/60 hover:text-amber-400 transition-colors"
        >
          {label}
        </a>
      );
    }
    return (
      <Link
        to={href}
        onClick={onClick}
        className="font-body text-sm text-ivory-200/60 hover:text-amber-400 transition-colors"
      >
        {label}
      </Link>
    );
  }

  return (
    <Link
      to={href}
      onClick={onClick}
      className="font-body text-sm text-ivory-200/60 hover:text-amber-400 transition-colors"
    >
      {label}
    </Link>
  );
}

export default function LandingNavbar() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav aria-label="Landing navigation" className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-ivory-200/5">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Flame className="w-5 h-5 text-amber-500 group-hover:text-amber-400 transition-colors" />
              <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-ivory-100">
              Heat<span className="text-amber-500">Story</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <NavLink key={link.label} {...link} />
            ))}

            <div className="h-4 w-px bg-ivory-200/10" />

            {user ? (
              <Link
                to="/app"
                className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
              >
                Open the map →
              </Link>
            ) : (
              <LoginButton redirectTo="/app" />
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-ivory-200/60 hover:text-ivory-100 transition-colors"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0a0a0f]/95 backdrop-blur-md border-t border-ivory-200/5">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <NavLink key={link.label} {...link} onClick={() => setMobileOpen(false)} />
            ))}

            <div className="h-px bg-ivory-200/10" />

            {user ? (
              <Link
                to="/app"
                onClick={() => setMobileOpen(false)}
                className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm text-center"
              >
                Open the map →
              </Link>
            ) : (
              <LoginButton redirectTo="/app" />
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
