import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AppLayoutComponent } from './app-layout';
import { AuthService } from '../../application/services/auth.service';
import { NOTIFICATION_PROVIDER } from '../../core/configuration/tokens';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('AppLayoutComponent', () => {
  let navigateSpy: ReturnType<typeof vi.fn>;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;
  let logoutSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateSpy = vi.fn().mockResolvedValue(true);
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);
    logoutSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [AppLayoutComponent, getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => null, logout: logoutSpy } },
        {
          provide: Router,
          useValue: {
            events: new Subject(),
            url: '/home',
            navigate: navigateSpy,
            navigateByUrl: navigateByUrlSpy,
          },
        },
        { provide: ActivatedRoute, useValue: {} },
        { provide: NOTIFICATION_PROVIDER, useValue: { observe: () => () => {} } },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should log out and navigate to /login on sign-out', async () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);

    await fixture.componentInstance.onSignOut();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
  });

  it('should navigate to /login directly', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);

    fixture.componentInstance.navigateToLogin();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
  });

  it('should navigate to /search with the given query on submit', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);

    fixture.componentInstance.onSearchSubmit('shoes');

    expect(navigateSpy).toHaveBeenCalledWith(['/search'], { queryParams: { q: 'shoes' } });
  });

  it('should pass a null q query param when the search query is empty', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);

    fixture.componentInstance.onSearchSubmit('');

    expect(navigateSpy).toHaveBeenCalledWith(['/search'], { queryParams: { q: null } });
  });
});
