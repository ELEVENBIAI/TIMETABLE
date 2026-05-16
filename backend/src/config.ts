// Production-Config-Loader.
// Liest .env (aus Repo-Root) und kombiniert mit lib/config.js (SSoT-Konstanten).

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const PROJECT_ROOT = path.resolve(import.meta.dirname, '..', '..');

// .env aus Repo-Root laden (kein dotenv-Dep)
const ROOT_ENV = path.join(PROJECT_ROOT, '.env');
if (existsSync(ROOT_ENV)) {
  for (const line of readFileSync(ROOT_ENV, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

// lib/config.js ist CommonJS — via createRequire laden
interface LibConfig {
  VERSION: string;
  CONFIG: { PROJECT_NAME: string; ISSUE_PREFIX: string; GITHUB_REPO: string };
  FEATURES: {
    PLAN_GENERATOR_ENABLED: boolean;
    REASSIGNMENT_AI_ENABLED: boolean;
    TIME_LOGS_GPS_REQUIRED: boolean;
    ROUTING_PROVIDER: 'ORS' | 'GOOGLE' | 'NONE';
    MAINTENANCE_MODE: boolean;
  };
  SECURITY: {
    JWT_SECRET_MIN_LENGTH: number;
    JWT_EXPIRES_IN: string;
    BCRYPT_COST: number;
    LOGIN_MAX_FAILED_ATTEMPTS: number;
    LOGIN_LOCKOUT_MINUTES: number;
  };
  PERFORMANCE: {
    REQUEST_TIMEOUT_MS: number;
    RATE_LIMIT_GLOBAL_PER_MINUTE: number;
    RATE_LIMIT_AUTH_PER_MINUTE: number;
  };
}

const libConfig = require(path.join(PROJECT_ROOT, 'lib', 'config.js')) as LibConfig;

export const VERSION = libConfig.VERSION;
export const FEATURES = libConfig.FEATURES;
export const SECURITY = libConfig.SECURITY;
export const PERFORMANCE = libConfig.PERFORMANCE;
export const PROJECT = libConfig.CONFIG;

// Runtime-Config aus .env
export const env = {
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as 'development' | 'production' | 'test',
  PORT: Number(process.env.PORT ?? 3000),
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  DATABASE_URL_OWNER: process.env.DATABASE_URL_OWNER,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),
};

// Validierung
export function validateEnv(): void {
  const required = ['DATABASE_URL_OWNER', 'DATABASE_URL', 'JWT_SECRET'] as const;
  const missing = required.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[config] FEHLER: ENV-Variablen fehlen: ${missing.join(', ')}\n` +
        `  → DATABASE_URL_*: node scripts/setup-dev-db.mjs\n` +
        `  → JWT_SECRET: openssl rand -base64 48`
    );
  }
  if (env.JWT_SECRET && env.JWT_SECRET.length < SECURITY.JWT_SECRET_MIN_LENGTH) {
    throw new Error(
      `[config] FEHLER: JWT_SECRET zu kurz (${env.JWT_SECRET.length} < ${SECURITY.JWT_SECRET_MIN_LENGTH} Zeichen). Bitte 'openssl rand -base64 48' in .env als JWT_SECRET eintragen.`
    );
  }
}
