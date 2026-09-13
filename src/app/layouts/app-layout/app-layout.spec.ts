import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AppLayoutComponent } from './app-layout';
import { AuthService } from '../../application/services/auth.service';
import { NOTIFICATION_PROVIDER } from '../../core/configuration/tokens';
import { mockUser } from '../../domain/user/user.mock';
import type { User } from '../../domain/user/user.model';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

const user = mockUser();

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

  describe('dock layout rendering', () => {
    // Needs a real Router (routerLink/routerLinkActive on every ul-dock-item
    // call into it during rendering) rather than the plain-object mock the
    // tests above use just to spy on navigate/navigateByUrl calls.
    function setupRendered(currentUser: User | null) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [AppLayoutComponent, getTranslocoTestingModule()],
        providers: [
          provideRouter([]),
          { provide: AuthService, useValue: { currentUser: () => currentUser, logout: logoutSpy } },
          { provide: NOTIFICATION_PROVIDER, useValue: { observe: () => () => {} } },
        ],
      });

      const fixture = TestBed.createComponent(AppLayoutComponent);
      fixture.detectChanges();
      return fixture;
    }

    it('should not render the dock for a signed-out visitor', () => {
      const fixture = setupRendered(null);

      expect(fixture.nativeElement.querySelector('um-dock-layout')).toBeNull();
    });

    it('should render the dock for a signed-in user', () => {
      const fixture = setupRendered(user);

      expect(fixture.nativeElement.querySelector('um-dock-layout')).toBeTruthy();
    });
  });
});
