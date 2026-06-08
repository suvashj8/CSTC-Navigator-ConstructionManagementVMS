/** Nepal Standard Time (NPT, UTC+5:45) — used across VMS date displays. */
export const NEPAL_TIMEZONE = "Asia/Kathmandu";

type NepalParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

function nepalPartsFromDate(d: Date): NepalParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NEPAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** YYYY-MM-DD from API / ISO strings without timezone day-shift bugs. */
export function toDateOnlyString(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  const s = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (match) return match[1];
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Date only — e.g. "15 Jan 2020" in Nepal calendar context. */
export function formatNepalDate(value: string | null | undefined): string {
  const dateOnly = toDateOnlyString(value);
  if (!dateOnly) return "—";
  const [y, m, d] = dateOnly.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: NEPAL_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(utc);
}

/** Date + time in Nepal — e.g. "5 Jun 2026, 09:00 NPT". */
export function formatNepalDateTime(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  const s = value.trim();
  const hasTime = s.includes("T") && !/T00:00:00(\.000)?Z?$/.test(s);

  if (!hasTime) {
    const dateOnly = toDateOnlyString(s);
    if (!dateOnly) return "—";
    return `${formatNepalDate(dateOnly)}, 00:00 NPT`;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return formatNepalDate(s);

  const p = nepalPartsFromDate(d);
  const dateLabel = formatNepalDate(d.toISOString());
  return `${dateLabel}, ${p.hour}:${p.minute} NPT`;
}

/** Value for HTML date inputs. */
export function toDateInputValue(value: string | null | undefined): string {
  return toDateOnlyString(value);
}

/** Today's date in Nepal (YYYY-MM-DD). */
export function todayNepalDate(): string {
  const p = nepalPartsFromDate(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

/** Add days to a YYYY-MM-DD string (calendar math, no TZ shift). */
export function addDaysToDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + days));
  return utc.toISOString().slice(0, 10);
}

/** Value for <input type="datetime-local"> — wall clock in Nepal (YYYY-MM-DDTHH:mm). */
export function toDateTimeLocalNpt(value: string | null | undefined): string {
  if (!value?.trim()) return nowNepalDateTimeLocal();
  const s = value.trim();
  if (s.includes("T") && !/T00:00:00/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const p = nepalPartsFromDate(d);
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
    }
  }
  const dateOnly = toDateOnlyString(s);
  if (!dateOnly) return nowNepalDateTimeLocal();
  return `${dateOnly}T09:00`;
}

export function nowNepalDateTimeLocal(): string {
  const p = nepalPartsFromDate(new Date());
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Extract YYYY-MM-DD from datetime-local (Nepal-labelled) for DATE columns. */
export function dateTimeLocalToApiDate(local: string): string {
  if (!local) return "";
  const [datePart] = local.split("T");
  return datePart ?? "";
}
