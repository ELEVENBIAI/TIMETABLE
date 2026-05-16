import { describe, expect, it } from 'vitest';
import {
  absenceTypeToReassignmentReason,
  computeEmployeeLoad,
  findAbsenceFor,
  findExpiringQualifications,
  findOverloadedEmployees,
  isEmployeeAvailable,
  pickEntryDate,
} from '../../../src/services/scheduling/plan-generator-pure.js';

describe('pickEntryDate', () => {
  it('weekStart 2026-05-18 (Mo) + dayOfWeek 1 → 2026-05-18', () => {
    expect(pickEntryDate('2026-05-18', 1)).toBe('2026-05-18');
  });

  it('weekStart 2026-05-18 + dayOfWeek 4 → 2026-05-21 (Donnerstag)', () => {
    expect(pickEntryDate('2026-05-18', 4)).toBe('2026-05-21');
  });

  it('weekStart 2026-05-18 + dayOfWeek 7 → 2026-05-24 (Sonntag)', () => {
    expect(pickEntryDate('2026-05-18', 7)).toBe('2026-05-24');
  });

  it('weekStart mitten in der Woche wird auf Montag normalisiert', () => {
    // 2026-05-22 ist Freitag → ISO-Woche-Start = 2026-05-18
    expect(pickEntryDate('2026-05-22', 1)).toBe('2026-05-18');
  });

  it('dayOfWeek 0 oder 8 → wirft', () => {
    expect(() => pickEntryDate('2026-05-18', 0)).toThrow();
    expect(() => pickEntryDate('2026-05-18', 8)).toThrow();
  });
});

describe('computeEmployeeLoad', () => {
  it('summiert Minuten pro Mitarbeiter', () => {
    const load = computeEmployeeLoad([
      { employeeId: 'A', durationMin: 60 },
      { employeeId: 'A', durationMin: 30 },
      { employeeId: 'B', durationMin: 45 },
    ]);
    expect(load.get('A')).toBe(90);
    expect(load.get('B')).toBe(45);
    expect(load.size).toBe(2);
  });

  it('leere Liste → leere Map', () => {
    expect(computeEmployeeLoad([]).size).toBe(0);
  });
});

describe('findOverloadedEmployees', () => {
  it('30h Plan, 10h Kapazität → overload', () => {
    const load = new Map([['A', 30 * 60]]);
    const result = findOverloadedEmployees(load, [{ employeeId: 'A', weeklyHours: 10 }]);
    expect(result).toEqual([{ employeeId: 'A', plannedMin: 1800, capacityMin: 600 }]);
  });

  it('Mitarbeiter ohne weekly_hours wird übersprungen (Subunternehmer)', () => {
    const load = new Map([['A', 100_000]]);
    const result = findOverloadedEmployees(load, [{ employeeId: 'A', weeklyHours: null }]);
    expect(result).toEqual([]);
  });

  it('exakt am Limit → kein Overload', () => {
    const load = new Map([['A', 600]]);
    const result = findOverloadedEmployees(load, [{ employeeId: 'A', weeklyHours: 10 }]);
    expect(result).toEqual([]);
  });
});

describe('findExpiringQualifications', () => {
  it('Quali läuft in 10 Tagen ab → drin', () => {
    const result = findExpiringQualifications(
      [
        {
          employeeId: 'A',
          qualificationTypeId: 'q1',
          validUntil: '2026-05-28', // 10 Tage nach 2026-05-18
        },
      ],
      '2026-05-18',
      30
    );
    expect(result).toHaveLength(1);
    expect(result[0].daysRemaining).toBe(10);
  });

  it('Quali läuft in 60 Tagen ab → NICHT drin (>30 days window)', () => {
    const result = findExpiringQualifications(
      [{ employeeId: 'A', qualificationTypeId: 'q1', validUntil: '2026-07-17' }],
      '2026-05-18',
      30
    );
    expect(result).toEqual([]);
  });

  it('Quali ohne validUntil wird übersprungen', () => {
    const result = findExpiringQualifications(
      [{ employeeId: 'A', qualificationTypeId: 'q1', validUntil: null }],
      '2026-05-18'
    );
    expect(result).toEqual([]);
  });

  it('bereits abgelaufene Quali → drin (negative daysRemaining)', () => {
    const result = findExpiringQualifications(
      [{ employeeId: 'A', qualificationTypeId: 'q1', validUntil: '2026-05-01' }],
      '2026-05-18',
      30
    );
    expect(result).toHaveLength(1);
    expect(result[0].daysRemaining).toBeLessThan(0);
  });
});

describe('findAbsenceFor', () => {
  const absences = [
    {
      employeeId: 'A',
      startDate: '2026-05-18',
      endDate: '2026-05-22',
      absenceType: 'SICK' as const,
    },
  ];

  it('Mitarbeiter A am 2026-05-20 (mitten drin) → match', () => {
    expect(findAbsenceFor(absences, 'A', '2026-05-20')?.absenceType).toBe('SICK');
  });

  it('Mitarbeiter A am Endtag (2026-05-22) → match (inclusive)', () => {
    expect(findAbsenceFor(absences, 'A', '2026-05-22')).not.toBeNull();
  });

  it('Mitarbeiter A nach Ende → null', () => {
    expect(findAbsenceFor(absences, 'A', '2026-05-25')).toBeNull();
  });

  it('Mitarbeiter B → null (kein eigener Eintrag)', () => {
    expect(findAbsenceFor(absences, 'B', '2026-05-20')).toBeNull();
  });
});

describe('absenceTypeToReassignmentReason', () => {
  it('mappt SICK + VACATION direkt; rest → OTHER', () => {
    expect(absenceTypeToReassignmentReason('SICK')).toBe('SICK');
    expect(absenceTypeToReassignmentReason('VACATION')).toBe('VACATION');
    expect(absenceTypeToReassignmentReason('PERSONAL')).toBe('OTHER');
    expect(absenceTypeToReassignmentReason('TRAINING')).toBe('OTHER');
    expect(absenceTypeToReassignmentReason('OTHER')).toBe('OTHER');
  });
});

describe('isEmployeeAvailable', () => {
  const availability = [
    {
      employeeId: 'A',
      dayOfWeek: 1,
      isAvailable: true,
      availableFrom: '08:00',
      availableUntil: '16:00',
    },
    {
      employeeId: 'A',
      dayOfWeek: 2,
      isAvailable: false,
      availableFrom: null,
      availableUntil: null,
    },
  ];

  it('Mitarbeiter ohne Pflege → true (keine Restriktion)', () => {
    expect(isEmployeeAvailable([], 'X', 1, '08:00', 60)).toBe(true);
  });

  it('is_available=false → false', () => {
    expect(isEmployeeAvailable(availability, 'A', 2, '08:00', 60)).toBe(false);
  });

  it('innerhalb des Zeitfensters → true', () => {
    expect(isEmployeeAvailable(availability, 'A', 1, '09:00', 60)).toBe(true);
  });

  it('startet zu früh (07:30) → false', () => {
    expect(isEmployeeAvailable(availability, 'A', 1, '07:30', 60)).toBe(false);
  });

  it('endet zu spät (15:30 + 60min = 16:30 > 16:00) → false', () => {
    expect(isEmployeeAvailable(availability, 'A', 1, '15:30', 60)).toBe(false);
  });

  it('startTime null → keine Restriktion', () => {
    expect(isEmployeeAvailable(availability, 'A', 1, null, 60)).toBe(true);
  });
});
