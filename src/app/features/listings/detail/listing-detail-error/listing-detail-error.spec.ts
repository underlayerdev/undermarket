import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { By } from '@angular/platform-browser';
import { StatusComponent } from '@underlayerdev/ui';
import { ListingDetailErrorComponent } from './listing-detail-error';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';

describe('ListingDetailErrorComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [ListingDetailErrorComponent, getTranslocoTestingModule()],
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(ListingDetailErrorComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show a no-result icon and the not-found copy for that type', () => {
    const fixture = setup();
    fixture.componentRef.setInput('errorType', 'not-found');
    fixture.detectChanges();

    const status = fixture.debugElement.query(By.directive(StatusComponent));
    expect(status.componentInstance.status()).toBe('info');
    expect(status.componentInstance.customIcon()).toBe('no_result');
    expect(fixture.nativeElement.textContent).toContain('Listing not found');
    expect(fixture.nativeElement.textContent).toContain('This listing no longer exists.');
  });

  it('should navigate to /discover when the not-found action is clicked', () => {
    const fixture = setup();
    fixture.componentRef.setInput('errorType', 'not-found');
    fixture.detectChanges();

    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const button = fixture.nativeElement.querySelector('ul-button button');
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(navigateSpy).toHaveBeenCalled();
    expect(navigateSpy.mock.calls[0][0].toString()).toBe('/discover');
  });

  it('should show an alert icon and the generic load-error copy by default', () => {
    const fixture = setup();
    fixture.detectChanges();

    const status = fixture.debugElement.query(By.directive(StatusComponent));
    expect(status.componentInstance.status()).toBe('error');
    expect(status.componentInstance.customIcon()).toBe('alert');
    expect(fixture.nativeElement.textContent).toContain('Error');
    expect(fixture.nativeElement.textContent).toContain('Failed to load listing');
  });

  it('should emit retry when the generic error action is clicked', () => {
    const fixture = setup();
    const retrySpy = vi.fn();
    fixture.componentInstance.retry.subscribe(retrySpy);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('ul-button button');
    button.dispatchEvent(new MouseEvent('click'));

    expect(retrySpy).toHaveBeenCalledTimes(1);
  });
});
