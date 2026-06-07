import "server-only";

import postgres from "postgres";

export type DatabasePingStatus = "ok" | "error";

export async function pingDatabase(
  connectionString: string,
): Promise<DatabasePingStatus> {
  const sql = postgres(connectionString, {
    prepare: false,
    max: 1,
    idle_timeout: 1,
    connect_timeout: 5,
  });

  try {
    await sql`SELECT 1`;
    return "ok";
  } catch {
    return "error";
  } finally {
    await sql.end({ timeout: 1 });
  }
}
