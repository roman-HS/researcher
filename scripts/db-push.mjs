import { existsSync } from "node:fs";

import { config as loadEnv } from "dotenv";

import { pushMigrations, resolveDatabaseUrl } from "./db-lib.mjs";

const envLocalPath = ".env.local";
const envPath = ".env";

if (existsSync(envLocalPath)) {
  loadEnv({ path: envLocalPath });
} else if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

pushMigrations(resolveDatabaseUrl(), "local");
