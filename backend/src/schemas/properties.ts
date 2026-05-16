import { z } from 'zod';

export const PROPERTY_TYPES = [
  'APARTMENT_BUILDING',
  'SINGLE_FAMILY',
  'DUPLEX',
  'COMMERCIAL',
  'MIXED',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_BRANDS = ['GEPARD', 'IMMOBILIENBUTLER', 'PAUL'] as const;
export type PropertyBrand = (typeof PROPERTY_BRANDS)[number];

const coord = z.number().gte(-180).lte(180);

export const createPropertySchema = z.object({
  propertyManagerId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  regionId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  street: z.string().min(1).max(200),
  houseNumber: z.string().max(20).optional(),
  zipCode: z.string().min(1).max(10),
  city: z.string().min(1).max(100),
  lat: coord.optional(),
  lng: coord.optional(),
  propertyType: z.enum(PROPERTY_TYPES),
  unitCount: z.number().int().min(0).optional(),
  floorCount: z.number().int().min(0).optional(),
  greenAreaSqm: z.number().int().min(0).optional(),
  pavedAreaSqm: z.number().int().min(0).optional(),
  brand: z.enum(PROPERTY_BRANDS).optional(),
  isBaitProperty: z.boolean().optional(),
  accessInfo: z.string().max(2000).optional(),
});

export const updatePropertySchema = createPropertySchema
  .partial()
  .extend({ isActive: z.boolean().optional() })
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export interface PropertyRow {
  id: string;
  tenant_id: string;
  property_manager_id: string | null;
  contract_id: string | null;
  region_id: string | null;
  name: string;
  street: string;
  house_number: string | null;
  zip_code: string;
  city: string;
  lat: string | null;
  lng: string | null;
  property_type: string;
  unit_count: number | null;
  floor_count: number | null;
  green_area_sqm: number | null;
  paved_area_sqm: number | null;
  brand: string | null;
  is_bait_property: boolean;
  access_info: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Property Zones ──────────────────────────────────────────────────────────
export const ZONE_TYPES = [
  'STAIRCASE',
  'GARDEN_FRONT',
  'GARDEN_BACK',
  'COURTYARD',
  'GARAGE',
  'BASEMENT',
  'OTHER',
] as const;
export type ZoneType = (typeof ZONE_TYPES)[number];

export const createZoneSchema = z.object({
  name: z.string().min(1).max(100),
  zoneType: z.enum(ZONE_TYPES),
  areaSqm: z.number().int().min(0).optional(),
  floorNumber: z.number().int().optional(),
  notes: z.string().max(2000).optional(),
});

export const updateZoneSchema = createZoneSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Mindestens ein Feld' });

export type CreateZoneInput = z.infer<typeof createZoneSchema>;
export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

export interface PropertyZoneRow {
  id: string;
  tenant_id: string;
  property_id: string;
  name: string;
  zone_type: string;
  area_sqm: number | null;
  floor_number: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}
