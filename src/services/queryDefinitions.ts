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

// --- Anchor queries: always run every refresh (8 total) ---
// Strategy: 5 France/francophone-focused + 3 international context

export const ANCHOR_QUERIES: QueryDefinition[] = [
  // 1. Wire services on France — AFP/Reuters international perspective on French stories
  {
    id: 'anchor-wire-france',
    label: 'Wire services — France focus',
    scale: 'national',
    countries: ['fr'],
    languages: ['en', 'fr'],
    category: 'top',
    prioritydomain: 'top',
  },
  // 2. French national top stories
  {
    id: 'anchor-france-top',
    label: 'France national top',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    category: 'top',
    prioritydomain: 'top',
  },
  // 3. French politics
  {
    id: 'anchor-france-politics',
    label: 'France politics',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    category: 'politics',
    prioritydomain: 'top',
  },
  // 4. French economy & social
  {
    id: 'anchor-france-economy',
    label: 'France economy & business',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    category: 'business',
    prioritydomain: 'top',
  },
  // 5. Francophone Europe (Belgium + Switzerland)
  {
    id: 'anchor-francophone-europe',
    label: 'Francophone Europe',
    scale: 'international',
    countries: ['be', 'ch'],
    languages: ['fr'],
    category: 'top',
    prioritydomain: 'top',
  },
  // 6. European context (France in Europe, EU affairs)
  {
    id: 'anchor-europe',
    label: 'Europe broad',
    scale: 'international',
    countries: ['fr', 'gb', 'de', 'es', 'it'],
    languages: ['en', 'fr'],
    category: 'top',
    prioritydomain: 'top',
  },
  // 7. Global wire (AFP, Reuters, AP — international stories)
  {
    id: 'anchor-global',
    label: 'Global wire services',
    scale: 'international',
    languages: ['en'],
    category: 'top',
    prioritydomain: 'top',
  },
  // 8. North Africa / Maghreb (francophone, strong France connections)
  {
    id: 'anchor-maghreb',
    label: 'Maghreb francophone',
    scale: 'international',
    countries: ['ma', 'dz', 'tn'],
    languages: ['fr', 'en'],
    category: 'top',
  },
];

// --- Rotation pool: exactly 22 items — entire pool runs every refresh ---
// Strategy: deep France coverage (cities, regions, thematic) + francophone periphery
// With pool size = rotation slice size = 22, every query runs on every refresh.

export const ROTATION_POOL: QueryDefinition[] = [
  // === French cities (8) ===
  {
    id: 'rot-paris',
    label: 'Paris & Île-de-France',
    scale: 'local',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Paris OR "Île-de-France" OR Versailles OR "Seine-Saint-Denis"',
  },
  {
    id: 'rot-lyon',
    label: 'Lyon & Auvergne-Rhône-Alpes',
    scale: 'local',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Lyon OR Grenoble OR "Saint-Étienne" OR Clermont',
  },
  {
    id: 'rot-marseille',
    label: 'Marseille & PACA',
    scale: 'local',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Marseille OR Toulon OR "Aix-en-Provence" OR Avignon',
  },
  {
    id: 'rot-toulouse',
    label: 'Toulouse & Occitanie',
    scale: 'local',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Toulouse OR Montpellier OR Nîmes OR Perpignan',
  },
  {
    id: 'rot-bordeaux',
    label: 'Bordeaux & Nouvelle-Aquitaine',
    scale: 'local',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Bordeaux OR Bayonne OR Pau OR Périgueux OR Limoges',
  },
  {
    id: 'rot-lille',
    label: 'Lille & Hauts-de-France',
    scale: 'local',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Lille OR Valenciennes OR Amiens OR Dunkerque',
  },
  {
    id: 'rot-strasbourg',
    label: 'Strasbourg & Grand Est',
    scale: 'local',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Strasbourg OR Mulhouse OR Nancy OR Metz OR Reims',
  },
  {
    id: 'rot-rennes',
    label: 'Rennes & Bretagne',
    scale: 'local',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Rennes OR Brest OR Nantes OR Quimper OR "Saint-Nazaire"',
  },

  // === French regions — broader stories (6) ===
  {
    id: 'rot-normandie',
    label: 'Normandie',
    scale: 'regional',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Normandie OR Rouen OR Caen OR "Le Havre" OR Cherbourg',
  },
  {
    id: 'rot-paca',
    label: 'Provence-Alpes-Côte d\'Azur',
    scale: 'regional',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Provence OR PACA OR "Côte d\'Azur" OR Nice OR "Alpes-Maritimes"',
  },
  {
    id: 'rot-pdl',
    label: 'Pays de la Loire',
    scale: 'regional',
    countries: ['fr'],
    languages: ['fr'],
    query: '"Pays de la Loire" OR "Maine-et-Loire" OR Vendée OR Sarthe',
  },
  {
    id: 'rot-centre',
    label: 'Centre-Val de Loire & Bourgogne',
    scale: 'regional',
    countries: ['fr'],
    languages: ['fr'],
    query: '"Centre-Val de Loire" OR Dijon OR Bourges OR Tours OR Orléans',
  },
  {
    id: 'rot-dom-tom',
    label: 'DOM-TOM (overseas territories)',
    scale: 'regional',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Réunion OR Martinique OR Guadeloupe OR "Nouvelle-Calédonie" OR Guyane OR Mayotte',
  },
  {
    id: 'rot-alsace-lorraine',
    label: 'Alsace-Moselle',
    scale: 'regional',
    countries: ['fr'],
    languages: ['fr'],
    query: 'Alsace OR Moselle OR Lorraine OR "Haut-Rhin" OR "Bas-Rhin"',
  },

  // === French thematic (5) ===
  {
    id: 'rot-fr-social',
    label: 'France social movements & labour',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    query: 'grève OR syndicat OR manifestation OR sociale OR chômage OR retraite',
  },
  {
    id: 'rot-fr-agriculture',
    label: 'France agriculture & rural',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    query: 'agriculture OR agriculteur OR rural OR élevage OR viticulture OR paysan',
  },
  {
    id: 'rot-fr-culture',
    label: 'France culture & heritage',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    category: 'entertainment',
    query: 'culture OR patrimoine OR musée OR cinéma OR festival OR littérature',
  },
  {
    id: 'rot-fr-transport',
    label: 'France transport & infrastructure',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    query: 'SNCF OR autoroute OR aéroport OR mobilité OR transport OR infrastructures',
  },
  {
    id: 'rot-fr-environment',
    label: 'France environment & climate',
    scale: 'national',
    countries: ['fr'],
    languages: ['fr'],
    category: 'environment',
  },

  // === Francophone periphery (3) ===
  {
    id: 'rot-afrique-francophone',
    label: 'Francophone Africa',
    scale: 'international',
    countries: ['sn', 'ci', 'cm', 'cd', 'ml', 'bf'],
    languages: ['fr'],
    category: 'top',
  },
  {
    id: 'rot-quebec',
    label: 'Québec & Canada francophone',
    scale: 'national',
    countries: ['ca'],
    languages: ['fr'],
    category: 'top',
  },
  {
    id: 'rot-france-intl-press',
    label: 'France in international press',
    scale: 'international',
    languages: ['en'],
    query: 'France OR "French government" OR "Emmanuel Macron" OR "French politics"',
    prioritydomain: 'top',
  },
];
