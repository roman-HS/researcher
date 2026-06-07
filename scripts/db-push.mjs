import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

import { config as loadEnv } from "dotenv";

const envLocalPath = ".env.local";
const envPath = ".env";

if (existsSync(envLocalPath)) {
  loadEnv({ path: envLocalPath });
} else if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

const databaseUrl =
  process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_DIRECT_URL or DATABASE_URL is required for db:migrate");
  process.exit(1);
}

execSync(`supabase db push --db-url "${databaseUrl}"`, {
  stdio: "inherit",
});
