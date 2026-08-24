import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { settingsIndexGuard } from './settings-index.guard';

describe('settingsIndexGuard', () => {
  let createUrlTreeSpy: ReturnType<typeof vi.fn>;
  let originalInnerWidth: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    createUrlTreeSpy = vi.fn().mockReturnValue('url-tree');
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { createUrlTree: createUrlTreeSpy } }],
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true });
  });

  function runGuard() {
    return TestBed.runInInjectionContext(() => settingsIndexGuard({} as never, {} as never));
  }

  it('should redirect to /settings/account on desktop widths', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });

    const result = runGuard();

    expect(createUrlTreeSpy).toHaveBeenCalledWith(['/settings/account']);
    expect(result).toBe('url-tree');
  });

  it('should allow the index route to render on mobile widths', () => {
    Object.defineProperty(window, 'innerWidth', { value: 480, configurable: true });

    const result = runGuard();

    expect(createUrlTreeSpy).not.toHaveBeenCalled();
    expect(result).toBe(true);
  });
});
