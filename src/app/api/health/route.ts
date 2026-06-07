import { getServerEnv } from "@/lib/env/server";

export async function GET() {
  const env = getServerEnv();

  return Response.json({
    ok: true,
    nodeEnv: env.NODE_ENV,
    executionTransport: env.EXECUTION_TRANSPORT,
  });
}
