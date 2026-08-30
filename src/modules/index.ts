import type { FastifyInstance } from 'fastify';
import { authRoutes } from './auth/auth.routes.js';
import { organizationsRoutes } from './organizations/organizations.routes.js';
import { clubsRoutes } from './clubs/clubs.routes.js';
import { devicesRoutes } from './devices/devices.routes.js';
import { syncRoutes } from './sync/sync.routes.js';
import { telemetryRoutes } from './telemetry/telemetry.routes.js';
import { playersRoutes } from './players/players.routes.js';
import { matchesRoutes } from './matches/matches.routes.js';
import { wishlistRoutes } from './wishlist/wishlist.routes.js';

export async function registerModules(app: FastifyInstance): Promise<void> {
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(organizationsRoutes, { prefix: '/organizations' });
  await app.register(clubsRoutes, { prefix: '/clubs' });
  await app.register(devicesRoutes, { prefix: '/devices' });
  await app.register(syncRoutes, { prefix: '/sync' });
  await app.register(telemetryRoutes, { prefix: '/telemetry' });
  await app.register(playersRoutes, { prefix: '/players' });
  await app.register(matchesRoutes, { prefix: '/matches' });
  await app.register(wishlistRoutes, { prefix: '/wishlist' });
}
