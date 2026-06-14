import { createRunRequestSchema, listRunsQuerySchema } from "@/contracts/runs/requests";
import { createApiRoute } from "@/lib/api/handler";
import { parseIdempotencyKeyHeader } from "@/lib/api/idempotency";
import { apiPaginatedSuccessResponse } from "@/lib/api/pagination";
import { apiSuccessResponse } from "@/lib/api/responses";
import { createRun, listRuns, toCreateRunResponse } from "@/modules/runs";

export const GET = createApiRoute({
  auth: "workspace",
  query: listRunsQuerySchema,
  pagination: true,
  handler: async ({ query, pagination, workspace }) => {
    if (!pagination) {
      throw new Error("Pagination is required for run list requests.");
    }

    const result = await listRuns(query, pagination, { workspace });

    return apiPaginatedSuccessResponse(result.items, result.pagination);
  },
});

export const POST = createApiRoute({
  auth: "workspace",
  body: createRunRequestSchema,
  handler: async ({ body, request, user, workspace }) => {
    const idempotencyResult = parseIdempotencyKeyHeader(request);

    if (!idempotencyResult.ok) {
      return idempotencyResult.response;
    }

    const result = await createRun(body, idempotencyResult.value, {
      user,
      workspace,
    });

    return apiSuccessResponse(toCreateRunResponse(result), {
      status: result.replayed ? 200 : 201,
    });
  },
});
