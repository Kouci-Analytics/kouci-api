import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import {
  installIdSchema,
  signedLicenseSchema
} from '../modules/licenses/licenses.schemas.js';

async function main() {
  const { values } = parseArgs({
    options: {
      file: { type: 'string' },
      publicKey: { type: 'string' },
      installId: { type: 'string' },
      help: { type: 'boolean' }
    },
    strict: true,
    allowPositionals: false
  });


  if (values.help) {
    console.log(
      'npm run license:verify -- --file response.json --installId UUID [--publicKey BASE64_SPKI_DER]\nChecks the signature, installation binding, and expiration locally. No server or database request.'
    );
    return;
  }

  if (!values.file) throw new Error();
  
  const installId = installIdSchema.parse(values.installId);
  const signed = signedLicenseSchema.parse(
    JSON.parse(readFileSync(values.file, 'utf8'))
  );

  const { verifyLicense } =
    await import('../modules/licenses/licenses.crypto.js');

  const valid =
    verifyLicense(signed.license, signed.signature, values.publicKey) &&
    signed.license.installId === installId &&
    (signed.license.expiresAt === null ||
      signed.license.expiresAt > Math.floor(Date.now() / 1000));
  console.log(JSON.stringify({ valid }));
  if (!valid) process.exitCode = 1;
}

main().catch(() => {
  console.error(
    'License verification failed. Check the response file, installation ID, and public key.'
  );
  process.exitCode = 1;
});
