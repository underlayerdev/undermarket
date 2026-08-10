import type { Category } from '../category/category.model';
import type { CurrencyCode } from '../currency/currency.model';
import type { UserId } from '../user/user.model';

export type ListingId = string;

export interface Listing {
  id: ListingId;
  ownerId: UserId;
  title: string;
  description: string;
  price: number;
  currency: CurrencyCode;
  category: Category;
  imageUrls: string[];
  status: 'active' | 'sold';
  createdAt: Date;
  updatedAt: Date;
}
