// Tenant-Theming via data-tenant Attribut auf <html>.
// Theme-CSS-Files (themes/{tenant}.css) sind beim Bootstrap geladen — applyTenantTheme
// schaltet nur das Attribut um, kein dynamischer Import.

export const SUPPORTED_TENANTS = ['gepard', 'immobilienbutler', 'paul'] as const;
export type Tenant = (typeof SUPPORTED_TENANTS)[number];

const DEFAULT_TENANT: Tenant = 'gepard';

export function isTenant(value: unknown): value is Tenant {
  return typeof value === 'string' && (SUPPORTED_TENANTS as readonly string[]).includes(value);
}

export function applyTenantTheme(tenant: Tenant): void {
  document.documentElement.dataset.tenant = tenant;
}

export function getCurrentTenant(): Tenant {
  const attr = document.documentElement.dataset.tenant;
  return isTenant(attr) ? attr : DEFAULT_TENANT;
}

/**
 * Auflösung der Tenant-Identität: JWT-Claim > localStorage-Debug > Default (Gepard, MVP-Pilot).
 * Wird beim App-Bootstrap gerufen, bevor React rendert.
 */
export function resolveAndApplyTenant(jwtTenant?: string | null): Tenant {
  if (isTenant(jwtTenant)) {
    applyTenantTheme(jwtTenant);
    return jwtTenant;
  }
  const debug = typeof localStorage !== 'undefined' ? localStorage.getItem('debugTenant') : null;
  if (isTenant(debug)) {
    applyTenantTheme(debug);
    return debug;
  }
  applyTenantTheme(DEFAULT_TENANT);
  return DEFAULT_TENANT;
}
