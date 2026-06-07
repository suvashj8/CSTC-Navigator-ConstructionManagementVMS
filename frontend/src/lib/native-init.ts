import { App as CapApp } from "@capacitor/app";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { StatusBar, Style } from "@capacitor/status-bar";
import { isAndroid, isIOS, isNative } from "./platform";

/** Configure status bar, keyboard, and document classes for native shells. */
export async function initNativeShell() {
  if (!isNative) return;

  document.documentElement.classList.add("native-app");
  document.documentElement.classList.add(isIOS ? "platform-ios" : "platform-android");

  try {
    if (isIOS) {
      await StatusBar.setStyle({ style: Style.Light });
    } else if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: "#0f172a" });
      await StatusBar.setStyle({ style: Style.Dark });
    }
  } catch {
    /* StatusBar plugin unavailable in some WebView builds */
  }

  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    /* optional */
  }

  void CapApp.addListener("appStateChange", ({ isActive }) => {
    document.documentElement.classList.toggle("app-inactive", !isActive);
  });
}
