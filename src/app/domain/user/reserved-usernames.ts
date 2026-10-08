// Handles nobody can claim. Mirrored in functions/src/users/username.ts,
// which is the actual enforcement — this copy only lets the settings form
// say "not available" before a round trip.
//
// Three groups: top-level route segments (so /u/<handle> links and any
// future /<handle> shortcut can never shadow a real page), staff/brand names
// (so nobody can pose as the platform), and a premium pool held back on
// purpose — short and high-value generic handles kept off the free tier.
export const RESERVED_USERNAMES: ReadonlySet<string> = new Set([
  // Routes
  'api',
  'discover',
  'forgot-password',
  'home',
  'listings',
  'login',
  'logout',
  'new',
  'onboarding',
  'profile',
  'register',
  'reset-password',
  'search',
  'settings',
  'u',
  // Staff / brand
  'admin',
  'administrator',
  'help',
  'moderator',
  'official',
  'root',
  'security',
  'staff',
  'support',
  'system',
  'team',
  'underlayer',
  'undermarket',
  // Premium pool
  'buy',
  'deals',
  'free',
  'market',
  'sale',
  'sell',
  'shop',
  'store',
]);
