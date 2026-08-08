import imageCompression from 'browser-image-compression';
import { compressImage } from './image-compression';

vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}));

describe('compressImage', () => {
  it('should delegate to browser-image-compression with tuned defaults', async () => {
    const file = new File([new Uint8Array(1024)], 'a.png', { type: 'image/png' });
    const compressed = new File([new Uint8Array(512)], 'a.png', { type: 'image/png' });
    vi.mocked(imageCompression).mockResolvedValue(compressed);

    const result = await compressImage(file);

    expect(imageCompression).toHaveBeenCalledWith(file, {
      maxWidthOrHeight: 1920,
      maxSizeMB: 1.5,
      useWebWorker: true,
    });
    expect(result).toBe(compressed);
  });
});
