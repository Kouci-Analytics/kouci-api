import type { FastifyPluginAsync } from 'fastify';
import { SyncService } from './sync.service.js';

export const syncRoutes: FastifyPluginAsync = async (app) => {
  const service = new SyncService();

  app.get('/health', async () => service.getHealth());
};
