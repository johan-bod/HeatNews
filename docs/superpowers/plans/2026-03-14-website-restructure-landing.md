# Website Restructure & Landing Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate marketing landing page (`/`) from the tool (`/app`) and build a professional B2B landing page targeting journalists and researchers.

**Architecture:** Rename `Index.tsx` → `AppPage.tsx` at `/app`, create `LandingPage.tsx` at `/` with hero, animated CSS globe, feature cards, and audience sections. Update all internal links (`/investigate` → `/app/investigate`, `navigate('/')` → `navigate('/app')`). Landing page has zero heavy dependencies — pure CSS animations.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, React Router v7, Lucide icons

---

## Chunk 1: Routing & Landing Page Components

### File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Rename | `src/pages/Index.tsx` → `src/pages/AppPage.tsx` | Tool page (unchanged internally) |
| Create | `src/pages/LandingPage.tsx` | Marketing landing page orchestrator |
| Create | `src/components/landing/LandingNavbar.tsx` | Landing-specific fixed navbar |
| Create | `src/components/landing/HeroGlobe.tsx` | Animated CSS globe with heat dots |
| Create | `src/components/landing/FeatureCard.tsx` | Reusable feature card with hover glow + screenshot placeholder |
| Modify | `src/App.tsx` | Route definitions |
| Modify | `src/components/Navbar.tsx` | Logo link `/` → `/app` |
| Modify | `src/components/globe/GlobePopup.tsx` | Investigate link `/investigate` → `/app/investigate` |
| Modify | `src/components/NewsDemo.tsx` | Investigate link `/investigate` → `/app/investigate` |
| Modify | `src/pages/InvestigatePage.tsx` | Both `navigate('/')` → `navigate('/app')` |

---

### Task 1: Rename Index.tsx and Update Routing

**Files:**
- Rename: `src/pages/Index.tsx` → `src/pages/AppPage.tsx`
- Create: `src/pages/LandingPage.tsx` (minimal placeholder)
- Modify: `src/App.tsx`

- [ ] **Step 1: Rename Index.tsx to AppPage.tsx**

```bash
git mv src/pages/Index.tsx src/pages/AppPage.tsx
```

- [ ] **Step 2: Create minimal LandingPage placeholder**

Create `src/pages/LandingPage.tsx`:

```tsx
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
```

- [ ] **Step 3: Update App.tsx routes and imports**

Replace the entire content of `src/App.tsx` with:

```tsx
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminRoute } from "@/components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import AppPage from "./pages/AppPage";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import InvestigatePage from "./pages/InvestigatePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/app/investigate" element={<InvestigatePage />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Admin />
              </AdminRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (275+)

- [ ] **Step 6: Commit**

```bash
git add src/pages/AppPage.tsx src/pages/LandingPage.tsx src/App.tsx
git commit -m "feat: restructure routing — landing at /, tool at /app, placeholder landing page"
```

---

### Task 2: Update All Internal Links

**Files:**
- Modify: `src/components/Navbar.tsx:15` — logo link
- Modify: `src/components/globe/GlobePopup.tsx:218` — investigate link
- Modify: `src/components/NewsDemo.tsx:225` — investigate link
- Modify: `src/pages/InvestigatePage.tsx:92,113` — back-to-map buttons

- [ ] **Step 1: Update Navbar logo link**

In `src/components/Navbar.tsx`, change line 15 from:
```tsx
          <Link to="/" className="flex items-center gap-2.5 group">
```
to:
```tsx
          <Link to="/app" className="flex items-center gap-2.5 group">
