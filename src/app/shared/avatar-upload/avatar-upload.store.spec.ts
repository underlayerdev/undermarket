import { TestBed } from '@angular/core/testing';
import { AvatarUploadStore } from './avatar-upload.store';
import { ErrorService } from '../../application/services/error.service';
import { IMAGE_STORAGE } from '../../core/configuration/tokens';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('AvatarUploadStore', () => {
  let uploadSpy: ReturnType<typeof vi.fn>;

  function setup() {
    uploadSpy = vi.fn().mockResolvedValue('https://res.cloudinary.com/avatar.jpg');

    TestBed.configureTestingModule({
      providers: [
        AvatarUploadStore,
        { provide: IMAGE_STORAGE, useValue: { upload: uploadSpy } },
        { provide: ErrorService, useValue: { toUserMessage: () => 'Something went wrong.' } },
      ],
    });

    return TestBed.inject(AvatarUploadStore);
  }

  const cropped = new File(['cropped'], 'photo.jpg', { type: 'image/jpeg' });

  it('should open the cropper with the selected file instead of uploading it directly', () => {
    const store = setup();
    const file = new File(['x'], 'avatar.png', { type: 'image/png' });

    store.selectFile(file);

    expect(store.pendingFile()).toBe(file);
    expect(store.cropperOpen()).toBe(true);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('should upload the cropped file, close the cropper and resolve to the url', async () => {
    const store = setup();
    store.selectFile(new File(['x'], 'avatar.png', { type: 'image/png' }));

    const url = await store.uploadCropped(cropped);

    expect(url).toBe('https://res.cloudinary.com/avatar.jpg');
    expect(uploadSpy).toHaveBeenCalledWith(cropped);
    expect(store.cropperOpen()).toBe(false);
    expect(store.uploadedUrl()).toBe('https://res.cloudinary.com/avatar.jpg');
    expect(store.previewUrl()).toBeTruthy();
    expect(store.error()).toBeNull();
  });

  it('should flag isUploading while the upload is in flight', async () => {
    const store = setup();
    const gate = deferred<string>();
    uploadSpy.mockReturnValueOnce(gate.promise);

    const upload = store.uploadCropped(cropped);
    expect(store.isUploading()).toBe(true);

    gate.resolve('https://res.cloudinary.com/avatar.jpg');
    await upload;
    expect(store.isUploading()).toBe(false);
  });

  it('should close the cropper without uploading anything when cancelled', () => {
    const store = setup();
    store.selectFile(new File(['x'], 'avatar.png', { type: 'image/png' }));

    store.cancelCrop();

    expect(store.cropperOpen()).toBe(false);
    expect(store.pendingFile()).toBeNull();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('should show an error and allow retrying when the upload fails', async () => {
    const store = setup();
    uploadSpy.mockRejectedValueOnce(new Error('network down'));

    expect(await store.uploadCropped(cropped)).toBeNull();
    expect(store.error()).toBe('Something went wrong.');
    expect(store.uploadedUrl()).toBeNull();
    expect(store.isUploading()).toBe(false);

    uploadSpy.mockResolvedValueOnce('https://res.cloudinary.com/retry.jpg');
    expect(await store.retry()).toBe('https://res.cloudinary.com/retry.jpg');
    expect(uploadSpy).toHaveBeenLastCalledWith(cropped);
    expect(store.error()).toBeNull();
  });

  it('should do nothing on retry when nothing was ever cropped', async () => {
    const store = setup();

    expect(await store.retry()).toBeNull();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it('should only let the newest upload write its outcome', async () => {
    const store = setup();
    const slow = deferred<string>();
    uploadSpy.mockReturnValueOnce(slow.promise);
    uploadSpy.mockResolvedValueOnce('https://res.cloudinary.com/second.jpg');

    const first = store.uploadCropped(cropped);
    const second = store.uploadCropped(new File(['second'], 'second.jpg'));
    slow.resolve('https://res.cloudinary.com/first.jpg');

    expect(await second).toBe('https://res.cloudinary.com/second.jpg');
    expect(await first).toBeNull();
    expect(store.uploadedUrl()).toBe('https://res.cloudinary.com/second.jpg');
    expect(store.isUploading()).toBe(false);
  });

  it('should go back to a clean slate on reset', async () => {
    const store = setup();
    await store.uploadCropped(cropped);

    store.reset();

    expect(store.previewUrl()).toBeNull();
    expect(store.uploadedUrl()).toBeNull();
    expect(store.error()).toBeNull();
    expect(await store.retry()).toBeNull();
  });
});
