# Workstream 9: Investigate Page Improvements

## Goal

Enhance the /investigate page with three improvements: human-readable location names on source cards, meaningful geographic spread display, and client-side editorial perspective comparison using NLP entity extraction.

## Architecture

Two changes are pure UI (location names, geographic spread) using data already available on `NewsArticle` (`location`, `country`). The perspective comparison adds a new utility function `analyzeEditorialPerspective()` that uses `compromise` (already a dependency) to extract entities from article titles and descriptions, then compares across sources to surface unique angles and emphasis differences.

---

## 1. Location Names on Source Cards

### Current Behavior

Each source card in the tier-grouped list shows a bare `MapPin` icon when the article has coordinates (lines 169-171 of InvestigatePage.tsx). No location text.

### New Behavior

Replace the MapPin icon with a location string: `"{location}, {countryName}"`.

- When `article.location` and `article.country` are both available: `"Paris, France"`
- When only `article.location` is available: `"Paris"`
- When only `article.country` is available: `"France"` with MapPin icon (icon retained since there's no city-level specificity)
- When only `article.coordinates` exist (no location/country): bare MapPin icon (current behavior)
- When no coordinates at all: hidden entirely (current behavior)

### Country Names

A static `COUNTRY_NAMES` map in `src/utils/countryNames.ts` resolves ISO 2-letter codes to full English country names (e.g., `"fr"` → `"France"`, `"gb"` → `"United Kingdom"`, `"us"` → `"United States"`). Initially covers the same ~40 countries as `COUNTRY_DEMONYMS` in `geographicGap.ts`; extend the map as needed when new country codes appear in article data.

Exported as `getCountryName(code: string): string` — returns the full name or the uppercased code as fallback.

### Styling

`text-xs text-ivory-200/40` with `MapPin` icon (w-3 h-3), same row as the published time. Matches existing metadata styling.

---

## 2. Geographic Spread Improvement

### Current Behavior

The Geographic Spread section (lines 227-250) shows raw lat/lng per source:
```
Le Monde — 48.9, 2.4
```

### New Behavior

Show location + country name instead of coordinates:
```
Le Monde — Paris, France
```

- When `article.location` and `article.country` available: `"{source.name} — {location}, {countryName}"`
- When only `article.location` available: `"{source.name} — {location}"`
- When only `article.country` available: `"{source.name} — {countryName}"`
- When only coordinates (no location/country): `"{source.name} — {lat}, {lng}"` (current fallback)

Uses the same `getCountryName()` utility from Section 1.

The list filter stays as `articlesWithCoords` (articles must have coordinates to appear in Geographic Spread). Articles with `location`/`country` but no coordinates are not added — geographic spread specifically tracks where articles can be placed on a map. The summary line ("This story is covered from N distinct locations") and `countDistinctLocations()` logic stay unchanged.

---

## 3. Perspective Comparison

### Utility

`analyzeEditorialPerspective(articles: NewsArticle[]): PerspectiveResult`

Exported from `src/utils/editorialPerspective.ts`. Only analyzes when 3+ articles are provided (fewer articles don't have enough to compare meaningfully). Returns empty result for < 3 articles.

### Entity Extraction

For each article, use `compromise` to extract from `title` + `description`:
- **People** — `nlp(text).people().out('array')`
- **Places** — `nlp(text).places().out('array')`
- **Organizations** — `nlp(text).organizations().out('array')`
- **Key nouns** — `nlp(text).nouns().out('array')`, filtered to remove stopwords and short words (< 4 chars)

Normalize all extracted terms to lowercase for comparison. Store per article as `{ source: string, titleEntities: Set<string>, descEntities: Set<string>, allEntities: Set<string> }`.

### Comparison Logic

**1. Unique angles:** For each entity that appears in exactly one article's `allEntities` set and doesn't appear in any other article's sets, generate an insight: `"Only {source.name} mentions {entity}"`. Limit to top 5 unique entities per article, prioritized by specificity: people > organizations > places > nouns. Cap total unique angle insights at 8.

**2. Emphasis differences:** For each entity that appears in 2+ articles, check if it appears in one article's `titleEntities` but only in other articles' `descEntities` (or not at all). Generate: `"{source.name} leads with {entity}"`. This surfaces what each source considers the headline angle vs. background detail. Cap at 5 emphasis insights.

### Return Type

```typescript
export interface PerspectiveResult {
  hasInsights: boolean;
  uniqueAngles: PerspectiveInsight[];
  emphasisDifferences: PerspectiveInsight[];
}

export interface PerspectiveInsight {
  source: string;    // source name
  entity: string;    // the entity/topic
  label: string;     // human-readable insight sentence
}
```

`hasInsights` is `true` when either `uniqueAngles` or `emphasisDifferences` has at least one entry. For < 3 articles or when no insights are produced: `{ hasInsights: false, uniqueAngles: [], emphasisDifferences: [] }`.

### UI Integration

New section on InvestigatePage, below Coverage Analysis and above Geographic Spread. Only rendered when `perspectiveResult.hasInsights` is true.

```
Perspective Comparison

Unique angles:
  Only Le Monde mentions unemployment figures
  Only Reuters mentions EU regulation

Emphasis differences:
  Le Monde leads with labor unions
  Reuters leads with market impact
```

**Heading:** `text-sm font-semibold text-ivory-200/60 mb-3` — matches existing section headings.

**Subsection labels** ("Unique angles", "Emphasis differences"): `text-xs text-ivory-200/30 uppercase tracking-wide mb-2`.

**Insight lines:** `text-sm text-ivory-200/60` — each insight is a single sentence from `insight.label`.

---

## 4. Files Affected

**New files:**
- `src/utils/countryNames.ts` — `COUNTRY_NAMES` map and `getCountryName()` function
- `src/utils/editorialPerspective.ts` — `analyzeEditorialPerspective()`, types
- `tests/utils/editorialPerspective.test.ts` — tests for perspective analysis. Key scenarios:
  - < 3 articles → `hasInsights: false`
  - Articles with distinct entities → unique angle insights generated
  - Entity in one title but only in others' descriptions → emphasis insight generated
  - Cap of 8 unique angle insights respected
  - Cap of 5 emphasis insights respected
  - Specificity ordering: people prioritized over nouns
  - Articles with no description → still extracts from title only

**Modified files:**
- `src/pages/InvestigatePage.tsx` — location names on source cards, geographic spread improvement, perspective comparison section

**Unchanged:**
- `src/utils/geographicGap.ts` — keeps its own `COUNTRY_DEMONYMS` map (different purpose: demonyms vs. full names)
- `src/utils/geoInference.ts` — no changes
- `src/utils/coverageGap.ts` — no changes

---

## 5. Non-Goals

- No LLM-powered analysis — client-side `compromise` NLP only (future enhancement)
- No sentiment analysis — framing and coverage scope only
- No new API calls or external services
- No changes to article data model or processing pipeline
- No mini-map or map visualization (separate future workstream)
- No reverse geocoding API — uses existing `location` and `country` fields from geoInference
