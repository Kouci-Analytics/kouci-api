import Fastify, { type FastifyInstance } from 'fastify';
import { registerModules } from './modules/index.js';
import { registerCors } from './plugins/cors.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { env } from './config/env.js';

export function getFastifyOptions() {
  return {
    trustProxy: env.TRUSTED_PROXIES?.length ? env.TRUSTED_PROXIES : false,
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      redact: [
        'req.headers.authorization',
        'req.body',
        'res.body',
        'activationCode',
        'LICENSE_SIGNING_PRIVATE_KEY',
        'LICENSE_CODE_HASH_SECRET',
        'LICENSE_ADMIN_TOKEN'
      ]
    }
  };
}

export function configureApp(app: FastifyInstance) {
  registerCors(app);

  app.get('/health', async () => ({ status: 'ok' }));

  void app.register(registerModules);
  registerErrorHandler(app);

  return app;
}

export function buildApp() {
  return configureApp(Fastify(getFastifyOptions()));
}
