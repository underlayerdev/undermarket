import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { UserMenuComponent } from './user-menu';
import { AuthService } from '../../../application/services/auth.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('UserMenuComponent', () => {
  let logoutSpy: ReturnType<typeof vi.fn>;
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    logoutSpy = vi.fn().mockResolvedValue(undefined);
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [UserMenuComponent, getTranslocoTestingModule()],
      providers: [
        { provide: AuthService, useValue: { logout: logoutSpy } },
        { provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should sign out and navigate to /login', async () => {
    const fixture = TestBed.createComponent(UserMenuComponent);

    await fixture.componentInstance.onSignOut();

    expect(logoutSpy).toHaveBeenCalled();
    expect(navigateByUrlSpy).toHaveBeenCalledWith('/login');
  });

  it('should default isOpen to false and reflect signal updates', () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    const component = fixture.componentInstance;

    expect(component.isOpen()).toBe(false);

    component.isOpen.set(true);
    expect(component.isOpen()).toBe(true);

    component.isOpen.set(false);
    expect(component.isOpen()).toBe(false);
  });
});
