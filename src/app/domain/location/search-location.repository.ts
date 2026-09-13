import type { SearchLocation } from './location.model';
import type { UserId } from '../user/user.model';

export interface SearchLocationRepository {
  getByUser(userId: UserId): Promise<SearchLocation | null>;
  save(userId: UserId, location: SearchLocation): Promise<void>;
}
