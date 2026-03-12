export interface GeoReach {
  name: string;
  lat: number;
  lng: number;
}

export interface MediaOutlet {
  name: string;
  country: string;
  domain: string;
  type: 'local' | 'regional' | 'national' | 'international';
  reach: GeoReach[];
  audienceScale: 'small' | 'medium' | 'large';
  primaryTopics: string[];
}
