import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { OnboardingDoneComponent } from './onboarding-done';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('OnboardingDoneComponent', () => {
  let navigateByUrlSpy: ReturnType<typeof vi.fn>;

  function setup() {
    navigateByUrlSpy = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      imports: [OnboardingDoneComponent, getTranslocoTestingModule()],
      providers: [{ provide: Router, useValue: { navigateByUrl: navigateByUrlSpy } }],
    });

    const fixture = TestBed.createComponent(OnboardingDoneComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should navigate home when the CTA is clicked', () => {
    const fixture = setup();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('ul-button button');

    button.click();

    expect(navigateByUrlSpy).toHaveBeenCalledWith('/home');
  });
});
