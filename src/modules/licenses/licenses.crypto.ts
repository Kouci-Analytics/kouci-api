import {
  createHmac,
  createPrivateKey,
  createPublicKey,
  randomBytes,
  sign,
  verify,
  type KeyObject
} from 'node:crypto';
import { env } from '../../config/env.js';
import {
  licensePayloadSchema,
  normalizeActivationCode
} from './licenses.schemas.js';
import type { LicensePayload } from './licenses.types.js';

const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateActivationCode(): string {
  const characters = Array.from(
    randomBytes(28),
    (byte) => CODE_ALPHABET[byte & 31]
  ).join('');
  return `KOUCI-${characters.match(/.{4}/g)!.join('-')}`;
}

function hashIdentifier(
  domain: 'activation' | 'installation',
  value: string
): string {
  if (!env.LICENSE_CODE_HASH_SECRET)
    throw new Error('LICENSE_CODE_HASH_SECRET is required');
  return createHmac(
    'sha256',
    Buffer.from(env.LICENSE_CODE_HASH_SECRET, 'base64')
  )
    .update(`${domain}:${value}`, 'utf8')
    .digest('hex');
}

export function hashActivationCode(code: string): string {
  return hashIdentifier('activation', normalizeActivationCode(code));
}

export function hashInstallId(installId: string): string {
  return hashIdentifier('installation', installId.toLowerCase());
}

let signingKey: KeyObject | undefined;

/**
 * Get the signing key.
 * @returns {KeyObject} The signing key.
 * @throws {Error} If the signing key is not available.
 */
function getSigningKey(): KeyObject {
  if (signingKey) return signingKey;
  if (!env.LICENSE_SIGNING_PRIVATE_KEY)
    throw new Error('LICENSE_SIGNING_PRIVATE_KEY is required');
  try {
    const key = createPrivateKey({
      key: Buffer.from(env.LICENSE_SIGNING_PRIVATE_KEY, 'base64'),
      format: 'der',
      type: 'pkcs8'
    });
    if (key.asymmetricKeyType !== 'ed25519') throw new Error();
    signingKey = key;
    return key;
  } catch {
    throw new Error(
      'LICENSE_SIGNING_PRIVATE_KEY must be a base64 PKCS8 Ed25519 private key'
    );
  }
}

/**
 * Assert that the license configuration is valid.
 * @throws {Error} If the license configuration is invalid.
 */
export function assertLicenseConfiguration(): void {
  getSigningKey();
  hashActivationCode('configuration-check');
}

// Protocol v1: UTF-8 JSON, top-level keys sorted lexicographically, no whitespace.
// All payload fields are scalar; consumers must use this exact serialization.
export function serializeLicense(payload: LicensePayload): string {
  const parsed = licensePayloadSchema.parse(payload);
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(parsed).sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0
      )
    )
  );
}

export function signLicense(payload: LicensePayload): string {
  return sign(
    null,
    Buffer.from(serializeLicense(payload), 'utf8'),
    getSigningKey()
  ).toString('base64');
}

export function getLicensePublicKey(): string {
  return createPublicKey(getSigningKey())
    .export({ format: 'der', type: 'spki' })
    .toString('base64');
}

export function verifyLicense(
  payload: unknown,
  signature: string,
  publicKey?: string
): boolean {
  try {
    const parsed = licensePayloadSchema.safeParse(payload);
    if (!parsed.success || !/^[A-Za-z0-9+/]{86}==$/.test(signature))
      return false;
    const key = createPublicKey({
      key: Buffer.from(publicKey ?? getLicensePublicKey(), 'base64'),
      format: 'der',
      type: 'spki'
    });
    if (key.asymmetricKeyType !== 'ed25519') return false;
    return verify(
      null,
      Buffer.from(serializeLicense(parsed.data), 'utf8'),
      key,
      Buffer.from(signature, 'base64')
    );
  } catch {
    return false;
  }
}
