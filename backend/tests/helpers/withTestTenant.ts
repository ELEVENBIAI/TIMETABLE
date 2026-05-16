import { type Pool, type PoolClient } from 'pg';
import { getAppPool } from './db.js';

// Führt eine Funktion im Kontext eines bestimmten Tenants aus.
// Setzt `app.current_tenant_id` als Session-Variable — RLS-Policies filtern dann automatisch.
//
// Wichtig: PostgreSQL akzeptiert keine prepared-statement-Parameter in `SET`,
// daher nutzen wir set_config() — funktional äquivalent, aber parameterisierbar.
//
// Verwendung:
//   await withTestTenant('11111111-...', async (client) => {
//     const result = await client.query('SELECT * FROM properties');
//     expect(result.rows).toHaveLength(2);
//   });

export async function withTestTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
  pool: Pool = getAppPool()
): Promise<T> {
  const client = await pool.connect();
  try {
    // Session-level Setting (is_local=false) — wirkt über mehrere Queries.
    // Vor release() unbedingt zurücksetzen, sonst erbt der nächste Pool-User den Wert.
    await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
    return await fn(client);
  } finally {
    try {
      await client.query(`SELECT set_config('app.current_tenant_id', '', false)`);
    } catch {
      // Wenn der Client kaputt ist (z.B. permission denied vorher), Reset überspringen
    }
    client.release();
  }
}

// Variante für Super-Admin-Kontext (Cross-Tenant-Sicht — nur bei BYPASSRLS-Rolle wirksam).
export async function withSuperAdmin<T>(
  fn: (client: PoolClient) => Promise<T>,
  pool: Pool = getAppPool()
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(`SELECT set_config('app.is_super_admin', 'true', false)`);
    return await fn(client);
  } finally {
    try {
      await client.query(`SELECT set_config('app.is_super_admin', '', false)`);
    } catch {
      // ignore
    }
    client.release();
  }
}
