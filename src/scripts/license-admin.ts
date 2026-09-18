import { parseArgs } from 'node:util';
import { z } from 'zod';
import { LicenseError } from '../modules/licenses/licenses.errors.js';
import {
  createLicenseSchema,
  installIdSchema
} from '../modules/licenses/licenses.schemas.js';

const help = `License administration (run from the repository root):
  npm run license:keys
  npm run license:public-key
  npm run license:create -- --club "Vitória SC" --plan MVP_TESTER
    [--maxPlayers 18] [--maxActivations 1] [--premiumReports false]
    [--developerMode false] [--customTheme false] [--expiresAt ISO_TIMESTAMP_OR_UNIX_SECONDS]
  npm run license:list -- [--limit 100] [--offset 0]
  npm run license:get -- --id UUID
  npm run license:disable -- --id UUID
  npm run license:enable -- --id UUID
  npm run license:revoke -- --id UUID
  npm run license:reset-activation -- --id UUID [--installId UUID]

Codes are printed only by create and cannot be retrieved later.
Expiration accepts an ISO date with timezone or Unix seconds, e.g. 1821275871.
Omit --expiresAt for a non-expiring license. Milliseconds are not supported.
Reset without --installId removes ALL activations for the license.
Status changes and resets affect future activations, not existing offline copies.`;

const stringOption = { type: 'string' as const };
const booleanValue = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');
const positiveInteger = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(2147483647));

function parseOption<T>(name: string, schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new z.ZodError(
      parsed.error.issues.map((issue) => ({
        ...issue,
        path: [name, ...issue.path]
      }))
    );
  }
  return parsed.data;
}

async function main() {
  const command = process.argv[2];
  if (!command || process.argv.includes('--help')) {
    console.log(help);
    return;
  }
  const commandOptions: Record<string, Record<string, typeof stringOption>> = {
    create: {
      club: stringOption,
      plan: stringOption,
      maxPlayers: stringOption,
      maxActivations: stringOption,
      premiumReports: stringOption,
      developerMode: stringOption,
      customTheme: stringOption,
      expiresAt: stringOption
    },
    list: { limit: stringOption, offset: stringOption },
    get: { id: stringOption },
    disable: { id: stringOption },
    enable: { id: stringOption },
    revoke: { id: stringOption },
    'reset-activation': { id: stringOption, installId: stringOption },
    'public-key': {}
  };
  if (!Object.hasOwn(commandOptions, command))
    throw new Error('Unknown command');
  const { values } = parseArgs({
    args: process.argv.slice(3),
    options: commandOptions[command],
    strict: true,
    allowPositionals: false
  });

  console.log('Command:', command);
  console.log('Values:', values);

  if (command === 'public-key') {
    const { getLicensePublicKey } =
      await import('../modules/licenses/licenses.crypto.js');
    console.log(
      JSON.stringify(
        {
          algorithm: 'Ed25519',
          format: 'SPKI DER, base64',
          publicKey: getLicensePublicKey()
        },
        null,
        2
      )
    );
    return;
  }

  const { closeDb } = await import('../db/index.js');
  try {
    const { LicensesService } =
      await import('../modules/licenses/licenses.service.js');
    const service = new LicensesService();

    let result: unknown;

    if (command === 'create') {
      const input = createLicenseSchema.parse({
        club: values.club,
        plan: values.plan,
        maxPlayers:
          values.maxPlayers === undefined
            ? undefined
            : parseOption('maxPlayers', positiveInteger, values.maxPlayers),
        maxActivations:
          values.maxActivations === undefined
            ? undefined
            : parseOption(
                'maxActivations',
                positiveInteger,
                values.maxActivations
              ),
        premiumReports:
          values.premiumReports === undefined
            ? undefined
            : parseOption(
                'premiumReports',
                booleanValue,
                values.premiumReports
              ),
        developerMode:
          values.developerMode === undefined
            ? undefined
            : parseOption('developerMode', booleanValue, values.developerMode),
        customTheme:
          values.customTheme === undefined
            ? undefined
            : parseOption('customTheme', booleanValue, values.customTheme),
        expiresAt: values.expiresAt
      });

      result = await service.create(input);

    } else if (command === 'list') {
      const limit =
        values.limit === undefined
          ? 100
          : parseOption(
              'limit',
              positiveInteger.pipe(z.number().max(1000)),
              values.limit
            );
      const offset =
        values.offset === undefined
          ? 0
          : parseOption(
              'offset',
              z
                .string()
                .regex(/^\d+$/)
                .transform(Number)
                .pipe(z.number().int().nonnegative().max(2147483647)),
              values.offset
            );
      result = await service.list(limit, offset);
    } else {
      const id = parseOption('id', z.uuid(), values.id);
      switch (command) {
        case 'get':
          result = await service.get(id);
          break;
        case 'disable':
          result = await service.disable(id);
          break;
        case 'enable':
          result = await service.enable(id);
          break;
        case 'revoke':
          result = await service.revoke(id);
          break;
        case 'reset-activation':
          result = await service.resetActivations(
            id,
            parseOption(
              'installId',
              installIdSchema.optional(),
              values.installId
            )
          );
          break;
      }
    }
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await closeDb();
  }
}

main().catch((error: unknown) => {
  if (error instanceof LicenseError) {
    console.error(`${error.code}: ${error.message}`);
  } else if (error instanceof z.ZodError) {
    for (const issue of error.issues) {
      const option = issue.path.length
        ? `--${issue.path.map(String).join('.')}`
        : 'options';
      console.error(`Invalid ${option}: ${issue.message}`);
    }
    console.error('Use --help for supported arguments.');
  } else {
    // Database errors may contain parameters; never print the underlying exception.
    console.error(
      'License command failed. Check arguments, backend configuration, and database availability. Use --help for usage.'
    );
  }
  process.exitCode = 1;
});
