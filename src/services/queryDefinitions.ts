export interface QueryDefinition {
  id: string;
  label: string;
  scale: 'local' | 'regional' | 'national' | 'international';
  countries?: string[];
  languages?: string[];
  query?: string;
  category?: string;
  prioritydomain?: 'top' | 'medium';
  size?: number;
}

// --- Anchor queries: always run every refresh ---

export const ANCHOR_QUERIES: QueryDefinition[] = [
  {
    id: 'anchor-global',
    label: 'Global wire services',
    scale: 'international',
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-france',
    label: 'France national',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-uk',
    label: 'UK national',
    scale: 'national',
    countries: ['gb'],
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-germany',
    label: 'Germany national',
    scale: 'national',
    countries: ['de'],
    languages: ['de', 'en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-europe',
    label: 'Europe broad',
    scale: 'international',
    countries: ['fr', 'gb', 'de', 'es', 'it'],
    languages: ['en', 'fr'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-us-ca',
    label: 'US + Canada',
    scale: 'international',
    countries: ['us', 'ca'],
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-mena-africa',
    label: 'Middle East + Africa',
    scale: 'international',
    countries: ['ae', 'sa', 'eg', 'il', 'za', 'ng', 'ke'],
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
  {
    id: 'anchor-asia-pacific',
    label: 'Asia-Pacific',
    scale: 'international',
    countries: ['jp', 'kr', 'in', 'au'],
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
];

// --- Rotation pool: 22 drawn per refresh, cycling through all ~60 ---

export const ROTATION_POOL: QueryDefinition[] = [
  // === France deep (12) ===
  { id: 'rot-fr-local-1', label: 'Paris/Lyon/Marseille', scale: 'local', countries: ['fr'], languages: ['fr'], query: 'Paris OR Lyon OR Marseille' },
  { id: 'rot-fr-local-2', label: 'Toulouse/Nice/Bordeaux', scale: 'local', countries: ['fr'], languages: ['fr'], query: 'Toulouse OR Nice OR Bordeaux' },
  { id: 'rot-fr-local-3', label: 'Lille/Strasbourg/Nantes', scale: 'local', countries: ['fr'], languages: ['fr'], query: 'Lille OR Strasbourg OR Nantes' },
  { id: 'rot-fr-local-4', label: 'Rennes/Montpellier/Grenoble', scale: 'local', countries: ['fr'], languages: ['fr'], query: 'Rennes OR Montpellier OR Grenoble' },
  { id: 'rot-fr-region-1', label: 'Bretagne/Normandie', scale: 'regional', countries: ['fr'], languages: ['fr'], query: 'Bretagne OR Normandie' },
  { id: 'rot-fr-region-2', label: 'Provence/Occitanie', scale: 'regional', countries: ['fr'], languages: ['fr'], query: 'Provence OR Occitanie' },
  { id: 'rot-fr-region-3', label: 'Île-de-France/Hauts-de-France', scale: 'regional', countries: ['fr'], languages: ['fr'], query: '"Île-de-France" OR "Hauts-de-France"' },
  { id: 'rot-fr-region-4', label: 'Auvergne-Rhône-Alpes/Grand Est', scale: 'regional', countries: ['fr'], languages: ['fr'], query: '"Auvergne-Rhône-Alpes" OR "Grand Est"' },
  { id: 'rot-fr-politics', label: 'France politics', scale: 'national', countries: ['fr'], languages: ['fr'], category: 'politics' },
  { id: 'rot-fr-economy', label: 'France economy', scale: 'national', countries: ['fr'], languages: ['fr'], category: 'business' },
  { id: 'rot-fr-environment', label: 'France environment', scale: 'national', countries: ['fr'], languages: ['fr'], category: 'environment' },
  { id: 'rot-fr-culture', label: 'France culture', scale: 'national', countries: ['fr'], languages: ['fr'], category: 'food' },

  // === UK deep (6) ===
  { id: 'rot-uk-england', label: 'England', scale: 'national', countries: ['gb'], languages: ['en'] },
  { id: 'rot-uk-scotland', label: 'Scotland', scale: 'regional', countries: ['gb'], languages: ['en'], query: 'Scotland' },
  { id: 'rot-uk-wales-ni', label: 'Wales/Northern Ireland', scale: 'regional', countries: ['gb'], languages: ['en'], query: 'Wales OR "Northern Ireland"' },
  { id: 'rot-uk-london', label: 'London', scale: 'local', countries: ['gb'], languages: ['en'], query: 'London' },
  { id: 'rot-uk-midlands', label: 'Manchester/Birmingham', scale: 'local', countries: ['gb'], languages: ['en'], query: 'Manchester OR Birmingham' },
  { id: 'rot-uk-politics', label: 'UK politics', scale: 'national', countries: ['gb'], languages: ['en'], category: 'politics' },

  // === Europe (20) ===
  { id: 'rot-es-national', label: 'Spain', scale: 'national', countries: ['es'], languages: ['es', 'en'] },
  { id: 'rot-es-cities', label: 'Barcelona/Madrid', scale: 'local', countries: ['es'], languages: ['es', 'en'], query: 'Barcelona OR Madrid' },
  { id: 'rot-es-regions', label: 'Andalusia/Catalonia', scale: 'regional', countries: ['es'], languages: ['es', 'en'], query: 'Andalusia OR Catalonia' },
  { id: 'rot-it-national', label: 'Italy', scale: 'national', countries: ['it'], languages: ['it', 'en'] },
  { id: 'rot-it-cities', label: 'Rome/Milan', scale: 'local', countries: ['it'], languages: ['it', 'en'], query: 'Rome OR Milan' },
  { id: 'rot-it-regions', label: 'Sicily/Lombardy', scale: 'regional', countries: ['it'], languages: ['it', 'en'], query: 'Sicily OR Lombardy' },
  { id: 'rot-nl-be', label: 'Netherlands/Belgium', scale: 'national', countries: ['nl', 'be'], languages: ['nl', 'en'] },
  { id: 'rot-pt', label: 'Portugal', scale: 'national', countries: ['pt'], languages: ['pt', 'en'] },
  { id: 'rot-nordic-se-no', label: 'Sweden/Norway', scale: 'national', countries: ['se', 'no'], languages: ['en'] },
  { id: 'rot-nordic-dk-fi', label: 'Denmark/Finland', scale: 'national', countries: ['dk', 'fi'], languages: ['en'] },
  { id: 'rot-nordic-combined', label: 'Nordics combined', scale: 'international', countries: ['se', 'no', 'dk', 'fi'], languages: ['en'] },
  { id: 'rot-central-pl', label: 'Poland', scale: 'national', countries: ['pl'], languages: ['pl', 'en'] },
  { id: 'rot-central-cz-sk', label: 'Czech Republic/Slovakia', scale: 'national', countries: ['cz', 'sk'], languages: ['en'] },
  { id: 'rot-central-at-ch', label: 'Austria/Switzerland', scale: 'national', countries: ['at', 'ch'], languages: ['de', 'en'] },
  { id: 'rot-balkans-ro-bg', label: 'Romania/Bulgaria', scale: 'national', countries: ['ro', 'bg'], languages: ['en'] },
  { id: 'rot-balkans-gr-tr', label: 'Greece/Turkey', scale: 'national', countries: ['gr', 'tr'], languages: ['en'] },
  { id: 'rot-ie', label: 'Ireland', scale: 'national', countries: ['ie'], languages: ['en'] },
  { id: 'rot-baltic', label: 'Baltic states', scale: 'national', countries: ['ee', 'lv', 'lt'], languages: ['en'] },
  { id: 'rot-hu', label: 'Hungary', scale: 'national', countries: ['hu'], languages: ['en'] },
  { id: 'rot-ua', label: 'Ukraine', scale: 'national', countries: ['ua'], languages: ['en'] },

  // === Americas (8) ===
  { id: 'rot-us-east', label: 'US East Coast', scale: 'local', countries: ['us'], languages: ['en'], query: '"New York" OR Washington OR Miami' },
  { id: 'rot-us-west', label: 'US West Coast', scale: 'local', countries: ['us'], languages: ['en'], query: '"Los Angeles" OR "San Francisco" OR Seattle' },
  { id: 'rot-mx', label: 'Mexico', scale: 'national', countries: ['mx'], languages: ['es', 'en'] },
  { id: 'rot-br', label: 'Brazil', scale: 'national', countries: ['br'], languages: ['pt', 'en'] },
  { id: 'rot-latam-south', label: 'South America', scale: 'international', countries: ['ar', 'co', 'cl'], languages: ['es', 'en'] },
  { id: 'rot-caribbean', label: 'Caribbean', scale: 'international', countries: ['cu', 'jm', 'tt'], languages: ['en', 'es'] },
  { id: 'rot-ca-provinces', label: 'Canada', scale: 'national', countries: ['ca'], languages: ['en', 'fr'] },
  { id: 'rot-latam-central', label: 'Central America', scale: 'international', countries: ['pa', 'cr', 'gt'], languages: ['es', 'en'] },

  // === Middle East + Africa (7) ===
  { id: 'rot-gulf', label: 'Gulf states', scale: 'international', countries: ['ae', 'sa', 'qa', 'kw'], languages: ['en'] },
  { id: 'rot-levant', label: 'Levant', scale: 'international', countries: ['lb', 'sy', 'jo', 'iq'], languages: ['en'] },
  { id: 'rot-north-africa', label: 'North Africa', scale: 'international', countries: ['ma', 'dz', 'tn', 'eg'], languages: ['en', 'fr'] },
  { id: 'rot-west-africa', label: 'West Africa', scale: 'international', countries: ['ng', 'gh', 'sn', 'ci'], languages: ['en', 'fr'] },
  { id: 'rot-east-africa', label: 'East Africa', scale: 'international', countries: ['ke', 'et', 'tz', 'ug'], languages: ['en'] },
  { id: 'rot-southern-africa', label: 'Southern Africa', scale: 'international', countries: ['za', 'zw', 'mz'], languages: ['en'] },
  { id: 'rot-iran-turkey', label: 'Iran/Turkey', scale: 'international', countries: ['ir', 'tr'], languages: ['en'] },

  // === Asia-Pacific (7) ===
  { id: 'rot-jp', label: 'Japan', scale: 'national', countries: ['jp'], languages: ['en'] },
  { id: 'rot-kr', label: 'South Korea', scale: 'national', countries: ['kr'], languages: ['en'] },
  { id: 'rot-cn-tw', label: 'China/Taiwan', scale: 'international', countries: ['cn', 'tw'], languages: ['en'] },
  { id: 'rot-in', label: 'India', scale: 'national', countries: ['in'], languages: ['en'] },
  { id: 'rot-southeast-asia', label: 'Southeast Asia', scale: 'international', countries: ['th', 'vn', 'ph', 'id', 'my'], languages: ['en'] },
  { id: 'rot-au-nz', label: 'Australia/New Zealand', scale: 'national', countries: ['au', 'nz'], languages: ['en'] },
  { id: 'rot-central-asia', label: 'Central Asia', scale: 'international', countries: ['kz', 'uz'], languages: ['en'] },
];
