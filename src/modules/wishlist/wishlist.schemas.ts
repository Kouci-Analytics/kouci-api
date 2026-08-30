import { z } from 'zod';

export const createWishlistSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((email) => email.toLowerCase())
});
