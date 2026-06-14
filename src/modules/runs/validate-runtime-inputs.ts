import type { ToolExecutorRuntimeInputValues } from "@/contracts/runs/executors";
import type { WorkflowRuntimeInputs } from "@/contracts/workflows/runtime-inputs";
import {
  validateRuntimeInputValues,
  type RuntimeInputValidationIssue,
} from "@/lib/workflows/validate-runtime-inputs";

import { RunInputValidationError } from "./errors";

/**
 * @see Story 7.2.3 — Implement runtime input validation
 */

export type { RuntimeInputValidationIssue };

export function parseRuntimeInputValues(
  definitions: WorkflowRuntimeInputs,
  submitted: unknown,
): ToolExecutorRuntimeInputValues {
  const result = validateRuntimeInputValues(definitions, submitted);

  if (!result.valid) {
    throw new RunInputValidationError(result.issues);
  }

  return result.values;
}
