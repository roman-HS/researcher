import {
  updateWorkflowDraftParamsSchema,
  updateWorkflowDraftRequestSchema,
} from "@/contracts/workflows/requests";
import { createApiRoute } from "@/lib/api/handler";
import { updateWorkflowDraft } from "@/modules/workflows";

export const PATCH = createApiRoute({
  auth: "workspace",
  params: updateWorkflowDraftParamsSchema,
  body: updateWorkflowDraftRequestSchema,
  handler: async ({ params, body, user, workspace }) =>
    updateWorkflowDraft(params.workflowId, body, { user, workspace }),
});
