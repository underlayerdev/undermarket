export type UserId = string;

export type AuthProviderId = 'password' | 'google.com' | 'apple.com' | 'facebook.com' | 'anonymous';

export interface UserSettings {
  language: string;
}

/**
 * A city-level location shown publicly on a profile — deliberately lighter
 * than domain/location's LocationArea (no latitude/longitude/geohash): this
 * is for display only, never for distance queries, so there's no reason to
 * store coordinates for it at all.
 */
export interface PublicCityInfo {
  displayName: string;
  city: string;
  region: string;
  countryCode: string;
}

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  photoUrl?: string;
  settings: UserSettings;
  providerId: AuthProviderId;
  createdAt: Date;
  /**
   * Present only while the user has opted in to showing it — absent (not
   * just hidden) is how "off" is represented, so there's nothing to leak to
   * a direct Firestore read even though users/{userId} is publicly
   * readable. Set/cleared together as one toggle in settings.
   */
  profileCity?: PublicCityInfo;
}
