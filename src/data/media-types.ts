export interface GeoReach {
  name: string;
  lat: number;
  lng: number;
}

export type CredibilityTier = 'reference' | 'established' | 'regional' | 'hyperlocal' | 'niche' | 'unreliable';

export interface MediaOutlet {
  name: string;
  country: string;
  domain: string;
  type: 'local' | 'regional' | 'national' | 'international';
  reach: GeoReach[];
  audienceScale: 'small' | 'medium' | 'large';
  primaryTopics: string[];
  credibilityTier?: CredibilityTier;
}
