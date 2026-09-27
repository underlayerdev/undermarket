import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { NavigationService } from './navigation.service';

describe('NavigationService', () => {
  let locationBackSpy: ReturnType<typeof vi.fn>;
  let getStateSpy: ReturnType<typeof vi.fn>;

  function setup(): NavigationService {
    locationBackSpy = vi.fn();
    getStateSpy = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Location, useValue: { back: locationBackSpy, getState: getStateSpy } },
      ],
    });

    return TestBed.inject(NavigationService);
  }

  it('should go back via Location when the Router has navigated before in this tab', () => {
    const service = setup();
    getStateSpy.mockReturnValue({ navigationId: 2 });

    service.goBackOr(['/home']);

    expect(locationBackSpy).toHaveBeenCalledTimes(1);
  });

  it('should go back via Location when the history state has no navigationId at all', () => {
    const service = setup();
    getStateSpy.mockReturnValue(null);

    service.goBackOr(['/home']);

    expect(locationBackSpy).toHaveBeenCalledTimes(1);
  });

  it('should navigate to the fallback route instead when this is the very first navigation in the tab', () => {
    const service = setup();
    getStateSpy.mockReturnValue({ navigationId: 1 });
    const navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    service.goBackOr(['/home']);

    expect(navigateSpy).toHaveBeenCalledWith(['/home']);
    expect(locationBackSpy).not.toHaveBeenCalled();
  });
});
