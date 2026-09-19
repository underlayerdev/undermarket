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
   * Whether this account has completed the onboarding wizard. Optional
   * because it's fundamentally a Firestore-profile concept, not an Auth
   * one — AuthProvider's Auth-derived User (currentUser(), login/register
   * results) never sets it, only FirestoreUserRepository does. Set to
   * false by the onUserCreate Cloud Function when the doc is first
   * created, flipped to true by the wizard on completion. Absent
   * (pre-feature accounts) is treated as onboarded, see
   * isFullyOnboarded() in user-display.ts.
   */
  onboarded?: boolean;
  /**
   * Present only while the user has opted in to showing it — absent (not
   * just hidden) is how "off" is represented, so there's nothing to leak to
   * a direct Firestore read even though users/{userId} is publicly
   * readable. Set/cleared together as one toggle in settings.
   */
  profileCity?: PublicCityInfo;
}
