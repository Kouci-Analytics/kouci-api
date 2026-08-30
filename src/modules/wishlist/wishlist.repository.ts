import { db } from '../../db/index.js';
import { wishlist } from '../../db/schema/users.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { CreateWishlistInput, WishlistEntry } from './wishlist.types.js';

export class WishlistRepository {
  async create(input: CreateWishlistInput): Promise<WishlistEntry> {
    const [entry] = await db
      .insert(wishlist)
      .values({
        ...input,
        createdAt: new Date().toISOString()
      })
      .onConflictDoNothing({ target: wishlist.email })
      .returning({
        uuid: wishlist.uuid,
        name: wishlist.name,
        email: wishlist.email,
        createdAt: wishlist.createdAt
      });

    if (!entry) {
      throw new AppError('Email is already on the wishlist', 409);
    }

    return entry;
  }
}
