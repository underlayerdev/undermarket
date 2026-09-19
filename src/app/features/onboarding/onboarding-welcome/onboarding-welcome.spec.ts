import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingWelcomeComponent } from './onboarding-welcome';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('OnboardingWelcomeComponent', () => {
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  function setup() {
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [OnboardingWelcomeComponent, getTranslocoTestingModule()],
      providers: [{ provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } }],
    });

    const fixture = TestBed.createComponent(OnboardingWelcomeComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should navigate to the name step when "get started" is clicked', () => {
    const fixture = setup();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('ul-button button');

    button.click();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('onboarding/name');
  });
});
