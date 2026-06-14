import { z } from "zod";

import {
  isWorkflowConstBinding,
  isWorkflowInputBinding,
  workflowParameterBindingSchema,
  type WorkflowStepConfigValue,
} from "./bindings";

/**
 * Tool config field values that accept a constant or workflow-input binding.
 *
 * @see Story 5.3.4 — Build Listing Search inspector form
 */

export const bindableStringConfigValueSchema = z.union([
  workflowParameterBindingSchema,
  z.string(),
  z.null(),
]);

export type BindableStringConfigValue = z.infer<
  typeof bindableStringConfigValueSchema
>;

export const bindableNumberConfigValueSchema = z.union([
  workflowParameterBindingSchema,
  z.number(),
  z.null(),
]);

export type BindableNumberConfigValue = z.infer<
  typeof bindableNumberConfigValueSchema
>;

export function isBindableConfigValueSet(
  value: WorkflowStepConfigValue | undefined,
): boolean {
  if (value === undefined || value === null) {
    return false;
  }

  if (isWorkflowInputBinding(value)) {
    return value.inputKey.length > 0;
  }

  if (isWorkflowConstBinding(value)) {
    if (value.value === null) {
      return false;
    }

    if (typeof value.value === "string") {
      return value.value.trim().length > 0;
    }

    return true;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value);
  }

  if (typeof value === "boolean") {
    return true;
  }

  return false;
}
