import { getWorkflowParamsSchema } from "@/contracts/workflows/requests";
import { createApiRoute } from "@/lib/api/handler";
import { archiveWorkflow, getWorkflow } from "@/modules/workflows";

export const GET = createApiRoute({
  auth: "workspace",
  params: getWorkflowParamsSchema,
  handler: async ({ params, workspace }) =>
    getWorkflow(params.workflowId, { workspace }),
});

export const DELETE = createApiRoute({
  auth: "workspace",
  params: getWorkflowParamsSchema,
  handler: async ({ params, workspace }) =>
    archiveWorkflow(params.workflowId, { workspace }),
});
