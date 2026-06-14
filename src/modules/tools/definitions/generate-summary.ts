import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const summarySectionKeys = [
  "overview",
  "topProperties",
  "areaHighlights",
  "warningsAndNotes",
] as const;

export const summarySectionKeySchema = z.enum(summarySectionKeys);

export type SummarySectionKey = z.infer<typeof summarySectionKeySchema>;

export const DEFAULT_INCLUDED_SUMMARY_SECTIONS = [
  "overview",
  "topProperties",
  "warningsAndNotes",
] as const satisfies readonly SummarySectionKey[];

export const generateSummaryConfigSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Summary title is required.")
    .max(120, "Summary title must be 120 characters or fewer.")
    .default("Investment analysis summary"),
  includedSections: z
    .array(summarySectionKeySchema)
    .min(1, "Select at least one summary section.")
    .default([...DEFAULT_INCLUDED_SUMMARY_SECTIONS]),
  topPropertyCount: z.number().int().min(1).max(25).default(5),
  includeMarkdown: z.boolean().default(true),
});

export type GenerateSummaryConfig = z.infer<typeof generateSummaryConfigSchema>;

export const generateSummaryTool = defineToolDefinition({
  key: "ai.generateSummary@1",
  name: "Generate Summary",
  description: "Create a readable summary from deterministic workflow results.",
  category: "summarize",
  iconKey: "fileText",
  tags: ["summary", "report", "results"],
  accepts: ["scores", "areaAggregates"],
  produces: ["summary"],
  inspectorComponentKey: "generateSummary",
  configSchema: generateSummaryConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
