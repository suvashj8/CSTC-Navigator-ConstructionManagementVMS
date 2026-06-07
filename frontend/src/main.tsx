import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import App from "./App";
import { initNativeShell } from "@/lib/native-init";
import { isMobileViewport, isNative } from "@/lib/platform";
import "./index.css";

void initNativeShell();

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: !isNative,
      // Keep list data warm briefly so page switches feel instant.
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  },
});

const toasterPosition = isNative || isMobileViewport() ? "top-center" : "top-right";

const app = (
  <QueryClientProvider client={qc}>
    <BrowserRouter>
      <App />
      <Toaster richColors position={toasterPosition} closeButton />
    </BrowserRouter>
  </QueryClientProvider>
);

// StrictMode double-mounts in dev and duplicates every API call — skip for snappier local dev.
ReactDOM.createRoot(document.getElementById("root")!).render(
  import.meta.env.PROD ? <React.StrictMode>{app}</React.StrictMode> : app
);
