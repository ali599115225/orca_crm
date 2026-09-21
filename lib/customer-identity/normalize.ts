export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeName(value: string): string {
  return normalizeWhitespace(value)
    .normalize("NFKC")
    .toLocaleLowerCase("en-US")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

export function normalizeEmail(value: string): string {
  return normalizeWhitespace(value).toLocaleLowerCase("en-US");
}

export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("00966")) return digits.slice(2);
  if (digits.startsWith("05") && digits.length === 10) {
    return `966${digits.slice(1)}`;
  }
  if (digits.startsWith("5") && digits.length === 9) return `966${digits}`;
  return digits;
}

export function normalizeGovernmentId(value: string): string {
  return value.replace(/\s|-/g, "").toLocaleUpperCase("en-US");
}

export function normalizeCommercialRegistry(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizeExternalId(value: string): string {
  return normalizeWhitespace(value).normalize("NFKC");
}

export function normalizePartyField(
  field: string,
  value: string | null,
): string | null {
  if (value === null) return null;

  switch (field) {
    case "email":
      return normalizeEmail(value);
    case "phone":
      return normalizePhone(value);
    case "nationalId":
    case "residencyId":
      return normalizeGovernmentId(value);
    case "commercialRegistry":
      return normalizeCommercialRegistry(value);
    case "externalId":
      return normalizeExternalId(value);
    case "displayName":
    case "firstName":
    case "lastName":
    case "organizationName":
    case "employer":
    case "city":
      return normalizeName(value);
    default:
      return normalizeWhitespace(value).normalize("NFKC");
  }
}

export function similarity(left: string, right: string): number {
  if (left === right) return 1;
  if (left.length === 0 || right.length === 0) return 0;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1).fill(0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost =
        left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + substitutionCost,
      );
    }
    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return 1 - previous[right.length] / Math.max(left.length, right.length);
}
