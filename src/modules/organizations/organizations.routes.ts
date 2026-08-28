import type { FastifyPluginAsync } from 'fastify';
import { OrganizationsService } from './organizations.service.js';

export const organizationsRoutes: FastifyPluginAsync = async (app) => {
  const service = new OrganizationsService();

  app.get('/health', async () => service.getHealth());
};
