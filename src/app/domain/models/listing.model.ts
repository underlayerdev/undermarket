import type { UserId } from './user.model';

export type ListingId = string;

export interface Listing {
  id: ListingId;
  ownerId: UserId;
  title: string;
  description: string;
  price: number;
  category: string;
  imageUrls: string[];
  status: 'active' | 'sold';
  createdAt: Date;
  updatedAt: Date;
}
