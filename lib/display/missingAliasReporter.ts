import type { DisplayLocale, EntityType } from './types';

interface MissingAliasEntry {
  route: string;
  locale: DisplayLocale;
  entityType: EntityType | string;
  entityId: string | number | null;
  fieldName: string;
  rawValue: string;
  fallbackUsed: string;
  severity: 'P0' | 'P1' | 'P2';
}

export function reportMissingAlias(entry: MissingAliasEntry): void {
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.warn(
      `[Bilingual Display] Missing ${entry.locale.toUpperCase()} alias: ${entry.entityType} "${entry.rawValue}" → fallback "${entry.fallbackUsed}" (${entry.severity}) [${entry.route}]`
    );
  }
}
