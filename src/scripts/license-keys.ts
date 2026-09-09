import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

// No environment/database imports: this command bootstraps a new installation.
function main() {
  if (process.argv.length > 2) {
    if (process.argv.length === 3 && process.argv[2] === '--help') {
      console.log(
        'npm run license:keys\nCreates .env.license exclusively (mode 0600). Never overwrites existing keys.'
      );
      return;
    }
    throw new Error('This command takes no arguments.');
  }
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privateKeyBase64 = privateKey
    .export({ format: 'der', type: 'pkcs8' })
    .toString('base64');
  const publicKeyBase64 = publicKey
    .export({ format: 'der', type: 'spki' })
    .toString('base64');
  writeFileSync(
    '.env.license',
    [
      '# Backend secrets. Keep a secure backup; never share this file with the app.',
      `LICENSE_SIGNING_PRIVATE_KEY=${privateKeyBase64}`,
      `LICENSE_CODE_HASH_SECRET=${randomBytes(32).toString('base64')}`,
      ''
    ].join('\n'),
    { flag: 'wx', mode: 0o600 }
  );

  console.log(
    JSON.stringify(
      {
        secretFile: '.env.license',
        algorithm: 'Ed25519',
        publicKeyFormat: 'SPKI DER, base64',
        publicKey: publicKeyBase64
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'EEXIST'
  ) {
    console.error(
      'Refusing to overwrite .env.license. Existing signing and hashing keys must be preserved.'
    );
  } else {
    console.error(
      'Key generation failed. Use no arguments and ensure the working directory is writable.'
    );
  }
  process.exitCode = 1;
}
