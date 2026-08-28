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

  it('should offer Home, New Listing, and Settings in the mobile sidebar', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    const items = fixture.componentInstance.sidebarItems();

    expect(items).toHaveLength(3);
    expect(items.map((item) => item.label)).toEqual(['Home', 'New Listing', 'Settings']);
  });

  it('should navigate to a sidebar item url on selection', async () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentInstance.sidebarOpen.set(true);

    await fixture.componentInstance.onItemSelected(fixture.componentInstance.sidebarItems()[2]);

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/settings');
    expect(fixture.componentInstance.sidebarOpen()).toBe(false);
  });

  it('should log out, close the sidebar, and navigate to /login on sign-out', async () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentInstance.sidebarOpen.set(true);

    await fixture.componentInstance.onSignOut();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
    expect(fixture.componentInstance.sidebarOpen()).toBe(false);
  });

  it('should navigate to /search with the trimmed query on submit', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentInstance.searchQuery.set('  shoes  ');

    fixture.componentInstance.onSearchSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(['/search'], { queryParams: { q: 'shoes' } });
  });

  it('should pass a null q query param when the search query is empty', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    fixture.componentInstance.searchQuery.set('   ');

    fixture.componentInstance.onSearchSubmit();

    expect(navigateSpy).toHaveBeenCalledWith(['/search'], { queryParams: { q: null } });
  });
});
