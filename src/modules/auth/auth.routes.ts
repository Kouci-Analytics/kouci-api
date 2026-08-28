import type { FastifyPluginAsync } from 'fastify';
import { AuthService } from './auth.service.js';

export const authRoutes: FastifyPluginAsync = async (app) => {
  const service = new AuthService();

  app.get('/health', async () => service.getHealth());
};
