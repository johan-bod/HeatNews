# HeatStory Personalization & Globe Redesign

## Overview

Transform HeatStory from a flat news feed with a 2D map into a globe-centric personalized news platform where "heat" represents multi-source media coverage intensity.

## User Journey

### Anonymous visitor
1. Lands on page: short hero tagline + full-width demo globe (dark background, editorial style)
2. Demo globe shows shared pool data (broad news across all scales), updated once/day
3. Can spin, zoom, click heat markers, read article popups
4. Attempts to search, filter by topic, or click "Personalize" → sign-up prompt
5. Signs in with Google (Firebase Auth)

### Free user (signed in)
1. Onboarding: pick topics (from taxonomy) + locations (countries/regions/cities)
2. First personalized fetch happens immediately (1 of 2 daily fetches)
3. Globe auto-focuses on their preference areas
4. Compact article feed below globe shows personalized results merged with shared pool
5. 2 personalized refreshes per day. After that → soft gate

### Soft gate (paywall placeholder)
- Message: "You've used your daily refreshes. Join the waitlist for unlimited access."
- Email capture (pre-filled from Google account)
- Intention checklist (not freeform): "More refreshes per day", "Custom alerts", "Team/organization use", "API access", "Other"
- Tone: "We're building something new. Help us grow."
- Stored in Firebase (or localStorage fallback)

## The Globe

### Technology
- **Globe.gl** (Three.js-based) for 3D data visualization
- Free CartoDB/OSM tiles for street-level detail on deep zoom

### Visual style
- Dark navy/black background (space feel)
- Subtle dark grey landmasses with thin border outlines
- Heat markers: glowing amber/orange/red dots sized by coverage intensity
- Zoomed in: markers spread into individual article pins

### Navigation
- Auto-rotates slowly when idle
- **3-5 second idle timer** before auto-rotation resumes after user interaction
- Scroll/pinch to zoom, click-drag to spin
- Click heat marker → popup with article title, source, media reach badge, topic tags, link
- Signed-in users: globe auto-focuses on preference areas on load

### Scale behavior (zoom = scale)
- Zoomed out (whole globe) → international heat
- Continent level → national stories appear
- Country level → regional stories appear
- City level → local/hyperlocal stories appear

Replaces: current Leaflet map, scale cards section.

## Media Coverage Database

### Outlet structure
```typescript
interface MediaOutlet {
  name: string;           // "Ouest-France"
  country: string;        // "fr"
  domain: string;         // "ouest-france.fr" (matches NewsData.io source_id)
  type: 'local' | 'regional' | 'national' | 'international';
  reach: GeoReach[];      // coordinates of coverage footprint
  audienceScale: 'small' | 'medium' | 'large';
  primaryTopics: string[]; // default topics this outlet covers
}

interface GeoReach {
  name: string;   // "Rennes"
  lat: number;    // 48.11
  lng: number;    // -1.68
}
```

### Initial scope (~80-100 outlets)
- **France deep (~40):** Le Monde, Le Figaro, Le Parisien, Libération, Ouest-France, Sud Ouest, La Voix du Nord, Nice-Matin, DNA, La Dépêche, Le Télégramme, Les Échos, La Croix, Le Point, L'Express, Marianne, L'Équipe, France 24, RFI, BFM, LCI, etc.
- **European key (~25):** BBC, The Guardian, Der Spiegel, El País, La Repubblica, NOS, RTÉ, SVT, NRK, etc.
- **Global key (~15):** Reuters, AP, NYT, Washington Post, Al Jazeera, CNN, etc.

### Globe precision
- Each outlet's `reach` array contains actual coordinates for their coverage area
- Article from Ouest-France mentioning "Nantes" → pins precisely to Nantes coordinates
- General article with no specific city → distributes as lighter markers across outlet's reach footprint

## Topic Indexation System

### Zero-cost, client-side approach

**Layer 1 - Keyword dictionary matching:**
- Static dictionaries mapping ~500 keywords → topics per language
- Scan article title + description, count hits per topic
- Article gets all topics above threshold

**Layer 2 - Source bias:**
- Media outlet's `primaryTopics` boost matching topic scores
- L'Équipe + "Paris" → sports boosted over politics

