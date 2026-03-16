import nlp from 'compromise';
import type { NewsArticle } from '@/types/news';

export interface PerspectiveResult {
  hasInsights: boolean;
  uniqueAngles: PerspectiveInsight[];
  emphasisDifferences: PerspectiveInsight[];
}

export interface PerspectiveInsight {
  source: string;
  entity: string;
  label: string;
}

const NO_INSIGHTS: Readonly<PerspectiveResult> = Object.freeze({
  hasInsights: false,
  uniqueAngles: Object.freeze([]) as PerspectiveInsight[],
  emphasisDifferences: Object.freeze([]) as PerspectiveInsight[],
});

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'and', 'or', 'but', 'not', 'by', 'from', 'as', 'it', 'this',
  'that', 'has', 'have', 'had', 'be', 'been', 'will', 'would', 'can', 'could',
  'new', 'says', 'said', 'also', 'more', 'after', 'over', 'into', 'about',
  'its', 'than', 'them', 'then', 'some', 'what', 'when', 'which', 'who',
  'how', 'all', 'each', 'every', 'both', 'few', 'most', 'other', 'such',
  'only', 'same', 'very', 'just', 'because', 'between', 'through', 'during',
]);

type EntityType = 'person' | 'organization' | 'place' | 'noun';

interface TaggedEntity {
  text: string;
  type: EntityType;
}

interface ArticleProfile {
  source: string;
  titleEntities: Set<string>;
  descEntities: Set<string>;
  allEntities: Set<string>;
  taggedEntities: TaggedEntity[];
}

const SPECIFICITY_ORDER: Record<EntityType, number> = {
  person: 0,
  organization: 1,
  place: 2,
  noun: 3,
};

function extractEntities(text: string): TaggedEntity[] {
  const doc = nlp(text);
  const entities: TaggedEntity[] = [];
  const seen = new Set<string>();

  const people: string[] = doc.people().out('array');
  for (const p of people) {
    const key = p.toLowerCase().trim();
    if (key.length >= 4 && !seen.has(key)) {
      entities.push({ text: key, type: 'person' });
      seen.add(key);
    }
  }

  const orgs: string[] = doc.organizations().out('array');
  for (const o of orgs) {
    const key = o.toLowerCase().trim();
    if (key.length >= 4 && !seen.has(key)) {
      entities.push({ text: key, type: 'organization' });
      seen.add(key);
    }
  }

  const places: string[] = doc.places().out('array');
  for (const p of places) {
    const key = p.toLowerCase().trim();
    if (key.length >= 4 && !seen.has(key)) {
      entities.push({ text: key, type: 'place' });
      seen.add(key);
    }
  }

  const personTexts = entities.filter(e => e.type === 'person').map(e => e.text);

  const nouns: string[] = doc.nouns().out('array');
  for (const n of nouns) {
    const key = n.toLowerCase().trim();
    if (key.length >= 4 && !STOPWORDS.has(key) && !seen.has(key)) {
      // Promote noun phrases that contain a known person name to 'person' type
      const overlapsWithPerson = personTexts.some(p => key.includes(p) || p.includes(key));
      entities.push({ text: key, type: overlapsWithPerson ? 'person' : 'noun' });
      seen.add(key);
    }
  }

  // Remove entities that are substrings of a longer entity with same or better type
  const deduped = entities.filter(e => {
    return !entities.some(other =>
      other.text !== e.text &&
      other.text.includes(e.text) &&
      SPECIFICITY_ORDER[other.type] <= SPECIFICITY_ORDER[e.type]
    );
  });

  return deduped;
}

function buildProfile(article: NewsArticle): ArticleProfile {
  const titleTagged = extractEntities(article.title);
  const titleEntities = new Set(titleTagged.map(e => e.text));

  const descTagged = article.description ? extractEntities(article.description) : [];
  const descEntities = new Set(descTagged.map(e => e.text));

  const allEntities = new Set([...titleEntities, ...descEntities]);
  const taggedEntities = [...titleTagged, ...descTagged].filter(
    (e, i, arr) => arr.findIndex(x => x.text === e.text) === i
  );

  return {
    source: article.source.name,
    titleEntities,
    descEntities,
    allEntities,
    taggedEntities,
  };
}

export function analyzeEditorialPerspective(articles: NewsArticle[]): PerspectiveResult {
  // compromise is English-only NLP — filter non-English articles before analysis
  const englishArticles = articles.filter(
    a => (a.language ?? 'en').toLowerCase().slice(0, 2) === 'en'
  );
  if (englishArticles.length < 3) return NO_INSIGHTS;

  try {
    const profiles = englishArticles.map(buildProfile);

    // 1. Unique angles
    const uniqueAngles: PerspectiveInsight[] = [];

    for (const profile of profiles) {
      const uniqueEntities = profile.taggedEntities.filter(entity => {
        const otherProfiles = profiles.filter(p => p.source !== profile.source);
        return !otherProfiles.some(p => p.allEntities.has(entity.text));
      });

      uniqueEntities.sort((a, b) => SPECIFICITY_ORDER[a.type] - SPECIFICITY_ORDER[b.type]);

      for (const entity of uniqueEntities.slice(0, 5)) {
        (uniqueAngles as (PerspectiveInsight & { _type: EntityType })[]).push({
          source: profile.source,
          entity: entity.text,
          label: `Only ${profile.source} mentions ${entity.text}`,
          _type: entity.type,
        });
      }
    }

    // Sort globally by entity type specificity (people first, then orgs, places, nouns)
    (uniqueAngles as (PerspectiveInsight & { _type: EntityType })[]).sort(
      (a, b) => SPECIFICITY_ORDER[a._type] - SPECIFICITY_ORDER[b._type]
    );

    // Clean up internal _type field and cap at 8
    for (const angle of uniqueAngles) {
      delete (angle as Record<string, unknown>)['_type'];
    }
    uniqueAngles.splice(8);

    // 2. Emphasis differences
    const emphasisDifferences: PerspectiveInsight[] = [];

    const allEntityTexts = new Set<string>();
    for (const profile of profiles) {
      for (const e of profile.allEntities) allEntityTexts.add(e);
    }

    for (const entity of allEntityTexts) {
      const inProfiles = profiles.filter(p => p.allEntities.has(entity));
      if (inProfiles.length < 2) continue;

      const titleProfiles = inProfiles.filter(p => p.titleEntities.has(entity));
      const descOnlyProfiles = inProfiles.filter(p => !p.titleEntities.has(entity) && p.descEntities.has(entity));

      if (titleProfiles.length === 1 && descOnlyProfiles.length >= 1) {
        emphasisDifferences.push({
          source: titleProfiles[0].source,
          entity,
          label: `${titleProfiles[0].source} leads with ${entity}`,
        });
      }
    }

    emphasisDifferences.splice(5);

    const hasInsights = uniqueAngles.length > 0 || emphasisDifferences.length > 0;

    if (!hasInsights) return NO_INSIGHTS;

    return { hasInsights, uniqueAngles, emphasisDifferences };
  } catch {
    return { ...NO_INSIGHTS };
  }
}
