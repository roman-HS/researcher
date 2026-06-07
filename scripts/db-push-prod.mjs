import { pushMigrations, resolveDatabaseUrl } from "./db-lib.mjs";

console.log(
  "Production migration — uses DATABASE_DIRECT_URL from the environment only (not .env.local).",
);

pushMigrations(resolveDatabaseUrl({ requireDirect: true }), "production");
