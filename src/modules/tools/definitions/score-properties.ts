import { z } from "zod";

import { defineToolDefinition } from "@/contracts/tools";
import {
  toolInputPlaceholderSchema,
  toolOutputPlaceholderSchema,
} from "@/modules/tools/schemas/placeholders";

export const scorePropertiesConfigSchema = z
  .object({
    capRateWeight: z.number().min(0).max(100).default(40),
    cashOnCashReturnWeight: z.number().min(0).max(100).default(35),
    monthlyCashFlowWeight: z.number().min(0).max(100).default(25),
    minimumScore: z.number().min(0).max(100).default(0),
  })
  .superRefine((data, ctx) => {
    const totalWeight =
      data.capRateWeight +
      data.cashOnCashReturnWeight +
      data.monthlyCashFlowWeight;

    if (totalWeight <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one component weight must be greater than zero.",
        path: ["capRateWeight"],
      });
    }
  });

export type ScorePropertiesConfig = z.infer<typeof scorePropertiesConfigSchema>;

export const scorePropertiesTool = defineToolDefinition({
  key: "analysis.scoreProperties@1",
  name: "Score Properties",
  description: "Rank properties using transparent scoring weights and thresholds.",
  category: "analyze",
  iconKey: "star",
  tags: ["score", "ranking", "analysis"],
  accepts: ["metrics"],
  produces: ["scores"],
  inspectorComponentKey: "scoreProperties",
  configSchema: scorePropertiesConfigSchema,
  inputSchema: toolInputPlaceholderSchema,
  outputSchema: toolOutputPlaceholderSchema,
});
