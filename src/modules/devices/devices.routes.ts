import type { FastifyPluginAsync } from 'fastify';
import { DevicesService } from './devices.service.js';

export const devicesRoutes: FastifyPluginAsync = async (app) => {
  const service = new DevicesService();

  app.get('/health', async () => service.getHealth());
};
