import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

loadDotEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z.string().url()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment variables: ${JSON.stringify(parsedEnv.error.flatten().fieldErrors)}`);
}

export const env = parsedEnv.data;
