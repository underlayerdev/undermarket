import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { RelativeTimePipe } from './relative-time.pipe';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('RelativeTimePipe', () => {
  const now = new Date('2026-08-18T12:00:00Z');
  let transloco: TranslocoService;
  let pipe: RelativeTimePipe;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    transloco = TestBed.inject(TranslocoService);
    pipe = TestBed.runInInjectionContext(() => new RelativeTimePipe());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show "just now" for a time within a few seconds (clock drift)', () => {
    expect(pipe.transform(new Date(now.getTime() - 2 * 1000))).toBe('just now');
  });

  it('should show "just now" for a time slightly in the future (clock drift)', () => {
    expect(pipe.transform(new Date(now.getTime() + 2 * 1000))).toBe('just now');
  });

  it('should format seconds ago', () => {
    expect(pipe.transform(new Date(now.getTime() - 30 * 1000))).toBe('30 seconds ago');
  });

  it('should format minutes ago', () => {
    expect(pipe.transform(new Date(now.getTime() - 5 * 60 * 1000))).toBe('5 minutes ago');
  });

  it('should format hours ago', () => {
    expect(pipe.transform(new Date(now.getTime() - 3 * 60 * 60 * 1000))).toBe('3 hours ago');
  });

  it('should format days ago', () => {
    expect(pipe.transform(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000))).toBe('2 days ago');
  });

  it('should format a future time', () => {
    expect(pipe.transform(new Date(now.getTime() + 10 * 60 * 1000))).toBe('in 10 minutes');
  });

  it('should return an empty string for a null value', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return an empty string for an invalid date', () => {
    expect(pipe.transform(new Date('invalid'))).toBe('');
  });

  it('should format using the Spanish date-fns locale when the active language is "es"', () => {
    transloco.setActiveLang('es');
    expect(pipe.transform(new Date(now.getTime() - 5 * 60 * 1000))).toBe('hace 5 minutos');
  });
});
