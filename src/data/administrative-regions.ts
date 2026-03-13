// src/data/administrative-regions.ts

export interface AdminRegion {
  name: string;
  country: string;  // lowercase ISO 2-letter code — must match article.country
  lat: number;
  lng: number;
  major: boolean;
}

export const ADMIN_REGIONS: AdminRegion[] = [
  // France — 13 metropolitan regions
  { name: 'Île-de-France', country: 'fr', lat: 48.8566, lng: 2.3522, major: true },
  { name: 'Auvergne-Rhône-Alpes', country: 'fr', lat: 45.7640, lng: 4.8357, major: true },
  { name: 'Provence-Alpes-Côte d\'Azur', country: 'fr', lat: 43.2965, lng: 5.3698, major: true },
  { name: 'Occitanie', country: 'fr', lat: 43.6047, lng: 1.4442, major: true },
  { name: 'Nouvelle-Aquitaine', country: 'fr', lat: 44.8378, lng: -0.5792, major: true },
  { name: 'Hauts-de-France', country: 'fr', lat: 50.6292, lng: 3.0573, major: true },
  { name: 'Grand Est', country: 'fr', lat: 48.5734, lng: 7.7521, major: false },
  { name: 'Pays de la Loire', country: 'fr', lat: 47.2184, lng: -1.5536, major: false },
  { name: 'Bretagne', country: 'fr', lat: 48.1173, lng: -1.6778, major: false },
  { name: 'Normandie', country: 'fr', lat: 49.4432, lng: 1.0999, major: false },
  { name: 'Bourgogne-Franche-Comté', country: 'fr', lat: 47.3220, lng: 5.0415, major: false },
  { name: 'Centre-Val de Loire', country: 'fr', lat: 47.9029, lng: 1.9093, major: false },
  { name: 'Corse', country: 'fr', lat: 41.9192, lng: 8.7386, major: false },
];
