import Fastify from 'fastify';
import { registerModules } from './modules/index.js';
import { registerErrorHandler } from './plugins/error-handler.js';

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  });

  app.get('/health', async () => ({ status: 'ok' }));

  void app.register(registerModules);
  registerErrorHandler(app);

  return app;
}
