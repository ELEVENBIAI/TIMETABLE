// ELE-181: Draggable-Verhalten der ScheduleEntryCard.
// Prüft: DRAFT → draggable (data-draggable=true), disabled → not-allowed + Lock-Icon.

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { ScheduleEntryCard } from '@/components/WeekGrid/ScheduleEntryCard';
import { initI18n } from '@/lib/i18n';
import type { ScheduleEntry, Property, ServiceType } from '@/types/schedule';

beforeAll(async () => {
  await initI18n('en');
});

const TENANT = '00000000-0000-0000-0000-000000000000';

const ENTRY: ScheduleEntry = {
  id: '11111111-1111-1111-1111-111111111111',
  tenant_id: TENANT,
  schedule_id: '22222222-2222-2222-2222-222222222222',
  employee_id: '33333333-3333-3333-3333-333333333333',
  entry_date: '2026-05-18',
  day_of_week: 1,
  property_id: '44444444-4444-4444-4444-444444444444',
  service_type_id: '55555555-5555-5555-5555-555555555555',
  property_service_id: null,
  start_time: '08:00:00',
  duration_min: 30,
  sort_order: 0,
  status: 'PLANNED',
  is_extra: false,
  is_from_reassignment: false,
  original_employee_id: null,
  reassignment_reason: null,
  notes: null,
  created_at: '2026-05-16T00:00:00Z',
  updated_at: '2026-05-16T00:00:00Z',
};

const PROPERTY: Property = {
  id: ENTRY.property_id,
  tenant_id: TENANT,
  name: 'Porzer Straße 12',
  street: 'Porzer Straße',
  house_number: '12',
  zip_code: '51143',
  city: 'Köln',
  property_type: 'APARTMENT_BUILDING',
  is_active: true,
};

const SERVICE: ServiceType = {
  id: ENTRY.service_type_id,
  tenant_id: TENANT,
  name: 'Treppenhaus Reinigung',
  short_name: 'Treppe',
  category: 'CLEANING',
  color_code: '#3B82F6',
  icon: null,
  default_duration_min: 30,
  is_active: true,
};

function renderInDnd(ui: React.ReactNode) {
  return render(<DndContext>{ui}</DndContext>);
}

describe('ScheduleEntryCard — DnD-Verhalten (ELE-181)', () => {
  it('ist draggable wenn nicht disabled (data-draggable=true)', () => {
    renderInDnd(<ScheduleEntryCard entry={ENTRY} property={PROPERTY} serviceType={SERVICE} />);
    const card = screen.getByText('Porzer Straße 12').closest('article');
    expect(card).toHaveAttribute('data-draggable', 'true');
    expect(card?.className).toMatch(/cursor-grab/);
  });

  it('ist nicht draggable wenn disabled (Lock-Icon + not-allowed)', () => {
    renderInDnd(
      <ScheduleEntryCard entry={ENTRY} property={PROPERTY} serviceType={SERVICE} disabled />
    );
    const card = screen.getByText('Porzer Straße 12').closest('article');
    expect(card).toHaveAttribute('data-draggable', 'false');
    expect(card?.className).toMatch(/cursor-not-allowed/);
    // Lock-Icon via aria-label
    expect(card?.querySelector('[aria-label]')).toBeTruthy();
  });

  it('ist in presentational-Mode visuell hervorgehoben (kein Drag-Handle)', () => {
    renderInDnd(
      <ScheduleEntryCard entry={ENTRY} property={PROPERTY} serviceType={SERVICE} presentational />
    );
    const card = screen.getByText('Porzer Straße 12').closest('article');
    expect(card).toHaveAttribute('data-draggable', 'false');
    expect(card?.className).toMatch(/shadow-lg/);
  });
});
