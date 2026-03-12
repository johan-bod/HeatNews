import type { Topic } from '@/data/keywords/taxonomy';

export interface PreferenceLocation {
  name: string;       // Display name: "Paris", "Tokyo", "Brazil"
  key: string;        // Geocoding key: "paris", "tokyo", "brazil"
  lat: number;
  lng: number;
  type: 'city' | 'country' | 'region';
}

export interface UserPreferences {
  topics: Topic[];                    // Selected topics (max 10)
  locations: PreferenceLocation[];    // Selected locations (max 5)
  onboardingComplete: boolean;
  updatedAt: number;                  // Timestamp
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  topics: [],
  locations: [],
  onboardingComplete: false,
  updatedAt: Date.now(),
};
