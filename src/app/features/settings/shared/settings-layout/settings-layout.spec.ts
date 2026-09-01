import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsLayoutComponent } from './settings-layout';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';

describe('SettingsLayoutComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [SettingsLayoutComponent, getTranslocoTestingModule()],
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(SettingsLayoutComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create with no title', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the given title', () => {
    const fixture = setup();
    fixture.componentRef.setInput('title', 'Account');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Account');
  });
});
