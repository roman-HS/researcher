import type { RunErrorJson } from "@/contracts/runs/run-error";
import type {
  ToolExecutor,
  ToolExecutorFatalError,
  ToolExecutorItemError,
  ToolExecutorResolvedConfig,
  ToolExecutorWarning,
} from "@/contracts/runs/executors";
import type { ExecutionWorkingSet } from "@/contracts/runs/working-set";
import type { WorkflowCompiledPlanStep } from "@/contracts/workflows/compiled-plan";
import {
  applyWorkingSetPatch,
  buildToolExecutorRunContext,
  resetStepUsageCounters,
  withCurrentStepIndex,
  type WorkflowExecutionContext,
} from "@/contracts/runs/execution-context";
import {
  createToolExecutorFatalError,
  isToolExecutorFailedResult,
  isToolExecutorSuccessResult,
  parseToolExecutorResult,
} from "@/contracts/runs/executors";
import { getExecutor } from "@/modules/tools/executors/registry";
import {
  ExecutorNotFoundError,
  isExecutorNotFoundError,
} from "@/modules/tools/executors/errors";

import {
  isRunStepConfigResolutionError,
  RunStepConfigResolutionError,
  isExecutionLimitExceededError,
} from "./errors";
import {
  assertRunDurationNotExceeded,
  assertWorkingSetListingCount,
  resetExecutionSessionStepProviderCalls,
  runWithExecutionSession,
  syncExecutionContextUsage,
  toExecutionLimitFatalError,
} from "./execution-session";
import {
  amendStepOutputSnapshotForPartialResult,
  buildPartialSummaryWorkingSetPatch,
  RunPartialResultTracker,
} from "./partial-result-handling";
import { parseResolvedStepConfig } from "./resolve-step-config";
import {
  buildRunStepCompletionSnapshot,
  type RunStepOutputSnapshot,
} from "./step-output-snapshot";

import { RunOutputAccumulator } from "./persist-run-outputs";
import {
  sanitizePersistedRunError,
  sanitizePersistedStepError,
  sanitizePersistedStepOutputSnapshot,
} from "./sanitize-persisted-run-error";

/**
 * @see Story 7.4.1 — Implement sequential step dispatcher
 * @see Story 7.4.4 — Add partial-result handling
 * @see Story 7.4.5 — Persist final run outputs
 * @see Story 7.4.6 — Implement run failure handling
 */

export type WorkflowRunStepDispatchResult = "succeeded" | "partial" | "failed";

export type WorkflowRunStepPersistence = {
  createStep(step: WorkflowCompiledPlanStep): Promise<{ stepId: string }>;
  markStepRunning(
    stepId: string,
    inputJson: ToolExecutorResolvedConfig | null
  ): Promise<void>;
  markStepSucceeded(
    stepId: string,
    snapshot: {
      outputJson: RunStepOutputSnapshot;
      warningsJson: ReturnType<
        typeof buildRunStepCompletionSnapshot
      >["warningsJson"];
    }
  ): Promise<void>;
  markStepFailed(
    stepId: string,
    snapshot: {
      outputJson: RunStepOutputSnapshot;
      warningsJson: ReturnType<
        typeof buildRunStepCompletionSnapshot
      >["warningsJson"];
      errorJson: ToolExecutorFatalError;
    }
  ): Promise<void>;
  completeRunWithOutputs(input: {
    workingSet: ExecutionWorkingSet;
    itemErrorsByPropertyKey: Readonly<
      Record<string, readonly ToolExecutorItemError[]>
    >;
    propertyWarningsByPropertyKey: Readonly<Record<string, readonly string[]>>;
    status: "succeeded" | "partial";
  }): Promise<void>;
  markRunFailed(error: RunErrorJson): Promise<void>;
  amendSucceededStepOutput(
    stepId: string,
    outputJson: RunStepOutputSnapshot,
  ): Promise<void>;
};

export type DispatchWorkflowRunStepsOptions = {
  resolveExecutor?: (executorKey: string) => ToolExecutor;
};

const STEP_CONFIG_RESOLUTION_FAILED_CODE =
  "step_config_resolution_failed" as const;
const EXECUTOR_NOT_FOUND_CODE = "executor_not_found" as const;
const STEP_EXECUTION_FAILED_CODE = "step_execution_failed" as const;

function toStepConfigResolutionFatalError(
  error: RunStepConfigResolutionError
): ToolExecutorFatalError {
  return createToolExecutorFatalError(
    STEP_CONFIG_RESOLUTION_FAILED_CODE,
    error.issues[0]?.message ?? "Step configuration could not be resolved.",
    {
      debug: {
        issues: error.issues,
      },
    }
  );
}

function toExecutorNotFoundFatalError(
  error: ExecutorNotFoundError
): ToolExecutorFatalError {
  return createToolExecutorFatalError(
    EXECUTOR_NOT_FOUND_CODE,
    `No executor is registered for "${error.toolKey}".`
  );
}

