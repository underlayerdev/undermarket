import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryApiKey, cloudinaryApiSecret } from './secrets';

// Not secret — this is the same cloud name the browser's unsigned upload
// flow already uses (src/environments/environment.ts), just visible here
// too since every Cloudinary URL includes it.
const CLOUD_NAME = 'db3cbociq';

let configured = false;

function ensureConfigured(): void {
  if (configured) return;
  cloudinary.config({
    cloud_name: CLOUD_NAME,
    api_key: cloudinaryApiKey.value(),
    api_secret: cloudinaryApiSecret.value(),
  });
  configured = true;
}

/** Re-hosts a remote image (e.g. a MercadoLibre CDN URL) on our own Cloudinary account — Cloudinary fetches it server-side, so this function never downloads the bytes itself. Imported listings shouldn't depend on the source marketplace's CDN staying up. */
export async function uploadRemoteImage(url: string): Promise<string> {
  ensureConfigured();
  const result = await cloudinary.uploader.upload(url, { folder: 'listings' });
  return result.secure_url;
}
