import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from './app';
import { UserService } from './application/services/user.service';
import { getTranslocoTestingModule } from '../testing/transloco-testing';

describe('App', () => {
  // The spinner tracks router navigation, so a truthy currentNavigation() is
  // what "in flight" looks like to the component.
  function setup(currentNavigation: unknown = null) {
    TestBed.configureTestingModule({
      imports: [App, getTranslocoTestingModule()],
      providers: [
        { provide: Router, useValue: { currentNavigation: () => currentNavigation } },
        { provide: UserService, useValue: { isCheckingProfile: () => false } },
      ],
    });

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    return fixture;
  }

  it('should create the app', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the router outlet while no navigation is in flight', () => {
    const fixture = setup();

    expect(fixture.nativeElement.querySelector('router-outlet')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.app__loading')).toBeNull();
  });

  it('should show a loading indicator while a navigation is in flight', () => {
    const fixture = setup({ id: 1 });

    expect(fixture.nativeElement.querySelector('.app__loading')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('router-outlet')).toBeNull();
  });
});
