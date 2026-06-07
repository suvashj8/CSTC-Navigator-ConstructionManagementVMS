import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import { isAndroid } from "@/lib/platform";

const ROOT_PATHS = new Set(["/", "/dashboard", "/login"]);

/** Android hardware back: navigate back in-app or minimize when at root. */
export function useNativeBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAndroid) return;

    let handle: { remove: () => void } | undefined;

    void CapApp.addListener("backButton", () => {
      const path = location.pathname;
      if (ROOT_PATHS.has(path)) {
        void CapApp.minimizeApp();
        return;
      }
      navigate(-1);
    }).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, [location.pathname, navigate]);
}
