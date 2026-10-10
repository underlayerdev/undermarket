import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastService } from '@underlayerdev/ui';
import { SettingsProfileDisplayNameComponent } from './settings-profile-display-name';
import { SettingsProfileStore } from '../settings-profile.store';
import { UserService } from '../../../../application/services/user.service';
import { getTranslocoTestingModule } from '../../../../../testing/transloco-testing';
import { mockUser } from '../../../../domain/user/user.mock';
import type { User } from '../../../../domain/user/user.model';

describe('SettingsProfileDisplayNameComponent', () => {
  let changeDisplayNameSpy: ReturnType<typeof vi.fn>;

  function setup(initialProfile: User | null = mockUser()) {
    const profile = signal<User | null>(initialProfile);
    changeDisplayNameSpy = vi.fn(async (displayName: string) => {
      const current = profile();
      if (current) profile.set({ ...current, displayName });
    });

    TestBed.configureTestingModule({
      imports: [SettingsProfileDisplayNameComponent, getTranslocoTestingModule()],
      providers: [
        SettingsProfileStore,
        { provide: UserService, useValue: { profile, changeDisplayName: changeDisplayNameSpy } },
      ],
    });

    const fixture = TestBed.createComponent(SettingsProfileDisplayNameComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, profile };
  }

  it('should create', () => {
    expect(setup().component).toBeTruthy();
  });

  it('should seed displayNameValue from the loaded profile', () => {
    const { component } = setup(mockUser({ displayName: 'Old Name' }));

    expect(component.displayNameValue()).toBe('Old Name');
  });

  it('should seed displayNameValue once the profile arrives after creation', () => {
    const { component, profile } = setup(null);
    expect(component.displayNameValue()).toBe('');

    profile.set(mockUser({ displayName: 'Late Name' }));

    expect(component.displayNameValue()).toBe('Late Name');
  });

  it('should reject an empty display name once touched', async () => {
    const { component } = setup();
    component.displayNameValue.set('   ');

    await component.onSaveDisplayName();

    expect(component.displayNameError()).toBe('Display name is required.');
    expect(changeDisplayNameSpy).not.toHaveBeenCalled();
  });

  it('should reject a display name under the min length', async () => {
    const { component } = setup();
    component.displayNameValue.set('a');

    await component.onSaveDisplayName();

    expect(component.displayNameError()).toContain('at least');
    expect(changeDisplayNameSpy).not.toHaveBeenCalled();
  });

  it('should reject a display name over the max length', async () => {
    const { component } = setup();
    component.displayNameValue.set('a'.repeat(51));

    await component.onSaveDisplayName();

    expect(component.displayNameError()).toContain('at most');
    expect(changeDisplayNameSpy).not.toHaveBeenCalled();
  });

  it('should save the normalized display name through the callable', async () => {
    const { component } = setup(mockUser({ id: 'user-1', displayName: 'Old Name' }));
    component.displayNameValue.set('  New   Name  ');

    await component.onSaveDisplayName();

    expect(changeDisplayNameSpy).toHaveBeenCalledWith('New Name');
    expect(component.displayNameValue()).toBe('New Name');
    expect(component.displayNameTouched()).toBe(false);
  });

  it('should show an error toast and reset the button label when saving fails', async () => {
    const { component } = setup();
    changeDisplayNameSpy.mockRejectedValue(new Error('network down'));
    const errorSpy = vi.spyOn(TestBed.inject(ToastService), 'error');
    component.displayNameValue.set('New Name');

    await component.onSaveDisplayName();

    expect(errorSpy).toHaveBeenCalled();
    expect(component.saveDisplayNameButtonLabel()).toBe('Save');
  });

  it.each([
    ['Jane 😀', 'letters, numbers'],
    ['Admin', 'available'],
    ['mary.smith', 'web address'],
  ])('should explain why %s is rejected and not save it', async (name, hint) => {
    const { component } = setup();
    component.displayNameValue.set(name);

    await component.onSaveDisplayName();

    expect(component.displayNameError()).toContain(hint);
    expect(changeDisplayNameSpy).not.toHaveBeenCalled();
  });

  describe('Save button', () => {
    function saveButton(fixture: ComponentFixture<SettingsProfileDisplayNameComponent>) {
      return fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    }

    it('should be disabled on load, before anything was edited', () => {
      const { fixture } = setup(mockUser({ displayName: 'Jane Doe' }));

      expect(saveButton(fixture).disabled).toBe(true);
    });

    it('should enable once the name differs from the saved one', () => {
      const { fixture, component } = setup(mockUser({ displayName: 'Jane Doe' }));

      component.displayNameValue.set('Jane Smith');
      fixture.detectChanges();

      expect(saveButton(fixture).disabled).toBe(false);
    });

    it('should stay disabled when only spacing around the saved name changed', () => {
      const { fixture, component } = setup(mockUser({ displayName: 'Jane Doe' }));

      component.displayNameValue.set('  Jane   Doe ');
      fixture.detectChanges();

      expect(saveButton(fixture).disabled).toBe(true);
    });

    it('should disable again once the edit is typed back to the saved name', () => {
      const { fixture, component } = setup(mockUser({ displayName: 'Jane Doe' }));
      component.displayNameValue.set('Jane Smith');
      fixture.detectChanges();

      component.displayNameValue.set('Jane Doe');
      fixture.detectChanges();

      expect(saveButton(fixture).disabled).toBe(true);
    });

    it('should disable again after a successful save', async () => {
      const { fixture, component } = setup(mockUser({ displayName: 'Jane Doe' }));
      component.displayNameValue.set('Jane Smith');

      await component.onSaveDisplayName();
      fixture.detectChanges();

      expect(saveButton(fixture).disabled).toBe(true);
    });

    it('should not save when nothing changed, even if submitted directly', async () => {
      const { component } = setup(mockUser({ displayName: 'Jane Doe' }));

      await component.onSaveDisplayName();

      expect(changeDisplayNameSpy).not.toHaveBeenCalled();
    });
  });
});
