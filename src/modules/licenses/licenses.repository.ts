import { and, count, desc, eq, getTableColumns } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { activations, licenses } from '../../db/schema/licenses.js';
import { LicenseError } from './licenses.errors.js';
import type { License } from './licenses.types.js';

// Keep hashes out of administration output as well as public responses.
const { codeHash: _codeHash, ...licenseColumns } = getTableColumns(licenses);
void _codeHash;
const activationColumns = {
  id: activations.id,
  licenseId: activations.licenseId,
  activatedAt: activations.activatedAt,
  lastSeenAt: activations.lastSeenAt,
  appVersion: activations.appVersion
};

export class LicensesRepository {
  async create(input: typeof licenses.$inferInsert) {
    const [license] = await db
      .insert(licenses)
      .values(input)
      .returning(licenseColumns);
    return license;
  }

  list(limit = 100, offset = 0) {
    return db
      .select(licenseColumns)
      .from(licenses)
      .orderBy(desc(licenses.createdAt), licenses.id)
      .limit(limit)
      .offset(offset);
  }

  async get(id: string) {
    return db.transaction(async (tx) => {
      const [license] = await tx
        .select(licenseColumns)
        .from(licenses)
        .where(eq(licenses.id, id))
        .for('share');
      if (!license)
        throw new LicenseError('INVALID_LICENSE', 'License not found.', 404);
      const devices = await tx
        .select(activationColumns)
        .from(activations)
        .where(eq(activations.licenseId, id))
        .orderBy(activations.activatedAt);
      return {
        ...license,
        activationCount: devices.length,
        activations: devices
      };
    });
  }

  async setStatus(id: string, status: License['status']) {
    const [license] = await db
      .update(licenses)
      .set({ status })
      .where(eq(licenses.id, id))
      .returning(licenseColumns);
    if (!license)
      throw new LicenseError('INVALID_LICENSE', 'License not found.', 404);
    return license;
  }

  async resetActivations(id: string, installIdHash?: string) {
    return db.transaction(async (tx) => {
      // Use the same parent-row lock as activation so reset cannot race registration.
      const [license] = await tx
        .select({ id: licenses.id })
        .from(licenses)
        .where(eq(licenses.id, id))
        .for('update');
      if (!license)
        throw new LicenseError('INVALID_LICENSE', 'License not found.', 404);
      const removed = await tx
        .delete(activations)
        .where(
          and(
            eq(activations.licenseId, id),
            installIdHash
              ? eq(activations.installIdHash, installIdHash)
              : undefined
          )
        )
        .returning({ id: activations.id });
      return { licenseId: id, resetCount: removed.length };
    });
  }

  async activate<T>(
    codeHash: string,
    installIdHash: string,
    appVersion: string,
    issueLicense: (license: License, now: Date) => T
  ): Promise<T> {
    return db.transaction(async (tx) => {
      // Serialize activations and status changes for a license, including across API instances.
      const [license] = await tx
        .select()
        .from(licenses)
        .where(eq(licenses.codeHash, codeHash))
        .for('update');


      if (!license)
        throw new LicenseError(
          'INVALID_LICENSE',
          'Activation code is not recognized.',
          404
        );
      if (license.status === 'DISABLED') {
        throw new LicenseError(
          'LICENSE_DISABLED',
          'This license is disabled.',
          403
        );
      }
      if (license.status === 'REVOKED') {
        throw new LicenseError(
          'LICENSE_REVOKED',
          'This license has been revoked.',
          403
        );
      }
      const now = new Date();
      if (license.expiresAt && license.expiresAt <= now) {
        throw new LicenseError(
          'LICENSE_EXPIRED',
          'This license has expired.',
          403
        );
      }
      

      const [existing] = await tx
        .select({ id: activations.id })
        .from(activations)
        .where(
          and(
            eq(activations.licenseId, license.id),
            eq(activations.installIdHash, installIdHash)
          )
        );

      if (existing) {
        await tx
          .update(activations)
          .set({ lastSeenAt: now, appVersion })
          .where(eq(activations.id, existing.id));
      } else {
        const [usage] = await tx
          .select({ count: count() })
          .from(activations)
          .where(eq(activations.licenseId, license.id));

        if (usage.count >= license.maxActivations) {
          throw new LicenseError(
            'DEVICE_LIMIT',
            'This license has reached its device limit.',
            409
          );
        }
        
        await tx.insert(activations).values({
          licenseId: license.id,
          installIdHash,
          appVersion,
          activatedAt: now,
          lastSeenAt: now
        });
      }

      // Sign before commit: a signing failure must not consume an activation slot.
      return issueLicense(license, now);
    });
  }
}
