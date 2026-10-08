import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';
import { validateUsername } from './username.validator';

describe('validateUsername', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    transloco = TestBed.inject(TranslocoService);
  });

  it('should return null for a valid username', () => {
    expect(validateUsername('jane.doe', transloco)).toBeNull();
  });

  it('should return the required message for an empty value', () => {
    expect(validateUsername('', transloco)).toBe('Username is required.');
  });

  it('should interpolate the length limits', () => {
    expect(validateUsername('ab', transloco)).toBe('Username must be at least 3 characters.');
    expect(validateUsername('a'.repeat(21), transloco)).toBe(
      'Username must be at most 20 characters.',
    );
  });

  it('should flag a reserved username', () => {
    expect(validateUsername('admin', transloco)).toBe('That username is reserved.');
  });
});