function toUnhandledStepFatalError(error: unknown): ToolExecutorFatalError {
  const message =
    error instanceof Error
      ? error.message
      : "Step execution failed unexpectedly.";

  return createToolExecutorFatalError(
    STEP_EXECUTION_FAILED_CODE,
    "Step execution failed unexpectedly.",
    { debug: { message } }
  );
}

function toRunErrorJson(
  fatalError: ToolExecutorFatalError,
  step: WorkflowCompiledPlanStep
): RunErrorJson {
  return {
    ...fatalError,
    stepNodeId: step.nodeId,
    toolKey: step.toolKey,
  };
}

function resolveStepConfig(
  context: WorkflowExecutionContext,
  step: WorkflowCompiledPlanStep
): ToolExecutorResolvedConfig {
  return parseResolvedStepConfig(step.config, context.runtimeInputValues, {
    runtimeInputs: context.compiledPlan.runtimeInputs,
  });
}

async function failStepAndRun(options: {
  context: WorkflowExecutionContext;
  step: WorkflowCompiledPlanStep;
  stepId: string;
  fatalError: ToolExecutorFatalError;
  persistence: WorkflowRunStepPersistence;
  workingSetPatch?: RunStepOutputSnapshot["workingSetPatch"];
  itemErrors?: RunStepOutputSnapshot["itemErrors"];
  warnings?: ReturnType<typeof buildRunStepCompletionSnapshot>["warningsJson"];
}): Promise<WorkflowRunStepDispatchResult> {
  let nextContext = options.context;

  if (options.workingSetPatch) {
    nextContext = applyWorkingSetPatch(nextContext, options.workingSetPatch);
  }

  const snapshot = buildRunStepCompletionSnapshot({
    workingSetPatch: options.workingSetPatch,
    itemErrors: options.itemErrors,
    warnings: options.warnings ?? undefined,
    propertyCount: nextContext.state.workingSet.propertyOrder.length,
  });
  const sanitizedFatalError = sanitizePersistedStepError(options.fatalError);

  await options.persistence.markStepFailed(options.stepId, {
    outputJson: sanitizePersistedStepOutputSnapshot(snapshot.outputJson),
    warningsJson: snapshot.warningsJson,
    errorJson: sanitizedFatalError,
  });

  await options.persistence.markRunFailed(
    sanitizePersistedRunError(
      toRunErrorJson(sanitizedFatalError, options.step),
    ),
  );

  return "failed";
}

async function executeCompiledStep(options: {
  context: WorkflowExecutionContext;
  step: WorkflowCompiledPlanStep;
  stepId: string;
  persistence: WorkflowRunStepPersistence;
  resolveExecutor: (executorKey: string) => ToolExecutor;
}): Promise<{
  result: WorkflowRunStepDispatchResult;
  context: WorkflowExecutionContext;
  itemErrors: ToolExecutorItemError[];
  warnings: ToolExecutorWarning[];
  summaryStepId?: string;
  stepOutput?: RunStepOutputSnapshot;
}> {
  const context = resetStepUsageCounters(options.context);
  resetExecutionSessionStepProviderCalls();
  const { step, stepId, persistence, resolveExecutor } = options;

  let resolvedConfig: ToolExecutorResolvedConfig;

  try {
    resolvedConfig = resolveStepConfig(context, step);
  } catch (error) {
    if (!isRunStepConfigResolutionError(error)) {
      throw error;
    }

    await persistence.markStepRunning(stepId, null);

    return {
      result: await failStepAndRun({
        context,
        step,
        stepId,
        fatalError: toStepConfigResolutionFatalError(error),
        persistence,
      }),
      context,
      itemErrors: [],
      warnings: [],
    };
  }

  await persistence.markStepRunning(stepId, resolvedConfig);

  try {
    assertWorkingSetListingCount(context.state.workingSet.propertyOrder.length);
  } catch (error) {
    if (isExecutionLimitExceededError(error)) {
      return {
        result: await failStepAndRun({
          context,
          step,
          stepId,
          fatalError: toExecutionLimitFatalError(error),
          persistence,
        }),
        context,
        itemErrors: [],
        warnings: [],
      };
    }

    throw error;
  }

  let executor: ToolExecutor;

  try {
    executor = resolveExecutor(step.executorKey);
  } catch (error) {
    if (!isExecutorNotFoundError(error)) {
      throw error;
    }

    return {
      result: await failStepAndRun({
        context,
        step,
        stepId,
        fatalError: toExecutorNotFoundFatalError(error),
        persistence,
      }),
      context,
      itemErrors: [],
      warnings: [],
    };
  }

  let rawResult: unknown;

  try {
    rawResult = await executor({
      runContext: buildToolExecutorRunContext(context, step),
      config: resolvedConfig,
      workingSet: context.state.workingSet,
    });
  } catch (error) {
    if (isExecutionLimitExceededError(error)) {
      return {
        result: await failStepAndRun({
          context,
          step,
          stepId,
          fatalError: toExecutionLimitFatalError(error),
          persistence,
        }),
        context,
        itemErrors: [],
        warnings: [],
      };
    }

    return {
      result: await failStepAndRun({
        context,
        step,
        stepId,
        fatalError: toUnhandledStepFatalError(error),
        persistence,
      }),
      context,
      itemErrors: [],
      warnings: [],
    };
  }

  const result = parseToolExecutorResult(rawResult);

  if (isToolExecutorFailedResult(result)) {
    return {
      result: await failStepAndRun({
        context,
        step,
        stepId,
        fatalError: result.fatalError,
        persistence,
        workingSetPatch: result.workingSetPatch,
        itemErrors: result.itemErrors,
        warnings: result.warnings,
      }),
      context: result.workingSetPatch
        ? applyWorkingSetPatch(context, result.workingSetPatch)
        : context,
      itemErrors: [],
      warnings: [],
    };
  }

  if (!isToolExecutorSuccessResult(result)) {
    throw new Error("Executor returned an unsupported result status.");
  }

  const nextContext = applyWorkingSetPatch(context, result.workingSetPatch);
  const snapshot = buildRunStepCompletionSnapshot({
    workingSetPatch: result.workingSetPatch,
    itemErrors: result.itemErrors,
    warnings: result.warnings,
    propertyCount: nextContext.state.workingSet.propertyOrder.length,
  });

  await persistence.markStepSucceeded(stepId, snapshot);

  const summaryStepId =
    result.workingSetPatch && "summary" in result.workingSetPatch
      ? stepId
      : undefined;

  return {
    result: "succeeded",
    context: nextContext,
    itemErrors: result.itemErrors,
    warnings: result.warnings,
    summaryStepId,
    stepOutput: snapshot.outputJson,
  };
}

