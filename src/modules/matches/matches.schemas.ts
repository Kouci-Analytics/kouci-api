import { z } from 'zod';

export const matchesHealthSchema = z.object({
  module: z.literal('matches'),
  status: z.literal('ok')
});
