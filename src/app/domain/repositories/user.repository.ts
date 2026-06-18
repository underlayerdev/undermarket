import type { User, UserId } from '../models/user.model';

export interface UserRepository {
  getById(id: UserId): Promise<User | null>;
  create(user: User): Promise<void>;
  update(user: User): Promise<void>;
}
