import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const licensePlan = pgEnum('license_plan', [
  'BASIC',
  'PRO',
  'CUSTOM',
  'MVP_TESTER'
]);
export const licenseStatus = pgEnum('license_status', [
  'ACTIVE',
  'DISABLED',
  'REVOKED'
]);

export const licenses = pgTable(
  'licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    codeHash: text('code_hash').notNull().unique(),
    clubName: text('club_name').notNull(),
    plan: licensePlan('plan').notNull(),
    maxPlayers: integer('max_players').notNull(),
    status: licenseStatus('status').notNull().default('ACTIVE'),
    maxActivations: integer('max_activations').notNull().default(1),
    premiumReports: boolean('premium_reports').notNull().default(false),
    developerMode: boolean('developer_mode').notNull().default(false),
    customTheme: boolean('custom_theme').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true })
  },
  (table) => [
    check('licenses_max_players_positive', sql`${table.maxPlayers} > 0`),
    check('licenses_max_activations_positive', sql`${table.maxActivations} > 0`)
  ]
);

export const activations = pgTable(
  'activations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licenseId: uuid('license_id')
      .notNull()
      .references(() => licenses.id, { onDelete: 'cascade' }),
    installIdHash: text('install_id_hash').notNull(),
    activatedAt: timestamp('activated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    appVersion: text('app_version').notNull()
  },
  (table) => [
    uniqueIndex('activations_license_install_unique').on(
      table.licenseId,
      table.installIdHash
    )
  ]
);
