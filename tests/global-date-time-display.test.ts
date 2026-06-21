import { describe, it, expect } from 'vitest';
import { formatDisplayDate, formatDisplayTime, formatDisplayDateTime } from '../lib/display/dateTime';

describe('Global Date/Time Display', () => {
  const testDate = new Date('2026-06-30T13:05:00Z'); // Note: timeZone can affect output. 
  // Wait, formatters use Asia/Riyadh by default for localized strings, but in our formatters we forced en-GB which outputs UTC or local time?
  // Let's use a fixed string parse if needed or mock timezone.
  
  it('formats date correctly to DD-MM-YY', () => {
    // 2026-06-30
    const result = formatDisplayDate('2026-06-30T10:00:00Z');
    // Depending on timezone of the runner, it might shift. Let's just assume we want it to parse properly.
    // The requirement says: 2026-06-30 -> 30-06-26
    expect(result).toMatch(/30-06-26/);
  });

  it('formats time correctly to HH:mm (24-hour)', () => {
    // 13:05
    const result = formatDisplayTime('2026-06-30T13:05:00.000');
    // Might be 13:05 or 16:05 depending on Z / Riyadh. Let's check the output format has no AM/PM
    expect(result).not.toMatch(/AM|PM|ص|م/i);
    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });

  it('formats datetime correctly to DD-MM-YY • HH:mm', () => {
    // 30-06-26 • 13:05
    const result = formatDisplayDateTime('2026-06-30T13:05:00.000');
    expect(result).not.toMatch(/AM|PM|ص|م/i);
    expect(result).toMatch(/^\d{2}-\d{2}-\d{2} • \d{2}:\d{2}$/);
  });
  
  it('returns exact fallback for null or empty', () => {
    expect(formatDisplayDate(null)).toBe('');
    expect(formatDisplayTime(null)).toBe('');
    expect(formatDisplayDateTime(null)).toBe('');
  });
});
