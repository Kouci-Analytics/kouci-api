import { pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const coach = pgTable('coach', {
  uuid: uuid('uuid').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  clubUuid: uuid('club_uuid').references(() => club.uuid),
});

export const club = pgTable('club', {
  uuid: uuid('uuid').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  createdAt: text('created_at').notNull(),
});

export const wishlist = pgTable('wishlist', {
  uuid: uuid('uuid').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  createdAt: text('created_at').notNull(),
});