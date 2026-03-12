import type { Topic } from './taxonomy';

export const IT_KEYWORDS: Record<string, Topic> = {
  // Politics (~8)
  'elezione': 'politics', 'elezioni': 'politics', 'governo': 'politics',
  'parlamento': 'politics', 'presidente': 'politics', 'partito': 'politics',
  'senato': 'politics', 'votazione': 'politics',
  // Economy (~6)
  'economia': 'economy', 'disoccupazione': 'economy', 'impresa': 'economy',
  'commercio': 'economy', 'crescita': 'economy', 'tasse': 'economy',
  // Technology (~5)
  'tecnologia': 'technology', 'intelligenza artificiale': 'technology',
  'digitale': 'technology', 'innovazione': 'technology', 'informatica': 'technology',
  // Climate (~4)
  'cambiamento climatico': 'climate', 'riscaldamento': 'climate', 'emissioni': 'climate', 'siccità': 'climate',
  // Sports (~5)
  'sport': 'sports', 'calcio': 'sports', 'serie a': 'sports',
  'campionato': 'sports', 'squadra': 'sports',
  // Health (~5)
  'salute': 'health', 'ospedale': 'health', 'vaccino': 'health',
  'medico': 'health', 'malattia': 'health',
  // Education (~4)
  'istruzione': 'education', 'università': 'education', 'scuola': 'education', 'studente': 'education',
  // Culture (~4)
  'cultura': 'culture', 'museo': 'culture', 'mostra': 'culture', 'patrimonio': 'culture',
  // Crime (~5)
  'crimine': 'crime', 'polizia': 'crime', 'reato': 'crime',
  'omicidio': 'crime', 'furto': 'crime',
  // Energy (~4)
  'energia': 'energy', 'petrolio': 'energy', 'rinnovabile': 'energy', 'nucleare': 'energy',
  // Transport (~4)
  'trasporto': 'transport', 'treno': 'transport', 'aeroporto': 'transport', 'autostrada': 'transport',
  // Housing (~4)
  'abitazione': 'housing', 'affitto': 'housing', 'mutuo': 'housing', 'edilizia': 'housing',
  // Agriculture (~3)
  'agricoltura': 'agriculture', 'raccolto': 'agriculture', 'allevamento': 'agriculture',
  // Defense (~4)
  'difesa': 'defense', 'esercito': 'defense', 'guerra': 'defense', 'militare': 'defense',
  // Immigration (~4)
  'immigrazione': 'immigration', 'rifugiato': 'immigration', 'frontiera': 'immigration', 'migrazione': 'immigration',
  // Science (~4)
  'scienza': 'science', 'ricerca': 'science', 'scoperta': 'science', 'laboratorio': 'science',
  // Entertainment (~4)
  'intrattenimento': 'entertainment', 'film': 'entertainment', 'serie': 'entertainment', 'concerto': 'entertainment',
  // Finance (~5)
  'borsa': 'finance', 'investimento': 'finance', 'banca': 'finance', 'azioni': 'finance', 'interesse': 'finance',
  // Labor (~5)
  'lavoro': 'labor', 'sindacato': 'labor', 'sciopero': 'labor', 'stipendio': 'labor', 'occupazione': 'labor',
  // Environment (~4)
  'ambiente': 'environment', 'inquinamento': 'environment', 'riciclaggio': 'environment', 'sostenibilità': 'environment',
  // Diplomacy (~3)
  'diplomazia': 'diplomacy', 'ambasciatore': 'diplomacy', 'vertice': 'diplomacy',
  // Religion (~3)
  'chiesa': 'religion', 'moschea': 'religion', 'religione': 'religion',
  // Social (~4)
  'società': 'social', 'uguaglianza': 'social', 'discriminazione': 'social', 'protesta': 'social',
  // Media (~3)
  'stampa': 'media', 'giornalista': 'media', 'giornalismo': 'media',
  // Legal (~4)
  'tribunale': 'legal', 'sentenza': 'legal', 'legge': 'legal', 'giudice': 'legal',
};
