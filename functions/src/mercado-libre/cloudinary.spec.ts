import { beforeEach, describe, expect, it, vi } from 'vitest';

const { configMock, uploadMock } = vi.hoisted(() => ({
  configMock: vi.fn(),
  uploadMock: vi.fn().mockResolvedValue({ secure_url: 'https://res.cloudinary.com/x.jpg' }),
}));

vi.mock('cloudinary', () => ({
  v2: { config: configMock, uploader: { upload: uploadMock } },
}));

describe('uploadRemoteImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should configure Cloudinary once and upload the remote URL', async () => {
    const { uploadRemoteImage } = await import('./cloudinary');

    const url = await uploadRemoteImage('https://ml-cdn.com/photo.jpg');
    await uploadRemoteImage('https://ml-cdn.com/photo2.jpg');

    expect(url).toBe('https://res.cloudinary.com/x.jpg');
    expect(configMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledWith('https://ml-cdn.com/photo.jpg', { folder: 'listings' });
  });
});
