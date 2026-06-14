import {
  createWorkflowRequestSchema,
  listWorkflowsQuerySchema,
} from "@/contracts/workflows/requests";
import { createApiRoute } from "@/lib/api/handler";
import { apiPaginatedSuccessResponse } from "@/lib/api/pagination";
import { apiSuccessResponse } from "@/lib/api/responses";
import { createWorkflow, listWorkflows } from "@/modules/workflows";

export const GET = createApiRoute({
  auth: "workspace",
  query: listWorkflowsQuerySchema,
  pagination: true,
  handler: async ({ query, pagination, workspace }) => {
    if (!pagination) {
      throw new Error("Pagination is required for workflow list requests.");
    }

    const result = await listWorkflows(query, pagination, { workspace });

    return apiPaginatedSuccessResponse(result.items, result.pagination);
  },
});

export const POST = createApiRoute({
  auth: "workspace",
  body: createWorkflowRequestSchema,
  handler: async ({ body, user, workspace }) => {
    const result = await createWorkflow(body, { user, workspace });

    return apiSuccessResponse(result, { status: 201 });
  },
});
