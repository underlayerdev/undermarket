import { TestBed } from '@angular/core/testing';
import { MercadoLibreService } from './mercado-libre.service';
import { MERCADO_LIBRE_PROVIDER } from '../../core/configuration/tokens';

describe('MercadoLibreService', () => {
  function setup(providerOverrides: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: MERCADO_LIBRE_PROVIDER,
          useValue: {
            startAuth: vi.fn().mockResolvedValue({ authUrl: 'https://auth.mercadolibre.com.ar/x' }),
            getStatus: vi.fn().mockResolvedValue({
              connected: true,
              lastImportAt: 123,
              importedCount: 2,
            }),
            importListings: vi.fn().mockResolvedValue({ importedCount: 3, skippedCount: 1 }),
            ...providerOverrides,
          },
        },
      ],
    });
    return TestBed.inject(MercadoLibreService);
  }

  it('should fetch and expose the status', async () => {
    const service = setup();

    await service.refreshStatus();

    expect(service.status()).toEqual({ connected: true, lastImportAt: 123, importedCount: 2 });
  });

  it('should navigate to the returned auth URL and reset connecting when done', async () => {
    const service = setup();
    let assignedHref = '';
    Object.defineProperty(window, 'location', {
      value: {
        get href() {
          return assignedHref;
        },
        set href(value: string) {
          assignedHref = value;
        },
      },
      writable: true,
    });

    const connectPromise = service.connect();
    expect(service.connecting()).toBe(true);
    await connectPromise;

    expect(assignedHref).toBe('https://auth.mercadolibre.com.ar/x');
    expect(service.connecting()).toBe(false);
  });

  it('should reset connecting even if starting auth fails', async () => {
    const service = setup({ startAuth: vi.fn().mockRejectedValue(new Error('network down')) });

    await expect(service.connect()).rejects.toThrow('network down');

    expect(service.connecting()).toBe(false);
  });

  it('should import listings, refresh status, and reset importing when done', async () => {
    const service = setup();

    const result = await service.importListings();

    expect(result).toEqual({ importedCount: 3, skippedCount: 1 });
    expect(service.status()?.connected).toBe(true);
    expect(service.importing()).toBe(false);
  });
});
