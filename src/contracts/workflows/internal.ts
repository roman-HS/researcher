import { z } from "zod";

import { toolKeySchema } from "@/contracts/tools/internal";

import {
  workflowRuntimeInputKeySchema,
  workflowRuntimeInputsSchema,
} from "./runtime-inputs";

/**
 * Non-HTTP workflow shapes (e.g. definition documents, bindings).
 *
 * @see Story 4.2.1 — Define WorkflowDefinitionSchema
 * @see Story 4.2.3 — Define parameter binding schema
 */

export const WORKFLOW_DEFINITION_VERSION = 1 as const;

const workflowNodeIdPattern = /^[a-z][a-z0-9_-]*$/;

export const workflowNodeIdSchema = z
  .string()
  .regex(
    workflowNodeIdPattern,
    "Node ID must start with a lowercase letter and use only lowercase letters, numbers, underscores, and hyphens.",
  );

export type WorkflowNodeId = z.infer<typeof workflowNodeIdSchema>;

export const workflowConstBindingSchema = z
  .object({
    kind: z.literal("const"),
    value: z.unknown(),
  })
  .strict();

export const workflowInputBindingSchema = z
  .object({
    kind: z.literal("workflowInput"),
    inputKey: workflowRuntimeInputKeySchema,
  })
  .strict();

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

export const workflowStepConfigSchema = z.record(
  z.string(),
  workflowStepConfigValueSchema,
);

export type WorkflowStepConfig = z.infer<typeof workflowStepConfigSchema>;

export const workflowNodePositionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
  })
  .strict();

export type WorkflowNodePosition = z.infer<typeof workflowNodePositionSchema>;

export const workflowToolNodeSchema = z
  .object({
    id: workflowNodeIdSchema,
    kind: z.literal("tool"),
    toolKey: toolKeySchema,
    title: z.string().min(1),
    config: workflowStepConfigSchema.default({}),
    position: workflowNodePositionSchema,
  })
  .strict();

export type WorkflowToolNode = z.infer<typeof workflowToolNodeSchema>;

export const workflowEdgeSchema = z
  .object({
    source: workflowNodeIdSchema,
    target: workflowNodeIdSchema,
    id: z.string().min(1).optional(),
  })
  .strict();

export type WorkflowEdge = z.infer<typeof workflowEdgeSchema>;

export const workflowTriggerSchema = z
  .object({
    type: z.literal("manual"),
  })
  .strict();

export type WorkflowTrigger = z.infer<typeof workflowTriggerSchema>;

function hasUniqueValues<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

export const workflowDefinitionSchema = z
  .object({
    definitionVersion: z.literal(WORKFLOW_DEFINITION_VERSION),
    trigger: workflowTriggerSchema,
    runtimeInputs: workflowRuntimeInputsSchema.default([]),
    nodes: z
      .array(workflowToolNodeSchema)
      .default([])
      .refine(
        (nodes) => hasUniqueValues(nodes.map((node) => node.id)),
        "Workflow node IDs must be unique.",
      ),
    edges: z.array(workflowEdgeSchema).default([]),
  })
  .strict();

export type WorkflowDefinition = z.infer<typeof workflowDefinitionSchema>;

export function createEmptyWorkflowDefinition(): WorkflowDefinition {
  return {
    definitionVersion: WORKFLOW_DEFINITION_VERSION,
    trigger: { type: "manual" },
    runtimeInputs: [],
    nodes: [],
    edges: [],
  };
}

export function parseWorkflowDefinition(value: unknown): WorkflowDefinition {
  return workflowDefinitionSchema.parse(value);
}
