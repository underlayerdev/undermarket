import { TestBed } from '@angular/core/testing';
import { CloudinaryImageStorage } from './cloudinary-image-storage';
import { getTranslocoTestingModule } from '../../../testing/transloco-testing';

describe('CloudinaryImageStorage', () => {
  const file = new File(['data'], 'lamp.jpg', { type: 'image/jpeg' });

  function createStorage(): CloudinaryImageStorage {
    TestBed.configureTestingModule({ imports: [getTranslocoTestingModule()] });
    return TestBed.runInInjectionContext(() => new CloudinaryImageStorage());
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should upload the file to Cloudinary and return the secure URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/lamp.jpg' }), {
        status: 200,
      }),
    );
    const storage = createStorage();

    const url = await storage.upload(file);

    expect(url).toBe('https://res.cloudinary.com/lamp.jpg');
    const [requestUrl, init] = fetchSpy.mock.calls[0];
    expect(requestUrl).toContain('/image/upload');
    expect(init?.method).toBe('POST');
    const formData = init?.body as FormData;
    expect(formData.get('file')).toBe(file);
    expect(formData.get('upload_preset')).toBeTruthy();
  });

  it('should throw a user-facing error when the upload fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 400 }));
    const storage = createStorage();

    await expect(storage.upload(file)).rejects.toThrow('Failed to upload image. Please try again.');
  });
});
