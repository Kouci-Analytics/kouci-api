import type { z } from 'zod';
import type { licenses } from '../../db/schema/licenses.js';
import type {
  activationRequestSchema,
  createLicenseSchema,
  licensePayloadSchema,
  planSchema
} from './licenses.schemas.js';

export type License = typeof licenses.$inferSelect;
export type LicensePlan = z.infer<typeof planSchema>;
export type ActivationRequest = z.infer<typeof activationRequestSchema>;
export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
export type LicensePayload = z.infer<typeof licensePayloadSchema>;
export type SignedLicense = { license: LicensePayload; signature: string };

export const PLAN_DEFAULTS: Record<
  LicensePlan,
  {
    maxPlayers: number;
    premiumReports: boolean;
    developerMode: boolean;
    customTheme: boolean;
  }
> = {
  BASIC: {
    maxPlayers: 15,
    premiumReports: false,
    developerMode: false,
    customTheme: false
  },
  PRO: {
    maxPlayers: 18,
    premiumReports: true,
    developerMode: false,
    customTheme: false
  },
  CUSTOM: {
    maxPlayers: 20,
    premiumReports: false,
    developerMode: true,
    customTheme: true
  },
  MVP_TESTER: {
    maxPlayers: 18,
    premiumReports: false,
    developerMode: false,
    customTheme: false
  }
};
