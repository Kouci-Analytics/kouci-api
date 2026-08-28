import { z } from 'zod';

export const organizationsHealthSchema = z.object({
  module: z.literal('organizations'),
  status: z.literal('ok')
});
