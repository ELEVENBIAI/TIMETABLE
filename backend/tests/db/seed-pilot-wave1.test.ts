import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { cleanDb, getOwnerPool } from '../helpers/db.js';

const TENANT_ID = '11111111-1111-1111-1111-111111111111';
const ADMIN_ID = 'aaaaaaaa-1111-1111-1111-111111111111';
const PM_ID = '20202020-1111-1111-1111-111111111111';
const TEMPLATE_ID = '20202020-3000-1111-1111-111111111111';
const SCHEDULE_ID = '20202020-4000-1111-1111-111111111111';

const MIGRATIONS_DIR = path.join(import.meta.dirname, '..', '..', 'src', 'db', 'migrations');
const SEED_SQL = readFileSync(path.join(MIGRATIONS_DIR, '0009_pilot_wave1_seed.sql'), 'utf8');

/**
 * Setup für ELE-202-Tests: Pilot-Stammdaten aus 0005 nachbauen (cleanDb hat sie geleert),
 * dann ELE-202 Demo-Seed ausführen.
 */
async function seedPilotStammdaten(): Promise<void> {
  const pool = getOwnerPool();
  // Tenant + Admin-User + 4 Properties + 4 Employees + 9 Service-Types + 6 Waste-Bin-Types
  // (so wie in 0005_schicht5.sql — minimaler Re-Bau für den Test-Kontext)
  await pool.query(
    `INSERT INTO tenants (id, name, slug, brand) VALUES ($1, 'Pilot', 'pilot', 'GEPARD')`,
    [TENANT_ID]
  );
  await pool.query(
    `INSERT INTO users (id, tenant_id, email, password_hash, display_name, role)
     VALUES ($1, $2, 'admin@pilot.local', 'placeholder-hash', 'Pilot Admin', 'ADMIN')`,
    [ADMIN_ID, TENANT_ID]
  );
  // Properties (4)
  const properties: Array<[string, string, string, string, string]> = [
    ['a1a1a1a1-1111-1111-1111-111111111111', 'Porzer Straße 12', 'Porzer Straße', '51143', 'Köln'],
    [
      'a1a1a1a1-2222-1111-1111-111111111111',
      'Deutschlandstraße 7',
      'Deutschlandstraße',
      '51149',
      'Köln',
    ],
    ['a1a1a1a1-3333-1111-1111-111111111111', 'Lorweg 3', 'Lorweg', '51147', 'Köln'],
    ['a1a1a1a1-4444-1111-1111-111111111111', 'Hochhaus Am Park', 'Parkstraße', '51145', 'Köln'],
  ];
  for (const [id, name, street, zip, city] of properties) {
    await pool.query(
      `INSERT INTO properties (id, tenant_id, name, street, zip_code, city, property_type)
       VALUES ($1, $2, $3, $4, $5, $6, 'APARTMENT_BUILDING')`,
      [id, TENANT_ID, name, street, zip, city]
    );
  }
  // Employees (4)
  const employees: Array<[string, string, string, string, number]> = [
    ['bbbbbbbb-1111-1111-1111-111111111111', 'Daniel', 'K.', 'FULLTIME', 40],
    ['bbbbbbbb-2222-1111-1111-111111111111', 'Anna', 'S.', 'PARTTIME', 20],
    ['bbbbbbbb-3333-1111-1111-111111111111', 'Gabi', 'M.', 'PARTTIME', 15],
    ['bbbbbbbb-4444-1111-1111-111111111111', 'Jürgen', 'SubU', 'SUBCONTRACTOR', 30],
  ];
  for (const [id, first, last, type, hours] of employees) {
    await pool.query(
      `INSERT INTO employees (id, tenant_id, first_name, last_name, employee_type, weekly_hours)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, TENANT_ID, first, last, type, hours]
    );
  }
  // Service-Types (8 — wir nutzen die in der Migration referenzierten)
  const serviceTypes: Array<[string, string, string, string, number]> = [
    [
      'cccccccc-1111-1111-1111-111111111111',
      'Treppenhaus Reinigung',
      'Treppenhaus',
      'CLEANING',
      30,
    ],
    ['cccccccc-2222-1111-1111-111111111111', 'Gartenpflege', 'Garten', 'GARDEN', 60],
    ['cccccccc-3333-1111-1111-111111111111', 'Hofflächenpflege', 'Hof', 'CLEANING', 30],
    ['cccccccc-4444-1111-1111-111111111111', 'Mülltonnen rausstellen', 'Müll raus', 'WASTE', 10],
    ['cccccccc-5555-1111-1111-111111111111', 'Mülltonnen reinstellen', 'Müll rein', 'WASTE', 10],
    ['cccccccc-7777-1111-1111-111111111111', 'Fensterreinigung', 'Fenster', 'CLEANING', 45],
    ['cccccccc-8888-1111-1111-111111111111', 'Dachrinne reinigen', 'Dachrinne', 'MAINTENANCE', 30],
    ['cccccccc-9999-1111-1111-111111111111', 'Kellerreinigung', 'Keller', 'CLEANING', 20],
  ];
  for (const [id, name, shortName, cat, dur] of serviceTypes) {
    await pool.query(
      `INSERT INTO service_types (id, tenant_id, name, short_name, category, color_code, default_duration_min)
       VALUES ($1, $2, $3, $4, $5, '#3B82F6', $6)`,
      [id, TENANT_ID, name, shortName, cat, dur]
    );
  }
  // Waste-Bin-Types (3 — die in der Migration referenzierten)
  const wasteBinTypes: Array<[string, string, string]> = [
    ['ffffffff-1111-1111-1111-111111111111', 'RESIDUAL', 'Restmüll'],
    ['ffffffff-2222-1111-1111-111111111111', 'PAPER', 'Papier'],
    ['ffffffff-5555-1111-1111-111111111111', 'BIO', 'Biomüll'],
  ];
  for (const [id, code, name] of wasteBinTypes) {
    await pool.query(
      `INSERT INTO waste_bin_types (id, tenant_id, code, name)
       VALUES ($1, $2, $3, $4)`,
      [id, TENANT_ID, code, name]
    );
  }
}

async function countRow(table: string, where = 'is_deleted=FALSE'): Promise<number> {
  const pool = getOwnerPool();
  const r = await pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM ${table} WHERE ${where}`
  );
  return Number(r.rows[0].c);
}

describe('ELE-202: Pilot Wave-1 Demo-Seed Migration', () => {
  beforeAll(async () => {
    await cleanDb();
    await seedPilotStammdaten();
  });

  it('Migration legt erwartete Anzahl Records an', async () => {
    const pool = getOwnerPool();
    await pool.query(SEED_SQL);

    expect(await countRow('property_managers', `id = '${PM_ID}'`)).toBe(1);
    expect(await countRow('contracts', `property_manager_id = '${PM_ID}'`)).toBe(4);
    expect(await countRow('property_services')).toBe(10);
    expect(await countRow('waste_schedules')).toBe(4);
    expect(await countRow('schedule_templates', `id = '${TEMPLATE_ID}'`)).toBe(1);
    expect(await countRow('template_entries', `template_id = '${TEMPLATE_ID}'`)).toBe(16);
    expect(await countRow('schedules', `id = '${SCHEDULE_ID}'`)).toBe(1);
    expect(await countRow('schedule_entries', `schedule_id = '${SCHEDULE_ID}'`)).toBe(16);
  });

  it('verknüpft Properties mit Property-Manager + Contract', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM properties
       WHERE tenant_id = $1 AND property_manager_id = $2 AND contract_id IS NOT NULL`,
      [TENANT_ID, PM_ID]
    );
    expect(Number(r.rows[0].c)).toBe(4);
  });

  it('DRAFT-Schedule für KW 21/2026 mit week_start 2026-05-18', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{
      week_start: string;
      status: string;
      week_number: number;
      generation_method: string;
    }>(
      `SELECT week_start::text, status, week_number, generation_method FROM schedules WHERE id = $1`,
      [SCHEDULE_ID]
    );
    expect(r.rows[0]).toMatchObject({
      week_start: '2026-05-18',
      status: 'DRAFT',
      week_number: 21,
      generation_method: 'FROM_TEMPLATE',
    });
  });

  it('Schedule-Entries verteilen sich Mo-Fr', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ day_of_week: number; cnt: string }>(
      `SELECT day_of_week, COUNT(*)::text AS cnt FROM schedule_entries
       WHERE schedule_id = $1 GROUP BY day_of_week ORDER BY day_of_week`,
      [SCHEDULE_ID]
    );
    const byDay = Object.fromEntries(r.rows.map((x) => [x.day_of_week, Number(x.cnt)]));
    // Mo-Fr (1-5) müssen alle Einträge haben
    expect(byDay[1]).toBeGreaterThan(0);
    expect(byDay[2]).toBeGreaterThan(0);
    expect(byDay[3]).toBeGreaterThan(0);
    expect(byDay[4]).toBeGreaterThan(0);
    expect(byDay[5]).toBeGreaterThan(0);
    // Sa+So (6+7) leer
    expect(byDay[6]).toBeUndefined();
    expect(byDay[7]).toBeUndefined();
  });

  it('Migration ist idempotent (zweite Anwendung ändert nichts)', async () => {
    const pool = getOwnerPool();
    const before = await countRow('property_services');
    await pool.query(SEED_SQL);
    const after = await countRow('property_services');
    expect(after).toBe(before);
  });

  it('Frequenz-Mix wird gesetzt (WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY)', async () => {
    const pool = getOwnerPool();
    const r = await pool.query<{ frequency: string; cnt: string }>(
      `SELECT frequency, COUNT(*)::text AS cnt FROM property_services
       WHERE tenant_id = $1 GROUP BY frequency`,
      [TENANT_ID]
    );
    const byFreq = Object.fromEntries(r.rows.map((x) => [x.frequency, Number(x.cnt)]));
    expect(byFreq.WEEKLY).toBeGreaterThan(0);
    expect(byFreq.BIWEEKLY).toBeGreaterThan(0);
    expect(byFreq.MONTHLY).toBeGreaterThan(0);
    expect(byFreq.QUARTERLY).toBeGreaterThan(0);
  });
});
