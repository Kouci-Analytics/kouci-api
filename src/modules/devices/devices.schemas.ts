import { z } from 'zod';

export const deviceHealthSchema = z.object({
  module: z.literal('devices'),
  status: z.literal('ok')
});
