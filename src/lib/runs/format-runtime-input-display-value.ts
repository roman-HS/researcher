import type { ToolExecutorRuntimeInputValues } from "@/contracts/runs/executors";
import type {
  WorkflowRuntimeInput,
  WorkflowRuntimeInputs,
} from "@/contracts/workflows/runtime-inputs";

/**
 * @see Story 8.2.2 — Build run detail header
 */

export type RuntimeInputSummaryItem = {
  key: string;
  label: string;
  value: string;
};

export function formatRuntimeInputDisplayValue(
  input: WorkflowRuntimeInput,
  value: unknown,
): string {
  if (value === undefined || value === null) {
    return "—";
  }

  switch (input.type) {
    case "boolean":
      return value === true ? "Yes" : value === false ? "No" : "—";
    case "select": {
      if (typeof value !== "string") {
        return "—";
      }

      const option = input.options.find((entry) => entry.value === value);
      return option?.label ?? value;
    }
    case "number":
      return typeof value === "number" && Number.isFinite(value)
        ? String(value)
        : "—";
    case "text":
      return typeof value === "string" && value.length > 0 ? value : "—";
    default:
      return String(value);
  }
}

export function buildRuntimeInputSummaryItems(
  runtimeInputs: WorkflowRuntimeInputs,
  inputValues: ToolExecutorRuntimeInputValues,
): RuntimeInputSummaryItem[] {
  return runtimeInputs.map((input) => ({
    key: input.key,
    label: input.label,
    value: formatRuntimeInputDisplayValue(input, inputValues[input.key]),
  }));
}
