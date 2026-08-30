export type CreateWishlistInput = {
  name: string;
  email: string;
};

export type WishlistEntry = CreateWishlistInput & {
  uuid: string;
  createdAt: string;
};
