import type { DisplayLocale, DisplayOptions, EntityType } from './types';
import { PROJECT_ALIASES } from './dictionaries/projects';
import { COMPANY_ALIASES, COMPANY_AR_DISPLAY } from './dictionaries/entities';
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

function isProjectLike(et: EntityType): boolean {
  return et === 'project' || et === 'property' || et === 'community' || et === 'unit';
}

export function displayEntity(
  value: string | null | undefined,
  entityType: EntityType,
  locale: DisplayLocale,
  options?: DisplayOptions
): string {
  const original = (value || '').trim().replace(/\s+/g, ' ');
  const cleaned = original.replace(STRESS_DEMO_RE, '').replace(/\s{2,}/g, ' ').trim();
  const displayValue = cleaned || original;
  if (!displayValue) return FALLBACKS[locale][entityType] || FALLBACKS[locale].unknown;

  if (locale === 'en') {
    if (isProjectLike(entityType)) {
      const enAlias = PROJECT_ALIASES[original] || PROJECT_ALIASES[cleaned];
      if (enAlias) return enAlias;
    }
    if (entityType === 'company') {
      const enAlias = COMPANY_ALIASES[original] || COMPANY_ALIASES[cleaned];
      if (enAlias) return enAlias;
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

  if (entityType === 'company') {
    const enAlias = COMPANY_ALIASES[original] || COMPANY_ALIASES[cleaned];
    if (enAlias && COMPANY_AR_DISPLAY[enAlias]) return COMPANY_AR_DISPLAY[enAlias];
    const directAr = Object.entries(COMPANY_AR_DISPLAY).find(([, ar]) => ar === original || ar === cleaned);
    if (directAr) return directAr[1];
    return displayValue;
  }

  if (isProjectLike(entityType)) {
    const enToAr = Object.entries(PROJECT_ALIASES).find(([, en]) => en === cleaned || en === original);
    if (enToAr) return enToAr[0];
  }

  return displayValue;
}
