// Production-Pendant zu tests/helpers/withTestTenant.ts
// Setzt app.current_tenant_id für RLS-Filter und führt die Funktion aus.
// Reset vor release() — sonst erbt der nächste Pool-User den Wert.

import type { Pool, PoolClient } from 'pg';
import { getAppPool } from './pools.js';

export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
  pool: Pool = getAppPool()
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query(`SELECT set_config('app.current_tenant_id', $1, false)`, [tenantId]);
    return await fn(client);
  } finally {
    try {
      await client.query(`SELECT set_config('app.current_tenant_id', '', false)`);
    } catch {
      // Wenn der Client kaputt ist, Reset überspringen
    }
    client.release();
  }
}

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
