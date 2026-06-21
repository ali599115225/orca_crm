import type { DisplayLocale, DisplayOptions, GeoType } from './types';
import { CITY_ALIASES, DISTRICT_ALIASES, COUNTRY_ALIASES } from './dictionaries/geo';
import { reportMissingAlias } from './missingAliasReporter';

const DICT_MAP: Record<GeoType, Record<string, string>> = {
  city: CITY_ALIASES,
  district: DISTRICT_ALIASES,
  country: COUNTRY_ALIASES,
  region: CITY_ALIASES,
};

const FALLBACKS: Record<DisplayLocale, Record<GeoType, string>> = {
  ar: { city: 'غير محدد', district: 'غير محدد', country: 'غير محدد', region: 'غير محدد' },
  en: { city: 'Not specified', district: 'Not specified', country: 'Not specified', region: 'Not specified' },
};

export function displayGeo(
  value: string | null | undefined,
  geoType: GeoType,
  locale: DisplayLocale,
  options?: DisplayOptions
): string {
  const raw = (value || '').trim().replace(/\s+/g, ' ');
  if (!raw) return FALLBACKS[locale][geoType];

  if (locale === 'en') {
    const dict = DICT_MAP[geoType];
    const alias = dict[raw];
    if (alias) return alias;
    reportMissingAlias({
      route: options?.route || '',
      locale: 'en',
      entityType: geoType,
      entityId: options?.entityId || null,
      fieldName: options?.fieldName || geoType,
      rawValue: raw,
      fallbackUsed: FALLBACKS.en[geoType],
      severity: 'P0',
    });
    return FALLBACKS.en[geoType];
  }

  const dict = DICT_MAP[geoType];
  const enToAr = Object.entries(dict).find(([, en]) => en === raw);
  return enToAr ? enToAr[0] : raw;
}
