import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const wishlist = pgTable('wishlist', {
  uuid: uuid('uuid').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique('wishlist_email_unique'),
  createdAt: text('created_at').notNull(),
});
