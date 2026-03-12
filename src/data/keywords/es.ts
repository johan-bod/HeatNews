import type { Topic } from './taxonomy';

export const ES_KEYWORDS: Record<string, Topic> = {
  // Politics (~8)
  'elección': 'politics', 'elecciones': 'politics', 'gobierno': 'politics',
  'congreso': 'politics', 'presidente': 'politics', 'partido': 'politics',
  'senado': 'politics', 'votación': 'politics',
  // Economy (~6)
  'economía': 'economy', 'desempleo': 'economy', 'empresa': 'economy',
  'comercio': 'economy', 'crecimiento': 'economy', 'impuesto': 'economy',
  // Technology (~5)
  'tecnología': 'technology', 'inteligencia artificial': 'technology',
  'digital': 'technology', 'aplicación': 'technology', 'innovación': 'technology',
  // Climate (~4)
  'cambio climático': 'climate', 'calentamiento': 'climate', 'emisiones': 'climate', 'sequía': 'climate',
  // Sports (~5)
  'deporte': 'sports', 'fútbol': 'sports', 'liga': 'sports',
  'campeonato': 'sports', 'selección': 'sports',
  // Health (~5)
  'salud': 'health', 'hospital': 'health', 'vacuna': 'health',
  'médico': 'health', 'enfermedad': 'health',
  // Education (~4)
  'educación': 'education', 'universidad': 'education', 'escuela': 'education', 'estudiante': 'education',
  // Culture (~4)
  'cultura': 'culture', 'museo': 'culture', 'festival': 'culture', 'patrimonio': 'culture',
  // Crime (~5)
  'crimen': 'crime', 'policía': 'crime', 'delito': 'crime',
  'asesinato': 'crime', 'robo': 'crime',
  // Energy (~4)
  'energía': 'energy', 'petróleo': 'energy', 'renovable': 'energy', 'eólica': 'energy',
  // Transport (~4)
  'transporte': 'transport', 'tren': 'transport', 'aeropuerto': 'transport', 'autopista': 'transport',
  // Housing (~4)
  'vivienda': 'housing', 'alquiler': 'housing', 'hipoteca': 'housing', 'construcción': 'housing',
  // Agriculture (~3)
  'agricultura': 'agriculture', 'cosecha': 'agriculture', 'ganadería': 'agriculture',
  // Defense (~4)
  'defensa': 'defense', 'ejército': 'defense', 'guerra': 'defense', 'militar': 'defense',
  // Immigration (~4)
  'inmigración': 'immigration', 'refugiado': 'immigration', 'frontera': 'immigration', 'migración': 'immigration',
  // Science (~4)
  'ciencia': 'science', 'investigación': 'science', 'descubrimiento': 'science', 'laboratorio': 'science',
  // Entertainment (~4)
  'entretenimiento': 'entertainment', 'película': 'entertainment', 'serie': 'entertainment', 'concierto': 'entertainment',
  // Finance (~5)
  'bolsa': 'finance', 'inversión': 'finance', 'banco': 'finance', 'acciones': 'finance', 'interés': 'finance',
  // Labor (~5)
  'trabajo': 'labor', 'sindicato': 'labor', 'huelga': 'labor', 'sueldo': 'labor', 'empleo': 'labor',
  // Environment (~4)
  'medio ambiente': 'environment', 'contaminación': 'environment', 'reciclaje': 'environment', 'deforestación': 'environment',
  // Diplomacy (~3)
  'diplomacia': 'diplomacy', 'embajador': 'diplomacy', 'cumbre': 'diplomacy',
  // Religion (~3)
  'iglesia': 'religion', 'mezquita': 'religion', 'religión': 'religion',
  // Social (~4)
  'sociedad': 'social', 'igualdad': 'social', 'discriminación': 'social', 'protesta': 'social',
  // Media (~3)
  'prensa': 'media', 'periodista': 'media', 'periodismo': 'media',
  // Legal (~4)
  'tribunal': 'legal', 'sentencia': 'legal', 'ley': 'legal', 'juez': 'legal',
};
