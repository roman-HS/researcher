import { createApiRoute } from "@/lib/api/handler";
import { apiNotImplementedResponse } from "@/lib/api/responses";

export const GET = createApiRoute({
  auth: "workspace",
  pagination: true,
  handler: async () => apiNotImplementedResponse(),
});

export const POST = createApiRoute({
  auth: "workspace",
  handler: async () => apiNotImplementedResponse(),
});
