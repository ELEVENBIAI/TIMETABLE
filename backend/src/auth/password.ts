// Password-Hash + Compare via bcryptjs (ADR-09)
// bcryptjs ist pure JS — kompatibel mit Node 20+ ohne Native-Compile.

import bcrypt from 'bcryptjs';
import { SECURITY } from '../config.js';

// Konstanter Dummy-Hash für Timing-Attack-Schutz.
// Wird bei non-existent user gegen das eingegebene Password verglichen,
// damit die Login-Latency gleich bleibt (siehe routes/auth.ts).
//
// Dieser Hash entspricht bcrypt('UNUSED', 12).
export const DUMMY_HASH = '$2b$12$Du8GMNZmNRRBJ.U3hHKZw.0NCJqVPaXxLqGCAGBfYzVoUPKsbXJze';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SECURITY.BCRYPT_COST);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
