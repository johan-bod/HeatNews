import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Flame, Clock, Globe, Rss, BarChart2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import LandingNavbar from '@/components/landing/LandingNavbar';
import { toast } from '@/components/ui/sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Tier {
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  period: string;
  description: string;
  features: string[];
  cta: string;
  ctaAction: 'signup' | 'contact';
  highlighted?: boolean;
  badge?: string;
  seats?: string;
}

// ── Tier definitions ──────────────────────────────────────────────────────────

const tiers: Tier[] = [
  {
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    period: '',
    description: 'Explore the globe. See what's being covered — and what isn't.',
    features: [
      'Interactive globe & heat map',
      '24-hour news window',
      '4-hour refresh cycle',
      'Up to 3 watch alerts',
      'Basic article cards',
    ],
    cta: 'Get started',
    ctaAction: 'signup',
  },
  {
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 249,
    period: '/mo',
    description: 'For journalists and researchers who can't afford blind spots.',
    features: [
      'Everything in Free',
      '1-hour refresh — catch stories as they break',
      'Full investigation dashboard',
      'Source credibility tiers & primary source detection',
      'Coverage gap alerts — know what's not being covered',
      'LLM-ready story brief export',
      'Unlimited watch alerts',
      'Translation across 50+ languages',
      'Custom RSS, Telegram & YouTube feeds',
    ],
    cta: 'Start free trial',
    ctaAction: 'signup',
    highlighted: true,
    badge: 'Most popular',
  },
  {
    name: 'Team',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    period: '/mo',
    description: 'Shared intelligence for editorial teams. One dashboard, everyone aligned.',
    seats: 'Up to 5 seats',
    features: [
      'Everything in Pro',
      '5 team members included',
      'Shared watchlists & team dashboard',
      'Real-time refresh',
      'Centralized social feed monitoring (Telegram, Reddit, YouTube)',
      'Coverage pattern analytics',
      'Team alert inbox',
    ],
    cta: 'Start free trial',
    ctaAction: 'signup',
  },
  {
    name: 'Newsroom',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    period: '/mo',
    description: 'For mid-size newsrooms that need always-on intelligence at scale.',
    seats: 'Up to 15 seats',
    features: [
      'Everything in Team',
      '15 team members included',
      'API access (rate-limited)',
      'Custom source configuration',
      'Priority support',
      'Custom onboarding',
      'Invoicing & PO support',
    ],
    cta: 'Contact us',
    ctaAction: 'contact',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    period: '',
    description: 'For wire services, media groups, and research institutions.',
    features: [
      'Everything in Newsroom',
      'Unlimited seats',
      'Full API access',
      'White-label & embedding options',
      'Dedicated account manager',
      'SLA & uptime guarantee',
      'Custom data integrations',
    ],
    cta: 'Contact us',
    ctaAction: 'contact',
  },
];

// ── ROI stats ─────────────────────────────────────────────────────────────────

const roiStats = [
  {
    icon: Clock,
    value: '90 min',
    label: 'saved per journalist, per day',
    sub: 'versus manual source surveying',
  },
  {
    icon: Globe,
    value: '€1,400',
    label: 'recovered monthly per journalist',
    sub: 'at €50/hr average rate',
  },
  {
    icon: Rss,
    value: '1 place',
    label: 'for news, Telegram, Reddit & YouTube',
    sub: 'centralized source monitoring',
  },
  {
    icon: BarChart2,
    value: '37 hrs',
    label: 'weekly saved per team of 5',
    sub: 'time back for actual journalism',
  },
];

// ── FAQ ───────────────────────────────────────────────────────────────────────

