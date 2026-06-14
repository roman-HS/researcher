import "server-only";

import type { WorkflowGraphValidationProfile } from "@/contracts/workflows/graph-validation";
import type { WorkflowDefinition } from "@/contracts/workflows";
import { validateWorkflowDefinition } from "@/lib/workflows/validate-definition";

import { WorkflowDefinitionValidationError } from "./errors";

/**
 * Server-side workflow definition validation orchestration.
 *
 * @see Story 4.2.5 — Implement workflow definition validation service
 */

export { validateWorkflowDefinition } from "@/lib/workflows/validate-definition";

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
