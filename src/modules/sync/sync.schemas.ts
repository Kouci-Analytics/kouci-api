import { z } from 'zod';

export const syncHealthSchema = z.object({
  module: z.literal('sync'),
  status: z.literal('ok')
});
