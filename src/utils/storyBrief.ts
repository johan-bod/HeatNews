/**
 * Generates a structured "Investigation Brief" from all available story analysis data.
 * Output: full Markdown (LLM-ready / shareable) + structured JSON (tool-friendly).
 * Pure function — no React, no side effects.
 */

import type { NewsArticle } from '@/types/news';
import type { StoryCluster } from '@/utils/topicClustering';
import type { CoverageGapResult } from '@/utils/coverageGap';
import type { GeographicGapResult } from '@/utils/geographicGap';
import type { PerspectiveResult } from '@/utils/editorialPerspective';
import { resolveCredibilityByDomain, extractDomain } from '@/utils/credibilityService';
import { getCountryName } from '@/utils/countryNames';

// ── Constants ─────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = {
  reference: 'Wire / Reference',
  established: 'National / Established',
  regional: 'Regional',
  hyperlocal: 'Hyperlocal / Local',
  niche: 'Niche / Specialist',
  unreliable: 'Low credibility',
};

const TIER_ORDER = ['reference', 'established', 'regional', 'niche', 'hyperlocal', 'unreliable'];

const LANG_NAMES: Record<string, string> = {
  fr: 'French', en: 'English', de: 'German', es: 'Spanish',
  it: 'Italian', ar: 'Arabic', pt: 'Portuguese', nl: 'Dutch',
  zh: 'Chinese', ru: 'Russian', ja: 'Japanese',
};

// ── Public types ──────────────────────────────────────────────────────────────

export type StoryPotential = 'urgent' | 'investigate' | 'monitor';

export interface PotentialAssessment {
  level: StoryPotential;
  label: string;
  emoji: string;
  description: string;
}

export interface TimelineInfo {
  first: Date;
  latest: Date;
  durationHours: number;
  /** Human-readable status label */
  status: 'Breaking' | 'Active' | 'Developing' | 'Ongoing';
}

export interface BriefInput {
  article: NewsArticle;
  cluster: StoryCluster;
  coverageGap: CoverageGapResult | null;
  geoGap: GeographicGapResult | null;
  perspective: PerspectiveResult | null;
}

export interface StoryBrief {
  markdown: string;
  json: BriefJSON;
  filename: string;
}

