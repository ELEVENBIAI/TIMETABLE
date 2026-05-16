// Fastify preHandler: JWT verifizieren und request.user setzen
// Zusätzlich: request.log um tenantId + userId anreichern (ADR-15),
// request.locale aus JWT-Claim setzen (ADR-16).

import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyJwt, type JwtPayloadWithMeta } from './jwt.js';
import { t } from '../lib/i18n.js';
import { applyUserLocale } from '../lib/locale.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayloadWithMeta;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        messageKey: 'errors.missingAuthHeader',
        message: t('errors.missingAuthHeader', request.locale),
      },
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const payload = verifyJwt(token);
    request.user = payload;
    // Locale aus JWT-Claim übernehmen (überschreibt Accept-Language-Locale)
    applyUserLocale(request, payload.locale);
    // Request-Log um Auth-Context erweitern (ADR-15)
    request.log = request.log.child({ tenantId: payload.tenantId, userId: payload.userId });
  } catch (err) {
    request.log.warn({ err: { message: (err as Error).message } }, 'JWT-Verify failed');
    return reply.code(401).send({
      error: {
        code: 'INVALID_TOKEN',
        messageKey: 'errors.invalidToken',
        message: t('errors.invalidToken', request.locale),
      },
    });
  }
}
