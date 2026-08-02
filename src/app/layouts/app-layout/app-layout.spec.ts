import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AppLayoutComponent } from './app-layout';
import { AuthService } from '../../application/services/auth.service';
import { NOTIFICATION_PROVIDER } from '../../core/configuration/tokens';

describe('AppLayoutComponent', () => {
  let navigateSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigateSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [AppLayoutComponent],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => null } },
        {
          provide: Router,
          useValue: {
            events: new Subject(),
            url: '/home',
            navigate: navigateSpy,
            navigateByUrl: vi.fn(),
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

  it('should only offer Home and New Listing in the mobile sidebar', () => {
    const fixture = TestBed.createComponent(AppLayoutComponent);
    const items = fixture.componentInstance.sidebarItems;

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.label)).toEqual(['Home', 'New Listing']);
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
