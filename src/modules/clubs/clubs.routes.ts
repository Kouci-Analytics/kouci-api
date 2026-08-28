import type { FastifyPluginAsync } from 'fastify';
import { ClubsService } from './clubs.service.js';

export const clubsRoutes: FastifyPluginAsync = async (app) => {
  const service = new ClubsService();

  app.get('/health', async () => service.getHealth());
};
