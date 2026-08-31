import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { SettingsMercadoLibreComponent } from './settings-mercado-libre';
import { MercadoLibreService } from '../../../application/services/mercado-libre.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('SettingsMercadoLibreComponent', () => {
  let refreshStatusSpy: ReturnType<typeof vi.fn>;
  let connectSpy: ReturnType<typeof vi.fn>;
  let navigateSpy: ReturnType<typeof vi.fn>;

  function setup(queryParams: Record<string, string> = {}) {
    refreshStatusSpy = vi.fn().mockResolvedValue(undefined);
    connectSpy = vi.fn().mockResolvedValue(undefined);
    navigateSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [SettingsMercadoLibreComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: MercadoLibreService,
          useValue: {
            status: () => null,
            connecting: () => false,
            refreshStatus: refreshStatusSpy,
            connect: connectSpy,
          },
        },
        { provide: Router, useValue: { navigate: navigateSpy } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(SettingsMercadoLibreComponent);
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
});
