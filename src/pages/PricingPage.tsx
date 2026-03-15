import { Link } from 'react-router-dom';
import { Check, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LandingNavbar from '@/components/landing/LandingNavbar';

interface Tier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const tiers: Tier[] = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    description: 'Explore the globe and see what HeatStory can do.',
    features: [
      'Interactive globe & news feed',
      'Last 24 hours of stories',
      '4-hour refresh cycle',
      'Basic article cards',
    ],
    cta: 'Get started',
  },
  {
    name: 'Pro',
    price: '$12',
    period: '/mo',
    description: 'For journalists and researchers who need full coverage intelligence.',
    features: [
      'Everything in Free',
      '1-hour refresh cycle',
      'Story investigation tool',
      'Source credibility tiers',
      'Coverage gap alerts',
      'Emerging story notifications',
      'CSV & JSON export',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Newsroom',
    price: '$79',
    period: '/seat/mo',
    description: 'For teams that need shared intelligence and real-time data.',
    features: [
      'Everything in Pro',
      'Real-time refresh',
      'Team dashboards & watchlists',
      'API access (rate-limited)',
      'Coverage pattern analytics',
      'Priority support',
      'Minimum 3 seats',
    ],
    cta: 'Contact us',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For wire services, large newsrooms, and research institutions.',
    features: [
      'Everything in Newsroom',
      'Full API access',
      'Custom source configuration',
      'White-label options',
      'Dedicated account manager',
      'SLA & uptime guarantee',
    ],
    cta: 'Contact us',
  },
];

export default function PricingPage() {
  const { user, signInWithGoogle } = useAuth();

  const handleCta = async (tier: Tier) => {
    if (tier.name === 'Newsroom' || tier.name === 'Enterprise') {
      window.location.href = 'mailto:contact@heatstory.app?subject=' + encodeURIComponent(`${tier.name} plan inquiry`);
      return;
    }
    if (!user) {
      try {
        await signInWithGoogle();
      } catch (error) {
        console.error('Sign in failed:', error);
      }
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
      <LandingNavbar />

      <section className="pt-32 pb-16 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ivory-100 animate-fade-up">
            Simple, transparent pricing
          </h1>
          <p className="font-body text-lg text-ivory-200/60 mt-4 max-w-xl mx-auto animate-fade-up" style={{ animationDelay: '0.1s' }}>
            From solo journalists to enterprise newsrooms. Start free, upgrade when you need more.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier, i) => (
            <div
              key={tier.name}
              className={`relative rounded-xl p-6 flex flex-col animate-fade-up ${
                tier.highlighted
                  ? 'border-2 border-amber-500/60 bg-amber-500/5'
                  : 'border border-ivory-200/10'
              }`}
              style={{ animationDelay: `${0.1 * (i + 1)}s` }}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-[#0a0a0f] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <Flame className="w-3 h-3" /> Most popular
                </div>
              )}

              <h3 className="font-display text-xl font-semibold text-ivory-100">{tier.name}</h3>

              <div className="mt-4 mb-2">
                <span className="font-display text-4xl font-bold text-ivory-100">{tier.price}</span>
                {tier.period && (
                  <span className="font-body text-sm text-ivory-200/40">{tier.period}</span>
                )}
              </div>

              <p className="font-body text-sm text-ivory-200/50 mb-6">{tier.description}</p>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-amber-500/70 mt-0.5 shrink-0" />
                    <span className="font-body text-sm text-ivory-200/70">{feature}</span>
                  </li>
                ))}
              </ul>

              {tier.name === 'Free' && user ? (
                <Link
                  to="/app"
                  className={`text-center font-semibold px-6 py-3 rounded-lg transition-colors text-sm ${
                    tier.highlighted
                      ? 'bg-amber-500 hover:bg-amber-400 text-[#0a0a0f]'
                      : 'border border-ivory-200/20 text-ivory-100 hover:border-amber-500/40 hover:text-amber-400'
                  }`}
                >
                  Open the map →
                </Link>
              ) : (
                <button
                  onClick={() => handleCta(tier)}
                  className={`font-semibold px-6 py-3 rounded-lg transition-colors text-sm ${
                    tier.highlighted
                      ? 'bg-amber-500 hover:bg-amber-400 text-[#0a0a0f]'
                      : 'border border-ivory-200/20 text-ivory-100 hover:border-amber-500/40 hover:text-amber-400'
                  }`}
                >
                  {tier.cta}
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ / Comparison */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-ivory-100 text-center mb-10">
            How we compare
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'How is HeatStory different from Ground News?',
                a: 'Ground News shows media bias. HeatStory shows geographic coverage — who covers a story, from where, and what regions are silent. These are complementary lenses on the same problem.',
              },
              {
                q: 'Why not use GDELT or World Monitor?',
                a: 'GDELT and World Monitor provide raw data for analysts. HeatStory adds editorial credibility scoring, multi-scale heat maps, and a journalist-first UX — so you get intelligence, not just data.',
              },
              {
                q: 'How does this compare to Meltwater or Cision?',
                a: 'Enterprise media monitoring platforms cost $10K–$100K/year. HeatStory delivers geographic coverage intelligence at a fraction of the cost, focused specifically on story mapping and source analysis.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="border border-ivory-200/10 rounded-xl p-6">
                <h3 className="font-display text-base font-semibold text-ivory-100 mb-2">{q}</h3>
                <p className="font-body text-sm text-ivory-200/50 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="pb-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-ivory-100 mb-4">
            Ready to see the full picture?
          </h2>
          <p className="font-body text-ivory-200/40 mb-8">
            Start free. No credit card required.
          </p>
          {user ? (
            <Link
              to="/app"
              className="inline-block bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
            >
              Open the map →
            </Link>
          ) : (
            <button
              onClick={async () => {
                try { await signInWithGoogle(); } catch (e) { console.error('Sign in failed:', e); }
              }}
              className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
            >
              Sign in to get started →
            </button>
          )}
        </div>
      </section>

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
                  <li><Link to="/" className="font-body text-sm text-ivory-200/40 hover:text-amber-400 transition-colors">Home</Link></li>
                  <li><a href="mailto:contact@heatstory.app" className="font-body text-sm text-ivory-200/40 hover:text-amber-400 transition-colors">Contact</a></li>
                </ul>
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
