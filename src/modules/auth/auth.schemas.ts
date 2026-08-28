import { z } from 'zod';

export const authHealthSchema = z.object({
  module: z.literal('auth'),
  status: z.literal('ok')
});
