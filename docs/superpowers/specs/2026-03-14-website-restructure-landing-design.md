# Workstream 11: Website Restructure & Landing Page

## Goal

Separate the marketing landing page from the tool. Move the app to `/app`, create a professional B2B landing page at `/` targeting journalists and researchers, and update all internal links.

## Architecture

The current single-page app at `/` is renamed to `AppPage.tsx` and served at `/app`. A new `LandingPage.tsx` is created at `/` with a professional marketing layout. The investigate page moves to `/app/investigate`. All internal navigation links are updated. The landing page uses no heavy dependencies (no globe.gl, no Leaflet) — it's a static marketing page with CSS animations.

---

## 1. Routing Changes

### New Route Map

| Route | Component | Purpose |
|---|---|---|
| `/` | `LandingPage.tsx` | Marketing landing page |
| `/app` | `AppPage.tsx` (renamed from `Index.tsx`) | The tool — globe, feed, search, filters |
| `/app/investigate` | `InvestigatePage.tsx` | Story deep-dive (unchanged internally) |
| `/admin` | `Admin.tsx` | Protected admin dashboard (unchanged) |
| `*` | `NotFound.tsx` | 404 fallback (unchanged) |

### File Changes

- Rename `src/pages/Index.tsx` → `src/pages/AppPage.tsx` (no internal changes)
- Create `src/pages/LandingPage.tsx` (new)
- Modify `src/App.tsx` — update route definitions and imports

### Link Updates

These files contain hardcoded links to `/` or `/investigate` that must be updated:

- `src/components/globe/GlobePopup.tsx` — "Investigate this story" link: `/investigate?article=` → `/app/investigate?article=`
- `src/components/NewsDemo.tsx` — "Investigate this story" link: `/investigate?article=` → `/app/investigate?article=`
- `src/pages/InvestigatePage.tsx` — "Back to map" button: `navigate('/')` → `navigate('/app')`

### Navbar Variants

The existing `Navbar` component is used on the app page. The landing page uses a new `LandingNavbar` component (simpler — just logo + "Open the map →" CTA). These are separate components, not a prop-switched variant, to avoid coupling landing page concerns into the app.

---

## 2. Landing Page Structure

All sections live in `src/pages/LandingPage.tsx`. Section components are extracted into `src/components/landing/` when they exceed ~50 lines.

### 2.1 LandingNavbar

Fixed header. HeatStory logo on the left, "Open the map →" button on the right linking to `/app`. Same dark background as the page (`#0a0a0f`). Becomes opaque on scroll via a subtle `backdrop-blur` + `bg-[#0a0a0f]/80`.

Styling: `text-ivory-100` for logo, amber button for CTA (`bg-amber-500 hover:bg-amber-400 text-[#0a0a0f] font-semibold`).

### 2.2 Hero Section

Full viewport height minus navbar. Two-column layout on desktop (text left, globe animation right), stacked on mobile (text top, globe below).

**Left column:**
- Headline: `font-display text-5xl font-bold text-ivory-100 leading-tight` — e.g., *"Monitor global coverage. Spot emerging stories."*
- Subheadline: `font-body text-lg text-ivory-200/60 mt-4` — e.g., *"Real-time news intelligence for journalists and researchers. See who covers what, from where, and how."*
- Primary CTA: "Open the map →" button, same amber style as navbar CTA, larger (`px-8 py-3 text-lg`)
- Live pulse indicator: small pulsing amber dot + `text-xs text-ivory-200/40` "Live — monitoring now"

**Right column:**
- Animated CSS globe (see Section 3)

### 2.3 Metrics Bar

Horizontal strip with 3-4 stat cards. Dark background with subtle border top/bottom (`border-ivory-200/5`).

Stats (factual, from the actual product):
- "40+ countries" — with a Globe icon
- "4 coverage scales" — with a Layers icon
- "Real-time NLP" — with a Cpu icon
- "Multi-source clustering" — with a Network icon

Each stat: icon + number/label, `text-ivory-200/60`, centered. On mobile: 2x2 grid.

### 2.4 Feature Cards

