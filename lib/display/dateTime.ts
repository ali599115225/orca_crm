const RIYADH_TIME_ZONE = "Asia/Riyadh";
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

function formatRiyadhTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: RIYADH_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function normalizeTimeString(value: string): string {
  const match = value.trim().match(TIME_RE);
  return match ? `${match[1]}:${match[2]}` : "";
}

export function formatDisplayDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  // For date-only we shouldn't shift by timezone. We construct the parts.
  let yearStr = "";
  let monthStr = "";
  let dayStr = "";
  if (typeof value === "string" && value.length >= 10 && value.includes("-")) {
    const parts = value.split("T")[0].split("-");
    if (parts.length >= 3) {
      yearStr = parts[0].slice(-2);
      monthStr = parts[1].padStart(2, "0");
      dayStr = parts[2].padStart(2, "0");
      return `${dayStr}-${monthStr}-${yearStr}`;
    }
  }
  const year = d.getFullYear().toString().slice(-2);
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${day}-${month}-${year}`;
}

export function formatDisplayTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return typeof value === "string" ? normalizeTimeString(value) : "";
  }
  return formatRiyadhTime(d);
}

export function formatDisplayDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  
  const optionsDate: Intl.DateTimeFormatOptions = { timeZone: RIYADH_TIME_ZONE, year: "2-digit", month: "2-digit", day: "2-digit" };
  const parts = new Intl.DateTimeFormat("en-GB", optionsDate).formatToParts(d);
  let day = "", month = "", year = "";
  for (const part of parts) {
    if (part.type === "day") day = part.value;
    if (part.type === "month") month = part.value;
    if (part.type === "year") year = part.value;
  }
  const dateStr = `${day}-${month}-${year}`;
  
  const timeStr = formatRiyadhTime(d);
  
  return `${dateStr} • ${timeStr}`;
}

export function toInputDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  if (typeof value === "string" && value.length >= 10 && value.includes("-")) {
    return value.split("T")[0];
  }
  const year = d.getFullYear().toString();
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toInputTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return typeof value === "string" ? normalizeTimeString(value) : "";
  }
  return formatRiyadhTime(d);
}
