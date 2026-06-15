/** Input types where users type free text and a leading minus should be blocked. */
const SANITIZE_TYPES = new Set([
  "text",
  "search",
  "tel",
  "email",
  "password",
  "url",
  "number",
]);

export function shouldBlockLeadingMinus(type?: string): boolean {
  if (!type || type === "text") return true;
  return SANITIZE_TYPES.has(type);
}

/** Remove minus/hyphen characters from the start of a string (paste, autofill, etc.). */
export function blockLeadingMinus(value: string): string {
  return value.replace(/^-+/, "");
}

export function preventLeadingMinusKey(
  e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
): boolean {
  if (e.key !== "-" && e.key !== "Subtract") return false;
  return (e.currentTarget.selectionStart ?? 0) === 0;
}

export function sanitizeTextInputValue(value: string, type?: string): string {
  return shouldBlockLeadingMinus(type) ? blockLeadingMinus(value) : value;
}
