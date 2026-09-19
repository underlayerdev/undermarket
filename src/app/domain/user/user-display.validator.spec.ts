import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { validateDisplayName } from './user-display.validator';
import { DISPLAY_NAME_MAX_LENGTH, DISPLAY_NAME_MIN_LENGTH } from './user-constraints';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('validateDisplayName', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    transloco = TestBed.inject(TranslocoService);
  });

  it('should return null for a valid display name', () => {
    expect(validateDisplayName('Jane Doe', transloco)).toBeNull();
  });

  it('should trim before validating', () => {
    expect(validateDisplayName('  Jane Doe  ', transloco)).toBeNull();
  });

  it('should reject an empty or whitespace-only name', () => {
    expect(validateDisplayName('   ', transloco)).toBe('Display name is required.');
  });

  it('should reject a name shorter than the minimum length', () => {
    const name = 'a'.repeat(DISPLAY_NAME_MIN_LENGTH - 1);
    expect(validateDisplayName(name, transloco)).toContain('at least');
  });

  it('should accept a name at exactly the minimum length', () => {
    const name = 'a'.repeat(DISPLAY_NAME_MIN_LENGTH);
    expect(validateDisplayName(name, transloco)).toBeNull();
  });

  it('should reject a name over the maximum length', () => {
    const name = 'a'.repeat(DISPLAY_NAME_MAX_LENGTH + 1);
    expect(validateDisplayName(name, transloco)).toContain('at most');
  });

  it('should accept a name at exactly the maximum length', () => {
    const name = 'a'.repeat(DISPLAY_NAME_MAX_LENGTH);
    expect(validateDisplayName(name, transloco)).toBeNull();
  });
});
