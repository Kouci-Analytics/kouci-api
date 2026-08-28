import { z } from 'zod';

export const playersHealthSchema = z.object({
  module: z.literal('players'),
  status: z.literal('ok')
});
