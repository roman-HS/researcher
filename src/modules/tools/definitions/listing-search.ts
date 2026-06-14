import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  bindableNumberConfigValueSchema,
  bindableStringConfigValueSchema,
  isBindableConfigValueSet,
} from "@/contracts/workflows/bindable-config";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const listingSearchLocationSources = ["zip", "cityState"] as const;

export const listingSearchLocationSourceSchema = z.enum(
  listingSearchLocationSources,
);

export type ListingSearchLocationSource = z.infer<
  typeof listingSearchLocationSourceSchema
>;

const listingSearchConfigBaseSchema = z.object({
  locationSource: listingSearchLocationSourceSchema.default("zip"),
  zip: bindableStringConfigValueSchema.optional(),
  city: bindableStringConfigValueSchema.optional(),
  state: bindableStringConfigValueSchema.optional(),
  minPrice: bindableNumberConfigValueSchema.optional(),
  maxPrice: bindableNumberConfigValueSchema.optional(),
});

function refineListingSearchRequiredFields(
  config: z.infer<typeof listingSearchConfigBaseSchema>,
  ctx: z.RefinementCtx,
): void {
  if (config.locationSource === "zip" && !isBindableConfigValueSet(config.zip)) {
    ctx.addIssue({
      code: "custom",
      message: "ZIP code is required for ZIP-based search.",
      path: ["zip"],
    });
  }

  if (config.locationSource === "cityState") {
    if (!isBindableConfigValueSet(config.city)) {
      ctx.addIssue({
        code: "custom",
        message: "City is required for city and state search.",
        path: ["city"],
      });
    }

    if (!isBindableConfigValueSet(config.state)) {
      ctx.addIssue({
        code: "custom",
        message: "State is required for city and state search.",
        path: ["state"],
      });
    }
  }
}

/** Parses partial configs and supplies defaults (e.g. for new tool nodes). */
export const listingSearchConfigSchema = listingSearchConfigBaseSchema;

/** Validates a complete author configuration (required location fields). */
export const listingSearchConfigStrictSchema =
  listingSearchConfigBaseSchema.superRefine(refineListingSearchRequiredFields);

export type ListingSearchConfig = z.infer<typeof listingSearchConfigBaseSchema>;

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
