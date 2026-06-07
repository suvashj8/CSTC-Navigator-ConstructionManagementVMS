/**
 * Dual-calendar: store AD + BS in the database per documentation.
 * BS auto-fill from AD is left to user entry here, or call a future /api/v1/calendar/ad-to-bs endpoint.
 */
export function adToBS(_adDate: string): string {
  return "";
}

export function bsToAD(_bsDate: string): string {
  return "";
}

export function currentFiscalYearBS(): string {
  const today = new Date();
  const mo = today.getMonth() + 1;
  const y = today.getFullYear();
  const startYear = mo >= 7 ? y + 57 : y + 56;
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}/${endYY}`;
}
