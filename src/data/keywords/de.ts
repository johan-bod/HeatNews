import type { Topic } from './taxonomy';

export const DE_KEYWORDS: Record<string, Topic> = {
  // Politics (~8)
  'wahl': 'politics', 'wahlen': 'politics', 'bundestag': 'politics',
  'kanzler': 'politics', 'regierung': 'politics', 'partei': 'politics',
  'koalition': 'politics', 'abstimmung': 'politics',
  // Economy (~6)
  'wirtschaft': 'economy', 'arbeitslosigkeit': 'economy', 'unternehmen': 'economy',
  'handel': 'economy', 'export': 'economy', 'wachstum': 'economy',
  // Technology (~5)
  'technologie': 'technology', 'digitalisierung': 'technology', 'künstliche intelligenz': 'technology',
  'software': 'technology', 'internet': 'technology',
  // Climate (~4)
  'klimawandel': 'climate', 'erderwärmung': 'climate', 'klimaschutz': 'climate', 'treibhausgas': 'climate',
  // Sports (~5)
  'sport': 'sports', 'fußball': 'sports', 'bundesliga': 'sports',
  'meisterschaft': 'sports', 'trainer': 'sports',
  // Health (~5)
  'gesundheit': 'health', 'krankenhaus': 'health', 'impfung': 'health',
  'arzt': 'health', 'krankheit': 'health',
  // Education (~4)
  'bildung': 'education', 'universität': 'education', 'schule': 'education', 'studium': 'education',
  // Culture (~4)
  'kultur': 'culture', 'museum': 'culture', 'theater': 'culture', 'ausstellung': 'culture',
  // Crime (~5)
  'kriminalität': 'crime', 'polizei': 'crime', 'verbrechen': 'crime',
  'mord': 'crime', 'diebstahl': 'crime',
  // Energy (~4)
  'energie': 'energy', 'atomkraft': 'energy', 'erneuerbare': 'energy', 'kohle': 'energy',
  // Transport (~4)
  'verkehr': 'transport', 'bahn': 'transport', 'autobahn': 'transport', 'flughafen': 'transport',
  // Housing (~4)
  'wohnung': 'housing', 'miete': 'housing', 'immobilien': 'housing', 'bauen': 'housing',
  // Agriculture (~3)
  'landwirtschaft': 'agriculture', 'bauer': 'agriculture', 'ernte': 'agriculture',
  // Defense (~4)
  'verteidigung': 'defense', 'bundeswehr': 'defense', 'rüstung': 'defense', 'krieg': 'defense',
  // Immigration (~4)
  'migration': 'immigration', 'flüchtling': 'immigration', 'asyl': 'immigration', 'einwanderung': 'immigration',
  // Science (~4)
  'wissenschaft': 'science', 'forschung': 'science', 'studie': 'science', 'entdeckung': 'science',
  // Entertainment (~4)
  'unterhaltung': 'entertainment', 'film': 'entertainment', 'serie': 'entertainment', 'musik': 'entertainment',
  // Finance (~5)
  'börse': 'finance', 'aktie': 'finance', 'zinsen': 'finance', 'bank': 'finance', 'anleger': 'finance',
  // Labor (~5)
  'arbeit': 'labor', 'gewerkschaft': 'labor', 'streik': 'labor', 'lohn': 'labor', 'gehalt': 'labor',
  // Environment (~4)
  'umwelt': 'environment', 'naturschutz': 'environment', 'verschmutzung': 'environment', 'recycling': 'environment',
  // Diplomacy (~3)
  'außenpolitik': 'diplomacy', 'botschafter': 'diplomacy', 'gipfel': 'diplomacy',
  // Religion (~3)
  'kirche': 'religion', 'moschee': 'religion', 'glaube': 'religion',
  // Social (~4)
  'gesellschaft': 'social', 'gleichberechtigung': 'social', 'diskriminierung': 'social', 'protest': 'social',
  // Media (~3)
  'presse': 'media', 'journalist': 'media', 'berichterstattung': 'media',
  // Legal (~4)
  'gericht': 'legal', 'urteil': 'legal', 'gesetz': 'legal', 'richter': 'legal',
};
