import cors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';

type NodeEnvironment = 'development' | 'test' | 'production';

export function isAllowedCorsOrigin(
  origin: string | undefined,
  nodeEnv: NodeEnvironment
): boolean {
  if (!origin) {
    return true;
  }

  try {
    const url = new URL(origin);

    if (url.origin !== origin) {
      return false;
    }

    if (
      url.protocol === 'https:' &&
      url.port === '' &&
      (url.hostname === 'kouci.app' || url.hostname.endsWith('.kouci.app'))
    ) {
      return true;
    }

    return (
      nodeEnv === 'development' &&
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.hostname === 'localhost'
    );
  } catch {
    return false;
  }
}

export function registerCors(
  app: FastifyInstance,
  nodeEnv: NodeEnvironment = env.NODE_ENV
): void {
  void app.register(cors, {
    origin: (origin, callback) => {
      callback(null, isAllowedCorsOrigin(origin, nodeEnv));
    },
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  });
}
