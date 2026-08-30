import { env } from './config/env.js';
import { closeDb } from './db/index.js';
import app from './app.js';

async function start() {
  try {
    await app.listen({
      port: env.PORT
    });

    const addressInfo = app.server.address();
    if (addressInfo && typeof addressInfo === 'object') {
      app.log.info(
        `Server listening on http://${addressInfo.address}:${env.PORT}`
      );
    }
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    await closeDb();
    process.exit(1);
  }
}

async function shutdown(signal: string) {
  app.log.info(`Received ${signal}; shutting down gracefully`);

  try {
    await app.close();
    await closeDb();
    process.exit(0);
  } catch (error) {
    app.log.error(error, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

void start();
