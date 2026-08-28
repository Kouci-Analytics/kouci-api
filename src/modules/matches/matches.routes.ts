import type { FastifyPluginAsync } from 'fastify';
import { MatchesService } from './matches.service.js';

export const matchesRoutes: FastifyPluginAsync = async (app) => {
  const service = new MatchesService();

  app.get('/health', async () => service.getHealth());
};
