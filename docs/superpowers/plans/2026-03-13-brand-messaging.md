# Workstream 1A: Brand Consolidation & Messaging Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify brand as "HeatStory", rewrite hero messaging for local journalism mission, add SEO meta tags.

**Architecture:** Text-only changes across 5 files. No logic, API, or component structure changes.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vite 7

**Spec:** `docs/superpowers/specs/2026-03-13-brand-messaging-design.md`

---

## Task 1: Rename package.json and regenerate lock file

**Files:**
- Modify: `package.json:2`

- [ ] **Step 1: Rename package**

In `package.json` line 2, change:
```json
"name": "heatnews",
```
to:
```json
"name": "heatstory",
```

- [ ] **Step 2: Regenerate lock file**

Run: `npm install`

This regenerates `package-lock.json` with the new package name.

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with no errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: rename package from heatnews to heatstory"
```

---

## Task 2: Rewrite Hero messaging

**Files:**
- Modify: `src/components/Hero.tsx:30-44`

- [ ] **Step 1: Replace tagline (line 31)**

On line 31, change the inner text (8-space indent):
```tsx
          News, Mapped. <span className="text-amber-500">Everywhere.</span>
```
to:
```tsx
          Map coverage. Spot patterns. <span className="text-amber-500">Surface stories.</span>
```

- [ ] **Step 2: Replace subheading (line 34)**

On line 34, change the inner text (8-space indent):
```tsx
          See what the world is talking about. Heat shows where coverage is hottest.
```
to:
```tsx
          HeatStory shows you which stories get the most coverage, which regions are underreported, and which local stories are bubbling up before they go national.
```

- [ ] **Step 3: Replace CTA text (line 44)**

Change:
```tsx
          Explore the globe
```
to:
```tsx
          See today's coverage map
```

- [ ] **Step 4: Update aria-label (line 40)**

Change:
```tsx
          aria-label="Scroll to globe"
```
to:
```tsx
          aria-label="See today's coverage map"
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/Hero.tsx
git commit -m "copy: rewrite hero tagline, subheading, and CTA for local journalism mission"
```

---

## Task 3: Update SEO meta tags in index.html

**Files:**
- Modify: `index.html:6-11`

- [ ] **Step 1: Replace title (line 6)**

Change:
```html
<title>HeatStory - News, Mapped Everywhere</title>
```
to:
```html
<title>HeatStory — Real-time news coverage map and analysis tool</title>
```

- [ ] **Step 2: Replace meta description (line 7)**

Change:
```html
<meta name="description" content="Real-time news mapping with geographic heat visualization" />
```
to:
```html
<meta name="description" content="Map global news coverage in real-time. See which stories are trending, spot geographic patterns, and surface underreported local stories before they go national." />
```

- [ ] **Step 3: Replace OG title (line 9)**

Change:
```html
<meta property="og:title" content="HeatStory" />
```
to:
```html
<meta property="og:title" content="HeatStory — Map coverage. Spot patterns. Surface stories." />
```

- [ ] **Step 4: Replace OG description (line 10)**

Change:
```html
<meta property="og:description" content="Real-time news mapping with geographic heat visualization" />
```
to:
```html
<meta property="og:description" content="Map global news coverage in real-time. See which stories are trending, spot geographic patterns, and surface underreported local stories before they go national." />
```

- [ ] **Step 5: Add OG image, URL, and Twitter card tags (after line 11)**

After the existing `<meta property="og:type" content="website" />` line, add:
```html
    <meta property="og:image" content="/og-image.png" />
    <meta property="og:url" content="https://heatstory.app" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="HeatStory — Map coverage. Spot patterns. Surface stories." />
    <meta name="twitter:description" content="Map global news coverage in real-time. See which stories are trending, spot geographic patterns, and surface underreported local stories before they go national." />
```

**Important:** Do NOT remove the existing `og:type` tag on line 11.

**Note:** The `og:image` (`/og-image.png`) and `og:url` (`https://heatstory.app`) values are placeholders. The OG image should be a 1200x630px screenshot — to be created separately. The URL should be updated when the domain is finalized.

- [ ] **Step 6: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add index.html
git commit -m "seo: update title, meta description, OG tags, add Twitter card tags"
```

---

## Task 4: Rewrite README and update docs

**Files:**
- Modify: `README.md:1-5`
- Modify: `docs/superpowers/specs/2026-03-13-globe-rework-design.md:5`

- [ ] **Step 1: Replace README title (line 1)**

Change:
```markdown
# Global News Horizon View
```
to:
```markdown
# HeatStory
```

- [ ] **Step 2: Replace README opening paragraph (lines 3-5)**

Replace the two-paragraph opening (lines 3-5, note: lines may have trailing spaces). Change the content to:
```markdown
**HeatStory** maps global news coverage in real-time. See which stories get the most attention, which regions are underreported, and which local stories are bubbling up before they go national.

Local journalism is dying — but local stories still matter. HeatStory surfaces coverage patterns that traditional news feeds bury, giving editors and informed readers the tools to connect the dots across newsrooms and geographies.
```

- [ ] **Step 3: Update globe rework design doc (line 5)**

In `docs/superpowers/specs/2026-03-13-globe-rework-design.md` line 5, change `HeatNews` → `HeatStory` in:
```
Rework the HeatNews globe interaction model, add territory halos for geographic coverage visualization, fix scroll hijacking, and relocate search above the globe with filter+fly behavior.
```
Only replace the word `HeatNews` with `HeatStory` — do not change the rest of the line.

- [ ] **Step 4: Commit**

```bash
git add README.md docs/superpowers/specs/2026-03-13-globe-rework-design.md
git commit -m "docs: rebrand to HeatStory in README and design docs"
```
