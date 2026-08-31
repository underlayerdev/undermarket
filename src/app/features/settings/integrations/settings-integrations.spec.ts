import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { SettingsIntegrationsComponent } from './settings-integrations';
import { AuthService } from '../../../application/services/auth.service';
import { ListingService } from '../../../application/services/listing.service';
import { MercadoLibreService } from '../../../application/services/mercado-libre.service';
import { LISTING_REPOSITORY } from '../../../core/configuration/tokens';
import type { Listing } from '../../../domain/listing/listing.model';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

function draftListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    ownerId: 'uid-1',
    title: 'Imported chair',
    description: 'A nice chair.',
    price: 1000,
    currency: 'ARS',
    category: 'Furniture',
    imageUrls: [],
    status: 'draft',
    sourceProvider: 'mercadolibre',
    sourceId: 'ML1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SettingsIntegrationsComponent', () => {
  let refreshStatusSpy: ReturnType<typeof vi.fn>;
  let connectSpy: ReturnType<typeof vi.fn>;
  let importListingsSpy: ReturnType<typeof vi.fn>;
  let updateSpy: ReturnType<typeof vi.fn>;
  let getByOwnerSpy: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.fn>;

  function setup(
    queryParams: Record<string, string> = {},
    { connected = false }: { connected?: boolean } = {},
  ) {
    refreshStatusSpy = vi.fn().mockResolvedValue(undefined);
    connectSpy = vi.fn().mockResolvedValue(undefined);
    importListingsSpy = vi.fn().mockResolvedValue({ importedCount: 1, skippedCount: 0 });
    updateSpy = vi.fn().mockResolvedValue(undefined);
    getByOwnerSpy = vi.fn().mockResolvedValue([draftListing()]);
    navigateSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [SettingsIntegrationsComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: MercadoLibreService,
          useValue: {
            status: () =>
              connected ? { connected: true, lastImportAt: null, importedCount: 0 } : null,
            connecting: () => false,
            importing: () => false,
            refreshStatus: refreshStatusSpy,
            connect: connectSpy,
            importListings: importListingsSpy,
          },
        },
        { provide: LISTING_REPOSITORY, useValue: { getByOwner: getByOwnerSpy } },
        { provide: ListingService, useValue: { update: updateSpy } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'uid-1' }) } },
        { provide: Router, useValue: { navigate: navigateSpy } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(SettingsIntegrationsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should refresh status on init even with no query params', async () => {
    const fixture = setup();
    await fixture.whenStable();

    expect(refreshStatusSpy).toHaveBeenCalled();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('should clear the connected query param after showing the success toast', async () => {
    const fixture = setup({ connected: 'true' });
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {},
      replaceUrl: true,
    });
    expect(refreshStatusSpy).toHaveBeenCalled();
  });

  it('should clear the error query param after showing the error toast', async () => {
    const fixture = setup({ error: 'token_exchange_failed' });
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: {},
      replaceUrl: true,
    });
  });

  it('should call connect() when the connect button is clicked', async () => {
    const fixture = setup();

    await fixture.componentInstance.onConnectClick();

    expect(connectSpy).toHaveBeenCalled();
  });

  it('should load only mercadolibre-sourced drafts when already connected', async () => {
    const fixture = setup({}, { connected: true });
    getByOwnerSpy.mockResolvedValue([
      draftListing({ id: 'ml-draft' }),
      draftListing({ id: 'active', status: 'active' }),
      draftListing({ id: 'other-draft', sourceProvider: undefined, sourceId: undefined }),
    ]);
    await fixture.whenStable();
    await fixture.whenStable();

    expect(fixture.componentInstance.draftListings().map((l) => l.id)).toEqual(['ml-draft']);
  });

  it('should import listings and reload drafts', async () => {
    const fixture = setup({}, { connected: true });
    await fixture.whenStable();
    await fixture.whenStable();
    getByOwnerSpy.mockClear();

    await fixture.componentInstance.onImportClick();

    expect(importListingsSpy).toHaveBeenCalled();
    expect(getByOwnerSpy).toHaveBeenCalled();
  });

  it('should publish a draft and remove it from the list', async () => {
    const fixture = setup({}, { connected: true });
    await fixture.whenStable();
    await fixture.whenStable();
    const listing = fixture.componentInstance.draftListings()[0];

    await fixture.componentInstance.onPublishClick(listing);

    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: listing.id, status: 'active' }),
    );
    expect(fixture.componentInstance.draftListings()).toEqual([]);
  });

  it('should not remove the draft when publishing fails', async () => {
    const fixture = setup({}, { connected: true });
    await fixture.whenStable();
    await fixture.whenStable();
    updateSpy.mockRejectedValue(new Error('network error'));
    const listing = fixture.componentInstance.draftListings()[0];

    await fixture.componentInstance.onPublishClick(listing);

    expect(fixture.componentInstance.draftListings()).toHaveLength(1);
  });
});
