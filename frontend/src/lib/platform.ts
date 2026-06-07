import { Capacitor } from "@capacitor/core";

export type PlatformKind = "web" | "ios" | "android";

export function getPlatform(): PlatformKind {
  const p = Capacitor.getPlatform();
  if (p === "ios") return "ios";
  if (p === "android") return "android";
  return "web";
}

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === "ios";
export const isAndroid = Capacitor.getPlatform() === "android";
export const isWeb = !isNative;

/** True for phone-sized native apps and narrow mobile browsers. */
export function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}
