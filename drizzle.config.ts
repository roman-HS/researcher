import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

const envLocalPath = resolve(".env.local");
const envPath = resolve(".env");

if (existsSync(envLocalPath)) {
  loadEnv({ path: envLocalPath });
} else if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_DIRECT_URL or DATABASE_URL is required for Drizzle Kit",
  );
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./supabase/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  entities: {
    roles: {
      provider: "supabase",
    },
  },
  migrations: {
    prefix: "supabase",
  },
  dbCredentials: {
    url: databaseUrl,
  },
});
