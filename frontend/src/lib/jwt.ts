// Reines JWT-Payload-Decoding ohne Signatur-Verify. Der Backend ist die Trust-Boundary —
// wir nutzen den Payload nur für UX-Zwecke (Tenant-Theme, Locale, Rolle für UI-Verbergen).
// Authoritative-Check passiert immer am Backend.

export interface JwtPayload {
  userId: string;
  tenantId: string;
  role: string;
  isSuperAdmin?: boolean;
  locale?: string;
  iat?: number;
  exp?: number;
  /** Frontend-spezifisch: Wenn Backend einen Tenant-Slug mitliefert (z.B. "gepard") */
  tenant?: string;
}

function base64UrlDecode(input: string): string {
  // base64url → base64
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const padStr = pad === 0 ? padded : padded + '='.repeat(4 - pad);
  if (typeof atob === 'function') {
    return atob(padStr);
  }
  // SSR/Node-Fallback
  return Buffer.from(padStr, 'base64').toString('binary');
}

export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const decoded = base64UrlDecode(parts[1]);
    // UTF-8-Decode via decodeURIComponent-Trick (atob liefert latin-1)
    const json = decodeURIComponent(
      decoded
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    const payload = JSON.parse(json) as JwtPayload;
    return payload;
  } catch {
    return null;
  }
}

export function isJwtExpired(payload: JwtPayload | null): boolean {
  if (!payload?.exp) return false; // Kein exp → behandeln als gültig (vertraut Backend)
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp < nowSec;
}
