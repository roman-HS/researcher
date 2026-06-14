import {
  isBindableConfigValueSet,
} from "@/contracts/workflows/bindable-config";
import {
  isWorkflowConstBinding,
  isWorkflowInputBinding,
  type WorkflowStepConfigValue,
} from "@/contracts/workflows/bindings";
import type { WorkflowRuntimeInput } from "@/contracts/workflows/runtime-inputs";

/**
 * Client-side helpers for bindable tool config fields.
 *
 * @see Story 5.3.4 — Build Listing Search inspector form
 */

export { isBindableConfigValueSet } from "@/contracts/workflows/bindable-config";

export type ConfigFieldValueType = "text" | "number";

export type ConfigValueMode = "constant" | "workflowInput";

export function getConfigValueMode(
  value: WorkflowStepConfigValue | undefined,
): ConfigValueMode {
  if (isWorkflowInputBinding(value)) {
    return "workflowInput";
  }

  return "constant";
}

export function getConstantStringValue(
  value: WorkflowStepConfigValue | undefined,
): string {
  if (typeof value === "string") {
    return value;
  }

  if (isWorkflowConstBinding(value) && typeof value.value === "string") {
    return value.value;
  }

  return "";
}

export function getConstantNumberValue(
  value: WorkflowStepConfigValue | undefined,
): string {
  if (typeof value === "number") {
    return String(value);
  }

  if (isWorkflowConstBinding(value) && typeof value.value === "number") {
    return String(value.value);
  }

  return "";
}

export function getWorkflowInputBindingKey(
  value: WorkflowStepConfigValue | undefined,
): string | null {
  if (isWorkflowInputBinding(value)) {
    return value.inputKey;
  }

  return null;
}

export function isRuntimeInputCompatibleWithFieldType(
  input: WorkflowRuntimeInput,
  fieldType: ConfigFieldValueType,
): boolean {
  switch (fieldType) {
    case "text":
      return input.type === "text";
    case "number":
      return input.type === "number";
    default:
      return false;
  }
}

export function validateConfigValueField(
  value: WorkflowStepConfigValue | undefined,
  options: {
    required?: boolean;
    fieldType: ConfigFieldValueType;
    runtimeInputs: readonly WorkflowRuntimeInput[];
    label: string;
  },
): string | undefined {
  const { required = false, fieldType, runtimeInputs, label } = options;

  if (required && !isBindableConfigValueSet(value)) {
    return `${label} is required.`;
  }

  if (!isBindableConfigValueSet(value)) {
    return undefined;
  }

  if (isWorkflowInputBinding(value)) {
    const runtimeInput = runtimeInputs.find((input) => input.key === value.inputKey);

    if (!runtimeInput) {
      return `Binding references unknown workflow input "${value.inputKey}".`;
    }

    if (!isRuntimeInputCompatibleWithFieldType(runtimeInput, fieldType)) {
      return `Workflow input "${value.inputKey}" must be a ${fieldType} type for ${label}.`;
    }

    return undefined;
  }

  if (fieldType === "number") {
    const raw = getConstantNumberValue(value);

    if (raw.length > 0 && !Number.isFinite(Number(raw))) {
      return `${label} must be a valid number.`;
    }
  }

  return undefined;
}

export function resolveNumericConfigValue(
  value: WorkflowStepConfigValue | undefined,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (isWorkflowConstBinding(value) && typeof value.value === "number") {
    return value.value;
  }

  const raw = getConstantNumberValue(value);

  if (raw.length === 0) {
    return null;
  }

  const parsed = Number(raw);

  return Number.isFinite(parsed) ? parsed : null;
}
