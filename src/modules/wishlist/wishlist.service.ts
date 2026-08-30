import { WishlistRepository } from './wishlist.repository.js';
import type { CreateWishlistInput, WishlistEntry } from './wishlist.types.js';

export class WishlistService {
  constructor(private readonly repository = new WishlistRepository()) {}

  create(input: CreateWishlistInput): Promise<WishlistEntry> {
    return this.repository.create(input);
  }
}
