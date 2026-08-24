import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SettingsIndexComponent } from './settings-index';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('SettingsIndexComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [SettingsIndexComponent, getTranslocoTestingModule()],
      providers: [provideRouter([])],
    });

    const fixture = TestBed.createComponent(SettingsIndexComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should expose account and display nav items', () => {
    const fixture = setup();
    expect(fixture.componentInstance.navItems.map((item) => item.path)).toEqual([
      'account',
      'display',
    ]);
  });
});