**Layer 3 - API category:**
- NewsData.io returns `category` per article
- Mapped to our taxonomy as a third signal

**Scoring formula:**
```
topicScore = (keywordHits * 2) + (sourceTopicMatch * 1.5) + (apiCategoryMatch * 1)
```
Top-scoring topic = primary. All above threshold = secondary tags.

### Topic taxonomy (~25 topics)
politics, economy, technology, climate, sports, health, education, culture, crime, energy, transport, housing, agriculture, defense, immigration, science, entertainment, finance, labor, environment, diplomacy, religion, social, media, legal

### Language support (progressive dictionaries)
```
keywords/fr.ts      → ~500 keywords (deep, core market)
keywords/en.ts      → ~500 keywords (deep, global coverage)
keywords/de.ts      → ~100 keywords (starter)
keywords/es.ts      → ~100 keywords (starter)
keywords/it.ts      → ~100 keywords (starter)
keywords/common.ts  → ~200 universal terms (brands, acronyms, names)
```
- Dictionary selected by article's language field from API
- Unknown language → falls back to common.ts + API category + source bias

## API Budget Strategy

### Shared pool (serves everyone)
- ~40 requests/day for broad coverage across all 4 scales
- Updated once/day (or twice if budget allows)
- This data populates the demo globe AND is the base layer for signed-in users

### Personalized fetches (signed-in users)
- 2 free fetches per user per day
- Each fetch uses 1-3 API requests depending on preference complexity
- Results merge with shared pool on the globe

### Budget math
- 200 requests/day total
- ~40 for shared pool
- ~160 remaining for users
- At ~2 requests per personalized fetch → supports ~80 personalized fetches/day → ~40 free users/day
- Scales with paid tier (higher API plan) later

## Expanded Geocoding Database

Current: ~110 locations. Target: ~500+ locations.

### Expansion areas
- **France:** all 96 département capitals, major suburbs, key towns
- **Europe:** top 5-10 cities per country for DE, ES, IT, UK, NL, BE, CH, PT, AT, PL, SE, NO, DK, IE, GR
- **Global:** top 20 cities per major country (US, CA, BR, AU, JP, CN, IN, KR, etc.)
- **French regions:** all 13 metropolitan regions + 5 overseas

## Page Structure

### Landing page (anonymous)
1. Navbar: HeatStory brand + "Sign in" button
2. Short hero: tagline + CTA arrow pointing to globe
3. **Demo globe:** full-width, dark background, shared pool data, auto-rotating with idle timer. Interactive; search/personalize triggers sign-up.
4. Feature highlights: 3 short points ("Global coverage", "Media heat mapping", "Personalized feed")
5. Footer

### Signed-in experience
1. Navbar: user avatar + preferences gear icon
2. **Personalized globe:** full-width, auto-focused on preference areas
3. **Compact feed:** below globe. Tight article list sorted by heat. Shows: title, source badge (with reach indicator), topic tags, time ago. Click opens article. Inline topic filter.
4. **Refresh indicator:** "2/2 refreshes remaining" or soft gate message
5. Footer

### Removed from current design
- Full-height hero → replaced by short hero + globe
- Scale cards → globe handles scale via zoom
- Search bar + advanced filters → integrated into globe controls
- Leaflet 2D map → replaced by globe
- Current news feed layout → replaced by compact feed

### Retained
- Navbar (restyled)
- Footer (restyled)
- API key warning (dev mode only)

## Implementation Order

Each piece is an independent sub-project with its own plan → implementation cycle:

1. **Media database + expanded geocoding** - data foundation, static TypeScript files
2. **Topic indexation system** - keyword dictionaries + scoring engine
3. **3D Globe** - Globe.gl integration replacing Leaflet, dark editorial style
4. **User preferences + onboarding** - Firebase Auth flow, preference picker, localStorage storage
5. **API budget management + soft gate** - fetch limiting, shared pool strategy, waitlist UI

## Technical Constraints
- NewsData.io free tier: 200 requests/day, 10 results per request
- No backend server: localStorage + Firebase Auth only
- Current stack: React 19, TypeScript, Vite 7, Tailwind CSS 3, shadcn/ui
- Globe.gl to be added as new dependency
