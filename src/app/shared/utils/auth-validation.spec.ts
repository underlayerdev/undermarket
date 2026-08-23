import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import {
  isValidEmail,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from './auth-validation';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

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

describe('validateEmail / validatePassword / validateConfirmPassword', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    transloco = TestBed.inject(TranslocoService);
  });

  describe('validateEmail', () => {
    it('should return a message for an empty value', () => {
      expect(validateEmail('', transloco)).toBe('Email is required.');
    });

    it('should return a message for an invalid format', () => {
      expect(validateEmail('not-an-email', transloco)).toBe('Please enter a valid email address.');
    });

    it('should return null for a valid email', () => {
      expect(validateEmail('user@example.com', transloco)).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return a message for an empty value', () => {
      expect(validatePassword('', transloco)).toBe('Password is required.');
    });

    it('should return a message for a value under the minimum length', () => {
      expect(validatePassword('abc', transloco)).toBe('Password must be at least 6 characters.');
    });

    it('should return null for a valid password', () => {
      expect(validatePassword('abcdef', transloco)).toBeNull();
    });
  });

  describe('validateConfirmPassword', () => {
    it('should return a message for an empty value', () => {
      expect(validateConfirmPassword('', 'abcdef', transloco)).toBe('Please confirm your password.');
    });

    it('should return a message when the values do not match', () => {
      expect(validateConfirmPassword('abcdez', 'abcdef', transloco)).toBe(
        'Passwords do not match.',
      );
    });

    it('should return null when the values match', () => {
      expect(validateConfirmPassword('abcdef', 'abcdef', transloco)).toBeNull();
    });
  });
});
