import { count } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { wishlist } from '../../db/schema/users.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { CreateWishlistInput, WishlistEntry } from './wishlist.types.js';

export class WishlistRepository {
  async count(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(wishlist);
    return result?.count ?? 0;
  }

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
