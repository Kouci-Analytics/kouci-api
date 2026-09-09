import { timingSafeEqual } from 'node:crypto';
import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import {
  activationRequestSchema,
  installIdSchema
} from './licenses.schemas.js';
import { LicenseError } from './licenses.errors.js';
import { LicensesService } from './licenses.service.js';

type LicenseOperations = Pick<LicensesService, 'activate' | 'resetActivations'>;
const resetParamsSchema = z.strictObject({ licenseId: z.uuid() });
const resetBodySchema = z.strictObject({
  installId: installIdSchema.optional()
});

export function createLicensesRoutes(
  service: LicenseOperations = new LicensesService()
): FastifyPluginAsync {
  return async (app) => {
    // Handle errors here to avoid logging database parameter values or request bodies.
    app.setErrorHandler((error, request, reply) => {
      if (error instanceof LicenseError) {
        return reply
          .status(error.statusCode)
          .send({ code: error.code, message: error.message });
      }
      const status =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? error.statusCode
          : undefined;
      if (status === 429) {
        return reply.status(429).send({
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.'
        });
      }
      if (status === 413) {
        return reply.status(413).send({
          code: 'REQUEST_TOO_LARGE',
          message: 'Request body is too large.'
        });
      }
      if (status === 400 || status === 415) {
        return reply.status(status).send({
          code: 'INVALID_REQUEST',
          message: 'A valid JSON request body is required.'
        });
      }
      request.log.error({ requestId: request.id }, 'License operation failed');
      return reply.status(500).send({
        code: 'SERVER_ERROR',
        message: 'Unable to process this request. Please try again later.'
      });
    });

    app.addHook('onRequest', async (request, reply) => {
      reply.header('Cache-Control', 'no-store');
      if (env.NODE_ENV === 'production' && request.protocol !== 'https') {
        return reply
          .status(403)
          .send({ code: 'HTTPS_REQUIRED', message: 'HTTPS is required.' });
      }
    });

    await app.register(rateLimit, { global: false });
    const options = {
      bodyLimit: 2048,
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
    };

    app.post('/activate', options, async (request, reply) => {
      const parsed = activationRequestSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          code: 'INVALID_REQUEST',
          message: 'Invalid activation request.'
        });
      }
      return reply.status(200).send(await service.activate(parsed.data));
    });

    // This optional endpoint is for the future back office, never the mobile app.
    app.post(
      '/:licenseId/reset-activation',
      {
        ...options,
        // The onRequest rate limiter runs before authentication, including failed attempts.
        preValidation: async (request, reply) => {
          if (!env.LICENSE_ADMIN_TOKEN) {
            return reply.status(503).send({
              code: 'ADMIN_UNAVAILABLE',
              message: 'HTTP license administration is not configured.'
            });
          }
          const expected = Buffer.from(`Bearer ${env.LICENSE_ADMIN_TOKEN}`);
          const supplied = Buffer.from(request.headers.authorization ?? '');
          if (
            expected.length !== supplied.length ||
            !timingSafeEqual(expected, supplied)
          ) {
            return reply.status(401).send({
              code: 'UNAUTHORIZED',
              message: 'Administrator authentication is required.'
            });
          }
        }
      },
      async (request, reply) => {
        const params = resetParamsSchema.safeParse(request.params);
        const body = resetBodySchema.safeParse(request.body);
        if (!params.success || !body.success) {
          return reply.status(400).send({
            code: 'INVALID_REQUEST',
            message: 'Invalid activation reset request.'
          });
        }
        return service.resetActivations(
          params.data.licenseId,
          body.data.installId
        );
      }
    );
  };
}

export const licensesRoutes = createLicensesRoutes();
