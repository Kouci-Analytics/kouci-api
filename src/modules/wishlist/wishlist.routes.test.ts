import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWishlistRoutes } from './wishlist.routes.js';

describe('wishlist routes', () => {
  const apps: ReturnType<typeof Fastify>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('creates a wishlist entry', async () => {
    const create = vi.fn().mockResolvedValue({
      uuid: '90fd75a7-d589-4ed7-a214-79f9e28ef23b',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      createdAt: '2026-08-30T12:00:00.000Z'
    });
    const app = Fastify();
    apps.push(app);
    await app.register(createWishlistRoutes({ create }), {
      prefix: '/wishlist'
    });

    const response = await app.inject({
      method: 'POST',
      url: '/wishlist',
      payload: {
        name: '  Ada Lovelace  ',
        email: 'ADA@EXAMPLE.COM'
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      uuid: '90fd75a7-d589-4ed7-a214-79f9e28ef23b',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      createdAt: '2026-08-30T12:00:00.000Z'
    });
    expect(create).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com'
    });
  });

  it.each([
    {},
    { name: '', email: 'ada@example.com' },
    { name: 'Ada Lovelace', email: 'not-an-email' }
  ])('rejects an invalid request body', async (payload) => {
    const create = vi.fn();
    const app = Fastify();
    apps.push(app);
    await app.register(createWishlistRoutes({ create }), {
      prefix: '/wishlist'
    });

    const response = await app.inject({
      method: 'POST',
      url: '/wishlist',
      payload
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ message: 'Invalid request body' });
    expect(create).not.toHaveBeenCalled();
  });
});
