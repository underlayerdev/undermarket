import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import type { ImageStorage } from '../../domain/image-storage/image-storage.provider';

/**
 * Uploads directly from the browser via Cloudinary's unsigned upload API —
 * no backend needed. The upload preset (configured in the Cloudinary
 * dashboard as "Unsigned") controls the destination folder and any
 * server-side restrictions; cloudName/uploadPreset are not secrets, the
 * same way the Firebase web config in environment.ts isn't.
 */
@Injectable({ providedIn: null })
export class CloudinaryImageStorage implements ImageStorage {
  async upload(file: File): Promise<string> {
    const { cloudName, uploadPreset } = environment.cloudinary;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image. Please try again.');
    }

    const data: { secure_url: string } = await response.json();
    return data.secure_url;
  }
}
