import type { FastifyInstance } from 'fastify';
import { AppError } from '../shared/errors/app-error.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');

    if (error instanceof AppError) {
      void reply.status(error.statusCode).send({ message: error.message });
      return;
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      error.statusCode === 429
    ) {
      const message =
        'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Too many requests. Please try again later.';
      void reply.status(429).send({ message });
      return;
    }

    void reply.status(500).send({ message: 'Internal server error' });
  });
}
