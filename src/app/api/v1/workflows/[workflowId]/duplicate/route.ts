import {
  duplicateWorkflowParamsSchema,
  duplicateWorkflowRequestSchema,
} from "@/contracts/workflows/requests";
import { createApiRoute } from "@/lib/api/handler";
import { apiSuccessResponse } from "@/lib/api/responses";
import { duplicateWorkflow } from "@/modules/workflows";

export const POST = createApiRoute({
  auth: "workspace",
  params: duplicateWorkflowParamsSchema,
  body: duplicateWorkflowRequestSchema,
  handler: async ({ params, body, user, workspace }) => {
    const result = await duplicateWorkflow(params.workflowId, body, {
      user,
      workspace,
    });

    return apiSuccessResponse(result, { status: 201 });
  },
});
