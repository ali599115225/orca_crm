export type DisplayLocale = 'ar' | 'en';

export type EntityType =
  | 'person'
  | 'project'
  | 'property'
  | 'community'
  | 'unit'
  | 'city'
  | 'district'
  | 'country'
  | 'company'
  | 'campaign'
  | 'offer'
  | 'contract'
  | 'leadSource'
  | 'leadStatus'
  | 'taskPriority'
  | 'tourStatus'
  | 'offerStatus'
  | 'rentalStatus'
  | 'generalStatus'
  | 'task'
  | 'unknown';

export type GeoType = 'city' | 'district' | 'country' | 'region';

export type EnumType =
  | 'leadStatus'
  | 'leadSource'
  | 'taskPriority'
  | 'tourStatus'
  | 'offerStatus'
  | 'rentalStatus'
  | 'propertyStatus'
  | 'projectStatus'
  | 'invoiceStatus'
  | 'generalStatus';

export interface DisplayOptions {
  route?: string;
  fieldName?: string;
  entityId?: string | number | null;
  fallback?: string;
}
