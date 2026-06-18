import type { DisplayLocale, DisplayOptions } from './types';
import { PERSON_ALIASES } from './dictionaries/persons';
import { reportMissingAlias } from './missingAliasReporter';

const FALLBACKS: Record<DisplayLocale, Record<string, string>> = {
  ar: { agent: 'مسؤول غير محدد', person: 'شخص غير محدد' },
  en: { agent: 'Unassigned Agent', person: 'Unnamed Person' },
};

export function displayPerson(
  value: string | null | undefined,
  locale: DisplayLocale,
  options?: DisplayOptions
): string {
  const raw = (value || '').trim().replace(/\s+/g, ' ');
  if (!raw) {
    const ctx = options?.fieldName === 'agentName' ? 'agent' : 'person';
    return FALLBACKS[locale][ctx] || FALLBACKS[locale].person;
  }

  if (locale === 'en') {
    const alias = PERSON_ALIASES[raw];
    if (alias) return alias;
    reportMissingAlias({
      route: options?.route || '',
      locale: 'en',
      entityType: 'person',
      entityId: options?.entityId || null,
      fieldName: options?.fieldName || 'name',
      rawValue: raw,
      fallbackUsed: FALLBACKS.en.person,
      severity: 'P0',
    });
    return FALLBACKS.en.person;
  }

  const enToAr = Object.entries(PERSON_ALIASES).find(([, en]) => en === raw);
  return enToAr ? enToAr[0] : raw;
}
