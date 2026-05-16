// DB-Pools für Production (ADR-08)
// owner-Pool: BYPASSRLS, für Migrations + Admin-Operationen
// app-Pool:   NOBYPASSRLS, für alle API-Requests
//
// Liest process.env zur Laufzeit (nicht aus config.env-Singleton),
// damit Tests die Verbindungs-URL via process.env überschreiben können.

import { Pool } from 'pg';

let ownerPool: Pool | null = null;
let appPool: Pool | null = null;

export function getOwnerPool(): Pool {
  if (!ownerPool) {
    const url = process.env.DATABASE_URL_OWNER;
    if (!url) {
      throw new Error('DATABASE_URL_OWNER not set');
    }
    ownerPool = new Pool({ connectionString: url, max: 10 });
  }
  return ownerPool;
}

export function getAppPool(): Pool {
  if (!appPool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL not set');
    }
    appPool = new Pool({ connectionString: url, max: 30 });
  }
  return appPool;
}

export async function closePools(): Promise<void> {
  if (appPool) {
    await appPool.end();
    appPool = null;
  }
  if (ownerPool) {
    await ownerPool.end();
    ownerPool = null;
  }
}
