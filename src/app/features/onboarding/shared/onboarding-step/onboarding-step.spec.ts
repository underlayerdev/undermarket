import { TestBed } from '@angular/core/testing';
import { OnboardingStepComponent } from './onboarding-step';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';

describe('OnboardingStepComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [OnboardingStepComponent, getTranslocoTestingModule()],
    });

    const fixture = TestBed.createComponent(OnboardingStepComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the back button by default and emit on click', () => {
    const fixture = setup();
    const backSpy = vi.fn();
    fixture.componentInstance.back.subscribe(backSpy);
    const [backButton]: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('button');

    backButton.click();

    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  it('should hide the back button when showBack is false', () => {
    const fixture = setup();
    fixture.componentRef.setInput('showBack', false);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('button');
    expect(buttons.length).toBe(1);
  });

  it('should disable continue when canContinue is false', () => {
    const fixture = setup();
    fixture.componentRef.setInput('canContinue', false);
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('button');
    expect(buttons[buttons.length - 1].disabled).toBe(true);
  });

  it('should emit continueClicked when continue is pressed', () => {
    const fixture = setup();
    const continueSpy = vi.fn();
    fixture.componentInstance.continueClicked.subscribe(continueSpy);
    const buttons: HTMLButtonElement[] = fixture.nativeElement.querySelectorAll('button');

    buttons[buttons.length - 1].click();

    expect(continueSpy).toHaveBeenCalledTimes(1);
  });

  it('should show the loading label and disable both buttons while loading', () => {
    const fixture = setup();
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });

  it('should render a custom continue label when provided', () => {
    const fixture = setup();
    fixture.componentRef.setInput('continueLabel', 'Finish');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Finish');
  });

  it('should render the error message when set', () => {
    const fixture = setup();
    fixture.componentRef.setInput('errorMessage', 'Something went wrong');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Something went wrong');
  });
});
