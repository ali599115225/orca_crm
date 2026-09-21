export function getPeriod(date?: Date): string {
  const d = date || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}
