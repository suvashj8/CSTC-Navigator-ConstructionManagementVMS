/**
 * Layout breakpoint: screens smaller than ~7 inches use the mobile UI;
 * 7 inches and larger use the desktop UI (sidebar, tables, multi-column forms).
 *
 * Web CSS cannot read physical inches reliably, so we use 672px (= 7 × 96 CSS px/in).
 */
export const DESKTOP_MIN_INCHES = 7;
export const DESKTOP_MIN_WIDTH_PX = DESKTOP_MIN_INCHES * 96;
export const DESKTOP_MEDIA_QUERY = `(min-width: ${DESKTOP_MIN_WIDTH_PX}px)`;
export const MOBILE_MEDIA_QUERY = `(max-width: ${DESKTOP_MIN_WIDTH_PX - 1}px)`;

export type ViewportLayout = "mobile" | "desktop";

export function isDesktopLayout(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
}

export function isMobileLayout(): boolean {
  return !isDesktopLayout();
}

export function getViewportLayout(): ViewportLayout {
  return isDesktopLayout() ? "desktop" : "mobile";
}

/** Sets `data-layout` and helper classes on `<html>` for CSS/JS. */
export function syncViewportLayoutAttribute(): void {
  if (typeof document === "undefined") return;
  const layout = getViewportLayout();
  document.documentElement.dataset.layout = layout;
  document.documentElement.classList.toggle("layout-desktop", layout === "desktop");
  document.documentElement.classList.toggle("layout-mobile", layout === "mobile");
}

export function subscribeViewportLayout(onChange: (layout: ViewportLayout) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(DESKTOP_MEDIA_QUERY);
  const handler = () => {
    syncViewportLayoutAttribute();
    onChange(getViewportLayout());
  };
  handler();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
