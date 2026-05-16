// Fixture-Loader für Test-Daten.
// Wird ab TT-01a (DB-Schicht 1) mit echten INSERT-Statements gefüllt.

import { getOwnerPool } from './db.js';

export type FixtureName = 'empty' | 'mini-pilot' | 'full-pilot';

export async function seedFixture(name: FixtureName): Promise<void> {
  const pool = getOwnerPool();

  switch (name) {
    case 'empty':
      // Keine Daten — clean DB
      return;

    case 'mini-pilot':
      // 1 Tenant, 1 Admin-User, 2 Employees, 2 Properties — minimaler Smoke-Test-Stand
      // Wird in TT-01e mit echten Seed-Daten gefüllt
      throw new Error('mini-pilot Fixture noch nicht implementiert (wird in TT-01e gefüllt)');

    case 'full-pilot':
      // Kompletter Pilot-Tenant aus TT-01e Seed
      throw new Error('full-pilot Fixture noch nicht implementiert (wird in TT-01e gefüllt)');

    default:
      throw new Error(`Unbekannte Fixture: ${name as string}`);
  }

  // Pool nicht schließen — wird in afterAll() zentral beendet
  void pool;
}

export async function cleanDb(): Promise<void> {
  const pool = getOwnerPool();
  // Wird ab TT-01a auf alle bekannten Tabellen erweitert
  // Aktuell: nur Smoke — kein Schema vorhanden
  await pool.query(`SELECT 1`);
}
