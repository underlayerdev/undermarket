import {
  isValidEmail,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from './auth-validation';

describe('isValidEmail', () => {
  it('should accept a well-formed email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it('should reject an empty or whitespace-only value', () => {
    expect(isValidEmail('   ')).toBe(false);
  });

  it('should reject a value without an @', () => {
    expect(isValidEmail('user.example.com')).toBe(false);
  });
});

describe('validateEmail', () => {
  it('should return a message for an empty value', () => {
    expect(validateEmail('')).toBe('Email is required.');
  });

  it('should return a message for an invalid format', () => {
    expect(validateEmail('not-an-email')).toBe('Please enter a valid email address.');
  });

  it('should return null for a valid email', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('should return a message for an empty value', () => {
    expect(validatePassword('')).toBe('Password is required.');
  });

  it('should return a message for a value under the minimum length', () => {
    expect(validatePassword('abc')).toBe('Password must be at least 6 characters.');
  });

  it('should return null for a valid password', () => {
    expect(validatePassword('abcdef')).toBeNull();
  });
});

describe('validateConfirmPassword', () => {
  it('should return a message for an empty value', () => {
    expect(validateConfirmPassword('', 'abcdef')).toBe('Please confirm your password.');
  });

  it('should return a message when the values do not match', () => {
    expect(validateConfirmPassword('abcdez', 'abcdef')).toBe('Passwords do not match.');
  });

  it('should return null when the values match', () => {
    expect(validateConfirmPassword('abcdef', 'abcdef')).toBeNull();
  });
});
