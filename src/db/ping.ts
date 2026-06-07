import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "./client";

export type DatabasePingStatus = "ok" | "error";

export async function pingDatabase(): Promise<DatabasePingStatus> {
  try {
    await getDb().execute(sql`SELECT 1`);
    return "ok";
  } catch {
    return "error";
  }
}
