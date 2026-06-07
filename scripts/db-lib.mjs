import { execSync } from "node:child_process";

export function pushMigrations(databaseUrl, label) {
  console.log(`Applying migrations (${label}) via supabase db push…`);
  execSync(`supabase db push --db-url "${databaseUrl}"`, {
    stdio: "inherit",
  });
}

export function resolveDatabaseUrl({ requireDirect = false } = {}) {
  const databaseUrl = requireDirect
    ? process.env.DATABASE_DIRECT_URL
    : (process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL);

  if (!databaseUrl) {
    const hint = requireDirect
      ? "DATABASE_DIRECT_URL must be set in the environment"
      : "DATABASE_DIRECT_URL or DATABASE_URL is required";
    console.error(hint);
    process.exit(1);
  }

  return databaseUrl;
}
