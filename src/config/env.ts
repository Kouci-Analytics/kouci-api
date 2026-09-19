import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

loadDotEnv({ quiet: true });
loadDotEnv({ path: '.env.license', quiet: true });

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  VERCEL: z.string().optional(),
  DATABASE_URL: z.string().url(),
  EMAIL_VERIFIER_API_URL: z.string().url().optional(),
  LICENSE_CODE_HASH_SECRET: z
    .string()
    .regex(/^[A-Za-z0-9+/]{43}=$/)
    .optional(),
  LICENSE_SIGNING_PRIVATE_KEY: z.string().min(1).optional(),
  LICENSE_ADMIN_TOKEN: z.string().min(32).optional(),
  // Comma-separated addresses/CIDRs of the TLS reverse proxies; never trust arbitrary clients.
  TRUSTED_PROXIES: z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    )
    .optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment variables: ${JSON.stringify(parsedEnv.error.flatten().fieldErrors)}`
  );
}

export const env = parsedEnv.data;
