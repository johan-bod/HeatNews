# Workstream 1A: Brand Consolidation & Messaging Rewrite

## Goal

Unify the brand as "HeatStory" across all touchpoints, rewrite hero messaging to communicate the local journalism mission, and add SEO meta tags. Transform the product's first impression from "cool demo" to "useful tool with clear purpose."

## Architecture

Text-only changes: HTML meta tags, React component copy, package.json name. No API, data, or logic changes. No new components.

---

## 1. Brand Consolidation

Rename all references from "HeatNews" / "heatnews" to "HeatStory" / "heatstory".

### Files to change

**`package.json`** (line 2):
- `"name": "heatnews"` → `"name": "heatstory"`
- After renaming, run `npm install` to regenerate `package-lock.json` with the new name

**`README.md`**:
- Update project title from "Global News Horizon View" to "HeatStory"
- Rewrite the opening paragraph to match the new messaging (see Section 4)

**Documentation files** — update references where "HeatNews" appears:
- `docs/superpowers/specs/2026-03-13-value-prop-audit.md` — leave as-is, it's a historical document
- `docs/superpowers/specs/2026-03-13-globe-rework-design.md` — update "HeatNews" → "HeatStory"
- `docs/superpowers/specs/2026-03-13-media-credibility-design.md` — no brand references, skip

**Note:** UI components (Navbar, Footer, OnboardingModal) and localStorage keys already use "HeatStory"/"heatstory". No changes needed there.

## 2. Hero Messaging Rewrite

### Current (to replace)

```
Tagline: "News, Mapped. Everywhere."
Subheading: "See what the world is talking about. Heat shows where coverage is hottest."
CTA: "Explore the globe"
```

### New

```
Tagline: "Map coverage. Spot patterns. Surface stories."
Subheading: "HeatStory shows you which stories get the most coverage, which regions are underreported, and which local stories are bubbling up before they go national."
CTA: "See today's coverage map"
```

### File: `src/components/Hero.tsx`

**Line 31 (h1 tagline):**
```tsx
<h1 className="font-display text-3xl md:text-5xl font-bold text-ivory-50 mb-3 animate-fade-up" style={{ animationDelay: '0.1s' }}>
  Map coverage. Spot patterns. <span className="text-amber-500">Surface stories.</span>
</h1>
```

**Line 33-34 (subheading):**
```tsx
<p className="font-body text-sm md:text-base text-ivory-200/50 max-w-lg mx-auto mb-6 animate-fade-up" style={{ animationDelay: '0.2s' }}>
  HeatStory shows you which stories get the most coverage, which regions are underreported, and which local stories are bubbling up before they go national.
</p>
```

**Line 44 (CTA text):**
```tsx
See today's coverage map
```

## 3. SEO Meta Tags

### File: `index.html`

**Title (line 6):**
```html
<title>HeatStory — Real-time news coverage map and analysis tool</title>
```

**Meta description (line 7):**
```html
<meta name="description" content="Map global news coverage in real-time. See which stories are trending, spot geographic patterns, and surface underreported local stories before they go national." />
```

**OG title (line 9):**
```html
<meta property="og:title" content="HeatStory — Map coverage. Spot patterns. Surface stories." />
```

**OG description (line 10):**
```html
<meta property="og:description" content="Map global news coverage in real-time. See which stories are trending, spot geographic patterns, and surface underreported local stories before they go national." />
```

**Preserve existing `og:type` tag** (line 11):
```html
<meta property="og:type" content="website" />
```

**Add new OG/Twitter tags** (after `og:type`, for social sharing — critical for video marketing):
```html
<meta property="og:image" content="/og-image.png" />
<meta property="og:url" content="https://heatstory.app" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="HeatStory — Map coverage. Spot patterns. Surface stories." />
<meta name="twitter:description" content="Map global news coverage in real-time. See which stories are trending, spot geographic patterns, and surface underreported local stories before they go national." />
```

**Note:** The `og:image` and `og:url` values are placeholders. The OG image (`/og-image.png`) should be a 1200x630px screenshot of the globe with markers — to be created separately. The URL should be updated when the domain is finalized.

## 4. README Rewrite

### Current opening (title + paragraph):
> # Global News Horizon View
>
> A real-time news mapping application that visualizes news articles from around the world on an interactive map. The goal? Helping local news to thrive and users to read based on geolocation or topics of interest. In short, giving both journalists and readers their power.

### New opening:
> **HeatStory** maps global news coverage in real-time. See which stories get the most attention, which regions are underreported, and which local stories are bubbling up before they go national.
>
> Local journalism is dying — but local stories still matter. HeatStory surfaces coverage patterns that traditional news feeds bury, giving editors and informed readers the tools to connect the dots across newsrooms and geographies.

## 5. Files Affected

| File | Change |
|------|--------|
| `package.json` | name: "heatnews" → "heatstory" |
| `package-lock.json` | Regenerated via `npm install` after package.json rename |
| `index.html` | Title, meta description, OG tags, Twitter card tags |
| `src/components/Hero.tsx` | Tagline, subheading, CTA text |
| `README.md` | Opening paragraph rewrite |
| `docs/superpowers/specs/2026-03-13-globe-rework-design.md` | "HeatNews" → "HeatStory" |

## 6. Not Changed

- Navbar — already says "HeatStory"
- Footer — already says "HeatStory"
- OnboardingModal — already says "HeatStory"
- localStorage keys — already use "heatstory_" prefix
- Value prop audit doc — historical document, keep as-is
- No logic, API, or component structure changes
