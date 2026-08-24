export type UserId = string;

export type AuthProviderId = 'password' | 'google.com' | 'apple.com' | 'facebook.com' | 'anonymous';

export interface UserSettings {
  language: string;
}

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  photoUrl?: string;
  settings: UserSettings;
  providerId: AuthProviderId;
  createdAt: Date;
}
