import type { NextConfig } from "next";

const goApi = process.env.GO_API_URL ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  /**
   * Next.js is the client-facing API gateway.
   * Routes under src/app/api are handled here; everything else proxies to Go during migration.
   */
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${goApi}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
