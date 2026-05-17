import type { Employee, Property, ScheduleEntry, ServiceType } from '@/types/schedule';

export type ViewMode = 'team' | 'employee' | 'day' | 'property';

export interface GridContext {
  entries: ScheduleEntry[];
  employees: Employee[];
  properties: Property[];
  serviceTypes: ServiceType[];
  /** Aktueller Wochenstart (Montag) */
  weekStart: Date;
}

export interface FilterState {
  selectedEmployeeId?: string;
  selectedPropertyId?: string;
  /** day_of_week 1..5 für Day-View */
  selectedDay?: number;
}

/** Y-Achsen-Setup für den Outlook-Style-Kalender */
export const GRID_START_HOUR = 7;
export const GRID_END_HOUR = 18;
export const PX_PER_MINUTE = 1; // 60px pro Stunde
export const GRID_HEIGHT_PX = (GRID_END_HOUR - GRID_START_HOUR) * 60 * PX_PER_MINUTE;

/** Day-of-Week-Labels: 1..5 = Mo..Fr */
export const WORKING_DAYS = [1, 2, 3, 4, 5] as const;
