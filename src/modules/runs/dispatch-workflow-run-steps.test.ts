import { describe, expect, it, vi } from "vitest";

import {
  createToolExecutorFailedResult,
  createToolExecutorFatalError,
  createToolExecutorSuccessResult,
  createToolExecutorWarning,
  type ToolExecutor,
} from "@/contracts/runs";
import {
  WORKFLOW_COMPILED_PLAN_VERSION,
  type WorkflowCompiledPlan,
} from "@/contracts/workflows/compiled-plan";
import { createWorkflowExecutionContext } from "@/modules/runs/execution-context";
import {
  dispatchWorkflowRunSteps,
  type WorkflowRunStepPersistence,
} from "@/modules/runs/dispatch-workflow-run-steps";
import { ExecutorNotFoundError } from "@/modules/tools/executors/errors";

const runId = "11111111-1111-4111-8111-111111111111";
const workspaceId = "22222222-2222-4222-8222-222222222222";
const workflowId = "33333333-3333-4333-8333-333333333333";
const workflowVersionId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";

const compiledPlan: WorkflowCompiledPlan = {
  planVersion: WORKFLOW_COMPILED_PLAN_VERSION,
  trigger: { type: "manual" },
  runtimeInputs: [
    {
      key: "searchZip",
      label: "Search ZIP",
      type: "text",
      required: true,
    },
  ],
  executionOrder: ["step-search", "step-summary"],
  steps: [
    {
      nodeId: "step-search",
      title: "Listing Search",
      toolKey: "rapidapi.zillow.searchListings@1",
      executorKey: "rapidapi.zillow.searchListings@1",
      config: {
        locationSource: "zip",
        zip: { kind: "workflowInput", inputKey: "searchZip" },
      },
    },
    {
      nodeId: "step-summary",
      title: "Generate Summary",
      toolKey: "ai.generateSummary@1",
      executorKey: "ai.generateSummary@1",
      config: {},
    },
  ],
};

function createContext() {
  return createWorkflowExecutionContext({
    run: {
      runId,
      workspaceId,
      workflowId,
      workflowVersionId,
      userId,
    },
    compiledPlan,
    runtimeInputValues: {
      searchZip: "98101",
    },
    status: "running",
  });
}

function createPersistenceRecorder(): {
  persistence: WorkflowRunStepPersistence;
  events: string[];
  stepRows: Array<{
    stepId: string;
    nodeId: string;
    status: "pending" | "running" | "succeeded" | "failed";
    outputJson?: unknown;
    errorJson?: unknown;
    warningsJson?: unknown;
    inputJson?: unknown;
  }>;
  runStatus: "running" | "succeeded" | "failed" | null;
  runError?: unknown;
} {
  const events: string[] = [];
  const stepRows: Array<{
    stepId: string;
    nodeId: string;
    status: "pending" | "running" | "succeeded" | "failed";
    outputJson?: unknown;
    errorJson?: unknown;
    warningsJson?: unknown;
    inputJson?: unknown;
  }> = [];
  let runStatus: "running" | "succeeded" | "failed" | null = "running";
  let runError: unknown;

  const persistence: WorkflowRunStepPersistence = {
    async createStep(step) {
      const stepId = `step-${stepRows.length + 1}`;
      stepRows.push({
        stepId,
        nodeId: step.nodeId,
        status: "pending",
      });
      events.push(`create:${step.nodeId}`);
      return { stepId };
    },
    async markStepRunning(stepId, inputJson) {
      const row = stepRows.find((entry) => entry.stepId === stepId);
      if (row) {
        row.status = "running";
        row.inputJson = inputJson;
      }
      events.push(`running:${stepId}`);
    },
    async markStepSucceeded(stepId, snapshot) {
      const row = stepRows.find((entry) => entry.stepId === stepId);
      if (row) {
        row.status = "succeeded";
        row.outputJson = snapshot.outputJson;
        row.warningsJson = snapshot.warningsJson;
      }
      events.push(`succeeded:${stepId}`);
    },
    async markStepFailed(stepId, snapshot) {
      const row = stepRows.find((entry) => entry.stepId === stepId);
      if (row) {
        row.status = "failed";
        row.outputJson = snapshot.outputJson;
        row.warningsJson = snapshot.warningsJson;
        row.errorJson = snapshot.errorJson;
      }
      events.push(`failed:${stepId}`);
    },
    async markRunSucceeded() {
      runStatus = "succeeded";
      events.push("run:succeeded");
    },
    async markRunFailed(error) {
      runStatus = "failed";
      runError = error;
      events.push("run:failed");
    },
  };

  return {
    persistence,
    events,
    stepRows,
    get runStatus() {
      return runStatus;
    },
    set runStatus(value) {
      runStatus = value;
    },
    get runError() {
      return runError;
    },
    set runError(value) {
      runError = value;
    },
  };
}

