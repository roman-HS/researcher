import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const fetchComparablesConfigSchema = z.object({
  maxComparables: z.number().int().positive().default(10),
});

export type FetchComparablesConfig = z.infer<typeof fetchComparablesConfigSchema>;

export const fetchComparablesTool = defineToolDefinition({
  key: "rapidapi.zillow.fetchComparables@1",
  name: "Fetch Comparables",
  description: "Retrieve comparable properties for enriched listings.",
  category: "enrich",
  iconKey: "gitCompare",
  tags: ["comparables", "comps", "enrich"],
  accepts: ["propertyDetails"],
  produces: ["comparables"],
  inspectorComponentKey: "fetchComparables",
  configSchema: fetchComparablesConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
