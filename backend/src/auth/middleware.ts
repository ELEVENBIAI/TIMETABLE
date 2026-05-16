// Fastify preHandler: JWT verifizieren und request.user setzen
// Zusätzlich: request.log um tenantId + userId anreichern (ADR-15)

import type { FastifyReply, FastifyRequest } from 'fastify';
import { verifyJwt, type JwtPayloadWithMeta } from './jwt.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtPayloadWithMeta;
  }
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply
      .code(401)
      .send({ error: { code: 'UNAUTHORIZED', message: 'Authorization-Header fehlt' } });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const payload = verifyJwt(token);
    request.user = payload;
    // Request-Log um Auth-Context erweitern (ADR-15)
    request.log = request.log.child({ tenantId: payload.tenantId, userId: payload.userId });
  } catch (err) {
    request.log.warn({ err: { message: (err as Error).message } }, 'JWT-Verify failed');
    return reply
      .code(401)
      .send({ error: { code: 'INVALID_TOKEN', message: 'Token ungültig oder abgelaufen' } });
  }
}
