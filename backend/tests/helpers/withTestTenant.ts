import { type Pool, type PoolClient } from 'pg';
import { getAppPool } from './db.js';

// Führt eine Funktion im Kontext eines bestimmten Tenants aus.
// Setzt `app.current_tenant_id` als Session-Variable — RLS-Policies filtern dann automatisch.
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
    await client.query(`SET LOCAL app.current_tenant_id = $1`, [tenantId]);
    return await fn(client);
  } finally {
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
    await client.query(`SET LOCAL app.is_super_admin = 'true'`);
    return await fn(client);
  } finally {
    client.release();
  }
}
