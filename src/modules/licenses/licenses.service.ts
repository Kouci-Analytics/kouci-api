import { LicensesRepository } from './licenses.repository.js';
import {
  generateActivationCode,
  hashActivationCode,
  hashInstallId,
  signLicense
} from './licenses.crypto.js';
import {
  PLAN_DEFAULTS,
  type ActivationRequest,
  type CreateLicenseInput,
  type LicensePayload,
  type SignedLicense
} from './licenses.types.js';

export class LicensesService {
  constructor(private readonly repository = new LicensesRepository()) {}

  async create(input: CreateLicenseInput) {
    const activationCode = generateActivationCode();
    const defaults = PLAN_DEFAULTS[input.plan];
    const license = await this.repository.create({
      codeHash: hashActivationCode(activationCode),
      clubName: input.club,
      plan: input.plan,
      maxPlayers: input.maxPlayers ?? defaults.maxPlayers,
      maxActivations: input.maxActivations ?? 1,
      premiumReports: input.premiumReports ?? defaults.premiumReports,
      developerMode: input.developerMode ?? defaults.developerMode,
      customTheme: input.customTheme ?? defaults.customTheme,
      expiresAt: input.expiresAt
    });
    return { ...license, activationCode };
  }

  activate(input: ActivationRequest): Promise<SignedLicense> {
    return this.repository.activate(
      hashActivationCode(input.activationCode),
      hashInstallId(input.installId),
      input.appVersion,
      (license, now) => {
        const payload: LicensePayload = {
          version: 1,
          licenseId: license.id,
          club: license.clubName,
          plan: license.plan,
          installId: input.installId,
          maxPlayers: license.maxPlayers,
          premiumReports: license.premiumReports,
          developerMode: license.developerMode,
          customTheme: license.customTheme,
          issuedAt: Math.floor(now.getTime() / 1000),
          expiresAt: license.expiresAt
            ? Math.floor(license.expiresAt.getTime() / 1000)
            : null
        };
        return { license: payload, signature: signLicense(payload) };
      }
    );
  }

  list(limit?: number, offset?: number) {
    return this.repository.list(limit, offset);
  }
  get(id: string) {
    return this.repository.get(id);
  }
  disable(id: string) {
    return this.repository.setStatus(id, 'DISABLED');
  }
  enable(id: string) {
    return this.repository.setStatus(id, 'ACTIVE');
  }
  revoke(id: string) {
    return this.repository.setStatus(id, 'REVOKED');
  }
  resetActivations(id: string, installId?: string) {
    return this.repository.resetActivations(
      id,
      installId ? hashInstallId(installId) : undefined
    );
  }
}