export async function dispatchWorkflowRunSteps(
  initialContext: WorkflowExecutionContext,
  persistence: WorkflowRunStepPersistence,
  options: DispatchWorkflowRunStepsOptions = {},
): Promise<WorkflowRunStepDispatchResult> {
  return runWithExecutionSession(initialContext, async () => {
    const resolveExecutor = options.resolveExecutor ?? getExecutor;
    let context = initialContext;
    const partialTracker = new RunPartialResultTracker();
    const outputAccumulator = new RunOutputAccumulator();
    let summaryStepId: string | undefined;
    let summaryStepOutput: RunStepOutputSnapshot | undefined;

    for (
      let stepIndex = 0;
      stepIndex < context.compiledPlan.steps.length;
      stepIndex += 1
    ) {
      assertRunDurationNotExceeded();

      const step = context.compiledPlan.steps[stepIndex];

      if (!step) {
        throw new Error(`Compiled plan is missing step at index ${stepIndex}.`);
      }

      const { stepId } = await persistence.createStep(step);

      let stepResult: Awaited<ReturnType<typeof executeCompiledStep>>;

      try {
        stepResult = await executeCompiledStep({
          context,
          step,
          stepId,
          persistence,
          resolveExecutor,
        });
      } catch (error) {
        return await failStepAndRun({
          context,
          step,
          stepId,
          fatalError: toUnhandledStepFatalError(error),
          persistence,
        });
      }

      context = syncExecutionContextUsage(stepResult.context);

      if (stepResult.result === "failed") {
        return "failed";
      }

      partialTracker.recordSucceededStep(step, stepResult.itemErrors);
      outputAccumulator.recordStepOutputs(
        stepResult.itemErrors,
        stepResult.warnings,
      );

      if (stepResult.summaryStepId) {
        summaryStepId = stepResult.summaryStepId;
        summaryStepOutput = stepResult.stepOutput;
      }

      context = withCurrentStepIndex(context, stepIndex + 1);
    }

    if (partialTracker.shouldMarkRunPartial()) {
      const partialStats = partialTracker.getStats();
      const summaryPatch = buildPartialSummaryWorkingSetPatch(
        context.state.workingSet,
        partialStats,
      );

      if (summaryPatch) {
        context = applyWorkingSetPatch(context, summaryPatch);
      }

      if (summaryStepId && summaryStepOutput) {
        const amendedOutput = amendStepOutputSnapshotForPartialResult(
          summaryStepOutput,
          partialStats,
        );

        if (amendedOutput) {
          await persistence.amendSucceededStepOutput(
            summaryStepId,
            amendedOutput,
          );
        }
      }

      await persistence.completeRunWithOutputs({
        workingSet: context.state.workingSet,
        itemErrorsByPropertyKey: outputAccumulator.getItemErrorsByPropertyKey(),
        propertyWarningsByPropertyKey:
          outputAccumulator.getPropertyWarningsByPropertyKey(),
        status: "partial",
      });
      return "partial";
    }

    await persistence.completeRunWithOutputs({
      workingSet: context.state.workingSet,
      itemErrorsByPropertyKey: outputAccumulator.getItemErrorsByPropertyKey(),
      propertyWarningsByPropertyKey:
        outputAccumulator.getPropertyWarningsByPropertyKey(),
      status: "succeeded",
    });
    return "succeeded";
  });
}
