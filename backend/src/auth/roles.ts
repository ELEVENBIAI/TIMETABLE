// Rollen-Modell (ADR-09)
// Muss synchron sein mit CHECK-Constraint in users.role

export const USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'PLANNER',
  'FOREMAN',
  'EMPLOYEE',
  'PROPERTY_MANAGER',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}
