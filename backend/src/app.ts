// Fastify-App-Setup — alle Plugins + Routes registriert
// Wird von server.ts und Tests benutzt (fastify.inject für API-Smoke).

import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import sensible from '@fastify/sensible';
import { randomUUID } from 'node:crypto';

import { env, PERFORMANCE, VERSION } from './config.js';
import { HttpError } from './lib/errors.js';
import { sanitizeForLog } from './lib/log-sanitize.js';
import { authRoutes } from './routes/auth.js';
import { configRoutes } from './routes/config.js';
import { healthRoutes } from './routes/health.js';
import { tenantRoutes } from './routes/tenants.js';
import { userRoutes } from './routes/users.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      // Pino-Serializer: sensible Felder maskieren (ADR-15)
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          remoteAddress: req.ip,
          // headers explizit weglassen — könnten Authorization enthalten
        }),
        res: (res) => ({ statusCode: res.statusCode }),
        err: (err) => ({
          type: err.name,
          message: err.message,
          stack: err.stack ?? '',
          ...(sanitizeForLog((err as { context?: unknown }).context ?? {}) as object),
        }),
      },
      ...(env.NODE_ENV !== 'production' && {
        transport: {
          target: 'pino-pretty',
          options: { translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
        },
      }),
    },
    // Request-ID-Generator (ADR-15: requestId Pflicht-Feld)
    genReqId: () => randomUUID(),
    // Performance: connection-timeout, body-limit
    bodyLimit: 1_000_000, // 1MB max
    connectionTimeout: PERFORMANCE.REQUEST_TIMEOUT_MS,
  });

  // ─── Plugins ────────────────────────────────────────────────────────────────
  await fastify.register(sensible);

  await fastify.register(cors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: PERFORMANCE.RATE_LIMIT_GLOBAL_PER_MINUTE,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
    errorResponseBuilder: (_req, context) => ({
      error: {
        code: 'RATE_LIMITED',
        message: `Zu viele Anfragen. Bitte ${context.after} warten.`,
      },
    }),
  });

  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Timetable API',
        version: VERSION,
        description: 'Hausmeisterservice Stundenplan-Plattform',
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/api/docs',
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });

  // ─── Request-Timing-Logging (ADR-14) ───────────────────────────────────────
  fastify.addHook('onResponse', async (request, reply) => {
    const duration = reply.elapsedTime;
    request.log.info(
      {
        route: `${request.method} ${request.routeOptions?.url ?? request.url}`,
        status: reply.statusCode,
        duration: Math.round(duration),
      },
      'request completed'
    );
  });

  // ─── Error-Handler (MUSS vor Routes registriert sein, sonst greift er nicht) ─
  // Error-Format (ADR-16): { error: { code, messageKey?, message } }
  fastify.setErrorHandler((rawErr, request, reply) => {
    const err = rawErr as Error & { statusCode?: number; code?: string };
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({
        error: {
          code: err.code,
          ...(err.messageKey && { messageKey: err.messageKey }),
          message: err.message,
        },
      });
    }
    // Fastify-Built-Ins (z.B. Validation, Rate-Limit)
    if (err.statusCode && err.statusCode < 500) {
      return reply.code(err.statusCode).send({
        error: { code: err.code ?? 'CLIENT_ERROR', message: err.message },
      });
    }
    // Unbekannter Server-Error → 500, kein Stack-Leak
    request.log.error({ err }, 'Unhandled error');
    return reply.code(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        messageKey: 'errors.internal',
        message: 'Interner Serverfehler',
      },
    });
  });

  // ─── Routes ─────────────────────────────────────────────────────────────────
  await fastify.register(healthRoutes);
  await fastify.register(configRoutes);
  await fastify.register(authRoutes);
  await fastify.register(tenantRoutes);
  await fastify.register(userRoutes);

  return fastify;
}
