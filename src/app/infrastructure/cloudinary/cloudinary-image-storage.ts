// TODO: inject Cloudinary SDK — import { Cloudinary } from '@cloudinary/url-gen'
// TODO: or use Cloudinary unsigned upload via HTTP (no SDK needed)
import { Injectable } from '@angular/core';
import type { ImageStorage } from '../../domain/image-storage/image-storage.provider';

@Injectable({ providedIn: null })
export class CloudinaryImageStorage implements ImageStorage {
  upload(_file: File): Promise<string> {
    throw new Error('Not implemented');
  }
}
