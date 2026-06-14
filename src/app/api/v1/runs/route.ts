import { createRunRequestSchema } from "@/contracts/runs/requests";
import { createApiRoute } from "@/lib/api/handler";
import { parseIdempotencyKeyHeader } from "@/lib/api/idempotency";
import { apiNotImplementedResponse, apiSuccessResponse } from "@/lib/api/responses";
import { createRun, toCreateRunResponse } from "@/modules/runs";

export const GET = createApiRoute({
  auth: "workspace",
  pagination: true,
  handler: async () => apiNotImplementedResponse(),
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
