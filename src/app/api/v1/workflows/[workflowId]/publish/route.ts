import { publishWorkflowParamsSchema } from "@/contracts/workflows/requests";
import { createApiRoute } from "@/lib/api/handler";
import { publishWorkflow } from "@/modules/workflows";

export const POST = createApiRoute({
  auth: "workspace",
  params: publishWorkflowParamsSchema,
  handler: async ({ params, user, workspace }) =>
    publishWorkflow(params.workflowId, { user, workspace }),
});
