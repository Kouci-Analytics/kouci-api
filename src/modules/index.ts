import type { FastifyInstance } from 'fastify';
import { syncRoutes } from './sync/sync.routes.js';
import { wishlistRoutes } from './wishlist/wishlist.routes.js';
import { licensesRoutes } from './licenses/licenses.routes.js';

export async function registerModules(app: FastifyInstance): Promise<void> {
  await app.register(licensesRoutes, { prefix: '/api/v1/licenses' });
  await app.register(syncRoutes, { prefix: '/sync' });
  await app.register(wishlistRoutes, { prefix: '/wishlist' });
}