const faqs = [
  {
    q: 'How is HeatStory different from Meltwater or Cision?',
    a: 'Enterprise monitoring platforms cost €10K–€100K/year and are built for PR and comms teams. HeatStory is built specifically for journalists and editors — geographic heat mapping, primary source detection, and coverage gap analysis at a fraction of the cost, with no 12-month contract required.',
  },
  {
    q: 'What social media sources can I monitor?',
    a: 'HeatStory integrates with Telegram channels, Reddit communities, and YouTube channels alongside traditional RSS feeds and news APIs. Add any public feed in seconds. For Telegram in particular, this means monitoring primary sources — government channels, official agencies, field reporters — directly alongside mainstream coverage.',
  },
  {
    q: 'How is this different from Ground News?',
    a: 'Ground News shows media bias. HeatStory shows geographic coverage — who covers a story, from where, and which regions are completely silent. These are complementary tools. Where Ground News answers "how is a story being framed?", HeatStory answers "where is a story not being covered at all?"',
  },
  {
    q: 'Do you generate invoices for B2B customers?',
    a: 'Yes. Every payment generates a PDF invoice automatically via Stripe, emailed to your billing address. EU companies can enter their VAT ID at checkout for reverse charge compliance. Newsroom and Enterprise plans also support purchase orders.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Monthly plans cancel at the end of the billing period. Annual plans are non-refundable but you keep access until the period ends. No lock-in on Free or Pro.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const { user, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');

  function formatPrice(tier: Tier): string {
    if (tier.monthlyPrice === null) return 'Custom';
    if (tier.monthlyPrice === 0) return '€0';
    const price = billing === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;
    return `€${price}`;
  }

  function periodLabel(tier: Tier): string {
    if (!tier.monthlyPrice) return '';
    return billing === 'yearly' ? '/yr' : tier.period;
  }

  function yearlySaving(tier: Tier): number | null {
    if (!tier.monthlyPrice || !tier.yearlyPrice) return null;
    const normalYearly = tier.monthlyPrice * 12;
    return normalYearly - tier.yearlyPrice;
  }

  async function handleCta(tier: Tier) {
    if (tier.ctaAction === 'contact') {
      window.location.href = `mailto:contact@heatstory.app?subject=${encodeURIComponent(`${tier.name} plan inquiry`)}`;
      return;
    }
    if (!user) {
      try {
        await signInWithGoogle();
        navigate('/app');
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        if (!msg.includes('popup-closed') && !msg.includes('cancelled')) {
          toast.error('Sign in failed. Please try again.');
        }
      }
    } else {
      navigate('/app');
    }
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-ivory-100"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(245,245,240,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <LandingNavbar />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-12 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-ivory-100 animate-fade-up leading-tight">
            The time you spend surveying sources<br className="hidden md:block" />
            <span className="text-amber-500"> is time you're not reporting.</span>
          </h1>
          <p className="font-body text-lg text-ivory-200/60 mt-5 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.1s' }}>
            HeatStory centralizes news, Telegram channels, Reddit, and YouTube into one real-time intelligence feed —
            so your team spends time on the story, not on finding it.
          </p>
        </div>
      </section>

      {/* ── ROI bar ──────────────────────────────────────────────────────── */}
      <section className="pb-14 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {roiStats.map(({ icon: Icon, value, label, sub }) => (
            <div key={label} className="rounded-xl border border-ivory-200/8 bg-ivory-200/[0.02] p-5 text-center">
              <Icon className="w-5 h-5 text-amber-500/70 mx-auto mb-2" />
              <div className="font-display text-2xl font-bold text-ivory-100">{value}</div>
              <div className="font-body text-xs text-ivory-200/60 mt-1 leading-snug">{label}</div>
              <div className="font-body text-[10px] text-ivory-200/30 mt-0.5">{sub}</div>
            </div>
          ))}
        </div>

        {/* ROI anchor */}
        <p className="text-center font-body text-sm text-ivory-200/35 mt-6 max-w-lg mx-auto">
          At €50/hr, a journalist saving 90 minutes a day recovers{' '}
          <span className="text-amber-400/70">€1,400/month in billable time.</span>{' '}
          Pro is €29.
        </p>
      </section>

      {/* ── Billing toggle ────────────────────────────────────────────────── */}
      <section className="pb-8 px-6">
        <div className="flex items-center justify-center gap-3">
          <span className={`font-body text-sm transition-colors ${billing === 'monthly' ? 'text-ivory-100' : 'text-ivory-200/40'}`}>Monthly</span>
          <button
            onClick={() => setBilling(b => b === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-12 h-6 rounded-full bg-ivory-200/10 border border-ivory-200/15 transition-colors"
            aria-label="Toggle billing period"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-amber-500 transition-transform ${billing === 'yearly' ? 'translate-x-6' : 'translate-x-0'}`}
            />
          </button>
          <span className={`font-body text-sm transition-colors ${billing === 'yearly' ? 'text-ivory-100' : 'text-ivory-200/40'}`}>
            Annual
            <span className="ml-1.5 text-[10px] text-emerald-400/80 font-semibold">save ~2 months</span>
          </span>
        </div>
      </section>

      {/* ── Pricing tiers ─────────────────────────────────────────────────── */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 lg:grid-cols-5 gap-5">
          {tiers.map((tier, i) => {
            const saving = billing === 'yearly' ? yearlySaving(tier) : null;
            return (
              <div
                key={tier.name}
                className={`relative rounded-xl p-6 flex flex-col animate-fade-up ${
                  tier.highlighted
                    ? 'border-2 border-amber-500/60 bg-amber-500/5'
                    : 'border border-ivory-200/10'
                }`}
                style={{ animationDelay: `${0.08 * (i + 1)}s` }}
              >
                {tier.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-[#0a0a0f] text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                    <Flame className="w-3 h-3" /> {tier.badge}
                  </div>
                )}

                <h3 className="font-display text-lg font-semibold text-ivory-100">{tier.name}</h3>
                {tier.seats && (
                  <span className="text-[10px] text-amber-400/60 font-body mt-0.5">{tier.seats}</span>
                )}

                <div className="mt-4 mb-1 flex items-end gap-1">
                  <span className="font-display text-3xl font-bold text-ivory-100">{formatPrice(tier)}</span>
                  {periodLabel(tier) && (
                    <span className="font-body text-sm text-ivory-200/40 mb-1">{periodLabel(tier)}</span>
                  )}
                </div>

                {saving && (
                  <div className="text-[11px] text-emerald-400/70 font-body mb-1">
                    Save €{saving}/yr
                  </div>
                )}

                <p className="font-body text-xs text-ivory-200/45 mb-5 leading-relaxed min-h-[3rem]">{tier.description}</p>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-500/70 mt-0.5 shrink-0" />
                      <span className="font-body text-xs text-ivory-200/65 leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>

                {tier.name === 'Free' && user ? (
                  <Link
                    to="/app"
                    className="text-center font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm border border-ivory-200/20 text-ivory-100 hover:border-amber-500/40 hover:text-amber-400"
                  >
                    Open the map →
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCta(tier)}
                    className={`font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm ${
                      tier.highlighted
                        ? 'bg-amber-500 hover:bg-amber-400 text-[#0a0a0f]'
                        : 'border border-ivory-200/20 text-ivory-100 hover:border-amber-500/40 hover:text-amber-400'
                    }`}
                  >
                    {tier.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center font-body text-xs text-ivory-200/25 mt-8">
          All paid plans include a 14-day free trial. No credit card required to start.
          PDF invoices and VAT ID collection included for B2B customers.
        </p>
      </section>

      {/* ── What you monitor ─────────────────────────────────────────────── */}
      <section className="pb-24 px-6 border-t border-ivory-200/5 pt-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ivory-100 text-center mb-3">
            One feed. Every source that matters.
          </h2>
          <p className="font-body text-sm text-ivory-200/45 text-center mb-12 max-w-xl mx-auto">
            Breaking news no longer lives only on wire services. Add any source — official, social, or specialist — and monitor it alongside mainstream coverage.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                emoji: '📡',
                title: 'News & Wire Services',
                description: 'Thousands of outlets across 60+ countries, heat-scored by geographic coverage and credibility tier.',
                tags: ['AP', 'Reuters', 'AFP', 'Regional outlets', 'Independent media'],
              },
              {
                emoji: '✈️',
                title: 'Telegram & Social Channels',
                description: 'Primary source monitoring: government channels, field reporters, official agencies — often hours ahead of wire services.',
                tags: ['Government channels', 'Officials', 'Field reporters', 'NGOs', 'Agencies'],
              },
              {
                emoji: '🔁',
                title: 'Reddit, YouTube & RSS',
                description: 'Ground-level signals, video journalism, specialist feeds, and any public RSS or Atom endpoint — added in seconds.',
                tags: ['Subreddits', 'YouTube channels', 'Custom RSS', 'Gov feeds', 'Think tanks'],
              },
            ].map(({ emoji, title, description, tags }) => (
              <div key={title} className="rounded-xl border border-ivory-200/10 p-6">
                <div className="text-2xl mb-3">{emoji}</div>
                <h3 className="font-display text-base font-semibold text-ivory-100 mb-2">{title}</h3>
                <p className="font-body text-xs text-ivory-200/45 leading-relaxed mb-4">{description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full border border-ivory-200/10 text-ivory-200/35">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-ivory-100 text-center mb-10">
            Common questions
          </h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group border border-ivory-200/10 rounded-xl">
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none select-none">
                  <h3 className="font-display text-sm font-semibold text-ivory-100 pr-4">{q}</h3>
                  <span className="text-ivory-200/30 group-open:rotate-180 transition-transform flex-shrink-0 text-lg leading-none">▾</span>
                </summary>
                <p className="font-body text-sm text-ivory-200/50 leading-relaxed px-6 pb-5">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="pb-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-ivory-100 mb-3">
            See the full picture in under a minute.
          </h2>
          <p className="font-body text-ivory-200/40 mb-8 text-sm">
            Start free. No credit card. Cancel anytime.
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
                try {
                  await signInWithGoogle();
                  navigate('/app');
                } catch (error) {
                  const msg = error instanceof Error ? error.message : String(error);
                  if (!msg.includes('popup-closed') && !msg.includes('cancelled')) {
                    toast.error('Sign in failed. Please try again.');
                  }
                }
              }}
              className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
            >
              Sign in to get started →
            </button>
          )}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
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
