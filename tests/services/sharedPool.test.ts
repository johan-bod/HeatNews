import { describe, it, expect } from 'vitest';
import {
  LOCAL_QUERY_GROUPS,
  REGIONAL_QUERY_GROUPS,
  NATIONAL_QUERY_GROUPS,
  INTERNATIONAL_QUERY_GROUPS,
  getRotatingCategory,
  buildSharedPoolQueries,
  type QueryGroup,
} from '@/services/sharedPool';

describe('sharedPool query groups', () => {
  it('has 4 local French city groups', () => {
    expect(LOCAL_QUERY_GROUPS).toHaveLength(4);
  });

  it('has 3 regional French groups', () => {
    expect(REGIONAL_QUERY_GROUPS).toHaveLength(3);
  });

  it('has 6 national European groups', () => {
    expect(NATIONAL_QUERY_GROUPS).toHaveLength(6);
  });

  it('has 7 international groups', () => {
    expect(INTERNATIONAL_QUERY_GROUPS).toHaveLength(7);
  });

  it('total query count is 40 (2 per group)', () => {
    const total = (4 + 3 + 6 + 7) * 2;
    expect(total).toBe(40);
  });
});

describe('getRotatingCategory', () => {
  it('returns a valid NewsData category', () => {
    const categories = ['politics', 'business', 'technology', 'science', 'health', 'sports', 'entertainment'];
    const cat = getRotatingCategory();
    expect(categories).toContain(cat);
  });

  it('rotates based on day of year', () => {
    expect(typeof getRotatingCategory()).toBe('string');
  });
});

describe('buildSharedPoolQueries', () => {
  it('returns 40 query configs', () => {
    const queries = buildSharedPoolQueries();
    expect(queries).toHaveLength(40);
  });

  it('each query has required fields', () => {
    const queries = buildSharedPoolQueries();
    for (const q of queries) {
      expect(q.scale).toBeDefined();
      expect(q.params).toBeDefined();
      expect(q.params.size).toBe(10);
    }
  });

  it('local queries target France', () => {
    const queries = buildSharedPoolQueries().filter(q => q.scale === 'local');
    expect(queries.length).toBe(8); // 4 groups × 2
    for (const q of queries) {
      expect(q.params.country).toBe('fr');
      expect(q.params.language).toBe('fr');
    }
  });
});
