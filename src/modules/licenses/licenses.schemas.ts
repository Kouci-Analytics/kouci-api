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

const isoExpirationSchema = z.iso.datetime({ offset: true });
// Keep Unix dates within the four-digit year range supported by ISO input.
const MAX_EXPIRATION_SECONDS = 253402300799;
const expirationSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      if (isoExpirationSchema.safeParse(value).success) return true;
      const seconds = Number(value);
      return (
        /^\d+$/.test(value) &&
        Number.isSafeInteger(seconds) &&
        seconds >= 0 &&
        seconds <= MAX_EXPIRATION_SECONDS
      );
    },
    {
      message:
        'Expected an ISO 8601 timestamp with timezone or non-negative Unix seconds through year 9999 (not milliseconds).'
    }
  )
  .transform(
    (value) => new Date(/^\d+$/.test(value) ? Number(value) * 1000 : value)
  );

export const createLicenseSchema = z.strictObject({
  club: z.string().trim().min(1).max(200),
  plan: planSchema,
  maxPlayers: z.number().int().positive().max(2147483647).optional(),
  maxActivations: z.number().int().positive().max(2147483647).default(1),
  premiumReports: z.boolean().optional(),
  developerMode: z.boolean().optional(),
  customTheme: z.boolean().optional(),
  expiresAt: expirationSchema.nullable().default(null)
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
