// POST /api/auth/login
// - bcrypt-Compare
// - FAILED_LOGIN_COUNT++ bei Fehler
// - LOCKED_UNTIL nach N Fehlversuchen (Brute-Force-Schutz, ADR-09)
// - Timing-Attack-Schutz: bcrypt-Compare auch bei non-existent user
// - JWT-Issue mit Pflicht-Claims (ADR-09)

import type { FastifyInstance } from 'fastify';
import { createHash } from 'node:crypto';
import { SECURITY } from '../config.js';
import { DEFAULT_LOCALE, isLocale, signJwt, type Locale } from '../auth/jwt.js';
import { comparePassword, DUMMY_HASH } from '../auth/password.js';
import { isUserRole, type UserRole } from '../auth/roles.js';
import { getOwnerPool } from '../db/pools.js';
import { LockedError, UnauthorizedError } from '../lib/errors.js';
import { validateBody } from '../lib/validation.js';
import {
  forgotPasswordRequestSchema,
  loginRequestSchema,
  type ForgotPasswordResponse,
  type LoginResponse,
} from '../schemas/auth.js';

interface UserRow {
  id: string;
  tenant_id: string;
  password_hash: string;
  role: string;
  is_super_admin: boolean;
  failed_login_count: number;
  locked_until: Date | null;
  must_change_password: boolean;
  locale: string;
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/api/auth/login', {
    config: {
      // Strenger Rate-Limit (override für /api/auth/*).
      // In Test-Modus deaktiviert — sonst kollidieren sequentielle Test-Calls.
      rateLimit:
        process.env.NODE_ENV === 'test'
          ? false
          : { max: SECURITY.LOGIN_MAX_FAILED_ATTEMPTS * 2, timeWindow: '1 minute' },
    },
    schema: {
      description: 'Login mit Email + Passwort → JWT-Token',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
    handler: async (request): Promise<LoginResponse> => {
      const { email, password } = validateBody(loginRequestSchema, request);
      const pool = getOwnerPool();

      // User per Email lookup (case-insensitive)
      const result = await pool.query<UserRow>(
        `SELECT id, tenant_id, password_hash, role, is_super_admin,
                failed_login_count, locked_until, must_change_password, locale
         FROM users
         WHERE LOWER(email) = LOWER($1) AND is_deleted = FALSE`,
        [email]
      );

      const user = result.rows[0];

      // Timing-Attack-Schutz: auch wenn User nicht existiert, bcrypt-Compare ausführen
      if (!user) {
        await comparePassword(password, DUMMY_HASH);
        // PII-Sanitize: maskEmail im Log
        request.log.warn(
          { action: 'auth.login.failed', reason: 'user_not_found' },
          'Login fehlgeschlagen'
        );
        throw new UnauthorizedError('auth.loginFailed');
      }

      // Lockout-Check VOR Password-Compare
      if (user.locked_until && user.locked_until > new Date()) {
        request.log.warn(
          { action: 'auth.login.locked', userId: user.id, lockedUntil: user.locked_until },
          'Login fehlgeschlagen (gesperrt)'
        );
        throw new LockedError('errors.accountLocked');
      }

      const isValid = await comparePassword(password, user.password_hash);

      if (!isValid) {
        // FAILED_LOGIN_COUNT++ atomar, ggf. LOCKED_UNTIL setzen
        const lockoutThreshold = SECURITY.LOGIN_MAX_FAILED_ATTEMPTS;
        const lockoutDuration = `${SECURITY.LOGIN_LOCKOUT_MINUTES} minutes`;
        await pool.query(
          `UPDATE users
           SET failed_login_count = failed_login_count + 1,
               locked_until = CASE
                 WHEN failed_login_count + 1 >= $2
                 THEN NOW() + INTERVAL '${lockoutDuration}'
                 ELSE locked_until
               END
           WHERE id = $1`,
          [user.id, lockoutThreshold]
        );
        request.log.warn(
          { action: 'auth.login.failed', userId: user.id, reason: 'wrong_password' },
          'Login fehlgeschlagen'
        );
        throw new UnauthorizedError('auth.loginFailed');
      }

      // Erfolgreicher Login: failed_login_count reset, last_login_at setzen
      await pool.query(
        `UPDATE users
         SET failed_login_count = 0, locked_until = NULL, last_login_at = NOW()
         WHERE id = $1`,
        [user.id]
      );

      // Rolle validieren
      const role: UserRole = isUserRole(user.role) ? user.role : 'EMPLOYEE';
      // Locale validieren (DB-Default 'en', CHECK constraint sichert (en|de) ab)
      const locale: Locale = isLocale(user.locale) ? user.locale : DEFAULT_LOCALE;

      const token = signJwt({
        userId: user.id,
        tenantId: user.tenant_id,
        role,
        isSuperAdmin: user.is_super_admin,
        locale,
      });

      request.log.info(
        { action: 'auth.login.success', userId: user.id, tenantId: user.tenant_id },
        'Login erfolgreich'
      );

      return {
        token,
        expiresIn: SECURITY.JWT_EXPIRES_IN,
        mustChangePassword: user.must_change_password,
      };
    },
  });

  // ─── POST /api/auth/forgot-password ──────────────────────────────────────
  // Anti-Enumeration-Stub (ELE-201). Antwortet IMMER 200, egal ob User existiert.
  // Im MVP kein Mail-Send — wenn User existiert, wird die Anfrage geloggt für
  // späteres Audit / Wave-2-Mail-Integration. Bei unbekannter Email loggen wir
  // nur einen SHA-256-Hash der Email (DSGVO: kein Klartext-PII in Logs).
  fastify.post('/api/auth/forgot-password', {
    config: {
      // Strenger Rate-Limit gegen Email-Probing. In Test-Modus deaktiviert.
      rateLimit: process.env.NODE_ENV === 'test' ? false : { max: 5, timeWindow: '1 minute' },
    },
    schema: {
      description:
        'Password-Reset anfordern. Antwortet immer 200 (Anti-Enumeration). Im MVP kein Mail-Versand.',
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' },
        },
      },
    },
    handler: async (request): Promise<ForgotPasswordResponse> => {
      const { email } = validateBody(forgotPasswordRequestSchema, request);
      const pool = getOwnerPool();

      const result = await pool.query<{ id: string; tenant_id: string }>(
        `SELECT id, tenant_id FROM users
         WHERE LOWER(email) = LOWER($1) AND is_deleted = FALSE`,
        [email]
      );
      const user = result.rows[0];

      if (user) {
        // TODO Wave 2: Mail-Service-Integration (Reset-Token generieren + per Mail versenden)
        request.log.info(
          {
            action: 'auth.forgot_password_requested',
            userId: user.id,
            tenantId: user.tenant_id,
            ip: request.ip,
          },
          'Password-Reset angefordert (kein Mail-Versand im MVP)'
        );
      } else {
        // DSGVO: keine Klartext-Email im Log. Nur Hash für mögliche Korrelations-Analyse.
        const emailHash = createHash('sha256')
          .update(email.toLowerCase())
          .digest('hex')
          .slice(0, 16);
        request.log.warn(
          {
            action: 'auth.forgot_password_unknown_email',
            emailHash,
            ip: request.ip,
          },
          'Password-Reset für unbekannte Email'
        );
      }

      return { ok: true };
    },
  });
}
