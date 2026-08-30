import Fastify, { type FastifyInstance } from 'fastify';
import { registerModules } from './modules/index.js';
import { registerErrorHandler } from './plugins/error-handler.js';

export function getFastifyOptions() {
  return {
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  };
}

export function configureApp(app: FastifyInstance) {
  app.get('/health', async () => ({ status: 'ok' }));

  void app.register(registerModules);
  registerErrorHandler(app);

  return app;
}

export function buildApp() {
  return configureApp(Fastify(getFastifyOptions()));
}
