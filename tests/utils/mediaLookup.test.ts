import { describe, it, expect } from 'vitest';
import { findOutletByDomain, findOutletBySourceId } from '@/utils/mediaLookup';

describe('mediaLookup', () => {
  describe('findOutletByDomain', () => {
    it('finds Le Monde by domain', () => {
      const outlet = findOutletByDomain('lemonde.fr');
      expect(outlet).toBeDefined();
      expect(outlet!.name).toBe('Le Monde');
    });

    it('finds outlet by partial domain match', () => {
      const outlet = findOutletByDomain('www.lemonde.fr');
      expect(outlet).toBeDefined();
      expect(outlet!.name).toBe('Le Monde');
    });

    it('returns undefined for unknown domain', () => {
      const outlet = findOutletByDomain('unknown-news.com');
      expect(outlet).toBeUndefined();
    });
  });

  describe('findOutletBySourceId', () => {
    it('finds outlet when source_id contains domain', () => {
      const outlet = findOutletBySourceId('lemonde');
      expect(outlet).toBeDefined();
      expect(outlet!.name).toBe('Le Monde');
    });

    it('returns undefined for unknown source', () => {
      const outlet = findOutletBySourceId('totally_unknown_source');
      expect(outlet).toBeUndefined();
    });
  });
});
