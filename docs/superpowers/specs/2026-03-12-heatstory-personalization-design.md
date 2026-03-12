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
- Stored in Firestore (see Firebase Services section)

## Firebase Services (in scope)

Firebase is used as a lightweight backend-as-a-service. No custom backend server.

- **Firebase Auth** - Google sign-in only
- **Cloud Firestore** - stores user preferences and waitlist signups (syncs across devices)
  - `users/{uid}/preferences` - topics, locations, onboarding complete flag
  - `users/{uid}/usage` - daily fetch count, last fetch date
  - `waitlist/{uid}` - email, intentions checklist, timestamp
- **Why Firestore:** user preferences must sync across devices. localStorage is used as a read cache (Firestore is the source of truth). If Firestore is unavailable, app degrades to localStorage-only (preferences are device-local, no waitlist capture).

## Heat Calculation

"Heat" measures how much media attention a story or location receives.

### Story clustering
Articles are grouped into story clusters using client-side fuzzy matching:
1. Normalize titles: lowercase, strip punctuation, remove stopwords
2. Extract significant terms (3+ character words)
3. Compare each new article against existing clusters using Jaccard similarity on term sets
4. **Threshold: 0.25** - articles with ≥25% term overlap join the same cluster
5. Unmatched articles start a new single-article cluster

### Heat score per cluster
```
heatScore = min(100, (uniqueSources * 20) + (articleCount * 5) + recencyBonus)
```
- `uniqueSources`: number of distinct media outlets covering the story (most important signal)
- `articleCount`: total articles in the cluster
- `recencyBonus`: +10 if any article is <2 hours old, +5 if <6 hours

### Heat score per location
A location's heat is the maximum heat score of any cluster pinned to that location. Multiple clusters at the same location → the hottest one determines marker size/color.

### Visual mapping
- 0-20: small grey dot (cold)
- 21-40: small amber dot (warming)
- 41-60: medium orange dot (warm)
- 61-80: large orange-red dot (hot)
- 81-100: large red glowing dot with pulse animation (very hot)

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

### Zoom-level thresholds
- **Altitude > 8000km** (whole globe): show only international-scale clusters. Nearby markers merge into aggregate heat blobs.
- **3000-8000km** (continent): national-scale clusters appear. Aggregate blobs split into country-level markers.
- **800-3000km** (country): regional clusters appear. Individual article pins start showing.
- **< 800km** (city): all local/hyperlocal pins visible. Map tiles load for geographic detail.
- Transition between levels is animated (markers fade in/out over 300ms).
- Max visible markers at any zoom level: 200. Beyond that, lowest-heat markers are hidden.

### Multi-region auto-focus (signed-in users)
If a user has selected multiple distant regions (e.g., France + Japan + Brazil):
- Globe auto-focuses on their **primary preference** (first location in their list)
- Quick-jump buttons appear for other preference regions (small floating pills: "Japan", "Brazil")
- Clicking a pill animates the globe to that region

### Mobile performance
- On screens < 768px: reduce max visible markers to 100, disable auto-rotation, use lower-resolution tiles
- If WebGL is unavailable: fall back to a flat Leaflet map with the same data (graceful degradation)

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

## Location Extraction from Articles

Articles are geolocated using the existing approach (expanded):

1. **Check article tags/keywords** (from API) against the geocoding database (longest match first)
2. **Check article title + description** against the geocoding database via string matching
3. **Match media outlet's `reach`** as fallback: if no location found in text, use the outlet's primary coverage area
4. **Ambiguity handling:** locations are matched against the geocoding database which includes country context. "Paris" matches "paris" → France coordinates. There is no "Paris, Texas" in the database. If ambiguity arises in future expansion, prefer the location in the article's source country.

The geocoding database is the single source of truth for coordinates. If a location name isn't in the database, it cannot be pinned. This keeps the system simple and predictable.

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
- Top-scoring topic = primary. All topics scoring ≥ 3.0 = secondary tags.
- Threshold of 3.0 chosen so that a single keyword hit alone (score 2.0) isn't enough — needs at least one confirming signal.
- Threshold should be tuned during development by spot-checking ~50 articles for accuracy.

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
~40 requests/day, refreshed once daily (early morning UTC). Specific query distribution:

| Scale | Requests | Query strategy |
|-------|----------|---------------|
| Local (France) | 8 | 2 queries × 4 French city groups (Paris/Lyon/Marseille, Toulouse/Nice/Bordeaux, Lille/Strasbourg/Nantes, Rennes/Montpellier/Grenoble) |
| Regional (France) | 6 | 2 queries × 3 region groups (Bretagne/Normandie/PdlL, Provence/Occitanie/ARA, IDF/HdF/GrandEst) |
| National (Europe) | 12 | 2 queries × 6 country groups (FR+DE, GB+IE, ES+PT, IT+CH, NL+BE, PL+SE+NO+DK) |
| International | 14 | 2 queries × 7 region groups (US+CA, LatAm, Middle East, East Asia, South Asia, Africa, Oceania) |
| **Total** | **40** | **400 articles** |

