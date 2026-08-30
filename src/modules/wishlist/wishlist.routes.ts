import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';
import { createWishlistSchema } from './wishlist.schemas.js';
import { WishlistService } from './wishlist.service.js';

type WishlistCreator = Pick<WishlistService, 'create'>;

export function createWishlistRoutes(
  service: WishlistCreator = new WishlistService()
): FastifyPluginAsync {
  return async (app) => {
    await app.register(rateLimit, {
      max: 5,
      timeWindow: '1 minute',
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Too many requests. Please try again later.'
      })
    });

    app.post('/', async (request, reply) => {
      const body = createWishlistSchema.safeParse(request.body);

      if (!body.success) {
        return reply.status(400).send({ message: 'Invalid request body' });
      }

      const entry = await service.create(body.data);
      return reply.status(201).send(entry);
    });
  };
}

export const wishlistRoutes = createWishlistRoutes();
