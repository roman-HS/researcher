import type { WorkflowDefinition } from "@/contracts/workflows/internal";
import type { WorkflowRuntimeInput } from "@/contracts/workflows/runtime-inputs";

/**
 * Append a runtime input to a workflow definition.
 *
 * @see Story 5.3.4 — Build Listing Search inspector form
 */

export function addRuntimeInputToDefinition(
  definition: WorkflowDefinition,
  input: WorkflowRuntimeInput,
): WorkflowDefinition {
  const existingKeys = new Set(definition.runtimeInputs.map((item) => item.key));

  if (existingKeys.has(input.key)) {
    return definition;
  }

  return {
    ...definition,
    runtimeInputs: [...definition.runtimeInputs, input],
  };
}
