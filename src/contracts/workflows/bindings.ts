import { z } from "zod";

import { workflowRuntimeInputKeySchema } from "./runtime-inputs";

/**
 * Parameter bindings for tool step config values.
 *
 * @see Story 4.2.3 — Define parameter binding schema
 */

export const workflowConstBindingValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type WorkflowConstBindingValue = z.infer<
  typeof workflowConstBindingValueSchema
>;

export const workflowConstBindingSchema = z
  .object({
    kind: z.literal("const"),
    value: workflowConstBindingValueSchema,
  })
  .strict();

export type WorkflowConstBinding = z.infer<typeof workflowConstBindingSchema>;

export const workflowInputBindingSchema = z
  .object({
    kind: z.literal("workflowInput"),
    inputKey: workflowRuntimeInputKeySchema,
  })
  .strict();

export type WorkflowInputBinding = z.infer<typeof workflowInputBindingSchema>;

export const workflowParameterBindingSchema = z.discriminatedUnion("kind", [
  workflowConstBindingSchema,
  workflowInputBindingSchema,
]);

export type WorkflowParameterBinding = z.infer<
  typeof workflowParameterBindingSchema
>;

export const workflowStepConfigValueSchema = z.union([
  workflowParameterBindingSchema,
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export type WorkflowStepConfigValue = z.infer<
  typeof workflowStepConfigValueSchema
>;

export const workflowStepConfigSchema = z.record(
  z.string(),
  workflowStepConfigValueSchema
);

export type WorkflowStepConfig = z.infer<typeof workflowStepConfigSchema>;

export function isWorkflowParameterBinding(
  value: unknown
): value is WorkflowParameterBinding {
  return workflowParameterBindingSchema.safeParse(value).success;
}

export function isWorkflowInputBinding(
  value: unknown
): value is WorkflowInputBinding {
  return workflowInputBindingSchema.safeParse(value).success;
}

export function isWorkflowConstBinding(
  value: unknown
): value is WorkflowConstBinding {
  return workflowConstBindingSchema.safeParse(value).success;
}

export function parseWorkflowParameterBinding(
  value: unknown
): WorkflowParameterBinding {
  return workflowParameterBindingSchema.parse(value);
}

export type WorkflowInputBindingReferenceIssue = {
  nodeId: string;
  configField: string;
  inputKey: string;
};

export type WorkflowInputBindingValidationDefinition = {
  runtimeInputs: ReadonlyArray<{ key: string }>;
  nodes: ReadonlyArray<{ id: string; config: WorkflowStepConfig }>;
};

export function findWorkflowInputBindingReferenceIssues(
  definition: WorkflowInputBindingValidationDefinition
): WorkflowInputBindingReferenceIssue[] {
  const declaredInputKeys = new Set(
    definition.runtimeInputs.map((input) => input.key)
  );
  const issues: WorkflowInputBindingReferenceIssue[] = [];

  for (const node of definition.nodes) {
    for (const [configField, configValue] of Object.entries(node.config)) {
      if (!isWorkflowInputBinding(configValue)) {
        continue;
      }

      if (!declaredInputKeys.has(configValue.inputKey)) {
        issues.push({
          nodeId: node.id,
          configField,
          inputKey: configValue.inputKey,
        });
      }
    }
  }

  return issues;
}

export class WorkflowBindingReferenceError extends Error {
  override readonly name = "WorkflowBindingReferenceError";

  readonly issues: readonly WorkflowInputBindingReferenceIssue[];

  constructor(issues: readonly WorkflowInputBindingReferenceIssue[]) {
    const summary = issues
      .map(
        (issue) =>
          `node "${issue.nodeId}" config "${issue.configField}" references unknown runtime input "${issue.inputKey}"`
      )
      .join("; ");

    super(
      issues.length === 1
        ? `Invalid workflow input binding: ${summary}.`
        : `Invalid workflow input bindings: ${summary}.`
    );

    this.issues = issues;
  }
}

export function validateWorkflowInputBindingReferences(
  definition: WorkflowInputBindingValidationDefinition
): void {
  const issues = findWorkflowInputBindingReferenceIssues(definition);

  if (issues.length > 0) {
    throw new WorkflowBindingReferenceError(issues);
  }
}
