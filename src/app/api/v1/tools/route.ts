import { listToolsQuerySchema } from "@/contracts/tools/requests";
import { createApiRoute } from "@/lib/api/handler";
import { listToolsForDiscovery } from "@/modules/tools/discovery";

export const GET = createApiRoute({
  auth: "workspace",
  query: listToolsQuerySchema,
  handler: async ({ query }) =>
    listToolsForDiscovery({
      category: query.category,
    }),
});
