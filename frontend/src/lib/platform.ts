import { Capacitor } from "@capacitor/core";
import { isMobileLayout } from "./viewport";

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

/** True when layout is mobile (< 7 inch equivalent viewport width). */export function isMobileViewport() {
  return isMobileLayout();
}
