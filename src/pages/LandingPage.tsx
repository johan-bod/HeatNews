import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Globe, Layers, Cpu, Network, Newspaper, FlaskConical, Quote } from 'lucide-react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroGlobe from '@/components/landing/HeroGlobe';
import FeatureCard from '@/components/landing/FeatureCard';
import BetaNudge from '@/components/landing/BetaNudge';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

function GradientLine() {
  return <div className="h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />;
}

export default function LandingPage() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      const destination = (location.state as { from?: string })?.from || '/app';
      navigate(destination);
    } catch (error) {
      const code = (error as { code?: string }).code ?? '';
      const msg = error instanceof Error ? error.message : String(error);
      if (code.includes('popup-closed') || code.includes('cancelled') || msg.includes('popup-closed')) return;
      console.error('Sign in failed:', error);
      toast.error(`Sign in failed: ${code || msg}`, { duration: 8000 });
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-ivory-100"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(245,245,240,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "HeatStory",
          "url": "https://heatstory.app",
          "description": "Real-time news coverage map and analysis tool. Monitor global coverage, spot emerging stories, and surface underreported signals before they go national.",
          "applicationCategory": "NewsApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        }) }}
      />
      <LandingNavbar />

      {/* Hero */}
      <section className="min-h-screen flex items-center pt-16">
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            {/* Text */}
            <div className="flex-1 text-center lg:text-left">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-ivory-100 leading-tight animate-fade-up">
                Monitor global coverage.{' '}
                <span className="text-amber-500">Spot emerging stories.</span>
              </h1>
              <p className="font-body text-lg text-ivory-200/60 mt-4 max-w-xl animate-fade-up" style={{ animationDelay: '0.1s' }}>
                Real-time news intelligence for journalists and researchers. See who covers what, from where, and how.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 lg:justify-start justify-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
                {user ? (
                  <Link
                    to="/app"
                    className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
                  >
                    Open the map →
                  </Link>
                ) : (
                  <button
                    onClick={handleSignIn}
                    className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
                  >
                    Sign in to get started →
                  </button>
                )}
              </div>
              {/* Live pulse */}
              <div className="mt-6 flex items-center gap-2 justify-center lg:justify-start animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="text-xs text-ivory-200/40 font-body">Live — monitoring now</span>
              </div>
            </div>
            {/* Globe */}
            <div className="flex-shrink-0 animate-fade-up" style={{ animationDelay: '0.2s' }}>
              <HeroGlobe />
            </div>
          </div>
        </div>
      </section>

      <GradientLine />

      {/* Metrics Bar */}
      <section className="py-16 border-b border-ivory-200/5">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Globe, label: '40+ countries' },
              { icon: Layers, label: '4 coverage scales' },
              { icon: Cpu, label: 'Real-time NLP' },
              { icon: Network, label: 'Multi-source clustering' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <Icon className="w-5 h-5 text-amber-500/60" />
                <span className="font-body text-sm text-ivory-200/60">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section id="features" className="py-20 px-6 animate-fade-up">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-ivory-100 mb-3">
              Built for coverage intelligence
            </h2>
            <p className="font-body text-ivory-200/40 max-w-lg mx-auto">
              Every feature designed to help you understand who covers what, from where, and how.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              title="See the full geographic picture"
              description="Every story mapped by origin. Spot which outlets cover it, from where, and which regions are silent."
              imageSrc="/screenshots/globe-overview.png"
            />
            <FeatureCard
              title="Sources ranked by editorial standards"
              description="Articles grouped by credibility tier — major wire services, national outlets, regional media — not by popularity or engagement."
              imageSrc="/screenshots/investigate-tiers.png"
            />
            <FeatureCard
              title="Surface unique angles across sources"
              description="NLP-powered perspective analysis reveals which outlets emphasize different aspects of the same story."
              imageSrc="/screenshots/investigate-perspective.png"
            />
          </div>
        </div>
      </section>

      <GradientLine />

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 animate-fade-up">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ivory-100 text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: '01', title: 'Aggregate', desc: 'We collect news from verified sources across 40+ countries in real time.' },
              { step: '02', title: 'Analyze', desc: 'NLP clusters related stories, detects coverage gaps, and compares editorial framing.' },
              { step: '03', title: 'Investigate', desc: 'You see the full picture — who covers what, from where, and how each source frames it.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center md:text-left">
                <span className="font-display text-4xl font-bold text-amber-500/20">{step}</span>
                <h3 className="font-display text-xl font-semibold text-ivory-100 mt-2 mb-2">{title}</h3>
                <p className="font-body text-sm text-ivory-200/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section id="who-its-for" className="py-20 px-6 animate-fade-up">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-ivory-100 text-center mb-12">
            Who it's for
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-ivory-200/10 rounded-xl p-8">
              <Newspaper className="w-8 h-8 text-amber-500/60 mb-4" />
              <h3 className="font-display text-xl font-semibold text-ivory-100 mb-3">For newsrooms</h3>
              <p className="font-body text-sm text-ivory-200/50 leading-relaxed">
                Monitor coverage of your beats across borders. Spot stories competitors are missing. Understand how your coverage compares to wire services and international outlets.
              </p>
            </div>
            <div className="border border-ivory-200/10 rounded-xl p-8">
              <FlaskConical className="w-8 h-8 text-amber-500/60 mb-4" />
              <h3 className="font-display text-xl font-semibold text-ivory-100 mb-3">For researchers</h3>
              <p className="font-body text-sm text-ivory-200/50 leading-relaxed">
                Analyze media coverage patterns at scale. Track geographic gaps, editorial framing differences, and source credibility across regions and languages.
              </p>
            </div>
          </div>
        </div>
      </section>

      <GradientLine />

      {/* Testimonial Placeholder / Early Access */}
      <section className="py-20 px-6 animate-fade-up">
        <div className="max-w-2xl mx-auto text-center">
          <Quote className="w-24 h-24 text-amber-500/10 mx-auto mb-6" />
          <p className="font-display text-2xl font-semibold text-ivory-100 mb-6">
            Early access is open. Be among the first newsrooms and research teams to use HeatStory.
          </p>
          <a
            href="mailto:contact@heatstory.app"
            className="inline-block border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Request early access →
          </a>
        </div>
      </section>

      {/* CTA Repeat */}
      <section className="py-20 px-6 animate-fade-up">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-ivory-100 mb-6">
            Ready to see the full picture?
          </h2>
          {user ? (
            <Link
              to="/app"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
            >
              Open the map →
            </Link>
          ) : (
            <button
              onClick={handleSignIn}
              className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
            >
              Sign in to get started →
            </button>
          )}
        </div>
      </section>

      {!user && <BetaNudge />}

      {/* Footer */}
      <footer className="border-t border-ivory-200/5 py-12 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="max-w-xs">
              <span className="font-display font-bold text-lg text-ivory-100">
                Heat<span className="text-amber-500">Story</span>
              </span>
              <p className="font-body text-sm text-ivory-200/40 mt-2 leading-relaxed">
                Real-time news coverage intelligence for professionals.
              </p>
            </div>
            <div className="flex gap-16">
              <div>
                <h3 className="font-body text-xs font-semibold text-ivory-200/30 uppercase tracking-widest mb-4">Links</h3>
                <ul className="space-y-2.5">
                  <li><Link to="/pricing" className="font-body text-sm text-ivory-200/40 hover:text-amber-400 transition-colors">Pricing</Link></li>
                  <li><a href="mailto:contact@heatstory.app" className="font-body text-sm text-ivory-200/40 hover:text-amber-400 transition-colors">Contact</a></li>
                  <li><a href="https://github.com/johan-bod/HeatNews" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-ivory-200/40 hover:text-amber-400 transition-colors">GitHub</a></li>
                </ul>
              </div>
              <div>
                <h3 className="font-body text-xs font-semibold text-ivory-200/30 uppercase tracking-widest mb-4">Built with</h3>
                <p className="font-body text-sm text-ivory-200/40 leading-relaxed">
                  React, TypeScript,<br />Tailwind CSS
                </p>
              </div>
            </div>
          </div>
          <div className="border-t border-ivory-200/5 mt-10 pt-6 text-center">
            <p className="font-body text-xs text-ivory-200/20">
              &copy; {new Date().getFullYear()} HeatStory
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
