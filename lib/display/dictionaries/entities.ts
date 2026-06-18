import type { EntityType } from '../types';
import { PROJECT_ALIASES } from './projects';

export const COMPANY_ALIASES: Record<string, string> = {
  'شركة دار الأعمار العقارية': 'Dar Al-Amar Real Estate',
  'ORCA Stress Demo Real Estate': 'ORCA Real Estate',
  'ORCA Demo Real Estate': 'ORCA Real Estate',
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
