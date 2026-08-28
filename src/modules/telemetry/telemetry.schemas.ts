import { z } from 'zod';

export const telemetryHealthSchema = z.object({
  module: z.literal('telemetry'),
  status: z.literal('ok')
});
