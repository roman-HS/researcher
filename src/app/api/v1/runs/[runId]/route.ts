import { getRunDetailQuerySchema, getRunParamsSchema } from "@/contracts/runs/requests";
import { createApiRoute } from "@/lib/api/handler";
import { getRun } from "@/modules/runs";

export const GET = createApiRoute({
  auth: "workspace",
  params: getRunParamsSchema,
  query: getRunDetailQuerySchema,
  handler: async ({ params, query, workspace }) =>
    getRun(params.runId, query, { workspace }),
});