export interface BriefJSON {
  meta: { generated: string; generator: string; url: string };
  story: {
    headline: string;
    lead_source: string;
    lead_url: string;
    potential: StoryPotential;
    heat_score: number;
    timeline: ReturnType<typeof computeTimeline>;
  };
  coverage: {
    total_articles: number;
    distinct_regions: number;
    languages: Record<string, number>;
    by_tier: { tier: string; label: string; outlets: string[]; count: number }[];
  };
  gaps: {
    coverage: { has_gap: boolean; label: string; imbalance: string | null };
    geographic: { has_gap: boolean; label: string; missing_regions: string[] };
  };
  perspectives: {
    unique_angles: { source: string; entity: string }[];
    emphasis_differences: { source: string; entity: string }[];
  };
  topics: { topic: string; count: number }[];
  investigative_angles: string[];
  primary_sources: { source: string; title: string; url: string; published: string }[];
  sources: {
    source: string;
    title: string;
    url: string;
    language: string;
    location: string;
    country: string;
    published: string;
    tier: string;
    tier_label: string;
  }[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Escape pipe and newline chars so they don't break Markdown tables */
function escMd(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateLong(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Core computations ─────────────────────────────────────────────────────────

export function assessStoryPotential(
  cluster: StoryCluster,
  coverageGap: CoverageGapResult | null,
  geoGap: GeographicGapResult | null,
): PotentialAssessment {
  const heat = cluster.heatLevel;
  const hasGap = coverageGap?.hasGap || geoGap?.hasGeoGap;

  if (heat >= 65) {
    return {
      level: 'urgent',
      label: 'Urgent',
      emoji: '🔴',
      description: 'High-heat story with strong multi-source convergence — act quickly',
    };
  }
  if (heat >= 35 || hasGap) {
    return {
      level: 'investigate',
      label: 'Investigate',
      emoji: '🟡',
      description: 'Active story with notable coverage gaps worth pursuing',
    };
  }
  return {
    level: 'monitor',
    label: 'Monitor',
    emoji: '⚪',
    description: 'Emerging signal — limited coverage so far, worth watching',
  };
}

export function computeTimeline(articles: NewsArticle[]): TimelineInfo | null {
  const dates = articles
    .map(a => new Date(a.publishedAt))
    .filter(d => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  if (dates.length < 1) return null;

  const first = dates[0];
  const latest = dates[dates.length - 1];
  const durationHours = (latest.getTime() - first.getTime()) / 3_600_000;

  let status: TimelineInfo['status'];
  if (durationHours < 3) status = 'Breaking';
  else if (durationHours < 24) status = 'Active';
  else if (durationHours < 72) status = 'Developing';
  else status = 'Ongoing';

  return { first, latest, durationHours, status };
}

export function computeLangBreakdown(articles: NewsArticle[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of articles) {
    const lang = (a.language ?? 'unknown').toLowerCase().slice(0, 2);
    counts[lang] = (counts[lang] ?? 0) + 1;
  }
  return counts;
}

function computeTierGroups(articles: NewsArticle[]) {
  const groups = new Map<string, { outlets: Set<string>; articles: NewsArticle[] }>();

  for (const a of articles) {
    const domain = extractDomain(a.source.url) ?? extractDomain(a.url);
    const { tier } = resolveCredibilityByDomain(domain);
    if (!groups.has(tier)) groups.set(tier, { outlets: new Set(), articles: [] });
    const g = groups.get(tier)!;
    g.outlets.add(a.source.name);
    g.articles.push(a);
  }

  return TIER_ORDER
    .filter(t => groups.has(t))
    .map(t => {
      const g = groups.get(t)!;
      return {
        tier: t,
        label: TIER_LABELS[t] ?? t,
        outlets: [...g.outlets],
        articles: g.articles,
        count: g.articles.length,
      };
    });
}

function aggregateTopics(articles: NewsArticle[]): { topic: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const a of articles) {
    if (a.primaryTopic) counts[a.primaryTopic] = (counts[a.primaryTopic] ?? 0) + 1;
    for (const t of a.secondaryTopics ?? []) {
      counts[t] = (counts[t] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([topic, count]) => ({ topic, count }));
}

function generateAngles(
  articles: NewsArticle[],
  coverageGap: CoverageGapResult | null,
  geoGap: GeographicGapResult | null,
  perspective: PerspectiveResult | null,
): string[] {
  const angles: string[] = [];

  // Coverage tier gaps
  if (coverageGap?.missingTiers.includes('reference')) {
    angles.push(
      'Wire gap: AFP, Reuters and AP have not covered this story. Is there a newsworthiness barrier, a lag, or a deliberate editorial choice?',
    );
  }
  if (coverageGap?.missingTiers.includes('established') && !coverageGap.missingTiers.includes('reference')) {
    angles.push(
      'National press absent: wire services are covering this, but no major national outlets have followed. Why?',
    );
  }
  if (coverageGap?.imbalanceNote) {
    angles.push(
      'Grassroots signal: coverage is predominantly from local/independent sources. This may indicate a story with national significance that has not yet broken through.',
    );
  }

  // Geographic gaps
  if (geoGap?.hasGeoGap) {
    if (geoGap.countryGapLabel) {
      angles.push(`Geographic blind spot: ${geoGap.countryGapLabel}. Seek international perspectives or correspondents.`);
    }
    const missingRegions = geoGap.regionalBreakdown
      .flatMap(rb => rb.missingRegions)
      .slice(0, 3);
    if (missingRegions.length > 0) {
      angles.push(
        `Regional gap: story not covered in ${missingRegions.join(', ')}. Are these areas affected? Local sources may have a different angle.`,
      );
    }
  }

  // Language gaps
  const langs = computeLangBreakdown(articles);
  const hasEnglish = (langs['en'] ?? 0) > 0;
  const totalNonEn = Object.entries(langs).filter(([l]) => l !== 'en').reduce((s, [, c]) => s + c, 0);
  if (!hasEnglish && totalNonEn > 2) {
    angles.push(
      'Language gap: this story has no English-language coverage. International audiences and wire agencies are unaware — first-mover opportunity for an English-language report.',
    );
  }

  // Perspective exclusives
  if (perspective?.uniqueAngles.length) {
    const top = perspective.uniqueAngles[0];
    angles.push(
      `Exclusive angle: only ${top.source} is reporting on "${top.entity}". This may be the most underexplored dimension of the story.`,
    );
  }
  if (perspective?.emphasisDifferences.length) {
    const top = perspective.emphasisDifferences[0];
    angles.push(
      `Emphasis split: ${top.source} leads with "${top.entity}" while others treat it as secondary. Consider which framing better serves your audience.`,
    );
  }

  return angles.slice(0, 6);
}

// ── Markdown builder ──────────────────────────────────────────────────────────

function buildMarkdown(
  input: BriefInput,
  potential: PotentialAssessment,
  timeline: TimelineInfo | null,
  langBreakdown: Record<string, number>,
  tierGroups: ReturnType<typeof computeTierGroups>,
  topics: { topic: string; count: number }[],
  angles: string[],
): string {
  const { article, cluster, coverageGap, geoGap, perspective } = input;
  const now = new Date();
  const distinctRegions = new Set(
    cluster.articles.filter(a => a.coordinates).map(a => a.country ?? a.location ?? ''),
  ).size;

  const lines: string[] = [];

  // ── Header ──
  lines.push(`# HeatNews Investigation Brief`);
  lines.push(`**${escMd(article.title)}**`);
  lines.push(
    `*${escMd(article.source.name)}${article.location ? ` · ${escMd(article.location)}` : ''} · ${fmtDate(new Date(article.publishedAt))}*`,
  );
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Signal ──
  lines.push(`## Signal`);
  lines.push('');

  const timelineStr = timeline
    ? `${timeline.status} · ${timeline.durationHours < 24
      ? `${Math.round(timeline.durationHours)}h`
      : `${Math.round(timeline.durationHours / 24)}d`} (${fmtDate(timeline.first)} → ${fmtDate(timeline.latest)})`
    : 'Unknown';

  const langStr = Object.entries(langBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([l, n]) => `${LANG_NAMES[l] ?? l.toUpperCase()} (${n})`)
    .join(', ');

  lines.push(`| | |`);
  lines.push(`|---|---|`);
  lines.push(`| **Heat score** | ${cluster.heatLevel} / 100 |`);
  lines.push(`| **Story potential** | ${potential.emoji} ${potential.label} |`);
  lines.push(`| **Sources** | ${cluster.articles.length} articles from ${new Set(cluster.articles.map(a => a.source.name)).size} outlets |`);
  lines.push(`| **Geographic spread** | ${distinctRegions} distinct region${distinctRegions !== 1 ? 's' : ''} |`);
  lines.push(`| **Story window** | ${timelineStr} |`);
  if (langStr) lines.push(`| **Languages** | ${langStr} |`);
  lines.push('');

  if (potential.description) {
    lines.push(`> ${potential.emoji} **${potential.label}**: ${potential.description}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // ── Coverage landscape ──
  lines.push(`## Coverage Landscape`);
  lines.push('');
  lines.push(`| Tier | Outlets | Articles |`);
  lines.push(`|------|---------|----------|`);
  for (const g of tierGroups) {
    const outlets = g.outlets.slice(0, 5).join(', ') + (g.outlets.length > 5 ? ` +${g.outlets.length - 5}` : '');
    lines.push(`| ${escMd(g.label)} | ${escMd(outlets)} | ${g.count} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Primary sources ──
  const primarySources = cluster.articles.filter(a => a.sourceType === 'primary_source');
  if (primarySources.length > 0) {
    lines.push(`## Primary Source Activity`);
    lines.push('');
    const sortedPS = [...primarySources].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
    for (const a of sortedPS) {
      const pub = fmtDate(new Date(a.publishedAt));
      const titleLink = `[${escMd(truncate(a.title, 100))}](${a.url})`;
      lines.push(`- **${escMd(a.source.name)}** — ${titleLink} *(${pub})*`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // ── What's being reported ──
  lines.push(`## What's Being Reported`);
  lines.push('');
  const sortedArticles = [...cluster.articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  for (const a of sortedArticles) {
    const lang = (a.language ?? 'en').toUpperCase().slice(0, 2);
    const loc = a.location
      ? `${a.location}${a.country ? `, ${getCountryName(a.country)}` : ''}`
      : a.country ? getCountryName(a.country) : '';
    const pub = fmtDate(new Date(a.publishedAt));
    const titleLink = `[${escMd(truncate(a.title, 100))}](${a.url})`;
    lines.push(`- **${escMd(a.source.name)}** (${lang}${loc ? ` · ${escMd(loc)}` : ''}) — ${titleLink} *(${pub})*`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Gaps ──
  lines.push(`## Coverage Gaps & Blind Spots`);
  lines.push('');

  const hasAnyCoverageGap = coverageGap?.hasGap;
  const hasAnyGeoGap = geoGap?.hasGeoGap;

  if (hasAnyCoverageGap) {
    lines.push(`### Source coverage`);
    if (coverageGap!.gapLabel) lines.push(`- ⚠ ${coverageGap!.gapLabel}`);
    if (coverageGap!.imbalanceNote) lines.push(`- ⚠ ${coverageGap!.imbalanceNote}`);
    lines.push('');
  }

  if (hasAnyGeoGap) {
    lines.push(`### Geographic blind spots`);
    if (geoGap!.countryGapLabel) lines.push(`- ⚠ ${geoGap!.countryGapLabel}`);
    for (const rb of geoGap!.regionalBreakdown) {
      if (rb.missingRegions.length > 0) {
        lines.push(`- ⚠ Not covered in: ${rb.missingRegions.join(', ')}`);
      }
    }
    lines.push('');
  }

  if (!hasAnyCoverageGap && !hasAnyGeoGap) {
    lines.push(`*No significant coverage gaps detected — story has broad, multi-tier representation.*`);
    lines.push('');
  }

  lines.push('---');
  lines.push('');

  // ── Perspective analysis ──
  if (perspective?.hasInsights) {
    lines.push(`## Perspective Analysis`);
    lines.push('');

    if (perspective.uniqueAngles.length > 0) {
      lines.push(`### Exclusive angles *(single-source only)*`);
      for (const a of perspective.uniqueAngles) {
        lines.push(`- Only **${escMd(a.source)}** mentions: *${escMd(a.entity)}*`);
      }
      lines.push('');
    }

    if (perspective.emphasisDifferences.length > 0) {
      lines.push(`### Emphasis differences`);
      for (const d of perspective.emphasisDifferences) {
        lines.push(`- **${escMd(d.source)}** leads with: *${escMd(d.entity)}* — others treat it as background`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // ── Topics ──
  if (topics.length > 0) {
    lines.push(`## Key Themes & Entities`);
    lines.push('');
    const topicStr = topics
      .map(({ topic, count }) => `${topic}${cluster.articles.length > 2 ? ` (${count}/${cluster.articles.length})` : ''}`)
      .join(' · ');
    lines.push(topicStr);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // ── Investigative angles ──
  if (angles.length > 0) {
    lines.push(`## Suggested Investigative Angles`);
    lines.push('');
    angles.forEach((angle, i) => {
      lines.push(`${i + 1}. ${angle}`);
    });
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // ── Full source list ──
  lines.push(`## Full Source List`);
  lines.push('');
  lines.push(`| Source | Title | Lang | Location | Published | Tier |`);
  lines.push(`|--------|-------|------|----------|-----------|------|`);
  for (const a of sortedArticles) {
    const domain = extractDomain(a.source.url) ?? extractDomain(a.url);
    const { tier } = resolveCredibilityByDomain(domain);
    const lang = (a.language ?? '??').toUpperCase().slice(0, 2);
    const loc = a.location ?? a.country ?? '—';
    const pub = fmtDate(new Date(a.publishedAt));
    const titleCell = `[${escMd(truncate(a.title, 70))}](${a.url})`;
    lines.push(`| ${escMd(a.source.name)} | ${titleCell} | ${lang} | ${escMd(loc)} | ${pub} | ${TIER_LABELS[tier] ?? tier} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // ── Footer ──
  lines.push(`*Generated by [HeatNews](https://heatnews.app) · ${fmtDateLong(now)}*`);
  lines.push('');
  lines.push(
    `*Paste this brief into Claude, ChatGPT, or your preferred AI assistant and ask it to "write a story pitch", "summarise the key angles", or "identify what's missing from this coverage".*`,
  );

  return lines.join('\n');
}

// ── JSON builder ──────────────────────────────────────────────────────────────

function buildJson(
  input: BriefInput,
  potential: PotentialAssessment,
  timeline: TimelineInfo | null,
  langBreakdown: Record<string, number>,
  tierGroups: ReturnType<typeof computeTierGroups>,
  topics: { topic: string; count: number }[],
  angles: string[],
): BriefJSON {
  const { article, cluster, coverageGap, geoGap, perspective } = input;

  return {
    meta: {
      generated: new Date().toISOString(),
      generator: 'HeatNews',
      url: 'https://heatnews.app',
    },
    story: {
      headline: article.title,
      lead_source: article.source.name,
      lead_url: article.url,
      potential: potential.level,
      heat_score: cluster.heatLevel,
      timeline: timeline
        ? {
            first: timeline.first.toISOString(),
            latest: timeline.latest.toISOString(),
            duration_hours: Math.round(timeline.durationHours * 10) / 10,
            status: timeline.status,
          }
        : null,
    },
    coverage: {
      total_articles: cluster.articles.length,
      distinct_regions: new Set(
        cluster.articles.filter(a => a.coordinates).map(a => a.country ?? a.location ?? ''),
      ).size,
      languages: langBreakdown,
      by_tier: tierGroups.map(g => ({
        tier: g.tier,
        label: g.label,
        outlets: g.outlets,
        count: g.count,
      })),
    },
    gaps: {
      coverage: {
        has_gap: coverageGap?.hasGap ?? false,
        label: coverageGap?.gapLabel ?? '',
        imbalance: coverageGap?.imbalanceNote ?? null,
      },
      geographic: {
        has_gap: geoGap?.hasGeoGap ?? false,
        label: geoGap?.countryGapLabel ?? '',
        missing_regions: geoGap?.regionalBreakdown.flatMap(rb => rb.missingRegions) ?? [],
      },
    },
    perspectives: {
      unique_angles: perspective?.uniqueAngles.map(a => ({ source: a.source, entity: a.entity })) ?? [],
      emphasis_differences: perspective?.emphasisDifferences.map(d => ({ source: d.source, entity: d.entity })) ?? [],
    },
    topics,
    investigative_angles: angles,
    primary_sources: cluster.articles
      .filter(a => a.sourceType === 'primary_source')
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .map(a => ({
        source: a.source.name,
        title: a.title,
        url: a.url,
        published: a.publishedAt,
      })),
    sources: cluster.articles
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .map(a => {
        const domain = extractDomain(a.source.url) ?? extractDomain(a.url);
        const { tier } = resolveCredibilityByDomain(domain);
        return {
          source: a.source.name,
          title: a.title,
          url: a.url,
          language: a.language ?? 'unknown',
          location: a.location ?? '',
          country: a.country ? getCountryName(a.country) : '',
          published: a.publishedAt,
          tier,
          tier_label: TIER_LABELS[tier] ?? tier,
        };
      }),
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export function generateBrief(input: BriefInput): StoryBrief {
  const { article, cluster, coverageGap, geoGap, perspective } = input;

  const potential = assessStoryPotential(cluster, coverageGap, geoGap);
  const timeline = computeTimeline(cluster.articles);
  const langBreakdown = computeLangBreakdown(cluster.articles);
  const tierGroups = computeTierGroups(cluster.articles);
  const topics = aggregateTopics(cluster.articles);
  const angles = generateAngles(cluster.articles, coverageGap, geoGap, perspective);

  const markdown = buildMarkdown(input, potential, timeline, langBreakdown, tierGroups, topics, angles);
  const json = buildJson(input, potential, timeline, langBreakdown, tierGroups, topics, angles);

  const safeTitle = article.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50);
  const dateStr = new Date().toISOString().slice(0, 10);

  return {
    markdown,
    json,
    filename: `heatnews-brief-${safeTitle}-${dateStr}`,
  };
}
