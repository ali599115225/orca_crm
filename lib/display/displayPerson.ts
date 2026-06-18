import type { DisplayLocale, DisplayOptions } from './types';
import { PERSON_ALIASES } from './dictionaries/persons';
import { reportMissingAlias } from './missingAliasReporter';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TRUNCATED_ID_RE = /^[0-9a-f]{6,24}$/i;
const TECH_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-|^[0-9a-f]{8,}$/i;

function isTechnical(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (UUID_RE.test(t)) return true;
  if (TRUNCATED_ID_RE.test(t) && t.length >= 8) return true;
  return TECH_RE.test(t) && !/[\u0600-\u06FF]/.test(t);
}

const FALLBACKS: Record<DisplayLocale, Record<string, string>> = {
  ar: { agent: 'غير محدد', person: 'غير محدد' },
  en: { agent: 'Not specified', person: 'Not specified' },
};

export function displayPerson(
  value: string | null | undefined,
  locale: DisplayLocale,
  options?: DisplayOptions
): string {
  const raw = (value || '').trim().replace(/\s+/g, ' ');
  if (!raw || isTechnical(raw)) {
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
