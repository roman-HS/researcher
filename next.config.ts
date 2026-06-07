import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Drizzle-only setup: stub unused kysely adapter to avoid Turbopack + kysely 0.29.x build errors.
    resolveAlias: {
      "@better-auth/kysely-adapter": "./stubs/empty-kysely-adapter.mjs",
    },
  },
};

export default nextConfig;
