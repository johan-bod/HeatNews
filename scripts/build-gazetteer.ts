import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface GazetteerEntry {
  name: string;
  lat: number;
  lng: number;
  country: string;
  pop: number;
}

interface GazetteerLookup {
  [normalizedName: string]: GazetteerEntry[];
}

/**
 * Remove diacritics for ASCII-folded matching.
 * "München" → "munchen", "São Paulo" → "sao paulo"
 */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parse a GeoNames TSV file.
 * Format: geonameid \t name \t asciiname \t alternatenames \t latitude \t longitude \t
 *   feature_class \t feature_code \t country_code \t cc2 \t admin1 \t admin2 \t
 *   admin3 \t admin4 \t population \t elevation \t dem \t timezone \t modification_date
 */
function parseGeoNamesTSV(filePath: string, maxAlternates = 5): GazetteerLookup {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  const lookup: GazetteerLookup = {};

  for (const line of lines) {
    const fields = line.split('\t');
    if (fields.length < 19) continue;

    const name = fields[1];
    const asciiName = fields[2];
    const alternateNames = fields[3];
    const lat = parseFloat(fields[4]);
    const lng = parseFloat(fields[5]);
    const countryCode = fields[8].toLowerCase();
    const population = parseInt(fields[14], 10) || 0;

    if (!name || isNaN(lat) || isNaN(lng)) continue;

    const entry: GazetteerEntry = {
      name,
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
      country: countryCode,
      pop: population,
    };

    // Index by normalized primary name
    const normalizedName = normalize(name);
    if (!lookup[normalizedName]) lookup[normalizedName] = [];
    lookup[normalizedName].push(entry);

    // Index by ASCII name if different
    const normalizedAscii = normalize(asciiName);
    if (normalizedAscii && normalizedAscii !== normalizedName) {
      if (!lookup[normalizedAscii]) lookup[normalizedAscii] = [];
      lookup[normalizedAscii].push(entry);
    }

    // Index by common alternate names (limit to avoid bloat)
    if (alternateNames) {
      const alts = alternateNames.split(',').slice(0, maxAlternates);
      for (const alt of alts) {
        const normalizedAlt = normalize(alt);
        if (
          normalizedAlt &&
          normalizedAlt.length >= 3 &&
          normalizedAlt !== normalizedName &&
          normalizedAlt !== normalizedAscii
        ) {
          if (!lookup[normalizedAlt]) lookup[normalizedAlt] = [];
          lookup[normalizedAlt].push(entry);
        }
      }
    }
  }

  // Sort entries by population descending for each key
  for (const key of Object.keys(lookup)) {
    lookup[key].sort((a, b) => b.pop - a.pop);
  }

  return lookup;
}

// --- Main ---

const GEONAMES_DIR = join(import.meta.dirname, 'geonames-data');
const PUBLIC_DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');

mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

console.log('Building core gazetteer (cities15000)...');
const coreLookup = parseGeoNamesTSV(join(GEONAMES_DIR, 'cities15000.txt'), 5);
const coreKeys = Object.keys(coreLookup);
console.log(`  ${coreKeys.length} unique name keys`);

writeFileSync(
  join(PUBLIC_DATA_DIR, 'gazetteer-core.json'),
  JSON.stringify(coreLookup),
  'utf-8'
);
console.log('  → public/data/gazetteer-core.json');

console.log('Building extended gazetteer (cities1000)...');
const extendedLookup = parseGeoNamesTSV(join(GEONAMES_DIR, 'cities1000.txt'), 5);
const extKeys = Object.keys(extendedLookup);
console.log(`  ${extKeys.length} unique name keys`);

writeFileSync(
  join(PUBLIC_DATA_DIR, 'gazetteer-extended.json'),
  JSON.stringify(extendedLookup),
  'utf-8'
);
console.log('  → public/data/gazetteer-extended.json');

console.log('Done!');
