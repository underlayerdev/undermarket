// TODO: inject Firebase SDK — import { Firestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { Injectable } from '@angular/core';
import type { UserRepository } from '../../../domain/repositories/user.repository';
import type { User, UserId } from '../../../domain/models/user.model';

@Injectable({ providedIn: null })
export class FirestoreUserRepository implements UserRepository {
  getById(_id: UserId): Promise<User | null> {
    throw new Error('Not implemented');
  }

  create(_user: User): Promise<void> {
    throw new Error('Not implemented');
  }

  update(_user: User): Promise<void> {
    throw new Error('Not implemented');
  }
}