```

- [ ] **Step 2: Update GlobePopup investigate link**

In `src/components/globe/GlobePopup.tsx`, find:
```tsx
              navigate(`/investigate?article=${article.id}`, {
```
and change to:
```tsx
              navigate(`/app/investigate?article=${article.id}`, {
```

- [ ] **Step 3: Update NewsDemo investigate link**

In `src/components/NewsDemo.tsx`, find:
```tsx
                                navigate(`/investigate?article=${article.id}`, {
```
and change to:
```tsx
                                navigate(`/app/investigate?article=${article.id}`, {
```

- [ ] **Step 4: Update InvestigatePage back-to-map buttons (both occurrences)**

In `src/pages/InvestigatePage.tsx`, change BOTH occurrences of:
```tsx
            onClick={() => navigate('/')}
```
to:
```tsx
            onClick={() => navigate('/app')}
```

There are exactly two: line 92 (error state) and line 113 (normal view).

- [ ] **Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/components/Navbar.tsx src/components/globe/GlobePopup.tsx src/components/NewsDemo.tsx src/pages/InvestigatePage.tsx
git commit -m "feat: update all internal links for /app and /app/investigate routes"
```

---

### Task 3: Create HeroGlobe Component

**Files:**
- Create: `src/components/landing/HeroGlobe.tsx`

- [ ] **Step 1: Create the landing directory and HeroGlobe component**

Create `src/components/landing/HeroGlobe.tsx`:

```tsx
import './hero-globe.css';

interface HeatDot {
  angle: number;      // degrees around the Y axis (0-360)
  elevation: number;  // degrees from equator (-60 to 60)
  color: string;
  size: 'sm' | 'md';
  delay: number;      // animation-delay in seconds
  ignite?: boolean;   // whether this dot has the ignite animation
}

const HEAT_DOTS: HeatDot[] = [
  // Red — hottest regions
  { angle: 35, elevation: 33, color: '#ef4444', size: 'md', delay: 0, ignite: true },      // Middle East
  { angle: 60, elevation: 25, color: '#ef4444', size: 'sm', delay: 0.8 },                  // South Asia
  { angle: 15, elevation: 48, color: '#ef4444', size: 'md', delay: 1.5, ignite: true },    // Eastern Europe
  { angle: 350, elevation: 5, color: '#ef4444', size: 'sm', delay: 2.3 },                  // Central Africa
  { angle: 25, elevation: 10, color: '#ef4444', size: 'sm', delay: 3.1 },                  // East Africa
  // Orange — hot
  { angle: 355, elevation: 45, color: '#f97316', size: 'md', delay: 0.3 },                 // Western Europe
  { angle: 280, elevation: 40, color: '#f97316', size: 'md', delay: 1.0, ignite: true },   // US East Coast
  { angle: 260, elevation: 35, color: '#f97316', size: 'sm', delay: 1.8 },                 // US West Coast
  { angle: 120, elevation: 35, color: '#f97316', size: 'sm', delay: 2.5 },                 // East Asia
  { angle: 130, elevation: 22, color: '#f97316', size: 'md', delay: 3.5 },                 // Southeast Asia
  // Amber — warm
  { angle: 315, elevation: -20, color: '#f59e0b', size: 'sm', delay: 0.5 },                // South America
  { angle: 300, elevation: 20, color: '#f59e0b', size: 'sm', delay: 1.3 },                 // Central America
  { angle: 155, elevation: -30, color: '#f59e0b', size: 'md', delay: 2.0 },                // Australia
  { angle: 5, elevation: -25, color: '#f59e0b', size: 'sm', delay: 2.8, ignite: true },    // Southern Africa
  { angle: 345, elevation: 55, color: '#f59e0b', size: 'sm', delay: 3.3 },                 // Scandinavia
  { angle: 75, elevation: 45, color: '#f59e0b', size: 'sm', delay: 0.7 },                  // Central Asia
];

export default function HeroGlobe() {
  const radius = 160; // translateZ value in px

  return (
    <div className="hero-globe-container" aria-hidden="true">
      {/* Static sphere with grid lines */}
      <div className="hero-globe-sphere">
        {/* Latitude lines */}
        <div className="hero-globe-grid" />
      </div>

      {/* Rotating dot wrapper */}
      <div className="hero-globe-orbit">
        {HEAT_DOTS.map((dot, i) => {
          const rad = (dot.angle * Math.PI) / 180;
          const elRad = (dot.elevation * Math.PI) / 180;
          const x = Math.sin(rad) * Math.cos(elRad) * radius;
          const y = -Math.sin(elRad) * radius;
          const z = Math.cos(rad) * Math.cos(elRad) * radius;

          return (
            <div
              key={i}
              className={`hero-globe-dot ${dot.size === 'md' ? 'hero-globe-dot--md' : ''} ${dot.ignite ? 'hero-globe-dot--ignite' : ''}`}
              style={{
                '--dot-color': dot.color,
                '--dot-delay': `${dot.delay}s`,
                '--dot-ignite-delay': `${dot.delay + 2}s`,
                transform: `translate3d(${x}px, ${y}px, ${z}px)`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the CSS file for HeroGlobe**

Create `src/components/landing/hero-globe.css`:

```css
.hero-globe-container {
  width: 320px;
  height: 320px;
  position: relative;
  perspective: 800px;
}

@media (max-width: 640px) {
  .hero-globe-container {
    width: 224px;
    height: 224px;
  }
}

/* Static sphere background */
.hero-globe-sphere {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #1a2332 0%, #0d1520 50%, #0a0a0f 100%);
  box-shadow:
    inset -20px -20px 60px rgba(26, 54, 93, 0.3),
    0 0 80px rgba(245, 158, 11, 0.05);
  overflow: hidden;
}

/* Latitude/longitude grid lines on the sphere */
.hero-globe-grid {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    repeating-conic-gradient(from 0deg, transparent 0deg, transparent 29deg, rgba(245, 245, 240, 0.03) 29deg, rgba(245, 245, 240, 0.03) 31deg, transparent 31deg, transparent 60deg);
  mask-image: radial-gradient(circle, black 48%, transparent 50%);
  -webkit-mask-image: radial-gradient(circle, black 48%, transparent 50%);
}

.hero-globe-grid::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(245, 245, 240, 0.04);
  box-shadow:
    inset 0 0 0 40px transparent,
    inset 0 0 0 41px rgba(245, 245, 240, 0.03),
    inset 0 0 0 80px transparent,
    inset 0 0 0 81px rgba(245, 245, 240, 0.03),
    inset 0 0 0 120px transparent,
    inset 0 0 0 121px rgba(245, 245, 240, 0.03);
}

/* Rotating orbit wrapper */
.hero-globe-orbit {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  animation: hero-globe-spin 30s linear infinite;
  /* Center the transform origin */
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes hero-globe-spin {
  to { transform: rotateY(360deg); }
}

/* Individual heat dots */
.hero-globe-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dot-color);
  box-shadow: 0 0 6px var(--dot-color);
  animation: hero-globe-pulse 3s ease-in-out infinite;
  animation-delay: var(--dot-delay);
  backface-visibility: hidden;
}

.hero-globe-dot--md {
  width: 12px;
  height: 12px;
  box-shadow: 0 0 10px var(--dot-color);
}

@keyframes hero-globe-pulse {
  0%, 100% { opacity: 0.2; scale: 0.8; }
  50% { opacity: 1; scale: 1.2; }
}

/* Ignite effect — brief flare */
.hero-globe-dot--ignite {
  animation:
    hero-globe-pulse 3s ease-in-out infinite var(--dot-delay),
    hero-globe-ignite 8s ease-in-out infinite var(--dot-ignite-delay);
}

@keyframes hero-globe-ignite {
  0%, 85%, 100% { box-shadow: 0 0 6px var(--dot-color); }
  90% { box-shadow: 0 0 20px var(--dot-color), 0 0 40px var(--dot-color); scale: 1.8; }
  95% { box-shadow: 0 0 10px var(--dot-color); scale: 1.2; }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .hero-globe-orbit {
    animation: none;
  }
  .hero-globe-dot {
    animation: none;
    opacity: 0.8;
  }
  .hero-globe-dot--ignite {
    animation: none;
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/HeroGlobe.tsx src/components/landing/hero-globe.css
git commit -m "feat: add animated CSS globe component with heat dots for landing page hero"
```

---

### Task 4: Create FeatureCard and LandingNavbar Components

**Files:**
- Create: `src/components/landing/FeatureCard.tsx`
- Create: `src/components/landing/LandingNavbar.tsx`

- [ ] **Step 1: Create FeatureCard component**

Create `src/components/landing/FeatureCard.tsx`:

```tsx
import { useState } from 'react';

interface FeatureCardProps {
  title: string;
  description: string;
  imageSrc: string;
}

export default function FeatureCard({ title, description, imageSrc }: FeatureCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="group border border-ivory-200/10 rounded-xl bg-ivory-200/[0.02] overflow-hidden transition-all duration-300 hover:border-amber-500/30 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/5">
      {/* Screenshot area */}
      <div className="aspect-[16/10] overflow-hidden">
        {imgFailed ? (
          <div className="w-full h-full bg-ivory-200/[0.03] flex items-center justify-center">
            <span className="text-ivory-200/20 font-body text-sm">Screenshot coming soon</span>
          </div>
        ) : (
          <img
            src={imageSrc}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
      {/* Text content */}
      <div className="p-6">
        <h3 className="font-display text-xl font-semibold text-ivory-100 mb-2">{title}</h3>
        <p className="font-body text-sm text-ivory-200/50 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create LandingNavbar component**

Create `src/components/landing/LandingNavbar.tsx`:

```tsx
import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';

export default function LandingNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-ivory-200/5">
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

          <Link
            to="/app"
            className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
          >
            Open the map →
          </Link>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/FeatureCard.tsx src/components/landing/LandingNavbar.tsx
git commit -m "feat: add FeatureCard and LandingNavbar components for landing page"
```

---

### Task 5: Build Full Landing Page

**Files:**
- Modify: `src/pages/LandingPage.tsx` (replace placeholder with full implementation)

- [ ] **Step 1: Replace LandingPage with full implementation**

Replace the entire content of `src/pages/LandingPage.tsx` with:

```tsx
import { Link } from 'react-router-dom';
import { Globe, Layers, Cpu, Network, Newspaper, FlaskConical, Quote } from 'lucide-react';
import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroGlobe from '@/components/landing/HeroGlobe';
import FeatureCard from '@/components/landing/FeatureCard';

function GradientLine() {
  return <div className="h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />;
}

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-ivory-100"
      style={{
        backgroundImage: 'radial-gradient(circle, rgba(245,245,240,0.03) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
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
                <Link
                  to="/app"
                  className="bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
                >
                  Open the map →
                </Link>
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
      <section className="py-20 px-6 animate-fade-up">
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
      <section className="py-20 px-6 animate-fade-up">
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
      <section className="py-20 px-6 animate-fade-up">
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
          <Link
            to="/app"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
          >
            Open the map →
          </Link>
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
                  <li><a href="#" className="font-body text-sm text-ivory-200/40 hover:text-amber-400 transition-colors">About</a></li>
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/pages/LandingPage.tsx
git commit -m "feat: build full landing page with hero, features, audience sections, and footer"
```
