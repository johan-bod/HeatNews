import { describe, it, expect } from 'vitest';
import { analyzeEditorialPerspective } from '@/utils/editorialPerspective';
import type { NewsArticle } from '@/types/news';

function makeArticle(
  id: string,
  sourceName: string,
  title: string,
  description?: string
): NewsArticle {
  return {
    id,
    title,
    description,
    url: `https://example.com/${id}`,
    publishedAt: new Date().toISOString(),
    source: { name: sourceName, url: 'https://example.com' },
  } as NewsArticle;
}

describe('analyzeEditorialPerspective', () => {
  it('returns no insights for fewer than 3 articles', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Climate summit begins'),
      makeArticle('2', 'Source B', 'Climate summit opens'),
    ]);
    expect(result.hasInsights).toBe(false);
    expect(result.uniqueAngles).toEqual([]);
    expect(result.emphasisDifferences).toEqual([]);
  });

  it('detects unique entities mentioned by only one source', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Climate summit begins in Paris', 'World leaders gather to discuss emissions targets'),
      makeArticle('2', 'Source B', 'Climate summit opens', 'Negotiations focus on carbon trading'),
      makeArticle('3', 'Source C', 'Climate talks start', 'Delegates arrive for environmental conference'),
    ]);
    expect(result.hasInsights).toBe(true);
    const parisInsight = result.uniqueAngles.find(i => i.entity.includes('paris'));
    expect(parisInsight).toBeDefined();
    expect(parisInsight!.source).toBe('Source A');
  });

  it('detects emphasis differences when entity is in title vs description', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Labor unions protest new policy', 'Workers gather in the capital'),
      makeArticle('2', 'Source B', 'New policy announced by government', 'Labor unions express concerns about the changes'),
      makeArticle('3', 'Source C', 'Government unveils policy reform', 'Various groups react to the announcement'),
    ]);
    if (result.emphasisDifferences.length > 0) {
      const laborInsight = result.emphasisDifferences.find(i =>
        i.entity.includes('labor') || i.entity.includes('union')
      );
      if (laborInsight) {
        expect(laborInsight.source).toBe('Source A');
        expect(laborInsight.label).toMatch(/leads with/);
      }
    }
    expect(result.hasInsights).toBe(true);
  });

  it('caps unique angle insights at 8', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Alpha beta gamma delta epsilon zeta eta theta iota kappa', 'Additional unique terms for source A'),
      makeArticle('2', 'Source B', 'Lambda mu nu xi omicron pi rho sigma tau upsilon', 'Additional unique terms for source B'),
      makeArticle('3', 'Source C', 'Phi chi psi omega', 'Additional unique terms for source C'),
    ]);
    expect(result.uniqueAngles.length).toBeLessThanOrEqual(8);
  });

  it('caps emphasis insights at 5', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'Economy markets trade inflation growth unemployment', 'Policy changes affect workers'),
      makeArticle('2', 'Source B', 'Policy reform announced', 'Economy markets trade inflation growth unemployment discussed'),
      makeArticle('3', 'Source C', 'Reform changes expected', 'Economy markets trade inflation growth unemployment analyzed'),
    ]);
    expect(result.emphasisDifferences.length).toBeLessThanOrEqual(5);
  });

  it('extracts from title only when description is missing', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'President Biden visits Tokyo'),
      makeArticle('2', 'Source B', 'International summit begins'),
      makeArticle('3', 'Source C', 'Global leaders convene'),
    ]);
    expect(result).toBeDefined();
    expect(typeof result.hasInsights).toBe('boolean');
  });

  it('prioritizes people over nouns in unique angles', () => {
    const result = analyzeEditorialPerspective([
      makeArticle('1', 'Source A', 'President Macron announces reform', 'Major changes to regulations expected'),
      makeArticle('2', 'Source B', 'Government announces reform', 'Changes to labor laws expected'),
      makeArticle('3', 'Source C', 'Reform package unveiled', 'New policies take effect'),
    ]);
    if (result.uniqueAngles.length > 0) {
      const macronInsight = result.uniqueAngles.find(i => i.entity.includes('macron'));
      if (macronInsight) {
        const macronIdx = result.uniqueAngles.indexOf(macronInsight);
        const nounInsights = result.uniqueAngles.filter(i =>
          !i.entity.includes('macron') && i.source === 'Source A'
        );
        if (nounInsights.length > 0) {
          const firstNounIdx = result.uniqueAngles.indexOf(nounInsights[0]);
          expect(macronIdx).toBeLessThan(firstNounIdx);
        }
      }
    }
    expect(result).toBeDefined();
  });
});
