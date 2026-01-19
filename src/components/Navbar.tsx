import React from 'react';
import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { LoginButton } from './LoginButton';

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Globe className="w-6 h-6 text-red-600" />
            <span className="font-montserrat font-bold text-lg text-slate-800">
              NewsMap
            </span>
          </Link>

          {/* Navigation Links & Auth */}
          <div className="flex items-center gap-4">
            <LoginButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
