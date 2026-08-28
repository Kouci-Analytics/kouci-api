import { z } from 'zod';

export const clubsHealthSchema = z.object({
  module: z.literal('clubs'),
  status: z.literal('ok')
});
