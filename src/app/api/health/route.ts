import { pingDatabase } from "@/db/ping";
import { getServerEnv } from "@/lib/env/server";

export async function GET() {
  const env = getServerEnv();

  let database: "ok" | "skipped" | "error" = "skipped";
  if (env.DATABASE_URL) {
    database = await pingDatabase();
  }

  return Response.json({
    ok: database !== "error",
    nodeEnv: env.NODE_ENV,
    executionTransport: env.EXECUTION_TRANSPORT,
    database,
  });
}
