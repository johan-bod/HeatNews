import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <Flame className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="font-display text-4xl font-bold text-ivory-100 mb-4">
          Heat<span className="text-amber-500">Story</span>
        </h1>
        <p className="font-body text-ivory-200/60 mb-8">Landing page coming soon.</p>
        <Link
          to="/app"
          className="inline-block bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Open the map →
        </Link>
      </div>
    </div>
  );
}
