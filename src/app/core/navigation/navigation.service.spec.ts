import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
  let locationBackSpy: ReturnType<typeof vi.fn>;

  function setup(): NavigationService {
    locationBackSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Location, useValue: { back: locationBackSpy } }],
    });

    return TestBed.inject(NavigationService);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should go back via Location when the tab has history to go back to', () => {
    const service = setup();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(2);

    service.goBackOr(['/home']);

    expect(locationBackSpy).toHaveBeenCalledTimes(1);
  });

  it('should navigate to the fallback route instead when there is no history to go back to', () => {
    const service = setup();
    vi.spyOn(window.history, 'length', 'get').mockReturnValue(1);
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    service.goBackOr(['/home']);

    expect(navigateSpy).toHaveBeenCalledWith(['/home']);
    expect(locationBackSpy).not.toHaveBeenCalled();
  });
});
