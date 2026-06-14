import type { ToolExecutorResolvedConfig, ToolExecutorRuntimeInputValues } from "@/contracts/runs/executors";
import type { WorkflowStepConfig } from "@/contracts/workflows/bindings";
import {
  resolveWorkflowStepConfig,
  type ResolveWorkflowStepConfigOptions,
  type StepConfigResolutionIssue,
} from "@/lib/workflows/resolve-step-config";

import { RunStepConfigResolutionError } from "./errors";

/**
 * @see Story 7.2.4 — Implement parameter binding resolver
 */

export type { StepConfigResolutionIssue, ResolveWorkflowStepConfigOptions };

export function parseResolvedStepConfig(
  stepConfig: WorkflowStepConfig,
  runtimeInputValues: ToolExecutorRuntimeInputValues,
  options: ResolveWorkflowStepConfigOptions = {},
): ToolExecutorResolvedConfig {
  const result = resolveWorkflowStepConfig(
    stepConfig,
    runtimeInputValues,
    options,
  );

  if (!result.valid) {
    throw new RunStepConfigResolutionError(result.issues);
  }

  return result.config;
}
