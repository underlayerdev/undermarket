import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SettingsComponent } from './settings';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('SettingsComponent', () => {
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  function setup(url = '/settings/profile') {
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [SettingsComponent, getTranslocoTestingModule()],
      providers: [
        {
          provide: Router,
          useValue: { events: new Subject(), url, navigateByUrl: navigateByUrlSpy },
        },
      ],
    });

    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose profile, account, display, and integrations sidebar items', () => {
    const fixture = setup();
    expect(fixture.componentInstance.sidebarItems().map((item) => item.path)).toEqual([
      'profile',
      'account',
      'display',
      'integrations',
    ]);
  });

  it('should give each sidebar item a left icon', () => {
    const fixture = setup();
    expect(fixture.componentInstance.sidebarItems().map((item) => item.leftIcons)).toEqual([
      ['user_profile'],
      ['user'],
      ['image_portrait'],
      ['apps_grid'],
    ]);
  });

  it('should select the account item when the url is /settings/account', () => {
    const fixture = setup('/settings/account');
    expect(fixture.componentInstance.selectedIndex()).toBe(1);
  });

  it('should select the display item when the url is /settings/display', () => {
    const fixture = setup('/settings/display');
    expect(fixture.componentInstance.selectedIndex()).toBe(2);
  });

  it('should default to the profile item for an unrecognized url', () => {
    const fixture = setup('/settings');
    expect(fixture.componentInstance.selectedIndex()).toBe(0);
  });

  it('should navigate to the selected item path', () => {
    const fixture = setup();

    fixture.componentInstance.onItemSelected({ label: 'Language', path: 'display' });

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/settings/display');
  });
});
