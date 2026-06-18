export type UserId = string;

export interface UserSettings {
  theme: 'light' | 'dark';
  language: string;
}

export interface User {
  id: UserId;
  email: string;
  displayName: string;
  photoUrl?: string;
  settings: UserSettings;
  createdAt: Date;
}
