import { env } from './env.js';

export const API_URLS = {
  EMAIL_VERIFIER: env.EMAIL_VERIFIER_API_URL
} as const;
