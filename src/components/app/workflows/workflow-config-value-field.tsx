"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isWorkflowInputBinding } from "@/contracts/workflows/bindings";
import type { WorkflowStepConfigValue } from "@/contracts/workflows/bindings";
import type { WorkflowRuntimeInput } from "@/contracts/workflows/runtime-inputs";
import {
  getConstantNumberValue,
  getConstantStringValue,
  type ConfigFieldValueType,
  validateConfigValueField,
} from "@/lib/workflows/bindable-config-value";

/**
 * Fixed-value field for tool inspector forms.
 * Run-time binding UI is hidden until the workflow input editor ships.
 *
 * @see Story 5.3.4 — Build Listing Search inspector form
 */

type WorkflowConfigValueFieldProps = {
  id: string;
  label: string;
  value: WorkflowStepConfigValue | undefined;
  fieldType: ConfigFieldValueType;
  placeholder?: string;
  error?: string;
  onChange: (value: WorkflowStepConfigValue | undefined) => void;
};

export function WorkflowConfigValueField({
  id,
  label,
  value,
  fieldType,
  placeholder,
  error,
  onChange,
}: WorkflowConfigValueFieldProps) {
  function handleConstantChange(raw: string) {
    if (fieldType === "number") {
      if (raw.trim().length === 0) {
        onChange(undefined);
        return;
      }

      const parsed = Number(raw);

      if (Number.isFinite(parsed)) {
        onChange(parsed);
      } else {
        onChange(raw);
      }

      return;
    }

    onChange(raw);
  }

  const displayValue = isWorkflowInputBinding(value)
    ? ""
    : fieldType === "number"
      ? getConstantNumberValue(value)
      : getConstantStringValue(value);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>

      <Input
        id={id}
        type={fieldType === "number" ? "number" : "text"}
        value={displayValue}
        onChange={(event) => handleConstantChange(event.target.value)}
        placeholder={placeholder}
        className="h-9"
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function buildConfigValueFieldError(
  value: WorkflowStepConfigValue | undefined,
  options: {
    required?: boolean;
    fieldType: ConfigFieldValueType;
    runtimeInputs: readonly WorkflowRuntimeInput[];
    label: string;
  },
): string | undefined {
  const valueForValidation = isWorkflowInputBinding(value) ? undefined : value;

  return validateConfigValueField(valueForValidation, options);
}
