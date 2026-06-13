import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const propertyDetailConfigSchema = z.object({
  sourceMode: z.enum(["listingBased"]).default("listingBased"),
  maxProperties: z.number().int().positive().default(50),
});

export type PropertyDetailConfig = z.infer<typeof propertyDetailConfigSchema>;

export const propertyDetailTool = defineToolDefinition({
  key: "rapidapi.zillow.loadPropertyDetails@1",
  name: "Property Detail",
  description: "Load detailed property information from listing results.",
  category: "enrich",
  iconKey: "building",
  tags: ["property", "details", "enrich"],
  accepts: ["listings"],
  produces: ["propertyDetails"],
  inspectorComponentKey: "propertyDetail",
  configSchema: propertyDetailConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
