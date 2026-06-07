import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

import { config as loadEnv } from "dotenv";

import { resolveDatabaseUrl } from "./db-lib.mjs";

const envLocalPath = ".env.local";
const envPath = ".env";

if (existsSync(envLocalPath)) {
  loadEnv({ path: envLocalPath });
} else if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

const databaseUrl = resolveDatabaseUrl();

console.log("Migration status (supabase migration list):");
execSync(`supabase migration list --db-url "${databaseUrl}"`, {
  stdio: "inherit",
});
