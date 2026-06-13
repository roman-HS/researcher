import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const listingSearchConfigSchema = z.object({
  locationMode: z.enum(["workflowInput", "constant"]).default("workflowInput"),
});

export type ListingSearchConfig = z.infer<typeof listingSearchConfigSchema>;

export const listingSearchTool = defineToolDefinition({
  key: "rapidapi.zillow.searchListings@1",
  name: "Listing Search",
  description: "Find property listings by location and optional price filters.",
  category: "search",
  iconKey: "search",
  tags: ["listings", "search", "location"],
  accepts: [],
  produces: ["listings"],
  inspectorComponentKey: "listingSearch",
  configSchema: listingSearchConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
