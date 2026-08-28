import type { FastifyPluginAsync } from 'fastify';
import { PlayersService } from './players.service.js';

export const playersRoutes: FastifyPluginAsync = async (app) => {
  const service = new PlayersService();

  app.get('/health', async () => service.getHealth());
};
