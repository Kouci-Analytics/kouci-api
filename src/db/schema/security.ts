import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const platformEnum = pgEnum('platform', ['ios', 'android', 'web']);

export const device = pgTable('device', {
    uuid: uuid('uuid').primaryKey().defaultRandom(),
    platform: platformEnum('platform').notNull(),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    macAddress: text('mac_address').notNull(),
});
