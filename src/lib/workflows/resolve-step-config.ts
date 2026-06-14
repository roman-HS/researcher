import type { ToolExecutorResolvedConfig, ToolExecutorRuntimeInputValues } from "@/contracts/runs/executors";
import {
  isBindableConfigValueSet,
} from "@/contracts/workflows/bindable-config";
import {
  isWorkflowConstBinding,
  isWorkflowInputBinding,
  isWorkflowParameterBinding,
  type WorkflowStepConfig,
  type WorkflowStepConfigValue,
} from "@/contracts/workflows/bindings";
import type { WorkflowRuntimeInputs } from "@/contracts/workflows/runtime-inputs";
import {
  isRuntimeInputCompatibleWithFieldType,
  type ConfigFieldValueType,
} from "@/lib/workflows/bindable-config-value";

/**
 * Resolve workflow step parameter bindings into executor-ready config values.
 *
 * @see Story 7.2.4 — Implement parameter binding resolver
 */

export type StepConfigResolutionIssue = {
  field: string;
  message: string;
};

export type ResolveWorkflowStepConfigOptions = {
  runtimeInputs?: WorkflowRuntimeInputs;
  bindableFieldTypes?: Readonly<Record<string, ConfigFieldValueType>>;
};

export type ResolveWorkflowStepConfigResult =
  | {
      valid: true;
      config: ToolExecutorResolvedConfig;
    }
  | {
      valid: false;
      issues: StepConfigResolutionIssue[];
    };

function issue(field: string, message: string): StepConfigResolutionIssue {
  return { field, message };
}

function isBindableConfigField(
  field: string,
  value: WorkflowStepConfigValue,
  bindableFieldTypes: Readonly<Record<string, ConfigFieldValueType>> | undefined,
): boolean {
  return (
    isWorkflowParameterBinding(value) ||
    bindableFieldTypes?.[field] !== undefined
  );
}

function shouldOmitBindableConstant(value: WorkflowStepConfigValue): boolean {
  if (isWorkflowConstBinding(value)) {
    if (value.value === null) {
      return true;
    }

    if (typeof value.value === "string" && value.value.trim().length === 0) {
      return true;
    }

    return false;
  }

  if (value === null) {
    return true;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return true;
  }

  return !isBindableConfigValueSet(value);
}

function resolveConstantValue(
  value: WorkflowStepConfigValue,
): string | number | boolean {
  if (isWorkflowConstBinding(value)) {
    return value.value as string | number | boolean;
  }

  return value as string | number | boolean;
}

function findRuntimeInputDefinition(
  runtimeInputs: WorkflowRuntimeInputs | undefined,
  inputKey: string,
) {
  return runtimeInputs?.find((input) => input.key === inputKey);
}

function resolveWorkflowInputBinding(
  field: string,
  binding: Extract<WorkflowStepConfigValue, { kind: "workflowInput" }>,
  runtimeInputValues: ToolExecutorRuntimeInputValues,
  options: ResolveWorkflowStepConfigOptions,
  issues: StepConfigResolutionIssue[],
): string | number | boolean | undefined {
  const runtimeInput = findRuntimeInputDefinition(
    options.runtimeInputs,
    binding.inputKey,
  );

  if (options.runtimeInputs && !runtimeInput) {
    issues.push(
      issue(
        field,
        `Binding references unknown workflow input "${binding.inputKey}".`,
      ),
    );
    return undefined;
  }

  const fieldType = options.bindableFieldTypes?.[field];

  if (runtimeInput && fieldType && !isRuntimeInputCompatibleWithFieldType(runtimeInput, fieldType)) {
    issues.push(
      issue(
        field,
        `Workflow input "${binding.inputKey}" must be a ${fieldType} type for config field "${field}".`,
      ),
    );
    return undefined;
  }

  if (!(binding.inputKey in runtimeInputValues)) {
    return undefined;
  }

  const resolvedValue = runtimeInputValues[binding.inputKey];

  if (resolvedValue === null || resolvedValue === undefined) {
    return undefined;
  }

  return resolvedValue;
}

export function resolveWorkflowStepConfig(
  stepConfig: WorkflowStepConfig,
  runtimeInputValues: ToolExecutorRuntimeInputValues,
  options: ResolveWorkflowStepConfigOptions = {},
): ResolveWorkflowStepConfigResult {
  const resolved: ToolExecutorResolvedConfig = {};
  const issues: StepConfigResolutionIssue[] = [];

  for (const [field, value] of Object.entries(stepConfig)) {
    if (isWorkflowInputBinding(value)) {
      const resolvedValue = resolveWorkflowInputBinding(
        field,
        value,
        runtimeInputValues,
        options,
        issues,
      );

      if (resolvedValue === undefined) {
        continue;
      }

      resolved[field] = resolvedValue;
      continue;
    }

    if (isBindableConfigField(field, value, options.bindableFieldTypes)) {
      if (shouldOmitBindableConstant(value)) {
        continue;
      }

      resolved[field] = resolveConstantValue(value);
      continue;
    }

    resolved[field] = value;
  }

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  return {
    valid: true,
    config: resolved,
  };
}
