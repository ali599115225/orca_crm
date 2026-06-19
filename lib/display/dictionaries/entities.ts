import type { EntityType } from '../types';
import { PROJECT_ALIASES } from './projects';

export const COMPANY_ALIASES: Record<string, string> = {
  'شركة دار الأعمار العقارية': 'Dar Al-Amar Real Estate',
  'ORCA Stress Demo Real Estate': 'ORCA Real Estate',
  'ORCA Demo Real Estate': 'ORCA Real Estate',
  'ORCA Real Estate': 'ORCA Real Estate',
};

export const COMPANY_AR_DISPLAY: Record<string, string> = {
  'ORCA Real Estate': 'أوركا العقارية',
  'Dar Al-Amar Real Estate': 'شركة دار الأعمار العقارية',
};

export const UNIT_TYPE_ALIASES: Record<string, string> = {
  'دوبلكس': 'Duplex',
  'فيلا مستقلة': 'Standalone villa',
  'فيلا': 'Villa',
  'شقة سكنية': 'Residential apartment',
  'شقة': 'Apartment',
  'مكتب تجاري': 'Commercial office',
  'تاون هاوس': 'Townhouse',
  'بنتهاوس': 'Penthouse',
  'فيلا علوية': 'Upper villa',
  'أرض': 'Land',
};

export function getEntityDictionary(entityType: EntityType): Record<string, string> | null {
  if (entityType === 'project' || entityType === 'property' || entityType === 'community' || entityType === 'unit') {
    return PROJECT_ALIASES;
  }
  if (entityType === 'company') {
    return COMPANY_ALIASES;
  }
  return null;
}

export function getUnitTypeAlias(arabicType: string): string | undefined {
  return UNIT_TYPE_ALIASES[arabicType];
}
