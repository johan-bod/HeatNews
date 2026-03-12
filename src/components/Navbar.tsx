import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { LoginButton } from './LoginButton';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-ivory-50/90 backdrop-blur-md border-b border-amber-200/40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <Flame className="w-5 h-5 text-amber-600 group-hover:text-amber-500 transition-colors" />
              <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-navy-800">
              Heat<span className="text-amber-600">Story</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <LoginButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
