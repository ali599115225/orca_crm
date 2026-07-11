const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;

function shiftedParts(now: Date) {
  const shifted = new Date(now.getTime() + RIYADH_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function riyadhLocalMidnightToUtc(
  year: number,
  month: number,
  day: number,
): Date {
  return new Date(Date.UTC(year, month, day) - RIYADH_OFFSET_MS);
}

export function getRiyadhDayRange(now = new Date()) {
  const { year, month, day } = shiftedParts(now);
  const start = riyadhLocalMidnightToUtc(year, month, day);
  const end = riyadhLocalMidnightToUtc(year, month, day + 1);
  return { start, end };
}

export function getRiyadhMonthRange(now = new Date()) {
  const { year, month } = shiftedParts(now);
  const start = riyadhLocalMidnightToUtc(year, month, 1);
  const end = riyadhLocalMidnightToUtc(year, month + 1, 1);
  return { start, end };
}

export function getRiyadhWeekStart(now = new Date()) {
  const { start } = getRiyadhDayRange(now);
  return new Date(start.getTime() - 6 * 24 * 60 * 60 * 1000);
}

export function formatRiyadhDisplayDate(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Riyadh",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(date);
  const day = parts.find((part) => part.type === "day")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const year = parts.find((part) => part.type === "year")?.value || "";
  return `${day}-${month}-${year}`;
}
