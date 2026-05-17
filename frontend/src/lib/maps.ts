// Maps-URL-Helpers (ELE-182). Liefert deep links zu Google Maps/OpenStreetMap.
// Wir bauen die URL aus Property-Adresse — der Browser/das OS löst sie auf
// (iOS öffnet Apple Maps wenn installiert, Android öffnet Google Maps).

import type { Property } from '@/types/schedule';

export function formatAddress(property: Property): string {
  const street = [property.street, property.house_number].filter(Boolean).join(' ');
  return [street, property.zip_code, property.city].filter(Boolean).join(', ');
}

export function googleMapsSearchUrl(property: Property): string {
  const query = encodeURIComponent(formatAddress(property));
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
