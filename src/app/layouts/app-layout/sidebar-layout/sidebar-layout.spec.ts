import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { SidebarLayoutComponent } from './sidebar-layout';
import { AuthService } from '../../../application/services/auth.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('SidebarLayoutComponent', () => {
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  function setup(currentUser: { id: string } | null = null) {
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [SidebarLayoutComponent, getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { currentUser: () => currentUser } },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
      ],
    });

    const fixture = TestBed.createComponent(SidebarLayoutComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should offer Home and Settings in the sidebar', () => {
    const fixture = setup();
    const transloco = TestBed.inject(TranslocoService);
    const items = fixture.componentInstance.getSidebarItems((key) => transloco.translate(key));

    expect(items).toHaveLength(2);
    expect(items.map((item) => item.label)).toEqual(['Home', 'Settings']);
  });

  it('should select the item matching the current url', () => {
    const fixture = setup();
    fixture.componentRef.setInput('currentUrl', '/settings/account');

    expect(fixture.componentInstance.selectedIndex()).toBe(1);
  });

  it('should default to the first item for an unrecognized url', () => {
    const fixture = setup();
    fixture.componentRef.setInput('currentUrl', '/discover');

    expect(fixture.componentInstance.selectedIndex()).toBe(0);
  });

  it('should close the sidebar and navigate when an item is selected', () => {
    const fixture = setup();
    fixture.componentRef.setInput('sidebarOpen', true);

    fixture.componentInstance.onItemSelected({ label: 'Settings', url: '/settings' });

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/settings');
    expect(fixture.componentInstance.sidebarOpen()).toBe(false);
  });

  it('should not navigate when a selected item has no url', () => {
    const fixture = setup();

    fixture.componentInstance.onItemSelected({ label: 'No-op' });

    expect(navigateByUrlSpy).not.toHaveBeenCalled();
  });

  it('should close the sidebar and emit logout on sign-out', () => {
    const fixture = setup();
    fixture.componentRef.setInput('sidebarOpen', true);
    const logoutSpy = vi.fn();
    fixture.componentInstance.logout.subscribe(logoutSpy);

    fixture.componentInstance.onSignOut();

    expect(fixture.componentInstance.sidebarOpen()).toBe(false);
    expect(logoutSpy).toHaveBeenCalled();
  });
});
