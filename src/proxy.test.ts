import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from './config/env.js';
import { getFastifyOptions } from './create-app.js';
import { createLicensesRoutes } from './modules/licenses/licenses.routes.js';

vi.mock('./config/env.js', () => ({
  env: {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost/kouci_test',
    VERCEL: undefined,
    TRUSTED_PROXIES: undefined
  }
}));

describe('production HTTPS behind proxies', () => {
  const apps: ReturnType<typeof Fastify>[] = [];
  const payload = {
    activationCode: 'KOUCI-0123-4567-89AB-CDEF-GHJK-MNPQ-RSTV',
    installId: '17cc32aa-ccf3-46e7-b858-2747c1e1ac1b',
    appVersion: '0.8.1'
  };

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it.each([
    {
      name: 'Vercel HTTPS',
      vercel: '1',
      proxies: undefined,
      proto: 'https',
      status: 200
    },
    {
      name: 'Vercel HTTP',
      vercel: '1',
      proxies: undefined,
      proto: 'http',
      status: 403
    },
    {
      name: 'Vercel missing protocol',
      vercel: '1',
      proxies: undefined,
      proto: undefined,
      status: 403
    },
    {
      name: 'untrusted direct client',
      vercel: undefined,
      proxies: undefined,
      proto: 'https',
      status: 403
    },
    {
      name: 'disabled Vercel flag',
      vercel: '0',
      proxies: undefined,
      proto: 'https',
      status: 403
    },
    {
      name: 'configured self-hosted proxy',
      vercel: undefined,
      proxies: ['192.0.2.10/32'],
      proto: 'https',
      status: 200
    },
    {
      name: 'explicit allowlist overrides Vercel',
      vercel: '1',
      proxies: ['192.0.2.20/32'],
      proto: 'https',
      status: 403
    }
  ])('$name', async ({ vercel, proxies, proto, status }) => {
    env.VERCEL = vercel;
    env.TRUSTED_PROXIES = proxies;
    const activate = vi.fn().mockResolvedValue({ signature: 'test-signature' });
    const app = Fastify({ ...getFastifyOptions(), logger: false });
    apps.push(app);
    await app.register(
      createLicensesRoutes({ activate, resetActivations: vi.fn() }),
      {
        prefix: '/api/v1/licenses'
      }
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/licenses/activate',
      remoteAddress: '192.0.2.10',
      headers: proto ? { 'x-forwarded-proto': proto } : {},
      payload
    });

    expect(response.statusCode).toBe(status);
    if (status === 200) {
      expect(activate).toHaveBeenCalledWith(payload);
    } else {
      expect(response.json().code).toBe('HTTPS_REQUIRED');
      expect(activate).not.toHaveBeenCalled();
    }
  });

  it('uses the client IP from the immediate proxy, ignoring earlier forwarded hops', async () => {
    env.VERCEL = '1';
    env.TRUSTED_PROXIES = undefined;
    const app = Fastify({ ...getFastifyOptions(), logger: false });
    apps.push(app);
    app.get('/client-ip', async (request) => ({ ip: request.ip }));

    const response = await app.inject({
      url: '/client-ip',
      remoteAddress: '192.0.2.10',
      headers: { 'x-forwarded-for': '198.51.100.99, 203.0.113.10' }
    });

    expect(response.json()).toEqual({ ip: '203.0.113.10' });
  });
});
