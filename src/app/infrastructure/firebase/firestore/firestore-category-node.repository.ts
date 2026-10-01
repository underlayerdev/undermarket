import { inject, Injectable } from '@angular/core';
import { collection, getDocs, query, where, Firestore, Timestamp } from 'firebase/firestore';
import { FIREBASE_FIRESTORE } from '../../../core/configuration/tokens';
import type { CategoryNodeRepository } from '../../../domain/category-node/category-node.repository';
import type { CategoryNode } from '../../../domain/category-node/category-node.model';

@Injectable({ providedIn: 'root' })
export class FirestoreCategoryNodeRepository implements CategoryNodeRepository {
  private readonly firestore: Firestore = inject(FIREBASE_FIRESTORE);

  async getAll(): Promise<CategoryNode[]> {
    const categoriesQuery = query(
      collection(this.firestore, 'categories'),
      where('isActive', '==', true),
    );
    const snapshot = await getDocs(categoriesQuery);
    return snapshot.docs.map((docSnapshot) => this.mapDoc(docSnapshot.id, docSnapshot.data()));
  }

  private mapDoc(categoryId: string, data: Record<string, unknown>): CategoryNode {
    return {
      categoryId,
      parentId: data['parentId'] as string | null,
      path: data['path'] as string[],
      depth: data['depth'] as number,
      order: data['order'] as number,
      icon: data['icon'] as string | undefined,
      isActive: data['isActive'] as boolean,
      isLeaf: data['isLeaf'] as boolean,
      // Defensive fallback for the window between this field shipping and
      // the next full reseed — not a lasting optional-field situation like
      // Listing's backward-compat fields, since seeding always upserts
      // every node.
      featured: (data['featured'] as boolean | undefined) ?? false,
      featuredOrder: (data['featuredOrder'] as number | undefined) ?? 0,
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: (data['updatedAt'] as Timestamp).toDate(),
      updatedBy: data['updatedBy'] as string,
    };
  }
}
