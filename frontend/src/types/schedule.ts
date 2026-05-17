// Schedule-Domain-Types (gespiegelt zum Backend, ELE-180).

export type ScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Schedule {
  id: string;
  tenant_id: string;
  week_start: string; // ISO YYYY-MM-DD
  week_number: number;
  year: number;
  status: ScheduleStatus;
  template_id: string | null;
  generation_method: string | null;
  published_at: string | null;
  published_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ScheduleEntryStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'REASSIGNED'
  | 'REASSIGNMENT_NEEDED';

export interface ScheduleEntry {
  id: string;
  tenant_id: string;
  schedule_id: string;
  employee_id: string;
  entry_date: string; // ISO YYYY-MM-DD
  day_of_week: number; // 1=Mo .. 7=So
  property_id: string;
  service_type_id: string;
  property_service_id: string | null;
  start_time: string | null; // ISO HH:MM:SS
  duration_min: number;
  sort_order: number;
  status: ScheduleEntryStatus;
  is_extra: boolean;
  is_from_reassignment: boolean;
  original_employee_id: string | null;
  reassignment_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  employee_type: string;
  weekly_hours: string | null; // pg DECIMAL als String
  color_code: string | null;
  is_active: boolean;
}

export interface Property {
  id: string;
  tenant_id: string;
  name: string;
  street: string;
  house_number: string | null;
  zip_code: string;
  city: string;
  property_type: string;
  is_active: boolean;
}

export interface ServiceType {
  id: string;
  tenant_id: string;
  name: string;
  short_name: string;
  category: string;
  color_code: string;
  icon: string | null;
  default_duration_min: number;
  is_active: boolean;
}
