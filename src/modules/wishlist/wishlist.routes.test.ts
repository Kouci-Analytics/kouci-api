import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerErrorHandler } from '../../plugins/error-handler.js';
import { AppError } from '../../shared/errors/app-error.js';
import { createWishlistRoutes } from './wishlist.routes.js';

describe('wishlist routes', () => {
  const apps: ReturnType<typeof Fastify>[] = [];
  const count = vi.fn().mockResolvedValue(0);

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
    registerErrorHandler(app);
    await app.register(createWishlistRoutes({ count, create }), {
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
    await app.register(createWishlistRoutes({ count, create }), {
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

  it('returns a conflict when the email is already registered', async () => {
    const create = vi
      .fn()
      .mockRejectedValue(new AppError('Email is already on the wishlist', 409));
    const app = Fastify();
    apps.push(app);
    registerErrorHandler(app);
    await app.register(createWishlistRoutes({ count, create }), {
      prefix: '/wishlist'
    });

    const response = await app.inject({
      method: 'POST',
      url: '/wishlist',
      remoteAddress: '198.51.100.20',
      payload: {
        name: 'Ada Lovelace',
        email: 'ADA@EXAMPLE.COM'
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: 'Email is already on the wishlist'
    });
    expect(create).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@example.com'
    });
  });

  it('limits repeated requests from the same IP', async () => {
    const create = vi.fn().mockResolvedValue({
      uuid: '90fd75a7-d589-4ed7-a214-79f9e28ef23b',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      createdAt: '2026-08-30T12:00:00.000Z'
    });
    const app = Fastify();
    apps.push(app);
    registerErrorHandler(app);
    await app.register(createWishlistRoutes({ count, create }), {
      prefix: '/wishlist'
    });

    const responses = [];
    for (let requestNumber = 0; requestNumber < 6; requestNumber += 1) {
      responses.push(
        await app.inject({
          method: 'POST',
          url: '/wishlist',
          remoteAddress: '198.51.100.10',
          payload: {
            name: 'Ada Lovelace',
            email: 'ada@example.com'
          }
        })
      );
    }

    expect(responses.slice(0, 5).map(({ statusCode }) => statusCode)).toEqual([
      201, 201, 201, 201, 201
    ]);
    expect(responses[5]?.statusCode).toBe(429);
    expect(responses[5]?.json()).toMatchObject({
      message: 'Too many requests. Please try again later.'
    });
    expect(responses[5]?.headers['retry-after']).toBeDefined();
    expect(create).toHaveBeenCalledTimes(5);
  });

  it('returns the number of wishlist entries', async () => {
    const countEntries = vi.fn().mockResolvedValue(42);
    const create = vi.fn();
    const app = Fastify();
    apps.push(app);
    await app.register(
      createWishlistRoutes({ count: countEntries, create }),
      { prefix: '/wishlist' }
    );

    const response = await app.inject({
      method: 'GET',
      url: '/wishlist'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ count: 42 });
    expect(response.headers['x-ratelimit-limit']).toBe('300');
    expect(response.headers['x-ratelimit-remaining']).toBe('299');
    expect(countEntries).toHaveBeenCalledOnce();
    expect(create).not.toHaveBeenCalled();
  });
});
