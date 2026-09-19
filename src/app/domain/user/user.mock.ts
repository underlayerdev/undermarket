import { User } from './user.model';

export function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    settings: { language: 'en' },
    providerId: 'password',
    createdAt: new Date(),
    onboarded: true,
    ...overrides,
  };
}
