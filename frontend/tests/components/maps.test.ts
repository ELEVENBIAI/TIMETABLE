// ELE-182: Maps-URL-Helper.

import { describe, it, expect } from 'vitest';
import { formatAddress, googleMapsSearchUrl } from '@/lib/maps';
import type { Property } from '@/types/schedule';

const PROP: Property = {
  id: '44444444-4444-4444-4444-444444444444',
  tenant_id: '00000000-0000-0000-0000-000000000000',
  name: 'Porzer Straße 12',
  street: 'Porzer Straße',
  house_number: '12',
  zip_code: '51143',
  city: 'Köln',
  property_type: 'APARTMENT_BUILDING',
  is_active: true,
};

describe('Maps helpers (ELE-182)', () => {
  it('formatAddress: Street + No, ZIP City', () => {
    expect(formatAddress(PROP)).toBe('Porzer Straße 12, 51143, Köln');
  });

  it('googleMapsSearchUrl: encodet UTF-8 Umlaute korrekt', () => {
    const url = googleMapsSearchUrl(PROP);
    expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    expect(url).toContain('Porzer%20Stra%C3%9Fe');
    expect(url).toContain('K%C3%B6ln');
  });

  it('formatAddress lässt fehlende Hausnummer weg', () => {
    expect(formatAddress({ ...PROP, house_number: null })).toBe('Porzer Straße, 51143, Köln');
  });
});
