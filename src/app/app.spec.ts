import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { UserService } from './application/services/user.service';
import { getTranslocoTestingModule } from '../testing/transloco-testing';

describe('App', () => {
  let isCheckingProfile: ReturnType<typeof vi.fn>;

  function setup() {
    isCheckingProfile = vi.fn().mockReturnValue(false);

    TestBed.configureTestingModule({
      imports: [App, getTranslocoTestingModule()],
      providers: [{ provide: UserService, useValue: { isCheckingProfile } }],
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  }

  it('should create the app', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the router outlet when not checking the profile', () => {
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.app__loading')).toBeNull();
  });

  it('should show a loading indicator while the profile is being polled', () => {
    isCheckingProfile = vi.fn().mockReturnValue(true);
    TestBed.configureTestingModule({
      imports: [App, getTranslocoTestingModule()],
      providers: [{ provide: UserService, useValue: { isCheckingProfile } }],
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.app__loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  });
});
