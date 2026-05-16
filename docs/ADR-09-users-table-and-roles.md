# ADR-09: USERS-Tabelle + Rollen als CHECK-Constraint

**Status:** Active
**Datum:** 2026-05-16
**Kontext:** USERS-Tabelle wurde in Feature-Spec referenziert, aber nirgendwo definiert.

## Entscheidung

### USERS-Tabelle (Teil von TT-01a, Schicht 1)

```sql
CREATE TABLE USERS (
    ID                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    TENANT_ID         UUID NOT NULL REFERENCES TENANTS(ID),
    EMAIL             VARCHAR(255) NOT NULL,
    PASSWORD_HASH     VARCHAR(255) NOT NULL,        -- bcryptjs, cost ≥ 10
    DISPLAY_NAME      VARCHAR(200),
    ROLE              VARCHAR(30) NOT NULL,
    IS_SUPER_ADMIN    BOOLEAN DEFAULT FALSE,         -- Tenant-übergreifend (Zentrale)
    LAST_LOGIN_AT     TIMESTAMPTZ,
    FAILED_LOGIN_COUNT INTEGER DEFAULT 0,            -- Brute-Force-Schutz
    LOCKED_UNTIL      TIMESTAMPTZ,                   -- Account-Lock nach N Fehlversuchen
    PASSWORD_CHANGED_AT TIMESTAMPTZ DEFAULT NOW(),
    MUST_CHANGE_PASSWORD BOOLEAN DEFAULT FALSE,      -- Bei Initial-Anlage / Reset
    CREATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    UPDATED_AT        TIMESTAMPTZ DEFAULT NOW(),
    CREATED_BY        UUID,
    UPDATED_BY        UUID,
    IS_DELETED        BOOLEAN DEFAULT FALSE,
    DELETED_AT        TIMESTAMPTZ,

    CONSTRAINT UQ_USERS_EMAIL UNIQUE (EMAIL) WHERE IS_DELETED = FALSE,
    CONSTRAINT CK_USERS_ROLE CHECK (ROLE IN (
        'SUPER_ADMIN',
        'ADMIN',
        'PLANNER',
        'FOREMAN',
        'EMPLOYEE',
        'PROPERTY_MANAGER'
    ))
);

CREATE INDEX IDX_USERS_TENANT ON USERS(TENANT_ID) WHERE IS_DELETED = FALSE;
CREATE INDEX IDX_USERS_EMAIL ON USERS(EMAIL) WHERE IS_DELETED = FALSE;

ALTER TABLE USERS ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON USERS
    USING (
        TENANT_ID = current_setting('app.current_tenant_id', true)::uuid
        OR current_setting('app.is_super_admin', true)::boolean = true
    );
```

### Rollen-Modell: CHECK-Constraint statt separate Tabelle

| Variante | Vorteil | Nachteil |
|----------|---------|----------|
| **CHECK-Constraint** (gewählt) | Einfach, performant, kein Join, DB-erzwungen | Schema-Änderung bei neuen Rollen |
| Separate ROLES-Tabelle | Flexibel, Hierarchien möglich | Overkill für 6 stabile Rollen |
| String ohne Constraint | Maximal flexibel | Datenmüll, Tippfehler |

**Entscheidung:** CHECK-Constraint. Begründung:
- Nur 6 stabile Rollen — keine User-definierten Rollen geplant
- Performance: kein JOIN bei Auth-Check
- Type-Safety: TypeScript-Enum spiegelt DB-Constraint

### TypeScript-Mapping

```typescript
// backend/src/auth/roles.ts
export const USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'PLANNER',
  'FOREMAN',
  'EMPLOYEE',
  'PROPERTY_MANAGER',
] as const;
export type UserRole = typeof USER_ROLES[number];
```

### Rollen-Hierarchie (Berechtigungs-Matrix)

| Aktion | SUPER_ADMIN | ADMIN | PLANNER | FOREMAN | EMPLOYEE | PROPERTY_MANAGER |
|--------|:-:|:-:|:-:|:-:|:-:|:-:|
| Tenants verwalten | ✅ | – | – | – | – | – |
| Users verwalten (eigener Tenant) | ✅ | ✅ | – | – | – | – |
| Stammdaten CRUD | ✅ | ✅ | ✅ | – | – | – |
| Wochenplan erstellen | ✅ | ✅ | ✅ | – | – | – |
| Umplanung (eigenes Team) | ✅ | ✅ | ✅ | ✅ | – | – |
| Krankmeldung erfassen | ✅ | ✅ | ✅ | ✅ | ✅ (selbst) | – |
| Eigenen Plan ansehen | – | ✅ | ✅ | ✅ | ✅ | – |
| Check-in/out | – | – | – | ✅ | ✅ | – |
| Eigene Objekte ansehen (readonly) | ✅ | ✅ | ✅ | – | – | ✅ |

### EMPLOYEES.USER_ID — Verknüpfung

`EMPLOYEES.USER_ID UUID REFERENCES USERS(ID)` ist **optional**:
- Nicht jeder Mitarbeiter braucht Login (Subunternehmer ohne App-Zugang)
- Jeder Login (USERS) **kann** Mitarbeiter sein, muss aber nicht (PROPERTY_MANAGER, ADMIN)

### Auth-Flow

```
POST /api/auth/login (email, password)
  ├── USERS lookup by EMAIL (where IS_DELETED = FALSE)
  ├── LOCKED_UNTIL > NOW() → 423 Locked
  ├── bcrypt.compare(password, PASSWORD_HASH)
  │     ├── Match → JWT(userId, tenantId, role, isSuperAdmin, exp=7d)
  │     │           UPDATE LAST_LOGIN_AT, FAILED_LOGIN_COUNT=0
  │     └── No Match → FAILED_LOGIN_COUNT++
  │                    bei ≥5 → LOCKED_UNTIL = NOW() + 15min
  └── MUST_CHANGE_PASSWORD → 403 mit Code "PASSWORD_CHANGE_REQUIRED"
```

### Seed-Daten (Pilot-Tenant)

```sql
INSERT INTO TENANTS (ID, NAME, SLUG, BRAND) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Pilot Tenant', 'pilot', 'GEPARD');

-- bcryptjs hash for "ChangeMe123!" (cost 12) — must be reset on first login
INSERT INTO USERS (TENANT_ID, EMAIL, PASSWORD_HASH, DISPLAY_NAME, ROLE, IS_SUPER_ADMIN, MUST_CHANGE_PASSWORD) VALUES
    ('11111111-1111-1111-1111-111111111111', 'admin@pilot.local', '<bcrypt-hash>', 'Pilot Admin', 'ADMIN', false, true),
    ('11111111-1111-1111-1111-111111111111', 'robert@pilot.local', '<bcrypt-hash>', 'Robert (Planner)', 'PLANNER', false, true),
    ('11111111-1111-1111-1111-111111111111', 'daniel@pilot.local', '<bcrypt-hash>', 'Daniel K.', 'EMPLOYEE', false, true);
```

## Konsequenzen

- USERS gehört in **TT-01a** (Schicht 1)
- EMPLOYEES.USER_ID FK wird in **TT-01a** mit angelegt (verzögert validieren wenn EMPLOYEES später)
- Auth-Logik gehört in **TT-02** (Backend-Skeleton)
- User-CRUD ist **TT-03**
- Rollen-Tests sind Pflicht in jedem Issue mit Authorization
