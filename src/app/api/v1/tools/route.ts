import { createApiRoute } from "@/lib/api/handler";
import { apiNotImplementedResponse } from "@/lib/api/responses";

export const GET = createApiRoute({
  auth: "workspace",
  handler: async () => apiNotImplementedResponse(),
});
