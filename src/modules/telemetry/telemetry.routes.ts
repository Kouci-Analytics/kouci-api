import type { FastifyPluginAsync } from 'fastify';
import { TelemetryService } from './telemetry.service.js';

export const telemetryRoutes: FastifyPluginAsync = async (app) => {
  const service = new TelemetryService();

  app.get('/health', async () => service.getHealth());
};
