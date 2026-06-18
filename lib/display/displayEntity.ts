import type { DisplayLocale, DisplayOptions, EntityType } from './types';
import { PROJECT_ALIASES } from './dictionaries/projects';
import { COMPANY_ALIASES } from './dictionaries/entities';
import { reportMissingAlias } from './missingAliasReporter';

const STRESS_DEMO_RE = /\b(Stress|Demo|Mock|Seed|Test|Fake|Sample)\b/gi;

const FALLBACKS: Record<DisplayLocale, Record<string, string>> = {
  ar: {
    project: 'مشروع غير محدد',
    property: 'عقار غير محدد',
    community: 'مجمع غير محدد',
    unit: 'وحدة غير محددة',
    company: 'شركة غير محددة',
    campaign: 'حملة غير محددة',
    offer: 'عرض غير محدد',
    contract: 'عقد غير محدد',
    task: 'مهمة غير محددة',
    unknown: 'غير محدد',
  },
  en: {
    project: 'Unnamed Project',
    property: 'Unnamed Property',
    community: 'Unnamed Community',
    unit: 'Unnamed Unit',
    company: 'Unknown Company',
    campaign: 'Unnamed Campaign',
    offer: 'Unnamed Offer',
    contract: 'Unnamed Contract',
    task: 'Unnamed Task',
    unknown: 'Unspecified',
  },
};

function getDict(entityType: EntityType): Record<string, string> | null {
  if (entityType === 'project' || entityType === 'property' || entityType === 'community' || entityType === 'unit') {
    return PROJECT_ALIASES;
  }
  if (entityType === 'company') {
    return COMPANY_ALIASES;
  }
  return null;
}

export function displayEntity(
  value: string | null | undefined,
  entityType: EntityType,
  locale: DisplayLocale,
  options?: DisplayOptions
): string {
  const raw = (value || '').trim().replace(/\s+/g, ' ').replace(STRESS_DEMO_RE, '').replace(/\s{2,}/g, ' ').trim();
  if (!raw) return FALLBACKS[locale][entityType] || FALLBACKS[locale].unknown;

  if (locale === 'en') {
    const dict = getDict(entityType);
    if (dict) {
      const alias = dict[raw];
      if (alias) return alias;
    }
    reportMissingAlias({
      route: options?.route || '',
      locale: 'en',
      entityType,
      entityId: options?.entityId || null,
      fieldName: options?.fieldName || 'name',
      rawValue: value || '',
      fallbackUsed: FALLBACKS.en[entityType] || FALLBACKS.en.unknown,
      severity: 'P0',
    });
    return FALLBACKS.en[entityType] || FALLBACKS.en.unknown;
  }

  const dict = getDict(entityType);
  if (dict) {
    const enToAr = Object.entries(dict).find(([, en]) => en === raw);
    if (enToAr) return enToAr[0];
  }
  return raw;
}
