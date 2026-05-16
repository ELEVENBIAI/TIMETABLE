// Fixture-Loader für Test-Daten.
// Initial befüllt in ELE-164 (DB-Schicht 1). Erweiterung mit Seed-Daten in ELE-168.

import { getOwnerPool } from './db.js';

// Deterministische IDs für Tests
export const FIXTURE_IDS = {
  tenantA: '11111111-1111-1111-1111-111111111111',
  tenantB: '22222222-2222-2222-2222-222222222222',
  userA1Admin: '11111111-aaaa-1111-1111-111111111111',
  userB1Admin: '22222222-bbbb-2222-2222-222222222222',
  propertyA1: '11111111-cccc-1111-1111-111111111111',
  propertyB1: '22222222-dddd-2222-2222-222222222222',
} as const;

export type FixtureName = 'empty' | 'mini-pilot' | 'two-tenants';

export async function seedFixture(name: FixtureName): Promise<void> {
  const pool = getOwnerPool();

  switch (name) {
    case 'empty':
      return;

    case 'mini-pilot':
      // 1 Tenant + 1 Admin-User + 1 Property — kleinster Stand für RLS-Tests
      await pool.query(
        `INSERT INTO tenants (id, name, slug, brand) VALUES ($1, 'Pilot Tenant', 'pilot', 'GEPARD')`,
        [FIXTURE_IDS.tenantA]
      );
      await pool.query(
        `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES
         ($1, $2, 'admin@pilot.local', 'placeholder-hash', 'Pilot Admin', 'ADMIN')`,
        [FIXTURE_IDS.userA1Admin, FIXTURE_IDS.tenantA]
      );
      await pool.query(
        `INSERT INTO properties (id, tenant_id, name, street, zip_code, city, property_type) VALUES
         ($1, $2, 'Porzer Str. 12', 'Porzer Straße', '51143', 'Köln', 'APARTMENT_BUILDING')`,
        [FIXTURE_IDS.propertyA1, FIXTURE_IDS.tenantA]
      );
      return;

    case 'two-tenants':
      // 2 Tenants — Pflicht für Cross-Tenant-RLS-Tests
      await pool.query(
        `INSERT INTO tenants (id, name, slug, brand) VALUES
         ($1, 'Pilot A', 'pilot-a', 'GEPARD'),
         ($2, 'Pilot B', 'pilot-b', 'IMMOBILIENBUTLER')`,
        [FIXTURE_IDS.tenantA, FIXTURE_IDS.tenantB]
      );
      await pool.query(
        `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role) VALUES
         ($1, $2, 'admin-a@local', 'h', 'Admin A', 'ADMIN'),
         ($3, $4, 'admin-b@local', 'h', 'Admin B', 'ADMIN')`,
        [FIXTURE_IDS.userA1Admin, FIXTURE_IDS.tenantA, FIXTURE_IDS.userB1Admin, FIXTURE_IDS.tenantB]
      );
      await pool.query(
        `INSERT INTO properties (id, tenant_id, name, street, zip_code, city, property_type) VALUES
         ($1, $2, 'Property A1', 'Streetname A', '51143', 'Köln', 'APARTMENT_BUILDING'),
         ($3, $4, 'Property B1', 'Streetname B', '60311', 'Frankfurt', 'COMMERCIAL')`,
        [FIXTURE_IDS.propertyA1, FIXTURE_IDS.tenantA, FIXTURE_IDS.propertyB1, FIXTURE_IDS.tenantB]
      );
      return;

    default:
      throw new Error(`Unbekannte Fixture: ${name as string}`);
  }
}
