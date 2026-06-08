import { useSyncExternalStore } from "react";
import {
  getViewportLayout,
  subscribeViewportLayout,
  type ViewportLayout,
} from "@/lib/viewport";

export function useViewportLayout(): ViewportLayout {
  return useSyncExternalStore(subscribeViewportLayout, getViewportLayout, () => "desktop");
}

export function useIsDesktopLayout(): boolean {
  return useViewportLayout() === "desktop";
}
