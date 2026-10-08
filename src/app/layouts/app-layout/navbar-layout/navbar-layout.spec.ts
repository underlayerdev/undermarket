import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { NavbarLayoutComponent } from './navbar-layout';
import { AuthService } from '../../../application/services/auth.service';
import { NOTIFICATION_PROVIDER } from '../../../core/configuration/tokens';
import { mockUser } from '../../../domain/user/user.mock';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

const user = mockUser({ displayName: 'Lucas Yamone' });

describe('NavbarLayoutComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NavbarLayoutComponent, getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { logout: vi.fn().mockResolvedValue(undefined) } },
        { provide: Router, useValue: { navigateByUrl: vi.fn().mockResolvedValue(true) } },
        { provide: ActivatedRoute, useValue: {} },
        { provide: NOTIFICATION_PROVIDER, useValue: { observe: () => () => {} } },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should derive avatar initials from the profile display name', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.componentRef.setInput('profile', user);

    expect(fixture.componentInstance.avatarInitials()).toBe('L');
  });

  it('should not render notifications or the user menu when signed out', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('um-notifications')).toBeNull();
    expect(fixture.nativeElement.querySelector('um-user-menu')).toBeNull();
  });

  it('should render notifications and the user menu for a signed-in user', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.componentRef.setInput('isSignedIn', true);
    fixture.componentRef.setInput('profile', user);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('um-notifications')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('um-user-menu')).toBeTruthy();
  });

  it('should keep the signed-in navigation, without initials, while the profile is still loading', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.componentRef.setInput('isSignedIn', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('um-user-menu')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[routerLink="/login"]')).toBeNull();
    expect(fixture.componentInstance.avatarInitials()).toBeUndefined();
  });

  it('should emit toggleSidebar when the navbar requests it', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.toggleSidebar.subscribe(emitted);

    fixture.debugElement.query(By.css('ul-navbar')).triggerEventHandler('sidebarToggle', undefined);

    expect(emitted).toHaveBeenCalled();
  });

  it('should emit submitSearch with the trimmed query on enter', () => {
    const fixture = TestBed.createComponent(NavbarLayoutComponent);
    fixture.detectChanges();
    const emitted = vi.fn();
    fixture.componentInstance.submitSearch.subscribe(emitted);
    fixture.componentInstance.searchQuery.set('  shoes  ');

    fixture.debugElement.query(By.css('ul-input')).triggerEventHandler('inputEnter', undefined);

    expect(emitted).toHaveBeenCalledWith('shoes');
  });
});
