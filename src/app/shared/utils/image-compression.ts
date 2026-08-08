import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: 1920,
    maxSizeMB: 1.5,
    useWebWorker: true,
  });
}