3 cards in a row (stacked on mobile). Each card:
- Subtle border (`border-ivory-200/10`), rounded corners, dark background slightly lighter than page (`bg-ivory-200/[0.02]`)
- Product screenshot image at the top (from `/public/screenshots/`)
- Feature title: `font-display text-xl font-semibold text-ivory-100`
- Feature description: `font-body text-sm text-ivory-200/50`
- Hover state: border glows amber (`border-amber-500/30`), card lifts slightly (`-translate-y-1`), subtle shadow

**Card 1 — Coverage Mapping:**
Title: "See the full geographic picture"
Description: "Every story mapped by origin. Spot which outlets cover it, from where, and which regions are silent."
Screenshot: Globe with markers and heat colors

**Card 2 — Credibility Tiers:**
Title: "Sources ranked by editorial standards"
Description: "Articles grouped by credibility tier — major wire services, national outlets, regional media — not by popularity or engagement."
Screenshot: Investigate page tier grouping

**Card 3 — Editorial Comparison:**
Title: "Surface unique angles across sources"
Description: "NLP-powered perspective analysis reveals which outlets emphasize different aspects of the same story."
Screenshot: Investigate page perspective comparison section

### 2.5 How It Works

3-step horizontal layout (stacked on mobile). Each step has a step number (large, amber, `text-4xl font-bold text-amber-500/20`), a title, and a description.

- **Step 1: Aggregate** — "We collect news from verified sources across 40+ countries in real time."
- **Step 2: Analyze** — "NLP clusters related stories, detects coverage gaps, and compares editorial framing."
- **Step 3: Investigate** — "You see the full picture — who covers what, from where, and how each source frames it."

### 2.6 Who It's For

Two cards side by side (stacked on mobile). Larger than feature cards — these are audience identity cards.

**Newsrooms:**
- Icon: Newspaper (lucide)
- Title: "For newsrooms"
- Description: "Monitor coverage of your beats across borders. Spot stories competitors are missing. Understand how your coverage compares to wire services and international outlets."

**Researchers:**
- Icon: FlaskConical (lucide)
- Title: "For researchers"
- Description: "Analyze media coverage patterns at scale. Track geographic gaps, editorial framing differences, and source credibility across regions and languages."

### 2.7 Testimonial Placeholder

A styled section with the visual structure for testimonials but with a forward-looking message instead.

Centered layout. Subtle quote marks icon (`text-amber-500/10 text-8xl`). Text: *"Early access is open. Be among the first newsrooms and research teams to use HeatStory."* Below: a CTA button "Request early access →" linking to `mailto:` or a contact form (initially mailto).

### 2.8 CTA Repeat

Simple centered section. Headline: *"Ready to see the full picture?"* CTA button: "Open the map →" linking to `/app`. Same amber button style.

### 2.9 Footer

Dark background, subtle top border. Three columns on desktop:

- **Column 1:** HeatStory logo + one-liner tagline
- **Column 2:** Links — About (placeholder `#`), Contact (`mailto:`), GitHub (repo link)
- **Column 3:** "Built with" — small text crediting the tech stack or a subtle "Made in [location]"

Copyright line at bottom: `© 2026 HeatStory`

---

## 3. Animated CSS Globe

A lightweight hero visual — no JavaScript dependencies. Lives in `src/components/landing/HeroGlobe.tsx`.

### Structure

- A dark circle (`w-80 h-80` on desktop, `w-56 h-56` on mobile) with a radial gradient giving it a 3D sphere appearance
- Background: radial gradient from `#1a2332` (center-left highlight) to `#0a0a0f` (edges), with a subtle blue-tinted edge glow (`box-shadow: inset -20px -20px 60px rgba(26,54,93,0.3)`)
- Continent hints: a faint SVG overlay of simplified continent outlines (not detailed — just recognizable shapes), `opacity: 0.08`, stroke only, no fill
- The globe container rotates via `@keyframes spin { to { transform: rotateY(360deg) } }` with `animation: spin 30s linear infinite` for a slow, elegant rotation

### Heat Dots

