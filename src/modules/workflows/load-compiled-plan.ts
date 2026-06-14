import "server-only";

import type { WorkflowVersionState } from "@/contracts/workflows/lifecycle";
import {
  areWorkflowCompiledPlansEquivalent,
  findWorkflowCompiledPlanIntegrityIssues,
  isLegacyWorkflowCompiledPlan,
  parseWorkflowCompiledPlan,
  type WorkflowCompiledPlan,
} from "@/contracts/workflows/compiled-plan";
import { hasExecutor } from "@/modules/tools/executors/registry";

import {
  compileValidatedWorkflowDefinition,
  compileWorkflowDefinition,
} from "./compile-definition";
import { WorkflowLifecycleError } from "./errors";
import { assertWorkflowDefinitionValid } from "./validate-definition";

/**
 * @see Story 7.2.1 — Implement published workflow compiler
 */

export type PublishedWorkflowVersionSource = {
  state: WorkflowVersionState;
  definitionJson: unknown;
  compiledPlanJson: unknown | null;
};

function assertPublishedVersionState(state: WorkflowVersionState): void {
  if (state !== "published") {
    throw new WorkflowLifecycleError(
      "Only published workflow versions provide a compiled execution plan.",
      "invalid_transition",
    );
  }
}

function resolveStoredCompiledPlan(
  definitionJson: unknown,
  compiledPlanJson: unknown,
): WorkflowCompiledPlan {
  const definition = assertWorkflowDefinitionValid(definitionJson, "publish");
  const expectedPlan = compileWorkflowDefinition(definition);

  if (isLegacyWorkflowCompiledPlan(compiledPlanJson)) {
    return expectedPlan;
  }

  let storedPlan: WorkflowCompiledPlan;

  try {
    storedPlan = parseWorkflowCompiledPlan(compiledPlanJson);
  } catch {
    return expectedPlan;
  }

  const integrityIssues = findWorkflowCompiledPlanIntegrityIssues(storedPlan, {
    hasExecutor,
  });

  if (integrityIssues.length > 0) {
    return expectedPlan;
  }

  if (!areWorkflowCompiledPlansEquivalent(storedPlan, expectedPlan)) {
    return expectedPlan;
  }

  return storedPlan;
}

export function loadCompiledPlanForPublishedVersion(
  version: PublishedWorkflowVersionSource,
): WorkflowCompiledPlan {
  assertPublishedVersionState(version.state);

  if (version.compiledPlanJson === null) {
    return compileValidatedWorkflowDefinition(version.definitionJson);
  }

  return resolveStoredCompiledPlan(
    version.definitionJson,
    version.compiledPlanJson,
  );
}