Each query fetches 10 articles. "2 queries" per group means one for top/general news and one for a rotating category (politics one day, tech the next).

### Personalized fetches (signed-in users)
- 2 free fetches per user per day
- Fetch request count per personalized refresh:
  - 1-2 topics + 1 location = 1 API request
  - 3+ topics OR 2+ locations = 2 API requests
  - 3+ topics AND 2+ locations = 3 API requests (maximum)
- Results merge with shared pool on the globe

### Budget math
- 200 requests/day total
- ~40 for shared pool
- ~160 remaining for users
- At ~2 requests per personalized fetch → supports ~80 personalized fetches/day → ~40 free users/day

### Degradation strategy (budget exhausted)
- When < 20 API requests remain for the day: disable personalized fetches, show message "Daily limit reached. Your personalized feed will refresh tomorrow."
- Users still see the shared pool data (globe remains functional)
- Remaining requests are reserved for emergency shared pool refresh if needed

### MVP acknowledgment
400 shared pool articles/day is thin for a "global news platform." This is an MVP constraint. Goal: 5+ articles per major region per day. Scaling path: upgrade to NewsData.io paid tier ($99/mo for 30k requests = 300k articles/day).

## Expanded Geocoding Database

Current: ~110 locations. Target: ~500+ locations.

### Expansion areas
- **France:** all 96 département capitals, major suburbs, key towns
- **Europe:** top 5-10 cities per country for DE, ES, IT, UK, NL, BE, CH, PT, AT, PL, SE, NO, DK, IE, GR
- **Global:** top 20 cities per major country (US, CA, BR, AU, JP, CN, IN, KR, etc.)
- **French regions:** all 13 metropolitan regions + 5 overseas

## Data Storage & Expiration

### localStorage budget
- **Max 3MB** allocated for HeatStory data (well within the ~5-10MB browser limit)
- Breakdown: ~2MB for article cache, ~500KB for preferences cache, ~500KB for metadata

### Expiration policy
- Shared pool articles: **24-hour TTL** (replaced on next daily refresh)
- Personalized fetch results: **24-hour TTL**
- On each app load: purge any data older than 48 hours
- If localStorage is full: delete oldest data first (LRU eviction), log warning to console

### Firestore as source of truth
- User preferences: written to Firestore on save, cached in localStorage
- On app load: read localStorage cache immediately (fast), then sync from Firestore in background (authoritative)
- If Firestore is unavailable: localStorage cache serves the app. Changes queue locally and sync when Firestore reconnects.

## Error Handling

| Scenario | Behavior |
|----------|----------|
| API is down | Show shared pool from localStorage cache. Banner: "News data temporarily unavailable. Showing cached articles." |
| Daily API budget exhausted | Disable personalized fetches. Show cached data. Message: "Daily limit reached." |
| localStorage full | LRU eviction of oldest articles. If still full, clear all article caches and re-fetch shared pool. |
| Firebase Auth fails | Show error toast. User stays anonymous, can still use demo globe. |
| Firestore unavailable | Degrade to localStorage-only. Preferences don't sync across devices until reconnection. |
| Personalized fetch returns 0 results | Show message: "No articles found for these preferences. Try broadening your topics or locations." Keep shared pool visible. |
| WebGL unavailable (old browser/device) | Fall back to flat Leaflet map with same data. |

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
3. **Compact feed:** below globe, max-width container
   - Sorted by heat score (highest first)
   - Shows 20 articles initially, "Load more" button for next 20
   - Each row: title, source badge (with reach indicator icon), topic tags as small pills, time ago
   - Click opens article in new tab
   - **Inline topic filter:** horizontal row of topic pills at top of feed. Click to toggle. Multiple active = OR filter. "All" pill to reset.
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
4. **User preferences + onboarding** - Firebase Auth flow, Firestore storage, preference picker
5. **API budget management + soft gate** - fetch limiting, shared pool strategy, waitlist UI

## Technical Constraints
- NewsData.io free tier: 200 requests/day, 10 results per request
- Firebase: Auth (Google sign-in) + Cloud Firestore (user data)
- Current stack: React 19, TypeScript, Vite 7, Tailwind CSS 3, shadcn/ui
- Globe.gl to be added as new dependency
- Target: ~500+ geocoding locations, ~80-100 media outlets, ~25 topic categories