15-20 small circles (`w-2 h-2` to `w-3 h-3`) positioned at approximate real-world hotspot locations using `absolute` positioning within the globe container.

**Colors from the existing heat palette:**
- 5-6 dots: `#ef4444` (red — hottest)
- 5-6 dots: `#f97316` (orange — hot)
- 5-6 dots: `#f59e0b` (amber — warm)

**Animation per dot:**
- `@keyframes pulse { 0%, 100% { opacity: 0.2; transform: scale(0.8) } 50% { opacity: 1; transform: scale(1.2) } }`
- Each dot has a different `animation-delay` (staggered by 0.5-2s) so they don't pulse in unison
- A few dots (3-4) have an additional "ignite" keyframe: a brief scale-up to 1.8 + amber `box-shadow` glow, then settle back. These fire every 6-8s with different delays, simulating stories breaking.

**3D rotation effect:** Dots are positioned using `transform: rotateY(var(--angle)) translateZ(160px)` within a `perspective(800px)` container. As the container rotates, dots naturally move to the back (becoming smaller/faded via `backface-visibility` and z-index) and return to the front. This gives the illusion of a 3D globe with pure CSS.

### Reduced Motion

When `prefers-reduced-motion: reduce` is active: no rotation, no pulse. Dots shown static at full opacity. Globe is a still image.

---

## 4. Visual Enhancements

### Dot Grid Background

A faint repeating dot pattern across the entire page background. Implemented as a CSS `background-image` on the page container:
```css
background-image: radial-gradient(circle, rgba(245,245,240,0.03) 1px, transparent 1px);
background-size: 24px 24px;
```
Applied to the `LandingPage` root div alongside the `bg-[#0a0a0f]` base color.

### Gradient Accent Lines

Between major sections, a thin (`h-px`) horizontal line with a gradient: `bg-gradient-to-r from-transparent via-amber-500/20 to-transparent`. Placed between Hero/Metrics, Features/HowItWorks, and WhoItsFor/Testimonial.

### Scroll Animations

Sections fade up on scroll using the existing `animate-fade-up` class. Applied to each section wrapper with staggered delays for children where appropriate (e.g., feature cards appear one by one).

---

## 5. Product Screenshots

Three static images needed in `/public/screenshots/`:

- `globe-overview.png` — Globe with markers, heat colors, and a popup visible
- `investigate-tiers.png` — Investigate page showing tier-grouped sources with location names
- `investigate-perspective.png` — Investigate page showing perspective comparison section

These are manually captured from the running app. The spec does not generate them — they must be taken from the live product and placed in the directory before the landing page references them. The feature cards use placeholder images (solid dark rectangles with a subtle "Screenshot" label) until real screenshots are added.

---

## 6. Files Affected

**New files:**
- `src/pages/LandingPage.tsx` — landing page with all sections
- `src/components/landing/LandingNavbar.tsx` — landing-specific navbar
- `src/components/landing/HeroGlobe.tsx` — animated CSS globe
- `src/components/landing/FeatureCard.tsx` — reusable feature card with hover glow (used 3 times)

**Renamed files:**
- `src/pages/Index.tsx` → `src/pages/AppPage.tsx` (no internal changes)

**Modified files:**
- `src/App.tsx` — updated routes and imports
- `src/components/globe/GlobePopup.tsx` — investigate link: `/investigate` → `/app/investigate`
- `src/components/NewsDemo.tsx` — investigate link: `/investigate` → `/app/investigate`
- `src/pages/InvestigatePage.tsx` — back button: `/` → `/app`

**Unchanged:**
- `src/components/Navbar.tsx` — stays as the app navbar, used only on `/app`
- `src/pages/Admin.tsx` — no changes
- All utility files, globe components, etc. — no changes

---

## 7. Non-Goals

- No authentication or gating on the landing page (WS11c)
- No pricing section (WS11d)
- No changes to the app page (AppPage.tsx) beyond the rename (deferred to app improvements workstream)
- No backend or API changes
- No real testimonials (placeholder only)
- No contact form (mailto link initially)
- No blog or content pages
- No SEO changes beyond basic meta tags on the landing page
