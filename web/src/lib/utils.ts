import { createHash, randomUUID } from "crypto";

export function derefStr(s: unknown): string {
  if (s == null) return "";
  return String(s);
}

export function intPtr(v: unknown): number | null {
  if (v == null) return null;
  return Number(v);
}

export function floatPtr(v: unknown): number | null {
  if (v == null) return null;
  return Number(v);
}

export function uuidToStr(id: unknown): string | null {
  if (id == null) return null;
  return String(id);
}

export function datePtr(t: unknown): string | null {
  if (t == null) return null;
  const d = t instanceof Date ? t : new Date(String(t));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function nullIfEmpty(s: string | null | undefined): string | null {
  if (s == null || s.trim() === "") return null;
  return s;
}

export function parseDate(s: string | null | undefined): Date | null {
  if (!s?.trim()) return null;
  for (const layout of ["yyyy-mm-dd", "iso"]) {
    if (layout === "iso") {
      const t = new Date(s);
      if (!Number.isNaN(t.getTime())) {
        return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
      }
    } else {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
      if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    }
  }
  return null;
}

export function optionalUUID(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (typeof v === "string") return v;
  return null;
}

export function normalizeMaintStatus(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "Scheduled";
  switch (trimmed.toLowerCase()) {
    case "in progress":
    case "in_progress":
    case "inprogress":
      return "In progress";
    case "completed":
    case "done":
      return "Completed";
    case "scheduled":
      return "Scheduled";
    default:
      return trimmed;
  }
}

export function toIsoString(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  return new Date(String(v)).toISOString();
}

export function hashParams(reportType: string, format: string, params: string): string {
  return createHash("sha256").update(reportType + format + params).digest("hex");
}

export function newShortId(): string {
  return randomUUID().slice(0, 8);
}
