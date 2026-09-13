import { TestBed } from '@angular/core/testing';
import { BrowserGeolocationProvider } from './browser-geolocation.provider';
import { GeolocationError } from '../../domain/location/geolocation.provider';

describe('BrowserGeolocationProvider', () => {
  let originalDescriptor: PropertyDescriptor | undefined;

  function createProvider(): BrowserGeolocationProvider {
    TestBed.configureTestingModule({});
    return TestBed.inject(BrowserGeolocationProvider);
  }

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(navigator, 'geolocation', originalDescriptor);
    } else {
      delete (navigator as { geolocation?: Geolocation }).geolocation;
    }
  });

  function mockGeolocation(value: Partial<Geolocation> | null): void {
    originalDescriptor = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    if (value === null) {
      delete (navigator as { geolocation?: Geolocation }).geolocation;
    } else {
      Object.defineProperty(navigator, 'geolocation', { value, configurable: true });
    }
  }

  it('should resolve the current coordinate on success', async () => {
    mockGeolocation({
      getCurrentPosition: (success) => {
        success({ coords: { latitude: -34.6, longitude: -58.4 } } as GeolocationPosition);
      },
    });
    const provider = createProvider();

    const point = await provider.getCurrentPosition();

    expect(point).toEqual({ latitude: -34.6, longitude: -58.4 });
  });

  it('should reject with a permission-denied GeolocationError', async () => {
    mockGeolocation({
      getCurrentPosition: (_success, error) => {
        error!({ code: 1 } as GeolocationPositionError);
      },
    });
    const provider = createProvider();

    await expect(provider.getCurrentPosition()).rejects.toMatchObject(
      new GeolocationError('permission-denied'),
    );
  });

  it('should reject with a position-unavailable GeolocationError', async () => {
    mockGeolocation({
      getCurrentPosition: (_success, error) => {
        error!({ code: 2 } as GeolocationPositionError);
      },
    });
    const provider = createProvider();

    await expect(provider.getCurrentPosition()).rejects.toMatchObject(
      new GeolocationError('position-unavailable'),
    );
  });

  it('should reject with a timeout GeolocationError', async () => {
    mockGeolocation({
      getCurrentPosition: (_success, error) => {
        error!({ code: 3 } as GeolocationPositionError);
      },
    });
    const provider = createProvider();

    await expect(provider.getCurrentPosition()).rejects.toMatchObject(
      new GeolocationError('timeout'),
    );
  });

  it('should reject with an unsupported GeolocationError when geolocation is unavailable', async () => {
    mockGeolocation(null);
    const provider = createProvider();

    await expect(provider.getCurrentPosition()).rejects.toMatchObject(
      new GeolocationError('unsupported'),
    );
  });
});