describe("dispatchWorkflowRunSteps", () => {
  it("executes steps sequentially and marks the run succeeded", async () => {
    const recorder = createPersistenceRecorder();
    const searchExecutor = vi.fn<ToolExecutor>(async () =>
      createToolExecutorSuccessResult({
        propertyOrder: ["provider:1"],
        listingsByKey: {},
      }),
    );
    const summaryExecutor = vi.fn<ToolExecutor>(async () =>
      createToolExecutorSuccessResult(
        {
          summary: {
            title: "Summary",
            sections: [],
            topProperties: [],
            warnings: [],
            missingDataNotes: [],
          },
        },
        { warnings: [createToolExecutorWarning("empty_section", "No scores.")] },
      ),
    );

    const result = await dispatchWorkflowRunSteps(createContext(), recorder.persistence, {
      resolveExecutor: (executorKey) => {
        if (executorKey === "rapidapi.zillow.searchListings@1") {
          return searchExecutor;
        }

        if (executorKey === "ai.generateSummary@1") {
          return summaryExecutor;
        }

        throw new ExecutorNotFoundError(executorKey);
      },
    });

    expect(result).toBe("succeeded");
    expect(recorder.runStatus).toBe("succeeded");
    expect(recorder.events).toEqual([
      "create:step-search",
      "running:step-1",
      "succeeded:step-1",
      "create:step-summary",
      "running:step-2",
      "succeeded:step-2",
      "run:succeeded",
    ]);
    expect(searchExecutor).toHaveBeenCalledOnce();
    expect(summaryExecutor).toHaveBeenCalledOnce();
    expect(recorder.stepRows).toHaveLength(2);
    expect(recorder.stepRows[1]?.warningsJson).toEqual([
      {
        code: "empty_section",
        message: "No scores.",
      },
    ]);
  });

  it("stops on fatal executor failure and preserves optional working-set patch", async () => {
    const recorder = createPersistenceRecorder();
    const searchExecutor = vi.fn<ToolExecutor>(async () =>
      createToolExecutorFailedResult(
        createToolExecutorFatalError("provider_rate_limited", "Rate limited."),
        {
          workingSetPatch: {
            propertyOrder: ["provider:1"],
          },
        },
      ),
    );
    const summaryExecutor = vi.fn<ToolExecutor>(async () =>
      createToolExecutorSuccessResult({
        summary: {
          title: "Summary",
          sections: [],
          topProperties: [],
          warnings: [],
          missingDataNotes: [],
        },
      }),
    );

    const result = await dispatchWorkflowRunSteps(createContext(), recorder.persistence, {
      resolveExecutor: (executorKey) => {
        if (executorKey === "rapidapi.zillow.searchListings@1") {
          return searchExecutor;
        }

        return summaryExecutor;
      },
    });

    expect(result).toBe("failed");
    expect(recorder.runStatus).toBe("failed");
    expect(recorder.events).toEqual([
      "create:step-search",
      "running:step-1",
      "failed:step-1",
      "run:failed",
    ]);
    expect(summaryExecutor).not.toHaveBeenCalled();
    expect(recorder.stepRows[0]?.outputJson).toMatchObject({
      workingSetPatch: { propertyOrder: ["provider:1"] },
      summary: { propertyCount: 1 },
    });
    expect(recorder.runError).toMatchObject({
      code: "provider_rate_limited",
      stepNodeId: "step-search",
      toolKey: "rapidapi.zillow.searchListings@1",
    });
  });

  it("fails when step config cannot be resolved", async () => {
    const brokenPlan: WorkflowCompiledPlan = {
      ...compiledPlan,
      steps: [
        {
          ...compiledPlan.steps[0]!,
          config: {
            locationSource: "zip",
            zip: { kind: "workflowInput", inputKey: "missingInput" },
          },
        },
      ],
    };

    const recorder = createPersistenceRecorder();

    const result = await dispatchWorkflowRunSteps(
      createWorkflowExecutionContext({
        run: {
          runId,
          workspaceId,
          workflowId,
          workflowVersionId,
          userId,
        },
        compiledPlan: brokenPlan,
        runtimeInputValues: { searchZip: "98101" },
        status: "running",
      }),
      recorder.persistence,
      {
        resolveExecutor: () => {
          throw new Error("Executor should not run when config resolution fails.");
        },
      },
    );

    expect(result).toBe("failed");
    expect(recorder.events).toEqual([
      "create:step-search",
      "running:step-1",
      "failed:step-1",
      "run:failed",
    ]);
    expect(recorder.runError).toMatchObject({
      code: "step_config_resolution_failed",
      stepNodeId: "step-search",
    });
  });

  it("fails when the executor is missing", async () => {
    const recorder = createPersistenceRecorder();

    const result = await dispatchWorkflowRunSteps(createContext(), recorder.persistence, {
      resolveExecutor: (executorKey) => {
        throw new ExecutorNotFoundError(executorKey);
      },
    });

    expect(result).toBe("failed");
    expect(recorder.runError).toMatchObject({
      code: "executor_not_found",
      stepNodeId: "step-search",
    });
  });

  it("fails when the working set exceeds the listing limit", async () => {
    const recorder = createPersistenceRecorder();
    const context = createWorkflowExecutionContext({
      run: {
        runId,
        workspaceId,
        workflowId,
        workflowVersionId,
        userId,
      },
      compiledPlan,
      runtimeInputValues: { searchZip: "98101" },
      limits: {
        ...createContext().limits,
        maxListingCount: 1,
      },
      status: "running",
      workingSet: {
        version: 1,
        propertyOrder: ["provider:1", "provider:2"],
        listingsByKey: {},
        detailsByKey: {},
        comparablesByKey: {},
        rentEstimatesByKey: {},
        metricsByKey: {},
        scoresByKey: {},
        areaAggregatesByKey: {},
      },
    });

    const result = await dispatchWorkflowRunSteps(context, recorder.persistence, {
      resolveExecutor: () => {
        throw new Error("Executor should not run when listing limit is exceeded.");
      },
    });

    expect(result).toBe("failed");
    expect(recorder.runError).toMatchObject({
      code: "execution_limit_exceeded",
      stepNodeId: "step-search",
    });
  });
});
