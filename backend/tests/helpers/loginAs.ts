// JWT-Erzeugung für Test-User.
// Wird erst nach ELE-169 (Auth-Skeleton) mit echter JWT-Lib gefüllt — hier nur Interface-Skelett.

export type TestRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'PLANNER'
  | 'FOREMAN'
  | 'EMPLOYEE'
  | 'PROPERTY_MANAGER';

export interface TestUser {
  userId: string;
  tenantId: string;
  role: TestRole;
  isSuperAdmin: boolean;
}

export interface AuthHeader {
  Authorization: string;
}

// Platzhalter — wird in ELE-169 durch echte JWT-Generierung ersetzt.
// Idee: nimmt User aus Seed-Fixture, generiert JWT mit selbem SECRET wie Backend.
export function loginAs(_user: Partial<TestUser>): AuthHeader {
  throw new Error(
    'loginAs() noch nicht implementiert — wird in ELE-169 (Backend-Skeleton) mit echter JWT-Generierung gefüllt'
  );
}
