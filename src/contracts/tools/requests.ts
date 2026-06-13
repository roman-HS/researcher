import { z } from "zod";

import { toolCategorySchema } from "@/contracts/tools/internal";

export const listToolsQuerySchema = z.object({
  category: toolCategorySchema.optional(),
});

export type ListToolsQuery = z.infer<typeof listToolsQuerySchema>;
