import { z } from 'zod';

export const planSchema = z.enum(['BASIC', 'PRO', 'CUSTOM', 'MVP_TESTER']);
export const installIdSchema = z
  .uuid()
  .transform((value) => value.toLowerCase());

// Seven groups of four base32 characters carry 140 bits of entropy.
export function normalizeActivationCode(value: string): string {
  const compact = value.trim().toUpperCase().replace(/[\s-]/g, '');
  if (!compact.startsWith('KOUCI')) return compact;
  return `KOUCI-${
    compact
      .slice(5)
      .match(/.{1,4}/g)
      ?.join('-') ?? ''
  }`;
}

export const activationRequestSchema = z.strictObject({
  activationCode: z
    .string()
    .min(1)
    .max(128)
    .transform(normalizeActivationCode)
    .pipe(z.string().regex(/^KOUCI(?:-[0-9A-HJKMNP-TV-Z]{4}){7}$/)),
  installId: installIdSchema,
  appVersion: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[0-9A-Za-z][0-9A-Za-z.+_-]*$/)
});

export const createLicenseSchema = z.strictObject({
  club: z.string().trim().min(1).max(200),
  plan: planSchema,
  maxPlayers: z.number().int().positive().max(2147483647).optional(),
  maxActivations: z.number().int().positive().max(2147483647).default(1),
  premiumReports: z.boolean().optional(),
  developerMode: z.boolean().optional(),
  customTheme: z.boolean().optional(),
  expiresAt: z.iso
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .nullable()
    .default(null)
});

export const licensePayloadSchema = z.strictObject({
  version: z.literal(1),
  licenseId: z.uuid(),
  club: z.string().min(1).max(200),
  plan: planSchema,
  installId: z.uuid(),
  maxPlayers: z.number().int().positive(),
  premiumReports: z.boolean(),
  developerMode: z.boolean(),
  customTheme: z.boolean(),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative().nullable()
});

export const signedLicenseSchema = z.strictObject({
  license: licensePayloadSchema,
  signature: z.string().regex(/^[A-Za-z0-9+/]{86}==$/)
});
