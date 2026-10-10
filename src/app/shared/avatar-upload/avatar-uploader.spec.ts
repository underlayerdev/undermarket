import { TestBed } from '@angular/core/testing';
import { AvatarUploaderComponent } from './avatar-uploader';
import { AvatarUploadStore } from './avatar-upload.store';
import { ErrorService } from '../../application/services/error.service';
import { IMAGE_STORAGE } from '../../core/configuration/tokens';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('AvatarUploaderComponent', () => {
  let uploadSpy: ReturnType<typeof vi.fn>;

  function setup(src?: string) {
    uploadSpy = vi.fn().mockResolvedValue('https://res.cloudinary.com/avatar.jpg');

    TestBed.configureTestingModule({
      imports: [AvatarUploaderComponent, getTranslocoTestingModule()],
      providers: [
        AvatarUploadStore,
        { provide: IMAGE_STORAGE, useValue: { upload: uploadSpy } },
        { provide: ErrorService, useValue: { toUserMessage: () => 'Something went wrong.' } },
      ],
    });

    const fixture = TestBed.createComponent(AvatarUploaderComponent);
    fixture.componentRef.setInput('src', src);
    fixture.componentRef.setInput('initials', 'J');
    fixture.detectChanges();
    const uploaded: string[] = [];
    fixture.componentInstance.uploaded.subscribe((url) => uploaded.push(url));
    return { fixture, component: fixture.componentInstance, uploaded };
  }

  const cropped = new File(['cropped'], 'photo.jpg', { type: 'image/jpeg' });

  it('should show the saved photo until a new one is cropped', () => {
    const { fixture } = setup('https://example.com/existing.jpg');
    const store = TestBed.inject(AvatarUploadStore);

    expect(fixture.nativeElement.querySelector('ul-avatar img')?.getAttribute('src')).toBe(
      'https://example.com/existing.jpg',
    );
    expect(store.previewUrl()).toBeNull();
  });

  it('should show a visible Change photo button under the avatar', () => {
    const { fixture } = setup();

    const button: HTMLElement = fixture.nativeElement.querySelector('ul-button');
    expect(button.textContent?.trim()).toBe('Change photo');
    const avatar = fixture.nativeElement.querySelector('ul-avatar');
    expect(avatar.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('should open the file picker from the Change photo button', () => {
    const { fixture } = setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    const pickerSpy = vi.spyOn(input, 'click');

    fixture.nativeElement.querySelector('ul-button button').click();

    expect(pickerSpy).toHaveBeenCalledTimes(1);
  });

  it('should open the file picker from the avatar too, without a second tab stop', () => {
    const { fixture } = setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    const pickerSpy = vi.spyOn(input, 'click');
    const avatarButton: HTMLButtonElement = fixture.nativeElement.querySelector(
      '.avatar-uploader__button',
    );

    avatarButton.click();

    expect(pickerSpy).toHaveBeenCalledTimes(1);
    expect(avatarButton.tabIndex).toBe(-1);
    expect(avatarButton.getAttribute('aria-hidden')).toBe('true');
  });

  it('should open the cropper with the picked file', () => {
    const { fixture } = setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', { value: [file] });

    input.dispatchEvent(new Event('change'));

    const store = TestBed.inject(AvatarUploadStore);
    expect(store.pendingFile()).toBe(file);
    expect(store.cropperOpen()).toBe(true);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('should ignore a change event with no file', () => {
    const { fixture } = setup();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', { value: [] });

    input.dispatchEvent(new Event('change'));

    expect(TestBed.inject(AvatarUploadStore).cropperOpen()).toBe(false);
  });

  it('should emit the uploaded url once a cropped file has uploaded', async () => {
    const { component, uploaded } = setup();

    await component.onCropped(cropped);

    expect(uploadSpy).toHaveBeenCalledWith(cropped);
    expect(uploaded).toEqual(['https://res.cloudinary.com/avatar.jpg']);
  });

  it('should emit nothing when the upload fails, and emit after a successful retry', async () => {
    const { fixture, component, uploaded } = setup();
    uploadSpy.mockRejectedValueOnce(new Error('network down'));

    await component.onCropped(cropped);
    fixture.detectChanges();

    expect(uploaded).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Something went wrong.');

    await component.onRetry();

    expect(uploaded).toEqual(['https://res.cloudinary.com/avatar.jpg']);
  });
});
