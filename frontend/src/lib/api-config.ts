import { isNative } from "./platform";

/**
 * API base URL resolution:
 * - Web dev: empty string → Vite proxy to localhost backend
 * - Web prod / native: set VITE_API_URL (required on device — localhost is not reachable)
 */
export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  if (isNative) {
    console.warn(
      "[VMS] VITE_API_URL is not set. Native apps cannot reach localhost — configure your API URL before release builds."
    );
  }

  return "";
}
