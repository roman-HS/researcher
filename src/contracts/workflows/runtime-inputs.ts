import { z } from "zod";

/**
 * Author-declared inputs that end users provide when starting a workflow run.
 *
 * @see Story 4.2.2 — Define workflow runtime input schema
 */

const runtimeInputKeyPattern = /^[a-z][a-zA-Z0-9]*$/;

export const workflowRuntimeInputKeySchema = z
  .string()
  .regex(
    runtimeInputKeyPattern,
    "Runtime input key must start with a lowercase letter and use only letters and numbers.",
  );

export type WorkflowRuntimeInputKey = z.infer<
  typeof workflowRuntimeInputKeySchema
>;

const workflowRuntimeInputBaseFields = {
  key: workflowRuntimeInputKeySchema,
  label: z.string().min(1),
  required: z.boolean().default(false),
  helperText: z.string().optional(),
} as const;

function hasUniqueValues<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

export const workflowTextRuntimeInputSchema = z
  .object({
    ...workflowRuntimeInputBaseFields,
    type: z.literal("text"),
    default: z.string().optional(),
  })
  .strict();

export const workflowNumberRuntimeInputSchema = z
  .object({
    ...workflowRuntimeInputBaseFields,
    type: z.literal("number"),
    default: z.number().finite().optional(),
  })
  .strict();

export const workflowBooleanRuntimeInputSchema = z
  .object({
    ...workflowRuntimeInputBaseFields,
    type: z.literal("boolean"),
    default: z.boolean().optional(),
  })
  .strict();

export const workflowSelectOptionSchema = z
  .object({
    value: z.string().min(1),
    label: z.string().min(1),
  })
  .strict();

export const workflowSelectRuntimeInputSchema = z
  .object({
    ...workflowRuntimeInputBaseFields,
    type: z.literal("select"),
    default: z.string().optional(),
    options: z.array(workflowSelectOptionSchema).min(1),
  })
  .strict()
  .superRefine((input, ctx) => {
    const optionValues = input.options.map((option) => option.value);

    if (!hasUniqueValues(optionValues)) {
      ctx.addIssue({
        code: "custom",
        message: "Select option values must be unique.",
        path: ["options"],
      });
    }

    if (
      input.default !== undefined &&
      !optionValues.includes(input.default)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Select default must match one of the option values.",
        path: ["default"],
      });
    }
  });

export const workflowRuntimeInputSchema = z.discriminatedUnion("type", [
  workflowTextRuntimeInputSchema,
  workflowNumberRuntimeInputSchema,
  workflowBooleanRuntimeInputSchema,
  workflowSelectRuntimeInputSchema,
]);

export type WorkflowRuntimeInput = z.infer<typeof workflowRuntimeInputSchema>;

export const workflowRuntimeInputsSchema = z
  .array(workflowRuntimeInputSchema)
  .refine(
    (inputs) => hasUniqueValues(inputs.map((input) => input.key)),
    "Runtime input keys must be unique.",
  );

export type WorkflowRuntimeInputs = z.infer<typeof workflowRuntimeInputsSchema>;

export function parseWorkflowRuntimeInputs(
  value: unknown,
): WorkflowRuntimeInputs {
  return workflowRuntimeInputsSchema.parse(value);
}
