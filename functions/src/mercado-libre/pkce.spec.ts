import { describe, expect, it } from 'vitest';
import { generateCodeChallenge, generateCodeVerifier, generateState } from './pkce';

describe('pkce', () => {
  it('should generate URL-safe, unpadded base64 strings', () => {
    const values = [generateState(), generateCodeVerifier(), generateCodeChallenge('x')];

    for (const value of values) {
      expect(value).not.toMatch(/[+/=]/);
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('should generate a different state/verifier on every call', () => {
    expect(generateState()).not.toBe(generateState());
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
  });

  it('should derive the same challenge from the same verifier (S256)', () => {
    const verifier = generateCodeVerifier();

    expect(generateCodeChallenge(verifier)).toBe(generateCodeChallenge(verifier));
  });

  it('should derive different challenges from different verifiers', () => {
    expect(generateCodeChallenge('verifier-a')).not.toBe(generateCodeChallenge('verifier-b'));
  });
});
