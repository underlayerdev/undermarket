import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { SettingsComponent } from './settings';
import { SettingsFeedbackService } from './shared/settings-feedback/settings-feedback.service';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('SettingsComponent', () => {
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  function setup(url = '/settings/account') {
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

  it('should expose account, display, and integrations sidebar items', () => {
    const fixture = setup();
    expect(fixture.componentInstance.sidebarItems().map((item) => item.path)).toEqual([
      'account',
      'display',
      'integrations',
    ]);
  });

  it('should give each sidebar item a left icon', () => {
    const fixture = setup();
    expect(fixture.componentInstance.sidebarItems().map((item) => item.leftIcons)).toEqual([
      ['user'],
      ['image_portrait'],
      ['apps_grid'],
    ]);
  });

  it('should select the display item when the url is /settings/display', () => {
    const fixture = setup('/settings/display');
    expect(fixture.componentInstance.selectedIndex()).toBe(1);
  });

  it('should default to the account item for an unrecognized url', () => {
    const fixture = setup('/settings');
    expect(fixture.componentInstance.selectedIndex()).toBe(0);
  });

  it('should navigate to the selected item path', () => {
    const fixture = setup();

    fixture.componentInstance.onItemSelected({ label: 'Language', path: 'display' });

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/settings/display');
  });

  // The modal itself is mounted here rather than by each settings page, so
  // every page's save/error feedback shows through this one instance.
  describe('feedback modal', () => {
    it('should show the success icon and message the service was given', () => {
      const fixture = setup();
      const feedbackService = TestBed.inject(SettingsFeedbackService);

      feedbackService.success('Display name updated.');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.ul-icon-check_circle')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Display name updated.');
    });

    it('should show the error icon and message the service was given', () => {
      const fixture = setup();
      const feedbackService = TestBed.inject(SettingsFeedbackService);

      feedbackService.error('Something went wrong.');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.ul-icon-cross_circle')).toBeTruthy();
      expect(fixture.nativeElement.textContent).toContain('Something went wrong.');
    });

    it('should close through the service when the modal closes itself', () => {
      const fixture = setup();
      const feedbackService = TestBed.inject(SettingsFeedbackService);
      feedbackService.success('Display name updated.');
      fixture.detectChanges();

      const closeButton: HTMLButtonElement =
        fixture.nativeElement.querySelector('.ul-modal__close button');
      closeButton.click();

      expect(feedbackService.open()).toBe(false);
    });
  });
});
