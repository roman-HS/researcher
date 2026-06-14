import "server-only";

import type { ZodError } from "zod";

import type { ToolArtefactType } from "@/contracts/tools";
import {
  findWorkflowInputBindingReferenceIssues,
} from "@/contracts/workflows/bindings";
import {
  resolveWorkflowExecutionOrder,
  type WorkflowGraphValidationProfile,
} from "@/contracts/workflows/graph-validation";
import {
  workflowDefinitionSchema,
  type WorkflowDefinition,
} from "@/contracts/workflows";
import type {
  WorkflowDefinitionValidationIssue,
  WorkflowDefinitionValidationResult,
  WorkflowDefinitionValidationSeverity,
} from "@/contracts/workflows/validation";
import { findWorkflowGraphValidationIssues } from "@/modules/workflows/graph-validation";
import { getToolDefinition, hasToolKey } from "@/modules/tools/registry";

import { WorkflowDefinitionValidationError } from "./errors";

/**
 * Server-side workflow definition validation orchestration.
 *
 * @see Story 4.2.5 — Implement workflow definition validation service
 */

function formatZodDefinitionIssues(
  error: ZodError,
): WorkflowDefinitionValidationIssue[] {
  return error.issues.map((issue) => ({
    severity: "error",
    code: "definition_parse_error",
    message: issue.message,
    path: issue.path.length > 0 ? issue.path.join(".") : undefined,
  }));
}

function createValidationIssue(
  severity: WorkflowDefinitionValidationSeverity,
  code: string,
  message: string,
  options: {
    nodeId?: string;
    path?: string;
  } = {},
): WorkflowDefinitionValidationIssue {
  return {
    severity,
    code,
    message,
    ...(options.nodeId !== undefined && { nodeId: options.nodeId }),
    ...(options.path !== undefined && { path: options.path }),
  };
}

function nodeConfigPath(nodeId: string, configField?: string): string {
  return configField
    ? `nodes.${nodeId}.config.${configField}`
    : `nodes.${nodeId}.config`;
}

function collectToolAndConfigIssues(
  definition: WorkflowDefinition,
  severity: WorkflowDefinitionValidationSeverity,
): WorkflowDefinitionValidationIssue[] {
  const issues: WorkflowDefinitionValidationIssue[] = [];

  for (const node of definition.nodes) {
    if (!hasToolKey(node.toolKey)) {
      issues.push(
        createValidationIssue(
          severity,
          "unknown_tool_key",
          `Node "${node.id}" references unknown tool key "${node.toolKey}".`,
          {
            nodeId: node.id,
            path: `nodes.${node.id}.toolKey`,
          },
        ),
      );
      continue;
    }

    const tool = getToolDefinition(node.toolKey);
    const configResult = tool.configSchema.safeParse(node.config);

    if (!configResult.success) {
      for (const configIssue of configResult.error.issues) {
        const configField =
          configIssue.path.length > 0
            ? String(configIssue.path[0])
            : undefined;

        issues.push(
          createValidationIssue(
            severity,
            "invalid_tool_config",
            `Node "${node.id}" has invalid config: ${configIssue.message}`,
            {
              nodeId: node.id,
              path: nodeConfigPath(node.id, configField),
            },
          ),
        );
      }
    }
  }

  return issues;
}

function collectBindingIssues(
  definition: WorkflowDefinition,
  severity: WorkflowDefinitionValidationSeverity,
): WorkflowDefinitionValidationIssue[] {
  return findWorkflowInputBindingReferenceIssues(definition).map((issue) =>
    createValidationIssue(
      severity,
      "invalid_input_binding",
      `Node "${issue.nodeId}" config "${issue.configField}" references unknown runtime input "${issue.inputKey}".`,
      {
        nodeId: issue.nodeId,
        path: nodeConfigPath(issue.nodeId, issue.configField),
      },
    ),
  );
}

function collectGraphIssues(
  definition: WorkflowDefinition,
  profile: WorkflowGraphValidationProfile,
  severity: WorkflowDefinitionValidationSeverity,
): WorkflowDefinitionValidationIssue[] {
  return findWorkflowGraphValidationIssues(definition, profile).map((issue) =>
    createValidationIssue(severity, issue.code, issue.message, {
      nodeId: issue.nodeId,
      path: issue.nodeId ? `nodes.${issue.nodeId}` : undefined,
    }),
  );
}

function collectUpstreamArtefactWarnings(
  definition: WorkflowDefinition,
): WorkflowDefinitionValidationIssue[] {
  const warnings: WorkflowDefinitionValidationIssue[] = [];

  let executionOrder: string[];

  try {
    executionOrder = resolveWorkflowExecutionOrder(definition);
  } catch {
    return warnings;
  }

  const nodesById = new Map(
    definition.nodes.map((node) => [node.id, node] as const),
  );
  const producedArtefacts = new Set<ToolArtefactType>();

  for (const nodeId of executionOrder) {
    const node = nodesById.get(nodeId);

    if (!node || !hasToolKey(node.toolKey)) {
      continue;
    }

    const tool = getToolDefinition(node.toolKey);

    if (tool.accepts.length > 0) {
      const hasCompatibleUpstream = tool.accepts.some((artefact) =>
        producedArtefacts.has(artefact),
      );

      if (!hasCompatibleUpstream) {
        warnings.push(
          createValidationIssue(
            "warning",
            "upstream_artefact_missing",
            `Node "${node.id}" expects upstream artefacts (${tool.accepts.join(", ")}), but none have been produced yet on this path.`,
            {
              nodeId: node.id,
              path: `nodes.${node.id}`,
            },
          ),
        );
      }
    }

    for (const artefact of tool.produces) {
      producedArtefacts.add(artefact);
    }
  }

  return warnings;
}

function partitionIssues(
  issues: WorkflowDefinitionValidationIssue[],
): Pick<WorkflowDefinitionValidationResult, "errors" | "warnings"> {
  return {
    errors: issues.filter((issue) => issue.severity === "error"),
    warnings: issues.filter((issue) => issue.severity === "warning"),
  };
}

export function validateWorkflowDefinition(
  input: unknown,
  profile: WorkflowGraphValidationProfile,
): WorkflowDefinitionValidationResult {
  const parseResult = workflowDefinitionSchema.safeParse(input);

  if (!parseResult.success) {
    const errors = formatZodDefinitionIssues(parseResult.error);

    return {
      valid: false,
      errors,
      warnings: [],
    };
  }

  const definition = parseResult.data;
  const semanticSeverity: WorkflowDefinitionValidationSeverity =
    profile === "publish" ? "error" : "warning";

  const semanticIssues = [
    ...collectToolAndConfigIssues(definition, semanticSeverity),
    ...collectBindingIssues(definition, semanticSeverity),
    ...collectGraphIssues(definition, profile, semanticSeverity),
  ];

  const upstreamWarnings =
    profile === "publish" ? collectUpstreamArtefactWarnings(definition) : [];

  const { errors, warnings } = partitionIssues([
    ...semanticIssues,
    ...upstreamWarnings,
  ]);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    definition,
  };
}

export function assertWorkflowDefinitionValid(
  input: unknown,
  profile: WorkflowGraphValidationProfile,
): WorkflowDefinition {
  const result = validateWorkflowDefinition(input, profile);

  if (!result.valid || !result.definition) {
    throw new WorkflowDefinitionValidationError(result.errors, result.warnings);
  }

  return result.definition;
}
