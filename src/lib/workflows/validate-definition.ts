import type { ZodError } from "zod";

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
import { listingSearchToolKey } from "@/contracts/providers/zillow/listing-search";
import { listingSearchConfigStrictSchema } from "@/modules/tools/definitions/listing-search";
import { getToolDefinition, hasToolKey } from "@/modules/tools/registry";
import { findWorkflowGraphValidationIssues } from "@/modules/workflows/graph-validation";
import { nodeHasCompatibleUpstreamArtefact } from "@/lib/workflows/upstream-artefact-compatibility";

/**
 * Shared workflow definition validation orchestration for server and client.
 *
 * @see Story 4.2.5 — Implement workflow definition validation service
 * @see Story 5.4.1 — Add builder validation panel
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
    const configSchema =
      node.toolKey === listingSearchToolKey
        ? listingSearchConfigStrictSchema
        : tool.configSchema;
    const configResult = configSchema.safeParse(node.config);

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

  for (const nodeId of executionOrder) {
    const node = definition.nodes.find((item) => item.id === nodeId);

    if (!node || !hasToolKey(node.toolKey)) {
      continue;
    }

    const tool = getToolDefinition(node.toolKey);

    if (tool.accepts.length === 0) {
      continue;
    }

    if (!nodeHasCompatibleUpstreamArtefact(definition, nodeId)) {
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
