import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { LocaleDatePipe } from './locale-date.pipe';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('LocaleDatePipe', () => {
  const date = new Date('2024-03-15T10:00:00Z');
  let transloco: TranslocoService;
  let pipe: LocaleDatePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    transloco = TestBed.inject(TranslocoService);
    pipe = TestBed.runInInjectionContext(() => new LocaleDatePipe());
  });

  it('should format a medium date in English by default', () => {
    expect(pipe.transform(date)).toBe('Mar 15, 2024');
  });

  it('should format the same date in Spanish after a language switch', () => {
    transloco.setActiveLang('es');
    expect(pipe.transform(date)).toBe('15 mar 2024');
  });

  it('should accept a custom date-fns pattern', () => {
    expect(pipe.transform(date, 'yyyy-MM-dd')).toBe('2024-03-15');
  });

  it('should return an empty string for null, undefined, and invalid dates', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(new Date('not a date'))).toBe('');
  });

  it('should fall back to English for a language with no registered locale', () => {
    transloco.setActiveLang('de');
    expect(pipe.transform(date)).toBe('Mar 15, 2024');
  });
});
