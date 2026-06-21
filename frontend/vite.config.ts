import net from "node:net";
import path from "path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

const apiHost = process.env.VITE_DEV_API_HOST ?? "127.0.0.1";
const apiPort = Number(process.env.API_PORT ?? "3000");
const apiTarget = `http://${apiHost}:${apiPort}`;

function probePort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1500);
    socket.on("connect", () => done(true));
    socket.on("error", () => done(false));
    socket.on("timeout", () => done(false));
  });
}

function apiReachablePlugin(): Plugin {
  return {
    name: "vms-api-reachable",
    async configureServer() {
      if (process.env.VMS_SKIP_API_CHECK === "true") return;
      if (apiHost !== "127.0.0.1" && apiHost !== "localhost") return;
      const up = await probePort(apiPort);
      if (up) return;
      console.error("\n[VMS] API is not running on port", apiPort);
      console.error("[VMS] The login page needs both API and database.");
      console.error("[VMS] From the project root run:  npm run dev\n");
    },
  };
}

export default defineConfig({
  plugins: [
    apiReachablePlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/*.png", "manifest.webmanifest"],
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        navigateFallback: "index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@tanstack/react-query", "react-router-dom"],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/health": { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/health": { target: apiTarget, changeOrigin: true },
    },
  },
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@tanstack/react-query")) return "vendor-query";
            if (id.includes("react-router")) return "vendor-router";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
          }
        },
      },
    },
  },
});
