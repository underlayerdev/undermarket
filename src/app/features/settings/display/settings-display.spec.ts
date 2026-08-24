import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { SettingsDisplayComponent } from './settings-display';
import { LanguageService } from '../../../application/services/language.service';
import { getTranslocoTestingModule } from '../../../../testing/transloco-testing';

describe('SettingsDisplayComponent', () => {
  let setLanguageSpy: ReturnType<typeof vi.fn>;
  let transloco: TranslocoService;

  function setup() {
    setLanguageSpy = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      imports: [SettingsDisplayComponent, getTranslocoTestingModule()],
      providers: [
        { provide: LanguageService, useValue: { setLanguage: setLanguageSpy } },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    transloco = TestBed.inject(TranslocoService);
    const fixture = TestBed.createComponent(SettingsDisplayComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('should create', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should preselect the active language', () => {
    const fixture = setup();
    expect(fixture.componentInstance.languageValue()).toBe('en');
  });

  it('should follow the active language when it changes elsewhere', () => {
    const fixture = setup();

    transloco.setActiveLang('es');

    expect(fixture.componentInstance.languageValue()).toBe('es');
  });

  it('should delegate to LanguageService when the language changes', async () => {
    const fixture = setup();

    await fixture.componentInstance.onLanguageChange('es');

    expect(setLanguageSpy).toHaveBeenCalledWith('es');
  });

  it('should do nothing when the language is unchanged', async () => {
    const fixture = setup();

    await fixture.componentInstance.onLanguageChange('en');

    expect(setLanguageSpy).not.toHaveBeenCalled();
  });

  it('should do nothing when the select is cleared', async () => {
    const fixture = setup();

    await fixture.componentInstance.onLanguageChange(null);

    expect(setLanguageSpy).not.toHaveBeenCalled();
  });
});
