import Fastify from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import { isAllowedCorsOrigin, registerCors } from './cors.js';

describe('CORS', () => {
  const apps: ReturnType<typeof Fastify>[] = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it.each([
    ['https://kouci.app', 'production'],
    ['https://app.kouci.app', 'production'],
    ['https://preview.eu.kouci.app', 'production'],
    ['http://localhost', 'development'],
    ['http://localhost:3000', 'development'],
    ['https://localhost:5173', 'development']
  ] as const)('allows %s in %s', (origin, nodeEnv) => {
    expect(isAllowedCorsOrigin(origin, nodeEnv)).toBe(true);
  });

  it.each([
    ['http://localhost:3000', 'production'],
    ['https://evilkouci.app', 'production'],
    ['https://kouci.app.evil.com', 'production'],
    ['http://app.kouci.app', 'production'],
    ['https://app.kouci.app:8443', 'production']
  ] as const)('rejects %s in %s', (origin, nodeEnv) => {
    expect(isAllowedCorsOrigin(origin, nodeEnv)).toBe(false);
  });

  it('adds CORS headers for an allowed preflight request', async () => {
    const app = Fastify();
    apps.push(app);
    registerCors(app, 'production');
    app.post('/wishlist', async () => ({ ok: true }));

    const response = await app.inject({
      method: 'OPTIONS',
      url: '/wishlist',
      headers: {
        origin: 'https://app.kouci.app',
        'access-control-request-method': 'POST'
      }
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      'https://app.kouci.app'
    );
    expect(response.headers['access-control-allow-methods']).toContain('POST');
  });

  it('does not add CORS headers for a disallowed origin', async () => {
    const app = Fastify();
    apps.push(app);
    registerCors(app, 'production');
    app.get('/health', async () => ({ status: 'ok' }));

    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://kouci.app.evil.com' }
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
